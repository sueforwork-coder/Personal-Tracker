import * as XLSX from 'xlsx';
import { CalorieLog, IncomeLog } from '../types';

export interface ExcelExportOptions {
  incomeLogs: IncomeLog[];
  calorieLogs: CalorieLog[];
  maxDailyCalories?: number;
}

/**
 * Generates and triggers download of an Excel (.xlsx) file containing
 * Income/Expenses, Calories/Fitness, and Daily Summary worksheets.
 */
export function exportTrackerDataToExcel({
  incomeLogs,
  calorieLogs,
  maxDailyCalories = 2000,
}: ExcelExportOptions): { success: boolean; rowCount: number; fileName: string } {
  // 1. Prepare Income & Expenses Sheet Data
  const incomeRows = incomeLogs.map((log) => ({
    Date: log.date || '',
    Type: log.type || 'Expense',
    Category: log.category || '',
    'Amount ($)': Number(log.amount) || 0,
    Notes: log.note || '',
    'Record Timestamp': log.timestamp || '',
  }));

  // 2. Prepare Calories & Fitness Sheet Data
  const calorieRows = calorieLogs.map((log) => ({
    Date: log.date || '',
    Type: log.type || 'Food consumed',
    Category: log.category || '',
    'Calories (kcal)': Number(log.kcal) || 0,
    Notes: log.note || '',
    'Record Timestamp': log.timestamp || '',
  }));

  // 3. Prepare Daily Summary aggregation
  const datesSet = new Set<string>();
  incomeLogs.forEach((l) => l.date && datesSet.add(l.date));
  calorieLogs.forEach((l) => l.date && datesSet.add(l.date));

  const sortedDates = Array.from(datesSet).sort((a, b) => b.localeCompare(a));

  const summaryRows = sortedDates.map((date) => {
    let dayIncome = 0;
    let dayExpense = 0;
    let dayFood = 0;
    let dayExercise = 0;

    incomeLogs
      .filter((l) => l.date === date)
      .forEach((l) => {
        const amt = Number(l.amount) || 0;
        if (l.type === 'Income') {
          dayIncome += amt;
        } else {
          dayExpense += amt;
        }
      });

    calorieLogs
      .filter((l) => l.date === date)
      .forEach((l) => {
        const kcal = Number(l.kcal) || 0;
        if (l.type === 'Food consumed') {
          dayFood += kcal;
        } else {
          dayExercise += kcal;
        }
      });

    const netCashflow = dayIncome - dayExpense;
    const netCalories = dayFood - dayExercise;
    const status = dayFood <= maxDailyCalories ? 'Under Cap (Target Met)' : 'Over Cap';

    return {
      Date: date,
      'Total Income ($)': Math.round(dayIncome * 100) / 100,
      'Total Expense ($)': Math.round(dayExpense * 100) / 100,
      'Net Cash Flow ($)': Math.round(netCashflow * 100) / 100,
      'Calories Consumed (kcal)': Math.round(dayFood),
      'Calories Burned (kcal)': Math.round(dayExercise),
      'Net Calories (kcal)': Math.round(netCalories),
      'Daily Calorie Cap (kcal)': maxDailyCalories,
      'Calorie Goal Status': status,
    };
  });

  // Create new Excel Workbook
  const workbook = XLSX.utils.book_new();

  // Helper to calculate column widths
  const calcColWidths = (rows: Record<string, any>[]) => {
    if (!rows.length) return [];
    const keys = Object.keys(rows[0]);
    return keys.map((key) => {
      let maxLen = key.length;
      for (const row of rows) {
        const val = row[key];
        const len = val !== null && val !== undefined ? String(val).length : 0;
        if (len > maxLen) maxLen = len;
      }
      return { wch: Math.min(Math.max(maxLen + 3, 12), 40) };
    });
  };

  // Worksheet 1: Income & Expenses
  const wsIncome = XLSX.utils.json_to_sheet(
    incomeRows.length ? incomeRows : [{ Date: '', Type: '', Category: '', 'Amount ($)': 0, Notes: '' }]
  );
  if (incomeRows.length) {
    wsIncome['!cols'] = calcColWidths(incomeRows);
  }
  XLSX.utils.book_append_sheet(workbook, wsIncome, 'Income & Expenses');

  // Worksheet 2: Calories & Fitness
  const wsCalories = XLSX.utils.json_to_sheet(
    calorieRows.length ? calorieRows : [{ Date: '', Type: '', Category: '', 'Calories (kcal)': 0, Notes: '' }]
  );
  if (calorieRows.length) {
    wsCalories['!cols'] = calcColWidths(calorieRows);
  }
  XLSX.utils.book_append_sheet(workbook, wsCalories, 'Calories & Fitness');

  // Worksheet 3: Daily Summary
  const wsSummary = XLSX.utils.json_to_sheet(
    summaryRows.length ? summaryRows : [{ Date: '', 'Total Income ($)': 0, 'Total Expense ($)': 0, 'Net Cash Flow ($)': 0 }]
  );
  if (summaryRows.length) {
    wsSummary['!cols'] = calcColWidths(summaryRows);
  }
  XLSX.utils.book_append_sheet(workbook, wsSummary, 'Daily Summary');

  // Timestamp filename
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const fileName = `LifeSync_Data_${dateStr}.xlsx`;

  // Write and trigger download
  XLSX.writeFile(workbook, fileName);

  return {
    success: true,
    rowCount: incomeRows.length + calorieRows.length,
    fileName,
  };
}
