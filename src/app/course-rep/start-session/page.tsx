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
    <div className="max-w-5xl mx-auto space-y-6 text-white">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/course-rep/dashboard"
          className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full transition-all text-white hover:scale-105 active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-3 flex-wrap drop-shadow-md">
            {selectedCourse ? selectedCourse.courseName : "Start a Class Session"}
            {selectedCourse && (
              <span className="px-2.5 py-1 text-sm rounded-lg bg-white/20 text-white border border-white/15 font-bold tracking-wider">
                {selectedCourse.courseCode}
              </span>
            )}
          </h1>
        </div>
      </div>

      {/* Course Selection (if no active session) */}
      {!activeSession && !selectedCourseId && (
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 shadow-xl text-white">
          <h2 className="text-xl font-bold text-white mb-4">
            Select a Course
          </h2>
          {isLoadingCourses ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {courses.map((course) => (
                <button
                  key={course.id}
                  onClick={() => {
                    setSelectedCourseId(course.id);
                    setSelectedCourse(course);
                  }}
                  className="text-left p-4 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/45 hover:scale-[1.02] transition-all"
                >
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white border border-white/10">
                    {course.courseCode}
                  </span>
                  <p className="font-bold text-white mt-2.5 text-lg">
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
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 text-center max-w-2xl mx-auto mt-6 shadow-xl text-white">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-inner">
            <MapPin className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-white mb-2 drop-shadow-md">
            Ready to start class?
          </h2>
          <p className="text-blue-100 mb-8 max-w-md mx-auto leading-relaxed">
            Your GPS location will be locked as the classroom reference point. Students must be
            within 30 meters to check in.
          </p>
          <button
            onClick={startSession}
            disabled={isStarting}
            className="w-full sm:w-auto px-8 py-4 bg-white text-blue-900 hover:bg-blue-50 disabled:opacity-60 rounded-xl font-bold text-lg shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-3 mx-auto justify-center"
          >
            {isStarting ? (
              <div className="h-5 w-5 border-2 border-blue-900/30 border-t-blue-900 rounded-full animate-spin" />
            ) : (
              <Play className="w-5 h-5 text-blue-900" />
            )}
            Start Class Session
          </button>
          <p className="mt-4 text-sm text-blue-200 font-semibold">{locationStatus}</p>
          <button
            onClick={() => {
              setSelectedCourseId(null);
              setSelectedCourse(null);
            }}
            className="mt-3 text-sm text-white/70 hover:text-white font-bold transition-colors block mx-auto underline underline-offset-4"
          >
            Change course
          </button>
        </div>
      )}

      {/* Active Session */}
      {activeSession && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: QR & PIN */}
          <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-6 shadow-xl flex flex-col items-center relative overflow-hidden text-white">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-white/10">
              <div
                className="h-full bg-white transition-all duration-1000 ease-linear"
                style={{ width: `${(timeRemaining / 30) * 100}%` }}
              />
            </div>

            <div className="flex w-full justify-between items-center mb-6 mt-2">
              <div className="flex items-center gap-2 text-white font-bold bg-white/20 px-3.5 py-1.5 rounded-full text-xs border border-white/10">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse" />
                Live Session
              </div>
              <div className="text-sm font-bold text-blue-100 flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                <RefreshCw
                  className={`w-3.5 h-3.5 ${timeRemaining <= 5 ? "animate-spin text-white" : ""}`}
                />
                {timeRemaining}s
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-xl border border-white/20 mb-6">
              <QRCode
                value={JSON.stringify({
                  sessionId: activeSession.id,
                  token: qrToken,
                  ts: Date.now(),
                })}
                size={220}
                level="H"
                includeMargin
              />
            </div>

            <div className="w-full">
              <p className="text-center text-xs text-blue-200 mb-2 font-bold uppercase tracking-wider">
                Classroom PIN
              </p>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                <span className="text-4xl font-mono font-extrabold tracking-[0.25em] text-white pl-2 drop-shadow-sm">
                  {activeSession.pinCode}
                </span>
                <button
                  onClick={copyPin}
                  className="p-3 hover:bg-white/15 rounded-xl transition-all hover:scale-105 active:scale-95"
                  title="Copy PIN"
                >
                  {isCopied ? (
                    <CheckCircle className="w-6 h-6 text-white" />
                  ) : (
                    <Copy className="w-6 h-6 text-white/60" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Stats & Controls */}
          <div className="flex flex-col gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-6 shadow-xl text-white">
              <h3 className="font-bold text-white mb-4 text-lg">Session Stats</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-xs text-blue-200 mb-1 font-semibold uppercase tracking-wider">Duration</p>
                  <p className="text-3xl font-extrabold font-mono text-white">
                    {formatDuration(sessionDuration)}
                  </p>
                </div>
                <div className="bg-white/15 border border-white/20 rounded-2xl p-4">
                  <p className="text-xs text-blue-100 mb-1 font-semibold uppercase tracking-wider">Present</p>
                  <p className="text-3xl font-extrabold text-white flex items-center gap-2">
                    <Users className="w-6 h-6" />
                    {attendanceRecords.length}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                <div className="p-2 bg-white/10 border border-white/10 text-white rounded-lg">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    Geofencing Active
                  </p>
                  <p className="text-xs text-blue-200 font-semibold mt-0.5">30-meter radius</p>
                </div>
              </div>
            </div>

            {/* Live Attendance List */}
            {attendanceRecords.length > 0 && (
              <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-4 shadow-xl max-h-48 overflow-y-auto">
                <p className="text-xs font-bold text-blue-200 uppercase tracking-wider mb-3">
                  Checked In ({attendanceRecords.length})
                </p>
                <div className="space-y-2">
                  {attendanceRecords.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 text-sm">
                      <UserCheck className="w-4 h-4 text-white shrink-0" />
                      <span className="text-white font-semibold truncate">
                        {getStudentDisplay(r.studentId)}
                      </span>
                      <span className="ml-auto text-xs text-blue-200 font-bold bg-white/10 px-2 py-0.5 rounded border border-white/10 shrink-0">
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
              className="w-full flex items-center justify-center gap-2 py-4 bg-white/10 border border-white/20 text-white hover:bg-white/15 rounded-2xl font-bold transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md"
            >
              <PenLine className="w-5 h-5 text-white" />
              Manually Sign In Student
            </button>

            {/* End Session */}
            <button
              onClick={stopSession}
              className="w-full flex items-center justify-center gap-2 py-4 bg-white text-blue-900 hover:bg-blue-50 rounded-2xl font-bold transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg"
            >
              <StopCircle className="w-6 h-6 text-blue-900" />
              End Session &amp; Generate Report
            </button>
          </div>
        </div>
      )}

      {/* Manual Sign-in Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-gradient-to-br from-sky-400 via-blue-700 to-red-600 rounded-3xl border border-white/20 shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200 text-white relative">
            <div className="absolute top-0 left-0 w-full h-full bg-black/20 rounded-3xl pointer-events-none -z-10" />
            <h3 className="text-xl font-extrabold text-white mb-1">
              Manual Sign-in
            </h3>
            <p className="text-blue-100 text-sm mb-4 font-semibold">
              Search for a student to mark as present.
            </p>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
              <input
                type="text"
                value={manualSearch}
                onChange={(e) => setManualSearch(e.target.value)}
                placeholder="Search by name or index number..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/20 bg-white/5 text-white placeholder-white/30 focus:outline-none focus:border-white focus:ring-2 focus:ring-white/10 text-sm font-semibold"
                autoFocus
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1 mb-4">
              {!manualSearch.trim() ? (
                <p className="text-center text-blue-200 py-8 text-sm font-semibold">
                  Type a name or index number to search
                </p>
              ) : filteredStudents.length === 0 ? (
                <p className="text-center text-blue-200 py-8 text-sm font-semibold">
                  No matching students found.
                </p>
              ) : (
                filteredStudents.slice(0, 20).map((student) => (
                  <button
                    key={student.id}
                    onClick={() => manualSignIn(student.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-white/10 rounded-xl transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-white/20 border border-white/10 flex items-center justify-center text-white font-extrabold text-sm shrink-0">
                      {student.fullName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">
                        {student.fullName}
                      </p>
                      <p className="text-xs text-blue-200 font-mono mt-0.5">
                        {student.indexNumber || student.studentId}
                      </p>
                    </div>
                    <UserCheck className="ml-auto w-5 h-5 text-white/60" />
                  </button>
                ))
              )}
            </div>

            <button
              onClick={() => {
                setIsManualModalOpen(false);
                setManualSearch("");
              }}
              className="w-full py-3 rounded-xl bg-white text-blue-900 hover:bg-blue-50 font-bold transition-colors"
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
        <div className="p-8 flex justify-center text-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
        </div>
      }
    >
      <StartSessionContent />
    </Suspense>
  );
}
