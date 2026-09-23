/**
 * IEEE Event Attendance System - Student Services
 */

function getStudentProfileData(userId) {
  try {
    var students = getSheetDataAsJson("Students");
    var student = null;
    
    for (var i = 0; i < students.length; i++) {
      if (students[i].studentId === userId) {
        student = students[i];
        break;
      }
    }
    
    if (!student) {
      return { success: false, message: "Student profile not found." };
    }
    
    // Strip hash before sending to client
    delete student.password;
    
    var events = getSheetDataAsJson("Events");
    var attendance = getSheetDataAsJson("Attendance");
    var sessionStatusesData = getSheetDataAsJson("SessionStatuses");
    
    // Filter attendance logs for this student
    var myAttendance = [];
    for (var k = 0; k < attendance.length; k++) {
      if (attendance[k].studentId === userId) {
        myAttendance.push(attendance[k]);
      }
    }
    
    var checklist = [];
    for (var j = 0; j < events.length; j++) {
      var ev = events[j];
      var sessionsCount = parseInt(ev.sessionsCount) || 1;
      var sessionStatuses = {};
      
      // Parse event date to see if it has passed
      var isEventPast = false;
      try {
        if (ev.eventDate) {
          var today = new Date();
          today.setHours(0,0,0,0);
          
          var dateStr = ev.eventDate.toString().split("T")[0];
          var parts = dateStr.split("-");
          var eventTime;
          if (parts[0].length === 4) { // YYYY-MM-DD
            eventTime = new Date(parts[0], parts[1] - 1, parts[2]);
          } else { // DD-MM-YYYY
            eventTime = new Date(parts[2], parts[1] - 1, parts[0]);
          }
          eventTime.setHours(0,0,0,0);
          
          if (eventTime < today) {
            isEventPast = true;
          }
        }
      } catch (dateErr) {
        // Safe fallback
      }
      
      for (var s = 1; s <= sessionsCount; s++) {
        var sessionName = "Session " + s;
        var status = "Pending";
        var remarks = "";
        var hasAttended = false;
        var evIdStr = String(ev.eventId || ev.eventid || "").trim();
        
        for (var a = 0; a < myAttendance.length; a++) {
          var attEvId = String(myAttendance[a].eventId || myAttendance[a].eventid || "").trim();
          var attSess = myAttendance[a].session ? myAttendance[a].session.toString().trim() : "";
          if (attEvId === evIdStr && attSess === sessionName) {
            status = myAttendance[a].status;
            remarks = myAttendance[a].remarks || "";
            hasAttended = true;
            break;
          }
        }
        
        if (!hasAttended) {
          var sessionDbStatus = "Locked"; // Default fallback
          for (var x = 0; x < sessionStatusesData.length; x++) {
            var sEvId = String(sessionStatusesData[x].eventId || sessionStatusesData[x].eventid || "").trim();
            var sSessName = String(sessionStatusesData[x].sessionName || sessionStatusesData[x].sessionname || "").trim();
            if (sEvId === evIdStr && sSessName === sessionName) {
              sessionDbStatus = sessionStatusesData[x].status;
              break;
            }
          }
          if (sessionDbStatus === "Locked") {
            status = "Locked";
          } else {
            status = "Not Started";
          }
        }
        
        sessionStatuses[sessionName] = {
          status: status,
          remarks: remarks
        };
      }
      
      checklist.push({
        eventId: ev.eventId,
        eventName: ev.eventName,
        attendance: sessionStatuses
      });
    }
    
    student.attendanceChecklist = checklist;
    return { success: true, profile: student };
  } catch (e) {
    return { success: false, message: "Error loading profile: " + e.message };
  }
}

/**
 * Self-registration endpoint for account creation
 * Requires strictly Name, Username, and Password only
 */
function registerAccount(name, username, password) {
  try {
    if (!name || !username || !password) {
      return { success: false, message: "Name, Username, and Password are required." };
    }

    var cleanName = name.toString().trim();
    var cleanUsername = username.toString().trim();
    var cleanPassword = password.toString().trim();

    if (!cleanName || !cleanUsername || !cleanPassword) {
      return { success: false, message: "All fields must be filled." };
    }

    var normalizedUsername = cleanUsername.toLowerCase();
    var normalizedNoSpaces = normalizedUsername.replace(/\s+/g, "");

    var ss = getSpreadsheet();
    var studentSheet = ss.getSheetByName("Students");
    if (!studentSheet) return { success: false, message: "Database error: Students sheet not found." };

    // Check duplicate in Admins
    var admins = getSheetDataAsJson("Admins");
    for (var a = 0; a < admins.length; a++) {
      var aUser = admins[a].username ? admins[a].username.toString().trim().toLowerCase() : "";
      if (aUser === normalizedUsername) {
        return { success: false, message: "This username is already taken. Please choose another." };
      }
    }

    // Check duplicate in Volunteers
    var volunteers = getSheetDataAsJson("Volunteers");
    for (var v = 0; v < volunteers.length; v++) {
      var vUser = volunteers[v].username ? volunteers[v].username.toString().trim().toLowerCase() : "";
      if (vUser === normalizedUsername) {
        return { success: false, message: "This username is already taken. Please choose another." };
      }
    }

    // Check duplicate in Students (registrationNumber / username)
    var students = getSheetDataAsJson("Students");
    for (var s = 0; s < students.length; s++) {
      var sReg = students[s].registrationNumber ? students[s].registrationNumber.toString().trim().toLowerCase().replace(/\s+/g, "") : "";
      if (sReg === normalizedNoSpaces) {
        return { success: false, message: "An account with this username already exists." };
      }
    }

    var studentId = "student_" + Utilities.getUuid();
    var qrToken = "qr_" + Utilities.getUuid().replace(/-/g, "");

    studentSheet.appendRow([
      studentId,
      cleanUsername,
      cleanName,
      "General",
      "",
      cleanPassword,
      qrToken,
      "student",
      ""
    ]);

    return { 
      success: true, 
      message: "Account created successfully! You can now sign in with your username and password." 
    };
  } catch (e) {
    return { success: false, message: "Error creating account: " + e.message };
  }
}
