"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { AttendanceRecord, AttendanceSession } from "@/lib/mock/db";
import {
  createSession,
  updateSessionToken,
  closeSession,
  subscribeToSessionAttendance,
  getLecturerCourses,
  getCourseStudents,
  recordAttendance,
} from "@/lib/firebase/firestore";
import {
  ArrowLeft,
  MapPin,
  Users,
  StopCircle,
  RefreshCw,
  Copy,
  CheckCircle,
  UserCheck,
  Search,
  PenLine,
} from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode.react";
import { Course } from "@/lib/mock/db";

export default function CourseSession({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const courseId = resolvedParams.id;
  const { user } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [locationStatus, setLocationStatus] = useState("Click 'Start Class' to begin");
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [courseStudents, setCourseStudents] = useState<{ id: string; fullName: string; studentId?: string }[]>([]);
  const [manualSearch, setManualSearch] = useState("");
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Load course info
  useEffect(() => {
    if (!user) return;
    getLecturerCourses(user.id).then((courses) => {
      const found = courses.find((c) => c.id === courseId);
      if (found) setCourse(found);
    });
  }, [user, courseId]);

  // Load enrolled students
  useEffect(() => {
    getCourseStudents(courseId).then(setCourseStudents);
  }, [courseId]);

  // Real-time attendance listener
  useEffect(() => {
    if (!sessionId) return;
    const unsub = subscribeToSessionAttendance(sessionId, setAttendanceRecords);
    return () => unsub();
  }, [sessionId]);

  // Generate secure token
  const generateSecureToken = useCallback(() => {
    const arr = new Uint8Array(20);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
  }, []);

  // Start session
  const startSession = async () => {
    if (!user) return;
    setIsStarting(true);

    const tryStart = async (lat: number, lng: number) => {
      const token = generateSecureToken();
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      const now = new Date();

      const newSession: Omit<AttendanceSession, "id"> = {
        courseId,
        lecturerId: user.id,
        sessionDate: now.toISOString().split("T")[0],
        startTime: now.toISOString(),
        qrToken: token,
        pinCode: pin,
        location: { lat, lng },
        status: "active",
      };

      try {
        const id = await createSession(newSession);
        setSessionId(id);
        setActiveSession({ id, ...newSession });
        setQrToken(token);
        setLocationStatus("Location locked ✓");
      } catch (e) {
        console.error(e);
        setLocationStatus("Failed to create session. Try again.");
      } finally {
        setIsStarting(false);
      }
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => tryStart(position.coords.latitude, position.coords.longitude),
        () => {
          setLocationStatus("Location denied — session created without geofencing.");
          tryStart(0, 0);
        }
      );
    } else {
      setLocationStatus("Geolocation not supported.");
      setIsStarting(false);
    }
  };

  // Stop session
  const stopSession = async () => {
    if (!sessionId) return;
    await closeSession(sessionId);
    setActiveSession(null);
    setSessionId(null);
  };

  // Copy PIN
  const copyPin = () => {
    if (activeSession) {
      navigator.clipboard.writeText(activeSession.pinCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Manual sign-in
  const manualSignIn = async (studentId: string, studentName: string) => {
    if (!sessionId || !activeSession) return;
    try {
      await recordAttendance({
        studentId,
        sessionId,
        timestamp: new Date().toISOString(),
        status: "present",
        method: "manual",
      });
      setIsManualModalOpen(false);
    } catch (e: unknown) {
      if (e instanceof Error) alert(e.message);
    }
  };

  // QR rotation + duration timer
  useEffect(() => {
    if (!activeSession || !sessionId) return;

    const qrInterval = setInterval(async () => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          const newToken = generateSecureToken();
          setQrToken(newToken);
          updateSessionToken(sessionId, newToken);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    const durationInterval = setInterval(() => {
      setSessionDuration((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(qrInterval);
      clearInterval(durationInterval);
    };
  }, [activeSession, sessionId, generateSecureToken]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const presentStudentIds = new Set(attendanceRecords.map((r) => r.studentId));
  const filteredStudents = courseStudents.filter(
    (s) =>
      !presentStudentIds.has(s.id) &&
      (s.fullName.toLowerCase().includes(manualSearch.toLowerCase()) ||
        s.studentId?.toLowerCase().includes(manualSearch.toLowerCase()))
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/lecturer/dashboard"
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-400"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3 flex-wrap">
            {course?.courseName ?? "Loading course..."}
            {course && (
              <span className="px-2.5 py-1 text-sm rounded-lg bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 font-semibold tracking-wider">
                {course.courseCode}
              </span>
            )}
          </h1>
        </div>
      </div>

      {/* Start Session prompt */}
      {!activeSession ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center max-w-2xl mx-auto mt-12 shadow-sm">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <MapPin className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Ready to start class?</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
            Your GPS location will be locked as the classroom reference point. Students must be within
            30 meters to check in.
          </p>
          <button
            onClick={startSession}
            disabled={isStarting}
            className="w-full sm:w-auto px-8 py-4 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl font-bold text-lg shadow-lg shadow-red-600/30 transition-all active:scale-95 flex items-center gap-3 mx-auto justify-center"
          >
            {isStarting ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <MapPin className="w-5 h-5" />
            )}
            Start Class Session
          </button>
          <p className="mt-4 text-sm text-slate-400">{locationStatus}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Left: QR & PIN ── */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col items-center relative overflow-hidden">
            {/* Progress bar */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-red-100 dark:bg-red-900/30">
              <div
                className="h-full bg-red-600 transition-all duration-1000 ease-linear"
                style={{ width: `${(timeRemaining / 30) * 100}%` }}
              />
            </div>

            <div className="flex w-full justify-between items-center mb-6 mt-2">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-full text-sm">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Live Session
              </div>
              <div className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                <RefreshCw className={`w-4 h-4 ${timeRemaining <= 5 ? "animate-spin text-red-500" : ""}`} />
                {timeRemaining}s
              </div>
            </div>

            {/* Real QR Code */}
            <div className="bg-white p-4 rounded-2xl shadow-inner border border-slate-100 mb-6">
              <QRCode
                value={JSON.stringify({ sessionId: activeSession.id, token: qrToken, ts: Date.now() })}
                size={200}
                level="H"
                includeMargin
              />
            </div>

            {/* PIN */}
            <div className="w-full">
              <p className="text-center text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wider">
                Classroom PIN
              </p>
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center justify-between">
                <span className="text-4xl font-mono font-bold tracking-[0.25em] text-slate-900 dark:text-white pl-2">
                  {activeSession.pinCode}
                </span>
                <button
                  onClick={copyPin}
                  className="p-3 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                  title="Copy PIN"
                >
                  {isCopied ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : (
                    <Copy className="w-6 h-6 text-slate-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ── Right: Stats & Controls ── */}
          <div className="flex flex-col gap-4">
            {/* Stats */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Session Stats</h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4">
                  <p className="text-xs text-slate-500 mb-1">Duration</p>
                  <p className="text-3xl font-bold font-mono text-slate-900 dark:text-white">
                    {formatDuration(sessionDuration)}
                  </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4">
                  <p className="text-xs text-blue-600 mb-1">Present</p>
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    {attendanceRecords.length}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Geofencing Active</p>
                  <p className="text-xs text-slate-500">30-meter radius</p>
                </div>
              </div>
            </div>

            {/* Live Attendance List */}
            {attendanceRecords.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm max-h-48 overflow-y-auto">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Checked In
                </p>
                <div className="space-y-2">
                  {attendanceRecords.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 text-sm">
                      <UserCheck className="w-4 h-4 text-green-500 shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300 truncate">
                        {r.studentId}
                      </span>
                      <span className="ml-auto text-xs text-slate-400 shrink-0">
                        {r.method === "manual" ? "Manual" : "QR"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manual Sign-in */}
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-2xl font-semibold transition-colors"
            >
              <PenLine className="w-5 h-5" />
              Manually Sign In Student
            </button>

            {/* End Session */}
            <button
              onClick={stopSession}
              className="w-full flex items-center justify-center gap-2 py-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-2xl font-bold transition-colors"
            >
              <StopCircle className="w-6 h-6" />
              End Session &amp; Generate Report
            </button>
          </div>
        </div>
      )}

      {/* ── Manual Sign-in Modal ── */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Manual Sign-in</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
              Mark a student as present with a valid reason.
            </p>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={manualSearch}
                onChange={(e) => setManualSearch(e.target.value)}
                placeholder="Search by name or student ID..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1 mb-4">
              {filteredStudents.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-sm">
                  {courseStudents.length === 0
                    ? "No students enrolled in this course."
                    : "All students are already checked in."}
                </p>
              ) : (
                filteredStudents.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => manualSignIn(student.id, student.fullName)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-sm shrink-0">
                      {student.fullName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{student.fullName}</p>
                      <p className="text-xs text-slate-500 font-mono">{student.studentId}</p>
                    </div>
                    <UserCheck className="ml-auto w-5 h-5 text-slate-300 dark:text-slate-600" />
                  </button>
                ))
              )}
            </div>

            <button
              onClick={() => setIsManualModalOpen(false)}
              className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
