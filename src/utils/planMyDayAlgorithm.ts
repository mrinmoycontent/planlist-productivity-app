import { Task, Priority, EnergyLevel } from '../types';

export type PlanBucket = 'must-do' | 'quick-wins' | 'if-time-remains';

export interface PlannedScheduleItem {
  taskId: string;
  title: string;
  bucket: PlanBucket;
  durationMinutes: number;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  priority: Priority;
  energyLevel?: EnergyLevel;
  category: string;
  dueDate?: string;
  originalTask: Task;
  order: number;
}

export interface PlanGenerationResult {
  items: PlannedScheduleItem[];
  totalPlannedMinutes: number;
  mustDoMinutes: number;
  quickWinsMinutes: number;
  ifTimeRemainsMinutes: number;
  availableMinutes: number;
  remainingMinutes: number;
  isOverCapacity: boolean;
  overCapacityMinutes: number;
}

/**
 * Parses "HH:mm" time string into minutes since midnight (0..1439).
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 9 * 60; // default 09:00
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  return h * 60 + m;
}

/**
 * Formats minutes since midnight into "HH:mm".
 */
export function minutesToTime(totalMins: number): string {
  const normalized = ((totalMins % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Adds minutes to "HH:mm" and returns new "HH:mm".
 */
export function addMinutesToTime(timeStr: string, minsToAdd: number): string {
  const current = parseTimeToMinutes(timeStr);
  return minutesToTime(current + minsToAdd);
}

/**
 * Returns formatted hours and minutes string, e.g. "2h 30m" or "45m".
 */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/**
 * Returns the current time rounded up to the next 15-minute mark.
 * If late night (after 21:00) or early morning (before 06:00), defaults to 09:00.
 */
export function getDefaultStartTime(): string {
  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();

  if (currentHours >= 21 || currentHours < 6) {
    return '09:00';
  }

  // Round up to nearest 15 mins
  const remainder = currentMinutes % 15;
  let nextMinutes = remainder === 0 ? currentMinutes : currentMinutes + (15 - remainder);
  let nextHours = currentHours;

  if (nextMinutes >= 60) {
    nextMinutes = 0;
    nextHours += 1;
  }

  return `${String(nextHours).padStart(2, '0')}:${String(nextMinutes).padStart(2, '0')}`;
}

/**
 * Deterministically scores a candidate task based on urgency, deadline, and priority.
 */
export function calculateDeterministicScore(task: Task, todayStr: string): number {
  let score = 0;

  // 1. Overdue incomplete tasks have the highest urgency
  if (task.date && task.date < todayStr && !task.completed) {
    score += 1000;
  }

  // 2. Tasks due today
  if (task.date === todayStr && !task.completed) {
    score += 500;
  }

  // 3. Priority weighting
  switch (task.priority) {
    case 'urgent':
      score += 300;
      break;
    case 'high':
      score += 200;
      break;
    case 'medium':
      score += 100;
      break;
    case 'low':
    default:
      score += 10;
      break;
  }

  // 4. Tasks already scheduled with a time today get anchored
  if (task.date === todayStr && task.time) {
    score += 150;
  }

  // 5. Energy level matching (high energy boost)
  if (task.energyLevel === 'high') {
    score += 25;
  }

  // 6. Shorter duration boost (10-25m tasks get slight momentum score)
  const duration = task.durationMinutes || 30;
  if (duration <= 25) {
    score += 35;
  }

  return score;
}

/**
 * Generates a realistic, deterministic schedule from selected tasks and an available time budget.
 *
 * Prioritization:
 * 1. Overdue tasks
 * 2. Tasks due today
 * 3. High/Urgent priority
 * 4. Short tasks (<= 25m) for Quick Wins
 * 5. Energy matching
 * 6. Existing scheduled times
 *
 * Buckets:
 * - MUST DO: Non-negotiable urgent tasks fitting within the budget.
 * - QUICK WINS: Short tasks (<= 25m) that fit within remaining time.
 * - IF TIME REMAINS: Overflow or lower-urgency tasks.
 */
export function generateDeterministicPlan(
  selectedTasks: Task[],
  availableMinutes: number,
  startTimeAnchor: string,
  todayStr: string
): PlanGenerationResult {
  if (selectedTasks.length === 0) {
    return {
      items: [],
      totalPlannedMinutes: 0,
      mustDoMinutes: 0,
      quickWinsMinutes: 0,
      ifTimeRemainsMinutes: 0,
      availableMinutes,
      remainingMinutes: availableMinutes,
      isOverCapacity: false,
      overCapacityMinutes: 0,
    };
  }

  // Calculate scores
  const scoredTasks = selectedTasks.map((task) => ({
    task,
    score: calculateDeterministicScore(task, todayStr),
    duration: Math.max(10, task.durationMinutes || 30),
    isShort: (task.durationMinutes || 30) <= 25,
    hasFixedTime: Boolean(task.time && task.date === todayStr),
  }));

  // Sort by score descending
  scoredTasks.sort((a, b) => {
    // If one has fixed time today, keep earlier fixed times first
    if (a.hasFixedTime && b.hasFixedTime && a.task.time && b.task.time) {
      return a.task.time.localeCompare(b.task.time);
    }
    return b.score - a.score;
  });

  const mustDo: typeof scoredTasks = [];
  const quickWins: typeof scoredTasks = [];
  const ifTimeRemains: typeof scoredTasks = [];

  let allocatedMinutes = 0;

  // First pass: identify true Quick Wins (short tasks <= 25m)
  // We reserve up to 25% of available budget for quick wins, or at least 1-2 quick tasks
  const maxQuickWinMinutes = Math.max(30, Math.round(availableMinutes * 0.25));
  let quickWinMinutes = 0;

  for (const item of scoredTasks) {
    const dur = item.duration;

    // Check if task qualifies for Quick Wins:
    // It's short, not already marked urgent/overdue non-negotiable, or fits well
    const isOverdueOrUrgent =
      (item.task.date && item.task.date < todayStr) || item.task.priority === 'urgent';

    if (item.isShort && !isOverdueOrUrgent && quickWinMinutes + dur <= maxQuickWinMinutes && allocatedMinutes + dur <= availableMinutes) {
      quickWins.push(item);
      quickWinMinutes += dur;
      allocatedMinutes += dur;
      continue;
    }

    // Otherwise, check if it fits in MUST DO
    if (allocatedMinutes + dur <= availableMinutes) {
      mustDo.push(item);
      allocatedMinutes += dur;
    } else {
      // Over budget: overflows to IF TIME REMAINS
      ifTimeRemains.push(item);
    }
  }

  // If no must-do was added because the first task is large, but budget allows at least part
  if (mustDo.length === 0 && quickWins.length === 0 && scoredTasks.length > 0) {
    const first = scoredTasks[0];
    mustDo.push(first);
    allocatedMinutes = first.duration;
    // Remove from ifTimeRemains if it was put there
    const idx = ifTimeRemains.findIndex((t) => t.task.id === first.task.id);
    if (idx !== -1) ifTimeRemains.splice(idx, 1);
  }

  // Build sequential timeline starting from startTimeAnchor
  let currentTime = startTimeAnchor;
  const scheduleItems: PlannedScheduleItem[] = [];
  let order = 0;

  // 1. MUST DO items
  for (const item of mustDo) {
    const startTime = currentTime;
    const endTime = addMinutesToTime(startTime, item.duration);
    scheduleItems.push({
      taskId: item.task.id,
      title: item.task.title,
      bucket: 'must-do',
      durationMinutes: item.duration,
      startTime,
      endTime,
      priority: item.task.priority,
      energyLevel: item.task.energyLevel,
      category: item.task.category,
      dueDate: item.task.date,
      originalTask: item.task,
      order: order++,
    });
    currentTime = endTime;
  }

  // 2. QUICK WINS items
  for (const item of quickWins) {
    const startTime = currentTime;
    const endTime = addMinutesToTime(startTime, item.duration);
    scheduleItems.push({
      taskId: item.task.id,
      title: item.task.title,
      bucket: 'quick-wins',
      durationMinutes: item.duration,
      startTime,
      endTime,
      priority: item.task.priority,
      energyLevel: item.task.energyLevel,
      category: item.task.category,
      dueDate: item.task.date,
      originalTask: item.task,
      order: order++,
    });
    currentTime = endTime;
  }

  // 3. IF TIME REMAINS items (tentative bonus tasks)
  for (const item of ifTimeRemains) {
    // Unassigned start time or overflow estimate
    scheduleItems.push({
      taskId: item.task.id,
      title: item.task.title,
      bucket: 'if-time-remains',
      durationMinutes: item.duration,
      startTime: '',
      endTime: '',
      priority: item.task.priority,
      energyLevel: item.task.energyLevel,
      category: item.task.category,
      dueDate: item.task.date,
      originalTask: item.task,
      order: order++,
    });
  }

  const mustDoMinutes = mustDo.reduce((acc, t) => acc + t.duration, 0);
  const totalQuickWinsMinutes = quickWins.reduce((acc, t) => acc + t.duration, 0);
  const ifTimeRemainsMinutes = ifTimeRemains.reduce((acc, t) => acc + t.duration, 0);
  const totalPlannedMinutes = mustDoMinutes + totalQuickWinsMinutes;
  const remainingMinutes = Math.max(0, availableMinutes - totalPlannedMinutes);
  const isOverCapacity = totalPlannedMinutes > availableMinutes;
  const overCapacityMinutes = Math.max(0, totalPlannedMinutes - availableMinutes);

  return {
    items: scheduleItems,
    totalPlannedMinutes,
    mustDoMinutes,
    quickWinsMinutes: totalQuickWinsMinutes,
    ifTimeRemainsMinutes,
    availableMinutes,
    remainingMinutes,
    isOverCapacity,
    overCapacityMinutes,
  };
}

/**
 * Recalculates timeline start and end times sequentially for all active items in Must Do and Quick Wins.
 */
export function recalculateTimeline(
  items: PlannedScheduleItem[],
  startTimeAnchor: string
): PlannedScheduleItem[] {
  let currentTime = startTimeAnchor;

  const mustDo = items.filter((i) => i.bucket === 'must-do');
  const quickWins = items.filter((i) => i.bucket === 'quick-wins');
  const ifTime = items.filter((i) => i.bucket === 'if-time-remains');

  let order = 0;
  const updated: PlannedScheduleItem[] = [];

  for (const item of mustDo) {
    const startTime = currentTime;
    const endTime = addMinutesToTime(startTime, item.durationMinutes);
    updated.push({
      ...item,
      order: order++,
      startTime,
      endTime,
    });
    currentTime = endTime;
  }

  for (const item of quickWins) {
    const startTime = currentTime;
    const endTime = addMinutesToTime(startTime, item.durationMinutes);
    updated.push({
      ...item,
      order: order++,
      startTime,
      endTime,
    });
    currentTime = endTime;
  }

  for (const item of ifTime) {
    updated.push({
      ...item,
      order: order++,
      startTime: '',
      endTime: '',
    });
  }

  return updated;
}
