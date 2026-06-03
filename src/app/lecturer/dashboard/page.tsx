"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getLecturerCourses } from "@/lib/firebase/firestore";
import { Course } from "@/lib/mock/db";
import { Users, Clock, TrendingUp, Play, ChevronRight, BookOpen, Bell } from "lucide-react";
import Link from "next/link";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function LecturerDashboard() {
  const { user } = useAuth();
  const { permission, isSupported, requestPermission } = usePushNotifications();
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-md">
            Welcome back, {user?.fullName}!
          </h1>
          <p className="text-blue-100 mt-1 font-medium">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            {" · "}
            {user?.department}
          </p>
        </div>
      </div>

      {/* Push Notifications Alert Banner */}
      {isSupported && permission === "default" && (
        <div className="bg-gradient-to-r from-blue-600/30 to-indigo-600/30 backdrop-blur-md border border-white/20 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white shadow-xl animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-start gap-4">
            <div className="bg-white/10 p-3 rounded-xl border border-white/10 text-white mt-1 sm:mt-0">
              <Bell className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                Enable Push Notifications
              </h3>
              <p className="text-blue-100 text-sm mt-0.5 leading-relaxed">
                Stay updated! Receive real-time alerts on your device for active class events.
              </p>
            </div>
          </div>
          <button
            onClick={requestPermission}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-white text-blue-900 font-bold rounded-xl hover:bg-blue-50 transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer shrink-0"
          >
            Allow Alerts
          </button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl flex items-center gap-4 text-white">
          <div className="bg-white/15 p-4 rounded-xl text-white border border-white/10">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-100">My Course</p>
            <p className="text-3.5xl font-extrabold text-white mt-0.5 drop-shadow-sm">{isLoading ? "—" : courses.length}</p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl flex items-center gap-4 text-white">
          <div className="bg-white/15 p-4 rounded-xl text-white border border-white/10">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-100">Avg. Attendance</p>
            <p className="text-3.5xl font-extrabold text-white mt-0.5 drop-shadow-sm">
              {isLoading ? "—" : `${stats.avgAttendance}%`}
            </p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl flex items-center gap-4 text-white">
          <div className="bg-white/15 p-4 rounded-xl text-white border border-white/10">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-100">Sessions This Week</p>
            <p className="text-3.5xl font-extrabold text-white mt-0.5 drop-shadow-sm">
              {isLoading ? "—" : stats.classesThisWeek}
            </p>
          </div>
        </div>
      </div>

      {/* Courses */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl overflow-hidden text-white">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">My Course</h2>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
          </div>
        ) : courses.length === 0 ? (
          <div className="p-12 text-center text-blue-200">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-60" />
            <p className="font-semibold text-lg">No courses assigned yet.</p>
            <p className="text-blue-100 text-sm mt-1">Ask your administrator to assign courses to your account.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {courses.map((course) => (
              <div
                key={course.id}
                className="p-6 hover:bg-white/5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white border border-white/10">
                      {course.courseCode}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-white">{course.courseName}</h3>
                  <p className="text-sm text-blue-200 mt-1 flex items-center gap-1 font-semibold">
                    <Users className="w-4 h-4" /> Enrolled students
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/lecturer/courses/${course.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-blue-900 text-sm font-bold rounded-lg hover:bg-blue-50 transition-colors shadow-md hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Play className="w-4 h-4 text-blue-900" />
                    Start Class
                  </Link>
                  <Link
                    href={`/lecturer/courses/${course.id}/reports`}
                    className="p-2.5 text-white bg-white/10 border border-white/20 hover:bg-white/20 rounded-lg transition-colors shadow-sm"
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
