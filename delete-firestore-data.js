const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, deleteDoc } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyCuYOcwWXMlqfjcUSAXyo8Mazb-7xxZhzs",
  authDomain: "smart-qr1.firebaseapp.com",
  projectId: "smart-qr1",
  storageBucket: "smart-qr1.firebasestorage.app",
  messagingSenderId: "331379787968",
  appId: "1:331379787968:web:d17888fb8345b322824525"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deleteCollection(collectionName) {
  console.log(`Connecting to Firestore '${collectionName}' collection...`);
  const querySnapshot = await getDocs(collection(db, collectionName));
  console.log(`Found ${querySnapshot.size} documents in '${collectionName}'. Deleting...`);
  
  let count = 0;
  for (const doc of querySnapshot.docs) {
    await deleteDoc(doc.ref);
    count++;
  }
  console.log(`✓ Successfully deleted ${count} documents from '${collectionName}'.`);
}

async function purge() {
  try {
    await deleteCollection("users");
    await deleteCollection("sessions");
    await deleteCollection("attendance_records");
    console.log("Firestore cleanup finished successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Error during Firestore cleanup:", err);
    process.exit(1);
  }
}

purge();
