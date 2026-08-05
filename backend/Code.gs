/**
 * IEEE Event Attendance System - Google Apps Script Entrypoint & REST API Router
 */

function doGet(e) {
  // Ensure database tables exist
  try {
    initDatabase();
  } catch (err) {
    Logger.log("DB Init warning: " + err.message);
  }

  // If page param is provided (for legacy GAS container viewing)
  var page = e && e.parameter && e.parameter.page ? e.parameter.page : 'index';
  var allowedPages = ['index', 'admin', 'volunteer', 'student'];
  if (allowedPages.indexOf(page) === -1) {
    page = 'index';
  }

  try {
    return HtmlService.createTemplateFromFile(page)
      .evaluate()
      .setTitle('IEEE Event Attendance Management')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "ok", message: "IEEE Event Attendance System API is running." }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    initDatabase();
  } catch (err) {
    Logger.log("DB Init warning: " + err.message);
  }

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
        response = handleLogin(payload.username, payload.password);
        break;
      case 'updatePassword':
        response = updateSessionPassword(payload.userId, payload.oldP, payload.newP, payload.role);
        break;
      case 'getVolunteerEvents':
        response = getVolunteerEventsList();
        break;
      case 'getActiveSession':
        response = getActiveSessionForEvent(payload.eventId);
        break;
      case 'scanQRToken':
        response = scanStudentQRToken(payload.qrToken);
        break;
      case 'submitAttendance':
        response = submitStudentAttendanceLogs(payload);
        break;
      case 'getAdminMetrics':
        response = getAdminDashboardMetrics();
        break;
      case 'getAdminEvents':
        response = getAdminEventsList();
        break;
      case 'createEvent':
        response = createEvent(payload.eventName, payload.eventDate);
        break;
      case 'deleteEvent':
        response = deleteEvent(payload.eventId);
        break;
      case 'manageEventSessions':
        response = manageEventSessions(payload.eventId, payload.actionType, payload.sessionName);
        break;
      case 'uploadStudentsBatch':
      case 'importParticipants':
        response = importParticipantsFromExcelArray(payload.rows || payload.studentsList || []);
        break;
      case 'getStudentsList':
        response = getStudentsList();
        break;
      case 'getVolunteersList':
        response = getVolunteersList();
        break;
      case 'createVolunteer':
        response = createVolunteer(payload);
        break;
      case 'deleteVolunteer':
        response = deleteVolunteer(payload.vId);
        break;
      case 'getPendingVerifications':
        response = getPendingVerificationsQueue();
        break;
      case 'processVerification':
        response = processVerificationDecision(payload.attId, payload.decision, payload.rejectionReason);
        break;
      case 'getReportsMatrix':
        response = getReportsAttendanceMatrix(payload.eventId);
        break;
      case 'getStudentProfile':
        response = getStudentProfileData(payload.userId);
        break;
      case 'getStudentAttendanceHistory':
        response = getStudentAttendanceHistory(payload.registrationNumber);
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
