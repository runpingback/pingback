export default () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY,
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY,
  },
  dashboardUrl: process.env.DASHBOARD_URL || 'http://localhost:3000',
});
