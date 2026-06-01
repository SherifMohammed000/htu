"use client";

import { useState, useEffect, use } from "react";
import { useAuth } from "@/context/AuthContext";
import { MOCK_COURSES, MOCK_DB, AttendanceSession } from "@/lib/mock/db";
import { ArrowLeft, MapPin, Users, StopCircle, RefreshCw, Copy, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CourseSession({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const courseId = resolvedParams.id;
  const { user } = useAuth();
  const router = useRouter();
  
  const course = MOCK_COURSES.find(c => c.id === courseId);
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [qrToken, setQrToken] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [locationStatus, setLocationStatus] = useState("Fetching location...");

  // Handle Session Start
  const startSession = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newSession: AttendanceSession = {
            id: `session_${Date.now()}`,
            courseId,
            lecturerId: user!.id,
            sessionDate: new Date().toISOString().split('T')[0],
            startTime: new Date().toISOString(),
            qrToken: generateSecureToken(),
            pinCode: Math.floor(1000 + Math.random() * 9000).toString(),
            location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            },
            status: 'active',
          };
          MOCK_DB.sessions.push(newSession);
          setActiveSession(newSession);
          setQrToken(newSession.qrToken);
          setLocationStatus("Location locked successfully");
        },
        () => {
          setLocationStatus("Location access denied. Cannot start session with Geofencing.");
          alert("Please enable location services to use geofencing.");
        }
      );
    } else {
      setLocationStatus("Geolocation is not supported by your browser");
    }
  };

  // Stop Session
  const stopSession = () => {
    if (activeSession) {
      const sessionIndex = MOCK_DB.sessions.findIndex(s => s.id === activeSession.id);
      if (sessionIndex > -1) {
        MOCK_DB.sessions[sessionIndex].status = 'closed';
        MOCK_DB.sessions[sessionIndex].endTime = new Date().toISOString();
      }
      setActiveSession(null);
      // Optional: Redirect to report
    }
  };

  // Utilities
  const generateSecureToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const copyPin = () => {
    if (activeSession) {
      navigator.clipboard.writeText(activeSession.pinCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // QR Code Rotation Timer
  useEffect(() => {
    if (!activeSession) return;

    const qrInterval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          const newToken = generateSecureToken();
          setQrToken(newToken);
          // Update in DB
          const session = MOCK_DB.sessions.find(s => s.id === activeSession.id);
          if (session) session.qrToken = newToken;
          return 30; // Reset to 30s
        }
        return prev - 1;
      });
    }, 1000);

    const durationInterval = setInterval(() => {
      setSessionDuration(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(qrInterval);
      clearInterval(durationInterval);
    };
  }, [activeSession]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!course) return <div>Course not found</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/lecturer/dashboard" className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-400">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            {course.courseName}
            <span className="px-2.5 py-1 text-sm rounded-lg bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 font-semibold tracking-wider">
              {course.courseCode}
            </span>
          </h1>
        </div>
      </div>

      {!activeSession ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center max-w-2xl mx-auto mt-12 shadow-sm">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <MapPin className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Ready to start class?</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
            Starting a session will lock your current GPS location for geofencing and generate dynamic QR codes for students to scan.
          </p>
          <button
            onClick={startSession}
            className="w-full sm:w-auto px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-red-600/30 transition-all active:scale-95"
          >
            Start Class Session
          </button>
          <p className="mt-4 text-sm text-slate-500">{locationStatus}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Active Session Left Panel (QR & PIN) */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-blue-200 dark:border-blue-900/50 p-8 shadow-xl shadow-blue-100 dark:shadow-none flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-2 bg-red-100 dark:bg-red-900/30">
              <div 
                className="h-full bg-red-600 transition-all duration-1000 ease-linear"
                style={{ width: `${(timeRemaining / 30) * 100}%` }}
              />
            </div>
            
            <div className="flex w-full justify-between items-center mb-8">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-full text-sm">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Live Session
              </div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 ${timeRemaining <= 3 ? 'animate-spin text-amber-500' : ''}`} />
                Refreshes in {timeRemaining}s
              </div>
            </div>

            {/* QR Code Placeholder since we don't have qrcode.react running right now */}
            <div className="w-64 h-64 bg-white p-4 rounded-2xl shadow-inner border-2 border-slate-100 flex items-center justify-center mb-8 relative group">
               {/* In a real scenario, use: <QRCode value={qrToken} size={224} /> */}
               <div className="text-center">
                 <div className="w-48 h-48 border-4 border-dashed border-slate-300 rounded-xl flex items-center justify-center">
                   <p className="text-slate-400 font-mono text-sm break-all p-4 text-center">
                    [QR CODE RENDERER]
                    <br/><br/>
                    {qrToken.substring(0, 10)}...
                   </p>
                 </div>
               </div>
            </div>

            <div className="w-full max-w-sm">
              <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-2 font-medium uppercase tracking-wider">Classroom PIN</p>
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center justify-between">
                <span className="text-4xl font-mono font-bold tracking-[0.2em] text-slate-900 dark:text-white pl-4">
                  {activeSession.pinCode}
                </span>
                <button 
                  onClick={copyPin}
                  className="p-3 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  title="Copy PIN"
                >
                  {isCopied ? <CheckCircle className="w-6 h-6 text-emerald-500" /> : <Copy className="w-6 h-6 text-slate-400" />}
                </button>
              </div>
            </div>
          </div>

          {/* Active Session Right Panel (Stats & Controls) */}
          <div className="space-y-6 flex flex-col">
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-6">Session Details</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Duration</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white font-mono">
                    {formatDuration(sessionDuration)}
                  </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4">
                  <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Students Present</p>
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                    <Users className="w-6 h-6" />
                    0
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">Geofencing Active</p>
                    <p className="text-xs text-slate-500">Radius: 30 meters</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={stopSession}
              className="mt-auto w-full flex items-center justify-center gap-2 py-4 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 rounded-2xl font-bold transition-colors"
            >
              <StopCircle className="w-6 h-6" />
              End Session & Generate Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
