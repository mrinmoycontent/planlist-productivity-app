import React, { useState } from 'react';
import {
  LayoutDashboard,
  CalendarCheck2,
  CheckSquare,
  Timer,
  Menu,
  X,
  ListTodo,
  CalendarDays,
  Target,
  StickyNote,
  BarChart3,
  Plus,
} from 'lucide-react';
import { usePlan } from '../context/PlanContext';
import { ViewType } from '../types';

export const MobileNav: React.FC = () => {
  const { activeView, setActiveView, openTaskModal, reviewMetrics, focusState } = usePlan();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const mainTabs: { id: ViewType; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'planner', label: 'Planner', icon: CalendarCheck2 },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'focus', label: 'Focus', icon: Timer },
  ];

  const drawerTabs: { id: ViewType; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'lists', label: 'Lists', icon: ListTodo },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'goals', label: 'Goals', icon: Target, badge: reviewMetrics.activeGoalsCount },
    { id: 'notes', label: 'Notes', icon: StickyNote },
    { id: 'analytics', label: 'Analytics & Review', icon: BarChart3 },
  ];

  return (
    <>
      {/* Drawer Overlay for Mobile */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMenuOpen(false)}
        >
          <div 
            className="absolute bottom-16 left-0 right-0 bg-white rounded-t-2xl p-4 shadow-xl border-t border-slate-200 space-y-2 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                More Views
              </span>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 py-1">
              {drawerTabs.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id);
                      setIsMenuOpen(false);
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded-xl text-xs font-semibold text-left transition-colors ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-auto px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px]">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button for Mobile Add */}
      <div className="fixed bottom-20 right-4 z-30 lg:hidden">
        <button
          id="mobile-quick-add-task-btn"
          onClick={() => openTaskModal()}
          className="w-12 h-12 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Fixed Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 lg:hidden px-2 py-1.5 flex items-center justify-around">
        {mainTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveView(tab.id);
                setIsMenuOpen(false);
              }}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
                isActive ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {tab.id === 'focus' && focusState.isRunning && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                )}
              </div>
              <span className="text-[10px] mt-0.5">{tab.label}</span>
            </button>
          );
        })}

        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
            isMenuOpen || drawerTabs.some((t) => t.id === activeView)
              ? 'text-indigo-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">More</span>
        </button>
      </div>
    </>
  );
};
