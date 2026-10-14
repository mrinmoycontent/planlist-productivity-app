import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  Clock,
  Check,
  Flag,
  CheckCircle2,
} from 'lucide-react';
import { usePlan } from '../../context/PlanContext';
import { formatDateToISO, formatDisplayDate, formatTimeDisplay, getTodayString } from '../../utils/dateUtils';
import { Priority, Task } from '../../types';

export const CalendarView: React.FC = () => {
  const { tasks, toggleTaskComplete, openTaskModal, openTaskDetails } = usePlan();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(getTodayString());
  };

  // Build days for month grid
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
  const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Mon = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Selected date tasks
  const selectedDateTasks = tasks.filter((t) => t.date === selectedDate);
  const todayStr = getTodayString();

  const getPriorityBadge = (p: Priority) => {
    switch (p) {
      case 'high':
        return <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />;
      case 'medium':
        return <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />;
      case 'low':
        return <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 cols: Interactive Calendar Grid */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          {/* Calendar Header Controls */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                {monthNames[month]} {year}
              </h2>
              <p className="text-xs text-slate-500">Scheduled plans & deadlines</p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleToday}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                Today
              </button>
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                title="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                title="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 py-1">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Prev month fill */}
            {Array.from({ length: adjustedFirstDay }).map((_, i) => {
              const prevDayNum = daysInPrevMonth - adjustedFirstDay + i + 1;
              return (
                <div
                  key={`prev-${i}`}
                  className="h-20 p-1.5 rounded-xl bg-slate-50/40 text-slate-300 text-xs font-semibold select-none"
                >
                  {prevDayNum}
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const dayTasks = tasks.filter((t) => t.date === dateStr);
              const pendingCount = dayTasks.filter((t) => !t.completed).length;

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`min-h-20 p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/30 shadow-xs'
                      : isToday
                      ? 'border-indigo-200 bg-indigo-50/10'
                      : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                        isToday
                          ? 'bg-indigo-600 text-white'
                          : isSelected
                          ? 'text-indigo-700 font-extrabold'
                          : 'text-slate-700'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {pendingCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700">
                        {pendingCount}
                      </span>
                    )}
                  </div>

                  {/* Mini task dots / previews */}
                  <div className="space-y-1 mt-1">
                    {dayTasks.slice(0, 2).map((t) => (
                      <div
                        key={t.id}
                        className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium flex items-center gap-1 ${
                          t.completed
                            ? 'bg-slate-100 text-slate-400 line-through'
                            : 'bg-white border border-slate-200 text-slate-700 shadow-2xs'
                        }`}
                      >
                        {getPriorityBadge(t.priority)}
                        <span className="truncate">{t.title}</span>
                      </div>
                    ))}
                    {dayTasks.length > 2 && (
                      <span className="text-[9px] text-slate-400 font-semibold pl-1">
                        +{dayTasks.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 4 cols: Selected Date Agenda */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Schedule For
              </span>
              <h3 className="text-base font-bold text-slate-900">
                {formatDisplayDate(selectedDate)}
              </h3>
            </div>

            <button
              onClick={() => openTaskModal({ date: selectedDate })}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {selectedDateTasks.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-2">
                <CalendarDays className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-700">No tasks on this date</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Click Add to schedule a new task.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
              {selectedDateTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3 rounded-xl border transition-all ${
                    task.completed
                      ? 'bg-slate-50/70 border-slate-200 opacity-70'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <button
                      onClick={() => toggleTaskComplete(task.id)}
                      className={`mt-0.5 w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                        task.completed
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 hover:border-indigo-600 bg-white'
                      }`}
                    >
                      {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>

                    <div
                      onClick={() => openTaskDetails(task)}
                      className="flex-1 min-w-0 cursor-pointer"
                    >
                      <h4
                        className={`text-xs font-bold hover:text-indigo-600 transition-colors ${
                          task.completed ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        {task.title}
                      </h4>

                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                        {task.time && (
                          <span className="flex items-center gap-1 font-mono text-slate-600">
                            <Clock className="w-3 h-3" />
                            {formatTimeDisplay(task.time)}
                          </span>
                        )}
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                          {task.category}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
