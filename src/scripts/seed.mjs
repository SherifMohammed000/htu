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

const rawData = fs.readFileSync('src/lib/students.json', 'utf8');
const students = JSON.parse(rawData);

async function seed() {
  console.log(`Starting to seed ${students.length} students...`);
  
  let successCount = 0;
  for (const student of students) {
    try {
      const studentRef = doc(db, 'students', student.indexNumber);
      await setDoc(studentRef, {
        name: student.name,
        indexNumber: student.indexNumber,
        stream: student.stream,
        createdAt: new Date().toISOString()
      });
      successCount++;
      if (successCount % 10 === 0) {
        console.log(`Progress: ${successCount}/${students.length} seeded...`);
      }
    } catch (error) {
      console.error(`Error seeding ${student.indexNumber}:`, error);
    }
  }
  console.log(`Seeding complete! Successfully seeded ${successCount} students.`);
  process.exit(0);
}

seed();
