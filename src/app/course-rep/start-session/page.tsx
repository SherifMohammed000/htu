"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { AttendanceRecord, AttendanceSession, Course } from "@/lib/mock/db";
import {
  createSession,
  updateSessionToken,
  closeSession,
  subscribeToSessionAttendance,
  getStudentCourses,
  recordAttendance,
  getUsersByRole,
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
  Play,
} from "lucide-react";
import Link from "next/link";
import { QRCodeSVG as QRCode } from "qrcode.react";
import { useSearchParams } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

interface StudentInfo {
  id: string;
  fullName: string;
  indexNumber?: string;
  studentId?: string;
}

function StartSessionContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const preselectedCourseId = searchParams.get("courseId");

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(preselectedCourseId);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [locationStatus, setLocationStatus] = useState("Select a course, then click 'Start Class'");
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [manualSearch, setManualSearch] = useState("");
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [allStudents, setAllStudents] = useState<StudentInfo[]>([]);
  const [studentNameMap, setStudentNameMap] = useState<Record<string, string>>({});

  // Load courses
  useEffect(() => {
    getStudentCourses().then((c) => {
      setCourses(c);
      setIsLoadingCourses(false);
      if (preselectedCourseId) {
        const found = c.find((course) => course.id === preselectedCourseId);
        if (found) {
          setSelectedCourse(found);
          setSelectedCourseId(found.id);
        }
      }
    });
  }, [preselectedCourseId]);

  // Load all students for manual sign-in
  useEffect(() => {
    const loadStudents = async () => {
      try {
        // Load activated users (students + course reps)
        const [students, reps] = await Promise.all([
          getUsersByRole("student"),
          getUsersByRole("course_rep"),
        ]);
        const combined = [...students, ...reps].map((s) => ({
          id: s.id,
          fullName: s.fullName,
          indexNumber: (s as any).indexNumber,
          studentId: s.studentId,
        }));
        setAllStudents(combined);

        // Build name lookup map
        const nameMap: Record<string, string> = {};
        combined.forEach((s) => {
          nameMap[s.id] = s.fullName;
        });
        setStudentNameMap(nameMap);
      } catch (e) {
        console.error("Failed to load students:", e);
      }
    };
    loadStudents();
  }, []);

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
    if (!user || !selectedCourseId) return;
    setIsStarting(true);

    const tryStart = async (lat: number, lng: number) => {
      const token = generateSecureToken();
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      const now = new Date();

      const newSession: Omit<AttendanceSession, "id"> = {
        courseId: selectedCourseId,
        lecturerId: user.id, // Course rep acts on behalf
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
  const manualSignIn = async (studentId: string) => {
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
      setManualSearch("");
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

  // Filter students for manual sign-in (exclude already checked in)
  const presentStudentIds = new Set(attendanceRecords.map((r) => r.studentId));
  const filteredStudents = allStudents.filter(
    (s) =>
      !presentStudentIds.has(s.id) &&
      (s.fullName.toLowerCase().includes(manualSearch.toLowerCase()) ||
        (s.indexNumber || s.studentId || "").toLowerCase().includes(manualSearch.toLowerCase()))
  );

  // Get display name for a studentId
  const getStudentDisplay = (studentId: string) => {
    const name = studentNameMap[studentId];
    if (name) return name;
    return studentId.substring(0, 12) + "...";
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/course-rep/dashboard"
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-400"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3 flex-wrap">
            {selectedCourse ? selectedCourse.courseName : "Start a Class Session"}
            {selectedCourse && (
              <span className="px-2.5 py-1 text-sm rounded-lg bg-teal-50 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 font-semibold tracking-wider">
                {selectedCourse.courseCode}
              </span>
            )}
          </h1>
        </div>
      </div>

      {/* Course Selection (if no active session) */}
      {!activeSession && !selectedCourseId && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            Select a Course
          </h2>
          {isLoadingCourses ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {courses.map((course) => (
                <button
                  key={course.id}
                  onClick={() => {
                    setSelectedCourseId(course.id);
                    setSelectedCourse(course);
                  }}
                  className="text-left p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/10 transition-all"
                >
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    {course.courseCode}
                  </span>
                  <p className="font-semibold text-slate-900 dark:text-white mt-2">
                    {course.courseName}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Start Session prompt */}
      {!activeSession && selectedCourseId && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center max-w-2xl mx-auto mt-6 shadow-sm">
          <div className="w-20 h-20 bg-teal-50 dark:bg-teal-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <MapPin className="w-10 h-10 text-teal-600 dark:text-teal-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Ready to start class?
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
            Your GPS location will be locked as the classroom reference point. Students must be
            within 30 meters to check in.
          </p>
          <button
            onClick={startSession}
            disabled={isStarting}
            className="w-full sm:w-auto px-8 py-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl font-bold text-lg shadow-lg shadow-teal-600/30 transition-all active:scale-95 flex items-center gap-3 mx-auto justify-center"
          >
            {isStarting ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Play className="w-5 h-5" />
            )}
            Start Class Session
          </button>
          <p className="mt-4 text-sm text-slate-400">{locationStatus}</p>
          <button
            onClick={() => {
              setSelectedCourseId(null);
              setSelectedCourse(null);
            }}
            className="mt-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium transition-colors"
          >
            ← Change course
          </button>
        </div>
      )}

      {/* Active Session */}
      {activeSession && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: QR & PIN */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col items-center relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-teal-100 dark:bg-teal-900/30">
              <div
                className="h-full bg-teal-600 transition-all duration-1000 ease-linear"
                style={{ width: `${(timeRemaining / 30) * 100}%` }}
              />
            </div>

            <div className="flex w-full justify-between items-center mb-6 mt-2">
              <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-medium bg-teal-50 dark:bg-teal-900/20 px-3 py-1.5 rounded-full text-sm">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                Live Session
              </div>
              <div className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                <RefreshCw
                  className={`w-4 h-4 ${timeRemaining <= 5 ? "animate-spin text-teal-500" : ""}`}
                />
                {timeRemaining}s
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-inner border border-slate-100 mb-6">
              <QRCode
                value={JSON.stringify({
                  sessionId: activeSession.id,
                  token: qrToken,
                  ts: Date.now(),
                })}
                size={200}
                level="H"
                includeMargin
              />
            </div>

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

          {/* Right: Stats & Controls */}
          <div className="flex flex-col gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Session Stats</h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4">
                  <p className="text-xs text-slate-500 mb-1">Duration</p>
                  <p className="text-3xl font-bold font-mono text-slate-900 dark:text-white">
                    {formatDuration(sessionDuration)}
                  </p>
                </div>
                <div className="bg-teal-50 dark:bg-teal-900/20 rounded-2xl p-4">
                  <p className="text-xs text-teal-600 mb-1">Present</p>
                  <p className="text-3xl font-bold text-teal-700 dark:text-teal-300 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    {attendanceRecords.length}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                <div className="p-2 bg-teal-50 dark:bg-teal-900/30 text-teal-600 rounded-lg">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    Geofencing Active
                  </p>
                  <p className="text-xs text-slate-500">30-meter radius</p>
                </div>
              </div>
            </div>

            {/* Live Attendance List */}
            {attendanceRecords.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm max-h-48 overflow-y-auto">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Checked In ({attendanceRecords.length})
                </p>
                <div className="space-y-2">
                  {attendanceRecords.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 text-sm">
                      <UserCheck className="w-4 h-4 text-green-500 shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300 truncate">
                        {getStudentDisplay(r.studentId)}
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
              className="w-full flex items-center justify-center gap-2 py-3 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/40 rounded-2xl font-semibold transition-colors"
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

      {/* Manual Sign-in Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
              Manual Sign-in
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
              Search for a student to mark as present.
            </p>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={manualSearch}
                onChange={(e) => setManualSearch(e.target.value)}
                placeholder="Search by name or index number..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-sm"
                autoFocus
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1 mb-4">
              {!manualSearch.trim() ? (
                <p className="text-center text-slate-400 py-8 text-sm">
                  Type a name or index number to search
                </p>
              ) : filteredStudents.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-sm">
                  No matching students found.
                </p>
              ) : (
                filteredStudents.slice(0, 20).map((student) => (
                  <button
                    key={student.id}
                    onClick={() => manualSignIn(student.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-700 dark:text-teal-300 font-bold text-sm shrink-0">
                      {student.fullName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {student.fullName}
                      </p>
                      <p className="text-xs text-slate-500 font-mono">
                        {student.indexNumber || student.studentId}
                      </p>
                    </div>
                    <UserCheck className="ml-auto w-5 h-5 text-slate-300 dark:text-slate-600" />
                  </button>
                ))
              )}
            </div>

            <button
              onClick={() => {
                setIsManualModalOpen(false);
                setManualSearch("");
              }}
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

export default function StartSessionPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        </div>
      }
    >
      <StartSessionContent />
    </Suspense>
  );
}
