window.onerror = function(message, source, lineno, colno, error) {
  alert("Client Script Error:\n" + message + "\nLine: " + lineno + "\nSource: " + source);
  return false;
};

/**
 * Attenza Smart Event Attendance & Verification Platform - Core Controller
 */

// Global session key
var SESSION_KEY = "ieee_gas_session";
var activeStream = null;

// Configured Apps Script Web App API Endpoint URL
var WEB_APP_URL = "https://script.google.com/macros/s/AKfycbw2_-AfR5D2AdQzCURmcZruTB7pDtDmsC4z4bO2fJoVK0EZ59_Jp2uegc-EQQ4WdWim/exec";

/**
 * Universal API Client for Google Apps Script Web App Endpoint & Container Fallback
 */
function callBackendApi(action, payload) {
  return new Promise(function(resolve, reject) {
    payload = payload || {};

    // Check if running inside Google Apps Script iframe container
    if (typeof google !== 'undefined' && google.script && google.script.run && window.location.hostname.indexOf('script.google.com') !== -1) {
      var runner = google.script.run
        .withSuccessHandler(function(res) { resolve(res); })
        .withFailureHandler(function(err) { reject(err); });

      switch(action) {
        case 'login': runner.verifyLoginCredentials(payload.username, payload.password); break;
        case 'updatePassword': runner.updateSessionPassword(payload.userId, payload.oldP || payload.oldPassword, payload.newP || payload.newPassword, payload.role); break;
        case 'getVolunteerEvents': runner.getVolunteerEventsList(); break;
        case 'getActiveSession': runner.getActiveSessionForEvent(payload.eventId); break;
        case 'scanQRToken': runner.scanStudentQRToken(payload.qrToken); break;
        case 'submitAttendance': runner.submitStudentAttendanceLogs(payload.studentId, payload.eventId, payload.sessionName, payload.facePhotoBase64, payload.idPhotoBase64, payload.volunteerUserId); break;
        case 'getAdminEvents': runner.getVolunteerEventsList(); break;
        case 'createEvent': runner.createEvent(payload.eventName, payload.eventDateStr || payload.eventDate, payload.sessionsCount || payload.sessions || 1, payload.photoRequirement || payload.photosRequired || 'both'); break;
        case 'deleteEvent': runner.deleteEvent(payload.eventId); break;
        case 'deleteStudent': runner.deleteStudent(payload.studentId); break;
        case 'getEventSessions': runner.getEventSessions(payload.eventId); break;
        case 'setSessionStatus':
        case 'manageEventSessions': runner.setSessionStatus(payload.eventId, payload.sessionName, payload.newStatus || payload.actionType); break;
        case 'uploadStudentsBatch':
        case 'importParticipants': runner.importParticipantsFromExcelArray(payload.rows || payload.studentsList); break;
        case 'getStudentsList': runner.getAdminStudentsList(); break;
        case 'getVolunteersList': runner.getAdminVolunteersList(); break;
        case 'createVolunteer': runner.createVolunteerAccount(payload.name, payload.username, payload.password); break;
        case 'registerAccount':
        case 'createAccount': runner.registerAccount(payload.name, payload.username, payload.password); break;
        case 'deleteVolunteer': runner.deleteVolunteer(payload.volunteerId || payload.vId); break;
        case 'getPendingVerifications': runner.getPendingVerifications(); break;
        case 'processVerification':
        case 'verifyAttendanceRecord': runner.verifyAttendanceRecord(payload.attId || payload.attendanceId, payload.decision || payload.status, payload.rejectionReason || payload.remarks); break;
        case 'getReportStats': runner.getReportStats(payload.eventId); break;
        case 'getReportsMatrix': runner.getAdminAttendanceRecords(payload.eventId); break;
        case 'getStudentProfile': runner.getStudentProfileData(payload.userId); break;
        case 'markManualAttendance': runner.markManualAttendance(payload.studentId, payload.registrationNumber, payload.studentName, payload.department, payload.eventId, payload.eventName, payload.sessionName, payload.reason, payload.adminId); break;
        case 'getDriveStorageStats': runner.getDriveStorageStats(); break;
        default: reject(new Error("Unknown GAS runner action: " + action));
      }
      return;
    }

    // Standard HTTP fetch for Vercel / External hosting
    var apiUrl = (typeof WEB_APP_URL !== 'undefined' && WEB_APP_URL && WEB_APP_URL.indexOf("REPLACE_WITH_YOUR") === -1) 
      ? WEB_APP_URL 
      : (localStorage.getItem('ieee_gas_api_url') || "");

    if (!apiUrl) {
      reject(new Error("Apps Script API URL not set. Please update WEB_APP_URL in script.js or save it in localStorage as 'ieee_gas_api_url'."));
      return;
    }

    fetch(apiUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({ action: action, payload: payload })
    })
    .then(function(res) {
      if (!res.ok) throw new Error("HTTP error " + res.status);
      return res.json();
    })
    .then(function(data) {
      resolve(data);
    })
    .catch(function(err) {
      reject(err);
    });
  });
}

function execApi(action, payload, onSuccess, onFailure) {
  callBackendApi(action, payload)
    .then(function(response) {
      if (typeof onSuccess === 'function') onSuccess(response);
    })
    .catch(function(err) {
      if (typeof onFailure === 'function') onFailure(err);
      else {
        console.error("API Failure [" + action + "]:", err);
        showStatusToast("API Error: " + err.message, "danger");
      }
    });
}

/**
 * Get active session
 */
function getActiveSession() {
  var session = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
  if (session) {
    try {
      var data = JSON.parse(session);
      // Auto-expire sessions older than 2 hours to prevent unauthorized persistent access
      if (data.loginTime && (Date.now() - data.loginTime > 2 * 60 * 60 * 1000)) {
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return data;
    } catch(e) {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    }
  }
  return null;
}

/**
 * Save active session
 */
function saveActiveSession(userData) {
  userData.loginTime = Date.now();
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(userData));
  localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
}

/**
 * Clear session and redirect to login
 */
function clearSessionAndLogout() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  redirectToPage('index&logout=true');
}

/**
 * Safe redirect across Vercel and Google Apps Script containers
 */
function redirectToPage(pageName) {
  var cleanPage = pageName.split('&')[0];
  var query = pageName.indexOf('&') !== -1 ? '?' + pageName.split('&').slice(1).join('&') : '';

  if (window.location.hostname.indexOf('script.google.com') !== -1) {
    if (typeof WEB_APP_URL !== 'undefined' && WEB_APP_URL && WEB_APP_URL.indexOf("REPLACE_WITH_YOUR") === -1) {
      window.top.location.href = WEB_APP_URL + "?page=" + pageName;
    } else {
      window.location.search = "?page=" + pageName;
    }
  } else {
    var targetUrl = cleanPage + ".html" + query;
    if (cleanPage === 'index') targetUrl = "index.html" + query;
    window.location.href = targetUrl;
  }
}

/**
 * Check page access control based on user role
 */
function enforceRoleSecurity(allowedRoles, currentPage) {
  var urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('logout') === 'true') {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    redirectToPage('index');
    return;
  }

  var session = getActiveSession();
  
  if (!session) {
    if (currentPage !== 'index') {
      redirectToPage('index');
    }
    return;
  }
  
  if (currentPage === 'index') {
    if (session.role === 'admin') redirectToPage('admin');
    else if (session.role === 'volunteer') redirectToPage('volunteer');
    else if (session.role === 'student') redirectToPage('student');
    return;
  }
  
  if (allowedRoles.indexOf(session.role) === -1) {
    if (session.role === 'admin') redirectToPage('admin');
    else if (session.role === 'volunteer') redirectToPage('volunteer');
    else if (session.role === 'student') redirectToPage('student');
  }
}

/**
 * Start camera feed for capturing photos
 */
function startCaptureCamera(videoElementId, deviceId, callback) {
  if (activeStream) {
    stopCaptureCamera();
  }
  
  var constraints = deviceId ? { video: { deviceId: { exact: deviceId } } } : { video: { facingMode: "user" } };
  
  navigator.mediaDevices.getUserMedia(constraints)
    .then(function(stream) {
      var video = document.getElementById(videoElementId);
      if (video) {
        video.srcObject = stream;
        activeStream = stream;
        if (callback) callback(null, stream);
      }
    })
    .catch(function(err) {
      console.error("Camera open error: ", err);
      if (callback) callback(err);
    });
}

/**
 * Close active camera streams
 */
function stopCaptureCamera() {
  if (activeStream) {
    activeStream.getTracks().forEach(function(track) {
      track.stop();
    });
    activeStream = null;
  }
}

/**
 * Capture frame from live video feed
 */
function captureFrameFromFeed(videoElementId) {
  var video = document.getElementById(videoElementId);
  if (!video) return null;
  
  var canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  
  var ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  var base64 = canvas.toDataURL('image/jpeg', 0.85);
  stopCaptureCamera();
  return base64;
}

/**
 * UI Toast alerts
 */
function showStatusToast(message, type) {
  var alertClass = type === 'success' ? 'bg-success text-white' : 'bg-danger text-white';
  var container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'position-fixed bottom-0 end-0 p-3';
    container.style.zIndex = '1100';
    document.body.appendChild(container);
  }
  
  var toastId = 'toast_' + Date.now();
  var html = `
    <div id="${toastId}" class="toast align-items-center ${alertClass} border-0 show" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body font-bold text-sm">
          ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close" onclick="document.getElementById('${toastId}').remove()"></button>
      </div>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', html);
  
  setTimeout(function() {
    var el = document.getElementById(toastId);
    if (el) el.remove();
  }, 4000);
}

/**
 * Utility to convert standard Google Drive file viewer URLs into direct CDN rendering links
 */
function formatDriveDirectLink(url) {
  if (!url) return "";
  if (url.indexOf("drive.google.com") !== -1) {
    var match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return "https://lh3.googleusercontent.com/d/" + match[1];
    }
    var queryMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (queryMatch && queryMatch[1]) {
      return "https://lh3.googleusercontent.com/d/" + queryMatch[1];
    }
  }
  return url;
}
