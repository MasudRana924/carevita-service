const envOr = (name, fallback) => {
  const raw = process.env[name];
  if (raw == null) return fallback;
  let value = String(raw).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value || fallback;
};

const getDiditConfig = () => ({
  apiKey: envOr('DIDIT_API_KEY', ''),
  workflowId: envOr('DIDIT_WORKFLOW_ID', ''),
  webhookSecret: envOr('DIDIT_WEBHOOK_SECRET', ''),
  apiUrl: envOr('DIDIT_API_URL', 'https://verification.didit.me').replace(/\/$/, ''),
  callbackUrl: envOr('DIDIT_CALLBACK_URL', ''),
  timestampWindowSeconds: parseInt(envOr('DIDIT_WEBHOOK_WINDOW_SECONDS', '300'), 10)
});

module.exports = new Proxy(
  {},
  {
    get(target, prop) {
      if (prop === 'getDiditConfig') return getDiditConfig;
      const config = getDiditConfig();
      return config[prop];
    }
  }
);
