/**
 * LifeSync Tracker - Unified Google Apps Script Backend
 * Web App REST API for Google Sheets bi-directional synchronization.
 * 
 * Deployment Instructions:
 * 1. Open Google Sheets or go to https://script.google.com/home/start
 * 2. Create a "New project" and name it "LifeSync Backend API"
 * 3. Replace all code in Code.gs with this entire script
 * 4. Click "Deploy" > "New deployment"
 * 5. Select type: "Web app"
 *    - Description: "LifeSync Production v1"
 *    - Execute as: "Me" (your Google account)
 *    - Who has access: "Anyone"
 * 6. Click "Deploy", authorize the permissions when prompted
 * 7. Copy the generated "Web App URL" (ends with /exec) and paste it into your LifeSync Dashboard!
 */

// Helper to format consistent JSON responses with CORS-friendly headers
function createJsonResponse(data, statusCode) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Handles HTTP GET requests
 * Execution paths:
 * 1. action=initializeSheet: Creates sheet in user drive, provisions 4 tabs, returns sheetId & url
 * 2. action=fetchData: Reads options and historical logs from Income and Calories tabs
 * 3. action=ping: Health check
 */
function doGet(e) {
  try {
    var params = e && e.parameter ? e.parameter : {};
    var action = params.action;

    if (!action || action === 'ping') {
      return createJsonResponse({
        status: 'success',
        message: 'LifeSync Apps Script Backend is online and operational.',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'initializeSheet') {
      return handleInitializeSheet(params);
    } else if (action === 'fetchData') {
      return handleFetchData(params);
    } else {
      return createJsonResponse({
        status: 'error',
        message: 'Unknown action parameter: ' + action
      }, 400);
    }
  } catch (err) {
    return createJsonResponse({
      status: 'error',
      message: err.toString(),
      stack: err.stack
    }, 500);
  }
}

/**
 * Handles HTTP POST requests
 * Records new entries to "Income" or "Calories" tabs.
 */
function doPost(e) {
  try {
    var payload;
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        // Fallback if URL-encoded
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    } else {
      throw new Error('No post data or payload detected in request.');
    }

    // Support sheet initialization via POST as well
    if (payload.action === 'initializeSheet') {
      return handleInitializeSheet(payload);
    }
    if (payload.action === 'fetchData') {
      return handleFetchData(payload);
    }

    var sheetId = payload.sheetId;
    var targetTab = payload.targetTab; // "Income" or "Calories"
    var data = payload.data; // Array of values: [Date, Type, Category, Amount/Kcal, Note]

    if (!sheetId) {
      throw new Error('Missing required parameter: sheetId');
    }
    if (!targetTab) {
      throw new Error('Missing required parameter: targetTab ("Income" or "Calories")');
    }
    if (!data || !Array.isArray(data)) {
      throw new Error('Missing or invalid data parameter. Must be an array of values.');
    }

    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheetByName(targetTab);
    if (!sheet) {
      throw new Error('Target tab "' + targetTab + '" not found in spreadsheet ' + sheetId);
    }

    // Prepend a new JavaScript new Date() timestamp to the row data
    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'UTC', 'yyyy-MM-dd HH:mm:ss');
    var rowToAppend = [timestamp].concat(data);

    sheet.appendRow(rowToAppend);

    return createJsonResponse({
      status: 'success',
      message: 'Row successfully logged to ' + targetTab,
      targetTab: targetTab,
      recordedRow: rowToAppend,
      timestamp: timestamp
    });

  } catch (err) {
    return createJsonResponse({
      status: 'error',
      message: err.toString(),
      stack: err.stack
    }, 500);
  }
}

/**
 * Provision & Initialize a new LifeSync Tracker Google Sheet
 */
function handleInitializeSheet(params) {
  var token = params.accessToken || params.token;
  var userName = 'User';
  var userEmail = '';

  // Attempt to call Google UserInfo API if token is provided
  if (token) {
    try {
      var userinfoResponse = UrlFetchApp.fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          'Authorization': 'Bearer ' + token
        },
        muteHttpExceptions: true
      });

      if (userinfoResponse.getResponseCode() === 200) {
        var profile = JSON.parse(userinfoResponse.getContentText());
        if (profile.name) {
          userName = profile.name;
        } else if (profile.given_name) {
          userName = profile.given_name;
        }
        if (profile.email) {
          userEmail = profile.email;
        }
      }
    } catch (tokenErr) {
      // Non-fatal, fallback to default name
      Logger.log('Could not fetch user profile: ' + tokenErr.toString());
    }
  }

  // Create new Google Sheet named "[User Name]'s LifeSync Tracker"
  var sheetTitle = userName + "'s LifeSync Tracker";
  var ss = SpreadsheetApp.create(sheetTitle);
  var defaultSheet = ss.getSheets()[0]; // Keep reference to delete later

  // 1. Initialize "Income" tab
  var incomeSheet = ss.insertSheet('Income');
  var incomeHeaders = ['Timestamp', 'Date', 'Type', 'Category', 'Amount', 'Note'];
  incomeSheet.appendRow(incomeHeaders);
  formatHeaderRow(incomeSheet, '#0f172a', '#f8fafc', 6);
  incomeSheet.setFrozenRows(1);

  // 2. Initialize "Income Settings" tab
  var incomeSettingsSheet = ss.insertSheet('Income Settings');
  incomeSettingsSheet.appendRow(['Income Categories', 'Expense Categories']);
  formatHeaderRow(incomeSettingsSheet, '#1e293b', '#f1f5f9', 2);
  incomeSettingsSheet.setFrozenRows(1);

  var seedIncomeCategories = ['Salary', 'Freelance', 'Investments', 'Bonus', 'Dividends', 'Gift', 'Other Income'];
  var seedExpenseCategories = ['Food & Dining', 'Rent & Housing', 'Utilities & Bills', 'Groceries', 'Transport', 'Health & Fitness', 'Shopping', 'Entertainment', 'Education', 'Other Expense'];
  
  var maxIncomeRows = Math.max(seedIncomeCategories.length, seedExpenseCategories.length);
  for (var i = 0; i < maxIncomeRows; i++) {
    var inc = seedIncomeCategories[i] || '';
    var exp = seedExpenseCategories[i] || '';
    incomeSettingsSheet.appendRow([inc, exp]);
  }

  // 3. Initialize "Calories" tab
  var calSheet = ss.insertSheet('Calories');
  var calHeaders = ['Timestamp', 'Date', 'Type', 'Category', 'Kcal', 'Note'];
  calSheet.appendRow(calHeaders);
  formatHeaderRow(calSheet, '#0f172a', '#f8fafc', 6);
  calSheet.setFrozenRows(1);

  // 4. Initialize "Calories Settings" tab
  var calSettingsSheet = ss.insertSheet('Calories Settings');
  calSettingsSheet.appendRow(['Food consumed Categories', 'Exercise Categories']);
  formatHeaderRow(calSettingsSheet, '#1e293b', '#f1f5f9', 2);
  calSettingsSheet.setFrozenRows(1);

  var seedFoodCategories = ['Breakfast', 'Lunch', 'Dinner', 'Morning Snack', 'Afternoon Snack', 'Drinks & Smoothies', 'Cheat Meal'];
  var seedExerciseCategories = ['Running', 'Gym & Weights', 'Walking', 'Cycling', 'Swimming', 'HIIT / Cardio', 'Yoga & Stretching', 'Sports'];

  var maxCalRows = Math.max(seedFoodCategories.length, seedExerciseCategories.length);
  for (var j = 0; j < maxCalRows; j++) {
    var food = seedFoodCategories[j] || '';
    var exer = seedExerciseCategories[j] || '';
    calSettingsSheet.appendRow([food, exer]);
  }

  // Delete default initial sheet (Sheet1)
  try {
    if (defaultSheet && ss.getSheets().length > 1) {
      ss.deleteSheet(defaultSheet);
    }
  } catch (delErr) {
    Logger.log('Could not delete initial default sheet: ' + delErr);
  }

  // Share with user email if available
  if (userEmail) {
    try {
      ss.addEditor(userEmail);
    } catch (shareErr) {
      Logger.log('Share error: ' + shareErr);
    }
  }

  // Auto-resize columns for readability
  [incomeSheet, incomeSettingsSheet, calSheet, calSettingsSheet].forEach(function(s) {
    try {
      s.autoResizeColumns(1, s.getLastColumn());
    } catch (e) {}
  });

  return createJsonResponse({
    status: 'success',
    sheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl(),
    sheetTitle: sheetTitle,
    userName: userName,
    userEmail: userEmail,
    message: 'LifeSync Tracker Sheet successfully provisioned and initialized.'
  });
}

/**
 * Fetch all categories and historical logs from the spreadsheet
 */
function handleFetchData(params) {
  var sheetId = params.sheetId;
  if (!sheetId) {
    throw new Error('Missing sheetId parameter');
  }

  var ss = SpreadsheetApp.openById(sheetId);

  // 1. Read Income Settings
  var incomeCategories = [];
  var expenseCategories = [];
  var incSettingsSheet = ss.getSheetByName('Income Settings');
  if (incSettingsSheet && incSettingsSheet.getLastRow() > 1) {
    var incData = incSettingsSheet.getRange(2, 1, incSettingsSheet.getLastRow() - 1, 2).getValues();
    incData.forEach(function(row) {
      if (row[0] && String(row[0]).trim() !== '') incomeCategories.push(String(row[0]).trim());
      if (row[1] && String(row[1]).trim() !== '') expenseCategories.push(String(row[1]).trim());
    });
  }

  // 2. Read Calories Settings
  var foodCategories = [];
  var exerciseCategories = [];
  var calSettingsSheet = ss.getSheetByName('Calories Settings');
  if (calSettingsSheet && calSettingsSheet.getLastRow() > 1) {
    var calData = calSettingsSheet.getRange(2, 1, calSettingsSheet.getLastRow() - 1, 2).getValues();
    calData.forEach(function(row) {
      if (row[0] && String(row[0]).trim() !== '') foodCategories.push(String(row[0]).trim());
      if (row[1] && String(row[1]).trim() !== '') exerciseCategories.push(String(row[1]).trim());
    });
  }

  // 3. Read Income historical logs (Columns: Timestamp, Date, Type, Category, Amount, Note)
  var incomeLogs = [];
  var incomeSheet = ss.getSheetByName('Income');
  if (incomeSheet && incomeSheet.getLastRow() > 1) {
    var incRows = incomeSheet.getRange(2, 1, incomeSheet.getLastRow() - 1, 6).getValues();
    incRows.forEach(function(r, idx) {
      if (r[1] || r[4] !== '') { // Has date or amount
        var amt = parseFloat(r[4]);
        incomeLogs.push({
          id: 'inc_' + idx + '_' + (r[0] || Date.now()),
          timestamp: r[0] ? String(r[0]) : '',
          date: formatDateValue(r[1]),
          type: String(r[2] || 'Expense'),
          category: String(r[3] || 'General'),
          amount: isNaN(amt) ? 0 : amt,
          note: String(r[5] || '')
        });
      }
    });
  }

  // 4. Read Calories historical logs (Columns: Timestamp, Date, Type, Category, Kcal, Note)
  var calorieLogs = [];
  var calSheet = ss.getSheetByName('Calories');
  if (calSheet && calSheet.getLastRow() > 1) {
    var calRows = calSheet.getRange(2, 1, calSheet.getLastRow() - 1, 6).getValues();
    calRows.forEach(function(r, idx) {
      if (r[1] || r[4] !== '') { // Has date or kcal
        var kcalVal = parseFloat(r[4]);
        calorieLogs.push({
          id: 'cal_' + idx + '_' + (r[0] || Date.now()),
          timestamp: r[0] ? String(r[0]) : '',
          date: formatDateValue(r[1]),
          type: String(r[2] || 'Food consumed'),
          category: String(r[3] || 'General'),
          kcal: isNaN(kcalVal) ? 0 : kcalVal,
          note: String(r[5] || '')
        });
      }
    });
  }

  return createJsonResponse({
    status: 'success',
    sheetTitle: ss.getName(),
    spreadsheetUrl: ss.getUrl(),
    sheetId: sheetId,
    settings: {
      incomeCategories: incomeCategories.length > 0 ? incomeCategories : ['Salary', 'Freelance', 'Investments', 'Other Income'],
      expenseCategories: expenseCategories.length > 0 ? expenseCategories : ['Food & Dining', 'Rent & Housing', 'Utilities', 'Groceries', 'Transport', 'Shopping', 'Other Expense'],
      foodCategories: foodCategories.length > 0 ? foodCategories : ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Drinks'],
      exerciseCategories: exerciseCategories.length > 0 ? exerciseCategories : ['Running', 'Gym', 'Walking', 'Cycling', 'Swimming']
    },
    incomeLogs: incomeLogs,
    calorieLogs: calorieLogs,
    lastSynced: new Date().toISOString()
  });
}

// Utility to format date objects safely to YYYY-MM-DD string
function formatDateValue(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone() || 'UTC', 'yyyy-MM-dd');
  }
  var str = String(val);
  if (str.length >= 10 && str.charAt(4) === '-' && str.charAt(7) === '-') {
    return str.substring(0, 10);
  }
  return str;
}

// Format header row helper
function formatHeaderRow(sheet, bgColor, textColor, numCols) {
  var headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange.setFontWeight('bold');
  headerRange.setBackground(bgColor);
  headerRange.setFontColor(textColor);
  headerRange.setHorizontalAlignment('center');
  headerRange.setFontSize(10);
}
