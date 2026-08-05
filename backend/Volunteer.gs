/**
 * IEEE Event Attendance System - Volunteer Services
 */

function getVolunteerEventsList() {
  try {
    var events = getSheetDataAsJson("Events");
    return { success: true, events: events };
  } catch (e) {
    return { success: false, message: "Error loading events: " + e.message };
  }
}
