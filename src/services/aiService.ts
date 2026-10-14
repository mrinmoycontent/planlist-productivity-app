import {
  AIDailyPlanResponse,
  AISubtaskSuggestion,
  AIGoalTaskSuggestion,
  AIWeeklyReviewResponse,
  Task,
  Goal,
  CustomList,
} from '../types';

export class AIServiceError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'AIServiceError';
  }
}

/**
 * 1. AI Plan My Day
 */
export async function requestAIDailyPlan(params: {
  tasks: Array<Partial<Task> & { listName?: string; goalTitle?: string }>;
  todayStr: string;
  startTimeAnchor: string;
  budgetMinutes: number;
}): Promise<AIDailyPlanResponse> {
  const res = await fetch('/api/ai/plan-my-day', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new AIServiceError(data.error || 'Failed to generate AI plan for today');
  }
  return data;
}

/**
 * 2. AI Break Down Task
 */
export async function requestAITaskBreakdown(task: {
  id: string;
  title: string;
  description?: string;
  priority?: string;
  energyLevel?: string;
  category?: string;
  durationMinutes?: number;
}): Promise<{ subtasks: AISubtaskSuggestion[] }> {
  const res = await fetch('/api/ai/break-down-task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new AIServiceError(data.error || 'Failed to break down task with AI');
  }
  return data;
}

/**
 * 3. AI Break Down Goal
 */
export async function requestAIGoalBreakdown(
  goal: {
    id: string;
    title: string;
    description?: string;
    category?: string;
    targetDate?: string;
  },
  existingLists: Array<{ id: string; name: string }>
): Promise<{ tasks: AIGoalTaskSuggestion[] }> {
  const res = await fetch('/api/ai/break-down-goal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal, existingLists }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new AIServiceError(data.error || 'Failed to break down goal with AI');
  }
  return data;
}

/**
 * 4. AI Weekly Review
 */
export async function requestAIWeeklyReview(params: {
  weekRange: { start: string; end: string };
  metrics: {
    completed: number;
    planned: number;
    completionRate: number;
    carriedForward: number;
    totalCompletedMinutes: number;
    totalPlannedMinutes: number;
  };
  completedTasks: Array<{ title: string; category?: string; durationMinutes?: number }>;
  incompleteTasks: Array<{ title: string; priority?: string; category?: string }>;
  overdueTasks: Array<{ title: string; date?: string; priority?: string }>;
  topCategories: Array<{ category: string; count: number }>;
  topGoals: Array<{ goalTitle: string; count: number }>;
}): Promise<AIWeeklyReviewResponse> {
  const res = await fetch('/api/ai/weekly-review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new AIServiceError(data.error || 'Failed to generate AI weekly review');
  }
  return data;
}
