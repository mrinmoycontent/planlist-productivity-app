import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Clock,
  Calendar,
  Flag,
  Zap,
  CheckCircle2,
  Circle,
  Play,
  Copy,
  Trash2,
  CalendarDays,
  MoreVertical,
  Plus,
  ArrowRight,
  ListFilter,
  Target,
  Sparkles,
  AlertCircle,
  Check,
  Edit2,
  History,
  Timer,
  ChevronDown,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { usePlan } from '../../context/PlanContext';
import { Priority, TaskStatus, EnergyLevel, Task, AISubtaskSuggestion } from '../../types';
import { getTodayString, addDays, formatDisplayDate, formatTimeDisplay } from '../../utils/dateUtils';
import { requestAITaskBreakdown } from '../../services/aiService';

export const TaskDetailsModal: React.FC = () => {
  const {
    selectedTask,
    closeTaskDetails,
    updateTask,
    deleteTask,
    duplicateTask,
    addTask,
    lists,
    goals,
    startFocus,
    setActiveView,
    tasks,
  } = usePlan();

  // Local state synced with selectedTask
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskText, setEditingSubtaskText] = useState('');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [showReschedulePicker, setShowReschedulePicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCopiedToast, setIsCopiedToast] = useState(false);

  const subtaskInputRef = useRef<HTMLInputElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Sync state whenever selectedTask changes
  useEffect(() => {
    if (selectedTask) {
      setTitle(selectedTask.title || '');
      setDescription(selectedTask.description || '');
      setNotes(selectedTask.notes || '');
      setShowDeleteConfirm(false);
      setIsMoreMenuOpen(false);
      setShowReschedulePicker(false);
      setEditingSubtaskId(null);
    }
  }, [selectedTask?.id]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else if (showReschedulePicker) {
          setShowReschedulePicker(false);
        } else {
          closeTaskDetails();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeTaskDetails, showDeleteConfirm, showReschedulePicker]);

  // Derived subtasks for this task
  const subtasks = useMemo(() => {
    if (!selectedTask) return [];
    return tasks.filter((t) => t.parentTaskId === selectedTask.id);
  }, [tasks, selectedTask?.id]);

  const completedSubtasksCount = useMemo(() => {
    return subtasks.filter((st) => st.completed).length;
  }, [subtasks]);

  const subtasksProgressPercent = useMemo(() => {
    if (subtasks.length === 0) return 0;
    return Math.round((completedSubtasksCount / subtasks.length) * 100);
  }, [subtasks.length, completedSubtasksCount]);

  // AI Task Breakdown State
  const [isAIBreakingDown, setIsAIBreakingDown] = useState(false);
  const [aiBreakdownLoading, setAiBreakdownLoading] = useState(false);
  const [aiBreakdownError, setAiBreakdownError] = useState<string | null>(null);
  const [aiSubtasksReview, setAiSubtasksReview] = useState<
    Array<AISubtaskSuggestion & { selected: boolean }>
  >([]);

  if (!selectedTask) return null;

  const today = getTodayString();
  const isOverdue = !selectedTask.completed && selectedTask.date < today;
  const isCompleted = selectedTask.completed || selectedTask.status === 'completed';

  // Title Auto-save
  const handleTitleBlur = () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== selectedTask.title) {
      updateTask(selectedTask.id, { title: trimmed });
    } else if (!trimmed) {
      setTitle(selectedTask.title); // revert if empty
    }
  };

  // Description Auto-save
  const handleDescriptionBlur = () => {
    const trimmed = description.trim();
    if (trimmed !== (selectedTask.description || '')) {
      updateTask(selectedTask.id, { description: trimmed });
    }
  };

  // Notes Auto-save
  const handleNotesBlur = () => {
    const trimmed = notes.trim();
    if (trimmed !== (selectedTask.notes || '')) {
      updateTask(selectedTask.id, { notes: trimmed });
    }
  };

  // Status Change
  const handleStatusChange = (newStatus: TaskStatus) => {
    const isDone = newStatus === 'completed';
    updateTask(selectedTask.id, {
      status: newStatus,
      completed: isDone,
      completedAt: isDone ? new Date().toISOString() : undefined,
    });
  };

  // Priority Change
  const handlePriorityChange = (priority: Priority) => {
    updateTask(selectedTask.id, { priority });
  };

  // Energy Level Change
  const handleEnergyLevelChange = (energyLevel: EnergyLevel) => {
    updateTask(selectedTask.id, { energyLevel });
  };

  // Reschedule Handlers
  const handleReschedule = (newDate: string) => {
    updateTask(selectedTask.id, { date: newDate });
    setShowReschedulePicker(false);
  };

  // Subtask Handlers
  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSubtaskTitle.trim();
    if (!trimmed) return;

    addTask({
      title: trimmed,
      date: selectedTask.date,
      time: selectedTask.time,
      priority: selectedTask.priority,
      energyLevel: selectedTask.energyLevel,
      category: selectedTask.category,
      listId: selectedTask.listId,
      goalId: selectedTask.goalId,
      parentTaskId: selectedTask.id,
      status: 'todo',
    });

    setNewSubtaskTitle('');
    setTimeout(() => {
      subtaskInputRef.current?.focus();
    }, 50);
  };

  const handleToggleSubtask = (subtask: Task) => {
    const nextCompleted = !subtask.completed;
    updateTask(subtask.id, {
      completed: nextCompleted,
      status: nextCompleted ? 'completed' : 'todo',
      completedAt: nextCompleted ? new Date().toISOString() : undefined,
    });
  };

  const handleSaveSubtaskTitle = (subtaskId: string) => {
    const trimmed = editingSubtaskText.trim();
    if (trimmed) {
      updateTask(subtaskId, { title: trimmed });
    }
    setEditingSubtaskId(null);
    setEditingSubtaskText('');
  };

  const handleAIBreakDownTask = async () => {
    if (!selectedTask) return;
    setIsAIBreakingDown(true);
    setAiBreakdownLoading(true);
    setAiBreakdownError(null);

    try {
      const result = await requestAITaskBreakdown({
        id: selectedTask.id,
        title: selectedTask.title,
        description: selectedTask.description,
        priority: selectedTask.priority,
        energyLevel: selectedTask.energyLevel,
        category: selectedTask.category,
        durationMinutes: selectedTask.durationMinutes,
      });

      if (!result.subtasks || result.subtasks.length === 0) {
        setAiBreakdownError('No subtasks were generated. Try adding more detail to the title or description.');
        setAiSubtasksReview([]);
      } else {
        setAiSubtasksReview(
          result.subtasks.map((st) => ({
            ...st,
            selected: true,
          }))
        );
      }
    } catch (err: any) {
      setAiBreakdownError(err.message || 'Failed to generate subtasks with AI.');
    } finally {
      setAiBreakdownLoading(false);
    }
  };

  const handleToggleReviewSubtask = (index: number) => {
    setAiSubtasksReview((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleAddApprovedSubtasks = () => {
    if (!selectedTask) return;
    const selectedItems = aiSubtasksReview.filter((item) => item.selected);
    if (selectedItems.length === 0) return;

    selectedItems.forEach((item) => {
      addTask({
        title: item.title,
        description: item.description,
        durationMinutes: item.durationMinutes || 20,
        priority: item.priority || selectedTask.priority,
        parentTaskId: selectedTask.id,
        date: selectedTask.date,
        energyLevel: selectedTask.energyLevel,
        category: selectedTask.category,
        listId: selectedTask.listId,
        goalId: selectedTask.goalId,
        status: 'todo',
      });
    });

    setIsAIBreakingDown(false);
    setAiSubtasksReview([]);
  };

  const handleCancelAIBreakdown = () => {
    setIsAIBreakingDown(false);
    setAiBreakdownLoading(false);
    setAiBreakdownError(null);
    setAiSubtasksReview([]);
  };

  const handleSmartBreakdown = () => {
    handleAIBreakDownTask();
  };

  // Focus Start
  const handleStartFocus = () => {
    const duration = selectedTask.durationMinutes || 25;
    startFocus(selectedTask.id, selectedTask.title, duration);
    setActiveView('focus');
    closeTaskDetails();
  };

  // Duplicate Task
  const handleDuplicate = () => {
    const dup = duplicateTask(selectedTask.id);
    setIsCopiedToast(true);
    setTimeout(() => setIsCopiedToast(false), 2000);
  };

  // Delete Task
  const handleDelete = () => {
    deleteTask(selectedTask.id);
    closeTaskDetails();
  };

  // Priority color config
  const getPriorityStyle = (p: Priority) => {
    switch (p) {
      case 'urgent':
        return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
      case 'high':
        return 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100';
      case 'low':
        return 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div
      id="task-details-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 lg:p-6 overflow-y-auto animate-in fade-in duration-150"
    >
      {/* Modal Container: Fullscreen on mobile, wide centered modal on desktop */}
      <div
        id="task-details-workspace"
        className="bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-4xl sm:rounded-2xl border-0 sm:border border-slate-200/90 shadow-2xl flex flex-col overflow-hidden text-slate-900"
      >
        {/* ================================================================= */}
        {/* 1. HEADER                                                        */}
        {/* ================================================================= */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Status Indicator & Quick Switcher */}
            <div className="relative inline-flex items-center">
              <button
                id="task-details-status-pill"
                onClick={() =>
                  handleStatusChange(
                    selectedTask.status === 'completed'
                      ? 'todo'
                      : selectedTask.status === 'in_progress'
                      ? 'completed'
                      : 'in_progress'
                  )
                }
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                  selectedTask.status === 'completed'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : selectedTask.status === 'in_progress'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
                title="Click to advance status: To Do → In Progress → Completed"
              >
                {selectedTask.status === 'completed' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : selectedTask.status === 'in_progress' ? (
                  <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span className="capitalize">
                  {selectedTask.status === 'in_progress'
                    ? 'In Progress'
                    : selectedTask.status || 'To Do'}
                </span>
              </button>
            </div>

            {/* Priority Indicator */}
            <span
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border ${getPriorityStyle(
                selectedTask.priority
              )}`}
            >
              {selectedTask.priority}
            </span>

            {/* Energy Level Badge */}
            {selectedTask.energyLevel && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200">
                <Zap className="w-3 h-3 text-amber-500" />
                <span className="capitalize">{selectedTask.energyLevel} Energy</span>
              </span>
            )}

            {/* Overdue Warning Pill */}
            {isOverdue && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200">
                <AlertCircle className="w-3 h-3 text-rose-600" />
                Overdue
              </span>
            )}
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1">
            {/* Start Focus Button in Header */}
            <button
              id="task-details-header-start-focus"
              onClick={handleStartFocus}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Start a deep focus Pomodoro session on this task"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Start Focus</span>
            </button>

            {/* More Menu Dropdown */}
            <div className="relative" ref={moreMenuRef}>
              <button
                id="task-details-more-menu-button"
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
                title="More Actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isMoreMenuOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-20 animate-in fade-in zoom-in-95">
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setShowReschedulePicker(true);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Reschedule...</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      handleDuplicate();
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Duplicate Task</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      handleSmartBreakdown();
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-indigo-700 hover:bg-indigo-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Break into Steps</span>
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setShowDeleteConfirm(true);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete Task</span>
                  </button>
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              id="task-details-close-button"
              onClick={closeTaskDetails}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2. OVERDUE & STATUS ALERTS (Conditional)                         */}
        {/* ================================================================= */}
        {isOverdue && (
          <div className="bg-rose-50/90 border-b border-rose-200/80 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 text-xs text-rose-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>Overdue:</strong> This task was scheduled for {formatDisplayDate(selectedTask.date)}.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleReschedule(today)}
                className="px-2.5 py-1 rounded-md bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors cursor-pointer"
              >
                Reschedule to Today
              </button>
            </div>
          </div>
        )}

        {isCompleted && (
          <div className="bg-emerald-50/80 border-b border-emerald-200/80 px-4 sm:px-6 py-2 flex items-center justify-between gap-3 text-xs text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Task completed {selectedTask.completedAt ? `on ${new Date(selectedTask.completedAt).toLocaleDateString()}` : ''}.
              </span>
            </div>
            <button
              onClick={() => handleStatusChange('todo')}
              className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
            >
              Mark Incomplete
            </button>
          </div>
        )}

        {/* Copied notification toast */}
        {isCopiedToast && (
          <div className="bg-indigo-600 text-white text-xs font-semibold py-1.5 px-4 text-center animate-in fade-in">
            Task duplicated successfully with all details!
          </div>
        )}

        {/* Delete Confirmation Warning */}
        {showDeleteConfirm && (
          <div className="bg-rose-50 border-b border-rose-200 p-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
            <div>
              <h4 className="text-xs font-bold text-rose-900">Delete this task?</h4>
              <p className="text-xs text-rose-700 mt-0.5">
                Are you sure you want to delete "{selectedTask.title}"? {subtasks.length > 0 ? `This will also delete its ${subtasks.length} subtask(s).` : ''} This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-xs font-bold text-white hover:bg-rose-700 shadow-xs cursor-pointer"
              >
                Yes, Delete Task
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 3. CORE TWO-COLUMN WORKSPACE BODY                                 */}
        {/* ================================================================= */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200/80">
          {/* ------------------------------------------------------------- */}
          {/* LEFT COLUMN: Title, Description, Subtasks, Notes (7 Cols)      */}
          {/* ------------------------------------------------------------- */}
          <div className="lg:col-span-7 p-4 sm:p-6 space-y-6">
            {/* TASK TITLE */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Task Title
              </label>
              <input
                id="task-details-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                placeholder="What needs to be done?"
                className="w-full text-lg sm:text-xl font-extrabold text-slate-900 bg-transparent border-0 border-b border-transparent focus:border-indigo-600 focus:bg-slate-50/50 rounded-md px-1 py-1.5 transition-all outline-hidden placeholder:text-slate-300"
              />
            </div>

            {/* DESCRIPTION */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Description & Instructions
              </label>
              <textarea
                id="task-details-description-input"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
                placeholder="Add context, instructions, reference links, or notes..."
                className="w-full text-xs sm:text-sm text-slate-700 bg-slate-50/60 border border-slate-200 rounded-xl p-3 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden transition-all placeholder:text-slate-400 resize-y min-h-[80px]"
              />
            </div>

            {/* SUBTASKS WORKSPACE */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    Subtasks & Action Steps
                  </h3>
                  {subtasks.length > 0 && (
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {completedSubtasksCount} of {subtasks.length} completed
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  id="ai-break-down-task-btn"
                  onClick={handleAIBreakDownTask}
                  disabled={aiBreakdownLoading}
                  className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                  title="Generate actionable subtasks using Gemini AI"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>AI Break Down</span>
                </button>
              </div>

              {/* AI BREAKDOWN REVIEW WORKSPACE */}
              {isAIBreakingDown && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/40 border border-indigo-200/80 shadow-xs space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-indigo-100/60">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900 tracking-tight">
                          AI Generated Subtasks
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Select the steps you want to attach. The parent task will remain unchanged.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelAIBreakdown}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {aiBreakdownLoading && (
                    <div className="py-6 flex flex-col items-center justify-center text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
                      <span className="text-xs font-bold text-slate-700">
                        Analyzing task and generating 3–8 actionable steps...
                      </span>
                    </div>
                  )}

                  {aiBreakdownError && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
                      <span>{aiBreakdownError}</span>
                      <button
                        type="button"
                        onClick={handleAIBreakDownTask}
                        className="font-bold underline ml-2 hover:text-rose-900 cursor-pointer"
                      >
                        Try Again
                      </button>
                    </div>
                  )}

                  {!aiBreakdownLoading && !aiBreakdownError && aiSubtasksReview.length > 0 && (
                    <>
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {aiSubtasksReview.map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleToggleReviewSubtask(idx)}
                            className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer ${
                              item.selected
                                ? 'bg-white border-indigo-200 shadow-2xs'
                                : 'bg-slate-50/60 border-slate-200 opacity-60'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={() => handleToggleReviewSubtask(idx)}
                              className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-900">
                                  {item.title}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {item.durationMinutes}m
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {item.priority}
                                </span>
                              </div>
                              {item.description && (
                                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-indigo-100/60">
                        <button
                          type="button"
                          onClick={handleCancelAIBreakdown}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleAIBreakDownTask}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Regenerate</span>
                          </button>
                          <button
                            type="button"
                            id="add-subtasks-btn"
                            disabled={aiSubtasksReview.filter((i) => i.selected).length === 0}
                            onClick={handleAddApprovedSubtasks}
                            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>
                              Add {aiSubtasksReview.filter((i) => i.selected).length} Subtask
                              {aiSubtasksReview.filter((i) => i.selected).length === 1 ? '' : 's'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Visual Progress Bar */}
              {subtasks.length > 0 && (
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${subtasksProgressPercent}%` }}
                  />
                </div>
              )}

              {/* Subtasks List */}
              <div className="space-y-1.5">
                {subtasks.map((st) => (
                  <div
                    key={st.id}
                    className="group flex items-center justify-between gap-2.5 p-2 sm:px-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleSubtask(st)}
                        className="text-slate-400 hover:text-indigo-600 transition-colors shrink-0 cursor-pointer"
                      >
                        {st.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-300" />
                        )}
                      </button>

                      {editingSubtaskId === st.id ? (
                        <input
                          type="text"
                          value={editingSubtaskText}
                          onChange={(e) => setEditingSubtaskText(e.target.value)}
                          onBlur={() => handleSaveSubtaskTitle(st.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveSubtaskTitle(st.id);
                            if (e.key === 'Escape') setEditingSubtaskId(null);
                          }}
                          autoFocus
                          className="flex-1 text-xs sm:text-sm text-slate-800 bg-white border border-indigo-400 rounded-md px-2 py-0.5 outline-hidden"
                        />
                      ) : (
                        <span
                          onClick={() => {
                            setEditingSubtaskId(st.id);
                            setEditingSubtaskText(st.title);
                          }}
                          className={`flex-1 text-xs sm:text-sm cursor-pointer truncate ${
                            st.completed ? 'line-through text-slate-400' : 'text-slate-800 font-medium'
                          }`}
                        >
                          {st.title}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSubtaskId(st.id);
                          setEditingSubtaskText(st.title);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer"
                        title="Edit subtask"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTask(st.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                        title="Delete subtask"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Subtask Input Form */}
              <form onSubmit={handleAddSubtask} className="flex items-center gap-2 pt-1">
                <input
                  ref={subtaskInputRef}
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Add an actionable step... (Press Enter)"
                  className="flex-1 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden transition-all placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  disabled={!newSubtaskTitle.trim()}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 text-xs font-bold transition-all disabled:opacity-40 disabled:hover:bg-slate-100 disabled:hover:text-slate-700 cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </form>
            </div>

            {/* TASK NOTES / CONTEXT SCRATCHPAD */}
            <div className="pt-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Notes & Scratchpad
              </label>
              <textarea
                id="task-details-notes-input"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Quick thoughts, meeting takeaways, or scratchpad notes..."
                className="w-full text-xs text-slate-700 bg-slate-50/60 border border-slate-200 rounded-xl p-3 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden transition-all placeholder:text-slate-400 resize-y"
              />
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* RIGHT COLUMN: Properties, Schedule, List, Metadata (5 Cols)   */}
          {/* ------------------------------------------------------------- */}
          <div className="lg:col-span-5 p-4 sm:p-6 bg-slate-50/40 space-y-5">
            {/* STATUS SEGMENTED CONTROL */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Status
              </label>
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                {(['todo', 'in_progress', 'completed'] as TaskStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleStatusChange(st)}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      selectedTask.status === st || (st === 'todo' && !selectedTask.status && !selectedTask.completed)
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {st === 'todo' ? 'To Do' : st === 'in_progress' ? 'In Progress' : 'Completed'}
                  </button>
                ))}
              </div>
            </div>

            {/* PRIORITY SELECTOR */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Priority
              </label>
              <div className="grid grid-cols-4 gap-1">
                {(['low', 'medium', 'high', 'urgent'] as Priority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePriorityChange(p)}
                    className={`py-1.5 text-[11px] font-bold uppercase rounded-lg border transition-all cursor-pointer ${
                      selectedTask.priority === p
                        ? p === 'urgent'
                          ? 'bg-red-600 text-white border-red-600 shadow-xs'
                          : p === 'high'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : p === 'medium'
                          ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                          : 'bg-slate-700 text-white border-slate-700 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* ENERGY LEVEL */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Energy Level
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['low', 'medium', 'high'] as EnergyLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => handleEnergyLevelChange(lvl)}
                    className={`py-1.5 px-2 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      selectedTask.energyLevel === lvl
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Zap
                      className={`w-3.5 h-3.5 ${
                        lvl === 'high'
                          ? 'text-amber-500 fill-amber-500'
                          : lvl === 'medium'
                          ? 'text-amber-400'
                          : 'text-slate-400'
                      }`}
                    />
                    <span className="capitalize">{lvl}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* SCHEDULE: DUE DATE & TIME */}
            <div className="space-y-2 pt-1 border-t border-slate-200/80">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Schedule
                </label>
                <button
                  type="button"
                  onClick={() => setShowReschedulePicker(!showReschedulePicker)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                >
                  Quick Reschedule
                </button>
              </div>

              {/* Quick Reschedule Pills */}
              {showReschedulePicker && (
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-2 shadow-2xs animate-in fade-in">
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleReschedule(today)}
                      className="py-1 text-xs font-bold rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 cursor-pointer"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReschedule(addDays(today, 1))}
                      className="py-1 text-xs font-bold rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 cursor-pointer"
                    >
                      Tomorrow
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReschedule(addDays(today, 3))}
                      className="py-1 text-xs font-bold rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 cursor-pointer"
                    >
                      This Week
                    </button>
                  </div>
                </div>
              )}

              {/* Date Input */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    value={selectedTask.date}
                    onChange={(e) => updateTask(selectedTask.id, { date: e.target.value })}
                    className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden cursor-pointer"
                  />
                </div>

                {/* Time Input */}
                <div className="relative w-32">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="time"
                    value={selectedTask.time || ''}
                    onChange={(e) => updateTask(selectedTask.id, { time: e.target.value || undefined })}
                    className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl pl-9 pr-2 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden cursor-pointer"
                  />
                </div>
              </div>

              {/* Duration Presets */}
              <div className="flex items-center justify-between gap-1.5 pt-1">
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                  <Timer className="w-3.5 h-3.5 text-slate-400" />
                  Duration:
                </span>
                <div className="flex items-center gap-1">
                  {[15, 25, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => updateTask(selectedTask.id, { durationMinutes: mins })}
                      className={`px-2 py-1 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer ${
                        selectedTask.durationMinutes === mins
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Scheduled Status Display */}
              <div className="text-[11px] text-slate-500 font-medium bg-slate-100/80 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>
                  {selectedTask.date === today
                    ? 'Today'
                    : selectedTask.date === addDays(today, 1)
                    ? 'Tomorrow'
                    : formatDisplayDate(selectedTask.date)}
                  {selectedTask.time ? ` at ${formatTimeDisplay(selectedTask.time)}` : ' (Untimed)'}
                  {selectedTask.durationMinutes ? ` • ${selectedTask.durationMinutes}m` : ''}
                </span>
              </div>
            </div>

            {/* LIST ASSIGNMENT */}
            <div className="pt-1 border-t border-slate-200/80">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                List
              </label>
              <div className="relative">
                <ListFilter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={selectedTask.listId || ''}
                  onChange={(e) => updateTask(selectedTask.id, { listId: e.target.value || undefined })}
                  className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden cursor-pointer appearance-none"
                >
                  <option value="">No List (Inbox)</option>
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* GOAL ASSIGNMENT */}
            <div className="pt-1 border-t border-slate-200/80">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Goal Connection
              </label>
              <div className="relative">
                <Target className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={selectedTask.goalId || ''}
                  onChange={(e) => updateTask(selectedTask.id, { goalId: e.target.value || undefined })}
                  className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden cursor-pointer appearance-none"
                >
                  <option value="">No Goal Linked</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* METADATA & ACTIVITY */}
            <div className="pt-2 border-t border-slate-200/80 space-y-1 text-[11px] text-slate-400">
              <div className="flex items-center justify-between">
                <span>Created:</span>
                <span className="font-medium text-slate-600">{selectedTask.createdAt || 'Today'}</span>
              </div>
              {selectedTask.updatedAt && (
                <div className="flex items-center justify-between">
                  <span>Last Updated:</span>
                  <span className="font-medium text-slate-600">
                    {new Date(selectedTask.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
              {selectedTask.completedAt && (
                <div className="flex items-center justify-between text-emerald-600">
                  <span>Completed:</span>
                  <span className="font-medium">
                    {new Date(selectedTask.completedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {/* DANGER ZONE / ACTIONS BUTTONS */}
            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleDuplicate}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplicate</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 4. FOOTER                                                         */}
        {/* ================================================================= */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200/80 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400 font-medium">
            Changes save automatically to PlanList
          </div>

          <div className="flex items-center gap-2">
            <button
              id="task-details-footer-done"
              onClick={closeTaskDetails}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
