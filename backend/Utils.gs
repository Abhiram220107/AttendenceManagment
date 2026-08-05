/**
 * IEEE Event Attendance System - Utilities
 */

// Google Drive Folder Configurations
var FACE_PHOTOS_FOLDER_ID = "1F5O3gpB-Zd4NJXnW4WRtd4pQKy6D_GOq";
var ID_PHOTOS_FOLDER_ID = "1-uaBjM9fhKxbG1yLCpRDzGKRCZ49YRkI";
var QR_CODES_FOLDER_ID = "1OcXSmEsQdnrtw94L7kir9BClvCSVL_at";
// Primary Drive ID fallback
var DB_PARENT_FOLDER_ID = "17zD7-zgbK1T6M50cAV2w6hISXzik4DtT"; 

// Google Sheets Configurations
// Optional: Paste your Google Sheet ID here if running as a standalone script (e.g. from the Sheet URL)
var SPREADSHEET_ID = "1Ovlt7CieFXgxJr28E7x6ldyPhRiNZT6CPqe5o7sRzb8";

function getSpreadsheet() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * SHA-256 Hashing helper
 */
function hashPassword(password) {
  if (!password) return "";
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password, Utilities.Charset.UTF_8);
  var signature = "";
  for (var i = 0; i < digest.length; i++) {
    var byteValue = digest[i];
    if (byteValue < 0) byteValue += 256;
    var byteString = byteValue.toString(16);
    if (byteString.length == 1) byteString = "0" + byteString;
    signature += byteString;
  }
  return signature;
}

/**
 * Helper to upload base64 images directly into Google Drive
 */
function uploadImageToDrive(base64Data, parentFolderId, subFolder, fileName) {
  try {
    var parts = base64Data.split(",");
    var contentType = parts[0].split(";")[0].split(":")[1] || "image/jpeg";
    var base64Image = parts[1];
    var decoded = Utilities.base64Decode(base64Image);
    var blob = Utilities.newBlob(decoded, contentType, fileName);
    
    // Resolve target parent folder by ID or default folder name
    var parentFolder;
    var targetId = parentFolderId || DB_PARENT_FOLDER_ID;
    if (targetId) {
      parentFolder = DriveApp.getFolderById(targetId);
    } else {
      var parentFolders = DriveApp.getFoldersByName("IEEE_Attendance_Photos");
      if (parentFolders.hasNext()) {
        parentFolder = parentFolders.next();
      } else {
        parentFolder = DriveApp.createFolder("IEEE_Attendance_Photos");
      }
    }
    
    // Get or create sub-folder
    var folder;
    var subFolders = parentFolder.getFoldersByName(subFolder);
    if (subFolders.hasNext()) {
      folder = subFolders.next();
    } else {
      folder = parentFolder.createFolder(subFolder);
    }
    
    var file = folder.createFile(blob);
    return "https://lh3.googleusercontent.com/d/" + file.getId();
  } catch (e) {
    Logger.log("Error uploading file: " + e.toString());
    throw new Error("Drive upload failed: " + e.message);
  }
}

/**
 * Helper to find a sheet or create it with headers if missing
 */
function getOrCreateSheet(ss, sheetName, headers) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    // Format headers
    var range = sheet.getRange(1, 1, 1, headers.length);
    range.setFontWeight("bold");
    range.setBackground("#00629B");
    range.setFontColor("#FFFFFF");
  }
  return sheet;
}

/**
 * Setup sheets database and seed default admin account
 */
function initDatabase() {
  var ss = getSpreadsheet();
  if (!ss) {
    throw new Error("Script is not connected to a spreadsheet. Please configure your SPREADSHEET_ID in Utils.gs or run inside a bound script.");
  }
  
  // Programmatic migration checks: Delete old day-based tables if they exist
  var oldEvents = ss.getSheetByName("Events");
  if (oldEvents) {
    var headers = oldEvents.getRange(1, 1, 1, Math.max(1, oldEvents.getLastColumn())).getValues()[0];
    if (headers.indexOf("daysCount") !== -1 || headers.indexOf("startDate") !== -1) {
      ss.deleteSheet(oldEvents);
    }
  }
  
  var oldAttendance = ss.getSheetByName("Attendance");
  if (oldAttendance) {
    var headers = oldAttendance.getRange(1, 1, 1, Math.max(1, oldAttendance.getLastColumn())).getValues()[0];
    if (headers.indexOf("day") !== -1) {
      ss.deleteSheet(oldAttendance);
    }
  }
  
  // Define tables & headers
  getOrCreateSheet(ss, "Admins", ["adminId", "username", "name", "password"]);
  getOrCreateSheet(ss, "Students", ["studentId", "registrationNumber", "name", "department", "email", "password", "qrToken", "role", "qrCodeURL"]);
  getOrCreateSheet(ss, "Volunteers", ["volunteerId", "name", "username", "password"]);
  getOrCreateSheet(ss, "Events", ["eventId", "eventName", "eventDate", "sessionsCount"]);
  getOrCreateSheet(ss, "Attendance", ["attendanceId", "studentId", "registrationNumber", "name", "department", "eventId", "eventName", "session", "facePhotoURL", "idPhotoURL", "status", "remarks", "volunteerId", "timestamp"]);
  var sessionStatusesSheet = getOrCreateSheet(ss, "SessionStatuses", ["eventId", "sessionName", "status"]);
  
  // Seed admin if Admins sheet is empty (only header exists)
  var adminSheet = ss.getSheetByName("Admins");
  if (adminSheet.getLastRow() === 1) {
    var adminId = "admin_" + Utilities.getUuid();
    var defaultUsername = "admin";
    var defaultName = "IEEE Admin";
    var defaultHash = "Admin@123";
    adminSheet.appendRow([adminId, defaultUsername, defaultName, defaultHash]);
    Logger.log("Seeded default admin successfully.");
  }
  
  // Auto-migration: Seed SessionStatuses for any events that don't have them
  var eventsSheet = ss.getSheetByName("Events");
  if (eventsSheet && eventsSheet.getLastRow() > 1) {
    var events = getSheetDataAsJson("Events");
    var sessionStatuses = getSheetDataAsJson("SessionStatuses");
    
    var existingSet = {};
    sessionStatuses.forEach(function(s) {
      existingSet[s.eventId + "_" + s.sessionName] = true;
    });
    
    events.forEach(function(ev) {
      var sessionsCount = parseInt(ev.sessionsCount) || 1;
      for (var s = 1; s <= sessionsCount; s++) {
        var sessionName = "Session " + s;
        var key = ev.eventId + "_" + sessionName;
        if (!existingSet[key]) {
          sessionStatusesSheet.appendRow([ev.eventId, sessionName, "Locked"]);
        }
      }
    });
  }
  
  return "Database initialized successfully.";
}

/**
 * Utility to convert sheet data to array of JSON objects
 */
function getSheetDataAsJson(sheetName) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  
  var result = [];
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var headerVal = headers[j] ? headers[j].toString().trim() : "";
      if (headerVal) {
        var cellVal = row[j];
        if (cellVal instanceof Date) {
          cellVal = cellVal.toISOString();
        }
        obj[headerVal] = cellVal;
        obj[headerVal.toLowerCase()] = cellVal;
      }
    }
    result.push(obj);
  }
  return result;
}

function testGetEvents() {
  try {
    var ss = getSpreadsheet();
    Logger.log("--- DEBUG START ---");
    Logger.log("Spreadsheet ID used: " + ss.getId());
    Logger.log("Spreadsheet Name: " + ss.getName());
    
    var sheet = ss.getSheetByName("Events");
    if (!sheet) {
      Logger.log("ERROR: Sheet 'Events' NOT found!");
      return;
    }
    
    Logger.log("Sheet Tab Name: " + sheet.getName());
    Logger.log("Last Row: " + sheet.getLastRow());
    Logger.log("Last Column: " + sheet.getLastColumn());
    
    var data = sheet.getDataRange().getValues();
    Logger.log("Raw Sheet Row Content count: " + data.length);
    for (var i = 0; i < data.length; i++) {
      Logger.log("Row " + (i+1) + ": " + JSON.stringify(data[i]));
    }
    
    var parsed = getSheetDataAsJson("Events");
    Logger.log("Parsed JSON Array count: " + parsed.length);
    Logger.log("Parsed JSON Events Content: " + JSON.stringify(parsed));
    Logger.log("--- DEBUG END ---");
  } catch (e) {
    Logger.log("CRITICAL ERROR IN DEBUG: " + e.toString());
  }
}
