import React, { useState } from 'react';
import {
  ListTodo,
  Plus,
  Check,
  Trash2,
  Edit2,
  FolderKanban,
  Briefcase,
  User,
  ShoppingCart,
  Plane,
  Clock,
  Flag,
  CheckCircle2,
} from 'lucide-react';
import { usePlan } from '../../context/PlanContext';
import { Priority, Task } from '../../types';
import { formatTimeDisplay, formatDisplayDate } from '../../utils/dateUtils';

export const ListsView: React.FC = () => {
  const {
    lists,
    activeListId,
    setActiveListId,
    openListModal,
    deleteList,
    tasks,
    addTask,
    toggleTaskComplete,
    deleteTask,
    openTaskModal,
    openTaskDetails,
  } = usePlan();

  // Active list defaults to first list or activeListId
  const currentList = lists.find((l) => l.id === activeListId) || lists[0] || null;

  const [newItemText, setNewItemText] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');

  // Items belonging to current list
  const listTasks = currentList
    ? tasks.filter((t) => t.listId === currentList.id || t.category === currentList.name)
    : [];

  const completedCount = listTasks.filter((t) => t.completed).length;
  const totalCount = listTasks.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleQuickAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim() || !currentList) return;

    addTask({
      title: newItemText.trim(),
      category: currentList.name,
      listId: currentList.id,
      priority: newPriority,
      date: new Date().toISOString().split('T')[0],
    });

    setNewItemText('');
  };

  const getListIcon = (iconName: string) => {
    switch (iconName) {
      case 'Briefcase':
        return Briefcase;
      case 'User':
        return User;
      case 'ShoppingCart':
        return ShoppingCart;
      case 'Plane':
        return Plane;
      default:
        return FolderKanban;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Lists sidebar/selector */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Your Lists ({lists.length})
              </span>
              <button
                id="create-list-btn"
                onClick={() => openListModal()}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New List</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {lists.map((list) => {
                const isSelected = currentList?.id === list.id;
                const itemsCount = tasks.filter(
                  (t) => t.listId === list.id || t.category === list.name
                ).length;
                const IconComponent = getListIcon(list.iconName);

                return (
                  <button
                    key={list.id}
                    onClick={() => setActiveListId(list.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100/80 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div
                        className={`p-1.5 rounded-lg ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-white text-slate-600 shadow-2xs'
                        }`}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-sm truncate">{list.name}</span>
                    </div>

                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        isSelected ? 'bg-white/25 text-white' : 'bg-slate-200/80 text-slate-700'
                      }`}
                    >
                      {itemsCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Active list contents and tasks */}
        <div className="lg:col-span-8 space-y-4">
          {currentList ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              {/* List Banner Header */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                      {currentList.name}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                      {completedCount}/{totalCount} Completed
                    </span>
                  </div>
                  {currentList.description && (
                    <p className="text-xs text-slate-500 mt-1">{currentList.description}</p>
                  )}
                </div>

                {/* Progress bar */}
                <div className="w-full sm:w-48 bg-slate-200/70 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {/* Quick inline task add */}
              <form
                onSubmit={handleQuickAddItem}
                className="p-4 border-b border-slate-100 bg-white flex items-center gap-2"
              >
                <input
                  type="text"
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  placeholder={`Add new task to ${currentList.name}...`}
                  className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 flex items-center gap-1.5 transition-all shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Item</span>
                </button>
              </form>

              {/* Items List */}
              {listTasks.length === 0 ? (
                <div className="py-14 text-center px-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-2">
                    <ListTodo className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">This list is empty</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Type above to quickly add tasks or items to {currentList.name}.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {listTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors group ${
                        task.completed ? 'bg-slate-50/40 opacity-70' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button
                          onClick={() => toggleTaskComplete(task.id)}
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                            task.completed
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-slate-300 hover:border-indigo-600 bg-white'
                          }`}
                        >
                          {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>

                        <div
                          onClick={() => openTaskDetails(task)}
                          className="flex-1 min-w-0 cursor-pointer"
                        >
                          <span
                            className={`text-sm font-semibold tracking-tight hover:text-indigo-600 transition-colors ${
                              task.completed ? 'line-through text-slate-400' : 'text-slate-900'
                            }`}
                          >
                            {task.title}
                          </span>
                          {task.description && (
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              {task.description}
                            </p>
                          )}
                        </div>

                        {task.date && (
                          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                            {formatDisplayDate(task.date)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openTaskDetails(task)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Task details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
              <p className="text-sm font-semibold text-slate-600">No list selected</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
