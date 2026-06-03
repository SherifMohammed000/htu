import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

export function getFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin;
  }

  try {
    const saPath = path.join(process.cwd(), 'service-account.json.json');
    const saFile = fs.readFileSync(saPath, 'utf8');
    const serviceAccount = JSON.parse(saFile);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin SDK initialized successfully.");
  } catch (error) {
    console.error("Error initializing Firebase Admin SDK:", error);
    throw error;
  }

  return admin;
}
