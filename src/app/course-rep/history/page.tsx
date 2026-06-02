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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-white">
      <div>
        <h1 className="text-3xl font-extrabold text-white drop-shadow-md">My Attendance History</h1>
        <p className="text-blue-100 mt-1 font-medium">Your personal check-in record across all courses.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 shadow-xl text-center text-white">
          <p className="text-3.5xl font-extrabold text-white drop-shadow-sm">{attendanceRate}%</p>
          <p className="text-xs text-blue-100 mt-1 font-bold uppercase tracking-wider">Overall Rate</p>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 shadow-xl text-center text-white">
          <p className="text-3.5xl font-extrabold text-white drop-shadow-sm">{presentCount}</p>
          <p className="text-xs text-blue-100 mt-1 font-bold uppercase tracking-wider">Present</p>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 shadow-xl text-center text-white">
          <p className="text-3.5xl font-extrabold text-white drop-shadow-sm">{absentCount}</p>
          <p className="text-xs text-blue-100 mt-1 font-bold uppercase tracking-wider">Absent</p>
        </div>
      </div>

      {/* Records list */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl overflow-hidden text-white">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">All Sessions</h2>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-blue-200">
            <AlertCircle className="w-12 h-12 text-blue-200 mx-auto mb-3 opacity-60" />
            <p className="font-semibold text-lg">No attendance records yet.</p>
            <p className="text-blue-100 text-sm mt-1">Your history will appear here after your first check-in.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {records.map((record) => (
              <div key={record.id} className="p-5 flex items-center gap-4 hover:bg-white/5 transition-colors">
                <div className={`p-2.5 rounded-xl shrink-0 ${record.status === "present" ? "bg-white/20 text-white" : "bg-white/5 text-white/40"}`}>
                  {record.status === "present" ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm truncate">
                    Session: {record.sessionId.substring(0, 12)}...
                  </p>
                  <p className="text-xs text-blue-100 flex items-center gap-1 mt-1 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    {format(new Date(record.timestamp), "MMM d, yyyy • h:mm a")}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    record.status === "present"
                      ? "bg-white/20 text-white border border-white/10"
                      : "bg-white/5 text-white/50 border border-white/5"
                  }`}>
                    {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                  </span>
                  {record.method === "manual" && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/30 text-amber-200 border border-amber-500/20 font-semibold">
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
