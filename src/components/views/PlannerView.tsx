import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  CalendarCheck2,
  Filter,
  Sparkles,
} from 'lucide-react';
import { usePlan } from '../../context/PlanContext';
import { PlannerFilter, Priority } from '../../types';
import { getTodayString, getTomorrowString, getWeekRange } from '../../utils/dateUtils';
import { TaskCard } from '../TaskCard';

export const PlannerView: React.FC = () => {
  const {
    tasks,
    openTaskModal,
    openPlanGenerator,
    searchQuery,
  } = usePlan();

  const [filter, setFilter] = useState<PlannerFilter>('today');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const todayStr = getTodayString();
  const tomorrowStr = getTomorrowString();
  const weekInfo = getWeekRange();

  // Filter tasks according to selected tab
  const filteredTasks = tasks.filter((task) => {
    // Search query filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!task.title.toLowerCase().includes(q) && !task.category.toLowerCase().includes(q)) {
        return false;
      }
    }

    // Priority subfilter
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
      return false;
    }

    // Main Planner Filter: Today, Tomorrow, This Week
    if (filter === 'today') {
      return task.date === todayStr;
    } else if (filter === 'tomorrow') {
      return task.date === tomorrowStr;
    } else if (filter === 'week') {
      return weekInfo.dates.includes(task.date);
    }
    return true;
  });

  // Sort by time or priority
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const aDone = a.status === 'completed' || a.completed;
    const bDone = b.status === 'completed' || b.completed;
    if (aDone !== bDone) return aDone ? 1 : -1;
    if (a.time && b.time) return a.time.localeCompare(b.time);
    if (a.time) return -1;
    if (b.time) return 1;
    return a.date.localeCompare(b.date);
  });

  const getTargetDateForNewTask = () => {
    if (filter === 'today') return todayStr;
    if (filter === 'tomorrow') return tomorrowStr;
    return todayStr;
  };

  const completedCount = sortedTasks.filter((t) => t.status === 'completed' || t.completed).length;
  const totalCount = sortedTasks.length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Planner Header & Filters */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Tab Selector: Today, Tomorrow, This Week */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/80">
            <button
              id="planner-tab-today"
              onClick={() => setFilter('today')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === 'today'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              id="planner-tab-tomorrow"
              onClick={() => setFilter('tomorrow')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === 'tomorrow'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tomorrow
            </button>
            <button
              id="planner-tab-week"
              onClick={() => setFilter('week')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === 'week'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Week
            </button>
          </div>

          {/* Actions & Subfilter */}
          <div className="flex items-center gap-2.5">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-indigo-600"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>

            <button
              onClick={() => openPlanGenerator()}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Plan My Day</span>
            </button>

            <button
              id="planner-add-task-btn"
              onClick={() => openTaskModal({ date: getTargetDateForNewTask() })}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Quick Task</span>
            </button>
          </div>
        </div>

        {/* Progress summary for selected timeframe */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">
              {filter === 'today'
                ? "Today's Agenda"
                : filter === 'tomorrow'
                ? "Tomorrow's Schedule"
                : "Week's Schedule"}
            </span>
            <span className="text-slate-300">•</span>
            <span>{totalCount} tasks scheduled</span>
          </div>

          <div className="flex items-center gap-2">
            <span>
              {completedCount} of {totalCount} completed
            </span>
            {totalCount > 0 && (
              <span className="font-bold text-indigo-600 font-mono">
                ({Math.round((completedCount / totalCount) * 100)}%)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Task List container */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            {filter === 'today'
              ? 'Tasks for Today'
              : filter === 'tomorrow'
              ? 'Tasks for Tomorrow'
              : 'Tasks for This Week'}
          </h2>
          <span className="text-xs text-slate-400">
            One-tap completion • Break Down • Reschedule
          </span>
        </div>

        {sortedTasks.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-3">
              <CalendarCheck2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Nothing planned yet.
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Start with one thing you want to accomplish {filter === 'today' ? 'today' : filter === 'tomorrow' ? 'tomorrow' : 'this week'}.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => openPlanGenerator()}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs hover:bg-indigo-700 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Plan My Day</span>
              </button>
              <button
                onClick={() => openTaskModal({ date: getTargetDateForNewTask() })}
                className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-all cursor-pointer"
              >
                + Quick Task
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 sm:p-4 space-y-2.5">
            {sortedTasks.map((task) => (
              <TaskCard key={task.id} task={task} showDate={filter === 'week'} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
