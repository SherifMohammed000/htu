"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { QrCode, LogIn, Eye, EyeOff, UserPlus, ArrowRight, ShieldCheck } from "lucide-react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export default function Home() {
  const { user, login, registerStudent, isLoading } = useAuth();
  const router = useRouter();
  
  const [mode, setMode] = useState<"login" | "activate-step-1" | "activate-step-2">("login");
  
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === "lecturer") router.push("/lecturer/dashboard");
      else if (user.role === "student") router.push("/student/dashboard");
      else if (user.role === "admin") router.push("/admin/dashboard");
    }
  }, [user, isLoading, router]);

  const fetchIpAddress = async () => {
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      return data.ip;
    } catch (e) {
      console.error("Failed to fetch IP", e);
      throw new Error("Could not determine your device IP. Please check your network.");
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await login(identifier, password);
    } catch (err: any) {
      const code = err?.code;
      if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError("Invalid credentials. Please try again.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please try again later.");
      } else {
        setError("Failed to sign in. Please check your credentials.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivateStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    
    try {
      // 1. Check if student exists in 'students' collection
      const studentRef = doc(db, 'students', identifier);
      const studentSnap = await getDoc(studentRef);
      
      if (!studentSnap.exists()) {
        setError("No student found with this Index Number.");
        setIsSubmitting(false);
        return;
      }
      
      const studentData = studentSnap.data();
      if (studentData.name.trim().toLowerCase() !== fullName.trim().toLowerCase()) {
        setError("The Full Name does not match our records for this Index Number.");
        setIsSubmitting(false);
        return;
      }
      
      // 2. Proceed to step 2
      setMode("activate-step-2");
    } catch (err) {
      console.error(err);
      setError("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivateStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Fetch IP
      const ip = await fetchIpAddress();
      
      // 2. Check if IP already used by another user
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where("ipAddress", "==", ip));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setError("This device (IP) has already been used to activate an account.");
        setIsSubmitting(false);
        return;
      }
      
      // 3. Register the student
      await registerStudent(identifier, fullName, password, ip);
      
      // They will be automatically logged in and redirected
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setError("This account is already activated. Please login instead.");
      } else {
        setError("Failed to activate account. " + (err.message || ""));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || user) {
    return (
      <div className="flex items-center justify-center min-h-screen flex-col gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        <p className="text-slate-500">Loading your workspace...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-slate-900">
      {/* Left decorative panel - hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-700 via-blue-600 to-red-600 flex-col items-center justify-center p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white" />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-white" />
        </div>
        <div className="relative z-10 text-center">
          <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
            <QrCode className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold mb-4 tracking-tight">HTU Attendance</h1>
          <p className="text-blue-100 text-xl mb-12 max-w-sm mx-auto leading-relaxed">
            Smart, secure, and automatic attendance tracking for modern universities.
          </p>
          <div className="grid grid-cols-2 gap-4 text-left max-w-sm mx-auto">
            {[
              { label: "QR Verification", desc: "Dynamic codes every 30s" },
              { label: "IP Protection", desc: "Device-locked accounts" },
              { label: "Live Tracking", desc: "Real-time attendance updates" },
              { label: "Auto Reports", desc: "PDF, Excel & CSV exports" },
            ].map(item => (
              <div key={item.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <p className="font-bold text-sm">{item.label}</p>
                <p className="text-blue-200 text-xs mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col justify-center py-12 px-6 sm:px-12 lg:px-16">
        <div className="w-full max-w-md mx-auto">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <div className="w-12 h-12 bg-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
              <QrCode className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">HTU Attendance</h1>
          </div>

          {/* LOGIN MODE */}
          {mode === "login" && (
            <>
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Welcome back
                </h2>
                <p className="mt-2 text-slate-500 dark:text-slate-400">
                  Sign in to access your attendance portal.
                </p>
              </div>

              <form className="mt-10 space-y-5" onSubmit={handleLoginSubmit}>
                <div>
                  <label htmlFor="identifier" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Index Number or Email
                  </label>
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-900 dark:text-white dark:bg-slate-800 placeholder-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all"
                    placeholder="e.g. 0324080252"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 pr-12 text-slate-900 dark:text-white dark:bg-slate-800 placeholder-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 text-sm font-medium">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-600/25 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                >
                  {isSubmitting ? (
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="h-5 w-5" />
                      Sign In
                    </>
                  )}
                </button>
                
                <div className="pt-4 text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    First time here?{" "}
                    <button 
                      type="button" 
                      onClick={() => {
                        setMode("activate-step-1");
                        setError("");
                        setIdentifier("");
                        setPassword("");
                      }}
                      className="text-red-600 hover:text-red-700 font-semibold transition-colors"
                    >
                      Activate Account
                    </button>
                  </p>
                </div>
              </form>
            </>
          )}

          {/* ACTIVATE MODE - STEP 1 */}
          {mode === "activate-step-1" && (
            <>
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Activate Account
                </h2>
                <p className="mt-2 text-slate-500 dark:text-slate-400">
                  Enter your details to verify your identity.
                </p>
              </div>

              <form className="mt-10 space-y-5" onSubmit={handleActivateStep1}>
                <div>
                  <label htmlFor="identifier" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Index Number
                  </label>
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-900 dark:text-white dark:bg-slate-800 placeholder-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all"
                    placeholder="e.g. 0324080252"
                  />
                </div>

                <div>
                  <label htmlFor="fullName" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Full Name (As in database)
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-900 dark:text-white dark:bg-slate-800 placeholder-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all"
                    placeholder="e.g. ADDAE BISMARK KOFI"
                  />
                </div>

                {error && (
                  <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 text-sm font-medium">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/25 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                >
                  {isSubmitting ? (
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Verify Identity
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
                
                <div className="pt-4 text-center">
                  <button 
                    type="button" 
                    onClick={() => {
                      setMode("login");
                      setError("");
                    }}
                    className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm font-semibold transition-colors"
                  >
                    Back to Login
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ACTIVATE MODE - STEP 2 */}
          {mode === "activate-step-2" && (
            <>
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Create Password
                </h2>
                <p className="mt-2 text-slate-500 dark:text-slate-400">
                  Set a secure password for <span className="font-semibold text-slate-700 dark:text-slate-300">{identifier}</span>
                </p>
              </div>

              <form className="mt-10 space-y-5" onSubmit={handleActivateStep2}>
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 pr-12 text-slate-900 dark:text-white dark:bg-slate-800 placeholder-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 pr-12 text-slate-900 dark:text-white dark:bg-slate-800 placeholder-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 text-sm font-medium">
                    {error}
                  </div>
                )}

                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                    By activating your account, your device's IP address will be securely recorded. You will not be able to use a different IP address for check-ins to prevent proxy attendance.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-600/25 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                >
                  {isSubmitting ? (
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="h-5 w-5" />
                      Activate & Login
                    </>
                  )}
                </button>
                
                <div className="pt-4 text-center">
                  <button 
                    type="button" 
                    onClick={() => {
                      setMode("activate-step-1");
                      setError("");
                    }}
                    className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm font-semibold transition-colors"
                  >
                    Back
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
