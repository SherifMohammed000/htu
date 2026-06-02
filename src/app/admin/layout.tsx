"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, Users, UserPlus, Settings, LogOut, Menu, X } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="p-8 flex justify-center items-center min-h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  const navLinks = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/courses", label: "Courses", icon: UserPlus },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-400 via-blue-700 to-red-600 text-white relative overflow-x-hidden">
      {/* Abstract background blobs for extra depth */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[100px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-red-500/10 rounded-full blur-[120px] pointer-events-none translate-x-1/3 translate-y-1/3" />

      {/* Mobile top bar */}
      <div className="md:hidden bg-white/10 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex justify-between items-center sticky top-0 z-30 text-white">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm overflow-hidden p-0.5">
            <img src="/uroll-logo.jpg" alt="HTU" className="w-8 h-8 object-contain" />
          </div>
          <span className="font-bold tracking-tight text-white">HTU Admin</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-white/80 hover:text-white">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-20 w-64 bg-white/10 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-200 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} text-white`}>
        <div className="h-full flex flex-col">
          <div className="p-6 hidden md:flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg overflow-hidden p-1">
              <img src="/uroll-logo.jpg" alt="HTU" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h1 className="font-extrabold text-white leading-tight">HTU</h1>
              <p className="text-xs text-blue-100 font-semibold tracking-wide uppercase">Admin</p>
            </div>
          </div>

          <div className="px-6 py-4 md:py-0 mb-6">
            <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl border border-white/10">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold shrink-0">
                {user.fullName.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">{user.fullName}</p>
                <p className="text-xs text-blue-200 truncate">{user.email}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                    isActive 
                      ? "bg-white text-blue-900 shadow-lg" 
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-blue-900" : ""}`} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/10">
            <button
              onClick={() => { logout(); router.push("/"); }}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-red-500/20 rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5 text-red-300" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="md:ml-64 flex flex-col flex-1 min-h-screen">
        <main className="flex-1 p-4 md:p-8 w-full max-w-7xl mx-auto pb-24 md:pb-8">{children}</main>
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-10 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
      )}
    </div>
  );
}
