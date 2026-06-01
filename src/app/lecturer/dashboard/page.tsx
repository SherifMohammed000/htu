"use client";

import { useAuth } from "@/context/AuthContext";
import { MOCK_COURSES } from "@/lib/mock/db";
import { Users, Clock, CheckCircle2, ChevronRight, Play } from "lucide-react";
import Link from "next/link";

export default function LecturerDashboard() {
  const { user } = useAuth();
  
  // Filter courses for this lecturer
  const myCourses = MOCK_COURSES.filter(c => c.lecturerId === user?.id);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome back, {user?.fullName?.split(' ')[0]}!
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Here's an overview of your classes today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-right hidden sm:block">
            <p className="font-medium text-slate-900 dark:text-white">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
            <p className="text-slate-500">
              {user?.department}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl text-blue-600 dark:text-blue-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Students</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">142</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-xl text-red-600 dark:text-red-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Avg. Attendance</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">87%</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-xl text-blue-700 dark:text-blue-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Classes This Week</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">6</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Courses</h2>
          <Link href="/lecturer/courses" className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
            View All
          </Link>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {myCourses.map(course => (
            <div key={course.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    {course.courseCode}
                  </span>
                </div>
                <h3 className="font-semibold text-lg text-slate-900 dark:text-white">{course.courseName}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                  <Users className="w-4 h-4" /> 75 Enrolled Students
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/lecturer/courses/${course.id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Start Class
                </Link>
                <Link
                  href={`/lecturer/courses/${course.id}/reports`}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          ))}
          {myCourses.length === 0 && (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              No courses assigned to you yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
