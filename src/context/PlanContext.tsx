import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import {
  CustomList,
  Goal,
  GoalSubtask,
  Note,
  Priority,
  Task,
  TaskStatus,
  EnergyLevel,
  TaskCategory,
  ViewType,
  FocusSessionState,
  GeneratedPlan,
  PlanDay,
  PlanFormInput,
  PlanTaskItem,
} from '../types';
import { INITIAL_GOALS, INITIAL_LISTS, INITIAL_NOTES, INITIAL_TASKS, INITIAL_PLANS } from '../data/initialData';
import { getTodayString, addDays } from '../utils/dateUtils';
import { generatePlanBreakdown } from '../utils/planGenerator';
import {
  isSupabaseConfigured,
  supabase,
  dbFetchTasks,
  dbCreateTask,
  dbUpdateTask,
  dbUpsertTask,
  dbDeleteTask,
  dbBulkUpdateTaskPriority,
  dbBulkUpdateTaskList,
  dbBulkUpdateTaskStatus,
  dbBulkUpdateTaskDueDate,
  dbBulkDeleteTasks,
  dbFetchLists,
  dbCreateList,
  dbUpsertList,
  dbDeleteList,
  dbFetchGoals,
  dbUpsertGoal,
  dbDeleteGoal,
  dbFetchPlans,
  dbUpsertPlan,
  dbDeletePlan,
  dbFetchNotes,
  dbUpsertNote,
  dbDeleteNote,
  isValidUUID,
  generateUUID,
} from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { formatAuthError } from '../lib/authErrors';

export interface TaskInput {
  title: string;
  description?: string;
  notes?: string;
  date?: string;
  time?: string;
  durationMinutes?: number;
  priority?: Priority;
  energyLevel?: EnergyLevel;
  status?: TaskStatus;
  category?: TaskCategory;
  listId?: string;
  goalId?: string;
  goalSubtaskId?: string;
  planId?: string;
  parentTaskId?: string | null;
}

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';

interface PlanContextType {
  // Navigation
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;

  // Supabase Auth & Cloud Sync
  currentUser: User | null;
  authLoading: boolean;
  isSupabaseReady: boolean;
  syncStatus: SyncStatus;
  syncError: string | null;
  lastSavedAt: Date | null;
  isAuthModalOpen: boolean;
  authModalMode: 'signin' | 'signup' | 'forgot' | 'reset';
  authViewMode: 'signin' | 'signup' | 'forgot' | 'reset';
  setAuthViewMode: (mode: 'signin' | 'signup' | 'forgot' | 'reset') => void;
  isPasswordRecoveryActive: boolean;
  setIsPasswordRecoveryActive: (active: boolean) => void;
  recoverySessionDetected: boolean;
  setRecoverySessionDetected: (detected: boolean) => void;
  lastAuthEvent: string | null;
  openAuthModal: (mode?: 'signin' | 'signup' | 'forgot' | 'reset') => void;
  closeAuthModal: () => void;
  signIn: (email: string, password: string) => Promise<{ error?: string; user?: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error?: string; needsEmailConfirmation?: boolean; user?: any }>;
  signOut: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<{ error?: string; success?: boolean }>;
  updateUserPassword: (password: string) => Promise<{ error?: string; success?: boolean }>;
  dismissSyncError: () => void;
  retryLastSync: () => void;
  refreshDataFromSupabase: () => Promise<void>;
  isRlsModalOpen: boolean;
  openRlsModal: () => void;
  closeRlsModal: () => void;

  // Plans (Plan -> Break Down -> Schedule -> Execute -> Review)
  plans: GeneratedPlan[];
  activePlan: GeneratedPlan | null;
  setActivePlan: (plan: GeneratedPlan | null) => void;
  isPlanGeneratorOpen: boolean;
  planGeneratorInitialGoal?: string;
  openPlanGenerator: (initialGoal?: string) => void;
  closePlanGenerator: () => void;
  createPlan: (input: PlanFormInput) => GeneratedPlan;
  updatePlan: (id: string, updates: Partial<GeneratedPlan>) => void;
  deletePlan: (id: string) => void;
  schedulePlan: (planId: string, startDate?: string) => { scheduledTasksCount: number };
  updatePlanTaskItem: (planId: string, dayNumber: number, taskId: string, updates: Partial<PlanTaskItem>) => void;
  addPlanTaskItem: (planId: string, dayNumber: number, title: string, durationMinutes: number) => void;
  deletePlanTaskItem: (planId: string, dayNumber: number, taskId: string) => void;
  addPlanDay: (planId: string) => void;
  deletePlanDay: (planId: string, dayNumber: number) => void;

  // Tasks
  tasks: Task[];
  addTask: (input: TaskInput) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  applyDailySchedule: (scheduleItems: Array<{ id: string; date: string; time?: string | null; durationMinutes: number; priority?: Priority }>) => Promise<void>;
  deleteTask: (id: string) => void;
  toggleTaskComplete: (id: string) => void;
  duplicateTask: (id: string) => Task;
  getSubtasks: (parentTaskId: string) => Task[];

  // Bulk Selection Operations
  bulkUpdatePriority: (taskIds: string[], priority: Priority) => Promise<{ success: boolean; error?: string }>;
  bulkMoveToList: (taskIds: string[], listId: string | null) => Promise<{ success: boolean; error?: string }>;
  bulkUpdateStatus: (taskIds: string[], status: TaskStatus) => Promise<{ success: boolean; error?: string }>;
  bulkReschedule: (taskIds: string[], dueDate: string) => Promise<{ success: boolean; error?: string }>;
  bulkDeleteTasks: (taskIds: string[]) => Promise<{ success: boolean; error?: string }>;

  // Task Details Workspace
  selectedTaskId: string | null;
  selectedTask: Task | null;
  isTaskDetailsOpen: boolean;
  openTaskDetails: (taskIdOrTask: string | Task) => void;
  closeTaskDetails: () => void;

  // Custom Lists
  lists: CustomList[];
  activeListId: string | null;
  setActiveListId: (id: string | null) => void;
  addList: (name: string, color: string, iconName?: string, description?: string) => CustomList;
  updateList: (id: string, updates: Partial<CustomList>) => void;
  deleteList: (id: string) => void;

  // Goals
  goals: Goal[];
  addGoal: (title: string, description: string, category: TaskCategory, targetDate: string, initialTasks?: string[]) => Goal;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  toggleGoalSubtask: (goalId: string, subtaskId: string) => void;
  addGoalSubtask: (goalId: string, taskTitle: string, dueDate?: string) => void;
  deleteGoalSubtask: (goalId: string, subtaskId: string) => void;
  convertSubtaskToTask: (goalId: string, subtaskId: string, date?: string) => void;

  // Notes
  notes: Note[];
  addNote: (title: string, content: string, category?: TaskCategory) => Note;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  togglePinNote: (id: string) => void;
  convertNoteToTask: (noteContent: string) => void;

  // Focus
  focusState: FocusSessionState;
  startFocus: (taskId?: string, customTopic?: string, minutes?: number) => void;
  pauseFocus: () => void;
  resumeFocus: () => void;
  resetFocus: () => void;
  markFocusTaskComplete: () => void;
  setFocusDuration: (minutes: number) => void;

  // Modal triggers
  isTaskModalOpen: boolean;
  openTaskModal: (initialData?: Partial<Task>) => void;
  closeTaskModal: () => void;
  editingTask: Task | null;

  isGoalModalOpen: boolean;
  openGoalModal: () => void;
  closeGoalModal: () => void;

  isListModalOpen: boolean;
  openListModal: () => void;
  closeListModal: () => void;

  // Review / Analytics metrics
  reviewMetrics: {
    planned: number;
    completed: number;
    carriedForward: number;
    completionRate: number;
    todayTotal: number;
    todayCompleted: number;
    todayPending: number;
    activeGoalsCount: number;
    todayPlannedMinutes: number;
    todayCompletedMinutes: number;
    todayRemainingMinutes: number;
    carriedForwardMinutes: number;
  };

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

const LOCAL_STORAGE_KEYS = {
  TASKS: 'planlist_tasks_v1',
  LISTS: 'planlist_lists_v1',
  GOALS: 'planlist_goals_v1',
  NOTES: 'planlist_notes_v1',
  FOCUS: 'planlist_focus_v1',
  PLANS: 'planlist_plans_v1',
};

export const PlanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);

  // Plan Generator modal & active plan
  const [isPlanGeneratorOpen, setIsPlanGeneratorOpen] = useState(false);
  const [planGeneratorInitialGoal, setPlanGeneratorInitialGoal] = useState<string | undefined>(undefined);

  // Supabase Auth & Cloud Sync State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isRlsModalOpen, setIsRlsModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'forgot' | 'reset'>('signin');
  const [authViewMode, setAuthViewMode] = useState<'signin' | 'signup' | 'forgot' | 'reset'>('signin');
  const [isPasswordRecoveryActive, setIsPasswordRecoveryActive] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.location.pathname.startsWith('/reset-password') ||
      window.location.hash.includes('type=recovery') ||
      window.location.search.includes('type=recovery')
    );
  });
  const [recoverySessionDetected, setRecoverySessionDetected] = useState<boolean>(false);
  const [lastAuthEvent, setLastAuthEvent] = useState<string | null>(null);

  const savedTimeoutRef = useRef<any>(null);
  const lastFailedSyncRef = useRef<(() => Promise<void>) | null>(null);

  // Initialize Plans
  const [plans, setPlans] = useState<GeneratedPlan[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.PLANS);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_PLANS;
  });

  const [activePlan, setActivePlan] = useState<GeneratedPlan | null>(() => {
    return plans.length > 0 ? plans[0] : null;
  });

  // Initialize Tasks
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.TASKS);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_TASKS;
  });

  // Initialize Lists
  const [lists, setLists] = useState<CustomList[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.LISTS);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_LISTS;
  });

  // Initialize Goals
  const [goals, setGoals] = useState<Goal[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.GOALS);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_GOALS;
  });

  // Initialize Notes
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.NOTES);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_NOTES;
  });

  // Initialize Focus state
  const [focusState, setFocusState] = useState<FocusSessionState>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.FOCUS);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          isRunning: false, // Don't auto-run on refresh
        };
      }
    } catch (e) {
      console.error(e);
    }
    return {
      currentTaskId: null,
      customTopic: 'Deep Focus Session',
      durationMinutes: 25,
      remainingSeconds: 25 * 60,
      isRunning: false,
      sessionsCompletedToday: 2,
      totalMinutesToday: 50,
    };
  });

  // LocalStorage sync effects (always keep local cache up-to-date)
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.LISTS, JSON.stringify(lists));
  }, [lists]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.GOALS, JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.NOTES, JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.FOCUS, JSON.stringify(focusState));
  }, [focusState]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.PLANS, JSON.stringify(plans));
  }, [plans]);

  // Focus Timer interval effect
  useEffect(() => {
    let interval: any = null;
    if (focusState.isRunning && focusState.remainingSeconds > 0) {
      interval = setInterval(() => {
        setFocusState((prev) => {
          if (prev.remainingSeconds <= 1) {
            return {
              ...prev,
              remainingSeconds: 0,
              isRunning: false,
              sessionsCompletedToday: prev.sessionsCompletedToday + 1,
              totalMinutesToday: prev.totalMinutesToday + prev.durationMinutes,
            };
          }
          return {
            ...prev,
            remainingSeconds: prev.remainingSeconds - 1,
          };
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [focusState.isRunning, focusState.remainingSeconds]);

  // =========================================================================
  // Supabase Auth & Cloud Data Loading
  // =========================================================================

  const loadUserDataFromSupabase = async (userId: string) => {
    if (!supabase) return;
    try {
      setSyncStatus('saving');
      setSyncError(null);

      const [fetchedTasks, fetchedLists, fetchedGoals, fetchedPlans, fetchedNotes] = await Promise.all([
        dbFetchTasks(userId),
        dbFetchLists(userId),
        dbFetchGoals(userId),
        dbFetchPlans(userId),
        dbFetchNotes(userId),
      ]);

      // If user has no tasks in Supabase yet, seed the initial starter tasks into their account
      if (fetchedTasks.length === 0 && tasks.length > 0) {
        const idMap = new Map<string, string>();
        // 1. Root tasks first
        const rootTasks = tasks.filter((t) => !t.parentTaskId);
        for (const rootTask of rootTasks) {
          try {
            const saved = await dbCreateTask(rootTask, userId);
            idMap.set(rootTask.id, saved.id);
            fetchedTasks.push(saved);
          } catch (e) {
            console.warn('Could not seed root task:', e);
          }
        }
        // 2. Child tasks with parent_task_id mapped to the real Supabase UUID
        const childTasks = tasks.filter((t) => Boolean(t.parentTaskId));
        for (const childTask of childTasks) {
          try {
            const realParentId = childTask.parentTaskId
              ? idMap.get(childTask.parentTaskId) || (isValidUUID(childTask.parentTaskId) ? childTask.parentTaskId : null)
              : null;
            const saved = await dbCreateTask({ ...childTask, parentTaskId: realParentId }, userId);
            idMap.set(childTask.id, saved.id);
            fetchedTasks.push(saved);
          } catch (e) {
            console.warn('Could not seed child task:', e);
          }
        }
      }

      // If user has no lists in Supabase yet, seed default lists
      if (fetchedLists.length === 0 && lists.length > 0) {
        for (const l of lists) {
          try {
            const saved = await dbCreateList(l, userId);
            fetchedLists.push(saved);
          } catch (e) {
            console.warn('Could not seed initial list:', e);
          }
        }
      }

      // Set user's isolated data from Supabase
      setTasks(fetchedTasks);
      setLists(fetchedLists);
      setGoals(fetchedGoals);
      setPlans(fetchedPlans);
      if (fetchedPlans.length > 0) {
        setActivePlan(fetchedPlans[0]);
      } else {
        setActivePlan(null);
      }
      setNotes(fetchedNotes);

      setSyncStatus('saved');
      setLastSavedAt(new Date());
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
      savedTimeoutRef.current = setTimeout(() => {
        setSyncStatus('idle');
      }, 2000);
    } catch (err: any) {
      console.error('Error loading data from Supabase:', err);
      setSyncStatus('error');
      setSyncError(err?.message || 'Failed to load user data from Supabase backend.');
    }
  };

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    // 1. Initial Session Check (persists session on browser refresh)
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Auth session error:', error);
      }
      const isRecovery =
        typeof window !== 'undefined' &&
        (window.location.pathname.startsWith('/reset-password') ||
          window.location.hash.includes('type=recovery') ||
          window.location.search.includes('type=recovery') ||
          isPasswordRecoveryActive);

      if (session?.user) {
        setCurrentUser(session.user);
        if (!isRecovery) {
          loadUserDataFromSupabase(session.user.id);
        } else {
          setIsPasswordRecoveryActive(true);
          setRecoverySessionDetected(true);
        }
      }
      setAuthLoading(false);
    });

    // 2. Register ONE global auth listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setLastAuthEvent(event);
      const isRecoveryRoute =
        isPasswordRecoveryActive ||
        (typeof window !== 'undefined' &&
          (window.location.pathname.startsWith('/reset-password') ||
            window.location.hash.includes('type=recovery') ||
            window.location.search.includes('type=recovery')));

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecoveryActive(true);
        setRecoverySessionDetected(true);
        if (session?.user) {
          setCurrentUser(session.user);
        }
        setAuthLoading(false);
        return;
      }
      if (session?.user) {
        setCurrentUser(session.user);
        if (isRecoveryRoute) {
          setIsPasswordRecoveryActive(true);
          setRecoverySessionDetected(true);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          loadUserDataFromSupabase(session.user.id);
        }
      } else {
        if (!isRecoveryRoute) {
          setCurrentUser(null);
        }
      }
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Helper to execute instant background sync to Supabase
  const executeSync = (
    opName: string,
    syncFn: (userId: string) => Promise<void>
  ) => {
    if (!currentUser || !isSupabaseConfigured) {
      // Local state is already updated; no user session to sync to
      return;
    }

    setSyncStatus('saving');
    setSyncError(null);

    const run = async () => {
      try {
        let authId = currentUser.id;
        if (supabase) {
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session?.user?.id) {
              authId = sessionData.session.user.id;
            }
          } catch {
            // ignore
          }
        }
        await syncFn(authId);
        setSyncStatus('saved');
        setLastSavedAt(new Date());
        if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
        savedTimeoutRef.current = setTimeout(() => {
          setSyncStatus('idle');
        }, 2000);
      } catch (err: any) {
        const isRls =
          err?.code === '42501' ||
          err?.isRlsError ||
          err?.message?.includes('row-level security') ||
          err?.message?.includes('42501');

        if (isRls) {
          console.warn(
            `[Supabase Sync] ${opName} preserved locally. Remote database requires an INSERT policy in Supabase. Run supabase-schema.sql in your Supabase SQL editor.`
          );
          setSyncStatus('error');
          setSyncError(
            'Supabase RLS setup required: Table "tasks" needs an INSERT policy. Click "Fix RLS" to view the SQL script.'
          );
        } else {
          console.error(`Sync error (${opName}):`, err);
          setSyncStatus('error');
          setSyncError(err?.message || `Failed to save ${opName} to Supabase.`);
        }
        lastFailedSyncRef.current = run;
      }
    };

    run();
  };

  const openRlsModal = () => setIsRlsModalOpen(true);
  const closeRlsModal = () => setIsRlsModalOpen(false);

  const dismissSyncError = () => {
    setSyncError(null);
    setSyncStatus('idle');
  };

  const retryLastSync = () => {
    if (lastFailedSyncRef.current) {
      lastFailedSyncRef.current();
    }
  };

  const refreshDataFromSupabase = async () => {
    if (currentUser) {
      await loadUserDataFromSupabase(currentUser.id);
    }
  };

  // Auth Modal Controls
  const openAuthModal = (mode: 'signin' | 'signup' | 'forgot' | 'reset' = 'signin') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return { error: 'Supabase is not configured. Please verify your Supabase project settings.' };
    }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: formatAuthError(error) };
      if (data.user) {
        setCurrentUser(data.user);
        loadUserDataFromSupabase(data.user.id);
      }
      return { user: data.user };
    } catch (err: any) {
      return { error: formatAuthError(err) };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    if (!supabase) {
      return { error: 'Supabase is not configured. Please verify your Supabase project settings.' };
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || '',
          },
        },
      });
      if (error) return { error: formatAuthError(error) };
      const needsEmailConfirmation = !data.session;
      if (data.user && data.session) {
        setCurrentUser(data.user);
        loadUserDataFromSupabase(data.user.id);
      }
      return { user: data.user, needsEmailConfirmation };
    } catch (err: any) {
      return { error: formatAuthError(err) };
    }
  };

  const sendPasswordResetEmail = async (email: string) => {
    if (!supabase) {
      return { error: 'Supabase is not configured. Please verify your Supabase project settings.' };
    }
    try {
      const redirectTo = `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) return { error: formatAuthError(error) };
      return { success: true };
    } catch (err: any) {
      return { error: formatAuthError(err) };
    }
  };

  const updateUserPassword = async (password: string) => {
    if (!supabase) {
      return { error: 'Supabase is not configured. Please verify your Supabase project settings.' };
    }
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return { error: formatAuthError(error) };
      return { success: true };
    } catch (err: any) {
      return { error: formatAuthError(err) };
    }
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    setIsPasswordRecoveryActive(false);
    setRecoverySessionDetected(false);
    // Reset to clean workspace for next user
    setTasks(INITIAL_TASKS);
    setLists(INITIAL_LISTS);
    setGoals(INITIAL_GOALS);
    setPlans(INITIAL_PLANS);
    setActivePlan(INITIAL_PLANS[0] || null);
    setNotes(INITIAL_NOTES);
    setSyncStatus('idle');
    setSyncError(null);
  };

  // =========================================================================
  // Task Operations (Optimistic UI + Immediate Supabase Sync)
  // =========================================================================

  const addTask = (input: TaskInput): Task => {
    const today = getTodayString();
    const isDone = input.status === 'completed';
    // Use standard RFC4122 v4 UUID for initial optimistic client state
    const localId = generateUUID();
    const newTask: Task = {
      id: localId,
      title: input.title.trim(),
      description: input.description?.trim() || '',
      notes: input.notes?.trim() || '',
      completed: isDone,
      status: input.status || (isDone ? 'completed' : 'todo'),
      date: input.date || today,
      time: input.time || '',
      durationMinutes: input.durationMinutes,
      priority: input.priority || 'medium',
      energyLevel: input.energyLevel || 'medium',
      category: input.category || 'Work',
      listId: input.listId,
      goalId: input.goalId,
      goalSubtaskId: input.goalSubtaskId,
      planId: input.planId,
      parentTaskId: input.parentTaskId || null,
      completedAt: isDone ? new Date().toISOString() : undefined,
      createdAt: today,
      updatedAt: today,
    };

    setTasks((prev) => [newTask, ...prev]);

    executeSync('task creation', async (userId) => {
      // If this is a subtask, ensure its parent task has a genuine PostgreSQL UUID
      let effectiveParentTaskId: string | null = null;
      if (newTask.parentTaskId) {
        if (isValidUUID(newTask.parentTaskId)) {
          effectiveParentTaskId = newTask.parentTaskId;
        } else {
          // Parent task has a local or legacy ID; find it and upsert it to get its real Supabase UUID!
          const currentParent = tasks.find((t) => t.id === newTask.parentTaskId);
          if (currentParent) {
            const savedParent = await dbUpsertTask(currentParent, userId);
            if (savedParent && isValidUUID(savedParent.id)) {
              effectiveParentTaskId = savedParent.id;
              setTasks((prev) =>
                prev.map((t) =>
                  t.id === currentParent.id
                    ? { ...t, ...savedParent, id: savedParent.id }
                    : t.parentTaskId === currentParent.id
                    ? { ...t, parentTaskId: savedParent.id }
                    : t
                )
              );
              setSelectedTaskId((curr) => (curr === currentParent.id ? savedParent.id : curr));
            }
          }
        }
      }

      const taskToInsert = {
        ...newTask,
        parentTaskId: effectiveParentTaskId || (isValidUUID(newTask.parentTaskId) ? newTask.parentTaskId : null),
      };

      // Supabase generates the authoritative UUID on insert
      const createdRow = await dbCreateTask(taskToInsert, userId);
      // Immediately replace localId with the PostgreSQL/Supabase-generated UUID in frontend state
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === localId) {
            return {
              ...createdRow,
              ...t,
              id: createdRow.id,
              parentTaskId: effectiveParentTaskId || t.parentTaskId,
            };
          }
          if (t.parentTaskId === localId) {
            return { ...t, parentTaskId: createdRow.id };
          }
          return t;
        })
      );
      setSelectedTaskId((curr) => (curr === localId ? createdRow.id : curr));
    });

    return newTask;
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    let updatedTaskRecord: Task | null = null;
    const nowIso = new Date().toISOString();
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === id) {
          const updated: Task = { ...task, ...updates, updatedAt: nowIso };

          // Synchronize status and completed
          if (updates.status !== undefined) {
            if (updates.status === 'completed') {
              updated.completed = true;
              updated.completedAt = updated.completedAt || nowIso;
            } else {
              updated.completed = false;
              updated.completedAt = undefined;
            }
          } else if (updates.completed !== undefined) {
            if (updates.completed) {
              updated.status = 'completed';
              updated.completedAt = updated.completedAt || nowIso;
            } else {
              updated.status = updated.status === 'completed' ? 'todo' : (updated.status || 'todo');
              updated.completedAt = undefined;
            }
          }

          updatedTaskRecord = updated;
          return updated;
        }
        return task;
      })
    );

    if (updatedTaskRecord) {
      executeSync('task update', async (userId) => {
        const savedTask = await dbUpsertTask(updatedTaskRecord!, userId);
        // If the task had a legacy non-UUID ID, dbUpsertTask created a new Supabase record with a UUID!
        if (savedTask && savedTask.id !== id) {
          setTasks((prev) =>
            prev.map((t) => {
              if (t.id === id) return { ...t, ...savedTask, id: savedTask.id };
              if (t.parentTaskId === id) return { ...t, parentTaskId: savedTask.id };
              return t;
            })
          );
          setSelectedTaskId((curr) => (curr === id ? savedTask.id : curr));
        }
      });
    }
  };

  const applyDailySchedule = async (
    scheduleItems: Array<{
      id: string;
      date: string;
      time?: string | null;
      durationMinutes: number;
      priority?: Priority;
    }>
  ): Promise<void> => {
    if (scheduleItems.length === 0) return;

    const scheduleMap = new Map(scheduleItems.map((item) => [item.id, item]));
    const nowIso = new Date().toISOString();

    const tasksToPersist: Task[] = [];

    setTasks((prev) =>
      prev.map((task) => {
        const item = scheduleMap.get(task.id);
        if (item) {
          const updated: Task = {
            ...task,
            date: item.date,
            time: item.time ? item.time : undefined,
            durationMinutes: item.durationMinutes,
            priority: item.priority || task.priority,
            updatedAt: nowIso,
          };
          tasksToPersist.push(updated);
          return updated;
        }
        return task;
      })
    );

    // Persist all updated tasks to Supabase
    await executeSync('apply daily plan', async (userId) => {
      for (const updatedTask of tasksToPersist) {
        const savedTask = await dbUpsertTask(updatedTask, userId);
        if (savedTask && savedTask.id !== updatedTask.id) {
          setTasks((prev) =>
            prev.map((t) => (t.id === updatedTask.id ? { ...t, ...savedTask, id: savedTask.id } : t))
          );
        }
      }
    });
  };

  const deleteTask = (id: string) => {
    // Also delete any child subtasks associated with this task
    const childSubtasks = tasks.filter((t) => t.parentTaskId === id);
    setTasks((prev) => prev.filter((t) => t.id !== id && t.parentTaskId !== id));
    if (focusState.currentTaskId === id) {
      setFocusState((prev) => ({ ...prev, currentTaskId: null }));
    }
    if (selectedTaskId === id) {
      setSelectedTaskId(null);
    }
    executeSync('task deletion', async (userId) => {
      if (isValidUUID(id)) {
        await dbDeleteTask(id, userId);
      }
      for (const child of childSubtasks) {
        if (isValidUUID(child.id)) {
          await dbDeleteTask(child.id, userId);
        }
      }
    });
  };

  const duplicateTask = (id: string): Task => {
    const original = tasks.find((t) => t.id === id);
    if (!original) throw new Error('Task not found');

    const duplicated = addTask({
      title: `${original.title} (Copy)`,
      description: original.description,
      notes: original.notes,
      date: original.date,
      time: original.time,
      durationMinutes: original.durationMinutes,
      priority: original.priority,
      energyLevel: original.energyLevel,
      status: 'todo',
      category: original.category,
      listId: original.listId,
      goalId: original.goalId,
      planId: original.planId,
      parentTaskId: original.parentTaskId,
    });

    // Also duplicate any subtasks
    const childSubtasks = tasks.filter((t) => t.parentTaskId === id);
    childSubtasks.forEach((st) => {
      addTask({
        title: st.title,
        description: st.description,
        notes: st.notes,
        date: duplicated.date,
        time: st.time,
        durationMinutes: st.durationMinutes,
        priority: st.priority,
        energyLevel: st.energyLevel,
        status: 'todo',
        category: duplicated.category,
        listId: duplicated.listId,
        goalId: duplicated.goalId,
        parentTaskId: duplicated.id,
      });
    });

    return duplicated;
  };

  const getSubtasks = (parentTaskId: string): Task[] => {
    return tasks.filter((t) => t.parentTaskId === parentTaskId);
  };

  // --- Bulk Selection Operations ---
  const bulkUpdatePriority = async (
    taskIds: string[],
    priority: Priority
  ): Promise<{ success: boolean; error?: string }> => {
    if (taskIds.length === 0) return { success: true };
    const nowIso = new Date().toISOString();

    setTasks((prev) =>
      prev.map((t) => (taskIds.includes(t.id) ? { ...t, priority, updatedAt: nowIso } : t))
    );

    if (currentUser && isSupabaseConfigured) {
      try {
        setSyncStatus('saving');
        setSyncError(null);
        await dbBulkUpdateTaskPriority(taskIds, priority, currentUser.id);
        setSyncStatus('saved');
        setLastSavedAt(new Date());
        if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
        savedTimeoutRef.current = setTimeout(() => setSyncStatus('idle'), 2000);
        return { success: true };
      } catch (err: any) {
        console.error('Failed to bulk update priority in Supabase:', err);
        const msg = err?.message || 'Failed to update priority in Supabase';
        setSyncStatus('error');
        setSyncError(msg);
        return { success: false, error: msg };
      }
    }
    return { success: true };
  };

  const bulkMoveToList = async (
    taskIds: string[],
    listId: string | null
  ): Promise<{ success: boolean; error?: string }> => {
    if (taskIds.length === 0) return { success: true };
    const nowIso = new Date().toISOString();
    const cleanListId = listId && listId !== 'none' ? listId : undefined;

    setTasks((prev) =>
      prev.map((t) => (taskIds.includes(t.id) ? { ...t, listId: cleanListId, updatedAt: nowIso } : t))
    );

    if (currentUser && isSupabaseConfigured) {
      try {
        setSyncStatus('saving');
        setSyncError(null);
        await dbBulkUpdateTaskList(taskIds, cleanListId || null, currentUser.id);
        setSyncStatus('saved');
        setLastSavedAt(new Date());
        if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
        savedTimeoutRef.current = setTimeout(() => setSyncStatus('idle'), 2000);
        return { success: true };
      } catch (err: any) {
        console.error('Failed to bulk move list in Supabase:', err);
        const msg = err?.message || 'Failed to move tasks in Supabase';
        setSyncStatus('error');
        setSyncError(msg);
        return { success: false, error: msg };
      }
    }
    return { success: true };
  };

  const bulkUpdateStatus = async (
    taskIds: string[],
    status: TaskStatus
  ): Promise<{ success: boolean; error?: string }> => {
    if (taskIds.length === 0) return { success: true };
    const nowIso = new Date().toISOString();
    const isCompleted = status === 'completed';

    setTasks((prev) =>
      prev.map((t) => {
        if (taskIds.includes(t.id)) {
          return {
            ...t,
            status,
            completed: isCompleted,
            completedAt: isCompleted ? (t.completedAt || nowIso) : undefined,
            updatedAt: nowIso,
          };
        }
        return t;
      })
    );

    if (currentUser && isSupabaseConfigured) {
      try {
        setSyncStatus('saving');
        setSyncError(null);
        await dbBulkUpdateTaskStatus(taskIds, status, currentUser.id);
        setSyncStatus('saved');
        setLastSavedAt(new Date());
        if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
        savedTimeoutRef.current = setTimeout(() => setSyncStatus('idle'), 2000);
        return { success: true };
      } catch (err: any) {
        console.error('Failed to bulk update status in Supabase:', err);
        const msg = err?.message || 'Failed to update task status in Supabase';
        setSyncStatus('error');
        setSyncError(msg);
        return { success: false, error: msg };
      }
    }
    return { success: true };
  };

  const bulkReschedule = async (
    taskIds: string[],
    dueDate: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (taskIds.length === 0) return { success: true };
    const nowIso = new Date().toISOString();

    setTasks((prev) =>
      prev.map((t) => (taskIds.includes(t.id) ? { ...t, date: dueDate, updatedAt: nowIso } : t))
    );

    if (currentUser && isSupabaseConfigured) {
      try {
        setSyncStatus('saving');
        setSyncError(null);
        await dbBulkUpdateTaskDueDate(taskIds, dueDate, currentUser.id);
        setSyncStatus('saved');
        setLastSavedAt(new Date());
        if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
        savedTimeoutRef.current = setTimeout(() => setSyncStatus('idle'), 2000);
        return { success: true };
      } catch (err: any) {
        console.error('Failed to bulk reschedule in Supabase:', err);
        const msg = err?.message || 'Failed to reschedule tasks in Supabase';
        setSyncStatus('error');
        setSyncError(msg);
        return { success: false, error: msg };
      }
    }
    return { success: true };
  };

  const bulkDeleteTasks = async (
    taskIds: string[]
  ): Promise<{ success: boolean; error?: string }> => {
    if (taskIds.length === 0) return { success: true };

    setTasks((prev) =>
      prev.filter((t) => !taskIds.includes(t.id) && (!t.parentTaskId || !taskIds.includes(t.parentTaskId)))
    );

    if (focusState.currentTaskId && taskIds.includes(focusState.currentTaskId)) {
      setFocusState((prev) => ({ ...prev, currentTaskId: null }));
    }
    if (selectedTaskId && taskIds.includes(selectedTaskId)) {
      setSelectedTaskId(null);
    }

    if (currentUser && isSupabaseConfigured) {
      try {
        setSyncStatus('saving');
        setSyncError(null);
        await dbBulkDeleteTasks(taskIds, currentUser.id);
        setSyncStatus('saved');
        setLastSavedAt(new Date());
        if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
        savedTimeoutRef.current = setTimeout(() => setSyncStatus('idle'), 2000);
        return { success: true };
      } catch (err: any) {
        console.error('Failed to bulk delete tasks in Supabase:', err);
        const msg = err?.message || 'Failed to delete tasks from Supabase';
        setSyncStatus('error');
        setSyncError(msg);
        return { success: false, error: msg };
      }
    }
    return { success: true };
  };

  const toggleTaskComplete = (id: string) => {
    let targetTask: Task | null = null;
    let targetGoal: Goal | null = null;
    let targetPlan: GeneratedPlan | null = null;

    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === id) {
          const nextCompleted = !task.completed;
          const completedAt = nextCompleted ? new Date().toISOString() : undefined;
          const nextStatus: TaskStatus = nextCompleted ? 'completed' : 'todo';

          // If linked to a goal subtask, update goal subtask status too!
          if (task.goalId && task.goalSubtaskId) {
            setGoals((prevGoals) =>
              prevGoals.map((g) => {
                if (g.id === task.goalId) {
                  const updatedG = {
                    ...g,
                    tasks: g.tasks.map((st) =>
                      st.id === task.goalSubtaskId ? { ...st, completed: nextCompleted } : st
                    ),
                  };
                  targetGoal = updatedG;
                  return updatedG;
                }
                return g;
              })
            );
          }

          // If linked to a plan, update plan task item status too!
          if (task.planId) {
            setPlans((prevPlans) =>
              prevPlans.map((p) => {
                if (p.id === task.planId) {
                  const updatedP = {
                    ...p,
                    days: p.days.map((d) => ({
                      ...d,
                      tasks: d.tasks.map((pt) =>
                        pt.scheduledTaskId === task.id || pt.title.toLowerCase() === task.title.toLowerCase()
                          ? { ...pt, completed: nextCompleted }
                          : pt
                      ),
                    })),
                  };
                  targetPlan = updatedP;
                  return updatedP;
                }
                return p;
              })
            );
          }

          const updated: Task = {
            ...task,
            completed: nextCompleted,
            status: nextStatus,
            completedAt,
            updatedAt: new Date().toISOString(),
          };
          targetTask = updated;
          return updated;
        }
        return task;
      })
    );

    if (targetTask) {
      executeSync('task completion toggle', async (userId) => {
        const saved = await dbUpsertTask(targetTask!, userId);
        if (saved && saved.id !== targetTask!.id) {
          setTasks((prev) =>
            prev.map((t) => (t.id === targetTask!.id ? { ...t, ...saved, id: saved.id } : t))
          );
          setSelectedTaskId((curr) => (curr === targetTask!.id ? saved.id : curr));
        }
        if (targetGoal && isValidUUID(targetGoal.id)) await dbUpsertGoal(targetGoal, userId);
        if (targetPlan && isValidUUID(targetPlan.id)) await dbUpsertPlan(targetPlan, userId);
      });
    }
  };

  // =========================================================================
  // Custom List Operations (Optimistic UI + Immediate Supabase Sync)
  // =========================================================================

  const addList = (name: string, color: string, iconName = 'Folder', description = ''): CustomList => {
    const today = getTodayString();
    const newList: CustomList = {
      id: generateUUID(),
      name: name.trim(),
      color,
      iconName,
      description,
      createdAt: today,
    };
    setLists((prev) => [...prev, newList]);
    executeSync('list creation', (userId) => dbUpsertList(newList, userId));
    return newList;
  };

  const updateList = (id: string, updates: Partial<CustomList>) => {
    let updatedListRecord: CustomList | null = null;
    setLists((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          const updated = { ...l, ...updates };
          updatedListRecord = updated;
          return updated;
        }
        return l;
      })
    );

    if (updatedListRecord) {
      executeSync('list update', (userId) => dbUpsertList(updatedListRecord!, userId));
    }
  };

  const deleteList = (id: string) => {
    setLists((prev) => prev.filter((l) => l.id !== id));
    if (activeListId === id) setActiveListId(null);
    executeSync('list deletion', (userId) => dbDeleteList(id, userId));
  };

  // =========================================================================
  // Goal Operations (Optimistic UI + Immediate Supabase Sync)
  // =========================================================================

  const addGoal = (
    title: string,
    description: string,
    category: TaskCategory,
    targetDate: string,
    initialSubtasks: string[] = []
  ): Goal => {
    const today = getTodayString();
    const subtaskItems: GoalSubtask[] = initialSubtasks.map((t) => ({
      id: generateUUID(),
      title: t.trim(),
      completed: false,
    }));

    const newGoal: Goal = {
      id: generateUUID(),
      title: title.trim(),
      description: description.trim(),
      category,
      color: 'indigo',
      targetDate: targetDate || today,
      tasks: subtaskItems,
      createdAt: today,
    };

    setGoals((prev) => [newGoal, ...prev]);
    executeSync('goal creation', (userId) => dbUpsertGoal(newGoal, userId));
    return newGoal;
  };

  const updateGoal = (id: string, updates: Partial<Goal>) => {
    let updatedGoalRecord: Goal | null = null;
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === id) {
          const updated = { ...g, ...updates };
          updatedGoalRecord = updated;
          return updated;
        }
        return g;
      })
    );

    if (updatedGoalRecord) {
      executeSync('goal update', (userId) => dbUpsertGoal(updatedGoalRecord!, userId));
    }
  };

  const deleteGoal = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    executeSync('goal deletion', (userId) => dbDeleteGoal(id, userId));
  };

  const toggleGoalSubtask = (goalId: string, subtaskId: string) => {
    let updatedGoalRecord: Goal | null = null;
    let updatedTaskRecord: Task | null = null;

    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === goalId) {
          const updatedSubtasks = g.tasks.map((st) => {
            if (st.id === subtaskId) {
              const nextStatus = !st.completed;
              // Also sync linked task if exists
              setTasks((prevTasks) =>
                prevTasks.map((t) => {
                  if (t.goalId === goalId && t.goalSubtaskId === subtaskId) {
                    const upd: Task = {
                      ...t,
                      completed: nextStatus,
                      status: nextStatus ? 'completed' : 'todo',
                      completedAt: nextStatus ? new Date().toISOString() : undefined,
                    };
                    updatedTaskRecord = upd;
                    return upd;
                  }
                  return t;
                })
              );
              return { ...st, completed: nextStatus };
            }
            return st;
          });
          const updated = { ...g, tasks: updatedSubtasks };
          updatedGoalRecord = updated;
          return updated;
        }
        return g;
      })
    );

    if (updatedGoalRecord) {
      executeSync('goal subtask toggle', async (userId) => {
        await dbUpsertGoal(updatedGoalRecord!, userId);
        if (updatedTaskRecord) {
          await dbUpsertTask(updatedTaskRecord, userId);
        }
      });
    }
  };

  const addGoalSubtask = (goalId: string, taskTitle: string, dueDate?: string) => {
    if (!taskTitle.trim()) return;
    const newSubtask: GoalSubtask = {
      id: generateUUID(),
      title: taskTitle.trim(),
      completed: false,
      dueDate,
    };

    let updatedGoalRecord: Goal | null = null;
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === goalId) {
          const updated = { ...g, tasks: [...g.tasks, newSubtask] };
          updatedGoalRecord = updated;
          return updated;
        }
        return g;
      })
    );

    if (updatedGoalRecord) {
      executeSync('add goal subtask', (userId) => dbUpsertGoal(updatedGoalRecord!, userId));
    }
  };

  const deleteGoalSubtask = (goalId: string, subtaskId: string) => {
    let updatedGoalRecord: Goal | null = null;
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === goalId) {
          const updated = { ...g, tasks: g.tasks.filter((st) => st.id !== subtaskId) };
          updatedGoalRecord = updated;
          return updated;
        }
        return g;
      })
    );

    if (updatedGoalRecord) {
      executeSync('delete goal subtask', (userId) => dbUpsertGoal(updatedGoalRecord!, userId));
    }
  };

  const convertSubtaskToTask = (goalId: string, subtaskId: string, date = getTodayString()) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;
    const subtask = goal.tasks.find((st) => st.id === subtaskId);
    if (!subtask) return;

    // Check if task already exists
    const existing = tasks.find((t) => t.goalId === goalId && t.goalSubtaskId === subtaskId);
    if (existing) {
      updateTask(existing.id, { date });
      return;
    }

    addTask({
      title: subtask.title,
      description: `From goal: ${goal.title}`,
      date,
      priority: 'high',
      category: goal.category,
      goalId,
      goalSubtaskId: subtaskId,
    });
  };

  // =========================================================================
  // Note Operations (Optimistic UI + Immediate Supabase Sync)
  // =========================================================================

  const addNote = (title: string, content: string, category: TaskCategory = 'Work'): Note => {
    const today = getTodayString();
    const newNote: Note = {
      id: generateUUID(),
      title: title.trim() || 'Untitled Note',
      content: content.trim(),
      category,
      isPinned: false,
      updatedAt: today,
      createdAt: today,
    };
    setNotes((prev) => [newNote, ...prev]);
    executeSync('note creation', (userId) => dbUpsertNote(newNote, userId));
    return newNote;
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    let updatedNoteRecord: Note | null = null;
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === id) {
          const updated = { ...n, ...updates, updatedAt: getTodayString() };
          updatedNoteRecord = updated;
          return updated;
        }
        return n;
      })
    );

    if (updatedNoteRecord) {
      executeSync('note update', (userId) => dbUpsertNote(updatedNoteRecord!, userId));
    }
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    executeSync('note deletion', (userId) => dbDeleteNote(id, userId));
  };

  const togglePinNote = (id: string) => {
    let updatedNoteRecord: Note | null = null;
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === id) {
          const updated = { ...n, isPinned: !n.isPinned };
          updatedNoteRecord = updated;
          return updated;
        }
        return n;
      })
    );

    if (updatedNoteRecord) {
      executeSync('toggle note pin', (userId) => dbUpsertNote(updatedNoteRecord!, userId));
    }
  };

  const convertNoteToTask = (noteContent: string) => {
    const firstLine = noteContent.split('\n')[0].replace(/^[-*•\d.]\s*/, '').trim();
    if (!firstLine) return;
    addTask({
      title: firstLine,
      description: noteContent,
      date: getTodayString(),
      priority: 'medium',
      category: 'Work',
    });
  };

  // =========================================================================
  // Focus Operations
  // =========================================================================

  const startFocus = (taskId?: string, customTopic?: string, minutes?: number) => {
    const mins = minutes || focusState.durationMinutes || 25;
    setFocusState((prev) => ({
      ...prev,
      currentTaskId: taskId !== undefined ? taskId : prev.currentTaskId,
      customTopic: customTopic || prev.customTopic || 'Deep Focus Session',
      durationMinutes: mins,
      remainingSeconds: mins * 60,
      isRunning: true,
    }));
  };

  const pauseFocus = () => {
    setFocusState((prev) => ({ ...prev, isRunning: false }));
  };

  const resumeFocus = () => {
    setFocusState((prev) => ({ ...prev, isRunning: true }));
  };

  const resetFocus = () => {
    setFocusState((prev) => ({
      ...prev,
      remainingSeconds: prev.durationMinutes * 60,
      isRunning: false,
    }));
  };

  const markFocusTaskComplete = () => {
    if (focusState.currentTaskId) {
      toggleTaskComplete(focusState.currentTaskId);
    }
    setFocusState((prev) => ({
      ...prev,
      sessionsCompletedToday: prev.sessionsCompletedToday + 1,
      totalMinutesToday: prev.totalMinutesToday + prev.durationMinutes,
      isRunning: false,
    }));
  };

  const setFocusDuration = (minutes: number) => {
    setFocusState((prev) => ({
      ...prev,
      durationMinutes: minutes,
      remainingSeconds: minutes * 60,
      isRunning: false,
    }));
  };

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return tasks.find((t) => t.id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  const openTaskDetails = (taskIdOrTask: string | Task) => {
    const id = typeof taskIdOrTask === 'string' ? taskIdOrTask : taskIdOrTask.id;
    setSelectedTaskId(id);
  };

  const closeTaskDetails = () => {
    setSelectedTaskId(null);
  };

  // Modal triggers
  const openTaskModal = (initialData?: Partial<Task>) => {
    if (initialData?.id) {
      openTaskDetails(initialData.id);
      return;
    }
    if (initialData) {
      setEditingTask({
        id: '',
        title: initialData.title || '',
        description: initialData.description || '',
        notes: initialData.notes || '',
        completed: initialData.completed || false,
        status: initialData.status || 'todo',
        date: initialData.date || getTodayString(),
        time: initialData.time || '',
        durationMinutes: initialData.durationMinutes,
        priority: initialData.priority || 'medium',
        energyLevel: initialData.energyLevel || 'medium',
        category: initialData.category || 'Work',
        listId: initialData.listId,
        goalId: initialData.goalId,
        goalSubtaskId: initialData.goalSubtaskId,
        planId: initialData.planId,
        parentTaskId: initialData.parentTaskId || null,
        createdAt: initialData.createdAt || getTodayString(),
      });
    } else {
      setEditingTask(null);
    }
    setIsTaskModalOpen(true);
  };

  const closeTaskModal = () => {
    setIsTaskModalOpen(false);
    setEditingTask(null);
  };

  const openGoalModal = () => setIsGoalModalOpen(true);
  const closeGoalModal = () => setIsGoalModalOpen(false);

  const openListModal = () => setIsListModalOpen(true);
  const closeListModal = () => setIsListModalOpen(false);

  // Plan Generator modal triggers
  const openPlanGenerator = (initialGoal?: string) => {
    setPlanGeneratorInitialGoal(initialGoal);
    setIsPlanGeneratorOpen(true);
  };

  const closePlanGenerator = () => {
    setIsPlanGeneratorOpen(false);
    setPlanGeneratorInitialGoal(undefined);
  };

  // =========================================================================
  // Plan Operations (Optimistic UI + Immediate Supabase Sync)
  // =========================================================================

  const createPlan = (input: PlanFormInput): GeneratedPlan => {
    const generated = generatePlanBreakdown(input);
    setPlans((prev) => [generated, ...prev]);
    setActivePlan(generated);
    executeSync('create plan', (userId) => dbUpsertPlan(generated, userId));
    return generated;
  };

  const updatePlan = (id: string, updates: Partial<GeneratedPlan>) => {
    const today = getTodayString();
    let updatedPlanRecord: GeneratedPlan | null = null;
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, ...updates, updatedAt: today };
          if (activePlan?.id === id) setActivePlan(updated);
          updatedPlanRecord = updated;
          return updated;
        }
        return p;
      })
    );

    if (updatedPlanRecord) {
      executeSync('update plan', (userId) => dbUpsertPlan(updatedPlanRecord!, userId));
    }
  };

  const deletePlan = (id: string) => {
    setPlans((prev) => prev.filter((p) => p.id !== id));
    if (activePlan?.id === id) {
      setActivePlan(plans.find((p) => p.id !== id) || null);
    }
    executeSync('delete plan', (userId) => dbDeletePlan(id, userId));
  };

  const updatePlanTaskItem = (planId: string, dayNumber: number, taskId: string, updates: Partial<PlanTaskItem>) => {
    let updatedPlanRecord: GeneratedPlan | null = null;
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id === planId) {
          const updatedDays = p.days.map((d) => {
            if (d.dayNumber === dayNumber) {
              const updatedTasks = d.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t));
              return { ...d, tasks: updatedTasks };
            }
            return d;
          });
          const updatedPlan = { ...p, days: updatedDays, updatedAt: getTodayString() };
          if (activePlan?.id === planId) setActivePlan(updatedPlan);
          updatedPlanRecord = updatedPlan;
          return updatedPlan;
        }
        return p;
      })
    );

    if (updatedPlanRecord) {
      executeSync('update plan task item', (userId) => dbUpsertPlan(updatedPlanRecord!, userId));
    }
  };

  const addPlanTaskItem = (planId: string, dayNumber: number, title: string, durationMinutes: number) => {
    if (!title.trim()) return;
    let updatedPlanRecord: GeneratedPlan | null = null;
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id === planId) {
          const updatedDays = p.days.map((d) => {
            if (d.dayNumber === dayNumber) {
              const newTask: PlanTaskItem = {
                id: generateUUID(),
                title: title.trim(),
                durationMinutes: durationMinutes || 20,
                completed: false,
                scheduledDate: d.date,
              };
              return { ...d, tasks: [...d.tasks, newTask] };
            }
            return d;
          });
          const updatedPlan = { ...p, days: updatedDays, updatedAt: getTodayString() };
          if (activePlan?.id === planId) setActivePlan(updatedPlan);
          updatedPlanRecord = updatedPlan;
          return updatedPlan;
        }
        return p;
      })
    );

    if (updatedPlanRecord) {
      executeSync('add plan task item', (userId) => dbUpsertPlan(updatedPlanRecord!, userId));
    }
  };

  const deletePlanTaskItem = (planId: string, dayNumber: number, taskId: string) => {
    let updatedPlanRecord: GeneratedPlan | null = null;
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id === planId) {
          const updatedDays = p.days.map((d) => {
            if (d.dayNumber === dayNumber) {
              return { ...d, tasks: d.tasks.filter((t) => t.id !== taskId) };
            }
            return d;
          });
          const updatedPlan = { ...p, days: updatedDays, updatedAt: getTodayString() };
          if (activePlan?.id === planId) setActivePlan(updatedPlan);
          updatedPlanRecord = updatedPlan;
          return updatedPlan;
        }
        return p;
      })
    );

    if (updatedPlanRecord) {
      executeSync('delete plan task item', (userId) => dbUpsertPlan(updatedPlanRecord!, userId));
    }
  };

  const addPlanDay = (planId: string) => {
    const today = getTodayString();
    let updatedPlanRecord: GeneratedPlan | null = null;
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id === planId) {
          const newDayNumber = p.days.length + 1;
          const newDay: PlanDay = {
            dayNumber: newDayNumber,
            label: `Day ${newDayNumber}`,
            date: addDays(p.days[0]?.date || today, newDayNumber - 1),
            targetMinutes: p.minutesPerDay || 60,
            tasks: [
              {
                id: generateUUID(),
                title: `Execute milestone review for ${p.goal}`,
                durationMinutes: 30,
                completed: false,
              },
            ],
          };
          const updatedPlan = {
            ...p,
            availableDays: newDayNumber,
            days: [...p.days, newDay],
            updatedAt: today,
          };
          if (activePlan?.id === planId) setActivePlan(updatedPlan);
          updatedPlanRecord = updatedPlan;
          return updatedPlan;
        }
        return p;
      })
    );

    if (updatedPlanRecord) {
      executeSync('add plan day', (userId) => dbUpsertPlan(updatedPlanRecord!, userId));
    }
  };

  const deletePlanDay = (planId: string, dayNumber: number) => {
    let updatedPlanRecord: GeneratedPlan | null = null;
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id === planId) {
          const filteredDays = p.days
            .filter((d) => d.dayNumber !== dayNumber)
            .map((d, idx) => ({
              ...d,
              dayNumber: idx + 1,
              label: `Day ${idx + 1}`,
            }));
          const updatedPlan = {
            ...p,
            availableDays: Math.max(1, filteredDays.length),
            days: filteredDays,
            updatedAt: getTodayString(),
          };
          if (activePlan?.id === planId) setActivePlan(updatedPlan);
          updatedPlanRecord = updatedPlan;
          return updatedPlan;
        }
        return p;
      })
    );

    if (updatedPlanRecord) {
      executeSync('delete plan day', (userId) => dbUpsertPlan(updatedPlanRecord!, userId));
    }
  };

  const schedulePlan = (planId: string, startDate?: string) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return { scheduledTasksCount: 0 };

    const start = startDate || getTodayString();

    // 1. Create or link a Goal in goals state
    let targetGoalId = plan.linkedGoalId;
    let createdGoal: Goal | null = null;
    if (!targetGoalId) {
      const allSubtasks: string[] = [];
      plan.days.forEach((day) => {
        day.tasks.forEach((t) => allSubtasks.push(`${t.title} (${t.durationMinutes}m)`));
      });
      const newGoal = addGoal(
        plan.goal,
        plan.notes || `Structured plan spanning ${plan.days.length} days`,
        plan.category,
        plan.targetDate,
        allSubtasks
      );
      targetGoalId = newGoal.id;
      createdGoal = newGoal;
    }

    // 2. Generate scheduled tasks for each day
    const newTasksToSchedule: Task[] = [];
    const updatedDays: PlanDay[] = plan.days.map((day) => {
      const scheduledDate = addDays(start, day.dayNumber - 1);
      const updatedDayTasks: PlanTaskItem[] = day.tasks.map((task) => {
        const taskId = task.scheduledTaskId || generateUUID();

        // Add to tasks list if not already scheduled
        const alreadyExists = tasks.some((t) => t.id === task.scheduledTaskId);
        if (!alreadyExists) {
          newTasksToSchedule.push({
            id: taskId,
            title: task.title,
            description: `From plan: ${plan.goal} (${day.label})`,
            completed: task.completed,
            date: scheduledDate,
            durationMinutes: task.durationMinutes,
            priority: plan.priority,
            category: plan.category,
            goalId: targetGoalId,
            planId: plan.id,
            planDayNumber: day.dayNumber,
            createdAt: getTodayString(),
          });
        }

        return {
          ...task,
          scheduledTaskId: taskId,
          scheduledDate,
        };
      });

      return {
        ...day,
        date: scheduledDate,
        tasks: updatedDayTasks,
      };
    });

    if (newTasksToSchedule.length > 0) {
      setTasks((prev) => [...newTasksToSchedule, ...prev]);
    }

    const updatedPlan: GeneratedPlan = {
      ...plan,
      isScheduled: true,
      linkedGoalId: targetGoalId,
      days: updatedDays,
      updatedAt: getTodayString(),
    };

    setPlans((prev) => prev.map((p) => (p.id === planId ? updatedPlan : p)));
    if (activePlan?.id === planId) setActivePlan(updatedPlan);

    // Save scheduled plan, goal, and new tasks to Supabase
    executeSync('schedule plan', async (userId) => {
      await dbUpsertPlan(updatedPlan, userId);
      if (createdGoal) {
        await dbUpsertGoal(createdGoal, userId);
      }
      for (const t of newTasksToSchedule) {
        const saved = await dbCreateTask(t, userId);
        if (saved && saved.id !== t.id) {
          setTasks((prev) =>
            prev.map((task) => (task.id === t.id ? { ...task, ...saved, id: saved.id } : task))
          );
        }
      }
    });

    return { scheduledTasksCount: newTasksToSchedule.length };
  };

  // Review / Analytics Calculations
  const reviewMetrics = useMemo(() => {
    const today = getTodayString();
    const rootTasks = tasks.filter((t) => !t.parentTaskId);
    const planned = rootTasks.length;
    const completed = rootTasks.filter((t) => t.completed).length;
    // Carried forward: tasks that were scheduled before today and are still pending
    const carriedForward = rootTasks.filter((t) => !t.completed && t.date < today).length;
    const completionRate = planned > 0 ? Math.round((completed / planned) * 100) : 0;

    const todayTasks = rootTasks.filter((t) => t.date === today);
    const todayTotal = todayTasks.length;
    const todayCompleted = todayTasks.filter((t) => t.completed).length;
    const todayPending = todayTotal - todayCompleted;

    const todayPlannedMinutes = todayTasks.reduce((acc, t) => acc + (t.durationMinutes || 30), 0);
    const todayCompletedMinutes = todayTasks
      .filter((t) => t.completed)
      .reduce((acc, t) => acc + (t.durationMinutes || 30), 0);
    const todayRemainingMinutes = Math.max(0, todayPlannedMinutes - todayCompletedMinutes);
    const carriedForwardMinutes = rootTasks
      .filter((t) => !t.completed && t.date < today)
      .reduce((acc, t) => acc + (t.durationMinutes || 30), 0);

    const activeGoalsCount = goals.filter((g) => {
      const done = g.tasks.filter((t) => t.completed).length;
      return g.tasks.length === 0 || done < g.tasks.length;
    }).length;

    return {
      planned,
      completed,
      carriedForward,
      completionRate,
      todayTotal,
      todayCompleted,
      todayPending,
      activeGoalsCount,
      todayPlannedMinutes,
      todayCompletedMinutes,
      todayRemainingMinutes,
      carriedForwardMinutes,
    };
  }, [tasks, goals]);

  return (
    <PlanContext.Provider
      value={{
        activeView,
        setActiveView,
        currentUser,
        authLoading,
        isSupabaseReady: isSupabaseConfigured,
        syncStatus,
        syncError,
        lastSavedAt,
        isAuthModalOpen,
        authModalMode,
        authViewMode,
        setAuthViewMode,
        isPasswordRecoveryActive,
        setIsPasswordRecoveryActive,
        recoverySessionDetected,
        setRecoverySessionDetected,
        lastAuthEvent,
        openAuthModal,
        closeAuthModal,
        signIn,
        signUp,
        signOut,
        sendPasswordResetEmail,
        updateUserPassword,
        dismissSyncError,
        retryLastSync,
        refreshDataFromSupabase,
        isRlsModalOpen,
        openRlsModal,
        closeRlsModal,
        plans,
        activePlan,
        setActivePlan,
        isPlanGeneratorOpen,
        planGeneratorInitialGoal,
        openPlanGenerator,
        closePlanGenerator,
        createPlan,
        updatePlan,
        deletePlan,
        schedulePlan,
        updatePlanTaskItem,
        addPlanTaskItem,
        deletePlanTaskItem,
        addPlanDay,
        deletePlanDay,
        tasks,
        addTask,
        updateTask,
        applyDailySchedule,
        deleteTask,
        toggleTaskComplete,
        duplicateTask,
        getSubtasks,
        bulkUpdatePriority,
        bulkMoveToList,
        bulkUpdateStatus,
        bulkReschedule,
        bulkDeleteTasks,
        selectedTaskId,
        selectedTask,
        isTaskDetailsOpen: Boolean(selectedTaskId),
        openTaskDetails,
        closeTaskDetails,
        lists,
        activeListId,
        setActiveListId,
        addList,
        updateList,
        deleteList,
        goals,
        addGoal,
        updateGoal,
        deleteGoal,
        toggleGoalSubtask,
        addGoalSubtask,
        deleteGoalSubtask,
        convertSubtaskToTask,
        notes,
        addNote,
        updateNote,
        deleteNote,
        togglePinNote,
        convertNoteToTask,
        focusState,
        startFocus,
        pauseFocus,
        resumeFocus,
        resetFocus,
        markFocusTaskComplete,
        setFocusDuration,
        isTaskModalOpen,
        openTaskModal,
        closeTaskModal,
        editingTask,
        isGoalModalOpen,
        openGoalModal,
        closeGoalModal,
        isListModalOpen,
        openListModal,
        closeListModal,
        reviewMetrics,
        searchQuery,
        setSearchQuery,
      }}
    >
      {children}
    </PlanContext.Provider>
  );
};

export const usePlan = (): PlanContextType => {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error('usePlan must be used within a PlanProvider');
  }
  return context;
};
