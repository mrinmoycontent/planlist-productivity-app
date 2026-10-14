import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Trophy,
  AlertTriangle,
  Layers,
  ArrowUpRight,
  RotateCcw,
  Loader2,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Zap,
} from 'lucide-react';
import { AIWeeklyReviewResponse } from '../../types';
import { requestAIWeeklyReview } from '../../services/aiService';
import { usePlan } from '../../context/PlanContext';
import { getTodayString, getWeekRange, formatDisplayDate } from '../../utils/dateUtils';

interface AIWeeklyReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIWeeklyReviewModal: React.FC<AIWeeklyReviewModalProps> = ({ isOpen, onClose }) => {
  const { tasks, goals, focusState } = usePlan();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<AIWeeklyReviewResponse | null>(null);

  const weekInfo = getWeekRange();
  const todayStr = getTodayString();

  const generateReview = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const weekTasks = tasks.filter((t) => weekInfo.dates.includes(t.date));
      const weekDone = weekTasks.filter((t) => t.completed);
      const plannedMins = weekTasks.reduce((acc, t) => acc + (t.durationMinutes || 30), 0);
      const completedMins = weekDone.reduce((acc, t) => acc + (t.durationMinutes || 30), 0);
      const carried = tasks.filter((t) => !t.completed && t.date < todayStr).length;

      // 1. Compile completed tasks
      const completedTasks = tasks
        .filter((t) => t.completed)
        .map((t) => ({
          title: t.title,
          category: t.category,
          durationMinutes: t.durationMinutes || 30,
        }));

      // 2. Incomplete tasks
      const incompleteTasks = tasks
        .filter((t) => !t.completed)
        .map((t) => ({
          title: t.title,
          priority: t.priority,
          category: t.category,
        }));

      // 3. Compile overdue tasks
      const overdueTasks = tasks
        .filter((t) => !t.completed && t.date < todayStr)
        .map((t) => ({
          title: t.title,
          category: t.category,
          date: t.date,
          priority: t.priority,
        }));

      // 4. Top categories
      const categoryCounts: Record<string, number> = {};
      tasks.forEach((t) => {
        const cat = t.category || 'General';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });
      const topCategories = Object.entries(categoryCounts).map(([category, count]) => ({
        category,
        count,
      }));

      // 5. Top goals
      const topGoals = goals.map((g) => ({
        goalTitle: g.title,
        count: g.tasks?.length || 0,
      }));

      const res = await requestAIWeeklyReview({
        weekRange: { start: weekInfo.start, end: weekInfo.end },
        metrics: {
          completed: weekDone.length,
          planned: weekTasks.length,
          completionRate: weekTasks.length > 0 ? Math.round((weekDone.length / weekTasks.length) * 100) : 0,
          carriedForward: carried,
          totalCompletedMinutes: completedMins,
          totalPlannedMinutes: plannedMins,
        },
        completedTasks,
        incompleteTasks,
        overdueTasks,
        topCategories,
        topGoals,
      });

      setReviewData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to generate weekly review with Gemini.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !reviewData && !isLoading) {
      generateReview();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="ai-weekly-review-modal"
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                  AI Weekly Review & Performance Insights
                </h2>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                  Gemini
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Period: {formatDisplayDate(weekInfo.start)} – {formatDisplayDate(weekInfo.end)} • Objective Task Analytics
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

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
                <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Synthesizing PlanList Execution Data...
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Analyzing completed items, overdue friction, deep work blocks, and goal milestones into objective insights.
                </p>
              </div>
            </div>
          )}

          {error && !isLoading && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Error generating review</span>
              </div>
              <p className="text-xs">{error}</p>
              <button
                type="button"
                onClick={generateReview}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            </div>
          )}

          {!isLoading && !error && reviewData && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Executive Summary Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-50/80 via-slate-50/50 to-violet-50/80 border border-indigo-100/80">
                <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-xs uppercase tracking-wider mb-1.5">
                  <Compass className="w-4 h-4 text-indigo-600" />
                  <span>Executive Summary</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                  {reviewData.summary}
                </p>
              </div>

              {/* 2-Column Grid: Wins vs Bottlenecks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Wins This Week */}
                <div className="p-5 rounded-2xl border border-emerald-200/80 bg-emerald-50/30 flex flex-col space-y-3">
                  <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-sm tracking-tight">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <span>Wins This Week</span>
                  </div>

                  {reviewData.wins && reviewData.wins.length > 0 ? (
                    <ul className="space-y-2.5 flex-1">
                      {reviewData.wins.map((win, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="leading-snug">{win}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No recorded task completions yet this week.</p>
                  )}
                </div>

                {/* 2. Bottlenecks & Recurring Rollover Tasks */}
                <div className="p-5 rounded-2xl border border-amber-200/80 bg-amber-50/30 flex flex-col space-y-3">
                  <div className="flex items-center gap-2 text-amber-950 font-extrabold text-sm tracking-tight">
                    <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-2xs">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <span>Bottlenecks & Friction Points</span>
                  </div>

                  {reviewData.bottlenecks && reviewData.bottlenecks.length > 0 ? (
                    <ul className="space-y-2.5 flex-1">
                      {reviewData.bottlenecks.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                          <span className="leading-snug">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-emerald-700 font-medium">
                      Zero overdue bottlenecks detected — tasks are executing on schedule!
                    </p>
                  )}
                </div>
              </div>

              {/* 3. Top Focus Categories */}
              <div className="p-5 rounded-2xl border border-slate-200/90 bg-white space-y-4">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm tracking-tight">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-2xs">
                    <Layers className="w-4 h-4" />
                  </div>
                  <span>Top Focus Categories</span>
                </div>

                {reviewData.topFocusCategories && reviewData.topFocusCategories.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {reviewData.topFocusCategories.map((cat, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between"
                      >
                        <div>
                          <span className="text-xs font-bold text-slate-900 capitalize block">
                            {cat.category}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {cat.taskCount} tasks logged
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-indigo-600 font-mono block">
                            {cat.minutes >= 60
                              ? `${Math.round((cat.minutes / 60) * 10) / 10}h`
                              : `${cat.minutes}m`}
                          </span>
                          <span className="text-[10px] text-slate-400">Total Time</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No categorized tasks found.</p>
                )}
              </div>

              {/* 4. Recommended Adjustments for Next Week */}
              <div className="p-5 rounded-2xl border border-indigo-200/80 bg-indigo-50/20 space-y-3">
                <div className="flex items-center gap-2 text-indigo-950 font-extrabold text-sm tracking-tight">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-2xs">
                    <Zap className="w-4 h-4" />
                  </div>
                  <span>Recommended Adjustments for Next Week</span>
                </div>

                {reviewData.recommendedAdjustments && reviewData.recommendedAdjustments.length > 0 ? (
                  <div className="space-y-2.5">
                    {reviewData.recommendedAdjustments.map((rec, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-white border border-indigo-100 shadow-2xs flex items-start gap-3"
                      >
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-xs text-slate-700 leading-snug font-medium">
                          {rec}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Keep maintaining your current rhythm.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            id="regenerate-weekly-review-btn"
            disabled={isLoading}
            onClick={generateReview}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Regenerate Review</span>
          </button>
        </div>
      </div>
    </div>
  );
};
