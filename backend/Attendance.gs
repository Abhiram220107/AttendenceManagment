/**
 * IEEE Event Attendance System - Attendance Services
 */

function scanStudentQRToken(tokenInput) {
  try {
    if (!tokenInput) return { success: false, message: "QR Token or Registration Number is required." };
    
    var tokenStr = tokenInput.toString().trim();
    var tokenNormalized = tokenStr.toLowerCase().replace(/\s+/g, "");
    
    var students = getSheetDataAsJson("Students");
    for (var i = 0; i < students.length; i++) {
      var stReg = students[i].registrationNumber ? students[i].registrationNumber.toString().trim().toLowerCase().replace(/\s+/g, "") : "";
      var stToken = students[i].qrToken ? students[i].qrToken.toString().trim().toLowerCase() : "";
      var stId = students[i].studentId ? students[i].studentId.toString().trim().toLowerCase() : "";
      
      if (stToken === tokenStr.toLowerCase() || stReg === tokenNormalized || stId === tokenStr.toLowerCase()) {
        var student = students[i];
        delete student.password; // Strip password
        return { success: true, student: student };
      }
    }
    
    return { success: false, message: "No student found matching QR code ('" + tokenStr + "')." };
  } catch (e) {
    return { success: false, message: "Scanning error: " + e.message };
  }
}

function submitStudentAttendanceLogs(studentId, eventId, sessionName, facePhotoBase64, idPhotoBase64, volunteerId) {
  try {
    var ss = getSpreadsheet();
    var attendanceSheet = ss.getSheetByName("Attendance");
    if (!attendanceSheet) return { success: false, message: "Attendance sheet database not found." };
    
    // 0. Validate that the session is Open
    var sessionStatusesSheet = ss.getSheetByName("SessionStatuses");
    var isSessionOpen = false;
    var targetEvIdStr = String(eventId).trim();
    var targetSessStr = String(sessionName).trim();
    if (sessionStatusesSheet) {
      var sessData = sessionStatusesSheet.getDataRange().getValues();
      for (var k = 1; k < sessData.length; k++) {
        if (String(sessData[k][0]).trim() === targetEvIdStr && String(sessData[k][1]).trim() === targetSessStr) {
          if (String(sessData[k][2]).trim() === "Open") {
            isSessionOpen = true;
          }
          break;
        }
      }
    }
    if (!isSessionOpen) {
      return { success: false, message: "Attendance submission failed: " + sessionName + " is not currently Open." };
    }
    
    // 1. Prevent duplicate attendance for the same participant on the same session
    var attendanceData = getSheetDataAsJson("Attendance");
    for (var i = 0; i < attendanceData.length; i++) {
      var attEvId = String(attendanceData[i].eventId || attendanceData[i].eventid || "").trim();
      var attSess = attendanceData[i].session ? attendanceData[i].session.toString().trim() : "";
      if (String(attendanceData[i].studentId).trim() === String(studentId).trim() && 
          attEvId === targetEvIdStr && 
          attSess === targetSessStr) {
        return { success: false, message: "Attendance already recorded for " + sessionName + "." };
      }
    }
    
    // 2. Fetch student details
    var studentData = getSheetDataAsJson("Students");
    var student = null;
    for (var i = 0; i < studentData.length; i++) {
      if (String(studentData[i].studentId).trim() === String(studentId).trim()) {
        student = studentData[i];
        break;
      }
    }
    if (!student) return { success: false, message: "Student record not found." };
    
    // 3. Fetch event details
    var eventData = getSheetDataAsJson("Events");
    var eventObj = null;
    for (var i = 0; i < eventData.length; i++) {
      if (String(eventData[i].eventId || eventData[i].eventid || "").trim() === targetEvIdStr) {
        eventObj = eventData[i];
        break;
      }
    }
    if (!eventObj) return { success: false, message: "Event record not found." };
    
    // 4. Upload images to Google Drive folder structure: "IEEE_Attendance_Photos/{EventName}_{EventId}/{SessionName}/"
    var cleanEventName = eventObj.eventName.replace(/[^a-zA-Z0-9]/g, "_");
    var folderPath = cleanEventName + "_" + targetEvIdStr.substring(0, 8) + "/" + sessionName.replace(/\s+/g, "_");
    
    var facePhotoURL = uploadImageToDrive(facePhotoBase64, FACE_PHOTOS_FOLDER_ID, folderPath, student.registrationNumber + "_face.jpg");
    var idPhotoURL = uploadImageToDrive(idPhotoBase64, ID_PHOTOS_FOLDER_ID, folderPath, student.registrationNumber + "_id.jpg");
    
    // 5. Append attendance logs to sheet
    var attendanceId = "attendance_" + targetEvIdStr + "_" + sessionName.replace(/\s+/g, "_") + "_" + studentId;
    var timestamp = new Date().toISOString();
    var status = "Pending Verification";
    var remarks = "";
    
    attendanceSheet.appendRow([
      attendanceId,
      studentId,
      student.registrationNumber,
      student.name,
      student.department,
      eventId,
      eventObj.eventName,
      sessionName,
      facePhotoURL,
      idPhotoURL,
      status,
      remarks,
      volunteerId,
      timestamp
    ]);
    
    return { success: true, message: "Attendance record successfully logged and marked as 'Pending Verification'." };
  } catch (e) {
    Logger.log("Attendance submission error: " + e.toString());
    return { success: false, message: "Server error submitting attendance: " + e.message };
  }
}

function verifyAttendanceRecord(attendanceId, status, remarks) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Attendance");
    if (!sheet) return { success: false, message: "Attendance sheet database not found." };
    
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: false, message: "No attendance records in system." };
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var idColIndex = headers.indexOf("attendanceId") + 1;
    var statusColIndex = headers.indexOf("status") + 1;
    var remarksColIndex = headers.indexOf("remarks") + 1;
    
    if (idColIndex === 0 || statusColIndex === 0 || remarksColIndex === 0) {
      return { success: false, message: "Sheet schema configuration error." };
    }
    
    var ids = sheet.getRange(2, idColIndex, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]).trim() === String(attendanceId).trim()) {
        // Update status and remarks (row index is 2-based)
        sheet.getRange(i + 2, statusColIndex).setValue(status);
        sheet.getRange(i + 2, remarksColIndex).setValue(remarks || "");
        return { success: true, message: "Attendance record marked as " + status + "." };
      }
    }
    
    return { success: false, message: "Record matching ID not found." };
  } catch (e) {
    return { success: false, message: "Error updating verification: " + e.message };
  }
}

function getActiveSessionForEvent(eventId) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("SessionStatuses");
    if (!sheet) return { success: false, message: "SessionStatuses sheet not found." };
    
    var targetEvIdStr = String(eventId).trim();
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === targetEvIdStr && String(data[i][2]).trim() === "Open") {
        return { success: true, sessionName: data[i][1], isOpen: true };
      }
    }
    return { success: true, sessionName: null, isOpen: false };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

/**
 * Emergency Manual Attendance - Admin Only
 * Records attendance manually when normal volunteer process fails.
 * Includes full audit trail: adminId, timestamp, method=Manual, reason.
 */
function markManualAttendance(studentId, registrationNumber, studentName, department, eventId, eventName, sessionName, reason, adminId) {
  try {
    var ss = getSpreadsheet();
    var attendanceSheet = ss.getSheetByName("Attendance");
    if (!attendanceSheet) return { success: false, message: "Attendance sheet database not found." };

    // 1. Duplicate check - one attendance per student per session
    var attendanceData = getSheetDataAsJson("Attendance");
    var targetEvIdStr = String(eventId).trim();
    var targetSessStr = String(sessionName).trim();
    for (var i = 0; i < attendanceData.length; i++) {
      var attEvId = String(attendanceData[i].eventId || attendanceData[i].eventid || "").trim();
      var attSess = attendanceData[i].session ? attendanceData[i].session.toString().trim() : "";
      if (String(attendanceData[i].studentId).trim() === String(studentId).trim() &&
          attEvId === targetEvIdStr &&
          attSess === targetSessStr) {
        return { success: false, message: "Attendance already recorded for " + studentName + " in " + sessionName + ". Duplicate entry blocked." };
      }
    }

    // 2. Build attendance record
    var attendanceId = "attendance_" + eventId + "_" + sessionName.replace(/\s+/g, "_") + "_" + studentId;
    var timestamp = new Date().toISOString();
    var status = "Verified"; // Manual entries by admin are auto-verified
    var remarks = "[MANUAL] Reason: " + reason + " | Recorded by: " + adminId + " | Method: Manual";
    var facePhotoURL = ""; // No photos for manual entry
    var idPhotoURL = "";
    var volunteerId = "ADMIN_MANUAL:" + adminId;

    attendanceSheet.appendRow([
      attendanceId,
      studentId,
      registrationNumber,
      studentName,
      department,
      eventId,
      eventName,
      sessionName,
      facePhotoURL,
      idPhotoURL,
      status,
      remarks,
      volunteerId,
      timestamp
    ]);

    return {
      success: true,
      message: "Manual attendance recorded for " + studentName + " (" + registrationNumber + ") in " + sessionName + ". Status: Verified."
    };
  } catch (e) {
    Logger.log("Manual attendance error: " + e.toString());
    return { success: false, message: "Server error recording manual attendance: " + e.message };
  }
}
