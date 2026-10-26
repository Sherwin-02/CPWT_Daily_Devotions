// All settings come from environment variables (set them in Vercel → Project → Settings → Environment Variables).

export const config = {
  churchName: process.env.CHURCH_NAME || 'Citipointe West Tamil',
  timezone: process.env.TIMEZONE || 'Australia/Brisbane',
  defaultHashtags: process.env.DEFAULT_HASHTAGS || '#CPWT #DailyDevotion #BibleVerse',
  appUrl: (process.env.APP_URL || '').replace(/\/$/, ''),

  databaseUrl: process.env.DATABASE_URL,
  dashboardPassword: process.env.DASHBOARD_PASSWORD,
  sessionSecret: process.env.SESSION_SECRET,
  cronSecret: process.env.CRON_SECRET,
  renderSecret: process.env.RENDER_SECRET,

  githubToken: process.env.GITHUB_TOKEN,
  githubRepo: process.env.GITHUB_REPO || 'Sherwin-02/CPWT_Daily_Devotions',
  githubBranch: process.env.GITHUB_BRANCH || 'main',

  telegramToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramWebhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET,
  // Comma-separated chat ids allowed to approve. The first one receives previews.
  telegramChatIds: (process.env.TELEGRAM_CHAT_IDS || '').split(',').map((s) => s.trim()).filter(Boolean),

  metaGraphVersion: process.env.META_GRAPH_VERSION || 'v23.0',
  facebookPageId: process.env.FACEBOOK_PAGE_ID,
  facebookPageToken: process.env.FACEBOOK_PAGE_TOKEN,
  instagramUserId: process.env.INSTAGRAM_USER_ID,
};

export const THEMES = ['wine', 'cream', 'maroon'];
