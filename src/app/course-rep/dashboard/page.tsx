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

      // Count sessions per course in parallel
      const counts: Record<string, number> = {};
      await Promise.all(
        allCourses.map(async (course) => {
          const sessionsSnap = await getDocs(
            query(collection(db, "sessions"), where("courseId", "==", course.id))
          );
          counts[course.id] = sessionsSnap.size;
        })
      );
      setSessionCounts(counts);

      setIsLoading(false);
    };

    load();
  }, [user]);

  const presentCount = records.filter((r) => r.status === "present").length;
  const overallRate =
    records.length > 0 ? Math.round((presentCount / records.length) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-md">
              Hello, {user?.fullName}! 👋
            </h1>
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-white/20 text-white border border-white/20 uppercase tracking-wider">
              Course Rep
            </span>
          </div>
          <p className="text-blue-100 mt-1 font-medium">
            {user?.studentId && (
              <span className="font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded border border-white/10 mr-1.5">
                {user.studentId}
              </span>
            )}
            {(user as any)?.indexNumber && !user?.studentId && (
              <span className="font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded border border-white/10 mr-1.5">
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
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/25 text-white font-bold rounded-xl border border-white/20 transition-all hover:scale-105 active:scale-95 shadow-md"
          >
            <ScanLine className="w-4 h-4 text-white" />
            My Check-in
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl flex items-center gap-4 text-white">
          <div className="bg-white/15 p-4 rounded-xl text-white border border-white/10">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-100">Courses</p>
            <p className="text-3.5xl font-extrabold text-white mt-0.5 drop-shadow-sm">
              {isLoading ? "—" : courses.length}
            </p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl flex items-center gap-4 text-white">
          <div className="bg-white/15 p-4 rounded-xl text-white border border-white/10">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-100">My Attendance</p>
            <p className="text-3.5xl font-extrabold text-white mt-0.5 drop-shadow-sm">
              {isLoading ? "—" : `${overallRate}%`}
            </p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl flex items-center gap-4 text-white">
          <div className="bg-white/15 p-4 rounded-xl text-white border border-white/10">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-100">Sessions Attended</p>
            <p className="text-3.5xl font-extrabold text-white mt-0.5 drop-shadow-sm">
              {isLoading ? "—" : presentCount}
            </p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl flex items-center gap-4 text-white">
          <div className="bg-white/15 p-4 rounded-xl text-white border border-white/10">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-100">Total Sessions</p>
            <p className="text-3.5xl font-extrabold text-white mt-0.5 drop-shadow-sm">
              {isLoading
                ? "—"
                : Object.values(sessionCounts).reduce((a, b) => a + b, 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/course-rep/start-session"
          className="bg-white/10 hover:bg-white/15 border border-white/20 text-white rounded-2xl p-6 shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] group"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4 border border-white/10">
                <Play className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-1">Start Class Session</h3>
              <p className="text-blue-100 text-sm font-medium">
                Generate QR code and take attendance on behalf of the lecturer
              </p>
            </div>
            <ChevronRight className="w-6 h-6 text-white group-hover:translate-x-1.5 transition-transform" />
          </div>
        </Link>

        <Link
          href="/course-rep/attendance"
          className="bg-white/10 hover:bg-white/15 border border-white/20 text-white rounded-2xl p-6 shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] group"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4 border border-white/10">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-1">View Attendance</h3>
              <p className="text-blue-100 text-sm font-medium">
                View class attendance records and statistics for all courses
              </p>
            </div>
            <ChevronRight className="w-6 h-6 text-white group-hover:translate-x-1.5 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Courses List */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl overflow-hidden text-white">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            Courses
          </h2>
          <Link
            href="/course-rep/history"
            className="text-sm font-bold text-blue-100 hover:text-white transition-colors"
          >
            View History →
          </Link>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
          </div>
        ) : courses.length === 0 ? (
          <div className="p-12 text-center text-blue-200">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-60" />
            <p className="font-semibold text-lg">No courses found.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {courses.map((course) => (
              <div
                key={course.id}
                className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/5 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white border border-white/10">
                      {course.courseCode}
                    </span>
                    <span className="text-xs text-blue-200 font-semibold">
                      {sessionCounts[course.id] || 0} sessions
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-white">
                    {course.courseName}
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/course-rep/start-session?courseId=${course.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-blue-900 text-sm font-bold rounded-lg hover:bg-blue-50 transition-colors shadow-md hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Play className="w-4 h-4 text-blue-900" />
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
