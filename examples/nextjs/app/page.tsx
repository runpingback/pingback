export default function Home() {
  return (
    <main style={{ maxWidth: 600, margin: "40px auto", fontFamily: "system-ui", padding: "0 20px" }}>
      <h1>Pingback Next.js Example</h1>
      <p>This app has 3 cron jobs registered with Pingback:</p>
      <ul>
        <li><strong>send-pending-emails</strong> — every 15 minutes</li>
        <li><strong>health-check</strong> — every 5 minutes</li>
        <li><strong>daily-cleanup</strong> — midnight daily</li>
      </ul>
      <h2>Setup</h2>
      <ol>
        <li>Start the platform: <code>cd apps/platform && npm run start:dev</code></li>
        <li>Start the dashboard: <code>cd apps/dashboard && npm run dev</code></li>
        <li>Register at <a href="http://localhost:3000">localhost:3000</a> and create a project</li>
        <li>Copy your API key and cron secret to <code>.env.local</code></li>
        <li>Run <code>npm run build</code> to register functions</li>
        <li>Run <code>npm start</code> to start receiving executions</li>
      </ol>
    </main>
  );
}
