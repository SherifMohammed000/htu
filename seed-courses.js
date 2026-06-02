/**
 * seed-courses.js
 * Updates empty Firestore course documents with courseCode and lecturerName fields.
 * Run: node seed-courses.js
 */

const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc, getDocs, collection } = require("firebase/firestore");
const fs = require("fs");

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

const lecturers = JSON.parse(fs.readFileSync("src/lib/lecturers.json", "utf8"));

async function seedCourses() {
  console.log("🚀 Seeding course documents with lecturer names...\n");

  // First, get all existing course doc IDs
  const coursesSnap = await getDocs(collection(db, "courses"));
  const existingIds = new Set(coursesSnap.docs.map(d => d.id));
  console.log(`Found ${existingIds.size} existing course documents: ${[...existingIds].join(", ")}\n`);

  let updated = 0;
  let created = 0;

  for (const lecturer of lecturers) {
    const code = lecturer.courseCode.toUpperCase();
    const ref = doc(db, "courses", code);
    await setDoc(ref, {
      courseCode: code,
      lecturerName: lecturer.lecturerName,
    }, { merge: true });

    if (existingIds.has(code)) {
      console.log(`  ✓ Updated: ${code} → ${lecturer.lecturerName}`);
      updated++;
    } else {
      console.log(`  + Created: ${code} → ${lecturer.lecturerName}`);
      created++;
    }
  }

  console.log(`\n✅ Done! Updated: ${updated}, Created: ${created}`);
  process.exit(0);
}

seedCourses().catch(e => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
