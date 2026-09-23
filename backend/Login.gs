/**
 * IEEE Event Attendance System - Login Services
 */

function verifyLoginCredentials(username, password) {
  try {
    if (!username || !password) {
      return { success: false, message: "Username and Password are required." };
    }
    
    var pwd = password.trim();
    var normalizedUsername = username.trim().toLowerCase();
    
    // 1. Check Admins sheet (match by username)
    var admins = getSheetDataAsJson("Admins");
    for (var i = 0; i < admins.length; i++) {
      var adminUser = admins[i].username ? admins[i].username.toString().trim().toLowerCase() : "";
      if (adminUser === normalizedUsername && admins[i].password.toString().trim() === pwd) {
        return {
          success: true,
          role: "admin",
          name: admins[i].name,
          username: admins[i].username,
          userId: admins[i].adminId
        };
      }
    }
    
    // 2. Check Volunteers sheet (match by username)
    var volunteers = getSheetDataAsJson("Volunteers");
    for (var i = 0; i < volunteers.length; i++) {
      var volUser = volunteers[i].username ? volunteers[i].username.toString().trim().toLowerCase() : "";
      if (volUser === normalizedUsername && volunteers[i].password.toString().trim() === pwd) {
        return {
          success: true,
          role: "volunteer",
          name: volunteers[i].name,
          username: volunteers[i].username,
          userId: volunteers[i].volunteerId
        };
      }
    }
    
    // 3. Check Students sheet (match by username / registration number or email)
    var students = getSheetDataAsJson("Students");
    var normalizedUsernameNoSpaces = normalizedUsername.replace(/\s+/g, "");
    for (var i = 0; i < students.length; i++) {
      var studentReg = students[i].registrationNumber ? students[i].registrationNumber.toString().trim().toLowerCase().replace(/\s+/g, "") : "";
      var studentEmail = students[i].email ? students[i].email.toString().trim().toLowerCase().replace(/\s+/g, "") : "";
      if ((studentReg === normalizedUsernameNoSpaces || studentEmail === normalizedUsernameNoSpaces) && students[i].password.toString().trim() === pwd) {
        return {
          success: true,
          role: "student",
          name: students[i].name,
          registrationNumber: students[i].email || students[i].registrationNumber,
          email: students[i].email || students[i].registrationNumber,
          department: "",
          userId: students[i].studentId
        };
      }
    }
    
    return { success: false, message: "Invalid username or password." };
  } catch (e) {
    Logger.log("Login error: " + e.toString());
    return { success: false, message: "Server login error: " + e.message };
  }
}

/**
 * Universal password updater endpoint
 */
function updateSessionPassword(userId, oldPassword, newPassword, role) {
  try {
    var ss = getSpreadsheet();
    var sheetName = "";
    var idColName = "";
    
    if (role === "admin") {
      sheetName = "Admins";
      idColName = "adminId";
    } else if (role === "volunteer") {
      sheetName = "Volunteers";
      idColName = "volunteerId";
    } else if (role === "student") {
      sheetName = "Students";
      idColName = "studentId";
    } else {
      return { success: false, message: "Unauthorized role." };
    }
    
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { success: false, message: "Sheet database not found." };
    
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: false, message: "No user records found." };
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var idColIndex = headers.indexOf(idColName) + 1;
    var passwordColIndex = headers.indexOf("password") + 1;
    
    if (idColIndex === 0 || passwordColIndex === 0) {
      return { success: false, message: "Configuration error in Sheet." };
    }
    
    var ids = sheet.getRange(2, idColIndex, lastRow - 1, 1).getValues();
    var passwords = sheet.getRange(2, passwordColIndex, lastRow - 1, 1).getValues();
    
    var hashedOld = oldPassword.trim();
    var hashedNew = newPassword.trim();
    
    for (var i = 0; i < ids.length; i++) {
      if (ids[i][0] === userId) {
        if (passwords[i][0] !== hashedOld) {
          return { success: false, message: "Incorrect current password." };
        }
        
        // Write new password hash (row index is 2-based)
        sheet.getRange(i + 2, passwordColIndex).setValue(hashedNew);
        return { success: true, message: "Password updated successfully!" };
      }
    }
    
    return { success: false, message: "User not found in system." };
  } catch (e) {
    return { success: false, message: "Error changing password: " + e.message };
  }
}
