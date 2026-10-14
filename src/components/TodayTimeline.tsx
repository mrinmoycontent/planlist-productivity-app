import React, { useMemo } from 'react';
import { Clock, CalendarCheck2, Plus, Sparkles, Check, Play } from 'lucide-react';
import { Task, Priority } from '../types';
import { formatTimeDisplay } from '../utils/dateUtils';
import { usePlan } from '../context/PlanContext';
import { TaskCard } from './TaskCard';

interface TodayTimelineProps {
  tasks: Task[];
}

export const TodayTimeline: React.FC<TodayTimelineProps> = ({ tasks }) => {
  const { openPlanGenerator, openTaskModal, focusState, startFocus, setActiveView } = usePlan();

  // Sort tasks chronologically by time, with untimed placed thoughtfully
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      // Completed at the bottom or preserve time order? Let's preserve time order, but if times match, completed comes second
      if (a.time && b.time) {
        return a.time.localeCompare(b.time);
      }
      if (a.time && !b.time) return -1;
      if (!a.time && b.time) return 1;
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });
  }, [tasks]);

  // Determine which task is "NOW"
  const nowTaskId = useMemo(() => {
    // 1. If focus is running, use focus task
    if (focusState.currentTaskId) {
      const active = sortedTasks.find((t) => t.id === focusState.currentTaskId && !t.completed);
      if (active) return active.id;
    }

    // 2. Current hour/minute comparison
    const now = new Date();
    const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Find the first uncompleted task
    const pendingTasks = sortedTasks.filter((t) => !t.completed);
    if (pendingTasks.length === 0) return null;

    // Look for a task scheduled close to now
    const timedPending = pendingTasks.filter((t) => t.time);
    if (timedPending.length > 0) {
      // Find one whose time <= current or closest
      const match = timedPending.find((t) => (t.time || '') >= currentHourMin);
      return match ? match.id : timedPending[0].id;
    }

    // Otherwise the first pending task
    return pendingTasks[0].id;
  }, [sortedTasks, focusState.currentTaskId]);

  if (tasks.length === 0) {
    return (
      <div 
        id="today-timeline-empty-state"
        className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 sm:p-12 text-center"
      >
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3.5">
          <CalendarCheck2 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
          Nothing planned yet.
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
          Start with one thing you want to accomplish today.
        </p>
        <div className="flex items-center justify-center gap-2.5 mt-5">
          <button
            id="timeline-empty-plan-my-day-btn"
            onClick={() => openPlanGenerator()}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-indigo-200" />
            <span>Plan My Day</span>
          </button>
          <button
            onClick={() => openTaskModal()}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Quick Task</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Timeline List */}
      <div className="relative pl-6 sm:pl-8 space-y-3 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
        {sortedTasks.map((task) => {
          const isNow = task.id === nowTaskId;

          return (
            <div key={task.id} className="relative">
              {/* Timeline Marker Node */}
              <div
                className={`absolute -left-6 sm:-left-8 top-4 w-2.5 h-2.5 rounded-full border-2 transition-all ${
                  task.completed
                    ? 'bg-indigo-600 border-indigo-600'
                    : isNow
                    ? 'bg-white border-indigo-600 ring-4 ring-indigo-500/20'
                    : 'bg-white border-slate-300'
                }`}
              />

              {/* Information-rich Compact Task Card */}
              <TaskCard task={task} isNow={isNow} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
