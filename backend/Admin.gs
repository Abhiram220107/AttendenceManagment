/**
 * IEEE Event Attendance System - Admin Services
 */

function importParticipantsFromExcelArray(rows) {
  try {
    var ss = getSpreadsheet();
    var studentSheet = ss.getSheetByName("Students");
    if (!studentSheet) return { success: false, message: "Students sheet database not found." };
    
    var existingStudents = getSheetDataAsJson("Students");
    var existingRegs = existingStudents.map(function(s) { 
      return s.registrationNumber ? s.registrationNumber.toString().trim().toLowerCase().replace(/\s+/g, "") : ""; 
    });
    
    var importedCount = 0;
    
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var regNum = row["Registration Number"] || row["regNumber"] || row["regNum"];
      var name = row["Name"] || row["name"];
      var dept = row["Department"] || row["department"] || row["dept"];
      var email = row["Email"] || row["email"] || "";
      var pwd = row["Passwords"] || row["Password"] || row["password"] || "";
      
      if (!regNum || !name || !dept) continue;
      
      regNum = regNum.toString().trim();
      name = name.toString().trim();
      dept = dept.toString().trim();
      email = email.toString().trim();
      pwd = pwd ? pwd.toString().trim() : regNum;
      
      var regNumNormalized = regNum.toLowerCase().replace(/\s+/g, "");
      if (existingRegs.indexOf(regNumNormalized) === -1) {
        var studentId = "student_" + Utilities.getUuid();
        var qrToken = "qr_" + Utilities.getUuid().replace(/-/g, "");
        
        // Generate QR code image and upload it to Google Drive QR codes folder
        var qrCodeURL = "";
        try {
          var qrApiUrl = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" + encodeURIComponent(qrToken);
          var response = UrlFetchApp.fetch(qrApiUrl);
          var blob = response.getBlob().setName(regNum + "_qr.png");
          
          var qrFolder = DriveApp.getFolderById(QR_CODES_FOLDER_ID);
          var file = qrFolder.createFile(blob);
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          qrCodeURL = "https://lh3.googleusercontent.com/d/" + file.getId();
        } catch (qrErr) {
          Logger.log("QR Image generation failed: " + qrErr.toString());
        }
        
        var studentHash = pwd;
        
        studentSheet.appendRow([
          studentId,
          regNum,
          name,
          dept,
          email,
          studentHash,
          qrToken,
          "student",
          qrCodeURL
        ]);
        
        existingRegs.push(regNum.toLowerCase());
        importedCount++;
      }
    }
    
    return { success: true, message: "Successfully imported " + importedCount + " participants." };
  } catch (e) {
    return { success: false, message: "Error importing: " + e.message };
  }
}

function createVolunteerAccount(name, username, password) {
  try {
    var ss = getSpreadsheet();
    var volSheet = ss.getSheetByName("Volunteers");
    if (!volSheet) return { success: false, message: "Volunteers sheet not found." };
    
    // Check duplicates
    var volunteers = getSheetDataAsJson("Volunteers");
    for (var i = 0; i < volunteers.length; i++) {
      if (volunteers[i].username && volunteers[i].username.toLowerCase() === username.trim().toLowerCase()) {
        return { success: false, message: "Volunteer with this username already exists." };
      }
    }
    
    var volunteerId = "volunteer_" + Utilities.getUuid();
    var hashed = password.trim();
    
    volSheet.appendRow([
      volunteerId,
      name.trim(),
      username.trim(),
      hashed
    ]);
    
    return { success: true, message: "Volunteer account registered successfully." };
  } catch (e) {
    return { success: false, message: "Error registering volunteer: " + e.message };
  }
}

function createEvent(eventName, eventDateStr, sessionsCount) {
  try {
    var ss = getSpreadsheet();
    var eventSheet = ss.getSheetByName("Events");
    if (!eventSheet) return { success: false, message: "Events sheet database not found." };
    
    var eventId = "event_" + Utilities.getUuid();
    var countVal = parseInt(sessionsCount) || 1;
    
    eventSheet.appendRow([
      eventId,
      eventName.trim(),
      eventDateStr,
      countVal
    ]);
    
    // Seed Locked session statuses
    var sessionStatusesSheet = ss.getSheetByName("SessionStatuses");
    if (sessionStatusesSheet) {
      for (var s = 1; s <= countVal; s++) {
        sessionStatusesSheet.appendRow([eventId, "Session " + s, "Locked"]);
      }
    }
    
    return { success: true, message: "Event created successfully with " + countVal + " sessions." };
  } catch (e) {
    return { success: false, message: "Error creating event: " + e.message };
  }
}

function getAdminStudentsList() {
  try {
    var students = getSheetDataAsJson("Students");
    // Strip hash
    for (var i = 0; i < students.length; i++) {
      delete students[i].password;
    }
    return { success: true, students: students };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getAdminVolunteersList() {
  try {
    var volunteers = getSheetDataAsJson("Volunteers");
    for (var i = 0; i < volunteers.length; i++) {
      delete volunteers[i].password;
    }
    return { success: true, volunteers: volunteers };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getPendingVerifications() {
  try {
    var attendance = getSheetDataAsJson("Attendance");
    var volunteers = getSheetDataAsJson("Volunteers");
    
    // Build a lookup map for volunteer names
    var volMap = {};
    for (var v = 0; v < volunteers.length; v++) {
      volMap[volunteers[v].volunteerId] = volunteers[v].name;
    }
    
    var pending = [];
    for (var i = 0; i < attendance.length; i++) {
      if (attendance[i].status === "Pending Verification") {
        attendance[i].volunteerName = volMap[attendance[i].volunteerId] || "Unknown";
        pending.push(attendance[i]);
      }
    }
    return { success: true, records: pending };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getReportStats(eventId) {
  try {
    var students = getSheetDataAsJson("Students");
    var totalStudents = students.length;
    
    var attendance = getSheetDataAsJson("Attendance");
    
    var verified = 0;
    var pending = 0;
    var rejected = 0;
    var sessionStats = {};
    
    for (var i = 0; i < attendance.length; i++) {
      var rec = attendance[i];
      if (eventId && rec.eventId !== eventId) continue;
      
      var status = rec.status;
      var session = rec.session || "Session 1";
      
      if (status === "Verified") {
        verified++;
        sessionStats[session] = (sessionStats[session] || 0) + 1;
      } else if (status === "Pending Verification") {
        pending++;
      } else if (status === "Rejected") {
        rejected++;
      }
    }
    
    return {
      success: true,
      stats: {
        totalParticipants: totalStudents,
        verified: verified,
        pending: pending,
        rejected: rejected,
        sessionStats: sessionStats
      }
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getAdminAttendanceRecords(eventId) {
  try {
    var attendance = getSheetDataAsJson("Attendance");
    var filtered = [];
    for (var i = 0; i < attendance.length; i++) {
      if (!eventId || attendance[i].eventId === eventId) {
        filtered.push(attendance[i]);
      }
    }
    return { success: true, records: filtered };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function deleteEvent(eventId) {
  try {
    var ss = getSpreadsheet();
    
    // 1. Delete from Events sheet
    var eventSheet = ss.getSheetByName("Events");
    if (!eventSheet) return { success: false, message: "Events sheet not found." };
    
    var eventData = eventSheet.getDataRange().getValues();
    var eventRowToDelete = -1;
    for (var i = 1; i < eventData.length; i++) { // Skip header row
      if (eventData[i][0] === eventId) { // eventId is the first column
        eventRowToDelete = i + 1; // 1-based index
        break;
      }
    }
    
    if (eventRowToDelete === -1) {
      return { success: false, message: "Event not found." };
    }
    
    eventSheet.deleteRow(eventRowToDelete);
    
    // 2. Delete associated Attendance records (cascade delete)
    var attSheet = ss.getSheetByName("Attendance");
    if (attSheet) {
      var attData = attSheet.getDataRange().getValues();
      // Iterate backwards when deleting multiple rows
      for (var j = attData.length - 1; j >= 1; j--) {
        if (attData[j][5] === eventId) { // eventId is the 6th column (index 5)
          attSheet.deleteRow(j + 1);
        }
      }
    }
    
    // 3. Delete associated SessionStatuses records
    var sessSheet = ss.getSheetByName("SessionStatuses");
    if (sessSheet) {
      var sessData = sessSheet.getDataRange().getValues();
      for (var k = sessData.length - 1; k >= 1; k--) {
        if (sessData[k][0] === eventId) {
          sessSheet.deleteRow(k + 1);
        }
      }
    }
    
    return { success: true, message: "Event and its attendance records deleted successfully." };
  } catch (e) {
    return { success: false, message: "Error deleting event: " + e.message };
  }
}

function deleteStudent(studentId) {
  try {
    var ss = getSpreadsheet();
    
    // 1. Delete from Students sheet
    var studentSheet = ss.getSheetByName("Students");
    if (!studentSheet) return { success: false, message: "Students sheet not found." };
    
    var studentData = studentSheet.getDataRange().getValues();
    var studentRowToDelete = -1;
    for (var i = 1; i < studentData.length; i++) { // Skip header row
      if (studentData[i][0] === studentId) { // studentId is the first column
        studentRowToDelete = i + 1; // 1-based index
        break;
      }
    }
    
    if (studentRowToDelete === -1) {
      return { success: false, message: "Student not found." };
    }
    
    studentSheet.deleteRow(studentRowToDelete);
    
    // 2. Delete associated Attendance records (cascade delete)
    var attSheet = ss.getSheetByName("Attendance");
    if (attSheet) {
      var attData = attSheet.getDataRange().getValues();
      // Iterate backwards when deleting multiple rows
      for (var j = attData.length - 1; j >= 1; j--) {
        if (attData[j][1] === studentId) { // studentId is the 2nd column (index 1)
          attSheet.deleteRow(j + 1);
        }
      }
    }
    
    return { success: true, message: "Student and their attendance records deleted successfully." };
  } catch (e) {
    return { success: false, message: "Error deleting student: " + e.message };
  }
}

function getEventSessions(eventId) {
  try {
    var allSessions = getSheetDataAsJson("SessionStatuses");
    var filtered = allSessions.filter(function(s) {
      return s.eventId === eventId;
    });
    return { success: true, sessions: filtered };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function setSessionStatus(eventId, sessionName, newStatus) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("SessionStatuses");
    if (!sheet) return { success: false, message: "SessionStatuses sheet not found." };
    
    var data = sheet.getDataRange().getValues();
    var targetRowIndex = -1;
    
    // Enforce the rule that only one session can be Open system-wide at any time
    if (newStatus === "Open") {
      for (var i = 1; i < data.length; i++) {
        if (data[i][2] === "Open") {
          var openEventId = data[i][0];
          var openSessionName = data[i][1];
          var events = getSheetDataAsJson("Events");
          var openEventName = "Another Event";
          for (var k = 0; k < events.length; k++) {
            if (events[k].eventId === openEventId) {
              openEventName = events[k].eventName;
              break;
            }
          }
          return { 
            success: false, 
            message: "Cannot open session. '" + openSessionName + "' for '" + openEventName + "' is currently Open. Please close it first." 
          };
        }
      }
    }
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === eventId && data[i][1] === sessionName) {
        targetRowIndex = i + 1; // 1-based row index
        break;
      }
    }
    
    if (targetRowIndex === -1) {
      return { success: false, message: "Session not found." };
    }
    
    sheet.getRange(targetRowIndex, 3).setValue(newStatus); // Status is column 3
    return { success: true, message: sessionName + " status updated to " + newStatus + "." };
  } catch (e) {
    return { success: false, message: e.message };
  }
}
