const admin = require("firebase-admin");
const serviceAccount = require("./service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

async function purgeUsers() {
  console.log("Starting to purge all users...");
  try {
    // 1. Delete all users from Firestore
    console.log("Deleting from Firestore 'users' collection...");
    const usersSnapshot = await db.collection("users").get();
    
    // Batch limits are 500 operations, but we might have less. Just in case, we chunk it if needed,
    // but assuming less than 500 users for this small app.
    if (usersSnapshot.size > 0) {
      let batches = [];
      let currentBatch = db.batch();
      let count = 0;
      
      usersSnapshot.docs.forEach((doc) => {
        currentBatch.delete(doc.ref);
        count++;
        if (count === 490) {
          batches.push(currentBatch.commit());
          currentBatch = db.batch();
          count = 0;
        }
      });
      if (count > 0) {
        batches.push(currentBatch.commit());
      }
      await Promise.all(batches);
      console.log(`Deleted ${usersSnapshot.size} documents from Firestore.`);
    } else {
      console.log("No users found in Firestore to delete.");
    }

    // 2. Delete all users from Firebase Auth
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
    
    console.log(`Deleted ${authCount} users from Firebase Auth.`);
    console.log("Successfully purged all users from the system.");
  } catch (err) {
    console.error("Error purging users:", err);
  }
}

purgeUsers().then(() => process.exit(0));
