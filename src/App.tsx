import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { MetricCards } from './components/MetricCards';
import { IncomeForm } from './components/IncomeForm';
import { CaloriesForm } from './components/CaloriesForm';
import { FinancialTable } from './components/FinancialTable';
import { CalorieChart } from './components/CalorieChart';
import { ThresholdCalendar } from './components/ThresholdCalendar';
import { RecentLogs } from './components/RecentLogs';
import { SetupModal } from './components/SetupModal';
import { AppsScriptGuideModal } from './components/AppsScriptGuideModal';
import {
  AppConfig,
  CalorieLog,
  CalorieType,
  IncomeLog,
  IncomeType,
  SheetSettings,
  SyncStatus,
} from './types';
import {
  apiFetchData,
  apiRecordData,
  DEFAULT_CONFIG,
  DEFAULT_SETTINGS,
  loadStoredConfig,
  loadStoredLogs,
  loadStoredSettings,
  saveStoredConfig,
  saveStoredLogs,
  saveStoredSettings,
} from './services/appsScriptService';

export default function App() {
  const [config, setConfig] = useState<AppConfig>(loadStoredConfig);
  const [settings, setSettings] = useState<SheetSettings>(loadStoredSettings);
  const [incomeLogs, setIncomeLogs] = useState<IncomeLog[]>(() => loadStoredLogs().income);
  const [calorieLogs, setCalorieLogs] = useState<CalorieLog[]>(() => loadStoredLogs().calories);
  
  const [isSetupModalOpen, setIsSetupModalOpen] = useState<boolean>(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncedText, setLastSyncedText] = useState<string>('');
  
  const [isSubmittingIncome, setIsSubmittingIncome] = useState<boolean>(false);
  const [isSubmittingCalories, setIsSubmittingCalories] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Show setup modal on initial mount if neither scriptUrl nor sheetId is present
  useEffect(() => {
    if (!config.scriptUrl && !config.sheetId && !config.demoMode) {
      setIsSetupModalOpen(true);
    }
  }, [config.scriptUrl, config.sheetId, config.demoMode]);

  // Sync with Google Sheet
  const handleSyncData = useCallback(async (customConfig?: AppConfig) => {
    const currentCfg = customConfig || config;
    if (!currentCfg.scriptUrl || !currentCfg.sheetId) {
      return;
    }

    try {
      setSyncStatus('syncing');
      const data = await apiFetchData(currentCfg.scriptUrl, currentCfg.sheetId);

      if (data.settings) {
        setSettings(data.settings);
        saveStoredSettings(data.settings);
      }

      if (Array.isArray(data.incomeLogs)) {
        setIncomeLogs(data.incomeLogs);
      }
      if (Array.isArray(data.calorieLogs)) {
        setCalorieLogs(data.calorieLogs);
      }

      saveStoredLogs(data.incomeLogs || [], data.calorieLogs || []);

      if (data.spreadsheetUrl && !currentCfg.spreadsheetUrl) {
        const updated = { ...currentCfg, spreadsheetUrl: data.spreadsheetUrl };
        setConfig(updated);
        saveStoredConfig(updated);
      }

      setSyncStatus('success');
      setLastSyncedText(`Synced at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    } catch (err: any) {
      console.warn('Sync failed:', err);
      setSyncStatus('error');
      setToastMessage({
        type: 'error',
        text: `Sync note: ${err.message || 'Could not fetch from sheet.'}`,
      });
    } finally {
      setTimeout(() => setSyncStatus('idle'), 2500);
    }
  }, [config]);

  // Initial sync when valid configuration exists
  useEffect(() => {
    if (config.scriptUrl && config.sheetId) {
      handleSyncData();
    }
  }, [config.scriptUrl, config.sheetId, handleSyncData]);

  // Toast timer
  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  const handleUpdateConfig = (newVals: Partial<AppConfig>) => {
    const updated = { ...config, ...newVals };
    setConfig(updated);
    saveStoredConfig(updated);
  };

  const handleSaveModalConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
    saveStoredConfig(newConfig);
    handleSyncData(newConfig);
    setToastMessage({
      type: 'success',
      text: 'Configuration saved! Synchronizing tracker with Google Sheet...',
    });
  };

  // Submit Income Entry
  const handleSubmitIncome = async (entry: {
    date: string;
    type: IncomeType;
    category: string;
    amount: number;
    note: string;
  }) => {
    setIsSubmittingIncome(true);

    const newLog: IncomeLog = {
      id: `inc_${Date.now()}`,
      timestamp: new Date().toISOString(),
      date: entry.date,
      type: entry.type,
      category: entry.category,
      amount: entry.amount,
      note: entry.note,
    };

    try {
      // If connected to Apps Script, post to Google Sheet
      if (config.scriptUrl && config.sheetId) {
        await apiRecordData(config.scriptUrl, config.sheetId, 'Income', [
          entry.date,
          entry.type,
          entry.category,
          entry.amount,
          entry.note,
        ]);
      }

      // Optimistically update local state & persistence
      const updatedList = [newLog, ...incomeLogs];
      setIncomeLogs(updatedList);
      saveStoredLogs(updatedList, calorieLogs);

      setToastMessage({
        type: 'success',
        text: `Logged ${entry.type}: $${entry.amount.toFixed(2)} to ${config.sheetId ? 'Google Sheet' : 'Local Storage'}.`,
      });
    } catch (err: any) {
      // If API call failed, still preserve local record with a warning
      const updatedList = [newLog, ...incomeLogs];
      setIncomeLogs(updatedList);
      saveStoredLogs(updatedList, calorieLogs);

      setToastMessage({
        type: 'error',
        text: `Sheet sync error: ${err.message}. Record was saved locally.`,
      });
    } finally {
      setIsSubmittingIncome(false);
    }
  };

  // Submit Calories / Exercise Entry
  const handleSubmitCalories = async (entry: {
    date: string;
    type: CalorieType;
    category: string;
    kcal: number;
    note: string;
  }) => {
    setIsSubmittingCalories(true);

    const newLog: CalorieLog = {
      id: `cal_${Date.now()}`,
      timestamp: new Date().toISOString(),
      date: entry.date,
      type: entry.type,
      category: entry.category,
      kcal: entry.kcal,
      note: entry.note,
    };

    try {
      if (config.scriptUrl && config.sheetId) {
        await apiRecordData(config.scriptUrl, config.sheetId, 'Calories', [
          entry.date,
          entry.type,
          entry.category,
          entry.kcal,
          entry.note,
        ]);
      }

      const updatedList = [newLog, ...calorieLogs];
      setCalorieLogs(updatedList);
      saveStoredLogs(incomeLogs, updatedList);

      setToastMessage({
        type: 'success',
        text: `Logged ${entry.type}: ${entry.kcal} kcal to ${config.sheetId ? 'Google Sheet' : 'Local Storage'}.`,
      });
    } catch (err: any) {
      const updatedList = [newLog, ...calorieLogs];
      setCalorieLogs(updatedList);
      saveStoredLogs(incomeLogs, updatedList);

      setToastMessage({
        type: 'error',
        text: `Sheet sync error: ${err.message}. Record was saved locally.`,
      });
    } finally {
      setIsSubmittingCalories(false);
    }
  };

  // Seed demo data for instant testing
  const handleSeedDemoData = () => {
    const today = new Date();
    const demoIncome: IncomeLog[] = [
      { id: 'inc_1', date: new Date(today.getTime() - 86400000 * 2).toISOString().split('T')[0], type: 'Income', category: 'Salary', amount: 3500, note: 'Bi-weekly paycheck' },
      { id: 'inc_2', date: new Date(today.getTime() - 86400000 * 1).toISOString().split('T')[0], type: 'Expense', category: 'Rent & Housing', amount: 1250, note: 'Monthly apartment rent' },
      { id: 'inc_3', date: today.toISOString().split('T')[0], type: 'Expense', category: 'Groceries', amount: 84.50, note: 'Whole Foods Market' },
      { id: 'inc_4', date: today.toISOString().split('T')[0], type: 'Income', category: 'Freelance', amount: 450, note: 'UI Design consultation' },
    ];

    const demoCalories: CalorieLog[] = [
      // Today logs
      { id: 'cal_1', date: today.toISOString().split('T')[0], type: 'Food consumed', category: 'Breakfast', kcal: 520, note: 'Oatmeal, Greek yogurt & berries' },
      { id: 'cal_2', date: today.toISOString().split('T')[0], type: 'Food consumed', category: 'Lunch', kcal: 780, note: 'Grilled chicken salad bowl' },
      { id: 'cal_3', date: today.toISOString().split('T')[0], type: 'Exercise', category: 'Gym & Weights', kcal: 380, note: 'Upper body push workout' },
      
      // Yesterday logs (exceeding cap demo)
      { id: 'cal_4', date: new Date(today.getTime() - 86400000).toISOString().split('T')[0], type: 'Food consumed', category: 'Dinner', kcal: 1850, note: 'Pizza cheat meal with friends' },
      { id: 'cal_5', date: new Date(today.getTime() - 86400000).toISOString().split('T')[0], type: 'Food consumed', category: 'Breakfast', kcal: 600, note: 'Pancakes and syrup' },
      { id: 'cal_6', date: new Date(today.getTime() - 86400000).toISOString().split('T')[0], type: 'Exercise', category: 'Walking', kcal: 150, note: 'Evening stroll' },

      // 3 days ago
      { id: 'cal_7', date: new Date(today.getTime() - 86400000 * 3).toISOString().split('T')[0], type: 'Food consumed', category: 'Lunch', kcal: 650, note: 'Turkey wrap' },
      { id: 'cal_8', date: new Date(today.getTime() - 86400000 * 3).toISOString().split('T')[0], type: 'Exercise', category: 'Running', kcal: 450, note: '5k trail run' },
    ];

    setIncomeLogs(demoIncome);
    setCalorieLogs(demoCalories);
    saveStoredLogs(demoIncome, demoCalories);

    const updatedConfig: AppConfig = {
      ...config,
      demoMode: true,
      userName: 'Demo User',
    };
    setConfig(updatedConfig);
    saveStoredConfig(updatedConfig);

    setToastMessage({
      type: 'info',
      text: 'Loaded realistic demo records for Calories, Exercise, and Income/Expenses!',
    });
  };

  // Standalone HTML download helper
  const handleDownloadStandalone = () => {
    const link = document.createElement('a');
    link.href = '/standalone.html';
    link.download = 'LifeSync-Tracker.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToastMessage({
      type: 'success',
      text: 'Downloading standalone self-contained LifeSync-Tracker.html!',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-900 flex flex-col selection:bg-emerald-100 selection:text-emerald-900 font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md animate-in slide-in-from-bottom-3 duration-300">
          <div
            className={`p-3.5 rounded-2xl shadow-xl border text-xs font-semibold flex items-center justify-between gap-3 ${
              toastMessage.type === 'error'
                ? 'bg-rose-900 text-white border-rose-800'
                : toastMessage.type === 'success'
                ? 'bg-slate-900 text-white border-slate-800'
                : 'bg-indigo-900 text-white border-indigo-800'
            }`}
          >
            <span>{toastMessage.text}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white p-0.5"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Top Header */}
      <Header
        config={config}
        onUpdateConfig={handleUpdateConfig}
        onOpenSettings={() => setIsSetupModalOpen(true)}
        onOpenGuide={() => setIsGuideModalOpen(true)}
        onSync={() => handleSyncData()}
        syncStatus={syncStatus}
        lastSyncedText={lastSyncedText}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        
        {/* KPI Summary Cards */}
        <MetricCards
          incomeLogs={incomeLogs}
          calorieLogs={calorieLogs}
          maxDailyCalories={config.maxDailyCalories}
          onUpdateTargetCalories={(newTarget) => handleUpdateConfig({ maxDailyCalories: newTarget })}
        />

        {/* Tracking Input Forms (Income & Calories) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <IncomeForm
            settings={settings}
            onSubmit={handleSubmitIncome}
            isSubmitting={isSubmittingIncome}
          />
          <CaloriesForm
            settings={settings}
            onSubmit={handleSubmitCalories}
            isSubmitting={isSubmittingCalories}
          />
        </div>

        {/* Financial Overview Table (4 Rows: Month, Monthly Income, Monthly Expense, Net Cash) & Calorie Continuous Line Graph */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FinancialTable incomeLogs={incomeLogs} />
          <CalorieChart
            calorieLogs={calorieLogs}
            maxDailyCalories={config.maxDailyCalories}
          />
        </div>

        {/* Threshold Alert Calendar (Soft red hue bg-red-100 & ⚠️ warning symbol on over-cap days) */}
        <ThresholdCalendar
          calorieLogs={calorieLogs}
          maxDailyCalories={config.maxDailyCalories}
        />

        {/* Filterable & Searchable Recent Historical Activity Logs */}
        <RecentLogs
          incomeLogs={incomeLogs}
          calorieLogs={calorieLogs}
        />

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-4 mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">LifeSync Dashboard</span>
            <span>&bull;</span>
            <span>Google Sheets Bi-directional Sync</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsGuideModalOpen(true)}
              className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
            >
              Apps Script Code & Deploy Guide
            </button>
            <span>&bull;</span>
            <button
              type="button"
              onClick={handleDownloadStandalone}
              className="text-emerald-600 hover:text-emerald-800 font-medium hover:underline"
            >
              Download Standalone index.html
            </button>
          </div>
        </div>
      </footer>

      {/* Setup & Connection Modal */}
      <SetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        config={config}
        onSaveConfig={handleSaveModalConfig}
        onOpenGuide={() => {
          setIsSetupModalOpen(false);
          setIsGuideModalOpen(true);
        }}
        onSeedDemoData={handleSeedDemoData}
      />

      {/* Apps Script Guide & Code Modal */}
      <AppsScriptGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        onDownloadStandalone={handleDownloadStandalone}
      />

    </div>
  );
}
