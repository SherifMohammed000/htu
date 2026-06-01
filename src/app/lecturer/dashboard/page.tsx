"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getLecturerCourses } from "@/lib/firebase/firestore";
import { Course } from "@/lib/mock/db";
import { Users, Clock, TrendingUp, Play, ChevronRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export default function LecturerDashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ totalStudents: 0, avgAttendance: 0, classesThisWeek: 0 });

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const myCourses = await getLecturerCourses(user.id);
      setCourses(myCourses);

      // Count all past sessions for this lecturer
      const sessionsSnap = await getDocs(
        query(collection(db, "sessions"), where("lecturerId", "==", user.id))
      );

      // Count all records across those sessions
      const sessionIds = sessionsSnap.docs.map((d) => d.id);
      let totalRecords = 0;
      let totalSessions = sessionsSnap.size;

      for (const sid of sessionIds) {
        const recSnap = await getDocs(
          query(collection(db, "attendance_records"), where("sessionId", "==", sid), where("status", "==", "present"))
        );
        totalRecords += recSnap.size;
      }

      // Sessions this week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weeklyCount = sessionsSnap.docs.filter(
        (d) => new Date(d.data().startTime) >= weekAgo
      ).length;

      setStats({
        totalStudents: 0, // Would need enrollment data
        avgAttendance: totalSessions > 0 ? Math.round((totalRecords / (totalSessions * 30)) * 100) : 0,
        classesThisWeek: weeklyCount,
      });
      setIsLoading(false);
    };

    load();
  }, [user]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome back, {user?.fullName?.split(" ")[0]}!
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            {" · "}
            {user?.department}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl text-blue-600 dark:text-blue-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">My Courses</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{isLoading ? "—" : courses.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-xl text-red-600 dark:text-red-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Avg. Attendance</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {isLoading ? "—" : `${stats.avgAttendance}%`}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-xl text-blue-700 dark:text-blue-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Sessions This Week</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {isLoading ? "—" : stats.classesThisWeek}
            </p>
          </div>
        </div>
      </div>

      {/* Courses */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Courses</h2>
          <Link href="/lecturer/courses" className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400">
            View All
          </Link>
        </div>

        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
          </div>
        ) : courses.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No courses assigned yet.</p>
            <p className="text-sm mt-1">Ask your administrator to assign courses to your account.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {courses.map((course) => (
              <div
                key={course.id}
                className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      {course.courseCode}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg text-slate-900 dark:text-white">{course.courseName}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                    <Users className="w-4 h-4" /> Enrolled students
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/lecturer/courses/${course.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                  >
                    <Play className="w-4 h-4" />
                    Start Class
                  </Link>
                  <Link
                    href={`/lecturer/courses/${course.id}/reports`}
                    className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
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
