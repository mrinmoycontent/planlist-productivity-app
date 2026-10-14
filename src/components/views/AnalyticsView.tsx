import React, { useMemo, useState } from 'react';
import {
  CalendarCheck2,
  CheckCircle2,
  Clock,
  TrendingUp,
  Target,
  Award,
  AlertCircle,
  Lightbulb,
  ArrowRight,
  Flame,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { usePlan } from '../../context/PlanContext';
import { getTodayString, getWeekRange, formatMinutesToHours, formatDisplayDate } from '../../utils/dateUtils';
import { AIWeeklyReviewModal } from '../modals/AIWeeklyReviewModal';

export const AnalyticsView: React.FC = () => {
  const { tasks, goals, reviewMetrics, focusState, openPlanGenerator } = usePlan();
  const [isAIReviewOpen, setIsAIReviewOpen] = useState(false);

  const todayStr = getTodayString();
  const weekInfo = getWeekRange();

  // Weekly review calculations from user's actual stored tasks
  const {
    weekTasks,
    weekCompletedTasks,
    totalPlannedMinutes,
    totalCompletedMinutes,
    completionRate,
    tasksCarriedForward,
    tasksBacklogged,
    mostProductiveDay,
    mostProductiveDayCount,
    insights,
    dayBreakdown,
  } = useMemo(() => {
    // Current week tasks
    const wTasks = tasks.filter((t) => weekInfo.dates.includes(t.date));
    const wDone = wTasks.filter((t) => t.completed);

    const plannedMins = wTasks.reduce((acc, t) => acc + (t.durationMinutes || 30), 0);
    const completedMins = wDone.reduce((acc, t) => acc + (t.durationMinutes || 30), 0);
    const rate = wTasks.length > 0 ? Math.round((wDone.length / wTasks.length) * 100) : 0;

    // Carried forward: scheduled before today and still uncompleted
    const carried = tasks.filter((t) => !t.completed && t.date < todayStr).length;

    // Cancelled / backlog
    const backlogged = tasks.filter((t) => !t.completed && t.date < weekInfo.start).length;

    // Most productive day calculation (based on actual completed tasks)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const completionsByDay: Record<string, number> = {
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
      Sunday: 0,
    };

    tasks
      .filter((t) => t.completed && t.date)
      .forEach((t) => {
        const [y, m, d] = t.date.split('-').map(Number);
        const dayName = dayNames[new Date(y, m - 1, d).getDay()];
        if (completionsByDay[dayName] !== undefined) {
          completionsByDay[dayName] += 1;
        }
      });

    let bestDay = 'Tuesday';
    let maxDone = 0;
    Object.entries(completionsByDay).forEach(([day, count]) => {
      if (count > maxDone) {
        maxDone = count;
        bestDay = day;
      }
    });

    // If no tasks completed yet, find the day with most scheduled
    if (maxDone === 0) {
      bestDay = 'Today';
    }

    // Daily breakdown for visual chart
    const breakdown = weekInfo.dates.map((dateStr) => {
      const dayTasks = tasks.filter((t) => t.date === dateStr);
      const dayDone = dayTasks.filter((t) => t.completed);
      const [y, m, d] = dateStr.split('-').map(Number);
      const shortName = new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short' });
      return {
        date: dateStr,
        dayName: shortName,
        total: dayTasks.length,
        completed: dayDone.length,
        isToday: dateStr === todayStr,
      };
    });

    // Real-data insights
    const realInsights: string[] = [];

    // 1. High-priority insight
    const highTasks = wTasks.filter((t) => t.priority === 'high');
    const highDone = highTasks.filter((t) => t.completed);
    if (highTasks.length > 0) {
      const highRate = Math.round((highDone.length / highTasks.length) * 100);
      realInsights.push(
        `High Priority Alignment: You have completed ${highDone.length} of ${highTasks.length} (${highRate}%) high-priority deliverables scheduled for this week.`
      );
    } else {
      realInsights.push(
        'Planning tip: Assign high priority to your 1–2 most impactful tasks to keep focus razor sharp.'
      );
    }

    // 2. Category distribution
    const categoryCounts: Record<string, number> = {};
    wDone.forEach((t) => {
      categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
    });
    const topCatEntry = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
    if (topCatEntry) {
      realInsights.push(
        `Primary Momentum: Most of your completed output this week centered on "${topCatEntry[0]}" (${topCatEntry[1]} tasks completed).`
      );
    }

    // 3. Deep work focus
    if (focusState.totalMinutesToday > 0) {
      realInsights.push(
        `Focus Stamina: You logged ${focusState.totalMinutesToday} minutes of uninterrupted deep focus across ${focusState.sessionsCompletedToday} sessions today.`
      );
    } else {
      realInsights.push(
        `Workflow Rhythm: Break down tasks into 20–30 minute blocks to avoid carryover friction and protect deep work time.`
      );
    }

    return {
      weekTasks: wTasks,
      weekCompletedTasks: wDone,
      totalPlannedMinutes: plannedMins,
      totalCompletedMinutes: completedMins,
      completionRate: rate,
      tasksCarriedForward: carried,
      tasksBacklogged: backlogged,
      mostProductiveDay: bestDay,
      mostProductiveDayCount: maxDone,
      insights: realInsights,
      dayBreakdown: breakdown,
    };
  }, [tasks, weekInfo, todayStr, focusState]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Weekly Review Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                Weekly Review
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {formatDisplayDate(weekInfo.start)} – {formatDisplayDate(weekInfo.end)}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1.5">
              Reflect, Calibrate & Finish Strong
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Evaluate real execution against your planned agenda and minimize carryover friction.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              id="ai-weekly-review-btn"
              onClick={() => setIsAIReviewOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200/80 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>AI Weekly Review</span>
            </button>

            <button
              onClick={() => openPlanGenerator()}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-200" />
              <span>+ Plan My Day</span>
            </button>
          </div>
        </div>

        {/* Required 6 Core Metrics:
            1. Total planned time
            2. Total completed time
            3. Completion rate
            4. Tasks carried forward
            5. Tasks cancelled / backlog
            6. Most productive day
        */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 mt-6">
          {/* 1. Total planned time */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Planned Time
            </span>
            <span className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight block">
              {formatMinutesToHours(totalPlannedMinutes)}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {weekTasks.length} tasks scheduled
            </span>
          </div>

          {/* 2. Total completed time */}
          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-700 block mb-1">
              Completed Time
            </span>
            <span className="text-lg sm:text-2xl font-extrabold text-emerald-950 tracking-tight block">
              {formatMinutesToHours(totalCompletedMinutes)}
            </span>
            <span className="text-[11px] text-emerald-700/80 mt-1 block">
              {weekCompletedTasks.length} tasks finished
            </span>
          </div>

          {/* 3. Completion rate */}
          <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-indigo-700 block mb-1">
              Completion Rate
            </span>
            <span className="text-lg sm:text-2xl font-extrabold text-indigo-950 tracking-tight block">
              {completionRate}%
            </span>
            <span className="text-[11px] text-indigo-700/80 mt-1 block">
              Weekly momentum
            </span>
          </div>

          {/* 4. Tasks carried forward */}
          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-700 block mb-1">
              Carried Forward
            </span>
            <span className="text-lg sm:text-2xl font-extrabold text-amber-950 tracking-tight block">
              {tasksCarriedForward}
            </span>
            <span className="text-[11px] text-amber-700/80 mt-1 block">
              Pending past due
            </span>
          </div>

          {/* 5. Tasks cancelled / backlog */}
          <div className="p-4 rounded-xl bg-rose-50/40 border border-rose-100">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-rose-700 block mb-1">
              Tasks Backlogged
            </span>
            <span className="text-lg sm:text-2xl font-extrabold text-rose-950 tracking-tight block">
              {tasksBacklogged}
            </span>
            <span className="text-[11px] text-rose-700/80 mt-1 block">
              Overdue prior weeks
            </span>
          </div>

          {/* 6. Most productive day */}
          <div className="p-4 rounded-xl bg-violet-50/50 border border-violet-100">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-violet-700 block mb-1">
              Peak Day
            </span>
            <span className="text-base sm:text-xl font-extrabold text-violet-950 tracking-tight block truncate">
              {mostProductiveDay}
            </span>
            <span className="text-[11px] text-violet-700/80 mt-1 block">
              {mostProductiveDayCount > 0 ? `${mostProductiveDayCount} tasks done` : 'Most active'}
            </span>
          </div>
        </div>
      </div>

      {/* Week Daily Rhythm Bar Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Weekly Daily Distribution</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">Completed vs Scheduled</span>
        </div>

        <div className="grid grid-cols-7 gap-2 sm:gap-3 text-center">
          {dayBreakdown.map((item) => {
            const pct = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
            return (
              <div
                key={item.date}
                className={`p-3 rounded-xl border transition-all ${
                  item.isToday
                    ? 'bg-indigo-50/50 border-indigo-200 ring-1 ring-indigo-500/20'
                    : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50'
                }`}
              >
                <span className={`text-xs font-bold block ${item.isToday ? 'text-indigo-700' : 'text-slate-600'}`}>
                  {item.dayName}
                </span>

                <div className="my-2 h-14 sm:h-16 flex items-end justify-center">
                  <div className="w-3.5 sm:w-5 bg-slate-200 rounded-t overflow-hidden h-full flex flex-col justify-end">
                    <div
                      className="bg-indigo-600 w-full transition-all duration-500 rounded-t"
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                </div>

                <span className="text-[11px] font-mono text-slate-500 block">
                  {item.completed}/{item.total}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Insights Section (Strictly Based on User's Stored Data) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-bold text-slate-900">
            Real Data Insights & Patterns
          </h3>
        </div>

        <div className="space-y-3">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/40 flex items-start gap-3"
            >
              <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <p className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed">
                {insight}
              </p>
            </div>
          ))}
        </div>
      </div>
      {/* AI Weekly Review Modal */}
      <AIWeeklyReviewModal
        isOpen={isAIReviewOpen}
        onClose={() => setIsAIReviewOpen(false)}
      />
    </div>
  );
};
