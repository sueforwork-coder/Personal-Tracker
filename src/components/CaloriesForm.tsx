import React, { useState, useEffect } from 'react';
import { UtensilsCrossed, Activity, PlusCircle, Flame, Loader2 } from 'lucide-react';
import { CalorieType, SheetSettings } from '../types';

interface CaloriesFormProps {
  settings: SheetSettings;
  onSubmit: (entry: { date: string; type: CalorieType; category: string; kcal: number; note: string }) => Promise<void>;
  isSubmitting: boolean;
}

export const CaloriesForm: React.FC<CaloriesFormProps> = ({ settings, onSubmit, isSubmitting }) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState<string>(todayStr);
  const [type, setType] = useState<CalorieType>('Food consumed');
  const [category, setCategory] = useState<string>('');
  const [kcal, setKcal] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Category dropdown dynamically adjusts based on the selected Type
  const activeCategories = type === 'Food consumed' ? settings.foodCategories : settings.exerciseCategories;

  useEffect(() => {
    if (activeCategories.length > 0) {
      if (!activeCategories.includes(category)) {
        setCategory(activeCategories[0]);
      }
    }
  }, [type, activeCategories, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const numericKcal = parseFloat(kcal);
    if (isNaN(numericKcal) || numericKcal <= 0) {
      setErrorMsg('Please enter a valid calorie amount greater than 0.');
      return;
    }

    if (!category) {
      setErrorMsg('Please select a category.');
      return;
    }

    try {
      await onSubmit({
        date: date || todayStr,
        type,
        category,
        kcal: Math.round(numericKcal),
        note: note.trim(),
      });

      // Reset values
      setKcal('');
      setNote('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record entry.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Track Calories</h2>
            <p className="text-xs text-slate-500">Log meals consumed or active burn</p>
          </div>
        </div>

        {/* Type toggle switch */}
        <div className="inline-flex p-0.5 rounded-xl bg-slate-100 border border-slate-200/80 text-xs">
          <button
            type="button"
            id="btn-type-food"
            onClick={() => setType('Food consumed')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition ${
              type === 'Food consumed'
                ? 'bg-white text-amber-700 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Food</span>
          </button>
          <button
            type="button"
            id="btn-type-exercise"
            onClick={() => setType('Exercise')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition ${
              type === 'Exercise'
                ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Exercise</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-3 p-2.5 text-xs rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="cal-date">
              Date
            </label>
            <input
              type="date"
              id="cal-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
            />
          </div>

          {/* Dynamic Category Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="cal-category">
              {type === 'Food consumed' ? 'Meal / Food' : 'Exercise'} Category
            </label>
            <select
              id="cal-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
            >
              {activeCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Calories (Kcal) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="cal-kcal">
              Calories (kcal)
            </label>
            <div className="relative">
              <input
                type="number"
                id="cal-kcal"
                step="1"
                min="1"
                placeholder="e.g., 450"
                value={kcal}
                onChange={(e) => setKcal(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
              />
              <span className="absolute right-3 top-2 text-xs font-semibold text-slate-400">kcal</span>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="cal-note">
              Description / Note (Optional)
            </label>
            <input
              type="text"
              id="cal-note"
              placeholder={type === 'Food consumed' ? 'e.g., Chicken salad & quinoa' : 'e.g., 5km outdoor run'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 text-xs text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
            />
          </div>
        </div>

        {/* Form Submission Button with Loading State */}
        <button
          type="submit"
          id="btn-submit-calories"
          disabled={isSubmitting}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white transition shadow-sm ${
            type === 'Food consumed'
              ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
          } disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Syncing with Cloud Matrix...</span>
            </>
          ) : (
            <>
              <PlusCircle className="w-4 h-4" />
              <span>Log {type === 'Food consumed' ? 'Intake (+kcal)' : 'Burn (-kcal)'}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
