import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { CustomList, Goal, GeneratedPlan, Note, Task, Priority, TaskStatus, EnergyLevel } from '../types';

export function normalizeSupabaseUrl(rawUrl: string): string {
  let url = (rawUrl || '').trim();
  if (!url) return '';

  // Detect Supabase dashboard URL, e.g.:
  // https://supabase.com/dashboard/project/xivkkvknkygpmibczhvh/sql/...
  // or https://supabase.com/dashboard/project/xivkkvknkygpmibczhvh
  const dashboardMatch = url.match(/supabase\.com\/dashboard\/project\/([a-z0-9_-]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  // Detect bare project ref
  if (/^[a-z0-9_-]{15,35}$/i.test(url)) {
    return `https://${url}.supabase.co`;
  }

  // Ensure protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  try {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith('.supabase.co')) {
      return `https://${parsed.hostname}`;
    }
  } catch {
    // fall through
  }

  return url.replace(/\/+$/, '');
}

const rawEnvUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
export const supabaseProjectUrl =
  normalizeSupabaseUrl(rawEnvUrl) || 'https://xivkkvknkygpmibczhvh.supabase.co';

const envKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_WrhcMU2vmW3GOcJuBUl_Gg_uV5zvO1s'
).trim();

// Check if valid URL format ending in .supabase.co
const isValidUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return Boolean(parsed.hostname && (parsed.protocol === 'https:' || parsed.protocol === 'http:'));
  } catch {
    return false;
  }
};

export const isSupabaseConfigured = Boolean(
  supabaseProjectUrl &&
  envKey &&
  isValidUrl(supabaseProjectUrl) &&
  supabaseProjectUrl.includes('.supabase.co') &&
  !supabaseProjectUrl.includes('your-project') &&
  !envKey.includes('your-anon-public-key')
);

// =========================================================================
// UUID Validation & Generation
// =========================================================================

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(val?: string | null): val is string {
  if (!val || typeof val !== 'string') return false;
  return UUID_REGEX.test(val.trim());
}

export function sanitizeUUIDOrNull(val?: string | null): string | null {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseProjectUrl, envKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// =========================================================================
// Authoritative Supabase Database Row Interfaces
// NOTE: These strictly reflect the PostgreSQL columns in supabase-schema.sql:
// - NO `completed` column exists in the `tasks` table!
// - NO `notes` column exists in the `tasks` table!
// - NO `category` column exists in the `tasks` table!
// =========================================================================

export interface SupabaseTaskRow {
  id: string; // UUID
  user_id: string; // UUID
  title: string;
  description: string;
  due_date: string;
  start_time: string | null;
  duration_minutes: number | null;
  priority: string;
  energy_level: string;
  status: string;
  list_id: string | null;
  goal_id: string | null;
  plan_id: string | null;
  parent_task_id: string | null;
  completed_at: string | null;
  created_at: string;
}

export type SupabaseTaskInsertPayload = Omit<SupabaseTaskRow, 'id'>;
export type SupabaseTaskUpdatePayload = Partial<Omit<SupabaseTaskRow, 'id' | 'user_id' | 'created_at'>>;

// =========================================================================
// Column Mappings: TypeScript CamelCase <-> PostgreSQL Snake_Case
// =========================================================================

export function mapTaskToRow(task: Omit<Task, 'id'> | Task, userId: string): SupabaseTaskInsertPayload {
  let status: TaskStatus = task.status || (task.completed ? 'completed' : 'todo');
  if (task.completed && status !== 'completed') {
    status = 'completed';
  } else if (task.completed === false && status === 'completed') {
    status = 'todo';
  }

  const isCompleted = status === 'completed';

  return {
    user_id: userId,
    title: task.title ? task.title.trim() : 'Untitled Task',
    description: task.description || '',
    due_date: task.date || new Date().toISOString().split('T')[0],
    start_time: task.time || null,
    duration_minutes: typeof task.durationMinutes === 'number' ? Math.round(task.durationMinutes) : null,
    priority: task.priority || 'medium',
    energy_level: task.energyLevel || 'medium',
    status,
    list_id: sanitizeUUIDOrNull(task.listId),
    goal_id: sanitizeUUIDOrNull(task.goalId),
    plan_id: sanitizeUUIDOrNull(task.planId),
    parent_task_id: sanitizeUUIDOrNull(task.parentTaskId),
    completed_at: isCompleted ? (task.completedAt || new Date().toISOString()) : null,
    created_at: task.createdAt || new Date().toISOString(),
  };
}

export function mapRowToTask(row: any): Task {
  const isCompleted = row.status === 'completed' || (!row.status && Boolean(row.completed_at));
  const status: TaskStatus = (row.status || (isCompleted ? 'completed' : 'todo')) as TaskStatus;

  return {
    id: String(row.id),
    title: row.title || 'Untitled Task',
    description: row.description || '',
    completed: isCompleted,
    status,
    date: row.due_date || row.date || new Date().toISOString().split('T')[0],
    time: row.start_time || row.time || undefined,
    durationMinutes: row.duration_minutes ?? row.durationMinutes ?? undefined,
    priority: (row.priority || 'medium') as Priority,
    energyLevel: (row.energy_level || 'medium') as EnergyLevel,
    category: row.category || 'Work',
    listId: row.list_id || row.listId || undefined,
    goalId: row.goal_id || row.goalId || undefined,
    goalSubtaskId: row.goal_subtask_id || row.goalSubtaskId || undefined,
    planId: row.plan_id || row.planId || undefined,
    planDayNumber: row.plan_day_number ?? row.planDayNumber ?? undefined,
    parentTaskId: row.parent_task_id || row.parentTaskId || null,
    completedAt: row.completed_at || row.completedAt || undefined,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
  };
}

export function mapListToRow(list: CustomList, userId: string) {
  return {
    ...(isValidUUID(list.id) ? { id: list.id } : {}),
    user_id: userId,
    name: list.name,
    icon: list.iconName || 'Folder',
    created_at: list.createdAt || new Date().toISOString(),
  };
}

export function mapRowToList(row: any): CustomList {
  return {
    id: String(row.id),
    name: row.name || 'Untitled List',
    color: row.color || 'indigo',
    iconName: row.icon || row.icon_name || row.iconName || 'Folder',
    description: row.description || '',
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
  };
}

export function mapGoalToRow(goal: Goal, userId: string) {
  return {
    ...(isValidUUID(goal.id) ? { id: goal.id } : {}),
    user_id: userId,
    title: goal.title,
    description: goal.description || '',
    target_date: goal.targetDate || null,
    created_at: goal.createdAt || new Date().toISOString(),
  };
}

export function mapRowToGoal(row: any): Goal {
  return {
    id: String(row.id),
    title: row.title || 'Untitled Goal',
    description: row.description || '',
    category: row.category || 'Work',
    color: row.color || 'indigo',
    targetDate: row.target_date || row.targetDate || '',
    tasks: Array.isArray(row.tasks) ? row.tasks : [],
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
  };
}

export function mapPlanToRow(plan: GeneratedPlan, userId: string) {
  return {
    ...(isValidUUID(plan.id) ? { id: plan.id } : {}),
    user_id: userId,
    title: plan.goal || 'Plan',
    description: plan.notes || '',
    target_date: plan.targetDate || null,
    created_at: plan.createdAt || new Date().toISOString(),
  };
}

export function mapRowToPlan(row: any): GeneratedPlan {
  return {
    id: String(row.id),
    goal: row.title || row.goal || 'Untitled Plan',
    category: row.category || 'Work',
    priority: (row.priority || 'medium') as Priority,
    targetDate: row.target_date || row.targetDate || '',
    availableDays: row.available_days ?? row.availableDays ?? 3,
    minutesPerDay: row.minutes_per_day ?? row.minutesPerDay ?? 60,
    notes: row.description || row.notes || '',
    days: Array.isArray(row.days) ? row.days : [],
    isScheduled: Boolean(row.is_scheduled ?? row.isScheduled),
    linkedGoalId: row.linked_goal_id || row.linkedGoalId || undefined,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

export function mapNoteToRow(note: Note, userId: string) {
  return {
    ...(isValidUUID(note.id) ? { id: note.id } : {}),
    user_id: userId,
    title: note.title,
    content: note.content || '',
    created_at: note.createdAt || new Date().toISOString(),
  };
}

export function mapRowToNote(row: any): Note {
  return {
    id: String(row.id),
    title: row.title || 'Untitled Note',
    content: row.content || '',
    category: row.category || 'Work',
    isPinned: Boolean(row.is_pinned ?? row.isPinned),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

// =========================================================================
// Supabase Database Service APIs (with RLS Enforcement)
// =========================================================================

/**
 * Resolves the authenticated user's actual Supabase UUID.
 * Ensures that the ID passed to database operations strictly matches auth.uid().
 */
export async function getAuthenticatedUserId(fallbackUserId?: string): Promise<string> {
  if (supabase) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user?.id && isValidUUID(sessionData.session.user.id)) {
        return sessionData.session.user.id;
      }
    } catch {
      // ignore
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.id && isValidUUID(userData.user.id)) {
        return userData.user.id;
      }
    } catch {
      // ignore
    }
  }

  if (fallbackUserId && isValidUUID(fallbackUserId)) {
    return fallbackUserId;
  }

  throw new Error('Supabase authentication required: could not obtain valid authenticated user UUID');
}

// --- Tasks ---
export async function dbFetchTasks(userId: string): Promise<Task[]> {
  if (!supabase) return [];
  const authUserId = await getAuthenticatedUserId(userId);
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', authUserId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapRowToTask);
}

/**
 * Creates a task in Supabase, strictly omitting the `id` field from the insert payload.
 * PostgreSQL/Supabase generates the authoritative UUID.
 * Returns the inserted Task including its real PostgreSQL UUID.
 */
export async function dbCreateTask(task: Omit<Task, 'id'> | Task, userId: string): Promise<Task> {
  if (!supabase) throw new Error('Supabase client not initialized');

  const authUserId = await getAuthenticatedUserId(userId);

  // NOTE: Strictly OMIT `id` so PostgreSQL generates the UUID!
  // NOTE: The tasks table uses the `status` column for completion ('completed', 'todo', 'in_progress').
  // Do NOT include `completed` in the database payload.
  const insertPayload: SupabaseTaskInsertPayload = mapTaskToRow(task, authUserId);

  const { data, error } = await supabase
    .from('tasks')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    if (error.code === '42501' || error.message?.includes('row-level security')) {
      const rlsErr: any = new Error(
        'Supabase Row-Level Security (RLS) policy error: Table "tasks" requires an INSERT policy in Supabase. Your task was saved locally.'
      );
      rlsErr.code = '42501';
      rlsErr.isRlsError = true;
      rlsErr.originalError = error;
      throw rlsErr;
    }
    throw error;
  }
  return mapRowToTask(data);
}

/**
 * Updates an existing task in Supabase by UUID.
 * If the task has a legacy/non-UUID id, it is safely created in Supabase instead.
 */
export async function dbUpdateTask(task: Task, userId: string): Promise<Task> {
  if (!supabase) throw new Error('Supabase client not initialized');

  if (!isValidUUID(task.id)) {
    return dbCreateTask(task, userId);
  }

  const authUserId = await getAuthenticatedUserId(userId);

  let status: TaskStatus = task.status || (task.completed ? 'completed' : 'todo');
  if (task.completed && status !== 'completed') {
    status = 'completed';
  } else if (task.completed === false && status === 'completed') {
    status = 'todo';
  }

  const isCompleted = status === 'completed';

  // NOTE: The tasks table uses the `status` column for completion ('completed', 'todo', 'in_progress').
  // Do NOT include `completed` in the database payload.
  const updatePayload: SupabaseTaskUpdatePayload = {
    title: task.title ? task.title.trim() : 'Untitled Task',
    description: task.description || '',
    due_date: task.date || new Date().toISOString().split('T')[0],
    start_time: task.time || null,
    duration_minutes: typeof task.durationMinutes === 'number' ? Math.round(task.durationMinutes) : null,
    priority: task.priority || 'medium',
    energy_level: task.energyLevel || 'medium',
    status,
    list_id: sanitizeUUIDOrNull(task.listId),
    goal_id: sanitizeUUIDOrNull(task.goalId),
    plan_id: sanitizeUUIDOrNull(task.planId),
    parent_task_id: sanitizeUUIDOrNull(task.parentTaskId),
    completed_at: isCompleted ? (task.completedAt || new Date().toISOString()) : null,
  };

  const { data, error } = await supabase
    .from('tasks')
    .update(updatePayload)
    .eq('id', task.id)
    .eq('user_id', authUserId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Row doesn't exist in Supabase yet; create it!
      return dbCreateTask(task, authUserId);
    }
    throw error;
  }
  return mapRowToTask(data);
}

/**
 * Upserts a task: creates new tasks without `id` so PostgreSQL generates the UUID,
 * or updates existing tasks using their real UUID.
 */
export async function dbUpsertTask(task: Task, userId: string): Promise<Task> {
  if (!isValidUUID(task.id)) {
    return dbCreateTask(task, userId);
  }
  return dbUpdateTask(task, userId);
}

export async function dbDeleteTask(taskId: string, userId: string): Promise<void> {
  if (!supabase) return;
  // NEVER send a non-UUID to Supabase .delete()
  if (!isValidUUID(taskId)) return;

  const authUserId = await getAuthenticatedUserId(userId);

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('user_id', authUserId);

  if (error) throw error;
}

// --- Bulk Task Operations ---

export async function dbBulkUpdateTaskPriority(
  taskIds: string[],
  priority: Priority,
  userId: string
): Promise<void> {
  if (!supabase || taskIds.length === 0) return;
  const validIds = taskIds.filter(isValidUUID);
  if (validIds.length === 0) return;
  const authUserId = await getAuthenticatedUserId(userId);

  const { error } = await supabase
    .from('tasks')
    .update({ priority })
    .in('id', validIds)
    .eq('user_id', authUserId);

  if (error) throw error;
}

export async function dbBulkUpdateTaskList(
  taskIds: string[],
  listId: string | null,
  userId: string
): Promise<void> {
  if (!supabase || taskIds.length === 0) return;
  const validIds = taskIds.filter(isValidUUID);
  if (validIds.length === 0) return;
  const authUserId = await getAuthenticatedUserId(userId);

  const { error } = await supabase
    .from('tasks')
    .update({ list_id: sanitizeUUIDOrNull(listId) })
    .in('id', validIds)
    .eq('user_id', authUserId);

  if (error) throw error;
}

export async function dbBulkUpdateTaskStatus(
  taskIds: string[],
  status: TaskStatus,
  userId: string
): Promise<void> {
  if (!supabase || taskIds.length === 0) return;
  const validIds = taskIds.filter(isValidUUID);
  if (validIds.length === 0) return;
  const authUserId = await getAuthenticatedUserId(userId);

  const isCompleted = status === 'completed';
  const completedAt = isCompleted ? new Date().toISOString() : null;

  const { error } = await supabase
    .from('tasks')
    .update({
      status,
      completed_at: completedAt,
    })
    .in('id', validIds)
    .eq('user_id', authUserId);

  if (error) throw error;
}

export async function dbBulkUpdateTaskDueDate(
  taskIds: string[],
  dueDate: string,
  userId: string
): Promise<void> {
  if (!supabase || taskIds.length === 0) return;
  const validIds = taskIds.filter(isValidUUID);
  if (validIds.length === 0) return;
  const authUserId = await getAuthenticatedUserId(userId);

  const { error } = await supabase
    .from('tasks')
    .update({ due_date: dueDate })
    .in('id', validIds)
    .eq('user_id', authUserId);

  if (error) throw error;
}

export async function dbBulkDeleteTasks(
  taskIds: string[],
  userId: string
): Promise<void> {
  if (!supabase || taskIds.length === 0) return;
  const validIds = taskIds.filter(isValidUUID);
  if (validIds.length === 0) return;
  const authUserId = await getAuthenticatedUserId(userId);

  const { error } = await supabase
    .from('tasks')
    .delete()
    .in('id', validIds)
    .eq('user_id', authUserId);

  if (error) throw error;
}

// --- Lists ---
export async function dbFetchLists(userId: string): Promise<CustomList[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(mapRowToList);
}

export async function dbCreateList(list: Omit<CustomList, 'id'> | CustomList, userId: string): Promise<CustomList> {
  if (!supabase) throw new Error('Supabase client not initialized');
  const { data, error } = await supabase
    .from('lists')
    .insert({
      user_id: userId,
      name: list.name,
      icon: list.iconName || 'Folder',
      created_at: list.createdAt || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return mapRowToList(data);
}

export async function dbUpsertList(list: CustomList, userId: string): Promise<void> {
  if (!supabase) return;
  if (!isValidUUID(list.id)) {
    const { error } = await supabase.from('lists').insert({
      user_id: userId,
      name: list.name,
      icon: list.iconName || 'Folder',
      created_at: list.createdAt || new Date().toISOString(),
    });
    if (error) console.warn('Could not sync local list to Supabase:', error.message);
    return;
  }
  const row = mapListToRow(list, userId);
  const { error } = await supabase
    .from('lists')
    .upsert(row, { onConflict: 'id' });

  if (error) throw error;
}

export async function dbDeleteList(listId: string, userId: string): Promise<void> {
  if (!supabase) return;
  if (!isValidUUID(listId)) return;

  const { error } = await supabase
    .from('lists')
    .delete()
    .eq('id', listId)
    .eq('user_id', userId);

  if (error) throw error;
}

// --- Goals ---
export async function dbFetchGoals(userId: string): Promise<Goal[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapRowToGoal);
}

export async function dbUpsertGoal(goal: Goal, userId: string): Promise<void> {
  if (!supabase) return;
  if (!isValidUUID(goal.id)) {
    const { error } = await supabase.from('goals').insert({
      user_id: userId,
      title: goal.title,
      description: goal.description || '',
      target_date: goal.targetDate,
      created_at: goal.createdAt || new Date().toISOString(),
    });
    if (error) console.warn('Could not sync local goal to Supabase:', error.message);
    return;
  }
  const row = mapGoalToRow(goal, userId);
  const { error } = await supabase
    .from('goals')
    .upsert(row, { onConflict: 'id' });

  if (error) throw error;
}

export async function dbDeleteGoal(goalId: string, userId: string): Promise<void> {
  if (!supabase) return;
  if (!isValidUUID(goalId)) return;

  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', goalId)
    .eq('user_id', userId);

  if (error) throw error;
}

// --- Plans ---
export async function dbFetchPlans(userId: string): Promise<GeneratedPlan[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapRowToPlan);
}

export async function dbUpsertPlan(plan: GeneratedPlan, userId: string): Promise<void> {
  if (!supabase) return;
  if (!isValidUUID(plan.id)) {
    const { error } = await supabase.from('plans').insert({
      user_id: userId,
      title: plan.goal || 'Plan',
      description: plan.notes || '',
      target_date: plan.targetDate || null,
      created_at: plan.createdAt || new Date().toISOString(),
    });
    if (error) console.warn('Could not sync local plan to Supabase:', error.message);
    return;
  }
  const row = mapPlanToRow(plan, userId);
  const { error } = await supabase
    .from('plans')
    .upsert(row, { onConflict: 'id' });

  if (error) throw error;
}

export async function dbDeletePlan(planId: string, userId: string): Promise<void> {
  if (!supabase) return;
  if (!isValidUUID(planId)) return;

  const { error } = await supabase
    .from('plans')
    .delete()
    .eq('id', planId)
    .eq('user_id', userId);

  if (error) throw error;
}

// --- Notes ---
export async function dbFetchNotes(userId: string): Promise<Note[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapRowToNote);
}

export async function dbUpsertNote(note: Note, userId: string): Promise<void> {
  if (!supabase) return;
  if (!isValidUUID(note.id)) {
    const { error } = await supabase.from('notes').insert({
      user_id: userId,
      title: note.title,
      content: note.content || '',
      created_at: note.createdAt || new Date().toISOString(),
    });
    if (error) console.warn('Could not sync local note to Supabase:', error.message);
    return;
  }
  const row = mapNoteToRow(note, userId);
  const { error } = await supabase
    .from('notes')
    .upsert(row, { onConflict: 'id' });

  if (error) throw error;
}

export async function dbDeleteNote(noteId: string, userId: string): Promise<void> {
  if (!supabase) return;
  if (!isValidUUID(noteId)) return;

  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId)
    .eq('user_id', userId);

  if (error) throw error;
}
