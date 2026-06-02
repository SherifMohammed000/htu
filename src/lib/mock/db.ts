export type Role = 'student' | 'lecturer' | 'admin' | 'course_rep';

export interface User {
  id: string;
  studentId?: string;   // For students
  indexNumber?: string; // For students
  courseCode?: string;  // For lecturers
  fullName: string;
  email: string;
  department: string;
  level?: string;       // For students
  deviceId?: string;    // For device verification
  role: Role;
}

export interface Course {
  id: string;
  courseCode: string;
  courseName: string;
  lecturerId: string;
}

export interface AttendanceSession {
  id: string;
  courseId: string;
  lecturerId: string;
  sessionDate: string;
  startTime: string;
  endTime?: string;
  qrToken: string;
  pinCode: string;
  location: {
    lat: number;
    lng: number;
  };
  status: 'active' | 'closed';
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  sessionId: string;
  timestamp: string;
  gpsCoordinates?: {
    lat: number;
    lng: number;
  };
  status: 'present' | 'absent' | 'late';
  method: 'qr' | 'manual'; // Track if it was scanned or manually overridden
}

// MOCK DATA

export const MOCK_USERS: User[] = [
  {
    id: 'lecturer_1',
    fullName: 'Dr. Sarah Connor',
    email: 'sarah.connor@htu.edu',
    department: 'Computer Science',
    role: 'lecturer',
  },
  {
    id: 'student_1',
    studentId: 'CS1001',
    fullName: 'John Doe',
    email: 'john.doe@student.htu.edu',
    department: 'Computer Science',
    level: 'L300',
    role: 'student',
  },
  {
    id: 'student_2',
    studentId: 'CS1002',
    fullName: 'Jane Smith',
    email: 'jane.smith@student.htu.edu',
    department: 'Computer Science',
    level: 'L300',
    role: 'student',
  },
  {
    id: 'admin_1',
    fullName: 'System Admin',
    email: 'admin@htu.edu',
    department: 'IT Support',
    role: 'admin',
  }
];

export const MOCK_COURSES: Course[] = [
  {
    id: 'course_1',
    courseCode: 'CS301',
    courseName: 'Data Structures and Algorithms',
    lecturerId: 'lecturer_1',
  },
  {
    id: 'course_2',
    courseCode: 'CS305',
    courseName: 'Web Development',
    lecturerId: 'lecturer_1',
  }
];

// In-memory store for sessions and records (since we're mocking DB)
export const MOCK_DB = {
  sessions: [] as AttendanceSession[],
  records: [] as AttendanceRecord[],
};
