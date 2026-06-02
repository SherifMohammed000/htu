"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Users, Search, ChevronUp, ChevronDown } from "lucide-react";

interface Student {
  name: string;
  indexNumber: string;
  stream: string;
}

export default function LecturerStudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [filtered, setFiltered] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<"name" | "indexNumber" | "stream">("name");
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, "students"));
        const data: Student[] = snap.docs.map(d => ({
          name: d.data().name || "",
          indexNumber: d.data().indexNumber || "",
          stream: d.data().stream || "",
        }));
        // Sort alphabetically by name initially
        data.sort((a, b) => a.name.localeCompare(b.name));
        setStudents(data);
        setFiltered(data);
      } catch (e) {
        console.error("Failed to load students", e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // Search filter
  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      setFiltered(students);
      return;
    }
    setFiltered(
      students.filter(
        s =>
          s.name.toLowerCase().includes(q) ||
          s.indexNumber.toLowerCase().includes(q) ||
          s.stream.toLowerCase().includes(q)
      )
    );
  }, [search, students]);

  const handleSort = (field: "name" | "indexNumber" | "stream") => {
    if (sortField === field) {
      setSortAsc(prev => !prev);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sorted = [...filtered].sort((a, b) => {
    const cmp = a[sortField].localeCompare(b[sortField]);
    return sortAsc ? cmp : -cmp;
  });

  const SortIcon = ({ field }: { field: "name" | "indexNumber" | "stream" }) => {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 opacity-30" />;
    return sortAsc
      ? <ChevronUp className="w-3 h-3 text-white" />
      : <ChevronDown className="w-3 h-3 text-white" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-white">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-md flex items-center gap-3">
          <Users className="w-8 h-8" /> My Students
        </h1>
        <p className="text-blue-100 mt-1 font-medium">
          {user?.courseCode ? `Course: ${user.courseCode}` : "All enrolled students"}
          {!isLoading && ` · ${students.length} students`}
        </p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
        <input
          type="text"
          placeholder="Search by name, index number or stream..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white font-medium backdrop-blur-md transition-all"
        />
      </div>

      {/* Table */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="p-16 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-16 text-center text-blue-200">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-semibold text-lg">No students found.</p>
            {search && <p className="text-sm mt-1 text-blue-100">Try a different search term.</p>}
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-12 gap-2 px-6 py-3 border-b border-white/10 bg-white/5 text-xs font-bold uppercase tracking-wider text-blue-200">
              <div className="col-span-1 text-center">#</div>
              <button
                onClick={() => handleSort("name")}
                className="col-span-6 flex items-center gap-1 hover:text-white transition-colors text-left"
              >
                Name <SortIcon field="name" />
              </button>
              <button
                onClick={() => handleSort("indexNumber")}
                className="col-span-3 flex items-center gap-1 hover:text-white transition-colors text-left"
              >
                Index No. <SortIcon field="indexNumber" />
              </button>
              <button
                onClick={() => handleSort("stream")}
                className="col-span-2 flex items-center gap-1 hover:text-white transition-colors text-left"
              >
                Stream <SortIcon field="stream" />
              </button>
            </div>

            {/* Rows */}
            <div className="divide-y divide-white/10 max-h-[60vh] overflow-y-auto">
              {sorted.map((student, idx) => (
                <div
                  key={student.indexNumber + idx}
                  className="grid grid-cols-12 gap-2 px-6 py-4 hover:bg-white/5 transition-colors items-center"
                >
                  <div className="col-span-1 text-center">
                    <span className="w-7 h-7 rounded-full bg-white/10 border border-white/10 text-xs font-bold text-blue-200 flex items-center justify-center mx-auto">
                      {idx + 1}
                    </span>
                  </div>
                  <div className="col-span-6">
                    <p className="font-semibold text-white text-sm leading-tight">{student.name}</p>
                  </div>
                  <div className="col-span-3">
                    <p className="text-sm text-blue-100 font-mono font-medium">{student.indexNumber}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white/15 border border-white/10 text-white">
                      {student.stream}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer count */}
            <div className="px-6 py-3 border-t border-white/10 bg-white/5 text-xs text-blue-200 font-semibold">
              Showing {sorted.length} of {students.length} students
              {search && ` · filtered by "${search}"`}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
