import React, { useState, useEffect } from 'react';
import { Sparkles, Key, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, ArrowRight, ExternalLink, HelpCircle, ShieldCheck } from 'lucide-react';
import { AppConfig } from '../types';
import { apiInitializeSheet } from '../services/appsScriptService';

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
  }
}

interface SetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onSaveConfig: (config: AppConfig) => void;
  onOpenGuide: () => void;
  onSeedDemoData: () => void;
}

export const SetupModal: React.FC<SetupModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onOpenGuide,
  onSeedDemoData,
}) => {
  const [scriptUrl, setScriptUrl] = useState(config.scriptUrl || '');
  const [clientId, setClientId] = useState(config.clientId || '');
  const [sheetId, setSheetId] = useState(config.sheetId || '');
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [showManualSection, setShowManualSection] = useState(Boolean(config.sheetId && !config.scriptUrl));

  useEffect(() => {
    setScriptUrl(config.scriptUrl || '');
    setClientId(config.clientId || '');
    setSheetId(config.sheetId || '');
  }, [config]);

  if (!isOpen) return null;

  // Handle GIS (Google Identity Services) OAuth2 flow
  const handleConnectGoogle = () => {
    setStatusMessage(null);

    if (!scriptUrl || !scriptUrl.trim().startsWith('http')) {
      setStatusMessage({
        type: 'error',
        text: 'Please paste your valid Google Apps Script Web App URL first (e.g., https://script.google.com/macros/s/.../exec)',
      });
      return;
    }

    if (!clientId.trim()) {
      setStatusMessage({
        type: 'info',
        text: 'A Google Cloud OAuth Client ID is required for Google Identity Services. Enter one below or expand Manual Setup to link an existing Sheet ID directly.',
      });
      setShowManualSection(true);
      return;
    }

    if (!window.google?.accounts?.oauth2) {
      setStatusMessage({
        type: 'error',
        text: 'Google Identity Services library is still loading or was blocked by browser shields. Please check network/ad blockers and try again.',
      });
      return;
    }

    try {
      setIsAuthorizing(true);
      setStatusMessage({
        type: 'info',
        text: 'Opening Google Account authorization popup...',
      });

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId.trim(),
        scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            setIsAuthorizing(false);
            setStatusMessage({
              type: 'error',
              text: `Google Auth Error: ${tokenResponse.error}`,
            });
            return;
          }

          if (tokenResponse.access_token) {
            try {
              setStatusMessage({
                type: 'info',
                text: 'Token acquired! Provisioning "[User Name]\'s LifeSync Tracker" via Apps Script...',
              });

              const result = await apiInitializeSheet(scriptUrl.trim(), tokenResponse.access_token);

              const updatedConfig: AppConfig = {
                ...config,
                scriptUrl: scriptUrl.trim(),
                clientId: clientId.trim(),
                sheetId: result.sheetId,
                spreadsheetUrl: result.spreadsheetUrl,
                userName: result.userName || 'User',
                userEmail: result.userEmail || '',
                demoMode: false,
              };

              onSaveConfig(updatedConfig);
              setIsAuthorizing(false);
              setStatusMessage({
                type: 'success',
                text: `Successfully provisioned "${result.sheetTitle}"! Redirecting...`,
              });

              setTimeout(() => {
                onClose();
              }, 1200);
            } catch (apiErr: any) {
              setIsAuthorizing(false);
              setStatusMessage({
                type: 'error',
                text: `Apps Script Provisioning Error: ${apiErr.message}`,
              });
            }
          }
        },
      });

      tokenClient.requestAccessToken();
    } catch (err: any) {
      setIsAuthorizing(false);
      setStatusMessage({
        type: 'error',
        text: `GIS Initialization Error: ${err.message}`,
      });
    }
  };

  // Manual save for users who enter Apps Script URL and Sheet ID directly
  const handleManualSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetId.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter a valid Google Spreadsheet ID.',
      });
      return;
    }

    // Extract sheet ID if full URL pasted
    let cleanSheetId = sheetId.trim();
    if (cleanSheetId.includes('/d/')) {
      const match = cleanSheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        cleanSheetId = match[1];
      }
    }

    const updatedConfig: AppConfig = {
      ...config,
      scriptUrl: scriptUrl.trim(),
      sheetId: cleanSheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanSheetId}/edit`,
      clientId: clientId.trim(),
      demoMode: false,
    };

    onSaveConfig(updatedConfig);
    setStatusMessage({
      type: 'success',
      text: 'Configuration saved successfully!',
    });
    setTimeout(() => {
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Connect LifeSync Dashboard</h2>
                <p className="text-xs text-slate-300">
                  Link your Google Apps Script API and Google Sheet
                </p>
              </div>
            </div>

            {config.sheetId && (
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition"
              >
                Close
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 border ${
                statusMessage.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-indigo-50 text-indigo-800 border-indigo-200'
              }`}
            >
              {statusMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              ) : statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <HelpCircle className="w-4 h-4 shrink-0 text-indigo-600 mt-0.5" />
              )}
              <div className="flex-1">{statusMessage.text}</div>
            </div>
          )}

          {/* Primary Input 1: Apps Script URL */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="input-script-url" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>Google Apps Script Web App URL</span>
                <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={onOpenGuide}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
              >
                <span>How to get this?</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <input
              type="url"
              id="input-script-url"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={scriptUrl}
              onChange={(e) => setScriptUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-mono"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Deployed as Web App: "Execute as: Me", "Who has access: Anyone".
            </p>
          </div>

          {/* Primary Input 2: Google Client ID for GIS */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="input-client-id" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-slate-500" />
                <span>Google OAuth 2.0 Client ID (Web Application)</span>
              </label>
            </div>
            <input
              type="text"
              id="input-client-id"
              placeholder="e.g., 123456789-abcdef.apps.googleusercontent.com"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-mono"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Create in Google Cloud Console &gt; Credentials &gt; OAuth Client ID. Authorized JS Origin: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">{window.location.origin}</code>
            </p>
          </div>

          {/* Prominent Button: Connect Google Account */}
          <button
            type="button"
            id="btn-connect-google"
            onClick={handleConnectGoogle}
            disabled={isAuthorizing}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 active:scale-99 transition shadow-md shadow-indigo-600/20 disabled:opacity-60 cursor-pointer"
          >
            {isAuthorizing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating with Google & Provisioning Sheet...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4.5 h-4.5 text-indigo-200" />
                <span>Connect Google Account & Create Sheet</span>
                <ArrowRight className="w-4 h-4 text-indigo-300" />
              </>
            )}
          </button>

          {/* Collapsible Manual Setup / Direct Spreadsheet ID */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowManualSection(!showManualSection)}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center justify-between w-full py-1.5"
            >
              <span className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                <span>Already have a Spreadsheet ID? (Manual Connection)</span>
              </span>
              <span className="text-[11px] text-indigo-600 font-medium">
                {showManualSection ? 'Hide' : 'Show'}
              </span>
            </button>

            {showManualSection && (
              <form onSubmit={handleManualSave} className="mt-3 space-y-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 animate-in fade-in">
                <div>
                  <label htmlFor="input-manual-sheet-id" className="block text-xs font-semibold text-slate-700 mb-1">
                    Google Spreadsheet ID or URL
                  </label>
                  <input
                    type="text"
                    id="input-manual-sheet-id"
                    placeholder="e.g., 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    value={sheetId}
                    onChange={(e) => setSheetId(e.target.value)}
                    className="w-full px-3 py-2 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Paste the alphanumeric ID from your Google Sheet URL (docs.google.com/spreadsheets/d/<b>ID</b>/edit).
                  </p>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    type="submit"
                    id="btn-save-manual"
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition"
                  >
                    Save & Connect Sheet
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Demo Preview Option */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Want to test the dashboard immediately?
            </span>
            <button
              type="button"
              id="btn-seed-demo"
              onClick={() => {
                onSeedDemoData();
                onClose();
              }}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline px-2 py-1 rounded-lg hover:bg-emerald-50 transition"
            >
              Explore with Demo Data &rarr;
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
