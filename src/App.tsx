import React, { useState } from 'react';
import { PlanProvider, usePlan } from './context/PlanContext';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { Header } from './components/Header';
import { AuthScreen } from './components/AuthScreen';
import { DashboardView } from './components/views/DashboardView';
import { PlannerView } from './components/views/PlannerView';
import { TasksView } from './components/views/TasksView';
import { ListsView } from './components/views/ListsView';
import { CalendarView } from './components/views/CalendarView';
import { GoalsView } from './components/views/GoalsView';
import { FocusView } from './components/views/FocusView';
import { NotesView } from './components/views/NotesView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { TaskModal } from './components/modals/TaskModal';
import { TaskDetailsModal } from './components/modals/TaskDetailsModal';
import { GoalModal } from './components/modals/GoalModal';
import { ListModal } from './components/modals/ListModal';
import { PlanMyDayModal } from './components/modals/PlanMyDayModal';
import { AuthModal } from './components/modals/AuthModal';
import { SyncStatusToast } from './components/SyncStatusToast';
import { RlsHelpModal } from './components/modals/RlsHelpModal';
import { ResetPasswordScreen } from './components/ResetPasswordScreen';
import { Loader2 } from 'lucide-react';

const MainLayout: React.FC = () => {
  const {
    activeView,
    currentUser,
    authLoading,
    authViewMode,
    isPasswordRecoveryActive,
    setIsPasswordRecoveryActive,
    setAuthViewMode,
  } = usePlan();
  const [guestBypass, setGuestBypass] = useState(false);
  const [currentPath, setCurrentPath] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  React.useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const isResetPasswordRoute =
    currentPath === '/reset-password' ||
    currentPath.startsWith('/reset-password') ||
    isPasswordRecoveryActive ||
    (typeof window !== 'undefined' &&
      (window.location.hash.includes('type=recovery') ||
        window.location.search.includes('type=recovery')));

  // 1. Public /reset-password Route & PASSWORD_RECOVERY screen
  if (isResetPasswordRoute) {
    return (
      <ResetPasswordScreen
        onReturnToSignIn={() => {
          setIsPasswordRecoveryActive(false);
          setAuthViewMode('signin');
          setCurrentPath('/');
          if (typeof window !== 'undefined') {
            window.history.pushState(null, '', '/');
          }
        }}
        onRequestNewLink={() => {
          setIsPasswordRecoveryActive(false);
          setAuthViewMode('forgot');
          setCurrentPath('/');
          if (typeof window !== 'undefined') {
            window.history.pushState(null, '', '/');
          }
        }}
      />
    );
  }

  // 2. Initial Session Loading Check
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
          <Loader2 className="w-6 h-6 animate-spin text-white" />
        </div>
        <p className="text-sm font-semibold tracking-wide text-slate-300">Checking PlanList session...</p>
      </div>
    );
  }

  // 3. Logged-out user sees the polished full-page SaaS authentication screen
  // (with option to explore offline demo if desired)
  if (!currentUser && !guestBypass) {
    return (
      <AuthScreen
        initialMode={authViewMode === 'forgot' ? 'forgot' : 'signin'}
        onEnterGuest={() => setGuestBypass(true)}
      />
    );
  }

  // 4. Logged-in user enters the PlanList dashboard
  const getViewDetails = () => {
    switch (activeView) {
      case 'dashboard':
        return { title: 'Dashboard', subtitle: "Today's productivity overview & actionable agenda" };
      case 'planner':
        return { title: 'My Planner', subtitle: 'Organize Today, Tomorrow, and This Week' };
      case 'tasks':
        return { title: 'Tasks', subtitle: 'Manage, search, and execute your action items' };
      case 'lists':
        return { title: 'Lists', subtitle: 'Categorized collections for Work, Personal, and Projects' };
      case 'calendar':
        return { title: 'Calendar', subtitle: 'Visualize scheduled tasks and deadlines across the month' };
      case 'goals':
        return { title: 'Goals', subtitle: 'Break down high-level objectives into daily actionable tasks' };
      case 'focus':
        return { title: 'Focus Session', subtitle: '25-minute Pomodoro deep work countdown' };
      case 'notes':
        return { title: 'Notes', subtitle: 'Quick thought capture and convert notes to actionable tasks' };
      case 'analytics':
        return { title: 'Review & Analytics', subtitle: 'Planned vs completed tasks, carried forward, and completion rate' };
      default:
        return { title: 'PlanList', subtitle: 'Goal to daily action planner' };
    }
  };

  const { title, subtitle } = getViewDetails();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-12">
        <Header title={title} subtitle={subtitle} />

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {activeView === 'dashboard' && <DashboardView />}
          {activeView === 'planner' && <PlannerView />}
          {activeView === 'tasks' && <TasksView />}
          {activeView === 'lists' && <ListsView />}
          {activeView === 'calendar' && <CalendarView />}
          {activeView === 'goals' && <GoalsView />}
          {activeView === 'focus' && <FocusView />}
          {activeView === 'notes' && <NotesView />}
          {activeView === 'analytics' && <AnalyticsView />}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />

      {/* Modals & Cloud Sync Toast */}
      <TaskModal />
      <TaskDetailsModal />
      <GoalModal />
      <ListModal />
      <PlanMyDayModal />
      <AuthModal />
      <SyncStatusToast />
      <RlsHelpModal />
    </div>
  );
};

export default function App() {
  return (
    <PlanProvider>
      <MainLayout />
    </PlanProvider>
  );
}
