import React from 'react';
import {
  LayoutDashboard,
  CalendarCheck2,
  CheckSquare,
  ListTodo,
  CalendarDays,
  Target,
  Timer,
  StickyNote,
  BarChart3,
  Plus,
  Sparkles,
  Cloud,
  LogIn,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { usePlan } from '../context/PlanContext';
import { ViewType } from '../types';

interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ElementType;
  badgeCount?: number;
}

export const Sidebar: React.FC = () => {
  const {
    activeView,
    setActiveView,
    openTaskModal,
    openPlanGenerator,
    reviewMetrics,
    focusState,
    currentUser,
    openAuthModal,
    signOut,
  } = usePlan();

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'planner', label: 'My Planner', icon: CalendarCheck2, badgeCount: reviewMetrics.todayPending },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, badgeCount: reviewMetrics.todayPending },
    { id: 'lists', label: 'Lists', icon: ListTodo },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'goals', label: 'Goals', icon: Target, badgeCount: reviewMetrics.activeGoalsCount },
    {
      id: 'focus',
      label: 'Focus',
      icon: Timer,
      badgeCount: focusState.isRunning ? 1 : undefined,
    },
    { id: 'notes', label: 'Notes', icon: StickyNote },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 h-screen sticky top-0 select-none z-30">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
            <CalendarCheck2 className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-lg text-slate-900 tracking-tight flex items-center gap-1.5">
              PlanList
            </span>
            <span className="block text-[11px] font-medium text-slate-500 -mt-0.5">
              Goal to Action Planner
            </span>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="px-4 pt-4 pb-2 space-y-2">
        <button
          id="sidebar-plan-my-day-btn"
          onClick={() => openPlanGenerator()}
          className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 group cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-indigo-200 transition-transform group-hover:rotate-12" />
          <span>Plan My Day</span>
        </button>

        <button
          id="sidebar-new-task-btn"
          onClick={() => openTaskModal()}
          className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Quick Task</span>
        </button>
      </div>

      {/* Main Navigation Menu */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Menu
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4.5 h-4.5 transition-colors ${
                    isActive ? 'text-indigo-600' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badgeCount !== undefined && item.badgeCount > 0 && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold transition-colors ${
                    isActive
                      ? 'bg-indigo-200/70 text-indigo-900'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item.badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Area: Progress & Supabase Account */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3">
        {/* Supabase Account / Cloud Status */}
        <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          {currentUser ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {currentUser.email ? currentUser.email[0].toUpperCase() : 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0]}
                  </p>
                  <p className="text-[10px] text-emerald-600 flex items-center gap-1 font-medium">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    <span>RLS Protected</span>
                  </p>
                </div>
              </div>
              <button
                id="sidebar-sign-out-btn"
                onClick={signOut}
                title="Sign out"
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              id="sidebar-sign-in-btn"
              onClick={() => openAuthModal('signin')}
              className="w-full py-1.5 px-2 rounded-lg bg-indigo-50/70 hover:bg-indigo-100/80 text-indigo-700 border border-indigo-200/50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Cloud className="w-3.5 h-3.5 text-indigo-600" />
              <span>Connect Supabase</span>
            </button>
          )}
        </div>

        {/* Today's Progress Card */}
        <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-700">Today's Progress</span>
            <span className="font-bold text-indigo-600">
              {reviewMetrics.todayTotal > 0
                ? `${Math.round((reviewMetrics.todayCompleted / reviewMetrics.todayTotal) * 100)}%`
                : '0%'}
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{
                width: `${
                  reviewMetrics.todayTotal > 0
                    ? Math.round((reviewMetrics.todayCompleted / reviewMetrics.todayTotal) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
            <span>{reviewMetrics.todayCompleted} completed</span>
            <span>{reviewMetrics.todayPending} remaining</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
