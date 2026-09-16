import React, { useState } from 'react';
import { X, Copy, Check, FileCode, ExternalLink, Download, ShieldCheck, Terminal, Layers } from 'lucide-react';

interface AppsScriptGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadStandalone: () => void;
}

export const AppsScriptGuideModal: React.FC<AppsScriptGuideModalProps> = ({
  isOpen,
  onClose,
  onDownloadStandalone,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'instructions' | 'code'>('instructions');

  if (!isOpen) return null;

  const appsScriptCode = `/**
 * LifeSync Tracker - Unified Google Apps Script Backend
 * Web App REST API for Google Sheets bi-directional synchronization.
 * 
 * Deployment: Web App ("Execute as: Me", "Who has access: Anyone")
 */

function createJsonResponse(data, statusCode) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

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
      return createJsonResponse({ status: 'error', message: 'Unknown action: ' + action }, 400);
    }
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString(), stack: err.stack }, 500);
  }
}

function doPost(e) {
  try {
    var payload;
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    } else {
      throw new Error('No payload received');
    }

    if (payload.action === 'initializeSheet') return handleInitializeSheet(payload);
    if (payload.action === 'fetchData') return handleFetchData(payload);

    var sheetId = payload.sheetId;
    var targetTab = payload.targetTab; // "Income" or "Calories"
    var data = payload.data;

    if (!sheetId || !targetTab || !data) {
      throw new Error('Missing sheetId, targetTab, or data parameters');
    }

    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheetByName(targetTab);
    if (!sheet) {
      throw new Error('Target tab "' + targetTab + '" not found');
    }

    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'UTC', 'yyyy-MM-dd HH:mm:ss');
    var rowToAppend = [timestamp].concat(data);

    sheet.appendRow(rowToAppend);

    return createJsonResponse({
      status: 'success',
      message: 'Logged to ' + targetTab,
      targetTab: targetTab,
      recordedRow: rowToAppend,
      timestamp: timestamp
    });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() }, 500);
  }
}

function handleInitializeSheet(params) {
  var token = params.accessToken || params.token;
  var userName = 'User';
  var userEmail = '';

  if (token) {
    try {
      var res = UrlFetchApp.fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { 'Authorization': 'Bearer ' + token },
        muteHttpExceptions: true
      });
      if (res.getResponseCode() === 200) {
        var profile = JSON.parse(res.getContentText());
        if (profile.name) userName = profile.name;
        if (profile.email) userEmail = profile.email;
      }
    } catch (e) {
      Logger.log('UserInfo error: ' + e);
    }
  }

  var sheetTitle = userName + "'s LifeSync Tracker";
  var ss = SpreadsheetApp.create(sheetTitle);
  var defaultSheet = ss.getSheets()[0];

  // 1. Income tab
  var incSheet = ss.insertSheet('Income');
  incSheet.appendRow(['Timestamp', 'Date', 'Type', 'Category', 'Amount', 'Note']);
  formatHeaderRow(incSheet, '#0f172a', '#f8fafc', 6);
  incSheet.setFrozenRows(1);

  // 2. Income Settings tab
  var incSettings = ss.insertSheet('Income Settings');
  incSettings.appendRow(['Income Categories', 'Expense Categories']);
  formatHeaderRow(incSettings, '#1e293b', '#f1f5f9', 2);
  incSettings.setFrozenRows(1);
  var seedInc = ['Salary', 'Freelance', 'Investments', 'Bonus', 'Dividends', 'Other Income'];
  var seedExp = ['Food & Dining', 'Rent & Housing', 'Utilities & Bills', 'Groceries', 'Transport', 'Health & Fitness', 'Shopping', 'Entertainment', 'Other Expense'];
  for (var i = 0; i < Math.max(seedInc.length, seedExp.length); i++) {
    incSettings.appendRow([seedInc[i] || '', seedExp[i] || '']);
  }

  // 3. Calories tab
  var calSheet = ss.insertSheet('Calories');
  calSheet.appendRow(['Timestamp', 'Date', 'Type', 'Category', 'Kcal', 'Note']);
  formatHeaderRow(calSheet, '#0f172a', '#f8fafc', 6);
  calSheet.setFrozenRows(1);

  // 4. Calories Settings tab
  var calSettings = ss.insertSheet('Calories Settings');
  calSettings.appendRow(['Food consumed Categories', 'Exercise Categories']);
  formatHeaderRow(calSettings, '#1e293b', '#f1f5f9', 2);
  calSettings.setFrozenRows(1);
  var seedFood = ['Breakfast', 'Lunch', 'Dinner', 'Morning Snack', 'Afternoon Snack', 'Drinks & Smoothies'];
  var seedExer = ['Running', 'Gym & Weights', 'Walking', 'Cycling', 'Swimming', 'HIIT / Cardio', 'Yoga'];
  for (var j = 0; j < Math.max(seedFood.length, seedExer.length); j++) {
    calSettings.appendRow([seedFood[j] || '', seedExer[j] || '']);
  }

  try {
    if (defaultSheet && ss.getSheets().length > 1) ss.deleteSheet(defaultSheet);
  } catch (e) {}

  if (userEmail) {
    try { ss.addEditor(userEmail); } catch (e) {}
  }

  [incSheet, incSettings, calSheet, calSettings].forEach(function(s) {
    try { s.autoResizeColumns(1, s.getLastColumn()); } catch (e) {}
  });

  return createJsonResponse({
    status: 'success',
    sheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl(),
    sheetTitle: sheetTitle,
    userName: userName,
    userEmail: userEmail
  });
}

function handleFetchData(params) {
  var sheetId = params.sheetId;
  if (!sheetId) throw new Error('Missing sheetId parameter');

  var ss = SpreadsheetApp.openById(sheetId);
  var incomeCategories = [];
  var expenseCategories = [];
  var incSettings = ss.getSheetByName('Income Settings');
  if (incSettings && incSettings.getLastRow() > 1) {
    var vals = incSettings.getRange(2, 1, incSettings.getLastRow() - 1, 2).getValues();
    vals.forEach(function(r) {
      if (r[0]) incomeCategories.push(String(r[0]).trim());
      if (r[1]) expenseCategories.push(String(r[1]).trim());
    });
  }

  var foodCategories = [];
  var exerciseCategories = [];
  var calSettings = ss.getSheetByName('Calories Settings');
  if (calSettings && calSettings.getLastRow() > 1) {
    var cVals = calSettings.getRange(2, 1, calSettings.getLastRow() - 1, 2).getValues();
    cVals.forEach(function(r) {
      if (r[0]) foodCategories.push(String(r[0]).trim());
      if (r[1]) exerciseCategories.push(String(r[1]).trim());
    });
  }

  var incomeLogs = [];
  var incSheet = ss.getSheetByName('Income');
  if (incSheet && incSheet.getLastRow() > 1) {
    var rows = incSheet.getRange(2, 1, incSheet.getLastRow() - 1, 6).getValues();
    rows.forEach(function(r, idx) {
      incomeLogs.push({
        id: 'inc_' + idx + '_' + (r[0] || Date.now()),
        timestamp: r[0] ? String(r[0]) : '',
        date: formatDateValue(r[1]),
        type: String(r[2] || 'Expense'),
        category: String(r[3] || 'General'),
        amount: parseFloat(r[4]) || 0,
        note: String(r[5] || '')
      });
    });
  }

  var calorieLogs = [];
  var calSheet = ss.getSheetByName('Calories');
  if (calSheet && calSheet.getLastRow() > 1) {
    var cRows = calSheet.getRange(2, 1, calSheet.getLastRow() - 1, 6).getValues();
    cRows.forEach(function(r, idx) {
      calorieLogs.push({
        id: 'cal_' + idx + '_' + (r[0] || Date.now()),
        timestamp: r[0] ? String(r[0]) : '',
        date: formatDateValue(r[1]),
        type: String(r[2] || 'Food consumed'),
        category: String(r[3] || 'General'),
        kcal: parseFloat(r[4]) || 0,
        note: String(r[5] || '')
      });
    });
  }

  return createJsonResponse({
    status: 'success',
    sheetTitle: ss.getName(),
    spreadsheetUrl: ss.getUrl(),
    sheetId: sheetId,
    settings: {
      incomeCategories: incomeCategories,
      expenseCategories: expenseCategories,
      foodCategories: foodCategories,
      exerciseCategories: exerciseCategories
    },
    incomeLogs: incomeLogs,
    calorieLogs: calorieLogs,
    lastSynced: new Date().toISOString()
  });
}

function formatDateValue(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone() || 'UTC', 'yyyy-MM-dd');
  }
  var str = String(val);
  return str.length >= 10 && str.charAt(4) === '-' ? str.substring(0, 10) : str;
}

function formatHeaderRow(sheet, bgColor, textColor, numCols) {
  var range = sheet.getRange(1, 1, 1, numCols);
  range.setFontWeight('bold').setBackground(bgColor).setFontColor(textColor).setHorizontalAlignment('center');
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Google Apps Script Backend & Guide</h2>
              <p className="text-xs text-slate-300">
                Setup guide, Web App deployment, and complete Code.gs script
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Code.gs'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center border-b border-slate-200 px-6 pt-3 bg-slate-50 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('instructions')}
            className={`pb-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
              activeTab === 'instructions'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Step-by-Step Deployment Guide</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`pb-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
              activeTab === 'code'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Full Script (Code.gs)</span>
          </button>
        </div>

        {/* Content area */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-700 space-y-4">
          {activeTab === 'instructions' ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-900 leading-relaxed">
                  <p className="font-bold mb-0.5">How LifeSync Works with Google Apps Script:</p>
                  Google Apps Script acts as your personal, free, serverless REST API running directly inside your Google Cloud ecosystem. It creates your formatted sheet, updates rows safely with timestamps, and returns your dashboard data with zero subscription fees.
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Open Google Apps Script</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Go to <a href="https://script.google.com/home/start" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-0.5 font-medium">script.google.com <ExternalLink className="w-3 h-3" /></a> and click <b>New Project</b>. Name the project <code>LifeSync Backend API</code>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Paste the Backend Code</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Click the <b>"Full Script (Code.gs)"</b> tab above, copy the entire script, and replace the contents of <code>Code.gs</code> in your Apps Script editor. Press <kbd className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">Ctrl+S</kbd> to save.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Deploy as a Web App</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Click <b>Deploy &gt; New deployment</b> at top right. Select type: <b>Web app</b>.
                    </p>
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-xs text-slate-600">
                      <li>Description: <code className="bg-slate-200 px-1 rounded">LifeSync Production v1</code></li>
                      <li>Execute as: <b>Me (your-email@gmail.com)</b></li>
                      <li>Who has access: <b>Anyone</b></li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    4
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Authorize & Copy URL</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Click <b>Deploy</b>. When Google prompts "Authorization required", click <i>Review permissions</i> &gt; choose your Google account &gt; <i>Advanced</i> &gt; <i>Go to LifeSync Backend API (unsafe)</i> &gt; <i>Allow</i>.
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      Copy the generated <b>Web App URL</b> (it ends with <code>/exec</code>) and paste it into the LifeSync setup modal!
                    </p>
                  </div>
                </div>
              </div>

              {/* Single File standalone export action */}
              <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-emerald-900">Want the Standalone Single-File index.html?</h4>
                  <p className="text-xs text-emerald-700">
                    Self-host on any static server or open locally directly in Chrome/Safari.
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-download-standalone"
                  onClick={onDownloadStandalone}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition shadow-xs cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Download index.html</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="relative">
              <pre className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800 select-all">
                {appsScriptCode}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            LifeSync Engine &bull; Bi-directional Google Sheets API
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-white hover:bg-slate-900 transition"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
