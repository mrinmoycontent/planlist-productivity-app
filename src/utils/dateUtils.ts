/**
 * Utility functions for date manipulation in PlanList
 */

export function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayString(): string {
  return formatDateToISO(new Date());
}

export function getTomorrowString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDateToISO(tomorrow);
}

export function getWeekRange(): { start: string; end: string; dates: string[] } {
  const now = new Date();
  const currentDayOfWeek = now.getDay(); // 0 = Sunday
  const startOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek; // Start on Monday
  
  const monday = new Date(now);
  monday.setDate(now.getDate() + startOffset);
  
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(formatDateToISO(d));
  }
  
  return {
    start: dates[0],
    end: dates[6],
    dates,
  };
}

export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  
  const today = getTodayString();
  const tomorrow = getTomorrowString();
  
  if (dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';
  
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatFullDateHeader(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTimeDisplay(timeStr?: string): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return formatDateToISO(date);
}

export function getDayDifference(startDateStr: string, endDateStr: string): number {
  const [y1, m1, d1] = startDateStr.split('-').map(Number);
  const [y2, m2, d2] = endDateStr.split('-').map(Number);
  const date1 = new Date(y1, m1 - 1, d1);
  const date2 = new Date(y2, m2 - 1, d2);
  const diffTime = date2.getTime() - date1.getTime();
  return Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
}

export function getUpcomingFriday(): string {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sun, 5 = Fri
  let daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  if (daysUntilFriday === 0) daysUntilFriday = 7; // Next Friday
  const friday = new Date(now);
  friday.setDate(now.getDate() + daysUntilFriday);
  return formatDateToISO(friday);
}

export function getUpcomingMonday(): string {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon
  let daysUntilMonday = (1 - dayOfWeek + 7) % 7;
  if (daysUntilMonday === 0) daysUntilMonday = 7; // Next Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysUntilMonday);
  return formatDateToISO(monday);
}

export function formatMinutesToHours(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes <= 0) return '0m';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning 👋';
  if (hour < 17) return 'Good afternoon 👋';
  return 'Good evening 👋';
}
