require('./loadEnv');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');

let messaging = null;

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
};

const resolveServiceAccount = () => ({
  type: process.env.FIREBASE_TYPE || 'service_account',
  project_id: requireEnv('FIREBASE_PROJECT_ID'),
  private_key_id: requireEnv('FIREBASE_PRIVATE_KEY_ID'),
  private_key: requireEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
  client_email: requireEnv('FIREBASE_CLIENT_EMAIL'),
  client_id: requireEnv('FIREBASE_CLIENT_ID'),
  auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
  token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url:
    process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: requireEnv('FIREBASE_CLIENT_X509_CERT_URL'),
  universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN || 'googleapis.com'
});

const initFirebase = () => {
  if (getApps().length > 0) {
    messaging = getMessaging();
    return messaging;
  }

  const serviceAccount = resolveServiceAccount();
  initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id
  });

  messaging = getMessaging();
  console.log('Firebase Admin initialized');
  return messaging;
};

const getFirebaseMessaging = () => {
  if (!messaging) {
    return initFirebase();
  }
  return messaging;
};

module.exports = {
  initFirebase,
  getFirebaseMessaging
};
