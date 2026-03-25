/**
 * UroStudyHub — Study Analytics Collection (Google Apps Script)
 *
 * Setup:
 * 1. Go to https://script.google.com and create a new project
 * 2. Paste this entire file
 * 3. Click Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy the deployment URL and paste it into UroStudyHub Settings → Study Sync URL
 *
 * The sheet auto-creates columns on first POST. Each row = one daily snapshot per user.
 * Upserts: if the same user+date already exists, it updates that row.
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Auto-create header row if empty
    if (sheet.getLastRow() === 0) {
      var headers = [
        "Date", "UserId", "StudyGroup", "TopicsDone", "TotalTopics", "PctComplete",
        "XP", "Coins", "Streak", "Sessions", "ActiveDays", "TotalStudyMins",
        "AnkiReviews", "GamesPlayed", "TokensEarned", "TokensSpent",
        "SrsTracked", "SrsOverdue", "AvgConfidence", "Role", "FirstOpen", "SyncTime"
      ];
      sheet.appendRow(headers);
      // Bold the header
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    }

    var date = data.date || new Date().toISOString().split("T")[0];
    var userId = data.userId || "unknown";

    // Check if this user+date combo already exists (upsert)
    var lastRow = sheet.getLastRow();
    var existingRow = -1;
    if (lastRow > 1) {
      var dateCol = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      var userCol = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
      for (var i = 0; i < dateCol.length; i++) {
        var cellDate = dateCol[i][0];
        if (cellDate instanceof Date) {
          cellDate = Utilities.formatDate(cellDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
        }
        if (String(cellDate) === date && String(userCol[i][0]) === userId) {
          existingRow = i + 2; // +2 because: 1-indexed + header row
          break;
        }
      }
    }

    var row = [
      date,
      userId,
      data.studyGroup || "unassigned",
      data.topicsDone || 0,
      data.totalTopics || 0,
      data.pctComplete || 0,
      data.xp || 0,
      data.coins || 0,
      data.streak || 0,
      data.sessions || 0,
      data.activeDays || 0,
      data.totalStudyMins || 0,
      data.ankiReviews || 0,
      data.gamesPlayed || 0,
      data.tokensEarned || 0,
      data.tokensSpent || 0,
      data.srsTracked || 0,
      data.srsOverdue || 0,
      data.avgConfidence || "N/A",
      data.role || "",
      data.firstOpen || "",
      new Date().toISOString(),
    ];

    if (existingRow > 0) {
      // Update existing row
      sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
    } else {
      // Append new row
      sheet.appendRow(row);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "ok" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  // Return all data as JSON for easy analysis
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ rows: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var headers = data[0];
    var rows = [];
    for (var i = 1; i < data.length; i++) {
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        obj[headers[j]] = data[i][j];
      }
      rows.push(obj);
    }
    return ContentService.createTextOutput(JSON.stringify({ rows: rows }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
