# Dashboard Sub-project 1: Shell & Auth — Design Spec

**Date:** 2026-04-17
**Scope:** App scaffold, sidebar layout, auth flow, projects CRUD, API keys, placeholder pages

## Overview

The Pingback dashboard is a Next.js 15 app at `apps/dashboard`. This sub-project delivers the shell — layout, navigation, authentication, and the minimum pages needed for a developer to onboard (create project, get API key). Data-heavy pages (Crons, Runs, Logs) come in Sub-project 2.

## Decisions

- **UI stack:** Next.js 15 + Tailwind CSS 4 + shadcn/ui
- **Data fetching:** Hybrid — server components for shells, React Query for interactive data
- **Auth:** Custom JWT flow (no NextAuth), httpOnly cookies, auto-refresh
- **Theme:** Pure black (`#000000` background), Trigger.dev-inspired layout
- **Routing:** All dashboard pages scoped under `[projectId]`

## App Structure

```
apps/dashboard/
├── app/
│   ├── layout.tsx                    # Root layout (providers, fonts, metadata)
│   ├── (auth)/                       # No sidebar
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── auth/callback/page.tsx    # GitHub OAuth callback
│   └── (dashboard)/                  # Sidebar layout
│       ├── layout.tsx                # Sidebar + main content
│       ├── projects/page.tsx         # Project list (ACCOUNT section)
│       └── [projectId]/
│           ├── crons/page.tsx        # Placeholder
│           ├── tasks/page.tsx        # Placeholder
│           ├── runs/page.tsx         # Placeholder
│           ├── logs/page.tsx         # Placeholder
│           ├── api-keys/page.tsx     # Full implementation
│           ├── alerts/page.tsx       # Placeholder
│           └── settings/page.tsx     # Project settings
├── components/
│   ├── ui/                           # shadcn components (button, input, card, dialog, table, dropdown-menu, badge, toast)
│   ├── sidebar.tsx                   # Fixed left sidebar
│   ├── project-switcher.tsx          # Dropdown in sidebar header
│   ├── user-menu.tsx                 # Bottom of sidebar
│   └── empty-state.tsx               # Reusable placeholder component
├── lib/
│   ├── api.ts                        # Fetch wrapper with auth token injection
│   ├── auth.ts                       # Cookie helpers, token management
│   └── hooks/
│       ├── use-projects.ts           # React Query hook for projects
│       └── use-api-keys.ts           # React Query hook for API keys
├── middleware.ts                      # Auth guard for dashboard routes
├── tailwind.config.ts
├── next.config.ts
├── package.json
└── tsconfig.json
```

## Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#000000` | Sidebar, main content, page background |
| Surface | `#0a0a0a` | Table headers, card backgrounds |
| Border | `#1a1a1a` | Sidebar border, table dividers, card borders |
| Border hover | `#2a2a2a` | Interactive element borders on hover |
| Text primary | `#ffffff` | Headings, active nav items, primary content |
| Text secondary | `#a1a1a1` | Body text, descriptions |
| Text muted | `#666666` | Section headers, timestamps |
| Text disabled | `#444444` | Disabled elements |
| Accent | `#3b82f6` | Links, primary buttons, active states |
| Success | `#22c55e` | Active status, success badge |
| Error | `#ef4444` | Failed status, error badge, destructive actions |
| Warning | `#eab308` | Executing/pending status |
| Nav active bg | `#111111` | Active sidebar item background |
| Nav hover bg | `#0a0a0a` | Sidebar item hover |

## Sidebar

Fixed left sidebar, 240px wide, full height.

**Top:** Project switcher — current project name with dropdown chevron. Lists all user's projects. "Create new project" option at the bottom of the dropdown.

**PROJECT section:**
- Crons (icon: clock)
- Tasks (icon: list-checks)
- Runs (icon: play)
- Logs (icon: terminal)
- API Keys (icon: key)
- Alerts (icon: bell)

**ACCOUNT section:**
- Projects (icon: folder)

**Bottom:** User email with avatar circle. Click opens dropdown: "Settings", "Logout".

Section headers ("PROJECT", "ACCOUNT") are uppercase, `#555`, 11px, letter-spaced.

Active item: white text, `#111` background, subtle left border accent.
Inactive item: `#888` text, transparent background.

## Auth

### Login Page (`/login`)

Centered card on pure black background. Pingback logo at top.

Fields:
- Email (text input)
- Password (password input)

Actions:
- "Sign in" button (primary, full width)
- Divider: "or"
- "Sign in with GitHub" button (outline, full width, GitHub icon)
- Footer: "Don't have an account? Register" link

On submit: `POST /auth/login` → stores tokens in httpOnly cookies → redirects to dashboard.

### Register Page (`/register`)

Same layout as login.

Fields:
- Name (optional)
- Email
- Password (min 8 characters)

Actions:
- "Create account" button
- "Sign in with GitHub" button
- Footer: "Already have an account? Sign in" link

On submit: `POST /auth/register` → stores tokens → redirects to dashboard.

### GitHub OAuth Callback (`/auth/callback`)

Receives `accessToken` and `refreshToken` as URL query params from the platform's GitHub OAuth redirect. Stores both in httpOnly cookies. Redirects to dashboard.

### Auth Middleware

Next.js middleware on all `(dashboard)` routes:
- Check for `pingback_access_token` cookie
- If missing → redirect to `/login`
- If present → allow through (token validation happens on API calls)

### Token Management (`lib/auth.ts`)

- `setTokens(access, refresh)` — sets httpOnly cookies via a server action
- `getAccessToken()` — reads from cookie
- `clearTokens()` — removes cookies, redirects to login

### API Client (`lib/api.ts`)

- `apiClient.get(path)`, `apiClient.post(path, body)`, etc.
- Auto-attaches `Authorization: Bearer {token}` header
- On 401 response: attempt `POST /auth/refresh` with refresh token
- If refresh succeeds: retry original request with new token
- If refresh fails: clear tokens, redirect to login
- Base URL from `NEXT_PUBLIC_API_URL` env var (default: `http://localhost:4000`)

### First-time Flow

After login:
1. Fetch `GET /api/v1/projects`
2. If projects exist → redirect to `/{firstProject.id}/crons`
3. If no projects → redirect to `/projects` with a prompt to create one

## Projects Page (`/projects`)

Table with columns: Name, Endpoint URL, Jobs (count), Created.

Each row links to `/{projectId}/crons`.

"Create project" button in the top right → opens a dialog:
- Name (required)
- Endpoint URL (required, e.g., `https://myapp.vercel.app/api/__pingback`)
- Domain (optional)

On submit: `POST /api/v1/projects` → refresh list → navigate to new project.

## Project Settings (`/[projectId]/settings`)

View and edit project details:
- Name (editable)
- Endpoint URL (editable)
- Domain (editable)
- Cron Secret (read-only, with copy button — this is what the developer puts in `PINGBACK_CRON_SECRET`)
- Created date
- "Delete project" danger button with confirmation dialog

## API Keys Page (`/[projectId]/api-keys`)

Table with columns: Name, Key Prefix, Last Used, Created.

"Create API key" button → dialog:
- Name (required, e.g., "Production", "Development")

On submit: `POST /api/v1/projects/:id/api-keys` → show the full key in a modal with a copy button and a warning "This key will only be shown once."

Each row has a "Revoke" action (three-dot menu or button) with confirmation.

## Placeholder Pages

Crons, Tasks, Runs, Logs, and Alerts pages all render:
- Page title as heading
- An `EmptyState` component with an icon, message, and optional description

Example messages:
- Crons: "No crons yet. Functions registered via the SDK will appear here."
- Tasks: "No tasks yet. Background tasks defined with task() will appear here."
- Runs: "No runs yet. Execution history will appear here once your crons start running."
- Logs: "No logs yet. Logs from ctx.log() calls will appear here."
- Alerts: "No alerts configured. Set up alert rules to get notified of failures."

## Platform API Change Required

The project settings page displays the `cronSecret` so developers can copy it to their `PINGBACK_CRON_SECRET` env var. The current `GET /api/v1/projects/:id` response does not include `cronSecret`. The projects controller needs to include it in the response for the project owner (JWT-authenticated requests only — never expose it via API key auth).

## Environment Variables

```
NEXT_PUBLIC_API_URL=http://localhost:4000    # Platform API URL
```

## shadcn Components Needed

Install these during scaffold:
- button, input, label, card, dialog, table, dropdown-menu, badge, toast, separator, avatar, skeleton, command (for project switcher search)
