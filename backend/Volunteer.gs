/**
 * IEEE Event Attendance System - Volunteer Services
 */

function getVolunteerEventsList() {
  try {
    var events = getSheetDataAsJson("Events");
    for (var i = 0; i < events.length; i++) {
      if (!events[i].photoRequirement) {
        events[i].photoRequirement = "both";
      }
    }
    return { success: true, events: events };
  } catch (e) {
    return { success: false, message: "Error loading events: " + e.message };
  }
}
