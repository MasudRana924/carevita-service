const fs = require('fs');
const path = require('path');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');

let messaging = null;

const resolveServiceAccount = () => {
  const envPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const defaultPath = path.join(process.cwd(), 'firebase-service-account.json');
  const filePath = envPath || defaultPath;

  if (!fs.existsSync(filePath)) {
    throw new Error(`Firebase service account file not found at ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

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
