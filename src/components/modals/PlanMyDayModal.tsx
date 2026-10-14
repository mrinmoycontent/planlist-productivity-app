import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Clock,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Calendar,
  Trash2,
  Plus,
  Flame,
  Zap,
  Sprout,
  ChevronUp,
  ChevronDown,
  Check,
  Loader2,
  CalendarClock,
  Hourglass,
  Layers,
} from 'lucide-react';
import { usePlan } from '../../context/PlanContext';
import { Task, Priority, EnergyLevel } from '../../types';
import { getTodayString, formatTimeDisplay } from '../../utils/dateUtils';
import {
  PlanBucket,
  PlannedScheduleItem,
  generateDeterministicPlan,
  recalculateTimeline,
  getDefaultStartTime,
  formatDuration,
} from '../../utils/planMyDayAlgorithm';
import { requestAIDailyPlan } from '../../services/aiService';
import { AIDailyPlanResponse, AIScheduleItem } from '../../types';
import { AIPlanReviewView } from './AIPlanReviewView';

export const PlanMyDayModal: React.FC = () => {
  const {
    isPlanGeneratorOpen,
    closePlanGenerator,
    tasks,
    addTask,
    applyDailySchedule,
    setActiveView,
    lists,
    goals,
  } = usePlan();

  const todayStr = useMemo(() => getTodayString(), []);

  // AI Plan State
  const [isAIMode, setIsAIMode] = useState<boolean>(false);
  const [isAILoading, setIsAILoading] = useState<boolean>(false);
  const [aiPlanData, setAiPlanData] = useState<AIDailyPlanResponse | null>(null);
  const [aiPlanError, setAiPlanError] = useState<string | null>(null);
  const [isAICommitting, setIsAICommitting] = useState<boolean>(false);
  const [isAISaved, setIsAISaved] = useState<boolean>(false);

  // Wizard Step: 1 = Tasks (Workload), 2 = Time (Budget), 3 = Plan (Generation), 4 = Review (Timeline), 5 = Start (Commit)
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // STEP 1: Selected Task IDs
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  // Inline Quick Task input in Step 1
  const [newQuickTaskTitle, setNewQuickTaskTitle] = useState('');
  const [newQuickTaskDuration, setNewQuickTaskDuration] = useState<number>(30);
  const [newQuickTaskPriority, setNewQuickTaskPriority] = useState<Priority>('medium');

  // STEP 2: Time Budget (in minutes)
  const [selectedBudgetMinutes, setSelectedBudgetMinutes] = useState<number>(180); // Default 3 hours
  const [customHours, setCustomHours] = useState<number>(2);
  const [customMinutes, setCustomMinutes] = useState<number>(30);
  const [isCustomBudget, setIsCustomBudget] = useState<boolean>(false);

  // STEP 3 & 4: Start Time Anchor & Planned Schedule Items
  const [startTimeAnchor, setStartTimeAnchor] = useState<string>(() => getDefaultStartTime());
  const [plannedItems, setPlannedItems] = useState<PlannedScheduleItem[]>([]);

  // STEP 5: Submitting state
  const [isCommitting, setIsCommitting] = useState<boolean>(false);

  // Candidate Tasks for Step 1:
  // - Overdue incomplete tasks
  // - Today's incomplete tasks
  // - High-priority incomplete tasks
  // - Incomplete tasks already scheduled today
  const candidateTasks = useMemo(() => {
    const incomplete = tasks.filter((t) => !t.completed && t.status !== 'completed');

    const map = new Map<string, Task>();
    incomplete.forEach((t) => {
      const isOverdue = Boolean(t.date && t.date < todayStr);
      const isToday = t.date === todayStr;
      const isHighPriority = t.priority === 'urgent' || t.priority === 'high';
      const isScheduledToday = isToday && Boolean(t.time);

      if (isOverdue || isToday || isHighPriority || isScheduledToday) {
        map.set(t.id, t);
      }
    });

    const list = Array.from(map.values());

    // Sort candidates: overdue first, then today, then urgent/high
    return list.sort((a, b) => {
      const aOverdue = a.date && a.date < todayStr ? 1 : 0;
      const bOverdue = b.date && b.date < todayStr ? 1 : 0;
      if (aOverdue !== bOverdue) return bOverdue - aOverdue;

      const aToday = a.date === todayStr ? 1 : 0;
      const bToday = b.date === todayStr ? 1 : 0;
      if (aToday !== bToday) return bToday - aToday;

      const prioOrder: Record<Priority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
      return prioOrder[b.priority] - prioOrder[a.priority];
    });
  }, [tasks, todayStr]);

  // Other incomplete tasks (not in primary candidates) for user to optionally pull in
  const otherTasks = useMemo(() => {
    const candidateIds = new Set(candidateTasks.map((t) => t.id));
    return tasks.filter(
      (t) => !t.completed && t.status !== 'completed' && !candidateIds.has(t.id)
    );
  }, [tasks, candidateTasks]);

  const [showOtherTasks, setShowOtherTasks] = useState(false);

  // Initialize selected task IDs when modal opens
  useEffect(() => {
    if (isPlanGeneratorOpen) {
      setStep(1);
      // Default to selecting all candidate tasks (today, overdue, high priority)
      const initialIds = new Set<string>();
      candidateTasks.forEach((t) => initialIds.add(t.id));
      setSelectedTaskIds(initialIds);
      setStartTimeAnchor(getDefaultStartTime());
    }
  }, [isPlanGeneratorOpen, candidateTasks]);

  // Selected tasks array
  const selectedTasks = useMemo(() => {
    return tasks.filter((t) => selectedTaskIds.has(t.id));
  }, [tasks, selectedTaskIds]);

  // Total estimated minutes of selected tasks
  const selectedTasksMinutes = useMemo(() => {
    return selectedTasks.reduce((acc, t) => acc + (t.durationMinutes || 30), 0);
  }, [selectedTasks]);

  // Effective time budget
  const effectiveBudgetMinutes = isCustomBudget
    ? customHours * 60 + customMinutes
    : selectedBudgetMinutes;

  // Over capacity calculations for Step 2
  const isOverCapacity = selectedTasksMinutes > effectiveBudgetMinutes;
  const overCapacityMinutes = Math.max(0, selectedTasksMinutes - effectiveBudgetMinutes);

  // Handle toggling task selection
  const handleToggleTask = (taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const next = new Set(selectedTaskIds);
    candidateTasks.forEach((t) => next.add(t.id));
    setSelectedTaskIds(next);
  };

  const handleDeselectAll = () => {
    setSelectedTaskIds(new Set());
  };

  // Add inline quick task in Step 1
  const handleAddInlineQuickTask = () => {
    if (!newQuickTaskTitle.trim()) return;
    const created = addTask({
      title: newQuickTaskTitle.trim(),
      date: todayStr,
      durationMinutes: newQuickTaskDuration,
      priority: newQuickTaskPriority,
      category: 'Work',
    });
    setSelectedTaskIds((prev) => new Set([...prev, created.id]));
    setNewQuickTaskTitle('');
  };

  // Run Plan Generation (called when transitioning from Step 2 to Step 3)
  const handleRunPlanGeneration = () => {
    const result = generateDeterministicPlan(
      selectedTasks,
      effectiveBudgetMinutes,
      startTimeAnchor,
      todayStr
    );
    setPlannedItems(result.items);
    setStep(3);
  };

  // Run AI Plan Generation via Gemini
  const handleRunAIPlan = async () => {
    // Collect candidate tasks (strictly not completed)
    const baseList = selectedTasks.length > 0 ? selectedTasks : candidateTasks;
    const eligibleTasks = baseList.filter((t) => !t.completed && t.status !== 'completed');

    if (eligibleTasks.length === 0) {
      setIsAIMode(true);
      setAiPlanError('No tasks available to plan.');
      setIsAILoading(false);
      return;
    }

    setIsAIMode(true);
    setIsAILoading(true);
    setAiPlanError(null);

    try {
      const tasksToAnalyze = eligibleTasks.map((t) => {
        const list = lists.find((l) => l.id === t.listId);
        const goal = goals.find((g) => g.id === t.goalId);
        return {
          id: t.id,
          title: t.title,
          description: t.description || '',
          priority: t.priority || 'medium',
          durationMinutes: t.durationMinutes || 30,
          date: t.date || todayStr,
          time: t.time || null,
          energyLevel: t.energyLevel || 'medium',
          status: t.status || 'todo',
          listName: list?.name,
          goalTitle: goal?.title,
        };
      });

      const plan = await requestAIDailyPlan({
        tasks: tasksToAnalyze,
        todayStr,
        startTimeAnchor,
        budgetMinutes: effectiveBudgetMinutes,
      });

      // Client-side strict validation (Section 7)
      const validTaskMap = new Map(tasksToAnalyze.map((t) => [t.id, t]));
      const seenTaskIds = new Set<string>();

      const parseMinutes = (tStr?: string) => {
        if (!tStr) return null;
        const match = tStr.trim().match(/^(\d{1,2}):(\d{2})$/);
        if (!match) return null;
        const h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        if (h < 0 || h > 23 || m < 0 || m > 59) return null;
        return h * 60 + m;
      };

      let isValid = Boolean(plan && Array.isArray(plan.schedule));
      let lastEnd = -1;

      if (isValid) {
        for (const item of plan.schedule) {
          const isBreak = Boolean(item.isBreak || !item.taskId);
          if (!isBreak && item.taskId) {
            if (!validTaskMap.has(item.taskId) || seenTaskIds.has(item.taskId)) {
              isValid = false;
              break;
            }
            seenTaskIds.add(item.taskId);
          }

          const s = parseMinutes(item.startTime);
          const e = parseMinutes(item.endTime);
          if (s === null || e === null || e <= s) {
            isValid = false;
            break;
          }
          if (lastEnd !== -1 && s < lastEnd - 1) {
            isValid = false;
            break;
          }
          lastEnd = e;
        }
      }

      if (!isValid) {
        setAiPlanError("AI couldn't create a valid schedule. Please try again.");
        return;
      }

      setAiPlanData(plan);
    } catch (err: any) {
      setAiPlanError(err.message || "AI couldn't create a valid schedule. Please try again.");
    } finally {
      setIsAILoading(false);
    }
  };

  // Commit AI Plan to Supabase and local tasks
  const handleAcceptAIPlan = async () => {
    if (!aiPlanData || !aiPlanData.schedule) return;
    setIsAICommitting(true);
    try {
      // Only schedule tasks that currently exist in tasks state (never invent new tasks)
      const validExistingItems = aiPlanData.schedule.filter(
        (item) => item.taskId && !item.isBreak && tasks.some((t) => t.id === item.taskId)
      );

      const updates = validExistingItems.map((item) => ({
        id: item.taskId!,
        date: todayStr,
        time: item.startTime,
        durationMinutes: item.durationMinutes,
        priority: (item.priority as Priority) || 'medium',
      }));

      // Persist using existing PlanList planning system
      await applyDailySchedule(updates);

      // Show confirmation state
      setIsAISaved(true);
      setTimeout(() => {
        setIsAISaved(false);
        setIsAIMode(false);
        setAiPlanData(null);
        closePlanGenerator();
        setActiveView('planner');
      }, 700);
    } catch (err: any) {
      console.error('Failed to commit AI plan:', err);
      setAiPlanError(err.message || 'Failed to save scheduled tasks to Supabase.');
    } finally {
      setIsAICommitting(false);
    }
  };

  // Planned items breakdown
  const mustDoItems = useMemo(
    () => plannedItems.filter((i) => i.bucket === 'must-do'),
    [plannedItems]
  );
  const quickWinsItems = useMemo(
    () => plannedItems.filter((i) => i.bucket === 'quick-wins'),
    [plannedItems]
  );
  const ifTimeItems = useMemo(
    () => plannedItems.filter((i) => i.bucket === 'if-time-remains'),
    [plannedItems]
  );

  const totalPlannedMinutes = useMemo(() => {
    return mustDoItems.reduce((acc, i) => acc + i.durationMinutes, 0) +
      quickWinsItems.reduce((acc, i) => acc + i.durationMinutes, 0);
  }, [mustDoItems, quickWinsItems]);

  const remainingBudgetMinutes = Math.max(0, effectiveBudgetMinutes - totalPlannedMinutes);
  const planIsOverCapacity = totalPlannedMinutes > effectiveBudgetMinutes;
  const planOverMinutes = Math.max(0, totalPlannedMinutes - effectiveBudgetMinutes);

  // Item modifications in Step 4
  const handleMoveBucket = (taskId: string, targetBucket: PlanBucket) => {
    setPlannedItems((prev) => {
      const updated = prev.map((item) =>
        item.taskId === taskId ? { ...item, bucket: targetBucket } : item
      );
      return recalculateTimeline(updated, startTimeAnchor);
    });
  };

  const handleUpdateItemDuration = (taskId: string, newDuration: number) => {
    setPlannedItems((prev) => {
      const updated = prev.map((item) =>
        item.taskId === taskId ? { ...item, durationMinutes: newDuration } : item
      );
      return recalculateTimeline(updated, startTimeAnchor);
    });
  };

  const handleUpdateItemStartTime = (taskId: string, newStartTime: string) => {
    setPlannedItems((prev) =>
      prev.map((item) =>
        item.taskId === taskId ? { ...item, startTime: newStartTime } : item
      )
    );
  };

  const handleRemoveFromPlan = (taskId: string) => {
    setPlannedItems((prev) => {
      const filtered = prev.filter((item) => item.taskId !== taskId);
      return recalculateTimeline(filtered, startTimeAnchor);
    });
  };

  const handleReorderItem = (taskId: string, direction: 'up' | 'down') => {
    setPlannedItems((prev) => {
      const targetIndex = prev.findIndex((i) => i.taskId === taskId);
      if (targetIndex === -1) return prev;

      const currentItem = prev[targetIndex];
      // Only swap within the same bucket
      const bucketItems = prev.filter((i) => i.bucket === currentItem.bucket);
      const indexInBucket = bucketItems.findIndex((i) => i.taskId === taskId);

      if (direction === 'up' && indexInBucket > 0) {
        const swapItem = bucketItems[indexInBucket - 1];
        const swapIndex = prev.findIndex((i) => i.taskId === swapItem.taskId);
        const nextList = [...prev];
        nextList[targetIndex] = swapItem;
        nextList[swapIndex] = currentItem;
        return recalculateTimeline(nextList, startTimeAnchor);
      }

      if (direction === 'down' && indexInBucket < bucketItems.length - 1) {
        const swapItem = bucketItems[indexInBucket + 1];
        const swapIndex = prev.findIndex((i) => i.taskId === swapItem.taskId);
        const nextList = [...prev];
        nextList[targetIndex] = swapItem;
        nextList[swapIndex] = currentItem;
        return recalculateTimeline(nextList, startTimeAnchor);
      }

      return prev;
    });
  };

  // STEP 5: Start My Day Commit
  const handleStartMyDay = async () => {
    setIsCommitting(true);
    try {
      // 1. Gather all scheduled tasks (Must Do + Quick Wins receive scheduled times; If Time Remains are retained for today without fixed time)
      const scheduleUpdates = plannedItems.map((item) => {
        const isScheduledBucket = item.bucket === 'must-do' || item.bucket === 'quick-wins';
        return {
          id: item.taskId,
          date: todayStr,
          time: isScheduledBucket && item.startTime ? item.startTime : null,
          durationMinutes: item.durationMinutes,
          priority: item.priority,
        };
      });

      // 2. Persist to Supabase and update local state without duplicate tasks
      await applyDailySchedule(scheduleUpdates);

      // 3. Close modal and navigate to Dashboard / Planner
      closePlanGenerator();
      setActiveView('dashboard');
    } catch (err) {
      console.error('Failed to commit daily plan:', err);
    } finally {
      setIsCommitting(false);
    }
  };

  const stepsList = [
    { num: 1, label: 'Workload' },
    { num: 2, label: 'Time' },
    { num: 3, label: 'Plan' },
    { num: 4, label: 'Review' },
    { num: 5, label: 'Start' },
  ];

  if (!isPlanGeneratorOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="plan-my-day-wizard"
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  {isAIMode ? 'AI Plan My Day' : 'Plan My Day'}
                </h2>
                {!isAIMode ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                    Step {step} of 5
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-violet-700 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-violet-600" />
                    Powered by Gemini
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                {isAIMode
                  ? 'Intelligently analyze tasks, priorities, energy levels, and duration to craft a realistic timeline.'
                  : 'Turn your available time and candidate tasks into a realistic daily schedule.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isAIMode && (
              <button
                type="button"
                id="ai-plan-my-day-header-btn"
                onClick={handleRunAIPlan}
                disabled={isAILoading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Generate balanced daily schedule using Gemini AI"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                <span className="hidden sm:inline">✨ AI Plan My Day</span>
                <span className="sm:hidden">✨ AI Plan</span>
              </button>
            )}
            <button
              id="close-plan-my-day-btn"
              onClick={closePlanGenerator}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step Progress Indicator (Hidden in AI Mode) */}
        {!isAIMode && (
          <div className="px-5 sm:px-6 py-2.5 border-b border-slate-100 bg-white flex items-center justify-between overflow-x-auto gap-2">
            {stepsList.map((s) => {
              const isCurrent = step === s.num;
              const isCompleted = step > s.num;
              const isClickable = isCompleted || s.num === step;

              return (
                <button
                  key={s.num}
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && setStep(s.num as any)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isCurrent
                      ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                      : isCompleted
                      ? 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 cursor-pointer'
                      : 'text-slate-400 bg-transparent opacity-60 cursor-default'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                      isCurrent
                        ? 'bg-white text-indigo-700 font-bold'
                        : isCompleted
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isCompleted ? <Check className="w-2.5 h-2.5" /> : s.num}
                  </span>
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {isAIMode ? (
            <AIPlanReviewView
              isLoading={isAILoading}
              error={aiPlanError}
              planData={aiPlanData}
              isCommitting={isAICommitting}
              isSaved={isAISaved}
              allTasks={tasks}
              availableTimeMinutes={effectiveBudgetMinutes}
              onAccept={handleAcceptAIPlan}
              onRegenerate={handleRunAIPlan}
              onCancel={() => {
                setIsAIMode(false);
                setAiPlanError(null);
              }}
            />
          ) : (
            <>
              {/* STEP 1 — Today's Workload */}
              {step === 1 && (
                <div className="space-y-5 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    Step 1 — Today's Workload
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select candidate tasks for today from your overdue, due today, and high-priority items.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold px-2 py-1 rounded hover:bg-indigo-50"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-xs text-slate-500 hover:text-slate-700 font-semibold px-2 py-1 rounded hover:bg-slate-100"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Inline Quick Add Task for Planning */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  placeholder="+ Add a new task directly into today's workload..."
                  value={newQuickTaskTitle}
                  onChange={(e) => setNewQuickTaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddInlineQuickTask();
                    }
                  }}
                  className="w-full sm:flex-1 px-3 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-600"
                />
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <select
                    value={newQuickTaskDuration}
                    onChange={(e) => setNewQuickTaskDuration(Number(e.target.value))}
                    className="px-2 py-1 text-xs bg-white rounded-lg border border-slate-200 font-mono text-slate-700"
                  >
                    <option value={15}>15m</option>
                    <option value={30}>30m</option>
                    <option value={45}>45m</option>
                    <option value={60}>1h</option>
                    <option value={90}>1h 30m</option>
                  </select>
                  <select
                    value={newQuickTaskPriority}
                    onChange={(e) => setNewQuickTaskPriority(e.target.value as Priority)}
                    className="px-2 py-1 text-xs bg-white rounded-lg border border-slate-200 text-slate-700"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddInlineQuickTask}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Candidate Tasks List */}
              {candidateTasks.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                  <CalendarClock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No overdue or today's tasks found</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Add a quick task using the field above or include pending tasks from your general backlog below.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {candidateTasks.map((task) => {
                    const isSelected = selectedTaskIds.has(task.id);
                    const isOverdue = Boolean(task.date && task.date < todayStr);
                    const isToday = task.date === todayStr;

                    return (
                      <div
                        key={task.id}
                        onClick={() => handleToggleTask(task.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-indigo-50/40 border-indigo-200 shadow-2xs'
                            : 'bg-white border-slate-200/80 hover:bg-slate-50/80 opacity-75'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // handled by wrapper click
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-xs sm:text-sm font-semibold truncate ${
                                  isSelected ? 'text-slate-900 font-bold' : 'text-slate-700'
                                }`}
                              >
                                {task.title}
                              </span>

                              {/* Overdue / Due Today Tag */}
                              {isOverdue && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                                  Overdue
                                </span>
                              )}
                              {isToday && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                                  Due Today
                                </span>
                              )}
                            </div>

                            {/* Meta row: Priority, Duration, Energy, Due Date, Scheduled Time */}
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 flex-wrap">
                              {/* Priority badge */}
                              <span
                                className={`px-1.5 py-0.2 rounded font-semibold capitalize ${
                                  task.priority === 'urgent'
                                    ? 'bg-rose-100 text-rose-800'
                                    : task.priority === 'high'
                                    ? 'bg-rose-50 text-rose-700'
                                    : task.priority === 'medium'
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {task.priority}
                              </span>

                              {/* Duration */}
                              <span className="font-mono font-medium text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                                {task.durationMinutes || 30}m
                              </span>

                              {/* Energy Level */}
                              {task.energyLevel && (
                                <span className="text-slate-500 flex items-center gap-0.5">
                                  {task.energyLevel === 'high' ? (
                                    <Flame className="w-3 h-3 text-amber-500" />
                                  ) : task.energyLevel === 'medium' ? (
                                    <Zap className="w-3 h-3 text-indigo-400" />
                                  ) : (
                                    <Sprout className="w-3 h-3 text-emerald-500" />
                                  )}
                                  <span className="capitalize">{task.energyLevel} energy</span>
                                </span>
                              )}

                              {/* Scheduled Time if already set */}
                              {task.time ? (
                                <span className="text-indigo-600 font-medium flex items-center gap-1 font-mono">
                                  <Clock className="w-3 h-3" />
                                  {formatTimeDisplay(task.time)}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">No set time</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Other Backlog Tasks (collapsible) */}
              {otherTasks.length > 0 && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowOtherTasks((prev) => !prev)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showOtherTasks ? 'Hide' : 'Show'} other backlog tasks ({otherTasks.length})</span>
                    {showOtherTasks ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showOtherTasks && (
                    <div className="space-y-1.5 mt-2.5">
                      {otherTasks.map((task) => {
                        const isSelected = selectedTaskIds.has(task.id);
                        return (
                          <div
                            key={task.id}
                            onClick={() => handleToggleTask(task.id)}
                            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-indigo-50/50 border-indigo-200'
                                : 'bg-white border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="w-3.5 h-3.5 rounded text-indigo-600 border-slate-300"
                              />
                              <span className="font-medium text-slate-800 truncate">{task.title}</span>
                            </div>
                            <span className="text-[11px] font-mono text-slate-500 shrink-0">
                              {task.durationMinutes || 30}m
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tally Bar */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/90 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  {selectedTaskIds.size} {selectedTaskIds.size === 1 ? 'task' : 'tasks'} selected for today
                </span>
                <span className="font-extrabold text-indigo-600 font-mono text-sm">
                  {formatDuration(selectedTasksMinutes)} estimated
                </span>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2 — Time Budget */}
          {/* ========================================================================= */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Step 2 — How much time do you have today?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select your available focus time. We will contrast it with your selected workload to prevent overcommitment.
                </p>
              </div>

              {/* Preset Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: '30 minutes', minutes: 30 },
                  { label: '1 hour', minutes: 60 },
                  { label: '2 hours', minutes: 120 },
                  { label: '3 hours', minutes: 180 },
                  { label: '4 hours', minutes: 240 },
                ].map((preset) => {
                  const isSelected = !isCustomBudget && selectedBudgetMinutes === preset.minutes;
                  return (
                    <button
                      key={preset.minutes}
                      type="button"
                      onClick={() => {
                        setIsCustomBudget(false);
                        setSelectedBudgetMinutes(preset.minutes);
                      }}
                      className={`p-4 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20 text-indigo-900 font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold'
                      }`}
                    >
                      <Clock
                        className={`w-5 h-5 mx-auto mb-1.5 ${
                          isSelected ? 'text-indigo-600' : 'text-slate-400'
                        }`}
                      />
                      <span className="text-sm block">{preset.label}</span>
                    </button>
                  );
                })}

                {/* Custom Option */}
                <button
                  type="button"
                  onClick={() => setIsCustomBudget(true)}
                  className={`p-4 rounded-xl border text-center transition-all cursor-pointer ${
                    isCustomBudget
                      ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20 text-indigo-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold'
                  }`}
                >
                  <Hourglass
                    className={`w-5 h-5 mx-auto mb-1.5 ${
                      isCustomBudget ? 'text-indigo-600' : 'text-slate-400'
                    }`}
                  />
                  <span className="text-sm block">Custom</span>
                </button>
              </div>

              {/* Custom Hours & Minutes Input */}
              {isCustomBudget && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-bold text-slate-600">Hours:</label>
                    <input
                      type="number"
                      min={0}
                      max={12}
                      value={customHours}
                      onChange={(e) => setCustomHours(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-sm font-mono text-center"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-bold text-slate-600">Minutes:</label>
                    <input
                      type="number"
                      min={0}
                      max={55}
                      step={5}
                      value={customMinutes}
                      onChange={(e) => setCustomMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-sm font-mono text-center"
                    />
                  </div>
                </div>
              )}

              {/* Comparison & Capacity Gauge */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
                <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Available Time
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-indigo-600 font-mono tracking-tight">
                      {formatDuration(effectiveBudgetMinutes)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Selected Tasks
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
                      {formatDuration(selectedTasksMinutes)}
                    </span>
                  </div>
                </div>

                {/* Over capacity warning vs comfortable fit banner */}
                {isOverCapacity ? (
                  <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-amber-900">
                        You're over capacity by {formatDuration(overCapacityMinutes)}.
                      </h4>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Plan My Day will not silently schedule everything. In the next step, your highest urgency items will be placed in <strong>Must Do</strong>, short wins in <strong>Quick Wins</strong>, and overflowing items in <strong>If Time Remains</strong>.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-emerald-950">
                        Fits comfortably within your available time.
                      </h4>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        You have {formatDuration(effectiveBudgetMinutes - selectedTasksMinutes)} of buffer time.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3 — Plan Generation (Must Do / Quick Wins / If Time Remains) */}
          {/* ========================================================================= */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    Step 3 — Generated Daily Sections
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Categorized using deterministic prioritization (overdue, due today, high priority, and quick wins).
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 self-start sm:self-auto">
                  <span className="text-xs font-bold text-slate-600">Start Time:</span>
                  <input
                    type="time"
                    value={startTimeAnchor}
                    onChange={(e) => {
                      setStartTimeAnchor(e.target.value);
                      setPlannedItems((prev) => recalculateTimeline(prev, e.target.value));
                    }}
                    className="px-2 py-0.5 text-xs bg-white rounded border border-slate-200 font-mono text-slate-900"
                  />
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Planned Time
                  </span>
                  <span className="text-base sm:text-lg font-black text-indigo-600 font-mono">
                    {formatDuration(totalPlannedMinutes)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Budget
                  </span>
                  <span className="text-base sm:text-lg font-black text-slate-800 font-mono">
                    {formatDuration(effectiveBudgetMinutes)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    {planIsOverCapacity ? 'Over By' : 'Remaining'}
                  </span>
                  <span
                    className={`text-base sm:text-lg font-black font-mono ${
                      planIsOverCapacity ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {planIsOverCapacity ? formatDuration(planOverMinutes) : formatDuration(remainingBudgetMinutes)}
                  </span>
                </div>
              </div>

              {/* Section 1: MUST DO */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-rose-100">
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-rose-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-rose-950">
                      MUST DO
                    </span>
                    <span className="text-xs font-semibold text-rose-600 font-mono">
                      ({mustDoItems.length})
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Highest urgency & fits available budget
                  </span>
                </div>

                {mustDoItems.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No tasks in Must Do.</p>
                ) : (
                  <div className="space-y-2">
                    {mustDoItems.map((item) => (
                      <div
                        key={item.taskId}
                        className="p-3 rounded-xl border border-rose-200/90 bg-rose-50/20 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="px-2 py-0.5 rounded bg-white text-rose-700 font-mono text-xs font-bold border border-rose-200 shrink-0">
                            {item.startTime || 'TBD'}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {item.title}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                          {item.durationMinutes}m
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 2: QUICK WINS */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-amber-100">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-amber-950">
                      QUICK WINS
                    </span>
                    <span className="text-xs font-semibold text-amber-600 font-mono">
                      ({quickWinsItems.length})
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Short tasks (≤ 25m) for easy momentum
                  </span>
                </div>

                {quickWinsItems.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No quick wins found.</p>
                ) : (
                  <div className="space-y-2">
                    {quickWinsItems.map((item) => (
                      <div
                        key={item.taskId}
                        className="p-3 rounded-xl border border-amber-200/90 bg-amber-50/20 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="px-2 py-0.5 rounded bg-white text-amber-800 font-mono text-xs font-bold border border-amber-200 shrink-0">
                            {item.startTime || 'TBD'}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {item.title}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                          {item.durationMinutes}m
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 3: IF TIME REMAINS */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-emerald-100">
                  <div className="flex items-center gap-1.5">
                    <Sprout className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-950">
                      IF TIME REMAINS
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 font-mono">
                      ({ifTimeItems.length})
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Bonus tasks exceeding available budget
                  </span>
                </div>

                {ifTimeItems.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No overflow tasks.</p>
                ) : (
                  <div className="space-y-2">
                    {ifTimeItems.map((item) => (
                      <div
                        key={item.taskId}
                        className="p-3 rounded-xl border border-emerald-200/90 bg-emerald-50/20 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="px-2 py-0.5 rounded bg-white text-emerald-700 font-mono text-xs font-medium border border-emerald-200 shrink-0">
                            Bonus
                          </span>
                          <span className="text-xs sm:text-sm font-medium text-slate-800 truncate">
                            {item.title}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                          {item.durationMinutes}m
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4 — Review Plan & Timeline Preview */}
          {/* ========================================================================= */}
          {step === 4 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    Step 4 — Review Timeline
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Fine-tune start times, durations, order, or move tasks between buckets before scheduling.
                  </p>
                </div>

                {/* Capacity summary */}
                <div className="flex items-center gap-3 text-xs bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 mr-1">Planned:</span>
                    <strong className="text-indigo-600 font-mono">{formatDuration(totalPlannedMinutes)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 mr-1">Available:</span>
                    <strong className="text-slate-800 font-mono">{formatDuration(effectiveBudgetMinutes)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 mr-1">{planIsOverCapacity ? 'Over:' : 'Remaining:'}</span>
                    <strong className={`font-mono ${planIsOverCapacity ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {planIsOverCapacity ? formatDuration(planOverMinutes) : formatDuration(remainingBudgetMinutes)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Timeline Items List */}
              <div className="space-y-3">
                {plannedItems.map((item) => {
                  const isMustDo = item.bucket === 'must-do';
                  const isQuickWin = item.bucket === 'quick-wins';
                  const isIfTime = item.bucket === 'if-time-remains';

                  return (
                    <div
                      key={item.taskId}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isMustDo
                          ? 'border-rose-200/90 bg-rose-50/15'
                          : isQuickWin
                          ? 'border-amber-200/90 bg-amber-50/15'
                          : 'border-emerald-200/90 bg-emerald-50/15'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Title and bucket badge */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shrink-0 ${
                              isMustDo
                                ? 'bg-rose-100 text-rose-800'
                                : isQuickWin
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-emerald-100 text-emerald-900'
                            }`}
                          >
                            {isMustDo ? 'Must Do' : isQuickWin ? 'Quick Win' : 'If Time'}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {item.title}
                          </span>
                        </div>

                        {/* Controls: Reorder, Start Time, Duration, Bucket switch, Remove */}
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
                          {/* Reorder up/down */}
                          <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
                            <button
                              type="button"
                              onClick={() => handleReorderItem(item.taskId, 'up')}
                              className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-900"
                              title="Move Up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReorderItem(item.taskId, 'down')}
                              className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-900 border-l border-slate-100"
                              title="Move Down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Start Time Editor */}
                          {!isIfTime && (
                            <input
                              type="time"
                              value={item.startTime}
                              onChange={(e) => handleUpdateItemStartTime(item.taskId, e.target.value)}
                              className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white font-mono text-slate-800 w-24 text-center"
                              title="Planned Start Time"
                            />
                          )}

                          {/* Duration Selector */}
                          <select
                            value={item.durationMinutes}
                            onChange={(e) => handleUpdateItemDuration(item.taskId, Number(e.target.value))}
                            className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white font-mono text-slate-800"
                            title="Duration"
                          >
                            <option value={15}>15m</option>
                            <option value={20}>20m</option>
                            <option value={30}>30m</option>
                            <option value={45}>45m</option>
                            <option value={60}>1h</option>
                            <option value={90}>1h 30m</option>
                            <option value={120}>2h</option>
                          </select>

                          {/* Bucket Switcher */}
                          <select
                            value={item.bucket}
                            onChange={(e) => handleMoveBucket(item.taskId, e.target.value as PlanBucket)}
                            className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 font-medium"
                            title="Change Section"
                          >
                            <option value="must-do">Must Do</option>
                            <option value="quick-wins">Quick Win</option>
                            <option value="if-time-remains">If Time</option>
                          </select>

                          {/* Remove from plan */}
                          <button
                            type="button"
                            onClick={() => handleRemoveFromPlan(item.taskId)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Remove from Today's Plan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 5 — Start My Day Confirmation & Commit */}
          {/* ========================================================================= */}
          {step === 5 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Ready to Start Your Day
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                  Clicking "Start My Day" will save your planned start times to Supabase and immediately update your Today Timeline and Planner.
                </p>
              </div>

              {/* Commit Overview Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Planned Time
                  </span>
                  <span className="text-lg font-black text-slate-900 font-mono">
                    {formatDuration(totalPlannedMinutes)}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-100 text-center">
                  <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                    Must Do
                  </span>
                  <span className="text-lg font-black text-rose-950 font-mono">
                    {mustDoItems.length} tasks
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-100 text-center">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                    Quick Wins
                  </span>
                  <span className="text-lg font-black text-amber-950 font-mono">
                    {quickWinsItems.length} tasks
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-center">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                    If Time Remains
                  </span>
                  <span className="text-lg font-black text-emerald-950 font-mono">
                    {ifTimeItems.length} tasks
                  </span>
                </div>
              </div>

              {/* High-level schedule summary */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Today's Execution Order
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {plannedItems.map((item) => (
                    <div
                      key={item.taskId}
                      className="flex items-center justify-between text-xs py-1 border-b border-slate-50"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono text-slate-500 font-semibold w-12 shrink-0">
                          {item.startTime || 'Bonus'}
                        </span>
                        <span className="font-semibold text-slate-800 truncate">{item.title}</span>
                      </div>
                      <span className="font-mono text-slate-500 shrink-0">
                        {item.durationMinutes}m
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          </>
          )}
        </div>

        {/* Modal Footer Controls (Hidden in AI Mode) */}
        {!isAIMode && (
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                disabled={isCommitting}
                onClick={() => setStep((prev) => (prev - 1) as any)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                id="ai-plan-my-day-footer-step1-btn"
                onClick={handleRunAIPlan}
                disabled={isAILoading}
                className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>✨ AI Plan My Day</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              {step === 1 && (
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={selectedTaskIds.size === 0}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Continue to Time Budget</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {step === 2 && (
                <>
                  <button
                    type="button"
                    id="ai-plan-my-day-footer-step2-btn"
                    onClick={handleRunAIPlan}
                    disabled={isAILoading}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 hover:from-indigo-100 hover:to-violet-100 border border-indigo-200 text-indigo-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>✨ AI Plan My Day</span>
                  </button>
                  <button
                    type="button"
                    id="generate-plan-step2-btn"
                    onClick={handleRunPlanGeneration}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                    <span>Generate Plan</span>
                  </button>
                </>
              )}

              {step === 3 && (
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Review & Customize Timeline</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {step === 4 && (
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Proceed to Start</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {step === 5 && (
                <button
                  type="button"
                  id="start-my-day-final-btn"
                  disabled={isCommitting}
                  onClick={handleStartMyDay}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isCommitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Scheduling in Supabase...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-indigo-200" />
                      <span>Start My Day</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
