"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getLecturerCourses, getActiveSession, recordAttendance } from "@/lib/firebase/firestore";
import { Course, AttendanceSession } from "@/lib/mock/db";
import { Settings, UserPlus, CheckCircle, AlertCircle } from "lucide-react";

export default function LecturerSettingsPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  const [studentIndex, setStudentIndex] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const myCourses = await getLecturerCourses(user.id);
      setCourses(myCourses);
      if (myCourses.length > 0) {
        setSelectedCourseId(myCourses[0].id);
        const session = await getActiveSession(myCourses[0].id);
        setActiveSession(session);
      }
      setIsLoading(false);
    };
    load();
  }, [user]);

  const handleCourseChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const courseId = e.target.value;
    setSelectedCourseId(courseId);
    setActiveSession(null);
    setMessage(null);
    
    if (courseId) {
      const session = await getActiveSession(courseId);
      setActiveSession(session);
    }
  };

  const handleManualSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    
    setIsSubmitting(true);
    setMessage(null);
    
    try {
      await recordAttendance({
        studentId: studentIndex.trim().toUpperCase(),
        sessionId: activeSession.id,
        timestamp: new Date().toISOString(),
        status: "present",
        method: "manual"
      });
      
      setMessage({ type: "success", text: `Successfully signed in student ${studentIndex.toUpperCase()}` });
      setStudentIndex("");
    } catch (err: any) {
      if (err.message?.includes("already recorded")) {
        setMessage({ type: "error", text: "Student is already signed in for this session." });
      } else {
        setMessage({ type: "error", text: "Failed to record attendance. Please try again." });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-white">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-md flex items-center gap-3">
          <Settings className="w-8 h-8" /> Settings
        </h1>
        <p className="text-blue-100 mt-1 font-medium">
          Manage your course settings and manually sign in students.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Manual Sign In Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl overflow-hidden p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
            <div className="bg-white/15 p-2 rounded-lg border border-white/10">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Manual Sign-In</h2>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
            </div>
          ) : courses.length === 0 ? (
            <p className="text-blue-200">You don't have any courses assigned yet.</p>
          ) : (
            <div className="space-y-6">
              {courses.length > 1 && (
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-blue-100">
                    Select Course
                  </label>
                  <select
                    value={selectedCourseId}
                    onChange={handleCourseChange}
                    className="block w-full rounded-xl border border-white/20 px-4 py-3 text-white bg-black/20 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30 transition-all font-medium appearance-none"
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id} className="text-black">{c.courseCode} - {c.courseName}</option>
                    ))}
                  </select>
                </div>
              )}

              {!activeSession ? (
                <div className="p-4 rounded-xl bg-yellow-500/20 border border-yellow-500/50 flex items-start gap-3 backdrop-blur-sm">
                  <AlertCircle className="h-5 w-5 text-yellow-200 shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-100 font-medium">
                    No active session found for this course. You must start a class first before manually signing in students.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleManualSignIn} className="space-y-4">
                  <div>
                    <label htmlFor="studentIndex" className="block text-sm font-semibold mb-1.5 text-blue-100">
                      Student Index Number
                    </label>
                    <input
                      id="studentIndex"
                      type="text"
                      required
                      value={studentIndex}
                      onChange={(e) => setStudentIndex(e.target.value)}
                      placeholder="e.g. 0324080252"
                      className="block w-full rounded-xl border border-white/20 px-4 py-3 text-white bg-black/20 placeholder-white/40 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30 transition-all font-medium uppercase"
                    />
                  </div>
                  
                  {message && (
                    <div className={`p-4 rounded-xl border flex items-start gap-3 backdrop-blur-sm ${
                      message.type === 'success' 
                        ? 'bg-green-500/20 border-green-500/50 text-green-100' 
                        : 'bg-red-500/20 border-red-500/50 text-red-100'
                    }`}>
                      {message.type === 'success' ? (
                        <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                      )}
                      <p className="text-sm font-medium">{message.text}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || !studentIndex.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white hover:bg-blue-50 text-blue-900 font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <div className="h-5 w-5 border-2 border-blue-900/30 border-t-blue-900 rounded-full animate-spin" />
                    ) : (
                      "Mark as Present"
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Other settings can go here */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl overflow-hidden p-6 opacity-50 pointer-events-none">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
            <div className="bg-white/15 p-2 rounded-lg border border-white/10">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">General Preferences</h2>
          </div>
          <p className="text-sm text-blue-200">Additional settings will be available in a future update.</p>
        </div>
      </div>
    </div>
  );
}
