import React, { useState, useMemo } from 'react';
import { Table, ArrowUpRight, ArrowDownRight, Wallet, Calendar, ArrowLeftRight, Columns } from 'lucide-react';
import { IncomeLog } from '../types';

interface FinancialTableProps {
  incomeLogs: IncomeLog[];
}

interface MonthlySummary {
  key: string;          // e.g. "2026-09"
  formattedMonth: string; // e.g. "26 Sept"
  income: number;
  expense: number;
  netCash: number;
  isCurrent: boolean;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec',
];

export const formatToMonthFormat = (year: number, monthZeroIdx: number): string => {
  const yr2 = String(year).slice(-2);
  const mName = MONTH_NAMES[monthZeroIdx] || 'Jan';
  return `${yr2} ${mName}`;
};

export const FinancialTable: React.FC<FinancialTableProps> = ({ incomeLogs }) => {
  const [viewMode, setViewMode] = useState<'matrix' | 'vertical'>('matrix');

  // Compute monthly data aggregated from incomeLogs
  const monthlySummaries: MonthlySummary[] = useMemo(() => {
    const map: { [monthKey: string]: { income: number; expense: number } } = {};

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIdx = now.getMonth();
    const currentKey = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}`;

    // Guarantee at least the last 4 consecutive months exist
    for (let i = 3; i >= 0; i--) {
      const d = new Date(currentYear, currentMonthIdx - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map[k] = { income: 0, expense: 0 };
    }

    // Aggregate real logs
    incomeLogs.forEach((log) => {
      if (!log.date) return;
      const monthKey = log.date.substring(0, 7);
      if (!map[monthKey]) {
        map[monthKey] = { income: 0, expense: 0 };
      }
      const amount = Number(log.amount) || 0;
      if (log.type === 'Income') {
        map[monthKey].income += amount;
      } else {
        map[monthKey].expense += amount;
      }
    });

    const sortedKeys = Object.keys(map).sort();
    // Take the most recent 4 to 6 months
    const displayedKeys = sortedKeys.slice(-4);

    return displayedKeys.map((key) => {
      const [yStr, mStr] = key.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10) - 1;
      const inc = map[key].income;
      const exp = map[key].expense;
      return {
        key,
        formattedMonth: formatToMonthFormat(y, m),
        income: inc,
        expense: exp,
        netCash: inc - exp,
        isCurrent: key === currentKey,
      };
    });
  }, [incomeLogs]);

  const formatCurrency = (amount: number, prefix: string = '') => {
    return `${prefix}$${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between h-[380px]">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-2xs">
            <Table className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Financial Overview</h3>
            <p className="text-[11px] text-slate-400">Monthly Cash Flow Table</p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="inline-flex p-0.5 rounded-xl bg-slate-100 border border-slate-200/70 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('matrix')}
            title="4 Metric Rows: Month, Monthly Income, Monthly Expense, Net Cash"
            className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
              viewMode === 'matrix'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowLeftRight className="w-3 h-3" />
            <span>4 Rows</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('vertical')}
            title="Columns: Month, Monthly Income, Monthly Expense, Net Cash"
            className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
              viewMode === 'vertical'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Columns className="w-3 h-3" />
            <span>List View</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 w-full min-h-0 overflow-auto rounded-xl border border-slate-100 bg-slate-50/40 p-1">
        {viewMode === 'matrix' ? (
          /* 4 METRIC ROWS TABLE */
          <table className="w-full text-left border-collapse text-xs h-full">
            <tbody>
              {/* Row 1: Month (e.g. 26 Sept) */}
              <tr className="border-b border-slate-200/80 bg-white/80">
                <td className="py-3 px-3.5 font-bold text-slate-700 whitespace-nowrap bg-slate-100/60 w-36 sm:w-44 border-r border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-slate-200/80 text-slate-700 flex items-center justify-center text-[10px]">
                      <Calendar className="w-3 h-3" />
                    </div>
                    <span className="uppercase text-[11px] tracking-wider text-slate-600 font-extrabold">Month</span>
                  </div>
                </td>
                {monthlySummaries.map((m) => (
                  <td key={`header_${m.key}`} className="py-3 px-3 text-center whitespace-nowrap border-r border-slate-100 last:border-r-0">
                    <div className="inline-flex flex-col items-center">
                      <span className="font-extrabold font-mono text-xs text-slate-900">
                        {m.formattedMonth}
                      </span>
                      {m.isCurrent && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 text-emerald-700 bg-emerald-50 rounded-full border border-emerald-200 mt-0.5">
                          Current
                        </span>
                      )}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Row 2: Monthly Income */}
              <tr className="border-b border-slate-200/60 bg-white">
                <td className="py-3 px-3.5 font-semibold text-slate-700 whitespace-nowrap bg-slate-50/60 border-r border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-slate-800 font-bold">Monthly Income</span>
                  </div>
                </td>
                {monthlySummaries.map((m) => (
                  <td key={`inc_${m.key}`} className="py-3 px-3 text-center whitespace-nowrap border-r border-slate-100 last:border-r-0">
                    <span className="font-extrabold font-mono text-emerald-600 text-xs sm:text-sm">
                      {formatCurrency(m.income, '+')}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Row 3: Monthly Expense */}
              <tr className="border-b border-slate-200/60 bg-white">
                <td className="py-3 px-3.5 font-semibold text-slate-700 whitespace-nowrap bg-slate-50/60 border-r border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center">
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-slate-800 font-bold">Monthly Expense</span>
                  </div>
                </td>
                {monthlySummaries.map((m) => (
                  <td key={`exp_${m.key}`} className="py-3 px-3 text-center whitespace-nowrap border-r border-slate-100 last:border-r-0">
                    <span className="font-extrabold font-mono text-rose-600 text-xs sm:text-sm">
                      {formatCurrency(m.expense, '-')}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Row 4: Net Cash */}
              <tr className="bg-slate-50/70">
                <td className="py-3 px-3.5 font-bold text-slate-800 whitespace-nowrap bg-slate-100/70 border-r border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center">
                      <Wallet className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-slate-900 font-extrabold">Net Cash</span>
                  </div>
                </td>
                {monthlySummaries.map((m) => {
                  const isPositive = m.netCash >= 0;
                  return (
                    <td key={`net_${m.key}`} className="py-3 px-3 text-center whitespace-nowrap border-r border-slate-100 last:border-r-0">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg font-mono font-black text-xs sm:text-sm shadow-2xs ${
                          isPositive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                            : 'bg-rose-50 text-rose-700 border border-rose-200/80'
                        }`}
                      >
                        {formatCurrency(Math.abs(m.netCash), isPositive ? '+' : '-')}
                      </span>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        ) : (
          /* VERTICAL LIST VIEW: 4 COLUMNS, MONTH ROWS */
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-100/70 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                <th className="py-2.5 px-3">Month</th>
                <th className="py-2.5 px-3 text-right">Monthly Income</th>
                <th className="py-2.5 px-3 text-right">Monthly Expense</th>
                <th className="py-2.5 px-3 text-right">Net Cash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {[...monthlySummaries].reverse().map((m) => {
                const isPositive = m.netCash >= 0;
                return (
                  <tr key={`v_${m.key}`} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 whitespace-nowrap font-mono font-bold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span>{m.formattedMonth}</span>
                        {m.isCurrent && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.2 text-emerald-700 bg-emerald-50 rounded-full border border-emerald-200">
                            Current
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap font-mono font-bold text-emerald-600">
                      {formatCurrency(m.income, '+')}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap font-mono font-bold text-rose-600">
                      {formatCurrency(m.expense, '-')}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap font-mono font-extrabold">
                      <span className={isPositive ? 'text-emerald-700' : 'text-rose-700'}>
                        {formatCurrency(Math.abs(m.netCash), isPositive ? '+' : '-')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer hint */}
      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>Format: <strong>26 Sept</strong> (YY Month)</span>
        <span>Includes last 4 months</span>
      </div>
    </div>
  );
};
