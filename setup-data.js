/**
 * HTU Attendance System — Firebase Seed Script
 *
 * Populates Firestore with initial data:
 *   - 1 admin account
 *   - 7 lecturers
 *   - 10 sample students
 *   - 5 courses
 *
 * HOW TO USE:
 *   1. Install admin SDK: npm install firebase-admin (already in devDeps ideally)
 *   2. Download your Firebase service account key from Firebase Console →
 *      Project Settings → Service Accounts → Generate new private key
 *   3. Save it as `service-account.json` in the project root.
 *   4. Run: node setup-data.js
 *
 *   ⚠️  Also create the user accounts manually in Firebase Authentication
 *       (Console → Authentication → Add User), then re-run so Firestore
 *       documents match Auth UIDs. OR use the Admin SDK createUser() calls below.
 */

const admin = require("firebase-admin");
const serviceAccount = require("./service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

// ── Seed data ─────────────────────────────────────────────────────────────

const LECTURERS = [
  { fullName: "Dr. Amina Owusu", email: "amina.owusu@htu.edu", department: "Computer Science" },
  { fullName: "Prof. Kofi Asante", email: "kofi.asante@htu.edu", department: "Engineering" },
  { fullName: "Dr. Abena Mensah", email: "abena.mensah@htu.edu", department: "Mathematics" },
  { fullName: "Dr. Kwame Boateng", email: "kwame.boateng@htu.edu", department: "Computer Science" },
  { fullName: "Prof. Esi Acheampong", email: "esi.acheampong@htu.edu", department: "Physics" },
  { fullName: "Dr. Yaw Darko", email: "yaw.darko@htu.edu", department: "Business" },
  { fullName: "Dr. Akua Frimpong", email: "akua.frimpong@htu.edu", department: "Computer Science" },
];

const STUDENTS = Array.from({ length: 20 }, (_, i) => ({
  fullName: `Student ${String(i + 1).padStart(2, "0")}`,
  email: `student${String(i + 1).padStart(2, "0")}@student.htu.edu`,
  studentId: `CS${2024100 + i}`,
  department: "Computer Science",
  level: i < 10 ? "L300" : "L400",
  enrolledCourses: [],
}));

const DEFAULT_PASSWORD = "Htu@12345";

async function seedUsers() {
  const lecturerIds = [];
  const studentIds = [];

  console.log("📌 Creating lecturers...");
  for (const l of LECTURERS) {
    try {
      let authUser;
      try {
        authUser = await auth.getUserByEmail(l.email);
        console.log(`  ✓ Lecturer already exists: ${l.email}`);
      } catch {
        authUser = await auth.createUser({
          email: l.email,
          password: DEFAULT_PASSWORD,
          displayName: l.fullName,
        });
        console.log(`  + Created lecturer: ${l.email}`);
      }
      await db.collection("users").doc(authUser.uid).set({
        fullName: l.fullName,
        email: l.email,
        department: l.department,
        role: "lecturer",
      });
      lecturerIds.push(authUser.uid);
    } catch (e) {
      console.error(`  ✗ Failed for ${l.email}:`, e.message);
    }
  }

  console.log("\n📌 Creating students...");
  for (const s of STUDENTS) {
    try {
      let authUser;
      try {
        authUser = await auth.getUserByEmail(s.email);
        console.log(`  ✓ Student already exists: ${s.email}`);
      } catch {
        authUser = await auth.createUser({
          email: s.email,
          password: DEFAULT_PASSWORD,
          displayName: s.fullName,
        });
        console.log(`  + Created student: ${s.email}`);
      }
      await db.collection("users").doc(authUser.uid).set({
        fullName: s.fullName,
        email: s.email,
        studentId: s.studentId,
        department: s.department,
        level: s.level,
        role: "student",
        enrolledCourses: [],
      });
      studentIds.push(authUser.uid);
    } catch (e) {
      console.error(`  ✗ Failed for ${s.email}:`, e.message);
    }
  }

  console.log("\n📌 Creating admin account...");
  try {
    let adminUser;
    try {
      adminUser = await auth.getUserByEmail("admin@htu.edu");
      console.log("  ✓ Admin already exists");
    } catch {
      adminUser = await auth.createUser({
        email: "admin@htu.edu",
        password: DEFAULT_PASSWORD,
        displayName: "System Admin",
      });
      console.log("  + Created admin: admin@htu.edu");
    }
    await db.collection("users").doc(adminUser.uid).set({
      fullName: "System Admin",
      email: "admin@htu.edu",
      department: "IT",
      role: "admin",
    });
  } catch (e) {
    console.error("  ✗ Failed to create admin:", e.message);
  }

  return { lecturerIds, studentIds };
}

async function seedCourses(lecturerIds, studentIds) {
  console.log("\n📌 Creating courses...");

  const courses = [
    { courseCode: "CS301", courseName: "Data Structures and Algorithms", lecturerId: lecturerIds[0] },
    { courseCode: "CS305", courseName: "Web Development", lecturerId: lecturerIds[0] },
    { courseCode: "CS310", courseName: "Database Systems", lecturerId: lecturerIds[3] },
    { courseCode: "MATH201", courseName: "Discrete Mathematics", lecturerId: lecturerIds[2] },
    { courseCode: "ENG101", courseName: "Engineering Fundamentals", lecturerId: lecturerIds[1] },
  ];

  const courseIds = [];
  for (const c of courses) {
    const ref = await db.collection("courses").add(c);
    courseIds.push(ref.id);
    console.log(`  + Course: ${c.courseCode} — ${c.courseName}`);
  }

  // Enroll all students in CS301 and CS305 as sample
  const batch = db.batch();
  for (const uid of studentIds) {
    batch.update(db.collection("users").doc(uid), {
      enrolledCourses: [courseIds[0], courseIds[1]],
    });
  }
  await batch.commit();
  console.log(`  + Enrolled ${studentIds.length} students in CS301 and CS305`);

  return courseIds;
}

async function main() {
  console.log("🚀 HTU Attendance System — Seeding Firebase\n");
  const { lecturerIds, studentIds } = await seedUsers();
  await seedCourses(lecturerIds, studentIds);

  console.log(`
✅ Seeding complete!

Default credentials (password: ${DEFAULT_PASSWORD}):
  Admin:    admin@htu.edu
  Lecturer: amina.owusu@htu.edu  (and 6 others)
  Student:  student01@student.htu.edu  (through student20@student.htu.edu)
`);
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
