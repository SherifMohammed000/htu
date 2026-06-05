import * as admin from 'firebase-admin';

let initialized = false;

export function getFirebaseAdmin() {
  if (initialized || admin.apps.length > 0) {
    initialized = true;
    return admin;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.trim();
  if (privateKey) {
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    } else if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
      privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.replace(/\\n/g, '\n').trim();
  }

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase Admin environment variables. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY.'
    );
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
    initialized = true;
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    console.error('Error initializing Firebase Admin SDK:', error);
    const diag = {
      length: privateKey?.length,
      startsWithBegin: privateKey?.startsWith('-----BEGIN PRIVATE KEY-----'),
      endsWithEnd: privateKey?.endsWith('-----END PRIVATE KEY-----'),
      containsNewline: privateKey?.includes('\n'),
      containsEscapedNewline: privateKey?.includes('\\n'),
      first30: privateKey?.substring(0, 30),
      last30: privateKey?.substring(privateKey.length - 30)
    };
    throw new Error(
      `Failed to parse private key: ${error.message}. Diag: len=${diag.length}, begin=${diag.startsWithBegin}, end=${diag.endsWithEnd}, nl=${diag.containsNewline}, escNl=${diag.containsEscapedNewline}, first30='${diag.first30}', last30='${diag.last30}'`
    );
  }

  return admin;
}
