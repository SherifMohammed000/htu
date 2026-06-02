"use client";

import { useEffect, useState } from "react";
import { getUsersByRole } from "@/lib/firebase/firestore";
import { collection, getDocs, query, orderBy, limit, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { User, Course, AttendanceRecord } from "@/lib/mock/db";
import { Users, BookOpen, ClipboardList, TrendingUp, ShieldCheck, Clock, CheckCircle2, Crown, Search } from "lucide-react";
import { format } from "date-fns";

export default function AdminDashboard() {
  const [students, setStudents] = useState<User[]>([]);
  const [courseReps, setCourseReps] = useState<User[]>([]);
  const [lecturers, setLecturers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [recentRecords, setRecentRecords] = useState<AttendanceRecord[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [studentSearch, setStudentSearch] = useState("");
  const [isPromoting, setIsPromoting] = useState<string | null>(null);

  const loadData = async () => {
    const [studentList, repList, lecturerList] = await Promise.all([
      getUsersByRole("student"),
      getUsersByRole("course_rep"),
      getUsersByRole("lecturer"),
    ]);
    setStudents(studentList);
    setCourseReps(repList);
    setLecturers(lecturerList);

    // All courses
    const coursesSnap = await getDocs(collection(db, "courses"));
    setCourses(coursesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Course)));

    // Session count
    const sessionsSnap = await getDocs(collection(db, "sessions"));
    setSessionCount(sessionsSnap.size);

    // Recent attendance records (last 10)
    const recSnap = await getDocs(
      query(collection(db, "attendance_records"), orderBy("createdAt", "desc"), limit(10))
    );
    setRecentRecords(recSnap.docs.map((d) => ({ id: d.id, ...d.data() } as AttendanceRecord)));

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleCourseRep = async (userId: string, currentRole: string) => {
    setIsPromoting(userId);
    try {
      const newRole = currentRole === "course_rep" ? "student" : "course_rep";
      await updateDoc(doc(db, "users", userId), { role: newRole });
      await loadData();
    } catch (err) {
      console.error("Failed to update role:", err);
      alert("Failed to update role. Please try again.");
    } finally {
      setIsPromoting(null);
    }
  };

  const filteredStudents = [...students, ...courseReps].filter(
    (s) =>
      s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.email?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.studentId || (s as any).indexNumber || "").toLowerCase().includes(studentSearch.toLowerCase())
  );

  const statCards = [
    { label: "Students", value: students.length, icon: Users },
    { label: "Course Reps", value: courseReps.length, icon: Crown },
    { label: "Lecturers", value: lecturers.length, icon: ShieldCheck },
    { label: "Courses", value: courses.length, icon: BookOpen },
    { label: "Total Sessions", value: sessionCount, icon: ClipboardList },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-white">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-md">Admin Dashboard</h1>
        <p className="text-blue-100 mt-1 font-medium">System-wide overview and management.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 shadow-xl flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/15 text-white border border-white/10 shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-3xl font-extrabold text-white drop-shadow-sm">
                {isLoading ? "—" : value}
              </p>
              <p className="text-xs text-blue-100 font-bold mt-0.5 uppercase tracking-wide">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lecturers */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl overflow-hidden">
          <div className="p-5 border-b border-white/10">
            <h2 className="font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-white" /> Lecturers
            </h2>
          </div>
          {isLoading ? (
            <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" /></div>
          ) : lecturers.length === 0 ? (
            <p className="p-6 text-blue-200 text-sm text-center">No lecturers registered yet.</p>
          ) : (
            <div className="divide-y divide-white/10">
              {lecturers.map((l) => (
                <div key={l.id} className="p-4 flex items-center gap-3 hover:bg-white/5 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm shrink-0 border border-white/10">
                    {l.fullName.charAt(0)}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-white truncate">{l.fullName}</p>
                    <p className="text-xs text-blue-100 font-semibold mt-0.5 truncate">{l.department}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Courses */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl overflow-hidden">
          <div className="p-5 border-b border-white/10">
            <h2 className="font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-white" /> Courses
            </h2>
          </div>
          {isLoading ? (
            <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" /></div>
          ) : courses.length === 0 ? (
            <p className="p-6 text-blue-200 text-sm text-center">No courses created yet.</p>
          ) : (
            <div className="divide-y divide-white/10">
              {courses.map((c) => (
                <div key={c.id} className="p-4 flex items-center gap-3 hover:bg-white/5 transition-colors">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/20 text-white border border-white/10 shrink-0">
                    {c.courseCode}
                  </span>
                  <p className="text-sm font-bold text-white truncate">{c.courseName}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Attendance */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl overflow-hidden">
        <div className="p-5 border-b border-white/10">
          <h2 className="font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-white" /> Recent Attendance Activity
          </h2>
        </div>
        {isLoading ? (
          <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" /></div>
        ) : recentRecords.length === 0 ? (
          <p className="p-8 text-blue-200 text-sm text-center">No attendance records yet.</p>
        ) : (
          <div className="divide-y divide-white/10">
            {recentRecords.map((r) => (
              <div key={r.id} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors">
                <div className={`p-2 rounded-lg shrink-0 ${r.status === "present" ? "bg-white/20 text-white" : "bg-white/5 text-white/40"}`}>
                  {r.status === "present" ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    Student: <span className="font-mono text-xs text-blue-100 bg-white/10 px-1.5 py-0.5 rounded">{r.studentId}</span>
                  </p>
                  <p className="text-xs text-blue-100 mt-1 font-semibold">Session: {r.sessionId.substring(0, 12)}...</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.status === "present" ? "bg-white/20 text-white border border-white/10" : "bg-white/5 text-white/50"}`}>
                    {r.status}
                  </span>
                  <p className="text-xs text-blue-100 font-semibold mt-1.5">
                    {format(new Date(r.timestamp), "MMM d, h:mm a")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Students & Course Rep Management */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl overflow-hidden">
        <div className="p-5 border-b border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-white" /> Students & Course Reps ({filteredStudents.length})
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-100" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search students..."
                className="pl-9 pr-4 py-2 rounded-xl border border-white/25 bg-white/5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white focus:ring-2 focus:ring-white/15 w-full sm:w-64 transition-all"
              />
            </div>
          </div>
        </div>
        {isLoading ? (
          <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" /></div>
        ) : filteredStudents.length === 0 ? (
          <p className="p-6 text-blue-200 text-sm text-center">No students found.</p>
        ) : (
          <div className="divide-y divide-white/10 max-h-[500px] overflow-y-auto">
            {filteredStudents.map((s) => {
              const isRep = s.role === "course_rep";
              const indexNum = s.studentId || (s as any).indexNumber || "";
              return (
                <div key={s.id} className="p-4 flex items-center gap-3 hover:bg-white/5 transition-colors">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    isRep 
                      ? "bg-white text-blue-900" 
                      : "bg-white/10 text-white border border-white/10"
                  }`}>
                    {s.fullName.charAt(0)}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white truncate">{s.fullName}</p>
                      {isRep && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-white text-blue-950 shrink-0">
                          REP
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-blue-100 font-semibold mt-0.5 truncate">
                      {indexNum && <span className="font-mono">{indexNum}</span>}
                      {indexNum && s.email ? " · " : ""}
                      {s.email}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleCourseRep(s.id, s.role)}
                    disabled={isPromoting === s.id}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                      isRep
                        ? "bg-white/10 text-white hover:bg-white/20 border border-white/15"
                        : "bg-white text-blue-900 hover:bg-blue-50"
                    } disabled:opacity-50`}
                  >
                    {isPromoting === s.id ? (
                      <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    ) : isRep ? (
                      "Remove Rep"
                    ) : (
                      "Make Rep"
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
