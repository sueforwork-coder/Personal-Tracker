import { AppConfig, CalorieLog, IncomeLog, SheetSettings } from '../types';

const STORAGE_KEYS = {
  CONFIG: 'lifesync_config_v1',
  INCOME_LOGS: 'lifesync_income_logs_v1',
  CALORIE_LOGS: 'lifesync_calorie_logs_v1',
  SETTINGS: 'lifesync_settings_v1',
  MAX_CALORIES: 'lifesync_max_daily_calories_v1',
};

export const DEFAULT_SETTINGS: SheetSettings = {
  incomeCategories: ['Salary', 'Freelance', 'Investments', 'Bonus', 'Dividends', 'Other Income'],
  expenseCategories: ['Food & Dining', 'Rent & Housing', 'Utilities & Bills', 'Groceries', 'Transport', 'Health & Fitness', 'Shopping', 'Entertainment', 'Education', 'Other Expense'],
  foodCategories: ['Breakfast', 'Lunch', 'Dinner', 'Morning Snack', 'Afternoon Snack', 'Drinks & Smoothies', 'Late Night Snack'],
  exerciseCategories: ['Running', 'Gym & Weights', 'Walking', 'Cycling', 'Swimming', 'HIIT / Cardio', 'Yoga & Stretching', 'Sports'],
};

export const DEFAULT_CONFIG: AppConfig = {
  scriptUrl: '',
  sheetId: '',
  spreadsheetUrl: '',
  clientId: '',
  userName: '',
  userEmail: '',
  maxDailyCalories: 2000,
  demoMode: false,
};

export function loadStoredConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    const maxCal = localStorage.getItem(STORAGE_KEYS.MAX_CALORIES);
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      maxDailyCalories: maxCal ? parseInt(maxCal, 10) || 2000 : parsed.maxDailyCalories || 2000,
    };
  } catch (e) {
    console.error('Error loading config from localStorage', e);
    return DEFAULT_CONFIG;
  }
}

export function saveStoredConfig(config: AppConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
    if (config.maxDailyCalories) {
      localStorage.setItem(STORAGE_KEYS.MAX_CALORIES, String(config.maxDailyCalories));
    }
  } catch (e) {
    console.error('Error saving config to localStorage', e);
  }
}

export function loadStoredSettings(): SheetSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: SheetSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings to localStorage', e);
  }
}

export function loadStoredLogs(): { income: IncomeLog[]; calories: CalorieLog[] } {
  try {
    const incRaw = localStorage.getItem(STORAGE_KEYS.INCOME_LOGS);
    const calRaw = localStorage.getItem(STORAGE_KEYS.CALORIE_LOGS);
    return {
      income: incRaw ? JSON.parse(incRaw) : [],
      calories: calRaw ? JSON.parse(calRaw) : [],
    };
  } catch (e) {
    return { income: [], calories: [] };
  }
}

export function saveStoredLogs(income: IncomeLog[], calories: CalorieLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.INCOME_LOGS, JSON.stringify(income));
    localStorage.setItem(STORAGE_KEYS.CALORIE_LOGS, JSON.stringify(calories));
  } catch (e) {
    console.error('Error saving logs to localStorage', e);
  }
}

/**
 * Calls Apps Script initializeSheet action
 */
export async function apiInitializeSheet(scriptUrl: string, accessToken: string): Promise<{
  sheetId: string;
  spreadsheetUrl: string;
  sheetTitle: string;
  userName?: string;
  userEmail?: string;
}> {
  if (!scriptUrl) {
    throw new Error('Please provide your Google Apps Script Web App URL first.');
  }

  const cleanUrl = scriptUrl.trim();
  const targetUrl = new URL(cleanUrl);
  targetUrl.searchParams.set('action', 'initializeSheet');
  if (accessToken) {
    targetUrl.searchParams.set('accessToken', accessToken);
  }

  const response = await fetch(targetUrl.toString(), {
    method: 'GET',
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`HTTP Error ${response.status}: Failed to communicate with Apps Script`);
  }

  const data = await response.json();
  if (data.status === 'error' || !data.sheetId) {
    throw new Error(data.message || 'Apps Script returned an error during sheet initialization.');
  }

  return {
    sheetId: data.sheetId,
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.sheetId}/edit`,
    sheetTitle: data.sheetTitle || "LifeSync Tracker",
    userName: data.userName,
    userEmail: data.userEmail,
  };
}

/**
 * Calls Apps Script fetchData action
 */
export async function apiFetchData(scriptUrl: string, sheetId: string): Promise<{
  settings: SheetSettings;
  incomeLogs: IncomeLog[];
  calorieLogs: CalorieLog[];
  spreadsheetUrl?: string;
  sheetTitle?: string;
}> {
  if (!scriptUrl || !sheetId) {
    throw new Error('Both Apps Script URL and Spreadsheet ID are required to fetch data.');
  }

  const targetUrl = new URL(scriptUrl.trim());
  targetUrl.searchParams.set('action', 'fetchData');
  targetUrl.searchParams.set('sheetId', sheetId.trim());

  const response = await fetch(targetUrl.toString(), {
    method: 'GET',
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`HTTP Error ${response.status}: Failed to fetch sheet data`);
  }

  const data = await response.json();
  if (data.status === 'error') {
    throw new Error(data.message || 'Failed to fetch data from spreadsheet.');
  }

  return {
    settings: {
      incomeCategories: data.settings?.incomeCategories?.length ? data.settings.incomeCategories : DEFAULT_SETTINGS.incomeCategories,
      expenseCategories: data.settings?.expenseCategories?.length ? data.settings.expenseCategories : DEFAULT_SETTINGS.expenseCategories,
      foodCategories: data.settings?.foodCategories?.length ? data.settings.foodCategories : DEFAULT_SETTINGS.foodCategories,
      exerciseCategories: data.settings?.exerciseCategories?.length ? data.settings.exerciseCategories : DEFAULT_SETTINGS.exerciseCategories,
    },
    incomeLogs: Array.isArray(data.incomeLogs) ? data.incomeLogs : [],
    calorieLogs: Array.isArray(data.calorieLogs) ? data.calorieLogs : [],
    spreadsheetUrl: data.spreadsheetUrl,
    sheetTitle: data.sheetTitle,
  };
}

/**
 * Calls Apps Script doPost to append a row
 */
export async function apiRecordData(
  scriptUrl: string,
  sheetId: string,
  targetTab: 'Income' | 'Calories',
  rowData: (string | number)[]
): Promise<{ status: string; message?: string; timestamp?: string }> {
  if (!scriptUrl || !sheetId) {
    throw new Error('Apps Script URL and Sheet ID must be configured.');
  }

  const payload = {
    sheetId: sheetId.trim(),
    targetTab,
    data: rowData,
  };

  // Google Apps Script handles POST when sent with text/plain without triggering CORS preflight failure
  const response = await fetch(scriptUrl.trim(), {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: Failed to append record to Google Sheet`);
  }

  const resJson = await response.json();
  if (resJson.status === 'error') {
    throw new Error(resJson.message || 'Error occurred while saving to sheet.');
  }

  return resJson;
}
