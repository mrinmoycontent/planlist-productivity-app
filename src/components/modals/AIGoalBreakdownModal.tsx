import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Calendar,
  Clock,
  Check,
  RotateCcw,
  Loader2,
  AlertCircle,
  Folder,
} from 'lucide-react';
import { Goal, CustomList, AIGoalTaskSuggestion, Priority } from '../../types';
import { requestAIGoalBreakdown } from '../../services/aiService';
import { getTodayString, addDays, formatDisplayDate } from '../../utils/dateUtils';
import { usePlan } from '../../context/PlanContext';

interface AIGoalBreakdownModalProps {
  goal: Goal | null;
  onClose: () => void;
}

interface ReviewTaskItem extends AIGoalTaskSuggestion {
  selected: boolean;
  chosenDate: string;
  chosenListId?: string;
}

export const AIGoalBreakdownModal: React.FC<AIGoalBreakdownModalProps> = ({ goal, onClose }) => {
  const { lists, addTask, addGoalSubtask } = usePlan();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewTasks, setReviewTasks] = useState<ReviewTaskItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBreakdown = async () => {
    if (!goal) return;
    setIsLoading(true);
    setError(null);

    try {
      const todayStr = getTodayString();
      const existingListInfo = lists.map((l) => ({ id: l.id, name: l.name }));

      const result = await requestAIGoalBreakdown(
        {
          id: goal.id,
          title: goal.title,
          description: goal.description,
          category: goal.category,
          targetDate: goal.targetDate,
        },
        existingListInfo
      );

      if (!result.tasks || result.tasks.length === 0) {
        setError('No tasks were generated. Please try again with a more detailed goal description.');
        setReviewTasks([]);
      } else {
        const items: ReviewTaskItem[] = result.tasks.map((task) => {
          // Match suggestedListName to existing list if possible
          const matchedList = lists.find(
            (l) => l.name.toLowerCase() === (task.suggestedListName || '').toLowerCase()
          );
          const computedDate = addDays(todayStr, Math.max(0, task.daysOffset || 0));

          return {
            ...task,
            selected: true,
            chosenDate: computedDate,
            chosenListId: matchedList ? matchedList.id : (lists[0]?.id || undefined),
          };
        });
        setReviewTasks(items);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to break down goal with AI.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (goal) {
      fetchBreakdown();
    }
  }, [goal?.id]);

  if (!goal) return null;

  const handleToggleTask = (index: number) => {
    setReviewTasks((prev) =>
      prev.map((t, idx) => (idx === index ? { ...t, selected: !t.selected } : t))
    );
  };

  const handleUpdateDate = (index: number, newDate: string) => {
    setReviewTasks((prev) =>
      prev.map((t, idx) => (idx === index ? { ...t, chosenDate: newDate } : t))
    );
  };

  const handleUpdateList = (index: number, newListId: string) => {
    setReviewTasks((prev) =>
      prev.map((t, idx) => (idx === index ? { ...t, chosenListId: newListId } : t))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setReviewTasks((prev) => prev.map((t) => ({ ...t, selected: select })));
  };

  const handleApproveAndSave = async () => {
    const selected = reviewTasks.filter((t) => t.selected);
    if (selected.length === 0) return;

    setIsSubmitting(true);
    try {
      selected.forEach((t) => {
        // 1. Create real Supabase Task associated with this Goal
        addTask({
          title: t.title,
          description: t.description,
          durationMinutes: t.durationMinutes || 30,
          priority: (t.priority as Priority) || 'medium',
          date: t.chosenDate,
          listId: t.chosenListId,
          goalId: goal.id,
          category: goal.category,
          status: 'todo',
        });

        // 2. Also register as an action step in the goal so progress bar tracks it
        addGoalSubtask(goal.id, t.title);
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save tasks to database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCount = reviewTasks.filter((t) => t.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="ai-goal-breakdown-modal"
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  AI Goal Roadmap
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                  Gemini
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-md">
                Goal: <span className="font-semibold text-slate-800">{goal.title}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center animate-pulse">
                <Sparkles className="w-6 h-6 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                Crafting Goal Roadmap with Gemini...
              </h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Generating practical milestones with priorities, durations, lists, and due dates.
              </p>
            </div>
          )}

          {error && !isLoading && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs">
                <AlertCircle className="w-4 h-4" />
                <span>Error generating roadmap</span>
              </div>
              <p className="text-xs">{error}</p>
              <button
                type="button"
                onClick={fetchBreakdown}
                className="text-xs font-bold underline hover:text-rose-900 cursor-pointer"
              >
                Try Again
              </button>
            </div>
          )}

          {!isLoading && !error && reviewTasks.length > 0 && (
            <>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                <span className="text-slate-500 font-medium">
                  Select tasks to schedule. Real PostgreSQL UUIDs and RLS will be applied in Supabase.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAll(true)}
                    className="text-indigo-600 hover:underline font-semibold cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => handleSelectAll(false)}
                    className="text-slate-500 hover:underline font-semibold cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-[52vh] overflow-y-auto pr-1">
                {reviewTasks.map((t, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border transition-all ${
                      t.selected
                        ? 'bg-white border-indigo-200 shadow-2xs'
                        : 'bg-slate-50/50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={t.selected}
                        onChange={() => handleToggleTask(idx)}
                        className="mt-1 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />

                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-slate-900">
                            {t.title}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                              {t.durationMinutes}m
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                              {t.priority}
                            </span>
                          </div>
                        </div>

                        {t.description && (
                          <p className="text-xs text-slate-500 leading-snug">
                            {t.description}
                          </p>
                        )}

                        {/* Scheduling & List Selectors */}
                        <div className="pt-2 flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-1 text-[11px] text-slate-600">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>Due:</span>
                            <input
                              type="date"
                              value={t.chosenDate}
                              onChange={(e) => handleUpdateDate(idx, e.target.value)}
                              className="text-[11px] font-medium border border-slate-200 rounded px-1.5 py-0.5 bg-white text-slate-700 outline-hidden focus:border-indigo-500 cursor-pointer"
                            />
                          </div>

                          {lists.length > 0 && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-600">
                              <Folder className="w-3.5 h-3.5 text-slate-400" />
                              <span>List:</span>
                              <select
                                value={t.chosenListId || ''}
                                onChange={(e) => handleUpdateList(idx, e.target.value)}
                                className="text-[11px] font-medium border border-slate-200 rounded px-1.5 py-0.5 bg-white text-slate-700 outline-hidden focus:border-indigo-500 cursor-pointer"
                              >
                                {lists.map((l) => (
                                  <option key={l.id} value={l.id}>
                                    {l.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={isLoading || isSubmitting}
              onClick={fetchBreakdown}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Regenerate</span>
            </button>

            <button
              type="button"
              id="confirm-ai-goal-tasks-btn"
              disabled={isLoading || isSubmitting || selectedCount === 0}
              onClick={handleApproveAndSave}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Saving to Supabase...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>
                    Create {selectedCount} Task{selectedCount === 1 ? '' : 's'} in Supabase
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
