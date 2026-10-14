import { GeneratedPlan, PlanDay, PlanFormInput, PlanTaskItem } from '../types';
import { addDays, getTodayString } from './dateUtils';
import { generateUUID } from '../lib/supabase';

interface TemplateTaskDef {
  title: string;
  durationMinutes: number;
  notes?: string;
}

interface TemplateDayDef {
  label: string;
  tasks: TemplateTaskDef[];
}

/**
 * Built-in structured templates tailored for common productivity goals
 */
const DOMAIN_TEMPLATES: Record<string, TemplateDayDef[]> = {
  interview: [
    {
      label: 'Day 1 — Foundation & Research',
      tasks: [
        { title: 'Research company & recent achievements', durationMinutes: 20 },
        { title: 'Review job description & align key strengths', durationMinutes: 15 },
        { title: 'Prepare introduction & elevator pitch', durationMinutes: 25 },
      ],
    },
    {
      label: 'Day 2 — Core Questions & Stories',
      tasks: [
        { title: 'Prepare common interview questions & STAR stories', durationMinutes: 30 },
        { title: 'Practice answers out loud with timer', durationMinutes: 30 },
      ],
    },
    {
      label: 'Day 3 — Deep-Dive & Questions',
      tasks: [
        { title: 'Formulate 5 thoughtful questions to ask the interviewer', durationMinutes: 20 },
        { title: 'Conduct simulated mock interview recording', durationMinutes: 40 },
      ],
    },
    {
      label: 'Day 4 — Logistics & Confidence',
      tasks: [
        { title: 'Review key portfolio projects & numbers', durationMinutes: 35 },
        { title: 'Prepare outfit, tech setup, and portfolio links', durationMinutes: 25 },
      ],
    },
    {
      label: 'Day 5 — Final Polish',
      tasks: [
        { title: 'Rapid-fire question rehearsal', durationMinutes: 30 },
        { title: 'Mindset warmup & rest before interview day', durationMinutes: 30 },
      ],
    },
  ],

  project: [
    {
      label: 'Day 1 — Scope & Architecture',
      tasks: [
        { title: 'Define project scope & core requirements', durationMinutes: 25 },
        { title: 'Map out architecture and file structure', durationMinutes: 20 },
        { title: 'Initialize repository and dependencies', durationMinutes: 15 },
      ],
    },
    {
      label: 'Day 2 — Core MVP Development',
      tasks: [
        { title: 'Build primary data models and context', durationMinutes: 30 },
        { title: 'Implement core user flow and main UI', durationMinutes: 30 },
      ],
    },
    {
      label: 'Day 3 — Polish & Deployment',
      tasks: [
        { title: 'Test user flows and resolve edge cases', durationMinutes: 30 },
        { title: 'Deploy preview and write documentation', durationMinutes: 30 },
      ],
    },
  ],

  study: [
    {
      label: 'Day 1 — Syllabus & Fundamentals',
      tasks: [
        { title: 'Survey syllabus & core concepts', durationMinutes: 25 },
        { title: 'Read foundational documentation/chapters', durationMinutes: 35 },
      ],
    },
    {
      label: 'Day 2 — Active Practice',
      tasks: [
        { title: 'Complete hands-on exercises', durationMinutes: 40 },
        { title: 'Summarize key formulas or cheat sheets', durationMinutes: 20 },
      ],
    },
    {
      label: 'Day 3 — Knowledge Check & Flashcards',
      tasks: [
        { title: 'Solve mock quiz or practice problem set', durationMinutes: 40 },
        { title: 'Review mistaken items and reinforce weak spots', durationMinutes: 20 },
      ],
    },
  ],

  presentation: [
    {
      label: 'Day 1 — Narrative & Outline',
      tasks: [
        { title: 'Clarify target audience and key takeaway', durationMinutes: 20 },
        { title: 'Draft slide deck outline and storyline', durationMinutes: 40 },
      ],
    },
    {
      label: 'Day 2 — Visual Slide Creation',
      tasks: [
        { title: 'Design slide layouts and graphics', durationMinutes: 35 },
        { title: 'Write speaker notes and talking points', durationMinutes: 25 },
      ],
    },
    {
      label: 'Day 3 — Dry Run & Rehearsal',
      tasks: [
        { title: 'Dry run presentation aloud with clicker/timer', durationMinutes: 35 },
        { title: 'Refine transition phrasing and timing', durationMinutes: 25 },
      ],
    },
  ],

  organization: [
    {
      label: 'Day 1 — Declutter & Purge',
      tasks: [
        { title: 'Sort items into Keep, Donate, and Discard', durationMinutes: 35 },
        { title: 'Clear primary desk surface and cable clutter', durationMinutes: 25 },
      ],
    },
    {
      label: 'Day 2 — Categorization & Storage',
      tasks: [
        { title: 'Organize files into clean categorized folders', durationMinutes: 30 },
        { title: 'Wipe down work surfaces and setup ergonomics', durationMinutes: 30 },
      ],
    },
  ],
};

/**
 * Generates an intelligent, editable structured plan containing actionable daily tasks
 */
export function generatePlanBreakdown(input: PlanFormInput): GeneratedPlan {
  const today = getTodayString();
  const goalLower = input.goal.toLowerCase();

  // 1. Identify matching template or fall back to algorithmic decomposition
  let matchedTemplate: TemplateDayDef[] | null = null;
  if (goalLower.includes('interview') || goalLower.includes('job') || goalLower.includes('hire') || goalLower.includes('career')) {
    matchedTemplate = DOMAIN_TEMPLATES.interview;
  } else if (goalLower.includes('project') || goalLower.includes('launch') || goalLower.includes('app') || goalLower.includes('build') || goalLower.includes('code')) {
    matchedTemplate = DOMAIN_TEMPLATES.project;
  } else if (goalLower.includes('learn') || goalLower.includes('study') || goalLower.includes('course') || goalLower.includes('exam') || goalLower.includes('read')) {
    matchedTemplate = DOMAIN_TEMPLATES.study;
  } else if (goalLower.includes('present') || goalLower.includes('pitch') || goalLower.includes('slide') || goalLower.includes('talk') || goalLower.includes('speech')) {
    matchedTemplate = DOMAIN_TEMPLATES.presentation;
  } else if (goalLower.includes('clean') || goalLower.includes('organize') || goalLower.includes('declutter') || goalLower.includes('room') || goalLower.includes('office')) {
    matchedTemplate = DOMAIN_TEMPLATES.organization;
  }

  const requestedDays = Math.max(1, Math.min(input.availableDays || 2, 7));
  const targetMins = input.minutesPerDay || 60;

  const generatedDays: PlanDay[] = [];

  for (let d = 0; d < requestedDays; d++) {
    const dayNumber = d + 1;
    const scheduledDate = addDays(today, d);

    let dayTasks: PlanTaskItem[] = [];

    if (matchedTemplate && matchedTemplate[d]) {
      // Use template day definition
      const tDay = matchedTemplate[d];
      
      // If user provided a different time per day (e.g. 30m vs 60m), scale task durations proportionally
      const templateTotal = tDay.tasks.reduce((sum, t) => sum + t.durationMinutes, 0);
      const scaleFactor = targetMins / (templateTotal || 60);

      dayTasks = tDay.tasks.map((task) => {
        const scaledDuration = Math.max(10, Math.round((task.durationMinutes * scaleFactor) / 5) * 5);
        return {
          id: generateUUID(),
          title: task.title,
          durationMinutes: scaledDuration,
          completed: false,
          scheduledDate,
        };
      });
    } else {
      // Algorithmic breakdown for arbitrary goals
      const cleanGoal = input.goal.trim();
      const phases = [
        {
          label: 'Discovery & Setup',
          tasks: [
            `Research prerequisites & define scope for "${cleanGoal}"`,
            `Gather reference materials, tools, and initial setup`,
            `Outline first milestone deliverables`,
          ],
        },
        {
          label: 'Core Execution Phase 1',
          tasks: [
            `Draft the foundational components of "${cleanGoal}"`,
            `Execute primary high-impact requirements`,
            `Log progress and flag questions`,
          ],
        },
        {
          label: 'Core Execution Phase 2',
          tasks: [
            `Build out detailed sections and edge cases`,
            `Conduct initial functional walkthrough`,
          ],
        },
        {
          label: 'Refinement & Testing',
          tasks: [
            `Review against initial criteria & polish details`,
            `Run quality check and eliminate errors`,
          ],
        },
        {
          label: 'Final Review & Delivery',
          tasks: [
            `Finalize deliverables and prepare handoff/presentation`,
            `Reflect on outcome & archive notes`,
          ],
        },
      ];

      const phase = phases[d % phases.length];
      // Distribute target minutes into 2 or 3 coherent action items
      const taskCount = targetMins <= 45 ? 2 : 3;
      const baseDuration = Math.floor(targetMins / taskCount / 5) * 5;
      const remainder = targetMins - baseDuration * taskCount;

      dayTasks = phase.tasks.slice(0, taskCount).map((title, idx) => ({
        id: generateUUID(),
        title,
        durationMinutes: idx === 0 ? baseDuration + remainder : baseDuration,
        completed: false,
        scheduledDate,
      }));
    }

    generatedDays.push({
      dayNumber,
      label: `Day ${dayNumber}`,
      date: scheduledDate,
      targetMinutes: targetMins,
      tasks: dayTasks,
    });
  }

  const planId = generateUUID();

  return {
    id: planId,
    goal: input.goal.trim(),
    category: input.category || 'Work',
    priority: input.priority || 'high',
    targetDate: input.targetDate || addDays(today, requestedDays),
    availableDays: requestedDays,
    minutesPerDay: targetMins,
    notes: input.notes?.trim() || '',
    days: generatedDays,
    isScheduled: false,
    createdAt: today,
    updatedAt: today,
  };
}
