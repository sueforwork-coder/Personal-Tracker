import React from 'react';
import { ExternalLink, RefreshCw, Settings, Code, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { AppConfig, SyncStatus } from '../types';

interface HeaderProps {
  config: AppConfig;
  onUpdateConfig: (newConfig: Partial<AppConfig>) => void;
  onOpenSettings: () => void;
  onOpenGuide: () => void;
  onSync: () => void;
  syncStatus: SyncStatus;
  lastSyncedText: string;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  onUpdateConfig,
  onOpenSettings,
  onOpenGuide,
  onSync,
  syncStatus,
  lastSyncedText,
}) => {
  const sheetUrl = config.spreadsheetUrl || (config.sheetId ? `https://docs.google.com/spreadsheets/d/${config.sheetId}/edit` : null);

  const handleMaxCaloriesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    const valid = isNaN(val) || val < 100 ? 2000 : val;
    onUpdateConfig({ maxDailyCalories: valid });
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between py-3 gap-3">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">LifeSync</h1>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    Live Tracker
                  </span>
                </div>
                <p className="text-xs text-slate-500 hidden sm:block">
                  Personal Dashboard &bull; Nutrition &bull; Fitness &bull; Cash Flow
                </p>
              </div>
            </div>

            {/* Mobile quick actions */}
            <div className="flex md:hidden items-center gap-1.5">
              <button
                type="button"
                id="btn-mobile-sync"
                onClick={onSync}
                disabled={syncStatus === 'syncing'}
                className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                title="Sync with Google Sheet"
              >
                <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin text-emerald-600' : ''}`} />
              </button>
              <button
                type="button"
                id="btn-mobile-settings"
                onClick={onOpenSettings}
                className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                title="Connection Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center / Right controls */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 w-full md:w-auto">
            
            {/* Dynamic Target Management: Maximum Daily Calories */}
            <div className="flex items-center bg-slate-100/90 rounded-xl px-3 py-1.5 border border-slate-200/80 shadow-2xs text-xs">
              <span className="text-slate-600 font-medium whitespace-nowrap mr-2">
                Daily Calorie Cap:
              </span>
              <div className="flex items-center">
                <input
                  type="number"
                  id="input-daily-calories-cap"
                  value={config.maxDailyCalories || 2000}
                  onChange={handleMaxCaloriesChange}
                  min={500}
                  max={10000}
                  step={50}
                  className="w-18 px-1.5 py-0.5 text-center font-bold text-slate-800 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="ml-1 text-slate-500 font-semibold">kcal</span>
              </div>
            </div>

            {/* Direct Google Sheet Link */}
            {sheetUrl ? (
              <a
                href={sheetUrl}
                target="_blank"
                rel="noreferrer"
                id="link-google-sheet"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                title="Open connected Google Sheet"
              >
                <span>Google Sheet</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <button
                type="button"
                id="btn-connect-sheet-hint"
                onClick={onOpenSettings}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>No Sheet Linked</span>
              </button>
            )}

            {/* Manual Sync Button */}
            <button
              type="button"
              id="btn-header-sync"
              onClick={onSync}
              disabled={syncStatus === 'syncing'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 active:scale-98 transition disabled:opacity-60 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Sheet'}
              </span>
            </button>

            {/* Apps Script Guide & Code */}
            <button
              type="button"
              id="btn-header-guide"
              onClick={onOpenGuide}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 transition"
              title="View Google Apps Script Code & Deployment Guide"
            >
              <Code className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Apps Script</span>
            </button>

            {/* Connection Settings */}
            <button
              type="button"
              id="btn-header-settings"
              onClick={onOpenSettings}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-transparent hover:border-slate-200 transition"
              title="Configure API Connection"
            >
              <Settings className="w-4 h-4" />
            </button>

          </div>
        </div>

        {/* Sync status indicator bar */}
        {lastSyncedText && (
          <div className="pb-1.5 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              {lastSyncedText}
            </span>
            {config.userName && (
              <span className="text-slate-500 font-medium">
                Connected as: <span className="text-slate-700">{config.userName}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
