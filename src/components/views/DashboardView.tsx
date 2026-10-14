import React from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Sparkles,
  Target,
  ArrowRight,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { usePlan } from '../../context/PlanContext';
import {
  getTodayString,
  formatFullDateHeader,
  formatMinutesToHours,
  getTimeOfDayGreeting,
} from '../../utils/dateUtils';
import { TodayTimeline } from '../TodayTimeline';
import { PlanVsDone } from '../PlanVsDone';
import { GoalProgressCard } from '../GoalProgressCard';

export const DashboardView: React.FC = () => {
  const {
    tasks,
    goals,
    reviewMetrics,
    openPlanGenerator,
    openTaskModal,
    openGoalModal,
    setActiveView,
    searchQuery,
  } = usePlan();

  const todayStr = getTodayString();

  // Filter tasks for Today
  const todayTasks = tasks.filter((t) => {
    if (t.date !== todayStr) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        t.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const todayTotal = todayTasks.length;
  const todayCompleted = todayTasks.filter((t) => t.completed).length;
  const completionPercentage =
    todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

  const greeting = getTimeOfDayGreeting();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. STRONG "TODAY" HEADER & STATS */}
      <div
        id="today-dashboard-header"
        className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100/80">
                Today Experience
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {formatFullDateHeader(new Date())}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {greeting}
            </h1>
            <p className="text-sm sm:text-base font-semibold text-slate-500 mt-0.5">
              Let's make today count.
            </p>
          </div>

          {/* Primary & Secondary CTAs */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              id="dashboard-plan-my-day-cta"
              onClick={() => openPlanGenerator()}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-200" />
              <span>+ Plan My Day</span>
            </button>

            <button
              id="dashboard-quick-task-cta"
              onClick={() => openTaskModal({ date: todayStr })}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-500" />
              <span>+ Quick Task</span>
            </button>
          </div>
        </div>

        {/* Today's Plan Section Header */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
              Today's Plan
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {todayTasks.length} {todayTasks.length === 1 ? 'task' : 'tasks'} scheduled
          </span>
        </div>

        {/* Required Stats Row:
            * Today's date
            * Completion percentage
            * Planned time
            * Completed time
            * Remaining time
        */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-3">
          {/* Completion percentage */}
          <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100/80">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-indigo-700 block mb-0.5">
              Completion
            </span>
            <span className="text-xl sm:text-2xl font-extrabold text-indigo-950 tracking-tight">
              {completionPercentage}%
            </span>
            <span className="text-[11px] text-indigo-600 font-medium block mt-0.5">
              {todayCompleted} of {todayTotal} tasks done
            </span>
          </div>

          {/* Planned time */}
          <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
              Planned Time
            </span>
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {formatMinutesToHours(reviewMetrics.todayPlannedMinutes)}
            </span>
            <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
              Total estimated today
            </span>
          </div>

          {/* Completed time */}
          <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100/80">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-700 block mb-0.5">
              Completed Time
            </span>
            <span className="text-xl sm:text-2xl font-extrabold text-emerald-950 tracking-tight">
              {formatMinutesToHours(reviewMetrics.todayCompletedMinutes)}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium block mt-0.5">
              Work finished today
            </span>
          </div>

          {/* Remaining time */}
          <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-100/80">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-700 block mb-0.5">
              Remaining Time
            </span>
            <span className="text-xl sm:text-2xl font-extrabold text-amber-950 tracking-tight">
              {formatMinutesToHours(reviewMetrics.todayRemainingMinutes)}
            </span>
            <span className="text-[11px] text-amber-600 font-medium block mt-0.5">
              Needed to close agenda
            </span>
          </div>
        </div>
      </div>

      {/* 2. PRODUCT WORKFLOW BANNER: PLAN → BREAK DOWN → SCHEDULE → FOCUS → REVIEW */}
      <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
            Framework
          </span>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 overflow-x-auto py-0.5">
            <button
              onClick={() => openPlanGenerator()}
              className="hover:text-indigo-400 transition-colors"
            >
              PLAN
            </button>
            <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />
            <span className="text-slate-400">BREAK DOWN</span>
            <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />
            <button
              onClick={() => setActiveView('planner')}
              className="hover:text-indigo-400 transition-colors"
            >
              SCHEDULE
            </button>
            <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />
            <button
              onClick={() => setActiveView('focus')}
              className="hover:text-indigo-400 transition-colors"
            >
              FOCUS
            </button>
            <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />
            <button
              onClick={() => setActiveView('analytics')}
              className="hover:text-indigo-400 transition-colors"
            >
              REVIEW
            </button>
          </div>
        </div>

        <button
          onClick={() => openPlanGenerator()}
          className="text-xs text-indigo-300 hover:text-white font-semibold flex items-center gap-1 transition-colors self-start sm:self-auto"
        >
          <span>Launch 3-Step Wizard</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3. MAIN DASHBOARD CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Today's Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Today Timeline
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  {todayTasks.length} {todayTasks.length === 1 ? 'task' : 'tasks'}
                </span>
                <button
                  onClick={() => openTaskModal({ date: todayStr })}
                  className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="Add Quick Task for Today"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Today Timeline Component (with NOW Indicator & Compact Cards) */}
            <TodayTimeline tasks={todayTasks} />
          </div>
        </div>

        {/* Right 1 Column: Plan vs Done & Goals Progress */}
        <div className="space-y-6">
          {/* Plan vs Done Widget */}
          <PlanVsDone />

          {/* Goals Visual Progress Section */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Goals Progress
                </h3>
              </div>
              <button
                onClick={openGoalModal}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-0.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Goal</span>
              </button>
            </div>

            {/* Goals List or Empty State */}
            {goals.length === 0 ? (
              <div
                id="goals-empty-state"
                className="text-center py-6 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2.5">
                  <Target className="w-5 h-5" />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                  What are you working toward?
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                  Create your first goal and turn it into actionable tasks.
                </p>
                <button
                  onClick={openGoalModal}
                  className="mt-3.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Goal</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {goals.slice(0, 3).map((goal) => (
                  <GoalProgressCard key={goal.id} goal={goal} />
                ))}

                {goals.length > 3 && (
                  <button
                    onClick={() => setActiveView('goals')}
                    className="w-full py-2 text-center text-xs font-semibold text-indigo-600 hover:text-indigo-700 block transition-colors"
                  >
                    View all {goals.length} goals →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
