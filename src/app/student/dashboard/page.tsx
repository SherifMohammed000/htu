"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getStudentCourses, getStudentAttendance } from "@/lib/firebase/firestore";
import { Course, AttendanceRecord } from "@/lib/mock/db";
import { ScanLine, BookOpen, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([getStudentCourses(), getStudentAttendance(user.id)]).then(
      ([c, r]) => {
        setCourses(c);
        setRecords(r);
        setIsLoading(false);
      }
    );
  }, [user]);

  const presentCount = records.filter((r) => r.status === "present").length;
  const overallRate =
    records.length > 0 ? Math.round((presentCount / records.length) * 100) : 0;

  // Attendance rate per course
  const rateBySession = (courseId: string) => {
    // We'd need to join sessions + records — simplified for now
    return overallRate;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Hello, {user?.fullName?.split(" ")[0]}! 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {user?.studentId && (
              <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">
                {user.studentId}
              </span>
            )}
            {user?.studentId && " · "}
            {user?.department} · {user?.level}
          </p>
        </div>
        <Link
          href="/student/scan"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-lg shadow-red-600/30 transition-all active:scale-95"
        >
          <ScanLine className="w-5 h-5" />
          Scan QR Code
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-xl text-red-600 dark:text-red-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Overall Attendance
            </p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {isLoading ? "—" : `${overallRate}%`}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl text-blue-600 dark:text-blue-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Enrolled Courses
            </p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {isLoading ? "—" : courses.length}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-xl text-blue-700 dark:text-blue-400">
            <Clock className="w-6 h-6" />
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
      </div>

      {/* Courses */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Courses</h2>
          <Link
            href="/student/history"
            className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400"
          >
            View History
          </Link>
        </div>

        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
          </div>
        ) : courses.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No courses enrolled yet.</p>
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
                  </div>
                  <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
                    {course.courseName}
                  </h3>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {rateBySession(course.id)}%
                  </span>
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Attendance
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Location notice */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-2xl p-5 flex items-start gap-4">
        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
            Location Services Required
          </h3>
          <p className="text-blue-700 dark:text-blue-300 text-sm mt-0.5">
            When checking in, your browser will request your GPS location to verify you are physically
            in the classroom within a 30-meter radius.
          </p>
        </div>
      </div>
    </div>
  );
}
