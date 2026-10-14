import React, { useState } from 'react';
import {
  Target,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Plus,
  Calendar,
  Layers,
  ArrowRight,
  Check,
} from 'lucide-react';
import { Goal, GoalSubtask } from '../types';
import { usePlan } from '../context/PlanContext';
import { getTodayString } from '../utils/dateUtils';

interface GoalProgressCardProps {
  goal: Goal;
  onClick?: () => void;
}

export const GoalProgressCard: React.FC<GoalProgressCardProps> = ({ goal }) => {
  const { toggleGoalSubtask, addGoalSubtask, addTask, openTaskModal } = usePlan();
  const [isExpanded, setIsExpanded] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const totalTasks = goal.tasks?.length || 0;
  const completedTasks = goal.tasks?.filter((t) => t.completed).length || 0;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    addGoalSubtask(goal.id, newSubtaskTitle.trim());
    setNewSubtaskTitle('');
  };

  const handleScheduleSubtaskToToday = (subtask: GoalSubtask) => {
    addTask({
      title: subtask.title,
      description: `Action step from goal: ${goal.title}`,
      date: getTodayString(),
      priority: 'high',
      category: goal.category,
      goalId: goal.id,
      goalSubtaskId: subtask.id,
      durationMinutes: 30,
    });
  };

  return (
    <div
      id={`goal-card-${goal.id}`}
      className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all hover:border-slate-300"
    >
      {/* Clickable Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 sm:p-5 flex items-start justify-between gap-3 cursor-pointer hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
              {goal.category}
            </span>
            {goal.targetDate && (
              <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                <Calendar className="w-3 h-3 text-slate-400" />
                Target: {goal.targetDate}
              </span>
            )}
          </div>

          <h4 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight line-clamp-1">
            {goal.title}
          </h4>

          {goal.description && (
            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{goal.description}</p>
          )}

          {/* Visual Progress Stats */}
          <div className="mt-3 flex items-center justify-between text-xs text-slate-600 font-semibold mb-1.5">
            <span>
              {completedTasks} / {totalTasks} tasks
            </span>
            <span className="font-extrabold text-indigo-600 font-mono">{progressPercent}%</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Expand / Collapse Toggle Icon */}
        <button
          type="button"
          className="mt-1 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
          title={isExpanded ? 'Collapse breakdown' : 'View task breakdown'}
        >
          {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>

      {/* Expandable Task Breakdown */}
      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Action Steps Breakdown</span>
            </span>
            <span className="text-[11px] text-slate-400">
              Click checkbox to complete or arrow to schedule for Today
            </span>
          </div>

          {totalTasks === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">
              No specific action steps added yet. Add steps below.
            </p>
          ) : (
            <div className="space-y-1.5">
              {goal.tasks.map((subtask) => (
                <div
                  key={subtask.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleGoalSubtask(goal.id, subtask.id);
                      }}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer ${
                        subtask.completed
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-slate-300 hover:border-indigo-600 bg-white'
                      }`}
                    >
                      {subtask.completed && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                    <span
                      className={`text-xs font-semibold ${
                        subtask.completed ? 'line-through text-slate-400' : 'text-slate-800'
                      }`}
                    >
                      {subtask.title}
                    </span>
                  </div>

                  {!subtask.completed && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleScheduleSubtaskToToday(subtask);
                      }}
                      className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold flex items-center gap-1 transition-colors shrink-0"
                      title="Schedule into Today's timeline"
                    >
                      <span>To Today</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Quick Add Subtask */}
          <form onSubmit={handleAddSubtask} className="flex items-center gap-2 pt-2">
            <input
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              placeholder="Add next action step toward this goal..."
              className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Step</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
