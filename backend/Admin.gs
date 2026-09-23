/**
 * IEEE Event Attendance System - Admin Services
 */

function clearAllStudentsData() {
  try {
    var ss = getSpreadsheet();
    var studentSheet = ss.getSheetByName("Students");
    if (!studentSheet) return { success: false, message: "Students sheet not found." };
    
    var lastRow = studentSheet.getLastRow();
    if (lastRow > 1) {
      studentSheet.deleteRows(2, lastRow - 1);
    }
    
    // Also clear associated attendance records
    var attSheet = ss.getSheetByName("Attendance");
    if (attSheet) {
      var attLastRow = attSheet.getLastRow();
      if (attLastRow > 1) {
        attSheet.deleteRows(2, attLastRow - 1);
      }
    }
    
    return { success: true, message: "All previous participant records and attendance logs have been erased." };
  } catch (e) {
    return { success: false, message: "Error erasing previous data: " + e.message };
  }
}

function importParticipantsFromExcelArray(rows, erasePrevious) {
  try {
    var ss = getSpreadsheet();
    var studentSheet = ss.getSheetByName("Students");
    if (!studentSheet) return { success: false, message: "Students sheet database not found." };

    if (erasePrevious === true || erasePrevious === "true") {
      var lastRow = studentSheet.getLastRow();
      if (lastRow > 1) {
        studentSheet.deleteRows(2, lastRow - 1);
      }
      var attSheet = ss.getSheetByName("Attendance");
      if (attSheet) {
        var attLastRow = attSheet.getLastRow();
        if (attLastRow > 1) {
          attSheet.deleteRows(2, attLastRow - 1);
        }
      }
    }
    
    var existingStudents = getSheetDataAsJson("Students");
    var existingRegs = {};
    for (var k = 0; k < existingStudents.length; k++) {
      var r = existingStudents[k].registrationNumber ? existingStudents[k].registrationNumber.toString().trim().toLowerCase().replace(/\s+/g, "") : "";
      if (r) existingRegs[r] = true;
    }
    
    var importedCount = 0;
    var newRowsToAppend = [];
    
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var regNum = row["Registration Number"] || row["regNumber"] || row["regNum"] || row["username"] || row["Username"] || row["user"] || row["User Name"];
      var name = row["Name"] || row["name"] || row["Full Name"] || row["fullname"];
      var dept = row["Department"] || row["department"] || row["dept"] || "General";
      var email = row["Email"] || row["email"] || "";
      var pwd = row["Passwords"] || row["Password"] || row["password"] || row["pwd"] || "";
      
      if (!regNum || !name) continue;
      
      regNum = regNum.toString().trim();
      name = name.toString().trim();
      dept = dept ? dept.toString().trim() : "General";
      email = email ? email.toString().trim() : "";
      pwd = pwd ? pwd.toString().trim() : regNum;
      
      var regNumNormalized = regNum.toLowerCase().replace(/\s+/g, "");
      if (!existingRegs[regNumNormalized]) {
        var studentId = "student_" + Utilities.getUuid();
        var qrToken = "qr_" + Utilities.getUuid().replace(/-/g, "");
        var studentHash = pwd;
        
        newRowsToAppend.push([
          studentId,
          regNum,
          name,
          dept,
          email,
          studentHash,
          qrToken,
          "student",
          "" // Instant vector QR generation on client-side via qrToken
        ]);
        
        existingRegs[regNumNormalized] = true;
        importedCount++;
      }
    }
    
    if (newRowsToAppend.length > 0) {
      var startRow = studentSheet.getLastRow() + 1;
      studentSheet.getRange(startRow, 1, newRowsToAppend.length, 9).setValues(newRowsToAppend);
    }
    
    return { success: true, message: "Successfully imported " + importedCount + " participants in record time." };
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

function createEvent(eventName, eventDateStr, sessionsCount, photoRequirement) {
  try {
    var ss = getSpreadsheet();
    var eventSheet = ss.getSheetByName("Events");
    if (!eventSheet) return { success: false, message: "Events sheet database not found." };
    
    // Ensure column 5 has header if sheet was previously created with only 4 columns
    if (eventSheet.getLastColumn() < 5) {
      eventSheet.getRange(1, 5).setValue("photoRequirement");
    }

    var eventId = "event_" + Utilities.getUuid();
    var countVal = parseInt(sessionsCount) || 1;
    var photoReq = String(photoRequirement || "both").toLowerCase().trim();
    if (["both", "face_only", "id_only", "none"].indexOf(photoReq) === -1) {
      photoReq = "both";
    }
    
    eventSheet.appendRow([
      eventId,
      eventName.trim(),
      eventDateStr,
      countVal,
      photoReq
    ]);
    
    // Seed Locked session statuses
    var sessionStatusesSheet = getOrCreateSheet(ss, "SessionStatuses", ["eventId", "sessionName", "status"]);
    for (var s = 1; s <= countVal; s++) {
      sessionStatusesSheet.appendRow([eventId, "Session " + s, "Locked"]);
    }
    
    return { success: true, message: "Event created successfully with " + countVal + " sessions." };
  } catch (e) {
    return { success: false, message: "Error creating event: " + e.message };
  }
}

function addEventSession(eventId, sessionName) {
  try {
    var ss = getSpreadsheet();
    var sheet = getOrCreateSheet(ss, "SessionStatuses", ["eventId", "sessionName", "status"]);
    var targetIdStr = String(eventId).trim();
    var targetSessStr = String(sessionName || "").trim();
    if (!targetSessStr) {
      return { success: false, message: "Session name cannot be empty." };
    }
    
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === targetIdStr && String(data[i][1]).trim().toLowerCase() === targetSessStr.toLowerCase()) {
        return { success: false, message: "A session named '" + targetSessStr + "' already exists for this event." };
      }
    }
    
    sheet.appendRow([targetIdStr, targetSessStr, "Locked"]);
    
    // Update count in Events sheet if present
    var eventSheet = ss.getSheetByName("Events");
    if (eventSheet) {
      var evData = eventSheet.getDataRange().getValues();
      for (var e = 1; e < evData.length; e++) {
        if (String(evData[e][0]).trim() === targetIdStr) {
          var curCount = parseInt(evData[e][3]) || 0;
          eventSheet.getRange(e + 1, 4).setValue(curCount + 1);
          break;
        }
      }
    }
    
    return { success: true, message: "Session '" + targetSessStr + "' added successfully." };
  } catch (e) {
    return { success: false, message: "Error adding session: " + e.message };
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
    
    var targetIdStr = String(eventId).trim();
    var eventData = eventSheet.getDataRange().getValues();
    var eventRowToDelete = -1;
    for (var i = 1; i < eventData.length; i++) { // Skip header row
      if (String(eventData[i][0]).trim() === targetIdStr) { // eventId is the first column
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
        if (String(attData[j][5]).trim() === targetIdStr) { // eventId is the 6th column (index 5)
          attSheet.deleteRow(j + 1);
        }
      }
    }
    
    // 3. Delete associated SessionStatuses records
    var sessSheet = ss.getSheetByName("SessionStatuses");
    if (sessSheet) {
      var sessData = sessSheet.getDataRange().getValues();
      for (var k = sessData.length - 1; k >= 1; k--) {
        if (String(sessData[k][0]).trim() === targetIdStr) {
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
      if (String(studentData[i][0]).trim() === String(studentId).trim()) { // studentId is the first column
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
        if (String(attData[j][1]).trim() === String(studentId).trim()) { // studentId is the 2nd column (index 1)
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
    var ss = getSpreadsheet();
    var sessionStatusesSheet = getOrCreateSheet(ss, "SessionStatuses", ["eventId", "sessionName", "status"]);
    
    // Always deduplicate to clean any repeated rows and restore valid headers
    deduplicateSessionStatuses();

    var targetIdStr = String(eventId).trim();
    var data = sessionStatusesSheet.getDataRange().getValues();
    var uniqueSessions = [];
    var seenSess = {};

    for (var i = 1; i < data.length; i++) {
      var rowEvId = String(data[i][0]).trim();
      var rowSessName = String(data[i][1]).trim();
      var rowStatus = String(data[i][2]).trim();

      if (rowEvId === targetIdStr && rowSessName) {
        if (!seenSess[rowSessName]) {
          seenSess[rowSessName] = true;
          uniqueSessions.push({
            eventId: data[i][0],
            sessionName: rowSessName,
            status: rowStatus || "Locked"
          });
        }
      }
    }

    // Auto-healing fallback: If no sessions found in SessionStatuses for this event, auto-create them from Events
    if (uniqueSessions.length === 0) {
      var events = getSheetDataAsJson("Events");
      var targetEv = null;
      for (var k = 0; k < events.length; k++) {
        var evId = String(events[k].eventId || events[k].eventid || events[k]["event id"] || "").trim();
        if (evId === targetIdStr) {
          targetEv = events[k];
          break;
        }
      }

      var countVal = 1;
      if (targetEv) {
        countVal = parseInt(targetEv.sessionsCount || targetEv.sessionscount || targetEv["sessions count"]) || 1;
      }
      var realEvId = (targetEv && (targetEv.eventId || targetEv.eventid)) || targetIdStr;

      for (var s = 1; s <= countVal; s++) {
        var sessName = "Session " + s;
        sessionStatusesSheet.appendRow([realEvId, sessName, "Locked"]);
        uniqueSessions.push({
          eventId: realEvId,
          sessionName: sessName,
          status: "Locked"
        });
      }
    }

    return { success: true, sessions: uniqueSessions };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function setSessionStatus(eventId, sessionName, newStatus) {
  try {
    var ss = getSpreadsheet();
    var sheet = getOrCreateSheet(ss, "SessionStatuses", ["eventId", "sessionName", "status"]);
    
    var data = sheet.getDataRange().getValues();
    if (data.length > 50) {
      deduplicateSessionStatuses();
      data = sheet.getDataRange().getValues();
    }

    var targetIdStr = String(eventId).trim();
    var targetSessStr = String(sessionName).trim();
    
    // Enforce the rule that only one session can be Open system-wide at any time
    if (newStatus === "Open") {
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][2]).trim() === "Open") {
          var openEventId = String(data[i][0]).trim();
          var openSessionName = String(data[i][1]).trim();
          
          // Skip if it is already this exact session
          if (openEventId === targetIdStr && openSessionName === targetSessStr) {
            continue;
          }
          
          var events = getSheetDataAsJson("Events");
          var openEventName = "Another Event";
          for (var k = 0; k < events.length; k++) {
            if (String(events[k].eventId || events[k].eventid || "").trim() === openEventId) {
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
    
    var foundAny = false;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === targetIdStr && String(data[i][1]).trim() === targetSessStr) {
        sheet.getRange(i + 1, 3).setValue(newStatus);
        foundAny = true;
      }
    }
    
    if (!foundAny) {
      sheet.appendRow([eventId, sessionName, newStatus]);
    }
    
    return { success: true, message: sessionName + " status updated to " + newStatus + "." };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Calculate Google Drive storage metrics and folder links
 */
function getDriveStorageStats() {
  try {
    function getFolderStats(folderId, defaultName) {
      var stats = { count: 0, sizeBytes: 0, url: "#", name: defaultName };
      if (!folderId) return stats;
      try {
        var folder = DriveApp.getFolderById(folderId);
        stats.name = folder.getName();
        stats.url = folder.getUrl();
        
        var files = folder.getFiles();
        while (files.hasNext()) {
          var f = files.next();
          stats.count++;
          stats.sizeBytes += f.getSize();
        }
        
        var subFolders = folder.getFolders();
        while (subFolders.hasNext()) {
          var sf = subFolders.next();
          var subFiles = sf.getFiles();
          while (subFiles.hasNext()) {
            var subF = subFiles.next();
            stats.count++;
            stats.sizeBytes += subF.getSize();
          }
        }
      } catch (err) {
        Logger.log("Error reading folder " + folderId + ": " + err.message);
      }
      return stats;
    }

    function formatBytes(bytes) {
      if (!bytes || bytes === 0) return "0 MB";
      var mb = bytes / (1024 * 1024);
      if (mb >= 1024) {
        return (mb / 1024).toFixed(2) + " GB";
      }
      return mb.toFixed(2) + " MB";
    }

    var faceStats = getFolderStats(FACE_PHOTOS_FOLDER_ID, "Face Photos");
    var idStats = getFolderStats(ID_PHOTOS_FOLDER_ID, "ID Photos");
    var qrStats = getFolderStats(QR_CODES_FOLDER_ID, "QR Codes");
    var parentFolderUrl = DB_PARENT_FOLDER_ID ? ("https://drive.google.com/drive/folders/" + DB_PARENT_FOLDER_ID) : "https://drive.google.com";

    var totalBytes = faceStats.sizeBytes + idStats.sizeBytes + qrStats.sizeBytes;
    var totalCount = faceStats.count + idStats.count + qrStats.count;

    return {
      success: true,
      totalCount: totalCount,
      totalSizeBytes: totalBytes,
      totalSizeFormatted: formatBytes(totalBytes),
      parentFolderUrl: parentFolderUrl,
      folders: {
        face: {
          name: "Face Photos",
          count: faceStats.count,
          sizeFormatted: formatBytes(faceStats.sizeBytes),
          url: faceStats.url || ("https://drive.google.com/drive/folders/" + FACE_PHOTOS_FOLDER_ID)
        },
        idCard: {
          name: "ID Card Photos",
          count: idStats.count,
          sizeFormatted: formatBytes(idStats.sizeBytes),
          url: idStats.url || ("https://drive.google.com/drive/folders/" + ID_PHOTOS_FOLDER_ID)
        },
        qr: {
          name: "QR Badges",
          count: qrStats.count,
          sizeFormatted: formatBytes(qrStats.sizeBytes),
          url: qrStats.url || ("https://drive.google.com/drive/folders/" + QR_CODES_FOLDER_ID)
        }
      }
    };
  } catch (e) {
    return { success: false, message: "Error calculating drive storage: " + e.message };
  }
}
