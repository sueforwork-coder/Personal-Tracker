export type IncomeType = 'Income' | 'Expense';
export type CalorieType = 'Food consumed' | 'Exercise';

export interface IncomeLog {
  id: string;
  timestamp?: string;
  date: string;
  type: IncomeType;
  category: string;
  amount: number;
  note: string;
}

export interface CalorieLog {
  id: string;
  timestamp?: string;
  date: string;
  type: CalorieType;
  category: string;
  kcal: number;
  note: string;
}

export interface SheetSettings {
  incomeCategories: string[];
  expenseCategories: string[];
  foodCategories: string[];
  exerciseCategories: string[];
}

export interface AppConfig {
  scriptUrl: string;
  sheetId: string;
  spreadsheetUrl?: string;
  clientId?: string;
  userName?: string;
  userEmail?: string;
  maxDailyCalories: number;
  demoMode?: boolean;
}

export interface SyncPayload {
  sheetId: string;
  targetTab: 'Income' | 'Calories';
  data: (string | number)[];
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';
