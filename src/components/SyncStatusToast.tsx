import React from 'react';
import { AlertCircle, RefreshCw, X, ShieldAlert } from 'lucide-react';
import { usePlan } from '../context/PlanContext';

export const SyncStatusToast: React.FC = () => {
  const { syncStatus, syncError, dismissSyncError, retryLastSync, openRlsModal } = usePlan();

  if (syncStatus !== 'error' || !syncError) return null;

  const isRlsError =
    syncError.toLowerCase().includes('rls') ||
    syncError.toLowerCase().includes('row-level security') ||
    syncError.includes('42501');

  return (
    <div
      id="supabase-sync-error-toast"
      className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 max-w-md bg-white rounded-2xl shadow-xl border border-rose-200 p-4 animate-in slide-in-from-bottom-3 duration-200 text-slate-800"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
          {isRlsError ? <ShieldAlert className="w-4 h-4 text-amber-600" /> : <AlertCircle className="w-4 h-4" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-slate-900">
              {isRlsError ? 'Supabase RLS Setup Required' : 'Supabase Save Failed'}
            </h4>
            <button
              onClick={dismissSyncError}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs text-slate-600 mt-1 leading-relaxed break-words">
            {syncError}
          </p>

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {isRlsError ? (
              <button
                id="toast-fix-rls-btn"
                onClick={openRlsModal}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <ShieldAlert className="w-3 h-3" />
                <span>Fix RLS (Copy SQL)</span>
              </button>
            ) : (
              <button
                onClick={retryLastSync}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry Sync</span>
              </button>
            )}
            <button
              onClick={dismissSyncError}
              className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 text-[11px] font-medium transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
