import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, AlertTriangle, Utensils, Activity, X } from 'lucide-react';
import { CalorieLog } from '../types';

interface ThresholdCalendarProps {
  calorieLogs: CalorieLog[];
  maxDailyCalories: number;
}

export const ThresholdCalendar: React.FC<ThresholdCalendarProps> = ({ calorieLogs, maxDailyCalories }) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(null);
  };

  // Build calendar matrix
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Aggregate logs by day for this month
  const dailyStats: {
    [dayStr: string]: {
      food: number;
      exercise: number;
      net: number;
      logs: CalorieLog[];
    };
  } = {};

  calorieLogs.forEach((log) => {
    if (!log.date) return;
    const dateStr = log.date.substring(0, 10);
    if (!dailyStats[dateStr]) {
      dailyStats[dateStr] = { food: 0, exercise: 0, net: 0, logs: [] };
    }
    const kcal = Number(log.kcal) || 0;
    if (log.type === 'Food consumed') {
      dailyStats[dateStr].food += kcal;
    } else {
      dailyStats[dateStr].exercise += kcal;
    }
    dailyStats[dateStr].net = dailyStats[dateStr].food - dailyStats[dateStr].exercise;
    dailyStats[dateStr].logs.push(log);
  });

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const todayKey = new Date().toISOString().substring(0, 10);

  // Pad days before first day of month
  const calendarCells = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarCells.push({ empty: true, id: `empty-${i}` });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const formattedDay = day < 10 ? `0${day}` : `${day}`;
    const formattedMonth = month + 1 < 10 ? `0${month + 1}` : `${month + 1}`;
    const dateKey = `${year}-${formattedMonth}-${formattedDay}`;

    const stats = dailyStats[dateKey];
    const hasData = Boolean(stats && (stats.food > 0 || stats.exercise > 0));
    const netCalories = stats ? stats.net : 0;
    const isOverCap = hasData && netCalories > maxDailyCalories;
    const isToday = dateKey === todayKey;

    calendarCells.push({
      empty: false,
      id: dateKey,
      dayNumber: day,
      dateKey,
      stats,
      hasData,
      netCalories,
      isOverCap,
      isToday,
    });
  }

  const selectedDayData = selectedDay ? dailyStats[selectedDay] : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs mb-6">
      {/* Calendar Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Threshold Alert Calendar</h3>
            <p className="text-xs text-slate-500">
              Days exceeding your <span className="font-semibold text-slate-700">{maxDailyCalories} kcal</span> cap are highlighted in red with ⚠️
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToday}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            Today
          </button>
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-0.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 transition"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-800 select-none min-w-[120px] text-center">
              {monthName}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 transition"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1.5 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">
        <span>Sun</span>
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {calendarCells.map((cell) => {
          if (cell.empty) {
            return (
              <div
                key={cell.id}
                className="min-h-[72px] sm:min-h-[88px] rounded-xl bg-slate-50/40 border border-slate-100/50 opacity-40"
              />
            );
          }

          const { dayNumber, dateKey, stats, hasData, netCalories, isOverCap, isToday } = cell;

          return (
            <div
              key={dateKey}
              onClick={() => setSelectedDay(selectedDay === dateKey ? null : dateKey)}
              className={`min-h-[72px] sm:min-h-[88px] p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                isOverCap
                  ? 'bg-red-100 border-red-300 hover:bg-red-100/80 shadow-2xs' // Strict requirement: bg-red-100
                  : hasData
                  ? 'bg-emerald-50/40 border-emerald-200/70 hover:bg-emerald-50'
                  : 'bg-white border-slate-200/80 hover:bg-slate-50'
              } ${isToday ? 'ring-2 ring-indigo-500 ring-offset-1' : ''} ${
                selectedDay === dateKey ? 'ring-2 ring-slate-800' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold leading-none ${
                    isToday
                      ? 'w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center'
                      : isOverCap
                      ? 'text-rose-900'
                      : 'text-slate-700'
                  }`}
                >
                  {dayNumber}
                </span>

                {isOverCap && (
                  <span className="text-xs" title={`Over Daily Cap (${netCalories} > ${maxDailyCalories})`}>
                    ⚠️
                  </span>
                )}
              </div>

              {/* Day Net Calories readout */}
              {hasData ? (
                <div className="mt-1">
                  <div
                    className={`text-[11px] sm:text-xs font-extrabold font-['JetBrains_Mono',monospace] leading-tight flex items-center gap-0.5 ${
                      isOverCap ? 'text-rose-800' : 'text-slate-800'
                    }`}
                  >
                    {isOverCap && <span>⚠️</span>}
                    <span>{netCalories > 0 ? `+${netCalories}` : `${netCalories}`}</span>
                    <span className="text-[9px] font-normal text-slate-500 hidden sm:inline">kcal</span>
                  </div>

                  {/* Micro sub-pills */}
                  <div className="hidden sm:flex items-center gap-1 mt-1 text-[9px] text-slate-500 font-medium">
                    {stats.food > 0 && (
                      <span className="text-orange-700">+{stats.food}</span>
                    )}
                    {stats.exercise > 0 && (
                      <span className="text-blue-700">-{stats.exercise}</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-[10px] text-slate-300 font-light mt-auto">--</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Day Log Drill-Down Drawer/Card */}
      {selectedDay && selectedDayData && (
        <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-800">
                Log Details for {selectedDay}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  selectedDayData.net > maxDailyCalories
                    ? 'bg-rose-100 text-rose-700 border border-rose-200'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                Net: {selectedDayData.net} kcal (Food: +{selectedDayData.food} / Burn: -{selectedDayData.exercise})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {selectedDayData.logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/80 text-xs"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center ${
                      log.type === 'Food consumed' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                    }`}
                  >
                    {log.type === 'Food consumed' ? (
                      <Utensils className="w-3 h-3" />
                    ) : (
                      <Activity className="w-3 h-3" />
                    )}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800">{log.category}</span>
                    {log.note && <span className="text-slate-400 ml-1.5 italic font-normal">"{log.note}"</span>}
                  </div>
                </div>
                <span
                  className={`font-bold font-['JetBrains_Mono',monospace] ${
                    log.type === 'Food consumed' ? 'text-amber-600' : 'text-blue-600'
                  }`}
                >
                  {log.type === 'Food consumed' ? `+${log.kcal}` : `-${log.kcal}`} kcal
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
