import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  CheckSquare,
  Plus,
  Filter,
  Search,
  CheckCircle2,
  CalendarCheck2,
  Check,
  Minus,
  X,
  Flag,
  Folder,
  Calendar,
  Trash2,
  ChevronDown,
  Circle,
  Clock,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { usePlan } from '../../context/PlanContext';
import { Priority, Task, TaskStatus } from '../../types';
import { TaskCard } from '../TaskCard';
import { getTodayString, getTomorrowString, formatDisplayDate } from '../../utils/dateUtils';

export const TasksView: React.FC = () => {
  const {
    tasks,
    lists,
    goals,
    openTaskModal,
    searchQuery,
    setSearchQuery,
    openPlanGenerator,
    bulkUpdatePriority,
    bulkMoveToList,
    bulkUpdateStatus,
    bulkReschedule,
    bulkDeleteTasks,
  } = usePlan();

  // Search & Filter state
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all');
  const [listFilter, setListFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [localSearch, setLocalSearch] = useState('');

  // Bulk selection state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [activeDropdown, setActiveDropdown] = useState<'priority' | 'list' | 'status' | 'reschedule' | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [customDateInput, setCustomDateInput] = useState<string>(getTodayString());
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync global search query if set outside or local search
  const effectiveSearch = searchQuery || localSearch;

  // Build lookup maps for fast search matching (task list name, goal name)
  const listNameMap = useMemo(() => {
    const map = new Map<string, string>();
    lists.forEach((l) => map.set(l.id, l.name.toLowerCase()));
    return map;
  }, [lists]);

  const goalTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    goals.forEach((g) => map.set(g.id, g.title.toLowerCase()));
    return map;
  }, [goals]);

  // Check if any filter or search is active
  const isFilterActive = useMemo(() => {
    return (
      Boolean(effectiveSearch.trim()) ||
      priorityFilter !== 'all' ||
      listFilter !== 'all' ||
      statusFilter !== 'all'
    );
  }, [effectiveSearch, priorityFilter, listFilter, statusFilter]);

  // Filter tasks based on search and active filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // 1. Priority filter
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false;
      }

      // 2. List filter
      if (listFilter !== 'all') {
        if (listFilter === 'none') {
          // Unassigned / Inbox tasks
          if (task.listId) return false;
        } else if (task.listId !== listFilter) {
          return false;
        }
      }

      // 3. Status filter
      if (statusFilter !== 'all') {
        const currentTaskStatus: TaskStatus =
          task.status || (task.completed ? 'completed' : 'todo');
        if (currentTaskStatus !== statusFilter) {
          return false;
        }
      }

      // 4. Text search
      if (effectiveSearch.trim()) {
        const q = effectiveSearch.trim().toLowerCase();
        const titleMatch = task.title.toLowerCase().includes(q);
        const descMatch = (task.description || '').toLowerCase().includes(q);
        const notesMatch = (task.notes || '').toLowerCase().includes(q);

        // List name matching
        const taskListName = task.listId ? listNameMap.get(task.listId) || '' : '';
        const listMatch = taskListName.includes(q);

        // Goal name matching
        const taskGoalName = task.goalId ? goalTitleMap.get(task.goalId) || '' : '';
        const goalMatch = taskGoalName.includes(q);

        if (!titleMatch && !descMatch && !notesMatch && !listMatch && !goalMatch) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, priorityFilter, listFilter, statusFilter, effectiveSearch, listNameMap, goalTitleMap]);

  const selectedCount = selectedTaskIds.size;
  const visibleIds = useMemo(() => filteredTasks.map((t) => t.id), [filteredTasks]);
  const isAllVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedTaskIds.has(id));

  // Reset/Clear all filters
  const handleClearFilters = () => {
    setLocalSearch('');
    if (setSearchQuery) setSearchQuery('');
    setPriorityFilter('all');
    setListFilter('all');
    setStatusFilter('all');
  };

  // Dismiss dropdown on outside click
  useEffect(() => {
    if (!activeDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#bulk-action-bar-container')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown]);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedback({ type, message });
    if (type === 'success') {
      feedbackTimerRef.current = setTimeout(() => {
        setFeedback(null);
      }, 3500);
    }
  };

  const handleToggleSelect = (taskId: string) => {
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

  const handleToggleSelectAll = () => {
    if (isAllVisibleSelected) {
      // Deselect visible tasks
      setSelectedTaskIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      // Select all visible tasks
      setSelectedTaskIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedTaskIds(new Set());
    setActiveDropdown(null);
  };

  const handleCancelSelection = () => {
    setIsSelectMode(false);
    setSelectedTaskIds(new Set());
    setActiveDropdown(null);
    setIsConfirmDeleteOpen(false);
  };

  const handleChangePriority = async (priority: Priority) => {
    const ids: string[] = Array.from(selectedTaskIds);
    if (ids.length === 0) return;
    setIsActionLoading(true);
    setActiveDropdown(null);
    const result = await bulkUpdatePriority(ids, priority);
    setIsActionLoading(false);
    if (result.success) {
      showFeedback('success', `${ids.length} ${ids.length === 1 ? 'task' : 'tasks'} updated`);
    } else {
      showFeedback('error', result.error || 'Failed to update priority in Supabase');
    }
  };

  const handleMoveToList = async (listId: string | null) => {
    const ids: string[] = Array.from(selectedTaskIds);
    if (ids.length === 0) return;
    setIsActionLoading(true);
    setActiveDropdown(null);
    const result = await bulkMoveToList(ids, listId);
    setIsActionLoading(false);
    if (result.success) {
      showFeedback('success', `${ids.length} ${ids.length === 1 ? 'task' : 'tasks'} moved`);
    } else {
      showFeedback('error', result.error || 'Failed to move tasks in Supabase');
    }
  };

  const handleChangeStatus = async (status: TaskStatus) => {
    const ids: string[] = Array.from(selectedTaskIds);
    if (ids.length === 0) return;
    setIsActionLoading(true);
    setActiveDropdown(null);
    const result = await bulkUpdateStatus(ids, status);
    setIsActionLoading(false);
    if (result.success) {
      showFeedback('success', `${ids.length} ${ids.length === 1 ? 'task' : 'tasks'} updated`);
    } else {
      showFeedback('error', result.error || 'Failed to update status in Supabase');
    }
  };

  const handleReschedule = async (dueDate: string) => {
    const ids: string[] = Array.from(selectedTaskIds);
    if (ids.length === 0) return;
    setIsActionLoading(true);
    setActiveDropdown(null);
    const result = await bulkReschedule(ids, dueDate);
    setIsActionLoading(false);
    if (result.success) {
      showFeedback('success', `${ids.length} ${ids.length === 1 ? 'task' : 'tasks'} rescheduled to ${formatDisplayDate(dueDate)}`);
    } else {
      showFeedback('error', result.error || 'Failed to reschedule tasks in Supabase');
    }
  };

  const handleDeleteConfirmed = async () => {
    const ids: string[] = Array.from(selectedTaskIds);
    if (ids.length === 0) return;
    setIsActionLoading(true);
    const result = await bulkDeleteTasks(ids);
    setIsActionLoading(false);
    setIsConfirmDeleteOpen(false);
    if (result.success) {
      showFeedback('success', `${ids.length} ${ids.length === 1 ? 'task' : 'tasks'} deleted`);
      setIsSelectMode(false);
      setSelectedTaskIds(new Set());
    } else {
      showFeedback('error', result.error || 'Failed to delete tasks in Supabase');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Small Feedback Toast */}
      {feedback && (
        <div
          id="bulk-feedback-banner"
          className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 shadow-xs border transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 rounded-md hover:bg-black/5 text-slate-500 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        {/* Quick Action Bar / Header Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-indigo-600" />
              <span>All Tasks</span>
            </h1>
            <span
              id="tasks-filter-count-badge"
              className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/60"
            >
              {isFilterActive
                ? `${filteredTasks.length} of ${tasks.length} tasks`
                : `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`}
            </span>
            {isFilterActive && (
              <button
                type="button"
                id="clear-filters-btn"
                onClick={handleClearFilters}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline underline-offset-2 flex items-center gap-1 ml-1 cursor-pointer transition-colors"
                title="Reset all search queries and filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear filters</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openPlanGenerator()}
              className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all cursor-pointer"
            >
              Plan My Day
            </button>
            <button
              onClick={() => openTaskModal()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Quick Task</span>
            </button>
          </div>
        </div>

        {/* Search input + Priority, List, and Status dropdown filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
          {/* 1. Text Search Input */}
          <div className="flex-1 min-w-[220px] relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              id="task-search-input"
              value={effectiveSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                if (setSearchQuery) setSearchQuery(e.target.value);
              }}
              placeholder="Search tasks..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 transition-all"
            />
            {effectiveSearch && (
              <button
                type="button"
                onClick={() => {
                  setLocalSearch('');
                  if (setSearchQuery) setSearchQuery('');
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                title="Clear search query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 2. Priority Filter */}
          <div className="flex items-center gap-1.5 min-w-[130px]">
            <select
              id="priority-filter-select"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as 'all' | Priority)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-indigo-600 transition-all cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* 3. List Filter */}
          <div className="flex items-center gap-1.5 min-w-[140px]">
            <select
              id="list-filter-select"
              value={listFilter}
              onChange={(e) => setListFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-indigo-600 transition-all cursor-pointer"
            >
              <option value="all">All Lists</option>
              <option value="none">No List (Inbox)</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Status Filter */}
          <div className="flex items-center gap-1.5 min-w-[130px]">
            <select
              id="status-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | TaskStatus)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-indigo-600 transition-all cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task List container */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Header: Standard mode vs Bulk Selection Mode */}
        {!isSelectMode ? (
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Tasks</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                  {isFilterActive
                    ? `${filteredTasks.length} of ${tasks.length} tasks`
                    : `${filteredTasks.length} ${filteredTasks.length === 1 ? 'task' : 'tasks'}`}
                </span>
                {isFilterActive && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline underline-offset-2 ml-1 cursor-pointer transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5 hidden sm:block">
                One-tap completion • Break Down • Reschedule
              </p>
            </div>

            <div className="flex items-center gap-2">
              {filteredTasks.length > 0 && (
                <button
                  type="button"
                  id="enter-bulk-select-btn"
                  onClick={() => {
                    setIsSelectMode(true);
                    setSelectedTaskIds(new Set());
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-600 hover:text-indigo-600 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Select</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="border-b border-indigo-100 bg-indigo-50/40">
            {/* Active Selection Header */}
            <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  id="bulk-select-all-btn"
                  onClick={handleToggleSelectAll}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-600 text-slate-800 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                      isAllVisibleSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : selectedCount > 0
                        ? 'bg-indigo-100 border-indigo-400 text-indigo-700'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isAllVisibleSelected ? (
                      <Check className="w-3 h-3 stroke-[3]" />
                    ) : selectedCount > 0 ? (
                      <Minus className="w-2.5 h-2.5 stroke-[3]" />
                    ) : null}
                  </div>
                  <span>Select All</span>
                </button>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 font-mono text-xs">
                    {selectedCount} selected
                  </span>
                  {selectedCount > 0 && (
                    <button
                      type="button"
                      id="bulk-clear-selection-btn"
                      onClick={handleClearSelection}
                      className="text-xs text-slate-500 hover:text-indigo-600 underline underline-offset-2 transition-colors cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  id="bulk-cancel-selection-btn"
                  onClick={handleCancelSelection}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel Selection
                </button>
              </div>
            </div>

            {/* Compact Bulk Action Bar (visible when 1 or more tasks selected) */}
            {selectedCount > 0 && (
              <div
                id="bulk-action-bar-container"
                className="bg-indigo-50/90 border-t border-indigo-100/90 p-2.5 sm:px-4 flex items-center justify-between gap-2 overflow-x-auto relative"
              >
                <div className="flex items-center gap-2 shrink-0">
                  {/* 1. Priority */}
                  <div className="relative">
                    <button
                      type="button"
                      id="bulk-priority-btn"
                      onClick={() => setActiveDropdown(activeDropdown === 'priority' ? null : 'priority')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                        activeDropdown === 'priority'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-600 hover:text-indigo-600'
                      }`}
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>Priority</span>
                      <ChevronDown className="w-3 h-3 opacity-70" />
                    </button>

                    {activeDropdown === 'priority' && (
                      <div className="absolute left-0 top-full mt-1.5 w-40 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-30 animate-in fade-in duration-100">
                        <button
                          onClick={() => handleChangePriority('low')}
                          className="w-full px-3 py-1.5 text-xs text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>Low</span>
                        </button>
                        <button
                          onClick={() => handleChangePriority('medium')}
                          className="w-full px-3 py-1.5 text-xs text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                        >
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          <span>Medium</span>
                        </button>
                        <button
                          onClick={() => handleChangePriority('high')}
                          className="w-full px-3 py-1.5 text-xs text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                        >
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          <span>High</span>
                        </button>
                        <button
                          onClick={() => handleChangePriority('urgent')}
                          className="w-full px-3 py-1.5 text-xs text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                        >
                          <span className="w-2 h-2 rounded-full bg-purple-500" />
                          <span>Urgent</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 2. Move to List */}
                  <div className="relative">
                    <button
                      type="button"
                      id="bulk-move-btn"
                      onClick={() => setActiveDropdown(activeDropdown === 'list' ? null : 'list')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                        activeDropdown === 'list'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-600 hover:text-indigo-600'
                      }`}
                    >
                      <Folder className="w-3.5 h-3.5" />
                      <span>Move</span>
                      <ChevronDown className="w-3 h-3 opacity-70" />
                    </button>

                    {activeDropdown === 'list' && (
                      <div className="absolute left-0 top-full mt-1.5 w-48 max-h-60 overflow-y-auto bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-30 animate-in fade-in duration-100">
                        <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Select List
                        </div>
                        <button
                          onClick={() => handleMoveToList(null)}
                          className="w-full px-3 py-1.5 text-xs text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                        >
                          <Folder className="w-3.5 h-3.5 text-slate-400" />
                          <span>No List (Inbox)</span>
                        </button>
                        {lists.map((l) => (
                          <button
                            key={l.id}
                            onClick={() => handleMoveToList(l.id)}
                            className="w-full px-3 py-1.5 text-xs text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer truncate"
                          >
                            <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                            <span className="truncate">{l.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 3. Change Status */}
                  <div className="relative">
                    <button
                      type="button"
                      id="bulk-status-btn"
                      onClick={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                        activeDropdown === 'status'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-600 hover:text-indigo-600'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Status</span>
                      <ChevronDown className="w-3 h-3 opacity-70" />
                    </button>

                    {activeDropdown === 'status' && (
                      <div className="absolute left-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-30 animate-in fade-in duration-100">
                        <button
                          onClick={() => handleChangeStatus('todo')}
                          className="w-full px-3 py-1.5 text-xs text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                        >
                          <Circle className="w-3.5 h-3.5 text-slate-400" />
                          <span>To Do</span>
                        </button>
                        <button
                          onClick={() => handleChangeStatus('in_progress')}
                          className="w-full px-3 py-1.5 text-xs text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>In Progress</span>
                        </button>
                        <button
                          onClick={() => handleChangeStatus('completed')}
                          className="w-full px-3 py-1.5 text-xs text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Completed</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 4. Reschedule */}
                  <div className="relative">
                    <button
                      type="button"
                      id="bulk-reschedule-btn"
                      onClick={() => setActiveDropdown(activeDropdown === 'reschedule' ? null : 'reschedule')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                        activeDropdown === 'reschedule'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-600 hover:text-indigo-600'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Reschedule</span>
                      <ChevronDown className="w-3 h-3 opacity-70" />
                    </button>

                    {activeDropdown === 'reschedule' && (
                      <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-lg border border-slate-200 p-2 z-30 animate-in fade-in duration-100 space-y-1">
                        <button
                          onClick={() => handleReschedule(getTodayString())}
                          className="w-full px-3 py-1.5 text-xs text-left text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2 cursor-pointer"
                        >
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Today</span>
                        </button>
                        <button
                          onClick={() => handleReschedule(getTomorrowString())}
                          className="w-full px-3 py-1.5 text-xs text-left text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2 cursor-pointer"
                        >
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Tomorrow</span>
                        </button>

                        <div className="pt-1.5 border-t border-slate-100">
                          <label className="text-[10px] font-bold text-slate-400 block px-1 mb-1">
                            Choose Date
                          </label>
                          <div className="flex items-center gap-1 px-1">
                            <input
                              type="date"
                              value={customDateInput}
                              onChange={(e) => setCustomDateInput(e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-600"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (customDateInput) handleReschedule(customDateInput);
                              }}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shrink-0 cursor-pointer"
                            >
                              Set
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 5. Delete */}
                  <button
                    type="button"
                    id="bulk-delete-btn"
                    onClick={() => setIsConfirmDeleteOpen(true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {filteredTasks.length === 0 ? (
          <div className="py-16 text-center px-4">
            {isFilterActive ? (
              <div>
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  No tasks found
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Try changing your search or filters.
                </p>
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button
                    type="button"
                    id="empty-state-clear-filters-btn"
                    onClick={handleClearFilters}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs hover:bg-indigo-700 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear filters</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-3">
                  <CalendarCheck2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  Nothing planned yet.
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Start with one thing you want to accomplish today.
                </p>
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button
                    onClick={() => openPlanGenerator()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs hover:bg-indigo-700 transition-all cursor-pointer"
                  >
                    Plan My Day
                  </button>
                  <button
                    onClick={() => openTaskModal()}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    + Quick Task
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 sm:p-4 space-y-2.5">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                showDate={true}
                isSelectMode={isSelectMode}
                isSelected={selectedTaskIds.has(task.id)}
                onToggleSelect={handleToggleSelect}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {isConfirmDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            id="bulk-delete-confirm-dialog"
            className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 p-5 space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Delete {selectedCount} selected {selectedCount === 1 ? 'task' : 'tasks'}?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConfirmDeleteOpen(false)}
                disabled={isActionLoading}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-bulk-delete-btn"
                onClick={handleDeleteConfirmed}
                disabled={isActionLoading}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isActionLoading ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
