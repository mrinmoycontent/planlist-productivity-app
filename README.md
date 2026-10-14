# PlanList — Productivity & Daily Planning Application

PlanList is a productivity and daily planning web application designed to help users organize tasks, manage goals, schedule their day, and track their progress in one place.

The application brings task management and personal planning together through a structured workflow:

**PLAN → BREAK DOWN → SCHEDULE → FOCUS → REVIEW**

The goal is to help users move beyond maintaining simple to-do lists and develop a more organized approach to daily execution.

## Project Overview

Managing tasks, goals, schedules, and personal notes across multiple tools can make it difficult to maintain a clear picture of priorities.

PlanList addresses this problem by bringing essential productivity features into a unified interface. Users can organize their work, plan their day, manage deadlines, and review their progress without switching between separate applications.

### Key Objectives

- Simplify daily and weekly planning.
- Organize tasks, lists, and goals in one application.
- Help users prioritize work and manage deadlines.
- Provide a structured approach to scheduling and task completion.
- Maintain user-specific data through authenticated access.
- Deliver a responsive and intuitive user experience.

## Features

### 1. Dashboard
Provides a central starting point for accessing productivity features and reviewing planning information.

### 2. Task Management
Allows users to organize individual tasks and manage their progress.

Key capabilities include:
- Create and manage tasks.
- Add task descriptions and due dates.
- Set priorities and task statuses.
- Associate tasks with lists, goals, or plans.
- Organize related tasks using parent-task relationships.
- Track task completion.

### 3. Lists
Organizes related tasks into separate lists, making it easier to manage different responsibilities and areas of work.

### 4. Daily Planning
Supports structured daily planning so users can organize their workload and approach tasks according to their priorities.

### 5. Calendar
Provides a calendar-oriented view for organizing scheduled work and reviewing upcoming tasks.

### 6. Goal Management
Helps users organize their goals and connect them with the tasks required to make progress.

### 7. Focus
Provides a dedicated area for concentrating on planned work and supporting more intentional task execution.

### 8. Notes
Provides a space for capturing information, ideas, and planning notes.

### 9. Analytics and Progress Review
Brings planning and completion information together to help users review their productivity and identify differences between intended and completed work.

### 10. Authentication and Account Security
Uses Supabase Authentication to support account registration, login, logout, and password recovery.

User-specific database access is protected through Supabase Row Level Security (RLS) policies.

### 11. Responsive Interface
Uses a modern interface designed to make core productivity features accessible across desktop and smaller screens.

## Technology Stack

| Technology | Purpose |
|---|---|
| React | Component-based user interface |
| TypeScript | Type-safe application development |
| Tailwind CSS | Styling and responsive layouts |
| Supabase Authentication | User registration, login, and password recovery |
| Supabase PostgreSQL | Persistent application data |
| Supabase Row Level Security | User-level database access control |
| Google AI Studio | AI-assisted application development |

## Technical Architecture

PlanList uses a frontend application connected to Supabase for authentication and persistent data storage.

### Application Layer

The React frontend provides the user interface and manages interactions with the application's productivity features.

TypeScript supports more structured development by providing type information for application data and component logic.

### Authentication Layer

Supabase Authentication handles user identity and authentication workflows.

The application uses authenticated sessions to associate user activity with the appropriate account.

### Database Layer

Supabase PostgreSQL stores application data.

The database includes tables for:

- `profiles`
- `lists`
- `goals`
- `plans`
- `tasks`
- `notes`

These tables support the application's account, planning, task-management, and note-taking workflows.

### Access Control

Row Level Security policies help restrict database operations to authorized users.

Database policies should enforce ownership checks so users can access or modify only records they are permitted to manage.

The frontend should not be treated as the sole security boundary; access control must be enforced by the database.

## Application Workflow

PlanList follows a practical five-stage productivity workflow.

### 1. Plan
Identify priorities and decide what needs to be accomplished.

### 2. Break Down
Organize larger objectives into manageable tasks.

### 3. Schedule
Assign tasks to a planned day or time where supported.

### 4. Focus
Work through the planned tasks and update their status.

### 5. Review
Compare intended work with completed work and use the results to inform future planning.

This workflow connects task organization with execution and progress review.

## Getting Started

### Prerequisites

Before running the application locally, ensure you have:

- Node.js and npm installed.
- Access to the project source code.
- An active Supabase project.
- The appropriate Supabase project URL and publishable key.

### Installation

Live Link
```bash
https://planlist.ai.studio/
