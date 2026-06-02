const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyCuYOcwWXMlqfjcUSAXyo8Mazb-7xxZhzs",
  authDomain: "smart-qr1.firebaseapp.com",
  projectId: "smart-qr1",
  storageBucket: "smart-qr1.firebasestorage.app",
  messagingSenderId: "331379787968",
  appId: "1:331379787968:web:d17888fb8345b322824525",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function verify() {
  console.log("--- COURSES (verification) ---");
  const snap = await getDocs(collection(db, "courses"));
  snap.docs.forEach(doc => {
    const d = doc.data();
    console.log(`  ${doc.id} → courseCode: ${d.courseCode}, lecturerName: ${d.lecturerName}`);
  });
  process.exit(0);
}

verify().catch(e => { console.error(e); process.exit(1); });
