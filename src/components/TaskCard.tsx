import React, { useState } from 'react';
import {
  Check,
  Clock,
  Flag,
  Calendar,
  Layers,
  MoreVertical,
  Play,
  Edit2,
  Trash2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Task, Priority } from '../types';
import { formatTimeDisplay } from '../utils/dateUtils';
import { usePlan } from '../context/PlanContext';
import { RescheduleModal } from './modals/RescheduleModal';
import { BreakDownModal } from './modals/BreakDownModal';

interface TaskCardProps {
  task: Task;
  isNow?: boolean;
  onEdit?: (task: Task) => void;
  showDate?: boolean;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (taskId: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isNow = false,
  onEdit,
  showDate = false,
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
}) => {
  const { toggleTaskComplete, deleteTask, updateTask, openTaskModal, openTaskDetails, startFocus, setActiveView, tasks } =
    usePlan();

  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const subtasks = tasks.filter((t) => t.parentTaskId === task.id);
  const isCompleted = task.status === 'completed' || task.completed;
  const completedSubtasks = subtasks.filter((t) => t.status === 'completed' || t.completed).length;

  const getPriorityBadge = (p: Priority) => {
    switch (p) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> High
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Med
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Low
          </span>
        );
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Urgent
          </span>
        );
    }
  };

  const handleReschedule = (taskId: string, newDate: string, newTime?: string) => {
    updateTask(taskId, {
      date: newDate,
      time: newTime || undefined,
    });
  };

  return (
    <>
      <div
        id={`task-card-${task.id}`}
        className={`group relative rounded-xl border transition-all duration-150 ${
          isSelected
            ? 'bg-indigo-50/50 border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs'
            : isNow && !isCompleted
            ? 'bg-indigo-50/40 border-indigo-300 ring-1 ring-indigo-500/20 shadow-xs'
            : isCompleted
            ? 'bg-slate-50/60 border-slate-200/70 opacity-70'
            : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-2xs'
        } p-3 sm:p-3.5`}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Left: Checkbox & Info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Checkbox (Bulk select mode or 1-tap complete) */}
            {isSelectMode ? (
              <button
                type="button"
                id={`task-select-checkbox-${task.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect?.(task.id);
                }}
                className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                    : 'border-slate-300 hover:border-indigo-600 bg-white'
                }`}
                title={isSelected ? 'Deselect task' : 'Select task'}
              >
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </button>
            ) : (
              <button
                type="button"
                id={`task-checkbox-${task.id}`}
                onClick={() => toggleTaskComplete(task.id)}
                className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  isCompleted
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                    : 'border-slate-300 hover:border-indigo-600 bg-white'
                }`}
                title={isCompleted ? 'Mark pending' : 'Mark complete'}
              >
                {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </button>
            )}

            {/* Task Content */}
            <div
              onClick={() => (onEdit ? onEdit(task) : openTaskDetails(task))}
              className="flex-1 min-w-0 cursor-pointer"
            >
              <div className="flex items-center gap-2 flex-wrap">
                {/* NOW Indicator */}
                {isNow && !isCompleted && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    NOW
                  </span>
                )}

                <span
                  className={`text-xs sm:text-sm font-semibold tracking-tight hover:text-indigo-600 transition-colors ${
                    isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                  }`}
                >
                  {task.title}
                </span>

                {getPriorityBadge(task.priority)}

                {/* Subtasks Progress Badge */}
                {subtasks.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    <Layers className="w-3 h-3 text-slate-400" />
                    {completedSubtasks}/{subtasks.length}
                  </span>
                )}
              </div>

              {task.description && (
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                  {task.description}
                </p>
              )}

              {/* Information-rich Meta Row: Duration, Category, Due time, Energy */}
              <div className="flex items-center gap-2.5 mt-2 text-[11px] text-slate-400 flex-wrap">
                {/* Due Time */}
                {task.time ? (
                  <span className="flex items-center gap-1 font-mono text-slate-600 font-semibold bg-slate-100/80 px-1.5 py-0.5 rounded">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {formatTimeDisplay(task.time)}
                  </span>
                ) : (
                  <span className="text-slate-400 italic">No set time</span>
                )}

                {/* Duration */}
                <span className="font-semibold text-slate-700 bg-slate-100/80 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <span className="text-slate-400 font-normal">Est:</span>
                  {task.durationMinutes || 30}m
                </span>

                {/* Category */}
                <span className="px-1.5 py-0.5 rounded bg-slate-100/70 text-slate-600 font-medium">
                  {task.category}
                </span>

                {/* Energy Level */}
                {task.energyLevel && (
                  <span className="capitalize px-1.5 py-0.5 rounded bg-slate-100/70 text-slate-600 font-medium">
                    ⚡ {task.energyLevel}
                  </span>
                )}

                {showDate && task.date && (
                  <span className="flex items-center gap-1 text-slate-500 font-medium">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {task.date}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions (Complete, Edit, Break Down, Reschedule, Focus) */}
          <div className="flex items-center gap-1 shrink-0">
            {!isCompleted && (
              <button
                type="button"
                onClick={() => {
                  startFocus(task.id, task.title, task.durationMinutes);
                  setActiveView('focus');
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                title="Start Focus Session"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsBreakdownOpen(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors text-xs"
              title="Break Down into steps"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsRescheduleOpen(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-xs"
              title="Reschedule task"
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => (onEdit ? onEdit(task) : openTaskDetails(task))}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-xs"
              title="Open task details"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => deleteTask(task.id)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors text-xs opacity-0 group-hover:opacity-100"
              title="Delete task"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Break Down Modal */}
      <BreakDownModal
        task={task}
        isOpen={isBreakdownOpen}
        onClose={() => setIsBreakdownOpen(false)}
      />

      {/* Reschedule Modal */}
      <RescheduleModal
        task={task}
        isOpen={isRescheduleOpen}
        onClose={() => setIsRescheduleOpen(false)}
        onReschedule={handleReschedule}
      />
    </>
  );
};
