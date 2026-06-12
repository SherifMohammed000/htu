import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  addDoc,
  orderBy,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './config';
import { AttendanceSession, AttendanceRecord, Course, User } from '@/lib/mock/db';

// ─── Courses ───────────────────────────────────────────────────────────────

export async function getLecturerCourses(lecturerId: string): Promise<Course[]> {
  const q = query(collection(db, 'courses'), where('lecturerId', '==', lecturerId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Course));
}

export async function getStudentCourses(): Promise<Course[]> {
  // In a real system, students are enrolled in courses.
  // For now, return all courses.
  const snap = await getDocs(collection(db, 'courses'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Course));
}

// ─── Sessions ──────────────────────────────────────────────────────────────

export async function createSession(session: Omit<AttendanceSession, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'sessions'), {
    ...session,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateSessionToken(sessionId: string, qrToken: string): Promise<void> {
  await updateDoc(doc(db, 'sessions', sessionId), { qrToken });
}

export async function closeSession(sessionId: string): Promise<void> {
  await updateDoc(doc(db, 'sessions', sessionId), {
    status: 'closed',
    endTime: new Date().toISOString(),
  });
}

export async function getActiveSession(courseId: string): Promise<AttendanceSession | null> {
  const q = query(
    collection(db, 'sessions'),
    where('courseId', '==', courseId),
    where('status', '==', 'active')
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as AttendanceSession;
}

export function subscribeToSession(
  sessionId: string,
  callback: (session: AttendanceSession | null) => void
) {
  return onSnapshot(doc(db, 'sessions', sessionId), (snap) => {
    if (!snap.exists()) {
      callback(null);
    } else {
      callback({ id: snap.id, ...snap.data() } as AttendanceSession);
    }
  });
}

// ─── Attendance Records ────────────────────────────────────────────────────

export async function recordAttendance(record: Omit<AttendanceRecord, 'id'>): Promise<void> {
  // Prevent duplicates: one record per student per session
  const q = query(
    collection(db, 'attendance_records'),
    where('studentId', '==', record.studentId),
    where('sessionId', '==', record.sessionId)
  );
  const existing = await getDocs(q);
  if (!existing.empty) {
    throw new Error('Attendance already recorded for this session.');
  }
  await addDoc(collection(db, 'attendance_records'), {
    ...record,
    createdAt: serverTimestamp(),
  });
}

export function subscribeToSessionAttendance(
  sessionId: string,
  callback: (records: AttendanceRecord[]) => void
) {
  const q = query(
    collection(db, 'attendance_records'),
    where('sessionId', '==', sessionId)
  );
  return onSnapshot(q, (snap) => {
    const records = snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
    callback(records);
  });
}

export async function getStudentAttendance(studentId: string): Promise<AttendanceRecord[]> {
  const q = query(
    collection(db, 'attendance_records'),
    where('studentId', '==', studentId),
    orderBy('timestamp', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
}

export async function getSessionAttendance(sessionId: string): Promise<AttendanceRecord[]> {
  const q = query(
    collection(db, 'attendance_records'),
    where('sessionId', '==', sessionId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
}

export async function deleteAttendanceRecord(recordId: string): Promise<void> {
  await deleteDoc(doc(db, 'attendance_records', recordId));
}

// ─── Users ─────────────────────────────────────────────────────────────────

export async function getUsersByRole(role: string): Promise<User[]> {
  const q = query(collection(db, 'users'), where('role', '==', role));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
}


export async function getLecturerSummary(lecturerId: string): Promise<Array<{studentId:string, studentName:string, present:number, absent:number, totalSessions:number}>> {
  // 1. Get all sessions for this lecturer
  const sessionsSnap = await getDocs(query(collection(db, 'sessions'), where('lecturerId', '==', lecturerId)));
  const sessionIds = sessionsSnap.docs.map(d => d.id);
  if (sessionIds.length === 0) return [];

  // 2. Get all students (to map IDs to names)
  const students = await getUsersByRole('student');
  const nameMap: Record<string, string> = {};
  students.forEach(s => { nameMap[s.id] = s.fullName; });

  // 3. Accumulate attendance per student
  const stats: Record<string, {present:number, absent:number, totalSessions:number}> = {};
  // For each session, get its attendance
  for (const sid of sessionIds) {
    const records = await getSessionAttendance(sid);
    // Mark present
    records.forEach(r => {
      if (!stats[r.studentId]) stats[r.studentId] = {present:0, absent:0, totalSessions:0};
      if (r.status === 'present') stats[r.studentId].present++;
      else stats[r.studentId].absent++;
    });
    // Count absent students for this session (students not in records)
    const presentIds = new Set(records.map(r=>r.studentId));
    students.forEach(s=>{
      if (!presentIds.has(s.id)) {
        if (!stats[s.id]) stats[s.id] = {present:0, absent:0, totalSessions:0};
        stats[s.id].absent++;
      }
    });
    // Increment totalSessions for every student (present or absent) for this session
    students.forEach(s=>{ if (!stats[s.id]) stats[s.id] = {present:0, absent:0, totalSessions:0}; stats[s.id].totalSessions++; });
  }

  // 4. Build result array
  return Object.entries(stats).map(([id, val]) => ({
    studentId: id,
    studentName: nameMap[id] ?? 'Unknown',
    present: val.present,
    absent: val.absent,
    totalSessions: val.totalSessions,
  }));
}

export async function getCourseStudents(courseId: string): Promise<User[]> {
  // Fetch students enrolled in a course (via enrollments sub-collection or query)
  const q = query(collection(db, 'users'), where('role', '==', 'student'), where('enrolledCourses', 'array-contains', courseId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
}
