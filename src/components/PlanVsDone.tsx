import React from 'react';
import { Clock, CheckCircle2, AlertCircle, ArrowUpRight } from 'lucide-react';
import { formatMinutesToHours } from '../utils/dateUtils';
import { usePlan } from '../context/PlanContext';

interface PlanVsDoneProps {
  plannedMinutes?: number;
  completedMinutes?: number;
  carriedForwardMinutes?: number;
}

export const PlanVsDone: React.FC<PlanVsDoneProps> = ({
  plannedMinutes,
  completedMinutes,
  carriedForwardMinutes,
}) => {
  const { reviewMetrics, setActiveView } = usePlan();

  const planned = plannedMinutes !== undefined ? plannedMinutes : reviewMetrics.todayPlannedMinutes;
  const completed = completedMinutes !== undefined ? completedMinutes : reviewMetrics.todayCompletedMinutes;
  const carried = carriedForwardMinutes !== undefined ? carriedForwardMinutes : reviewMetrics.carriedForwardMinutes;

  const totalConsidered = Math.max(1, planned + carried);
  const completedPct = Math.min(100, Math.round((completed / totalConsidered) * 100));
  const remainingPct = Math.max(0, Math.round(((planned - completed) / totalConsidered) * 100));
  const carriedPct = Math.min(100, Math.round((carried / totalConsidered) * 100));

  return (
    <div
      id="plan-vs-done-widget"
      className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-xs transition-all"
    >
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">Plan vs Done</h3>
        </div>
        <button
          onClick={() => setActiveView('analytics')}
          className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-0.5"
        >
          <span>Weekly Review</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3 Metric Columns: PLANNED, COMPLETED, CARRIED FORWARD */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 text-left">
        {/* Planned */}
        <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            PLANNED
          </span>
          <span className="text-base sm:text-xl font-extrabold text-slate-900 tracking-tight">
            {formatMinutesToHours(planned)}
          </span>
        </div>

        {/* Completed */}
        <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100/60">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-700 block mb-1">
            COMPLETED
          </span>
          <span className="text-base sm:text-xl font-extrabold text-emerald-950 tracking-tight">
            {formatMinutesToHours(completed)}
          </span>
        </div>

        {/* Carried Forward */}
        <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-100/60">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-700 block mb-1">
            CARRIED FORWARD
          </span>
          <span className="text-base sm:text-xl font-extrabold text-amber-950 tracking-tight">
            {formatMinutesToHours(carried)}
          </span>
        </div>
      </div>

      {/* Progress Visualization */}
      <div className="space-y-1.5">
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
          {/* Completed Segment */}
          <div
            className="bg-emerald-500 h-full transition-all duration-500"
            style={{ width: `${completedPct}%` }}
            title={`Completed: ${completedPct}%`}
          />
          {/* Remaining Planned Segment */}
          <div
            className="bg-indigo-400/80 h-full transition-all duration-500"
            style={{ width: `${remainingPct}%` }}
            title={`Remaining: ${remainingPct}%`}
          />
          {/* Carried Over Segment */}
          <div
            className="bg-amber-400 h-full transition-all duration-500"
            style={{ width: `${carriedPct}%` }}
            title={`Carried Forward: ${carriedPct}%`}
          />
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Done ({completedPct}%)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              <span>Remaining</span>
            </span>
            {carried > 0 && (
              <span className="flex items-center gap-1 text-amber-700">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Carried Over</span>
              </span>
            )}
          </div>
          <span className="font-semibold text-slate-700 font-mono">
            {Math.round((completed / (planned || 1)) * 100)}% of plan
          </span>
        </div>
      </div>
    </div>
  );
};
