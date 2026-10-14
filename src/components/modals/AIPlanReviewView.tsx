import React, { useState } from 'react';
import {
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  Coffee,
  RotateCcw,
  Check,
  Loader2,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AIDailyPlanResponse, AIScheduleItem, Priority, Task } from '../../types';

interface AIPlanReviewViewProps {
  isLoading: boolean;
  error: string | null;
  planData: AIDailyPlanResponse | null;
  isCommitting: boolean;
  isSaved?: boolean;
  allTasks?: Task[];
  availableTimeMinutes: number;
  onAccept: () => void;
  onRegenerate: () => void;
  onCancel: () => void;
}

function formatHoursMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export const AIPlanReviewView: React.FC<AIPlanReviewViewProps> = ({
  isLoading,
  error,
  planData,
  isCommitting,
  isSaved = false,
  allTasks = [],
  availableTimeMinutes,
  onAccept,
  onRegenerate,
  onCancel,
}) => {
  const [showUnscheduledList, setShowUnscheduledList] = useState(false);

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center min-h-[360px] animate-in fade-in duration-200">
        <div className="relative mb-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm animate-pulse">
            <Sparkles className="w-7 h-7 text-indigo-600 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Loader2 className="w-3 h-3 animate-spin" />
          </div>
        </div>
        <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          Creating your plan...
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mt-1.5 leading-relaxed">
          AI is organizing your day based on deadlines, priorities, energy levels, and available time...
        </p>
      </div>
    );
  }

  // 2. Saved State
  if (isSaved) {
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center min-h-[360px] animate-in zoom-in-95 duration-200">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-xs mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-lg font-extrabold text-slate-900 tracking-tight text-emerald-700">
          ✓ Plan saved
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-sm mt-1">
          Your tasks have been updated and scheduled for today in Supabase.
        </p>
      </div>
    );
  }

  // 3. Error State
  if (error) {
    return (
      <div className="p-6 sm:p-8 flex flex-col items-center justify-center text-center min-h-[320px]">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3.5 border border-rose-100">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
          AI Couldn't Create Schedule
        </h3>
        <p className="text-xs sm:text-sm text-rose-600 bg-rose-50/70 border border-rose-100 rounded-xl px-4 py-2.5 mt-2 max-w-md">
          {error}
        </p>
        <div className="flex items-center gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onRegenerate}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  if (!planData) return null;

  const scheduledTasksCount = planData.schedule.filter((i) => !i.isBreak).length;
  const unscheduledIds = planData.unscheduledTaskIds || [];
  const unscheduledCount = unscheduledIds.length;
  const plannedMins = planData.totalPlannedMinutes || planData.schedule.filter((i) => !i.isBreak).reduce((acc, i) => acc + i.durationMinutes, 0);
  const availableMins = planData.availableMinutes || availableTimeMinutes;

  const getPriorityBadge = (priority?: Priority | string) => {
    switch (priority) {
      case 'urgent':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">Urgent</span>;
      case 'high':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">High</span>;
      case 'medium':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Medium</span>;
      case 'low':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">Low</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-150">
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>✨ AI Suggested Plan</span>
            </h3>
            {planData.summary && (
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                {planData.summary}
              </p>
            )}
          </div>
        </div>

        {/* Fits indicator if tasks were left unscheduled */}
        {unscheduledCount > 0 && (
          <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full whitespace-nowrap">
            {scheduledTasksCount} tasks scheduled · {unscheduledCount} tasks left for later
          </span>
        )}
      </div>

      {/* Schedule Items List */}
      <div className="space-y-2 overflow-y-auto max-h-[44vh] pr-1">
        {planData.schedule.map((item, idx) => {
          if (item.isBreak) {
            return (
              <div
                key={`break-${idx}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/50 border border-dashed border-emerald-200 text-slate-700 transition-colors"
              >
                <div className="w-28 shrink-0 font-mono text-xs font-bold text-emerald-800">
                  {item.startTime} – {item.endTime}
                </div>
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Coffee className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-emerald-900">
                      {item.title || 'Break'}
                    </span>
                    {item.reason && (
                      <span className="text-[11px] text-emerald-700 ml-2 italic">
                        — {item.reason}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full shrink-0">
                    {item.durationMinutes}m recharge
                  </span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={item.taskId || `task-${idx}`}
              className="flex items-start sm:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 shadow-2xs transition-all"
            >
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                {/* Time range e.g. 09:00 – 09:30 */}
                <div className="w-28 shrink-0 font-mono text-xs font-bold text-slate-800 pt-0.5 sm:pt-0">
                  {item.startTime} – {item.endTime}
                </div>

                {/* Title & Reason */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {item.title}
                    </span>
                    {getPriorityBadge(item.priority)}
                    {item.energyLevel && (
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">
                        ⚡ {item.energyLevel}
                      </span>
                    )}
                  </div>
                  {item.reason && (
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                      {item.reason}
                    </p>
                  )}
                </div>
              </div>

              <span className="font-mono text-xs text-slate-400 font-semibold shrink-0">
                {item.durationMinutes}m
              </span>
            </div>
          );
        })}
      </div>

      {/* Metrics Summary Strip */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Scheduled</span>
          <span className="font-extrabold text-slate-800 font-mono">{scheduledTasksCount} tasks</span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Unscheduled</span>
          <span className="font-extrabold text-slate-800 font-mono">{unscheduledCount} tasks</span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Available time</span>
          <span className="font-extrabold text-slate-800 font-mono">{formatHoursMinutes(availableMins)}</span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Planned time</span>
          <span className="font-extrabold text-slate-800 font-mono">{formatHoursMinutes(plannedMins)}</span>
        </div>
      </div>

      {/* Optional view for unscheduled tasks */}
      {unscheduledCount > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setShowUnscheduledList(!showUnscheduledList)}
            className="w-full px-3.5 py-2 flex items-center justify-between text-slate-600 hover:bg-slate-50 transition-colors font-semibold cursor-pointer"
          >
            <span>{unscheduledCount} unscheduled tasks will stay in your task list for later</span>
            {showUnscheduledList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showUnscheduledList && (
            <div className="px-3.5 py-2 border-t border-slate-100 max-h-32 overflow-y-auto space-y-1">
              {unscheduledIds.map((id) => {
                const orig = allTasks.find((t) => t.id === id);
                return (
                  <div key={id} className="flex items-center justify-between text-slate-500 py-0.5">
                    <span className="truncate">{orig?.title || id}</span>
                    <span className="font-mono text-[10px] text-slate-400">{orig?.durationMinutes || 30}m</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons: [Accept Plan] [Regenerate] [Cancel] */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
        <button
          type="button"
          onClick={onCancel}
          disabled={isCommitting}
          className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
        >
          Cancel
        </button>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isCommitting}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Regenerate</span>
          </button>

          <button
            type="button"
            id="accept-ai-plan-btn"
            disabled={isCommitting}
            onClick={onAccept}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {isCommitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Accepting...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Accept Plan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
