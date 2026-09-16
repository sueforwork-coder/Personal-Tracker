import React, { useState, useEffect } from 'react';
import { DollarSign, PlusCircle, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { IncomeType, SheetSettings } from '../types';

interface IncomeFormProps {
  settings: SheetSettings;
  onSubmit: (entry: { date: string; type: IncomeType; category: string; amount: number; note: string }) => Promise<void>;
  isSubmitting: boolean;
}

export const IncomeForm: React.FC<IncomeFormProps> = ({ settings, onSubmit, isSubmitting }) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState<string>(todayStr);
  const [type, setType] = useState<IncomeType>('Expense');
  const [category, setCategory] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Contextually rewrite category choices when Type changes
  const activeCategories = type === 'Income' ? settings.incomeCategories : settings.expenseCategories;

  useEffect(() => {
    if (activeCategories.length > 0) {
      // If current category is not in the active set, select the first option
      if (!activeCategories.includes(category)) {
        setCategory(activeCategories[0]);
      }
    }
  }, [type, activeCategories, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg('Please enter a valid amount greater than 0.');
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
        amount: numericAmount,
        note: note.trim(),
      });

      // Reset amount and note upon successful submission
      setAmount('');
      setNote('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record entry.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Track Finances</h2>
            <p className="text-xs text-slate-500">Log income streams or expenses</p>
          </div>
        </div>

        {/* Type toggle switch */}
        <div className="inline-flex p-0.5 rounded-xl bg-slate-100 border border-slate-200/80 text-xs">
          <button
            type="button"
            id="btn-type-expense"
            onClick={() => setType('Expense')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition ${
              type === 'Expense'
                ? 'bg-white text-rose-700 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>Expense</span>
          </button>
          <button
            type="button"
            id="btn-type-income"
            onClick={() => setType('Income')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition ${
              type === 'Income'
                ? 'bg-white text-emerald-700 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Income</span>
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
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="income-date">
              Date
            </label>
            <input
              type="date"
              id="income-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
          </div>

          {/* Contextual Category Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="income-category">
              {type} Category
            </label>
            <select
              id="income-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
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
          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="income-amount">
              Amount ($)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">$</span>
              <input
                type="number"
                id="income-amount"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full pl-7 pr-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="income-note">
              Note (Optional)
            </label>
            <input
              type="text"
              id="income-note"
              placeholder="e.g., Weekly groceries, Client invoice"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 text-xs text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
          </div>
        </div>

        {/* Form Submission Button with Loading State */}
        <button
          type="submit"
          id="btn-submit-income"
          disabled={isSubmitting}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white transition shadow-sm ${
            type === 'Income'
              ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
              : 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800'
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
              <span>Record {type}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
