"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getStudentCourses, getStudentAttendance } from "@/lib/firebase/firestore";
import { Course, AttendanceRecord } from "@/lib/mock/db";
import {
  Play,
  BookOpen,
  CheckCircle2,
  Clock,
  Users,
  ScanLine,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export default function CourseRepDashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionCounts, setSessionCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      // Load all courses (course rep sees all courses)
      const allCourses = await getStudentCourses();
      setCourses(allCourses);

      // Load own attendance
      const myRecords = await getStudentAttendance(user.id);
      setRecords(myRecords);

      // Count sessions per course
      const counts: Record<string, number> = {};
      for (const course of allCourses) {
        const sessionsSnap = await getDocs(
          query(collection(db, "sessions"), where("courseId", "==", course.id))
        );
        counts[course.id] = sessionsSnap.size;
      }
      setSessionCounts(counts);

      setIsLoading(false);
    };

    load();
  }, [user]);

  const presentCount = records.filter((r) => r.status === "present").length;
  const overallRate =
    records.length > 0 ? Math.round((presentCount / records.length) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Hello, {user?.fullName?.split(" ")[0]}! 👋
            </h1>
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 uppercase tracking-wider">
              Course Rep
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {user?.studentId && (
              <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">
                {user.studentId}
              </span>
            )}
            {(user as any)?.indexNumber && !user?.studentId && (
              <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">
                {(user as any).indexNumber}
              </span>
            )}
            {" · "}
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/course-rep/scan"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-all active:scale-95"
          >
            <ScanLine className="w-4 h-4" />
            My Check-in
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="bg-teal-50 dark:bg-teal-900/30 p-4 rounded-xl text-teal-600 dark:text-teal-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Courses
            </p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {isLoading ? "—" : courses.length}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl text-blue-600 dark:text-blue-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              My Attendance
            </p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {isLoading ? "—" : `${overallRate}%`}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-xl text-red-600 dark:text-red-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Sessions Attended
            </p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {isLoading ? "—" : presentCount}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-xl text-slate-600 dark:text-slate-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Total Sessions
            </p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {isLoading
                ? "—"
                : Object.values(sessionCounts).reduce((a, b) => a + b, 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/course-rep/start-session"
          className="bg-gradient-to-br from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-2xl p-6 shadow-lg shadow-teal-600/20 transition-all active:scale-[0.98] group"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4">
                <Play className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-1">Start Class Session</h3>
              <p className="text-teal-100 text-sm">
                Generate QR code and take attendance on behalf of the lecturer
              </p>
            </div>
            <ChevronRight className="w-6 h-6 text-teal-200 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/course-rep/attendance"
          className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl p-6 shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] group"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-1">View Attendance</h3>
              <p className="text-blue-100 text-sm">
                View class attendance records and statistics for all courses
              </p>
            </div>
            <ChevronRight className="w-6 h-6 text-blue-200 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Courses List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Courses
          </h2>
          <Link
            href="/course-rep/history"
            className="text-sm font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400"
          >
            View History
          </Link>
        </div>

        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
          </div>
        ) : courses.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No courses found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {courses.map((course) => (
              <div
                key={course.id}
                className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      {course.courseCode}
                    </span>
                    <span className="text-xs text-slate-400">
                      {sessionCounts[course.id] || 0} sessions
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
                    {course.courseName}
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/course-rep/start-session?courseId=${course.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
                  >
                    <Play className="w-4 h-4" />
                    Start Class
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
