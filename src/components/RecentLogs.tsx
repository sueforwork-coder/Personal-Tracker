import React, { useState } from 'react';
import { ListFilter, Search, ArrowUpRight, ArrowDownRight, Utensils, Activity } from 'lucide-react';
import { CalorieLog, IncomeLog } from '../types';

interface RecentLogsProps {
  incomeLogs: IncomeLog[];
  calorieLogs: CalorieLog[];
}

export const RecentLogs: React.FC<RecentLogsProps> = ({ incomeLogs, calorieLogs }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'finance' | 'calories'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Combine and sort logs by date / timestamp descending
  interface UnifiedLog {
    id: string;
    timestamp: string;
    date: string;
    kind: 'finance' | 'calorie';
    type: string;
    category: string;
    amountOrKcal: string;
    isPositive: boolean;
    note: string;
  }

  const unifiedList: UnifiedLog[] = [];

  incomeLogs.forEach((log) => {
    const isInc = log.type === 'Income';
    unifiedList.push({
      id: log.id || `inc_${log.date}_${log.amount}`,
      timestamp: log.timestamp || log.date,
      date: log.date,
      kind: 'finance',
      type: log.type,
      category: log.category,
      amountOrKcal: `${isInc ? '+' : '-'}$${Number(log.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      isPositive: isInc,
      note: log.note,
    });
  });

  calorieLogs.forEach((log) => {
    const isFood = log.type === 'Food consumed';
    unifiedList.push({
      id: log.id || `cal_${log.date}_${log.kcal}`,
      timestamp: log.timestamp || log.date,
      date: log.date,
      kind: 'calorie',
      type: log.type,
      category: log.category,
      amountOrKcal: `${isFood ? '+' : '-'}${Number(log.kcal).toLocaleString()} kcal`,
      isPositive: !isFood, // Exercise burns calories (healthy/blue)
      note: log.note,
    });
  });

  // Sort descending by date then timestamp
  unifiedList.sort((a, b) => {
    const timeA = new Date(a.date || a.timestamp).getTime() || 0;
    const timeB = new Date(b.date || b.timestamp).getTime() || 0;
    return timeB - timeA;
  });

  const filteredLogs = unifiedList.filter((log) => {
    if (activeTab === 'finance' && log.kind !== 'finance') return false;
    if (activeTab === 'calories' && log.kind !== 'calorie') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.category.toLowerCase().includes(q) ||
        log.type.toLowerCase().includes(q) ||
        log.date.includes(q) ||
        log.note.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
            <ListFilter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Historical Records & Activity</h3>
            <p className="text-[11px] text-slate-400">Synchronized bi-directionally with Google Sheets</p>
          </div>
        </div>

        {/* Filter Tabs & Search */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-400 w-36 sm:w-48"
            />
          </div>

          <div className="inline-flex p-0.5 rounded-xl bg-slate-100 border border-slate-200/80 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                activeTab === 'all' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
              }`}
            >
              All ({unifiedList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('finance')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                activeTab === 'finance' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
              }`}
            >
              Finance
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('calories')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                activeTab === 'calories' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
              }`}
            >
              Calories
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table / List */}
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            No records found. Submit your first income, expense, or calorie entry above!
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                <th className="pb-2 pl-2">Date</th>
                <th className="pb-2">Type</th>
                <th className="pb-2">Category</th>
                <th className="pb-2">Note</th>
                <th className="pb-2 pr-2 text-right">Amount / Kcal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLogs.map((log) => {
                const isFinance = log.kind === 'finance';
                const isFood = log.type === 'Food consumed';
                const isExpense = log.type === 'Expense';

                return (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 pl-2 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {log.date}
                    </td>

                    <td className="py-2.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                          isFinance
                            ? isExpense
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-emerald-50 text-emerald-700'
                            : isFood
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {isFinance ? (
                          isExpense ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />
                        ) : isFood ? (
                          <Utensils className="w-3 h-3" />
                        ) : (
                          <Activity className="w-3 h-3" />
                        )}
                        <span>{log.type}</span>
                      </span>
                    </td>

                    <td className="py-2.5 font-medium text-slate-800 whitespace-nowrap">
                      {log.category}
                    </td>

                    <td className="py-2.5 text-slate-400 max-w-[200px] truncate" title={log.note}>
                      {log.note || <span className="italic text-slate-300">No notes</span>}
                    </td>

                    <td
                      className={`py-2.5 pr-2 text-right font-extrabold font-['JetBrains_Mono',monospace] whitespace-nowrap ${
                        isFinance
                          ? isExpense
                            ? 'text-rose-600'
                            : 'text-emerald-600'
                          : isFood
                          ? 'text-amber-600'
                          : 'text-blue-600'
                      }`}
                    >
                      {log.amountOrKcal}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
