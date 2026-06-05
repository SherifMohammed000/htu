const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

let initialized = false;

try {
  const envPath = path.join(__dirname, ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    let projectId, clientEmail, privateKey;
    
    envContent.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const index = trimmed.indexOf("=");
      if (index === -1) return;
      const key = trimmed.substring(0, index).trim();
      let value = trimmed.substring(index + 1).trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      
      if (key === "FIREBASE_ADMIN_PROJECT_ID") projectId = value;
      if (key === "FIREBASE_ADMIN_CLIENT_EMAIL") clientEmail = value;
      if (key === "FIREBASE_ADMIN_PRIVATE_KEY") {
        privateKey = value.replace(/\\n/g, "\n");
      }
    });

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
      initialized = true;
      console.log("✓ Initialized Firebase Admin from .env.local");
    }
  }
} catch (e) {
  console.warn("Failed to load/parse .env.local:", e.message);
}

if (!initialized) {
  const possiblePaths = [
    "./service-account.json",
    "./service-account.json.json"
  ];
  let saFile = null;
  for (const saPath of possiblePaths) {
    const absolutePath = path.join(__dirname, saPath);
    if (fs.existsSync(absolutePath)) {
      saFile = absolutePath;
      break;
    }
  }
  
  if (saFile) {
    try {
      const serviceAccount = require(saFile);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      initialized = true;
      console.log(`✓ Initialized Firebase Admin from ${path.basename(saFile)}`);
    } catch (e) {
      console.error(`Failed to load ${saFile}:`, e.message);
    }
  }
}

if (!initialized) {
  console.error("❌ Could not initialize Firebase Admin SDK. Please configure .env.local or add service-account.json");
  process.exit(1);
}

const db = admin.firestore();
const auth = admin.auth();

async function purgeAll() {
  console.log("🚀 Starting database cleanup...");

  try {
    // 1. Delete all attendance records
    console.log("Deleting Firestore 'attendance_records'...");
    const attendanceSnapshot = await db.collection("attendance_records").get();
    if (attendanceSnapshot.size > 0) {
      const batch = db.batch();
      attendanceSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      console.log(`✓ Deleted ${attendanceSnapshot.size} attendance records.`);
    } else {
      console.log("No attendance records found.");
    }

    // 2. Delete all sessions
    console.log("Deleting Firestore 'sessions'...");
    const sessionsSnapshot = await db.collection("sessions").get();
    if (sessionsSnapshot.size > 0) {
      const batch = db.batch();
      sessionsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      console.log(`✓ Deleted ${sessionsSnapshot.size} sessions.`);
    } else {
      console.log("No sessions found.");
    }

    // 3. Delete all activated user profiles from Firestore
    console.log("Deleting Firestore 'users'...");
    const usersSnapshot = await db.collection("users").get();
    if (usersSnapshot.size > 0) {
      const batch = db.batch();
      usersSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      console.log(`✓ Deleted ${usersSnapshot.size} user profiles.`);
    } else {
      console.log("No user profiles found in Firestore.");
    }

    // 4. Delete all users from Firebase Auth
    console.log("Deleting from Firebase Auth...");
    let pageToken;
    let authCount = 0;
    do {
      const listUsersResult = await auth.listUsers(1000, pageToken);
      const uids = listUsersResult.users.map((userRecord) => userRecord.uid);
      if (uids.length > 0) {
        await auth.deleteUsers(uids);
        authCount += uids.length;
      }
      pageToken = listUsersResult.pageToken;
    } while (pageToken);
    
    console.log(`✓ Deleted ${authCount} users from Firebase Auth.`);
    console.log("\n🎉 Database purge completed successfully!");
  } catch (err) {
    console.error("❌ Cleanup failed with error:", err);
  }
}

purgeAll().then(() => process.exit(0));
