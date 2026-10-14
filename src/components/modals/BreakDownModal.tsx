import React, { useState } from 'react';
import { X, Sparkles, Plus, Trash2, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { Task } from '../../types';
import { usePlan } from '../../context/PlanContext';
import { getTodayString } from '../../utils/dateUtils';

interface BreakDownModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BreakDownModal: React.FC<BreakDownModalProps> = ({ task, isOpen, onClose }) => {
  const { addTask, updateTask } = usePlan();

  if (!isOpen || !task) return null;

  // Initialize initial smart breakdown steps
  const generateInitialSteps = () => {
    const title = task.title.toLowerCase();
    if (title.includes('presentation') || title.includes('deck') || title.includes('slides')) {
      return [
        { id: '1', title: 'Outline core message and 3 key takeaways', duration: 15 },
        { id: '2', title: 'Design visual slides and structure content', duration: 30 },
        { id: '3', title: 'Dry-run speech and refine timing', duration: 20 },
      ];
    }
    if (title.includes('review') || title.includes('audit') || title.includes('pr')) {
      return [
        { id: '1', title: 'Review requirements and checklist', duration: 15 },
        { id: '2', title: 'Test edge cases and line-by-line inspection', duration: 25 },
        { id: '3', title: 'Document feedback and approve/action changes', duration: 15 },
      ];
    }
    if (title.includes('launch') || title.includes('deploy') || title.includes('release')) {
      return [
        { id: '1', title: 'Run pre-flight checks & smoke tests', duration: 20 },
        { id: '2', title: 'Execute release checklist & verify endpoints', duration: 25 },
        { id: '3', title: 'Monitor metrics and notify stakeholders', duration: 15 },
      ];
    }
    return [
      { id: '1', title: `Phase 1: Define scope & gather inputs for "${task.title}"`, duration: 20 },
      { id: '2', title: `Phase 2: Complete the core implementation work`, duration: 35 },
      { id: '3', title: `Phase 3: Verify results, polish, and wrap up`, duration: 15 },
    ];
  };

  const [steps, setSteps] = useState(generateInitialSteps());
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepDuration, setNewStepDuration] = useState(20);

  const handleAddStep = () => {
    if (!newStepTitle.trim()) return;
    setSteps([
      ...steps,
      { id: `step-${Date.now()}`, title: newStepTitle.trim(), duration: newStepDuration },
    ]);
    setNewStepTitle('');
  };

  const handleRemoveStep = (id: string) => {
    setSteps(steps.filter((s) => s.id !== id));
  };

  const handleSaveAsTasks = () => {
    const today = getTodayString();
    // Add sub-steps as individual actionable tasks
    steps.forEach((s) => {
      addTask({
        title: s.title,
        description: `Sub-step of: ${task.title}`,
        date: task.date || today,
        durationMinutes: s.duration,
        priority: task.priority,
        category: task.category,
        goalId: task.goalId,
        listId: task.listId,
      });
    });

    // Mark original parent task notes or complete/update
    updateTask(task.id, {
      description: (task.description ? task.description + '\n' : '') + `Broken down into ${steps.length} actionable subtasks.`,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        id="breakdown-modal-container"
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Break Down Task</span>
            </div>
            <h3 className="text-base font-extrabold text-slate-900 line-clamp-1 mt-0.5">
              {task.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <p className="text-xs text-slate-500 leading-relaxed">
            Deconstruct this task into 15–30 minute bite-sized micro-actions. Once confirmed, these will be scheduled directly into your daily agenda.
          </p>

          <div className="space-y-2">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className="flex items-center justify-between gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-white hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={step.title}
                    onChange={(e) => {
                      const updated = [...steps];
                      updated[idx].title = e.target.value;
                      setSteps(updated);
                    }}
                    className="flex-1 text-xs font-semibold text-slate-800 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {step.duration}m
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(step.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                    title="Remove step"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add custom step */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <input
              type="text"
              value={newStepTitle}
              onChange={(e) => setNewStepTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddStep();
                }
              }}
              placeholder="Add another micro-action step..."
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
            />
            <select
              value={newStepDuration}
              onChange={(e) => setNewStepDuration(Number(e.target.value))}
              className="px-2.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-indigo-600"
            >
              <option value={15}>15m</option>
              <option value={20}>20m</option>
              <option value={30}>30m</option>
              <option value={45}>45m</option>
            </select>
            <button
              type="button"
              onClick={handleAddStep}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Total: {steps.reduce((sum, s) => sum + s.duration, 0)} minutes ({steps.length} steps)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAsTasks}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Schedule Micro-Actions</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
