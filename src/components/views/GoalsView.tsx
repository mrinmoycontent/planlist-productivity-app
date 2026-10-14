import React, { useState } from 'react';
import {
  Target,
  Plus,
  Check,
  Trash2,
  Calendar,
  ArrowRight,
  CalendarPlus,
  CheckCircle2,
  ListTodo,
  Layers,
  Sparkles,
} from 'lucide-react';
import { usePlan } from '../../context/PlanContext';
import { Goal, GoalSubtask } from '../../types';
import { formatDisplayDate, getTodayString } from '../../utils/dateUtils';
import { AIGoalBreakdownModal } from '../modals/AIGoalBreakdownModal';

export const GoalsView: React.FC = () => {
  const {
    goals,
    toggleGoalSubtask,
    addGoalSubtask,
    deleteGoalSubtask,
    deleteGoal,
    openGoalModal,
    addTask,
    tasks,
  } = usePlan();

  const [subtaskInputs, setSubtaskInputs] = useState<Record<string, string>>({});
  const [selectedAIGoal, setSelectedAIGoal] = useState<Goal | null>(null);

  const handleSubtaskAdd = (goalId: string) => {
    const text = subtaskInputs[goalId];
    if (!text || !text.trim()) return;
    addGoalSubtask(goalId, text.trim());
    setSubtaskInputs({ ...subtaskInputs, [goalId]: '' });
  };

  const handleScheduleSubtaskToToday = (goal: Goal, subtask: GoalSubtask) => {
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
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Goals Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
              Strategic Goals
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {goals.length} Active {goals.length === 1 ? 'Goal' : 'Goals'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            Turn Ambitions Into Daily Actionable Steps
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Break big milestones down into realistic, bite-sized tasks.
          </p>
        </div>

        <button
          id="goals-new-goal-btn"
          onClick={() => openGoalModal()}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ New Goal</span>
        </button>
      </div>

      {/* Empty State */}
      {goals.length === 0 ? (
        <div
          id="goals-empty-state-view"
          className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center"
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3.5">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
            What are you working toward?
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            Create your first goal and turn it into actionable tasks.
          </p>
          <button
            onClick={() => openGoalModal()}
            className="mt-5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Goal</span>
          </button>
        </div>
      ) : (
        /* Goals Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {goals.map((goal) => {
            const totalSteps = goal.tasks?.length || 0;
            const completedSteps = goal.tasks?.filter((t) => t.completed).length || 0;
            const progressPercent =
              totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
            const isCompleted = totalSteps > 0 && completedSteps === totalSteps;

            return (
              <div
                key={goal.id}
                className={`bg-white rounded-2xl border transition-all shadow-2xs overflow-hidden flex flex-col justify-between ${
                  isCompleted
                    ? 'border-emerald-200/80 bg-emerald-50/10'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                {/* Card Header */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
                          {goal.category}
                        </span>
                        {goal.targetDate && (
                          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            Target: {formatDisplayDate(goal.targetDate)}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                        {goal.title}
                      </h3>

                      {goal.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {goal.description}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => deleteGoal(goal.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors shrink-0"
                      title="Delete goal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Visual Progress Stats */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                      <span className="text-slate-600">
                        {completedSteps} / {totalSteps} tasks
                      </span>
                      <span
                        className={`font-black font-mono ${
                          isCompleted ? 'text-emerald-600' : 'text-indigo-600'
                        }`}
                      >
                        {progressPercent}%
                      </span>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="w-full bg-slate-200/80 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCompleted ? 'bg-emerald-600' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Subtasks breakdown */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Action Steps</span>
                      </span>
                      <button
                        type="button"
                        id={`ai-break-down-goal-btn-${goal.id}`}
                        onClick={() => setSelectedAIGoal(goal)}
                        className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                        title="Generate practical roadmap tasks with Gemini"
                      >
                        <Sparkles className="w-3 h-3 text-indigo-600" />
                        <span>AI Break Down Goal</span>
                      </button>
                    </div>

                    {totalSteps === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">
                        No action steps added yet. Add bite-sized steps below.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {goal.tasks.map((st) => {
                          const isScheduledInTasks = tasks.some(
                            (t) => t.goalSubtaskId === st.id && t.date === getTodayString()
                          );

                          return (
                            <div
                              key={st.id}
                              className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border text-xs transition-colors ${
                                st.completed
                                  ? 'bg-slate-50 border-slate-200/60 text-slate-400'
                                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => toggleGoalSubtask(goal.id, st.id)}
                                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                                    st.completed
                                      ? 'bg-indigo-600 border-indigo-600 text-white'
                                      : 'border-slate-300 hover:border-indigo-600 bg-white'
                                  }`}
                                >
                                  {st.completed && <Check className="w-3 h-3 stroke-[3]" />}
                                </button>
                                <span
                                  className={`font-medium line-clamp-1 ${
                                    st.completed ? 'line-through text-slate-400' : 'text-slate-900'
                                  }`}
                                >
                                  {st.title}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {!st.completed && (
                                  <button
                                    type="button"
                                    onClick={() => handleScheduleSubtaskToToday(goal, st)}
                                    disabled={isScheduledInTasks}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors ${
                                      isScheduledInTasks
                                        ? 'bg-slate-100 text-slate-400 cursor-default'
                                        : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 cursor-pointer'
                                    }`}
                                    title="Schedule to Today's Agenda"
                                  >
                                    <CalendarPlus className="w-3 h-3" />
                                    <span>{isScheduledInTasks ? 'Scheduled' : 'To Today'}</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => deleteGoalSubtask(goal.id, st.id)}
                                  className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors"
                                  title="Delete step"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Add new action step input */}
                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <input
                      type="text"
                      value={subtaskInputs[goal.id] || ''}
                      onChange={(e) =>
                        setSubtaskInputs({ ...subtaskInputs, [goal.id]: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSubtaskAdd(goal.id);
                        }
                      }}
                      placeholder="Add next actionable step..."
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600"
                    />
                    <button
                      onClick={() => handleSubtaskAdd(goal.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* AI Goal Breakdown Modal */}
      <AIGoalBreakdownModal
        goal={selectedAIGoal}
        onClose={() => setSelectedAIGoal(null)}
      />
    </div>
  );
};
