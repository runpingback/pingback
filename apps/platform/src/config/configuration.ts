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
  pingback: {
    apiKey: process.env.PINGBACK_API_KEY,
    cronSecret: process.env.PINGBACK_CRON_SECRET,
    baseUrl: process.env.PINGBACK_BASE_URL,
    platformUrl: process.env.PINGBACK_PLATFORM_URL || 'https://api.pingback.lol',
  },
  polar: {
    accessToken: process.env.POLAR_ACCESS_TOKEN,
    webhookSecret: process.env.POLAR_WEBHOOK_SECRET,
    products: {
      free: process.env.POLAR_FREE_PRODUCT_ID,
      pro: process.env.POLAR_PRO_PRODUCT_ID,
      team: process.env.POLAR_TEAM_PRODUCT_ID,
    },
  },
});
