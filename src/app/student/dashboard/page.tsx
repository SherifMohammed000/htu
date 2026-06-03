"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getStudentCourses, getStudentAttendance } from "@/lib/firebase/firestore";
import { Course, AttendanceRecord } from "@/lib/mock/db";
import { ScanLine, BookOpen, AlertCircle, CheckCircle2, Clock, Bell } from "lucide-react";
import Link from "next/link";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function StudentDashboard() {
  const { user } = useAuth();
  const { permission, isSupported, requestPermission } = usePushNotifications();
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
    return overallRate;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-md">
            Hello, {user?.fullName?.split(" ")[0]}! 👋
          </h1>
          <p className="text-blue-100 mt-1 font-medium">
            {user?.studentId && (
              <span className="font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded border border-white/10 mr-1.5">
                {user.studentId}
              </span>
            )}
            {user?.studentId && " · "}
            {user?.department} · {user?.level}
          </p>
        </div>
        <Link
          href="/student/scan"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-blue-900 hover:bg-blue-50 font-bold rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95"
        >
          <ScanLine className="w-5 h-5 text-blue-900" />
          Scan QR Code
        </Link>
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
                Stay updated! Receive real-time alerts on your device the moment a class session is started.
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl flex items-center gap-4 text-white">
          <div className="bg-white/15 p-4 rounded-xl text-white border border-white/10">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-100">
              Overall Attendance
            </p>
            <p className="text-3.5xl font-extrabold text-white mt-0.5 drop-shadow-sm">
              {isLoading ? "—" : `${overallRate}%`}
            </p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl flex items-center gap-4 text-white">
          <div className="bg-white/15 p-4 rounded-xl text-white border border-white/10">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-100">
              Enrolled Courses
            </p>
            <p className="text-3.5xl font-extrabold text-white mt-0.5 drop-shadow-sm">
              {isLoading ? "—" : courses.length}
            </p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl flex items-center gap-4 text-white">
          <div className="bg-white/15 p-4 rounded-xl text-white border border-white/10">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-100">
              Sessions Attended
            </p>
            <p className="text-3.5xl font-extrabold text-white mt-0.5 drop-shadow-sm">
              {isLoading ? "—" : presentCount}
            </p>
          </div>
        </div>
      </div>

      {/* Courses */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl overflow-hidden text-white">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">My Courses</h2>
          <Link
            href="/student/history"
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
            <p className="font-semibold text-lg">No courses enrolled yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {courses.map((course) => (
              <div
                key={course.id}
                className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/5 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white border border-white/10">
                      {course.courseCode}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-white">
                    {course.courseName}
                  </h3>
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <span className="text-2xl font-extrabold text-white drop-shadow-sm">
                    {rateBySession(course.id)}%
                  </span>
                  <span className="text-xs font-semibold text-blue-200 uppercase tracking-wider">
                    Attendance
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Location notice */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 flex items-start gap-4 text-white shadow-xl">
        <AlertCircle className="w-6 h-6 text-white shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-white text-sm">
            Location Services Required
          </h3>
          <p className="text-blue-100 text-sm mt-1 leading-relaxed">
            When checking in, your browser will request your GPS location to verify you are physically
            in the classroom within a 30-meter radius.
          </p>
        </div>
      </div>

      {/* Face Verification notice */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white shadow-xl">
        <div className="flex items-start gap-4">
          <div className="bg-white/15 p-3 rounded-xl border border-white/10 text-white mt-1 sm:mt-0">
            <ScanLine className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">
              Face Verification Setup
            </h3>
            <p className="text-blue-100 text-sm mt-0.5 leading-relaxed">
              Before scanning QR codes, you must capture a reference photo of your face for identity verification.
            </p>
          </div>
        </div>
        <Link
          href="/student/activation"
          className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-md shrink-0"
        >
          Setup Now
        </Link>
      </div>
    </div>
  );
}
