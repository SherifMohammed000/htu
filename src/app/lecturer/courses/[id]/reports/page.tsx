"use client";

import { use, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getLecturerCourses, getUsersByRole, deleteAttendanceRecord } from "@/lib/firebase/firestore";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Course, AttendanceSession, AttendanceRecord } from "@/lib/mock/db";
import { ArrowLeft, Download, FileText, Sheet, Calendar, Users, Clock, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

interface SessionReport extends AttendanceSession {
  totalPresent: number;
  records: AttendanceRecord[];
}

export default function CourseReports({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const courseId = resolvedParams.id;
  const { user } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [sessions, setSessions] = useState<SessionReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [studentNameMap, setStudentNameMap] = useState<Record<string, string>>({});
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        // Load course details
        const courses = await getLecturerCourses(user.id);
        const foundCourse = courses.find((c) => c.id === courseId);
        if (foundCourse) setCourse(foundCourse);

        // Load all students for name resolution
        const [students, reps] = await Promise.all([
          getUsersByRole("student"),
          getUsersByRole("course_rep"),
        ]);
        const combined = [...students, ...reps];
        setAllStudents(combined);
        const nameMap: Record<string, string> = {};
        combined.forEach((s) => {
          nameMap[s.id] = s.fullName;
        });
        setStudentNameMap(nameMap);

        // Load all sessions for this course
        const sessionsQuery = query(
          collection(db, "sessions"),
          where("courseId", "==", courseId),
          where("lecturerId", "==", user.id)
        );
        const sessionsSnap = await getDocs(sessionsQuery);
        
        const sessionsData: SessionReport[] = [];

        // For each session, fetch its attendance records
        for (const doc of sessionsSnap.docs) {
          const session = { id: doc.id, ...doc.data() } as AttendanceSession;
          
          const recordsQuery = query(
            collection(db, "attendance_records"),
            where("sessionId", "==", session.id),
            where("status", "==", "present")
          );
          const recordsSnap = await getDocs(recordsQuery);
          
          const records = recordsSnap.docs.map(r => ({ id: r.id, ...r.data() } as AttendanceRecord));

          sessionsData.push({
            ...session,
            totalPresent: records.length,
            records,
          });
        }

        // Sort sessions by date descending
        sessionsData.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
        setSessions(sessionsData);
      } catch (err) {
        console.error("Failed to load reports:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, courseId]);

  const buildRows = (session: SessionReport) =>
    session.records.map((r) => ({
      name: studentNameMap[r.studentId] || r.studentId,
      indexNumber: allStudents.find((s) => s.id === r.studentId)?.indexNumber ||
                   allStudents.find((s) => s.id === r.studentId)?.studentId || "-",
      method: r.method === "manual" ? "Manual" : r.method === "pin" ? "PIN Entry" : "QR Scan",
      time: new Date(r.timestamp).toLocaleTimeString(),
      status: "Present",
    }));

  const downloadPdf = async (session: SessionReport) => {
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();
    const rows = buildRows(session);
    const date = session.sessionDate;
    const title = `${course?.courseName ?? "Attendance"} — ${date}`;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(title, 14, 18);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Course: ${course?.courseCode ?? ""}   |   Total Present: ${rows.length}`, 14, 26);

    autoTable(doc, {
      startY: 32,
      head: [["#", "Name", "Index No.", "Method", "Time", "Status"]],
      body: rows.map((r, i) => [i + 1, r.name, r.indexNumber, r.method, r.time, r.status]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 80, 200] },
      alternateRowStyles: { fillColor: [240, 245, 255] },
    });

    doc.save(`attendance-${course?.courseCode ?? "session"}-${date}.pdf`);
  };

  const downloadExcel = async (session: SessionReport) => {
    const { unparse } = await import("papaparse");
    const rows = buildRows(session);
    const date = session.sessionDate;
    const csv = unparse({
      fields: ["Name", "Index Number", "Check-in Method", "Time", "Status"],
      data: rows.map((r) => [r.name, r.indexNumber, r.method, r.time, r.status]),
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${course?.courseCode ?? "session"}-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRemovePastAttendance = async (sessionId: string, recordId: string) => {
    if (!window.confirm("Are you sure you want to remove this student's attendance record?")) return;
    try {
      await deleteAttendanceRecord(recordId);
      
      // Update local state to reflect the removal immediately
      setSessions((prevSessions) =>
        prevSessions.map((session) => {
          if (session.id !== sessionId) return session;
          const updatedRecords = session.records.filter((r) => r.id !== recordId);
          return {
            ...session,
            totalPresent: updatedRecords.length,
            records: updatedRecords,
          };
        })
      );
    } catch (e: unknown) {
      if (e instanceof Error) alert("Failed to remove attendance: " + e.message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/lecturer/dashboard"
            className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full transition-all text-white hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-3 flex-wrap drop-shadow-md">
              {course?.courseName ?? "Loading course..."}
            </h1>
            <p className="text-blue-100 font-medium flex items-center gap-2 mt-1 text-sm">
              <span className="px-2 py-0.5 rounded bg-white/20 text-white border border-white/15 font-bold tracking-wider text-xs">
                {course?.courseCode ?? "..."}
              </span>
              Past Sessions & Reports
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 flex justify-center bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-12 text-center shadow-xl text-white">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-60" />
          <h2 className="text-xl font-bold">No past sessions found</h2>
          <p className="text-blue-100 mt-2 max-w-sm mx-auto">
            Once you or a course rep starts and ends a session for this course, the attendance reports will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <div key={session.id} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-xl text-white flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold">
                      {new Date(session.startTime).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </h3>
                    {session.status === "active" && (
                      <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-100 border border-red-500/30 text-xs font-bold animate-pulse">
                        Live
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-blue-100 font-medium ml-12">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                    <div className="flex items-center gap-1.5 font-bold text-white">
                      <Users className="w-4 h-4" />
                      {session.totalPresent} Present
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:ml-auto">
                  <button
                    onClick={() => setExpandedSessionId(expandedSessionId === session.id ? null : session.id)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/15 rounded-xl border border-white/15 font-bold transition-all text-sm shrink-0"
                  >
                    {expandedSessionId === session.id ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Hide Students
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        View Students
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => downloadPdf(session)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white text-blue-900 rounded-xl font-bold hover:bg-blue-50 transition-all hover:scale-105 active:scale-95 shadow-md text-sm shrink-0"
                  >
                    <FileText className="w-4 h-4" />
                    PDF
                  </button>
                  <button
                    onClick={() => downloadExcel(session)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white text-blue-900 rounded-xl font-bold hover:bg-blue-50 transition-all hover:scale-105 active:scale-95 shadow-md text-sm shrink-0"
                  >
                    <Sheet className="w-4 h-4" />
                    CSV
                  </button>
                </div>
              </div>

              {/* Collapsible Student List */}
              {expandedSessionId === session.id && (
                <div className="mt-2 border-t border-white/10 pt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <p className="text-xs font-bold text-blue-200 uppercase tracking-wider mb-3">
                    Checked In Students ({session.totalPresent})
                  </p>
                  {session.records.length === 0 ? (
                    <p className="text-sm text-blue-100 font-semibold py-4 text-center">
                      No students checked in for this session.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2">
                      {session.records.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between gap-3 p-3 bg-white/5 border border-white/10 rounded-xl text-sm"
                        >
                          <div className="flex flex-col truncate">
                            <span className="text-white font-bold truncate">
                              {studentNameMap[r.studentId] || r.studentId}
                            </span>
                            <span className="text-xs text-blue-200 font-mono mt-0.5">
                              {allStudents.find((s) => s.id === r.studentId)?.indexNumber ||
                               allStudents.find((s) => s.id === r.studentId)?.studentId || "-"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-blue-200 font-bold bg-white/10 px-2 py-0.5 rounded border border-white/10 uppercase">
                              {r.method === "manual" ? "Manual" : r.method === "pin" ? "PIN" : "QR"}
                            </span>
                            <button
                              onClick={() => handleRemovePastAttendance(session.id, r.id)}
                              className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-300 hover:text-red-100 transition-colors"
                              title="Remove Attendance Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
