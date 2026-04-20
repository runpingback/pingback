# Pingback Next.js Example

Demonstrates how to use `@usepingback/next` to define cron jobs in a Next.js app.

## Cron Jobs

- **send-pending-emails** (`*/15 * * * *`) — Sends pending emails every 15 minutes
- **health-check** (`*/5 * * * *`) — Checks service health every 5 minutes
- **daily-cleanup** (`0 0 * * *`) — Cleans up expired data at midnight

## Getting Started

### 1. Start the Pingback platform

```bash
# From the monorepo root
cd apps/platform
npm run start:dev
```

### 2. Start the dashboard

```bash
cd apps/dashboard
npm run dev
```

### 3. Create a project

1. Go to http://localhost:3000
2. Register an account
3. Create a project with endpoint URL: `http://localhost:3001/api/__pingback`
4. Copy the **API key** from the API Keys page
5. Copy the **Cron Secret** from the Settings page

### 4. Configure this example

Edit `.env.local`:

```
PINGBACK_API_KEY=pb_live_your_key_here
PINGBACK_CRON_SECRET=your_cron_secret_here
PINGBACK_PLATFORM_URL=http://localhost:4000
```

### 5. Build and run

```bash
npm install
npm run build   # Registers functions with the platform
npm start       # Starts the app on port 3001
```

### 6. Watch it work

Go to the dashboard at http://localhost:3000 and navigate to your project's **Runs** page. You'll see executions appearing as the scheduler triggers your cron jobs.
