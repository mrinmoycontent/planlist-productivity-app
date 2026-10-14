export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus = 'todo' | 'in_progress' | 'completed';

export type EnergyLevel = 'low' | 'medium' | 'high';

export type TaskCategory = 'Work' | 'Personal' | 'Shopping' | 'Travel' | 'Projects' | 'Health' | 'Finance' | string;

export interface Task {
  id: string;
  title: string;
  description?: string;
  notes?: string;
  completed: boolean;
  status?: TaskStatus;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  durationMinutes?: number; // Estimated duration in minutes
  priority: Priority;
  energyLevel?: EnergyLevel;
  category: TaskCategory;
  listId?: string;
  goalId?: string;
  goalSubtaskId?: string;
  planId?: string;
  planDayNumber?: number;
  parentTaskId?: string | null;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CustomList {
  id: string;
  name: string;
  color: string;
  iconName: string;
  description?: string;
  createdAt: string;
}

export interface GoalSubtask {
  id: string;
  title: string;
  durationMinutes?: number;
  completed: boolean;
  dueDate?: string;
  completedAt?: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  color: string;
  targetDate: string;
  tasks: GoalSubtask[];
  createdAt: string;
}

export interface PlanTaskItem {
  id: string;
  title: string;
  durationMinutes: number; // e.g. 20 min
  completed: boolean;
  notes?: string;
  scheduledTaskId?: string;
  scheduledDate?: string;
}

export interface PlanDay {
  dayNumber: number;
  label: string; // e.g. "Day 1"
  date?: string; // YYYY-MM-DD
  targetMinutes: number; // e.g. 60 min
  tasks: PlanTaskItem[];
}

export interface GeneratedPlan {
  id: string;
  goal: string;
  category: TaskCategory;
  priority: Priority;
  targetDate: string;
  availableDays: number;
  minutesPerDay: number;
  notes?: string;
  days: PlanDay[];
  isScheduled: boolean;
  linkedGoalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlanFormInput {
  goal: string;
  targetDate: string;
  availableDays: number;
  minutesPerDay: number;
  priority: Priority;
  category: TaskCategory;
  notes?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category: TaskCategory;
  isPinned: boolean;
  updatedAt: string;
  createdAt: string;
}

export type ViewType = 
  | 'dashboard'
  | 'planner'
  | 'tasks'
  | 'lists'
  | 'calendar'
  | 'goals'
  | 'focus'
  | 'notes'
  | 'analytics';

export type PlannerFilter = 'today' | 'tomorrow' | 'week';

export interface FocusSessionState {
  currentTaskId: string | null;
  customTopic: string;
  durationMinutes: number;
  remainingSeconds: number;
  isRunning: boolean;
  sessionsCompletedToday: number;
  totalMinutesToday: number;
}

export interface AIScheduleItem {
  taskId: string | null;
  title: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  reason: string;
  priority?: Priority;
  energyLevel?: EnergyLevel;
  isBreak?: boolean;
}

export interface AIDailyPlanResponse {
  summary: string;
  totalPlannedMinutes: number;
  availableMinutes?: number;
  schedule: AIScheduleItem[];
  unscheduledTaskIds?: string[];
}

export interface AISubtaskSuggestion {
  title: string;
  description?: string;
  durationMinutes: number;
  priority: Priority;
}

export interface AIGoalTaskSuggestion {
  title: string;
  description?: string;
  durationMinutes: number;
  priority: Priority;
  daysOffset: number;
  suggestedListName?: string;
}

export interface AIWeeklyReviewResponse {
  summary: {
    completed: number;
    planned: number;
    completionRate: number;
    overdue: number;
    commentary: string;
  };
  whatWentWell: string[];
  whatWasUnfinished: string[];
  patterns: string[];
  nextWeekFocus: string[];
}
