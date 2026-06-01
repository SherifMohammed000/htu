import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = {
  apiKey: "AIzaSyCuYOcwWXMlqfjcUSAXyo8Mazb-7xxZhzs",
  authDomain: "smart-qr1.firebaseapp.com",
  projectId: "smart-qr1",
  storageBucket: "smart-qr1.firebasestorage.app",
  messagingSenderId: "331379787968",
  appId: "1:331379787968:web:d17888fb8345b322824525",
  measurementId: "G-6DQGQNTC52"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const rawData = fs.readFileSync('src/lib/courses.json', 'utf8');
const courses = JSON.parse(rawData);

async function seed() {
  console.log(`Starting to seed ${courses.length} courses...`);
  
  let successCount = 0;
  for (const course of courses) {
    try {
      // Use course code as the document ID (removing spaces for a cleaner ID)
      const docId = course.code.replace(/\s+/g, '');
      const courseRef = doc(db, 'courses', docId);
      
      await setDoc(courseRef, {
        name: course.name,
        code: course.code,
        lecturer: course.lecturer,
        createdAt: new Date().toISOString()
      });
      successCount++;
      console.log(`Seeded: ${course.code} - ${course.name} (${course.lecturer})`);
    } catch (error) {
      console.error(`Error seeding ${course.code}:`, error);
    }
  }
  console.log(`Seeding complete! Successfully seeded ${successCount} courses.`);
  process.exit(0);
}

seed();
