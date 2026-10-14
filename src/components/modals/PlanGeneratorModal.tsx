import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Target,
  Calendar,
  Clock,
  Flag,
  ArrowRight,
  Plus,
  Trash2,
  CheckCircle2,
  Play,
  Check,
  RotateCcw,
  Layers,
  ChevronRight,
  Edit3,
  Flame,
} from 'lucide-react';
import { usePlan } from '../../context/PlanContext';
import { GeneratedPlan, PlanDay, PlanFormInput, PlanTaskItem, Priority, TaskCategory } from '../../types';
import {
  getTodayString,
  getTomorrowString,
  getUpcomingFriday,
  getUpcomingMonday,
  formatDisplayDate,
  addDays,
} from '../../utils/dateUtils';

export const PlanGeneratorModal: React.FC = () => {
  const {
    isPlanGeneratorOpen,
    closePlanGenerator,
    planGeneratorInitialGoal,
    createPlan,
    activePlan,
    setActivePlan,
    schedulePlan,
    updatePlan,
    updatePlanTaskItem,
    addPlanTaskItem,
    deletePlanTaskItem,
    addPlanDay,
    deletePlanDay,
    startFocus,
    setActiveView,
  } = usePlan();

  // Wizard view mode: 'form' (Plan) | 'breakdown' (Break Down & Edit) | 'scheduled' (Schedule & Execute)
  const [step, setStep] = useState<'form' | 'breakdown' | 'scheduled'>('form');

  // Form fields
  const [goal, setGoal] = useState('');
  const [targetDate, setTargetDate] = useState(getUpcomingFriday());
  const [availableDays, setAvailableDays] = useState(2);
  const [minutesPerDay, setMinutesPerDay] = useState(60);
  const [priority, setPriority] = useState<Priority>('high');
  const [category, setCategory] = useState<TaskCategory>('Work');
  const [notes, setNotes] = useState('');

  // Editable task state in breakdown
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [newTasksInputs, setNewTasksInputs] = useState<Record<number, { title: string; duration: number }>>({});
  const [schedulingResult, setSchedulingResult] = useState<{ scheduledCount: number; startDate: string } | null>(null);

  // Initialize or reset when modal opens
  useEffect(() => {
    if (isPlanGeneratorOpen) {
      if (planGeneratorInitialGoal) {
        setGoal(planGeneratorInitialGoal);
      }
      // If we already have an active plan and wasn't launched with a new goal, show breakdown
      if (!planGeneratorInitialGoal && activePlan && activePlan.days.length > 0) {
        setStep('breakdown');
      } else {
        setStep('form');
      }
    }
  }, [isPlanGeneratorOpen, planGeneratorInitialGoal]);

  if (!isPlanGeneratorOpen) return null;

  // Preset inspiration prompts
  const PRESET_PLANS = [
    {
      label: '🎯 Job Interview',
      goal: 'Prepare for a job interview',
      days: 2,
      minutes: 60,
      target: getUpcomingFriday(),
      category: 'Work',
      priority: 'high' as Priority,
      notes: 'Focus on company research, job requirements alignment, and STAR method question answers.',
    },
    {
      label: '💻 Launch Project',
      goal: 'Launch MVP feature release',
      days: 3,
      minutes: 60,
      target: addDays(getTodayString(), 3),
      category: 'Projects',
      priority: 'high' as Priority,
      notes: 'Core logic, edge case handling, responsive design review, and demo.',
    },
    {
      label: '📚 Learn Skill',
      goal: 'Master TypeScript design patterns',
      days: 3,
      minutes: 45,
      target: addDays(getTodayString(), 3),
      category: 'Work',
      priority: 'medium' as Priority,
      notes: 'Generics, union types, and real-world project refactoring.',
    },
    {
      label: '✨ Organize Space',
      goal: 'Declutter and organize home office',
      days: 2,
      minutes: 45,
      target: getTomorrowString(),
      category: 'Personal',
      priority: 'low' as Priority,
      notes: 'Physical desk cable management, files purge, ergonomic setup.',
    },
  ];

  const handleApplyPreset = (preset: (typeof PRESET_PLANS)[0]) => {
    setGoal(preset.goal);
    setAvailableDays(preset.days);
    setMinutesPerDay(preset.minutes);
    setTargetDate(preset.target);
    setCategory(preset.category);
    setPriority(preset.priority);
    setNotes(preset.notes);
  };

  const handleGeneratePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) return;

    const input: PlanFormInput = {
      goal: goal.trim(),
      targetDate,
      availableDays: Number(availableDays),
      minutesPerDay: Number(minutesPerDay),
      priority,
      category,
      notes: notes.trim(),
    };

    const newPlan = createPlan(input);
    setActivePlan(newPlan);
    setStep('breakdown');
  };

  const currentPlan = activePlan;

  const handleScheduleClick = () => {
    if (!currentPlan) return;
    const today = getTodayString();
    const result = schedulePlan(currentPlan.id, today);
    setSchedulingResult({
      scheduledCount: result.scheduledTasksCount,
      startDate: today,
    });
    setStep('scheduled');
  };

  const handleExecuteDay1Task = () => {
    if (!currentPlan || currentPlan.days.length === 0) return;
    const firstTask = currentPlan.days[0].tasks[0];
    if (firstTask) {
      startFocus(firstTask.scheduledTaskId, firstTask.title, firstTask.durationMinutes);
      closePlanGenerator();
      setActiveView('focus');
    }
  };

  const handleViewInPlanner = () => {
    closePlanGenerator();
    setActiveView('planner');
  };

  const handleNewTaskSubmit = (dayNumber: number) => {
    const input = newTasksInputs[dayNumber];
    if (!input || !input.title.trim() || !currentPlan) return;
    addPlanTaskItem(currentPlan.id, dayNumber, input.title.trim(), input.duration || 20);
    setNewTasksInputs({
      ...newTasksInputs,
      [dayNumber]: { title: '', duration: 20 },
    });
  };

  // Calculate total minutes across all days in plan
  const totalPlannedMinutes = currentPlan?.days.reduce((acc, d) => {
    return acc + d.tasks.reduce((sum, t) => sum + t.durationMinutes, 0);
  }, 0) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="plan-generator-modal-container"
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Plan Generator</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-indigo-100 text-indigo-800">
                  Workflow
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Turn any goal into a structured, time-blocked daily execution plan
              </p>
            </div>
          </div>

          <button
            id="close-plan-generator-modal-btn"
            onClick={closePlanGenerator}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 5-Step Workflow Bar */}
        <div className="px-6 py-2.5 bg-slate-100/60 border-b border-slate-200/80 flex items-center justify-between overflow-x-auto text-xs font-semibold">
          <div className="flex items-center gap-1 sm:gap-2">
            <span
              className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                step === 'form'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              1. PLAN
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span
              className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                step === 'breakdown'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : currentPlan
                  ? 'bg-white text-slate-700 border border-slate-200'
                  : 'text-slate-400'
              }`}
            >
              2. BREAK DOWN
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span
              className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                step === 'scheduled'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : currentPlan?.isScheduled
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-slate-400'
              }`}
            >
              3. SCHEDULE
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-400 px-2 py-1">4. EXECUTE</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-400 px-2 py-1">5. REVIEW</span>
          </div>

          {currentPlan && step !== 'form' && (
            <button
              onClick={() => setStep('form')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 ml-2"
            >
              <RotateCcw className="w-3 h-3" />
              New Plan
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: FORM */}
          {step === 'form' && (
            <form onSubmit={handleGeneratePlan} className="space-y-5">
              {/* Inspiration Chips */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Quick Inspiration Templates
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRESET_PLANS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className={`p-2.5 rounded-xl border text-left transition-all hover:scale-[1.01] ${
                        goal === preset.goal
                          ? 'border-indigo-500 bg-indigo-50/70 text-indigo-950 ring-1 ring-indigo-500/20'
                          : 'border-slate-200 bg-white hover:border-indigo-300 text-slate-800 shadow-2xs'
                      }`}
                    >
                      <div className="font-semibold text-xs text-slate-900">{preset.label}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {preset.days} days • {preset.minutes}m/day
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Goal Objective */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  What do you want to accomplish? *
                </label>
                <div className="relative">
                  <input
                    id="plan-generator-goal-input"
                    type="text"
                    required
                    autoFocus
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="e.g., Prepare for a job interview"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                  />
                  <Target className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Target Date & Available Days & Time Per Day */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Target Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Target Date *
                  </label>
                  <input
                    id="plan-generator-target-date"
                    type="date"
                    required
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs font-medium rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-indigo-600 shadow-2xs"
                  />
                  <div className="flex gap-1 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setTargetDate(getTomorrowString())}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                    >
                      Tomorrow
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetDate(getUpcomingFriday())}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                    >
                      Friday
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetDate(getUpcomingMonday())}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                    >
                      Monday
                    </button>
                  </div>
                </div>

                {/* Available Days */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Available Days
                  </label>
                  <select
                    id="plan-generator-days-select"
                    value={availableDays}
                    onChange={(e) => setAvailableDays(Number(e.target.value))}
                    className="w-full px-3 py-2.5 text-xs font-medium rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-indigo-600 shadow-2xs"
                  >
                    <option value={1}>1 Day (Sprint)</option>
                    <option value={2}>2 Days (Weekend / Focused)</option>
                    <option value={3}>3 Days (Recommended)</option>
                    <option value={4}>4 Days</option>
                    <option value={5}>5 Days (Weekdays)</option>
                    <option value={7}>7 Days (Full Week)</option>
                  </select>
                  <span className="block text-[10px] text-slate-400 mt-1.5">
                    Structured into Day 1, Day 2...
                  </span>
                </div>

                {/* Time Per Day */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Time Per Day *
                  </label>
                  <select
                    id="plan-generator-time-select"
                    value={minutesPerDay}
                    onChange={(e) => setMinutesPerDay(Number(e.target.value))}
                    className="w-full px-3 py-2.5 text-xs font-medium rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-indigo-600 shadow-2xs"
                  >
                    <option value={30}>30 min per day</option>
                    <option value={45}>45 min per day</option>
                    <option value={60}>1 hour per day</option>
                    <option value={90}>1.5 hours per day</option>
                    <option value={120}>2 hours per day</option>
                  </select>
                  <span className="block text-[10px] text-slate-400 mt-1.5">
                    Action items broken into ~15–30m chunks
                  </span>
                </div>
              </div>

              {/* Priority & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Priority
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['high', 'medium', 'low'] as Priority[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`py-2 px-3 text-xs font-semibold rounded-xl border capitalize transition-all ${
                          priority === p
                            ? p === 'high'
                              ? 'bg-rose-50 border-rose-400 text-rose-800 ring-1 ring-rose-300'
                              : p === 'medium'
                              ? 'bg-amber-50 border-amber-400 text-amber-800 ring-1 ring-amber-300'
                              : 'bg-emerald-50 border-emerald-400 text-emerald-800 ring-1 ring-emerald-300'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs font-medium rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-indigo-600 shadow-2xs"
                  >
                    <option value="Work">Work</option>
                    <option value="Personal">Personal</option>
                    <option value="Projects">Projects</option>
                    <option value="Health">Health</option>
                    <option value="Finance">Finance</option>
                    <option value="Study">Study</option>
                  </select>
                </div>
              </div>

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Optional Notes or Context
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Focus on STAR framework for leadership questions, review system architecture notes..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 resize-none shadow-2xs"
                />
              </div>

              {/* Submit Action */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closePlanGenerator}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="generate-plan-submit-btn"
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer group"
                >
                  <Sparkles className="w-4 h-4 transition-transform group-hover:scale-110" />
                  <span>Generate Structured Plan</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: BREAK DOWN & EDITABLE PLAN */}
          {step === 'breakdown' && currentPlan && (
            <div className="space-y-6">
              {/* Plan Summary Header */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-200/80 text-indigo-900">
                      {currentPlan.category}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        currentPlan.priority === 'high'
                          ? 'bg-rose-100 text-rose-800'
                          : currentPlan.priority === 'medium'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {currentPlan.priority} Priority
                    </span>
                    <span className="text-xs text-indigo-700 font-medium">
                      Target: {formatDisplayDate(currentPlan.targetDate)}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 mt-1">
                    {currentPlan.goal}
                  </h3>
                  {currentPlan.notes && (
                    <p className="text-xs text-slate-600 mt-0.5 italic">{currentPlan.notes}</p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-900">
                      {currentPlan.days.length} Days Breakdown
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      ~{totalPlannedMinutes} min total execution
                    </div>
                  </div>
                </div>
              </div>

              {/* Editable Days Breakdown */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <span>Actionable Daily Tasks</span>
                    <span className="text-slate-400 font-normal">
                      (Click any item to edit, adjust durations, or add tasks)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => addPlanDay(currentPlan.id)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Day</span>
                  </button>
                </div>

                {currentPlan.days.map((day) => {
                  const dayMinutes = day.tasks.reduce((sum, t) => sum + t.durationMinutes, 0);
                  const isDayOverAllocated = dayMinutes > day.targetMinutes;

                  return (
                    <div
                      key={day.dayNumber}
                      className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs transition-all"
                    >
                      {/* Day Header */}
                      <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                            {day.dayNumber}
                          </span>
                          <div>
                            <span className="font-bold text-xs text-slate-900">{day.label}</span>
                            {day.date && (
                              <span className="text-[11px] text-slate-500 ml-2">
                                ({formatDisplayDate(day.date)})
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              isDayOverAllocated
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-200/70 text-slate-700'
                            }`}
                          >
                            {dayMinutes} / {day.targetMinutes} min
                          </span>
                          {currentPlan.days.length > 1 && (
                            <button
                              type="button"
                              onClick={() => deletePlanDay(currentPlan.id, day.dayNumber)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                              title="Delete this day"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Day Tasks List */}
                      <div className="p-3 divide-y divide-slate-100 space-y-2">
                        {day.tasks.map((task, taskIdx) => (
                          <div
                            key={task.id}
                            className="pt-2 first:pt-0 flex items-center justify-between gap-3 group"
                          >
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <span className="text-slate-400 text-xs font-mono select-none">
                                •
                              </span>

                              {editingTaskId === task.id ? (
                                <input
                                  type="text"
                                  autoFocus
                                  defaultValue={task.title}
                                  onBlur={(e) => {
                                    if (e.target.value.trim()) {
                                      updatePlanTaskItem(currentPlan.id, day.dayNumber, task.id, {
                                        title: e.target.value.trim(),
                                      });
                                    }
                                    setEditingTaskId(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      if (e.currentTarget.value.trim()) {
                                        updatePlanTaskItem(currentPlan.id, day.dayNumber, task.id, {
                                          title: e.currentTarget.value.trim(),
                                        });
                                      }
                                      setEditingTaskId(null);
                                    }
                                  }}
                                  className="flex-1 px-2 py-1 text-xs rounded-lg border border-indigo-400 bg-indigo-50/30 text-slate-900 focus:outline-none"
                                />
                              ) : (
                                <div
                                  onClick={() => setEditingTaskId(task.id)}
                                  className="flex-1 text-xs font-semibold text-slate-800 cursor-pointer hover:text-indigo-600 flex items-center gap-1.5"
                                  title="Click to edit task title"
                                >
                                  <span>{task.title}</span>
                                  <Edit3 className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              )}
                            </div>

                            {/* Duration pills & Delete action */}
                            <div className="flex items-center gap-2 shrink-0">
                              {/* Duration Selector */}
                              <div className="flex items-center gap-1">
                                {[15, 20, 25, 30, 45].map((mins) => (
                                  <button
                                    key={mins}
                                    type="button"
                                    onClick={() =>
                                      updatePlanTaskItem(currentPlan.id, day.dayNumber, task.id, {
                                        durationMinutes: mins,
                                      })
                                    }
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                                      task.durationMinutes === mins
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                    }`}
                                  >
                                    {mins}m
                                  </button>
                                ))}
                              </div>

                              <button
                                type="button"
                                onClick={() => deletePlanTaskItem(currentPlan.id, day.dayNumber, task.id)}
                                className="text-slate-300 hover:text-rose-600 p-1 rounded transition-colors"
                                title="Remove task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Add Task Input Row for this Day */}
                        <div className="pt-2 flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="+ Add custom action task..."
                            value={newTasksInputs[day.dayNumber]?.title || ''}
                            onChange={(e) =>
                              setNewTasksInputs({
                                ...newTasksInputs,
                                [day.dayNumber]: {
                                  title: e.target.value,
                                  duration: newTasksInputs[day.dayNumber]?.duration || 20,
                                },
                              })
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleNewTaskSubmit(day.dayNumber);
                              }
                            }}
                            className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600"
                          />

                          <select
                            value={newTasksInputs[day.dayNumber]?.duration || 20}
                            onChange={(e) =>
                              setNewTasksInputs({
                                ...newTasksInputs,
                                [day.dayNumber]: {
                                  title: newTasksInputs[day.dayNumber]?.title || '',
                                  duration: Number(e.target.value),
                                },
                              })
                            }
                            className="px-2 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none"
                          >
                            <option value={15}>15 min</option>
                            <option value={20}>20 min</option>
                            <option value={25}>25 min</option>
                            <option value={30}>30 min</option>
                            <option value={45}>45 min</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleNewTaskSubmit(day.dayNumber)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 transition-colors"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Actions: Re-plan or Schedule */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  ← Edit Plan Parameters
                </button>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={closePlanGenerator}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Keep as Draft
                  </button>

                  <button
                    id="schedule-plan-submit-btn"
                    type="button"
                    onClick={handleScheduleClick}
                    className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Schedule Plan to Planner & Calendar</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SCHEDULED & READY TO EXECUTE */}
          {step === 'scheduled' && currentPlan && (
            <div className="py-6 text-center space-y-6 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                  Plan Successfully Scheduled
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                  "{currentPlan.goal}"
                </h3>
                <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
                  All action items have been mapped to your Planner and Calendar starting{' '}
                  <span className="font-semibold text-slate-700">
                    {formatDisplayDate(schedulingResult?.startDate || getTodayString())}
                  </span>
                  . A tracking goal was also established.
                </p>
              </div>

              {/* Day 1 Next Action Spotlight */}
              {currentPlan.days[0]?.tasks[0] && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Recommended First Execution</span>
                    <span className="font-semibold text-indigo-600">
                      {currentPlan.days[0].tasks[0].durationMinutes} min focus
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-bold text-slate-900">
                        {currentPlan.days[0].tasks[0].title}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs font-semibold">
                      Day 1
                    </span>
                  </div>
                </div>
              )}

              {/* Next Step Execution Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  id="execute-day1-focus-btn"
                  type="button"
                  onClick={handleExecuteDay1Task}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Start Day 1 Focus Session</span>
                </button>

                <button
                  id="view-in-planner-btn"
                  type="button"
                  onClick={handleViewInPlanner}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span>View in My Planner</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
