"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getStudentCourses } from "@/lib/firebase/firestore";
import { Course, AttendanceRecord } from "@/lib/mock/db";
import { Users, BookOpen, CheckCircle2, Search } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

interface SessionWithRecords {
  id: string;
  courseId: string;
  sessionDate: string;
  startTime: string;
  records: AttendanceRecord[];
}

export default function AttendancePage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionWithRecords[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    getStudentCourses().then((c) => {
      setCourses(c);
      setIsLoading(false);
      if (c.length > 0) {
        setSelectedCourseId(c[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedCourseId) return;
    setIsLoadingSessions(true);

    const loadSessions = async () => {
      const sessionsSnap = await getDocs(
        query(collection(db, "sessions"), where("courseId", "==", selectedCourseId))
      );

      const sessionsData: SessionWithRecords[] = [];

      for (const doc of sessionsSnap.docs) {
        const sessionData = doc.data();
        const recordsSnap = await getDocs(
          query(collection(db, "attendance_records"), where("sessionId", "==", doc.id))
        );
        const records = recordsSnap.docs.map((r) => ({
          id: r.id,
          ...r.data(),
        })) as AttendanceRecord[];

        sessionsData.push({
          id: doc.id,
          courseId: sessionData.courseId,
          sessionDate: sessionData.sessionDate,
          startTime: sessionData.startTime,
          records,
        });
      }

      sessionsData.sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
      setSessions(sessionsData);
      setIsLoadingSessions(false);
    };

    loadSessions();
  }, [selectedCourseId]);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-white">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-md">
          Attendance Records
        </h1>
        <p className="text-blue-100 mt-1 font-medium">
          View detailed attendance records for each course and session.
        </p>
      </div>

      {/* Course Tabs */}
      {isLoading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {courses.map((course) => (
            <button
              key={course.id}
              onClick={() => setSelectedCourseId(course.id)}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                selectedCourseId === course.id
                  ? "bg-white text-blue-900 shadow-md"
                  : "bg-white/10 border border-white/20 text-white hover:bg-white/20"
              }`}
            >
              {course.courseCode}
            </button>
          ))}
        </div>
      )}

      {/* Sessions List */}
      {selectedCourse && (
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {selectedCourse.courseName}
                </h2>
                <p className="text-sm text-blue-200 mt-1 font-semibold">
                  {sessions.length} session{sessions.length !== 1 ? "s" : ""} recorded
                </p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-100" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search students..."
                  className="pl-9 pr-4 py-2 rounded-xl border border-white/20 bg-white/5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white focus:ring-2 focus:ring-white/15 w-full transition-all"
                />
              </div>
            </div>
          </div>

          {isLoadingSessions ? (
            <div className="p-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-12 text-center text-blue-200">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-60" />
              <p className="font-semibold text-lg">No sessions recorded yet.</p>
              <p className="text-blue-100 text-sm mt-1">Start a class session to begin tracking attendance.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {sessions.map((session) => (
                <div key={session.id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-bold text-white text-lg">
                        {new Date(session.startTime).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <p className="text-xs text-blue-200 font-semibold mt-0.5">
                        {new Date(session.startTime).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/25 border border-white/15 text-white rounded-full text-xs font-bold shadow-sm">
                      <Users className="w-4 h-4" />
                      {session.records.length} present
                    </div>
                  </div>

                  {session.records.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {session.records
                        .filter(
                          (r) =>
                            !searchTerm ||
                            r.studentId.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((record) => (
                          <div
                            key={record.id}
                            className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 text-sm"
                          >
                            <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                            <span className="text-white truncate font-mono text-xs font-semibold">
                              {record.studentId}
                            </span>
                            <span className="ml-auto text-xs text-blue-200 font-bold bg-white/10 px-2 py-0.5 rounded border border-white/5 shrink-0">
                              {record.method === "manual" ? "Manual" : "QR"}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
