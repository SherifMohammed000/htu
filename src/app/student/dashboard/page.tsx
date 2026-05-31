"use client";

import { useAuth } from "@/context/AuthContext";
import { MOCK_COURSES } from "@/lib/mock/db";
import { ScanLine, BookOpen, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function StudentDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Hello, {user?.fullName.split(' ')[0]}!
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Check your attendance status or scan a new class code.
          </p>
        </div>
        
        <Link 
          href="/student/scan" 
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition-all active:scale-95"
        >
          <ScanLine className="w-5 h-5" />
          Scan QR Code
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="bg-emerald-100 dark:bg-emerald-900/30 p-4 rounded-xl text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Overall Attendance</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">92%</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-xl text-blue-600 dark:text-blue-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Enrolled Courses</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{MOCK_COURSES.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Courses</h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {MOCK_COURSES.map(course => (
            <div key={course.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                    {course.courseCode}
                  </span>
                </div>
                <h3 className="font-semibold text-lg text-slate-900 dark:text-white">{course.courseName}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Dr. Sarah Connor
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">100%</span>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Attendance</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-2xl p-6 flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0 mt-1" />
        <div>
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">Location Services Required</h3>
          <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">
            When checking into a class, you will be required to share your device location to verify you are in the classroom. Ensure your browser permissions are enabled.
          </p>
        </div>
      </div>
    </div>
  );
}
