/**
 * IEEE Event Attendance System - Google Apps Script Entrypoint & REST API Router
 */

function doGet(e) {
  // If page param is provided (for legacy GAS container viewing)
  var page = e && e.parameter && e.parameter.page ? e.parameter.page : 'index';
  var allowedPages = ['index', 'admin', 'volunteer', 'student'];
  if (allowedPages.indexOf(page) === -1) {
    page = 'index';
  }

  try {
    return HtmlService.createTemplateFromFile(page)
      .evaluate()
      .setTitle('Attenza | Smart Event Attendance')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "ok", message: "Attenza Smart Event Attendance System API is running." }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  var response = { success: false, message: 'Invalid API request' };

  try {
    var data = {};
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    }
    
    var action = data.action;
    var payload = data.payload || {};

    switch(action) {
      case 'login':
      case 'verifyLoginCredentials':
        response = verifyLoginCredentials(payload.username, payload.password);
        break;

      case 'updatePassword':
      case 'updateSessionPassword':
        response = updateSessionPassword(payload.userId, payload.oldP || payload.oldPassword, payload.newP || payload.newPassword, payload.role);
        break;

      case 'getVolunteerEvents':
      case 'getAdminEvents':
      case 'getVolunteerEventsList':
      case 'getAdminEventsList':
        response = getVolunteerEventsList();
        break;

      case 'getActiveSession':
      case 'getActiveSessionForEvent':
        response = getActiveSessionForEvent(payload.eventId);
        break;

      case 'scanQRToken':
      case 'scanStudentQRToken':
        response = scanStudentQRToken(payload.qrToken);
        break;

      case 'submitAttendance':
      case 'submitStudentAttendanceLogs':
        response = submitStudentAttendanceLogs(
          payload.studentId,
          payload.eventId,
          payload.sessionName,
          payload.facePhotoBase64,
          payload.idPhotoBase64,
          payload.volunteerUserId
        );
        break;

      case 'importParticipants':
      case 'uploadStudentsBatch':
      case 'importParticipantsFromExcelArray':
        response = importParticipantsFromExcelArray(payload.rows || payload.studentsList || [], payload.erasePrevious);
        break;

      case 'clearAllStudents':
      case 'eraseAllStudents':
      case 'erasePreviousData':
        response = clearAllStudentsData();
        break;

      case 'createVolunteer':
      case 'createVolunteerAccount':
      case 'createNewVolunteer':
        response = createVolunteerAccount(payload.name || payload.username, payload.username || payload.email, payload.password);
        break;

      case 'registerAccount':
      case 'createAccount':
      case 'registerStudent':
        response = registerAccount(payload.name, payload.username, payload.password);
        break;

      case 'createEvent':
      case 'createNewEvent':
        response = createEvent(
          payload.eventName, 
          payload.eventDateStr || payload.eventDate, 
          payload.sessionsCount || payload.sessions || 1,
          payload.photoRequirement || payload.photosRequired || 'both'
        );
        break;

      case 'deleteEvent':
      case 'deleteEventById':
        response = deleteEvent(payload.eventId);
        break;

      case 'deleteStudent':
        response = deleteStudent(payload.studentId);
        break;

      case 'deleteVolunteer':
      case 'deleteVolunteerById':
        response = deleteVolunteer(payload.volunteerId || payload.vId);
        break;

      case 'getEventSessions':
        response = getEventSessions(payload.eventId);
        break;

      case 'addEventSession':
      case 'addSession':
        response = addEventSession(payload.eventId, payload.sessionName);
        break;

      case 'setSessionStatus':
      case 'manageEventSessions':
      case 'updateSessionStatus':
        response = setSessionStatus(payload.eventId, payload.sessionName, payload.newStatus || payload.actionType);
        break;

      case 'getStudentsList':
      case 'getAdminStudentsList':
        response = getAdminStudentsList();
        break;

      case 'deduplicateSessionStatuses':
      case 'cleanupSessionStatuses':
        response = deduplicateSessionStatuses();
        break;

      case 'getDriveStorageStats':
      case 'getStorageStats':
        response = getDriveStorageStats();
        break;

      case 'getVolunteersList':
      case 'getAdminVolunteersList':
        response = getAdminVolunteersList();
        break;

      case 'getPendingVerifications':
      case 'getPendingVerificationsQueue':
        response = getPendingVerifications();
        break;

      case 'processVerification':
      case 'processVerificationDecision':
      case 'verifyAttendanceRecord':
        response = verifyAttendanceRecord(
          payload.attId || payload.attendanceId,
          payload.decision || payload.status,
          payload.rejectionReason || payload.remarks
        );
        break;

      case 'getReportStats':
      case 'getAdminDashboardMetrics':
        response = getReportStats(payload.eventId);
        break;

      case 'getReportsMatrix':
      case 'getAdminAttendanceRecords':
      case 'getReportsAttendanceMatrix':
        response = getAdminAttendanceRecords(payload.eventId);
        break;

      case 'getStudentProfile':
      case 'getStudentProfileData':
        response = getStudentProfileData(payload.userId);
        break;

      case 'getStudentAttendanceHistory':
        response = getStudentAttendanceHistory(payload.registrationNumber);
        break;

      case 'markManualAttendance':
        response = markManualAttendance(
          payload.studentId,
          payload.registrationNumber,
          payload.studentName,
          payload.department,
          payload.eventId,
          payload.eventName,
          payload.sessionName,
          payload.reason,
          payload.adminId
        );
        break;

      default:
        response = { success: false, message: 'Unknown API action: ' + action };
    }
  } catch (err) {
    response = { success: false, message: 'API Execution Error: ' + err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Inclusion helper for CSS/JS files inside GAS templates
 */
function include(filename) {
  try {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch(e) {
    return "";
  }
}
