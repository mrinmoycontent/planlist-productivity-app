import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Timer,
  Sparkles,
  ChevronDown,
  Check,
  Flame,
  Award,
} from 'lucide-react';
import { usePlan } from '../../context/PlanContext';
import { getTodayString } from '../../utils/dateUtils';

export const FocusView: React.FC = () => {
  const {
    tasks,
    focusState,
    startFocus,
    pauseFocus,
    resumeFocus,
    resetFocus,
    markFocusTaskComplete,
    setFocusDuration,
  } = usePlan();

  const [isTaskDropdownOpen, setIsTaskDropdownOpen] = useState(false);
  const [customTopicInput, setCustomTopicInput] = useState(focusState.customTopic);

  const todayStr = getTodayString();
  const pendingTasks = tasks.filter((t) => !t.completed);
  const currentTask = tasks.find((t) => t.id === focusState.currentTaskId);

  // Time calculations
  const minutes = Math.floor(focusState.remainingSeconds / 60);
  const seconds = focusState.remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const totalSecs = focusState.durationMinutes * 60;
  const progressFraction = totalSecs > 0 ? (totalSecs - focusState.remainingSeconds) / totalSecs : 0;
  const strokeDashoffset = 100 - progressFraction * 100;

  const handleSelectTask = (taskId: string, title: string) => {
    startFocus(taskId, title);
    setIsTaskDropdownOpen(false);
  };

  const handleCustomTopicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTopicInput.trim()) return;
    startFocus(undefined, customTopicInput.trim());
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Focus Session Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center relative overflow-hidden">
        {/* Top Header / Mode Selector */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <Timer className="w-4 h-4 text-indigo-600" />
            <span>Focus Mode</span>
          </div>

          {/* Preset Buttons: 25m, 15m, 50m */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/80">
            {[
              { label: '25 min', min: 25 },
              { label: '15 min', min: 15 },
              { label: '50 min', min: 50 },
            ].map((preset) => (
              <button
                key={preset.min}
                onClick={() => setFocusDuration(preset.min)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  focusState.durationMinutes === preset.min
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Current Task Selector Card */}
        <div className="max-w-md mx-auto mb-8 relative">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Current Task
          </label>
          <button
            id="focus-task-selector-btn"
            type="button"
            onClick={() => setIsTaskDropdownOpen(!isTaskDropdownOpen)}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between text-left transition-all"
          >
            <div className="truncate pr-2">
              <span className="text-sm font-bold text-slate-900 block truncate">
                {currentTask ? currentTask.title : focusState.customTopic || 'Select a task to focus on'}
              </span>
              <span className="text-[11px] text-slate-500">
                {currentTask ? `Priority: ${currentTask.priority} • ${currentTask.category}` : 'Tap to choose from pending list'}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* Task Dropdown Menu */}
          {isTaskDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 z-30 bg-white rounded-2xl border border-slate-200 shadow-xl max-h-60 overflow-y-auto p-2 text-left animate-in fade-in duration-150">
              <div className="px-2 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Pending Tasks ({pendingTasks.length})
              </div>
              {pendingTasks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTask(t.id, t.title)}
                  className="w-full p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between text-left transition-colors text-xs font-semibold text-slate-800"
                >
                  <span className="truncate pr-2">{t.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    {t.priority}
                  </span>
                </button>
              ))}
              {pendingTasks.length === 0 && (
                <p className="text-xs text-slate-400 italic p-3 text-center">
                  No pending tasks found.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Large Circular / Countdown Timer */}
        <div className="my-8 flex flex-col items-center justify-center">
          <div className="relative w-64 h-64 flex items-center justify-center">
            {/* SVG circle gauge */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="128"
                cy="128"
                r="110"
                stroke="currentColor"
                strokeWidth="10"
                className="text-slate-100"
                fill="transparent"
              />
              <circle
                cx="128"
                cy="128"
                r="110"
                stroke="currentColor"
                strokeWidth="10"
                strokeDasharray="691"
                strokeDashoffset={691 * (1 - progressFraction)}
                strokeLinecap="round"
                className="text-indigo-600 transition-all duration-1000"
                fill="transparent"
              />
            </svg>

            {/* Central Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-extrabold text-slate-900 tracking-tight font-mono">
                {formattedTime}
              </span>
              <span className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-wider">
                {focusState.isRunning ? 'Active Focus' : 'Ready'}
              </span>
            </div>
          </div>
        </div>

        {/* Primary Controls */}
        <div className="flex items-center justify-center gap-3.5 mt-6">
          {/* Pause / Resume / Start Button */}
          {focusState.isRunning ? (
            <button
              id="focus-pause-btn"
              onClick={pauseFocus}
              className="px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm flex items-center gap-2 shadow-sm transition-all"
            >
              <Pause className="w-4 h-4 fill-white" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              id="focus-start-btn"
              onClick={resumeFocus}
              className="px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center gap-2 shadow-sm hover:shadow transition-all"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{focusState.remainingSeconds < totalSecs ? 'Resume' : 'Start Focus Session'}</span>
            </button>
          )}

          {/* Reset Button */}
          <button
            id="focus-reset-btn"
            onClick={resetFocus}
            className="p-3.5 rounded-2xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            title="Reset timer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Mark Task Complete Button */}
        {currentTask && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <button
              id="focus-mark-complete-btn"
              onClick={markFocusTaskComplete}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 mx-auto transition-all ${
                currentTask.completed
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                {currentTask.completed ? 'Task Completed!' : 'Mark Task Complete'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Focus Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-extrabold text-slate-900">
              {focusState.sessionsCompletedToday}
            </span>
            <span className="block text-xs font-semibold text-slate-500">
              Sessions Completed Today
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-extrabold text-slate-900">
              {focusState.totalMinutesToday} min
            </span>
            <span className="block text-xs font-semibold text-slate-500">
              Total Deep Work Minutes
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
