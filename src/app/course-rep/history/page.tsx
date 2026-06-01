"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getStudentAttendance } from "@/lib/firebase/firestore";
import { AttendanceRecord } from "@/lib/mock/db";
import { Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function CourseRepHistory() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getStudentAttendance(user.id).then((data) => {
      setRecords(data);
      setIsLoading(false);
    });
  }, [user]);

  const presentCount = records.filter((r) => r.status === "present").length;
  const absentCount = records.filter((r) => r.status === "absent").length;
  const attendanceRate = records.length > 0 ? Math.round((presentCount / records.length) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Attendance History</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Your personal check-in record across all courses.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm text-center">
          <p className="text-3xl font-bold text-teal-600">{attendanceRate}%</p>
          <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">Overall Rate</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm text-center">
          <p className="text-3xl font-bold text-blue-600">{presentCount}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">Present</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm text-center">
          <p className="text-3xl font-bold text-slate-400">{absentCount}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">Absent</p>
        </div>
      </div>

      {/* Records list */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">All Sessions</h2>
        </div>

        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No attendance records yet.</p>
            <p className="text-slate-400 text-sm mt-1">Your history will appear here after your first check-in.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {records.map((record) => (
              <div key={record.id} className="p-5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <div className={`p-2.5 rounded-xl shrink-0 ${record.status === "present" ? "bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400" : "bg-slate-100 text-slate-400 dark:bg-slate-700"}`}>
                  {record.status === "present" ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                    Session: {record.sessionId.substring(0, 12)}...
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {format(new Date(record.timestamp), "MMM d, yyyy • h:mm a")}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    record.status === "present"
                      ? "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-700"
                  }`}>
                    {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                  </span>
                  {record.method === "manual" && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-600 dark:bg-amber-900/20">
                      Manual
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
