"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, ScanLine, Clock, LogOut, Menu, X, Play, Users } from "lucide-react";

export default function CourseRepLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "course_rep")) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>;
  }

  const navLinks = [
    { href: "/course-rep/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/course-rep/start-session", label: "Start Class", icon: Play },
    { href: "/course-rep/attendance", label: "Attendance", icon: Users },
    { href: "/course-rep/scan", label: "My Check-in", icon: ScanLine },
    { href: "/course-rep/history", label: "History", icon: Clock },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Mobile Navigation Bar */}
      <div className="md:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm overflow-hidden p-0.5">
            <Image src="/htu-logo.png" alt="HTU" width={32} height={32} className="object-contain" />
          </div>
          <span className="font-bold text-slate-900 dark:text-white tracking-tight">HTU Attendance</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600 dark:text-slate-300">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <div className={`fixed inset-y-0 left-0 z-20 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-200 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-6 hidden md:flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg overflow-hidden p-1">
              <Image src="/htu-logo.png" alt="HTU" width={40} height={40} className="object-contain" />
            </div>
            <div>
              <h1 className="font-extrabold text-slate-900 dark:text-white leading-tight">HTU</h1>
              <p className="text-xs text-slate-500 font-semibold tracking-wide uppercase">Attendance</p>
            </div>
          </div>

          <div className="px-6 py-4 md:py-0 mb-6">
            <div className="flex items-center gap-3 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-100 dark:border-teal-800/50">
              <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold">
                {user.fullName.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user.fullName}</p>
                <p className="text-xs font-mono text-teal-600 dark:text-teal-400 truncate">{user.studentId || (user as any).indexNumber}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                    isActive 
                      ? "bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" 
                      : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-teal-600 dark:text-teal-400" : ""}`} />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => {
                logout();
                router.push('/');
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="md:ml-64 flex flex-col flex-1 min-h-screen">
        <main className="flex-1 p-4 md:p-8 w-full max-w-7xl mx-auto pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-10 md:hidden backdrop-blur-sm" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
