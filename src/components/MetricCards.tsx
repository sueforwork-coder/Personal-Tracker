import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Flame,
  TrendingUp,
  TrendingDown,
  Activity,
  UtensilsCrossed,
  Calendar,
  Target,
  Plus,
  Minus,
} from 'lucide-react';
import { CalorieLog, IncomeLog } from '../types';

export type CashFlowPeriod = 'all' | 'monthly' | 'daily';

interface MetricCardsProps {
  incomeLogs: IncomeLog[];
  calorieLogs: CalorieLog[];
  maxDailyCalories: number;
  onUpdateTargetCalories?: (newTarget: number) => void;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  incomeLogs,
  calorieLogs,
  maxDailyCalories,
  onUpdateTargetCalories,
}) => {
  const [cashFlowPeriod, setCashFlowPeriod] = useState<CashFlowPeriod>('all');
  const [isEditingTarget, setIsEditingTarget] = useState<boolean>(false);
  const [targetInputValue, setTargetInputValue] = useState<string>(String(maxDailyCalories || 2000));

  // Sync internal input state when prop changes externally (e.g., from header)
  React.useEffect(() => {
    setTargetInputValue(String(maxDailyCalories || 2000));
  }, [maxDailyCalories]);

  // Current local dates
  const { todayStr, monthStr } = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return {
      todayStr: `${year}-${month}-${day}`,
      monthStr: `${year}-${month}`,
    };
  }, []);

  // 1. Calculate Net Cash Flow based on selected period: 'all' | 'monthly' | 'daily'
  const { periodIncome, periodExpense, periodNet, periodLabel } = useMemo(() => {
    let filtered = incomeLogs;
    let label = 'All-time';

    if (cashFlowPeriod === 'monthly') {
      filtered = incomeLogs.filter((log) => log.date && log.date.substring(0, 7) === monthStr);
      // Format current month, e.g. "Sept 2026"
      const now = new Date();
      const mName = now.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
      label = `This Month (${mName})`;
    } else if (cashFlowPeriod === 'daily') {
      filtered = incomeLogs.filter((log) => log.date && log.date.substring(0, 10) === todayStr);
      const now = new Date();
      const dName = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      label = `Today (${dName})`;
    }

    const inc = filtered
      .filter((log) => log.type === 'Income')
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const exp = filtered
      .filter((log) => log.type === 'Expense')
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    return {
      periodIncome: inc,
      periodExpense: exp,
      periodNet: inc - exp,
      periodLabel: label,
    };
  }, [incomeLogs, cashFlowPeriod, todayStr, monthStr]);

  // 2. Calculate Net Calories Today
  const todayCaloriesLogs = useMemo(() => {
    return calorieLogs.filter((log) => {
      if (!log.date) return false;
      const cleanDate = log.date.substring(0, 10);
      return cleanDate === todayStr;
    });
  }, [calorieLogs, todayStr]);

  const todayFoodKcal = useMemo(() => {
    return todayCaloriesLogs
      .filter((log) => log.type === 'Food consumed')
      .reduce((sum, item) => sum + (Number(item.kcal) || 0), 0);
  }, [todayCaloriesLogs]);

  const todayExerciseKcal = useMemo(() => {
    return todayCaloriesLogs
      .filter((log) => log.type === 'Exercise')
      .reduce((sum, item) => sum + (Number(item.kcal) || 0), 0);
  }, [todayCaloriesLogs]);

  const netCaloriesToday = todayFoodKcal - todayExerciseKcal;
  const isOverCalorieLimit = netCaloriesToday > (maxDailyCalories || 2000);
  const caloriePercent = Math.min(
    100,
    Math.max(0, Math.round((netCaloriesToday / (maxDailyCalories || 2000)) * 100))
  );

  const handleApplyTarget = (valueToApply: number) => {
    const valid = isNaN(valueToApply) || valueToApply < 100 ? 2000 : Math.min(10000, valueToApply);
    setTargetInputValue(String(valid));
    if (onUpdateTargetCalories) {
      onUpdateTargetCalories(valid);
    }
  };

  const handleTargetKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = parseInt(targetInputValue, 10);
      handleApplyTarget(val);
      setIsEditingTarget(false);
    } else if (e.key === 'Escape') {
      setTargetInputValue(String(maxDailyCalories || 2000));
      setIsEditingTarget(false);
    }
  };

  const handleQuickStep = (stepDelta: number) => {
    const current = maxDailyCalories || 2000;
    const nextVal = Math.max(500, Math.min(10000, current + stepDelta));
    handleApplyTarget(nextVal);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 mb-6">
      {/* 1. KPI Metric Card: Net Cash Flow (with All Time, Monthly, Daily selector) */}
      <div
        id="kpi-card-cash-flow"
        className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs transition hover:shadow-sm flex flex-col justify-between"
      >
        <div>
          {/* Card Header & Timeframe Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Financial Balance
              </span>
              <h3 className="text-sm font-semibold text-slate-800 mt-0.5">Net Cash Flow</h3>
            </div>

            {/* Selector: All Time | Monthly | Daily */}
            <div
              id="cash-flow-period-selector"
              className="inline-flex p-0.5 rounded-xl bg-slate-100 border border-slate-200/70 text-xs self-start sm:self-auto"
            >
              <button
                type="button"
                id="btn-period-all"
                onClick={() => setCashFlowPeriod('all')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  cashFlowPeriod === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                All Time
              </button>
              <button
                type="button"
                id="btn-period-monthly"
                onClick={() => setCashFlowPeriod('monthly')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  cashFlowPeriod === 'monthly'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                id="btn-period-daily"
                onClick={() => setCashFlowPeriod('daily')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  cashFlowPeriod === 'daily'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                Daily
              </button>
            </div>
          </div>

          {/* Metric Value Display */}
          <div className="mt-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span
                id="metric-net-cash-flow"
                className={`text-3xl sm:text-4xl font-extrabold tracking-tight font-['JetBrains_Mono',monospace] ${
                  periodNet >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {periodNet >= 0 ? '+' : '-'}$
                {Math.abs(periodNet).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60">
                {periodLabel}
              </span>
            </div>

            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                periodNet >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Breakdown bar for selected timeframe */}
        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-slate-400 font-medium text-[11px] truncate">
                {cashFlowPeriod === 'all'
                  ? 'Total Income'
                  : cashFlowPeriod === 'monthly'
                  ? 'Monthly Income'
                  : 'Daily Income'}
              </div>
              <div className="font-semibold text-slate-800 font-['JetBrains_Mono',monospace] truncate">
                +${periodIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-slate-400 font-medium text-[11px] truncate">
                {cashFlowPeriod === 'all'
                  ? 'Total Expenses'
                  : cashFlowPeriod === 'monthly'
                  ? 'Monthly Expenses'
                  : 'Daily Expenses'}
              </div>
              <div className="font-semibold text-slate-800 font-['JetBrains_Mono',monospace] truncate">
                -${periodExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. KPI Metric Card: Net Calories Today (with user input for Target Calories) */}
      <div
        id="kpi-card-calories-today"
        className={`relative overflow-hidden rounded-2xl bg-white border p-5 shadow-xs transition hover:shadow-sm flex flex-col justify-between ${
          isOverCalorieLimit ? 'border-rose-300 ring-1 ring-rose-300/50' : 'border-slate-200/80'
        }`}
      >
        <div>
          {/* Header & Target Input Control */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Daily Nutrition & Burn
                </span>
                {isOverCalorieLimit && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                    ⚠️ Over Cap
                  </span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-slate-800 mt-0.5">Net Calories Today</h3>
            </div>

            {/* Target Calorie Input Widget */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-50 border border-slate-200/80 rounded-xl p-1 shadow-2xs">
              <div className="flex items-center gap-1 px-1.5 text-slate-500">
                <Target className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-[11px] font-bold text-slate-700">Target:</span>
              </div>

              <div className="flex items-center gap-1">
                {/* Stepper Down */}
                <button
                  type="button"
                  onClick={() => handleQuickStep(-100)}
                  title="Decrease target by 100 kcal"
                  className="w-5 h-5 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition"
                >
                  <Minus className="w-2.5 h-2.5" />
                </button>

                {/* Direct Number Input */}
                <input
                  id="metric-target-calories-input"
                  type="number"
                  min="500"
                  max="10000"
                  step="50"
                  value={targetInputValue}
                  onChange={(e) => {
                    setTargetInputValue(e.target.value);
                    const parsed = parseInt(e.target.value, 10);
                    if (!isNaN(parsed) && parsed >= 100) {
                      if (onUpdateTargetCalories) onUpdateTargetCalories(parsed);
                    }
                  }}
                  onBlur={() => {
                    const parsed = parseInt(targetInputValue, 10);
                    handleApplyTarget(parsed);
                  }}
                  onKeyDown={handleTargetKeyDown}
                  className="w-16 px-1.5 py-0.5 text-xs font-bold font-['JetBrains_Mono',monospace] text-center bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                />

                {/* Stepper Up */}
                <button
                  type="button"
                  onClick={() => handleQuickStep(100)}
                  title="Increase target by 100 kcal"
                  className="w-5 h-5 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition"
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>

                <span className="text-[10px] text-slate-400 font-semibold pr-1">kcal</span>
              </div>
            </div>
          </div>

          {/* Metric Value Display */}
          <div className="mt-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span
                id="metric-net-calories-today"
                className={`text-3xl sm:text-4xl font-extrabold tracking-tight font-['JetBrains_Mono',monospace] ${
                  isOverCalorieLimit ? 'text-rose-600' : 'text-slate-900'
                }`}
              >
                {netCaloriesToday.toLocaleString()}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                / {(maxDailyCalories || 2000).toLocaleString()} kcal
              </span>
              <span
                className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                  caloriePercent > 100
                    ? 'bg-rose-50 text-rose-700'
                    : caloriePercent > 80
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {caloriePercent}%
              </span>
            </div>

            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                isOverCalorieLimit ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
              }`}
            >
              <Flame className="w-5 h-5" />
            </div>
          </div>

          {/* Progress Bar towards Target */}
          <div className="mt-3">
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isOverCalorieLimit
                    ? 'bg-rose-500'
                    : caloriePercent > 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, caloriePercent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Breakdown bar */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <UtensilsCrossed className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-slate-400 font-medium text-[11px] truncate">Food Consumed</div>
              <div className="font-semibold text-slate-800 font-['JetBrains_Mono',monospace] truncate">
                +{todayFoodKcal} kcal
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-slate-400 font-medium text-[11px] truncate">Exercise Burned</div>
              <div className="font-semibold text-slate-800 font-['JetBrains_Mono',monospace] truncate">
                -{todayExerciseKcal} kcal
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
