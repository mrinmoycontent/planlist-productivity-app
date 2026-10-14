import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy-initialized Gemini Client
let genAIInstance: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Please add your Gemini API key in the Settings panel.');
  }
  if (!genAIInstance) {
    genAIInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIInstance;
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// ---------------------------------------------------------------------------
// 1. AI PLAN MY DAY
// ---------------------------------------------------------------------------
app.post('/api/ai/plan-my-day', async (req, res) => {
  try {
    const { tasks, todayStr, startTimeAnchor, budgetMinutes } = req.body;

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: 'No tasks available to plan.' });
    }

    const availableBudget = typeof budgetMinutes === 'number' && budgetMinutes > 0 ? budgetMinutes : 180;
    const anchor = startTimeAnchor && /^\d{2}:\d{2}$/.test(startTimeAnchor) ? startTimeAnchor : '09:00';

    const ai = getGenAI();
    const systemPrompt = `You are a productivity planning assistant.

Create a realistic schedule using ONLY the supplied tasks.

Prioritize tasks using:
1. Due date
2. Priority
3. Energy level
4. Task duration
5. Existing start time

Do not invent tasks.
Do not change task titles.
Do not duplicate tasks.
Do not schedule completed tasks.
Do not exceed available planning time.

Prefer placing high-energy tasks during appropriate high-energy periods.

If there are more tasks than available time, leave lower-priority tasks unscheduled.

Insert sensible short breaks (e.g. 10-15 min break between intense work, or 30 min lunch/rest) where appropriate. For breaks, set taskId to null, isBreak to true, and title to "Break".

Return ONLY valid JSON.`;

    const userPrompt = `Here are the candidate tasks available to schedule:
${JSON.stringify(tasks, null, 2)}

User's requested start time: ${anchor}
User's available planning time: ${availableBudget} minutes
Planning Date: ${todayStr || 'today'}

Generate a realistic schedule using ONLY the supplied tasks.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            summary: {
              type: 'string',
              description: '1-2 sentence executive summary of the schedule strategy',
            },
            schedule: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  taskId: {
                    type: 'string',
                    nullable: true,
                    description: 'The exact ID of the existing task from the provided list, or null if this is a break',
                  },
                  title: {
                    type: 'string',
                    description: 'Exact task title matching input, or "Break"',
                  },
                  startTime: {
                    type: 'string',
                    description: '24-hour format HH:MM',
                  },
                  endTime: {
                    type: 'string',
                    description: '24-hour format HH:MM',
                  },
                  durationMinutes: {
                    type: 'integer',
                    description: 'Duration in minutes',
                  },
                  reason: {
                    type: 'string',
                    description: 'Short reason why this task is scheduled at this slot',
                  },
                  priority: {
                    type: 'string',
                    description: 'urgent, high, medium, or low',
                  },
                  energyLevel: {
                    type: 'string',
                    description: 'high, medium, or low',
                  },
                  isBreak: {
                    type: 'boolean',
                    description: 'True if this is a break',
                  },
                },
                required: ['title', 'startTime', 'endTime', 'durationMinutes', 'reason'],
              },
            },
            unscheduledTaskIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of supplied task IDs that were left unscheduled due to time constraints',
            },
          },
          required: ['schedule'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    if (!parsed || !Array.isArray(parsed.schedule)) {
      return res.status(422).json({ error: "AI couldn't create a valid schedule. Please try again." });
    }

    // Strict validation
    const validTaskMap = new Map<string, any>(tasks.map((t: any) => [t.id, t]));
    const scheduledIds = new Set<string>();

    const parseMinutes = (timeStr: string) => {
      if (!timeStr || typeof timeStr !== 'string') return null;
      const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
      if (!match) return null;
      const h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      if (h < 0 || h > 23 || m < 0 || m > 59) return null;
      return h * 60 + m;
    };

    const windowStartMins = parseMinutes(anchor) ?? 9 * 60;
    const windowEndMins = windowStartMins + availableBudget;

    let previousEndMins = windowStartMins;
    const validatedSchedule: any[] = [];

    for (const item of parsed.schedule) {
      const isBreak = Boolean(item.isBreak || !item.taskId || item.title?.toLowerCase().includes('break'));
      const startMins = parseMinutes(item.startTime);
      const endMins = parseMinutes(item.endTime);

      if (startMins === null || endMins === null || endMins <= startMins) {
        return res.status(422).json({ error: "AI couldn't create a valid schedule. Please try again." });
      }

      // Check for overlapping slots (allow 1-minute margin)
      if (startMins < previousEndMins - 1) {
        return res.status(422).json({ error: "AI couldn't create a valid schedule. Please try again." });
      }

      if (!isBreak) {
        // Validate taskId exists in supplied tasks
        if (!item.taskId || !validTaskMap.has(item.taskId)) {
          return res.status(422).json({ error: "AI couldn't create a valid schedule. Please try again." });
        }

        // Validate no duplicate task IDs
        if (scheduledIds.has(item.taskId)) {
          return res.status(422).json({ error: "AI couldn't create a valid schedule. Please try again." });
        }

        scheduledIds.add(item.taskId);
        const originalTask = validTaskMap.get(item.taskId);

        validatedSchedule.push({
          taskId: item.taskId,
          title: originalTask.title || item.title,
          startTime: item.startTime,
          endTime: item.endTime,
          durationMinutes: Math.min(item.durationMinutes || (endMins - startMins), (endMins - startMins)),
          reason: item.reason || 'High priority alignment',
          priority: originalTask.priority || item.priority || 'medium',
          energyLevel: originalTask.energyLevel || item.energyLevel || 'medium',
          isBreak: false,
        });
      } else {
        validatedSchedule.push({
          taskId: null,
          title: item.title || 'Break',
          startTime: item.startTime,
          endTime: item.endTime,
          durationMinutes: endMins - startMins,
          reason: item.reason || 'Rest and recharge',
          isBreak: true,
        });
      }

      previousEndMins = endMins;
    }

    // Determine all unscheduled tasks from the supplied list
    const computedUnscheduled = tasks
      .filter((t: any) => !scheduledIds.has(t.id))
      .map((t: any) => t.id);

    const totalPlannedMinutes = validatedSchedule
      .filter((i) => !i.isBreak)
      .reduce((sum, i) => sum + i.durationMinutes, 0);

    return res.json({
      summary: parsed.summary || 'Strategic timeline tailored to your priorities and energy levels.',
      totalPlannedMinutes,
      availableMinutes: availableBudget,
      schedule: validatedSchedule,
      unscheduledTaskIds: computedUnscheduled,
    });
  } catch (error: any) {
    console.error('Error in /api/ai/plan-my-day:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate AI daily plan. Please verify your Gemini API key in Settings.',
    });
  }
});

// ---------------------------------------------------------------------------
// 2. AI BREAK DOWN TASK
// ---------------------------------------------------------------------------
app.post('/api/ai/break-down-task', async (req, res) => {
  try {
    const { task } = req.body;
    if (!task || !task.title) {
      return res.status(400).json({ error: 'Please provide a valid task with a title.' });
    }

    const ai = getGenAI();
    const systemPrompt = `You are PlanList's task breakdown specialist.
Break down the user's task into 3 to 8 practical, highly actionable, concrete subtasks.
Each subtask must be a bite-sized action step that can be independently accomplished.
Keep the parent task intact; you are only generating sequential subtasks.
Assign a realistic estimated duration in minutes (typically 15 to 45 mins each) and an appropriate priority.
Return ONLY valid JSON according to the schema.`;

    const userPrompt = `Task to break down:
Title: ${task.title}
Description: ${task.description || 'None provided'}
Current Priority: ${task.priority || 'medium'}
Category: ${task.category || 'Work'}
Estimated Total Duration: ${task.durationMinutes || 60} minutes

Generate 3-8 practical subtasks.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            subtasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: {
                    type: 'string',
                    description: 'Specific, action-oriented step title',
                  },
                  description: {
                    type: 'string',
                    description: 'Brief context or instruction',
                  },
                  durationMinutes: {
                    type: 'integer',
                    description: 'Estimated minutes (e.g. 15, 25, 30, 45)',
                  },
                  priority: {
                    type: 'string',
                    description: 'urgent, high, medium, or low',
                  },
                },
                required: ['title', 'durationMinutes', 'priority'],
              },
            },
          },
          required: ['subtasks'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/ai/break-down-task:', error);
    return res.status(500).json({
      error: error.message || 'Failed to break down task with AI. Please verify your Gemini API key.',
    });
  }
});

// ---------------------------------------------------------------------------
// 3. AI GOAL -> TASKS
// ---------------------------------------------------------------------------
app.post('/api/ai/break-down-goal', async (req, res) => {
  try {
    const { goal, existingLists } = req.body;
    if (!goal || !goal.title) {
      return res.status(400).json({ error: 'Please provide a valid goal with a title.' });
    }

    const ai = getGenAI();
    const systemPrompt = `You are PlanList's strategic execution planner.
Your job is to transform a high-level goal into a series of 4 to 8 realistic, concrete, milestone-driven daily tasks.
Each task must be something a user can put on their calendar or task list and execute.
Include:
- title: Action-oriented verb phrase
- description: Clear deliverable definition or acceptance criteria
- durationMinutes: Realistic duration in minutes (e.g. 30, 45, 60, 90)
- priority: urgent, high, medium, or low
- suggestedDueDate: Estimated relative offset in days from today (e.g. 1, 3, 7, 14) or date suggestion
- suggestedListName: Appropriate list name matching or closely relating to available lists: ${JSON.stringify(existingLists || [])}
Return ONLY valid JSON according to schema.`;

    const userPrompt = `Goal to turn into tasks:
Title: ${goal.title}
Description: ${goal.description || 'None provided'}
Category: ${goal.category || 'General'}
Target Completion Date: ${goal.targetDate || 'Within this quarter'}

Available Lists: ${JSON.stringify(existingLists || [])}

Generate practical, high-value tasks that achieve this goal.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            tasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: {
                    type: 'string',
                    description: 'Actionable task title',
                  },
                  description: {
                    type: 'string',
                    description: 'Brief description or acceptance criteria',
                  },
                  durationMinutes: {
                    type: 'integer',
                    description: 'Estimated duration in minutes',
                  },
                  priority: {
                    type: 'string',
                    description: 'urgent, high, medium, or low',
                  },
                  daysOffset: {
                    type: 'integer',
                    description: 'Suggested schedule offset in days from today (0 for today, 1 for tomorrow, etc.)',
                  },
                  suggestedListName: {
                    type: 'string',
                    description: 'Suggested list name',
                  },
                },
                required: ['title', 'durationMinutes', 'priority', 'daysOffset'],
              },
            },
          },
          required: ['tasks'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/ai/break-down-goal:', error);
    return res.status(500).json({
      error: error.message || 'Failed to break down goal with AI. Please verify your Gemini API key.',
    });
  }
});

// ---------------------------------------------------------------------------
// 4. AI WEEKLY REVIEW
// ---------------------------------------------------------------------------
app.post('/api/ai/weekly-review', async (req, res) => {
  try {
    const { weekRange, metrics, completedTasks, incompleteTasks, overdueTasks, topCategories, topGoals } = req.body;

    const ai = getGenAI();
    const systemPrompt = `You are PlanList's weekly productivity analyst.
Your mission is to analyze the user's actual PlanList data for the week and deliver a concise, objective, encouraging, and highly actionable review.

CRITICAL INSTRUCTIONS & CONSTRAINTS:
1. Base your entire analysis STRICTLY on the actual provided PlanList task metrics and lists.
2. DO NOT make unsupported claims about the user's personality, mental health, psychological state, motivation, or innate abilities.
3. Keep the tone professional, objective, constructive, and grounded in real workload distribution.
4. Structure the output into:
   - Summary: Exact numbers (completed, planned, completion rate, overdue) and a concise 1-2 sentence factual recap.
   - What Went Well: 2-3 specific observations based directly on the completed tasks and categories.
   - What Was Unfinished: Specific analysis of uncompleted, backlogged, or carried-forward items without judgment.
   - Patterns: Realistic patterns observed from the data (e.g. category focus, task durations, high-priority fulfillment).
   - Suggested Focus For Next Week: 2-3 practical, operational adjustments (e.g. adjusting daily time budgets, breaking down carried-over tasks, scheduling high-priority items earlier).
Return ONLY valid JSON according to schema.`;

    const userPrompt = `Week analyzed: ${weekRange?.start || ''} to ${weekRange?.end || ''}

Metrics:
- Completed Tasks: ${metrics?.completed || 0}
- Planned Tasks: ${metrics?.planned || 0}
- Completion Rate: ${metrics?.completionRate || 0}%
- Overdue / Carried Forward: ${metrics?.carriedForward || 0}
- Total Completed Time: ${metrics?.totalCompletedMinutes || 0} minutes
- Total Planned Time: ${metrics?.totalPlannedMinutes || 0} minutes

Sample Completed Tasks:
${JSON.stringify((completedTasks || []).slice(0, 10), null, 2)}

Sample Incomplete / Carried Forward Tasks:
${JSON.stringify((incompleteTasks || []).slice(0, 10), null, 2)}

Overdue Tasks:
${JSON.stringify((overdueTasks || []).slice(0, 10), null, 2)}

Category Breakdown:
${JSON.stringify(topCategories || [], null, 2)}

Goal Associations:
${JSON.stringify(topGoals || [], null, 2)}

Provide an objective, high-craft weekly review based only on this data.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            summary: {
              type: 'object',
              properties: {
                completed: { type: 'integer' },
                planned: { type: 'integer' },
                completionRate: { type: 'integer' },
                overdue: { type: 'integer' },
                commentary: { type: 'string' },
              },
              required: ['completed', 'planned', 'completionRate', 'overdue', 'commentary'],
            },
            whatWentWell: {
              type: 'array',
              items: { type: 'string' },
              description: '2-3 factual observations about completed work',
            },
            whatWasUnfinished: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific analysis of carried-forward or incomplete work',
            },
            patterns: {
              type: 'array',
              items: { type: 'string' },
              description: 'Observed workload patterns from the data',
            },
            nextWeekFocus: {
              type: 'array',
              items: { type: 'string' },
              description: '2-3 practical suggestions for next week',
            },
          },
          required: ['summary', 'whatWentWell', 'whatWasUnfinished', 'patterns', 'nextWeekFocus'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/ai/weekly-review:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate weekly review. Please verify your Gemini API key.',
    });
  }
});

// ---------------------------------------------------------------------------
// Vite & Static Asset Handling
// ---------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PlanList server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
