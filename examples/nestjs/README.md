# Pingback NestJS Example

Example NestJS app using `@usepingback/nestjs`.

## Example Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| `health-check` | Every 5 min | Checks database, cache, and external API health |
| `send-pending-emails` | Every 15 min | Finds pending emails, fans out to `send-single-email` tasks |
| `daily-report` | Daily at 9 AM | Generates department reports via `generate-dept-report` tasks |

## Getting Started

1. Start the Pingback platform:
   ```bash
   cd apps/platform && npm run start:dev
   ```

2. Start the dashboard:
   ```bash
   cd apps/dashboard && npm run dev
   ```

3. Create a project in the dashboard and get your API key + cron secret.

4. Configure the example:
   ```bash
   cd examples/nestjs
   cp .env.example .env
   # Edit .env with your credentials
   ```

5. Install and run:
   ```bash
   npm install
   npm run start:dev
   ```

6. Watch crons fire in the dashboard at http://localhost:3000.
