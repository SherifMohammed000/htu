"use client";

import { useEffect, useState } from "react";
import { getUsersByRole, getLecturerCourses } from "@/lib/firebase/firestore";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { User, Course, AttendanceRecord } from "@/lib/mock/db";
import { Users, BookOpen, ClipboardList, TrendingUp, ShieldCheck, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

export default function AdminDashboard() {
  const [students, setStudents] = useState<User[]>([]);
  const [lecturers, setLecturers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [recentRecords, setRecentRecords] = useState<AttendanceRecord[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [studentList, lecturerList] = await Promise.all([
        getUsersByRole("student"),
        getUsersByRole("lecturer"),
      ]);
      setStudents(studentList);
      setLecturers(lecturerList);

      // All courses
      const coursesSnap = await getDocs(collection(db, "courses"));
      setCourses(coursesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Course)));

      // Session count
      const sessionsSnap = await getDocs(collection(db, "sessions"));
      setSessionCount(sessionsSnap.size);

      // Recent attendance records (last 10)
      const recSnap = await getDocs(
        query(collection(db, "attendance_records"), orderBy("createdAt", "desc"), limit(10))
      );
      setRecentRecords(recSnap.docs.map((d) => ({ id: d.id, ...d.data() } as AttendanceRecord)));

      setIsLoading(false);
    };
    load();
  }, []);

  const statCards = [
    { label: "Total Students", value: students.length, icon: Users, color: "blue" },
    { label: "Lecturers", value: lecturers.length, icon: ShieldCheck, color: "red" },
    { label: "Courses", value: courses.length, icon: BookOpen, color: "blue" },
    { label: "Total Sessions", value: sessionCount, icon: ClipboardList, color: "red" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">System-wide overview and management.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color === "blue" ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {isLoading ? "—" : value}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lecturers */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-700">
            <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" /> Lecturers
            </h2>
          </div>
          {isLoading ? (
            <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600" /></div>
          ) : lecturers.length === 0 ? (
            <p className="p-6 text-slate-400 text-sm text-center">No lecturers registered yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {lecturers.map((l) => (
                <div key={l.id} className="p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {l.fullName.charAt(0)}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{l.fullName}</p>
                    <p className="text-xs text-slate-500 truncate">{l.department}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Courses */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-700">
            <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-red-600" /> Courses
            </h2>
          </div>
          {isLoading ? (
            <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600" /></div>
          ) : courses.length === 0 ? (
            <p className="p-6 text-slate-400 text-sm text-center">No courses created yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {courses.map((c) => (
                <div key={c.id} className="p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 shrink-0">
                    {c.courseCode}
                  </span>
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{c.courseName}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Attendance */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-red-600" /> Recent Attendance Activity
          </h2>
        </div>
        {isLoading ? (
          <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600" /></div>
        ) : recentRecords.length === 0 ? (
          <p className="p-8 text-slate-400 text-sm text-center">No attendance records yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {recentRecords.map((r) => (
              <div key={r.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <div className={`p-2 rounded-lg shrink-0 ${r.status === "present" ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400"}`}>
                  {r.status === "present" ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    Student: <span className="font-mono text-xs">{r.studentId}</span>
                  </p>
                  <p className="text-xs text-slate-500">Session: {r.sessionId.substring(0, 12)}...</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${r.status === "present" ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "bg-slate-100 text-slate-500"}`}>
                    {r.status}
                  </span>
                  <p className="text-xs text-slate-400 mt-1">
                    {format(new Date(r.timestamp), "MMM d, h:mm a")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Students list */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" /> Registered Students ({students.length})
          </h2>
        </div>
        {isLoading ? (
          <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600" /></div>
        ) : students.length === 0 ? (
          <p className="p-6 text-slate-400 text-sm text-center">No students registered yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700max-h-96 overflow-y-auto">
            {students.map((s) => (
              <div key={s.id} className="p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-sm shrink-0">
                  {s.fullName.charAt(0)}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{s.fullName}</p>
                  <p className="text-xs text-slate-500 truncate">{s.email}</p>
                </div>
                <div className="text-right shrink-0">
                  {s.studentId && (
                    <p className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">{s.studentId}</p>
                  )}
                  <p className="text-xs text-slate-400">{s.department}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
