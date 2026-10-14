import React, { useState } from 'react';
import { X, Calendar, Clock, ArrowRight, Check } from 'lucide-react';
import { Task } from '../../types';
import { getTodayString, getTomorrowString, getUpcomingMonday, formatDisplayDate } from '../../utils/dateUtils';

interface RescheduleModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onReschedule: (taskId: string, newDate: string, newTime?: string) => void;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  task,
  isOpen,
  onClose,
  onReschedule,
}) => {
  if (!isOpen || !task) return null;

  const todayStr = getTodayString();
  const tomorrowStr = getTomorrowString();
  const upcomingMonday = getUpcomingMonday();

  const [selectedDate, setSelectedDate] = useState(task.date || todayStr);
  const [selectedTime, setSelectedTime] = useState(task.time || '');

  const handleApply = (date: string, time?: string) => {
    onReschedule(task.id, date, time !== undefined ? time : selectedTime);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        id="reschedule-modal-container"
        className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Reschedule Task</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs text-slate-500 font-medium">Task</p>
            <p className="text-sm font-semibold text-slate-800 line-clamp-1 mt-0.5">{task.title}</p>
          </div>

          {/* Quick presets */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Quick Reschedule
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleApply(todayStr)}
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all text-center ${
                  selectedDate === todayStr
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleApply(tomorrowStr)}
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all text-center ${
                  selectedDate === tomorrowStr
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => handleApply(upcomingMonday)}
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all text-center ${
                  selectedDate === upcomingMonday
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Next Week
              </button>
            </div>
          </div>

          {/* Custom Date & Time Picker */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Specific Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Time (Optional)
              </label>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleApply(selectedDate, selectedTime)}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-2xs"
            >
              Confirm Reschedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
