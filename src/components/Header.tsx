import React from 'react';
import {
  Search,
  Plus,
  Calendar as CalendarIcon,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogIn,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { usePlan } from '../context/PlanContext';
import { formatFullDateHeader } from '../utils/dateUtils';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const {
    openTaskModal,
    searchQuery,
    setSearchQuery,
    currentUser,
    authLoading,
    syncStatus,
    syncError,
    retryLastSync,
    openAuthModal,
    signOut,
    isSupabaseReady,
  } = usePlan();

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3 flex items-center justify-between gap-4">
      {/* View Title & Subtitle */}
      <div className="shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 font-medium hidden sm:block">{subtitle}</p>
        )}
      </div>

      {/* Center Search / Filter */}
      <div className="hidden md:flex items-center flex-1 max-w-xs relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          id="global-search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tasks, goals, lists..."
          className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-100/80 border border-transparent hover:border-slate-200 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all text-slate-800 placeholder:text-slate-400"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-[10px] text-slate-400 hover:text-slate-600 absolute right-2.5 font-medium cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Right Date, Cloud Sync Status, Auth & Actions */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Unobtrusive Supabase Sync Status Indicator */}
        {currentUser && (
          <div className="flex items-center">
            {syncStatus === 'saving' && (
              <div
                id="sync-status-saving"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-medium border border-indigo-200/60 animate-pulse"
                title="Saving changes to Supabase..."
              >
                <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                <span className="hidden sm:inline">Saving</span>
              </div>
            )}

            {syncStatus === 'saved' && (
              <div
                id="sync-status-saved"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200/60"
                title="All changes saved to Supabase"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span className="hidden sm:inline">Saved</span>
              </div>
            )}

            {syncStatus === 'error' && (
              <button
                id="sync-status-error-btn"
                onClick={retryLastSync}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-[11px] font-medium border border-rose-200 transition-colors cursor-pointer"
                title={syncError || 'Supabase save error. Click to retry.'}
              >
                <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                <span className="hidden sm:inline">Save failed (Retry)</span>
              </button>
            )}

            {syncStatus === 'idle' && (
              <div
                id="sync-status-idle"
                className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] text-slate-400 font-medium"
                title="Connected to Supabase. Real-time RLS sync active."
              >
                <Cloud className="w-3.5 h-3.5 text-slate-400" />
                <span>Synced</span>
              </div>
            )}
          </div>
        )}

        {/* Date Display */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/70 border border-slate-200/60 text-xs font-semibold text-slate-600">
          <CalendarIcon className="w-3.5 h-3.5 text-indigo-600" />
          <span>{formatFullDateHeader()}</span>
        </div>

        {/* Authentication State Button */}
        {!authLoading && (
          <div>
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200/80 text-xs text-slate-700"
                  title={`Logged in as ${currentUser.email}`}
                >
                  <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold uppercase">
                    {currentUser.email ? currentUser.email[0] : 'U'}
                  </div>
                  <span className="hidden sm:inline max-w-[120px] truncate font-medium">
                    {currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0]}
                  </span>
                </div>
                <button
                  id="header-sign-out-btn"
                  onClick={signOut}
                  title="Sign out of Supabase session"
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                id="header-sign-in-btn"
                onClick={() => openAuthModal('signin')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-semibold border border-slate-200/80 transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-indigo-600" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        )}

        {/* Add Task Button */}
        <button
          id="header-add-task-btn"
          onClick={() => openTaskModal()}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Task</span>
        </button>
      </div>
    </header>
  );
};
