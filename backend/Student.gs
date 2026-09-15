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
