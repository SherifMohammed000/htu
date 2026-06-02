"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { LogIn, Eye, EyeOff, UserPlus, ArrowRight, ShieldCheck, Download, X, Share, MoreVertical, PlusSquare } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export default function Home() {
  const { user, login, registerStudent, registerLecturer, isLoading } = useAuth();
  const router = useRouter();
  
  const [showSplash, setShowSplash] = useState(false);
  const [mode, setMode] = useState<"login" | "activate-step-1" | "activate-step-2">("login");
  
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Platform detection
  const getIsIOS = () => {
    if (typeof navigator === "undefined") return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.userAgent.includes("Mac") && "ontouchend" in document);
  };

  const getIsAndroid = () => {
    if (typeof navigator === "undefined") return false;
    return /Android/.test(navigator.userAgent);
  };

  const getIsStandalone = () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
  };

  useEffect(() => {
    setIsInstalled(getIsStandalone());

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || 
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setShowSplash(true);
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleInstallClick = async () => {
    if (isInstalled) return;

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstalled(true);
      }
      return;
    }

    if (getIsIOS()) {
      setShowIOSModal(true);
      return;
    }

    setShowIOSModal(true);
  };

  const getInstallButtonLabel = () => {
    if (isInstalled) return "App Installed ✓";
    if (getIsIOS()) return "Install on iPhone";
    if (getIsAndroid()) return "Install App";
    return "Install App";
  };

  useEffect(() => {
    if (!showSplash && !isLoading && user) {
      if (user.role === "lecturer") router.push("/lecturer/dashboard");
      else if (user.role === "student") router.push("/student/dashboard");
      else if (user.role === "course_rep") router.push("/course-rep/dashboard");
      else if (user.role === "admin") router.push("/admin/dashboard");
    }
  }, [user, isLoading, router, showSplash]);

  useEffect(() => {
    const fetchAutocompleteData = async () => {
      try {
        const [studentsSnap, coursesSnap, usersSnap] = await Promise.all([
          getDocs(collection(db, "students")),
          getDocs(collection(db, "courses")),
          getDocs(query(collection(db, "users"), where("role", "==", "lecturer"))),
        ]);
        
        const studentsData = studentsSnap.docs.map(doc => ({
          name: doc.data().name,
          indexNumber: doc.data().indexNumber,
          type: "student"
        }));
        
        const lecturerMap: Record<string, string> = {};
        usersSnap.docs.forEach(doc => {
          lecturerMap[doc.id] = doc.data().fullName;
        });
        
        const coursesData = coursesSnap.docs.map(doc => {
          const data = doc.data();
          const code = data.courseCode || doc.id;
          return {
            name: lecturerMap[data.lecturerId] || data.lecturerName || data.courseName || data.name || code,
            indexNumber: code,
            type: "lecturer"
          };
        });
        
        setAllStudents([...studentsData, ...coursesData]);
      } catch (e) {
        console.error("Failed to fetch autocomplete data", e);
      }
    };
    fetchAutocompleteData();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

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
      const matched = allStudents.find(s => (s.indexNumber || "").replace(/\s+/g, "").toUpperCase() === identifier.replace(/\s+/g, "").toUpperCase());
      if (!matched) {
        setError("No record found with this ID.");
        setIsSubmitting(false);
        return;
      }
      
      const actualLower = matched.name.toLowerCase();
      const typedParts = fullName.trim().toLowerCase().split(/\s+/);
      const isNameMatch = typedParts.every((part: string) => actualLower.includes(part));

      if (!isNameMatch) {
        setError("The Name does not match our records for this ID.");
        setIsSubmitting(false);
        return;
      }

      setFullName(matched.name);
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
      const ip = await fetchIpAddress();
      
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where("ipAddress", "==", ip));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setError("This device (IP) has already been used to activate an account.");
        setIsSubmitting(false);
        return;
      }
      
      const matched = allStudents.find(s => (s.indexNumber || "").replace(/\s+/g, "").toUpperCase() === identifier.replace(/\s+/g, "").toUpperCase());
      if (matched && matched.type === "lecturer") {
        await registerLecturer(identifier, fullName, password, ip);
      } else {
        await registerStudent(identifier, fullName, password, ip);
      }
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

  const filteredStudents = allStudents.filter(s => {
    if (!fullName.trim()) return false;
    if (fullName.trim().toLowerCase() === s.name.toLowerCase()) return false;
    
    const typedParts = fullName.trim().toLowerCase().split(/\s+/);
    const actualLower = s.name.toLowerCase();
    return typedParts.every((part: string) => actualLower.includes(part));
  });

  if (showSplash) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-sky-400 via-blue-700 to-red-600 relative overflow-hidden text-white">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-[120px] pointer-events-none -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-red-500/30 rounded-full blur-[150px] pointer-events-none translate-x-1/3 translate-y-1/3 animate-pulse" />
        
        <div className="flex flex-col items-center max-w-sm px-4 text-center z-10 animate-in fade-in zoom-in-95 duration-700">
          <div className="w-36 h-36 bg-white rounded-2xl shadow-2xl overflow-hidden animate-bounce mb-8 border-4 border-white/50">
            <img src="/uroll-logo.jpg" alt="HTU Logo" className="w-full h-full object-cover" />
          </div>
          
          <h1 className="text-4xl font-extrabold tracking-tight drop-shadow-lg mb-2">
            HTU Attendance
          </h1>
          <p className="text-blue-100 text-sm font-bold tracking-widest uppercase mb-12">
            Smart Portal
          </p>

          <div className="w-64 h-2 bg-white/20 rounded-full overflow-hidden border border-white/10 p-[1px] mb-4">
            <div className="h-full bg-white rounded-full animate-progress" />
          </div>
          <p className="text-xs text-blue-200 font-bold tracking-wide animate-pulse">
            Securing Connection...
          </p>
        </div>
      </div>
    );
  }

  if (isLoading || user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 flex-col gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-sky-400 via-blue-700 to-red-600 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-[100px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-red-500/30 rounded-full blur-[120px] pointer-events-none translate-x-1/3 translate-y-1/3" />
      
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 text-white relative z-10">
        <div className="text-center">
          <div className="w-32 h-32 bg-white rounded-2xl mx-auto mb-8 shadow-2xl overflow-hidden">
            <img src="/uroll-logo.jpg" alt="HTU Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-5xl font-extrabold mb-4 tracking-tight drop-shadow-md">HTU Attendance</h1>
          <p className="text-blue-100 text-xl mb-12 max-w-sm mx-auto leading-relaxed font-medium">
            Smart, secure, and automatic attendance tracking.
          </p>
          <div className="grid grid-cols-2 gap-4 text-left max-w-sm mx-auto">
            {[
              { label: "QR Verification", desc: "Dynamic codes every 30s" },
              { label: "IP Protection", desc: "Device-locked accounts" },
              { label: "Live Tracking", desc: "Real-time attendance updates" },
              { label: "Auto Reports", desc: "PDF, Excel & CSV exports" },
            ].map(item => (
              <div key={item.label} className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-colors">
                <p className="font-bold text-sm text-white">{item.label}</p>
                <p className="text-blue-100 text-xs mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-10 max-w-sm mx-auto">
            <button 
              onClick={handleInstallClick}
              disabled={isInstalled}
              className={`w-full py-4 px-6 border-2 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all backdrop-blur-md shadow-[0_4px_14px_0_rgba(255,255,255,0.15)] ${
                isInstalled
                  ? "bg-white/10 border-white/20 text-white/60 cursor-default"
                  : "bg-white/20 hover:bg-white/30 text-white border-white/40 hover:scale-105 active:scale-95"
              }`}
            >
              <Download className="w-6 h-6" /> {getInstallButtonLabel()}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center py-10 px-4 sm:px-6 lg:px-16 relative z-10">
        <div className="w-full max-w-md mx-auto bg-white/10 backdrop-blur-xl rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] p-8 sm:p-10 border border-white/20 text-white">
          <div className="lg:hidden flex flex-col items-center justify-center gap-4 mb-8">
            <div className="w-24 h-24 bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-white/50">
              <img src="/uroll-logo.jpg" alt="HTU Logo" className="w-full h-full object-cover" />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-extrabold tracking-tight drop-shadow-md">HTU Attendance</h1>
              <p className="text-sm text-blue-100 font-medium mt-1">Smart tracking portal</p>
            </div>
            <button 
              onClick={handleInstallClick}
              disabled={isInstalled}
              className={`mt-2 px-6 py-3 w-full border-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg text-sm ${
                isInstalled
                  ? "bg-white/10 border-white/20 text-white/60 cursor-default"
                  : "bg-white/20 hover:bg-white/30 text-white border-white/40 hover:scale-105 active:scale-95"
              }`}
            >
              <Download className="w-5 h-5" /> {getInstallButtonLabel()}
            </button>
          </div>

          {/* LOGIN MODE */}
          {mode === "login" && (
            <>
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight">Welcome back</h2>
                <p className="mt-2 text-white/70">Sign in to access your attendance portal.</p>
              </div>

              <form className="mt-8 space-y-5" onSubmit={handleLoginSubmit}>
                <div>
                  <label htmlFor="identifier" className="block text-sm font-semibold mb-1.5 text-white/90">
                    ID
                  </label>
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="block w-full rounded-xl border border-white/20 px-4 py-3 text-white bg-black/20 placeholder-white/50 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30 transition-all font-semibold"
                    placeholder="e.g. 0324080252 or CS301"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold mb-1.5 text-white/90">
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
                      className="block w-full rounded-xl border border-white/20 px-4 py-3 pr-12 text-white bg-black/20 placeholder-white/50 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30 transition-all font-semibold"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-white/50 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/50 text-red-100 text-sm font-medium backdrop-blur-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-white hover:bg-blue-50 text-blue-900 font-bold rounded-xl shadow-[0_4px_14px_0_rgba(255,255,255,0.39)] transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                >
                  {isSubmitting ? (
                    <div className="h-5 w-5 border-2 border-blue-900/30 border-t-blue-900 rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="h-5 w-5" />
                      Sign In
                    </>
                  )}
                </button>
                
                <div className="pt-4 text-center">
                  <p className="text-sm text-white/70">
                    First time here?{" "}
                    <button 
                      type="button" 
                      onClick={() => {
                        setMode("activate-step-1");
                        setError("");
                        setIdentifier("");
                        setPassword("");
                        setFullName("");
                      }}
                      className="text-white hover:text-blue-200 font-bold transition-colors underline decoration-white/30 underline-offset-2"
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
                <h2 className="text-3xl font-extrabold tracking-tight">Activate Account</h2>
                <p className="mt-2 text-white/70">Enter your details to verify your identity.</p>
              </div>

              <form className="mt-8 space-y-5" onSubmit={handleActivateStep1}>
                <div>
                  <label htmlFor="identifier" className="block text-sm font-semibold mb-1.5 text-white/90">
                    ID
                  </label>
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => {
                      const val = e.target.value;
                      setIdentifier(val);
                      const match = allStudents.find(s => (s.indexNumber || "").replace(/\s+/g, "").toUpperCase() === val.replace(/\s+/g, "").toUpperCase());
                      if (match) {
                        setFullName(match.name);
                        setShowSuggestions(false);
                      }
                    }}
                    onBlur={() => {
                      const match = allStudents.find(s => (s.indexNumber || "").replace(/\s+/g, "").toUpperCase() === identifier.replace(/\s+/g, "").toUpperCase());
                      if (match) {
                        setFullName(match.name);
                      }
                    }}
                    className="block w-full rounded-xl border border-white/20 px-4 py-3 text-white bg-black/20 placeholder-white/50 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30 transition-all font-semibold"
                    placeholder="e.g. 0324080252 or CS301"
                  />
                </div>

                <div ref={wrapperRef} className="relative">
                  <label htmlFor="fullName" className="block text-sm font-semibold mb-1.5 text-white/90">
                    Name
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    autoComplete="off"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    className="block w-full rounded-xl border border-white/20 px-4 py-3 text-white bg-black/20 placeholder-white/50 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30 transition-all font-semibold"
                    placeholder="e.g. KOFI BISMARK ADDAE or Dr. Amina"
                  />
                  
                  {showSuggestions && filteredStudents.length > 0 && (
                    <ul className="absolute z-10 w-full bg-white text-slate-900 border border-slate-200 rounded-xl mt-1 max-h-48 overflow-y-auto shadow-2xl">
                      {filteredStudents.map((s, idx) => (
                        <li 
                          key={s.indexNumber}
                          className={`px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm ${idx !== filteredStudents.length - 1 ? 'border-b border-slate-100' : ''}`}
                          onClick={() => {
                            setFullName(s.name);
                            setIdentifier(s.indexNumber);
                            setShowSuggestions(false);
                          }}
                        >
                          <div className="font-bold text-slate-900">{s.name}</div>
                          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                            <span>ID: {s.indexNumber}</span>
                            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0">
                              {s.type}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {error && (
                  <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/50 text-red-100 text-sm font-medium backdrop-blur-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-white hover:bg-blue-50 text-blue-900 font-bold rounded-xl shadow-[0_4px_14px_0_rgba(255,255,255,0.39)] transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                >
                  {isSubmitting ? (
                    <div className="h-5 w-5 border-2 border-blue-900/30 border-t-blue-900 rounded-full animate-spin" />
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
                    className="text-white/70 hover:text-white text-sm font-semibold transition-colors"
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
                <h2 className="text-3xl font-extrabold tracking-tight">Create Password</h2>
                <p className="mt-2 text-white/70">Set a secure password for <span className="font-bold text-white">{identifier}</span></p>
              </div>

              <form className="mt-8 space-y-5" onSubmit={handleActivateStep2}>
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold mb-1.5 text-white/90">
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
                      className="block w-full rounded-xl border border-white/20 px-4 py-3 pr-12 text-white bg-black/20 placeholder-white/50 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30 transition-all font-semibold"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-white/50 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold mb-1.5 text-white/90">
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
                      className="block w-full rounded-xl border border-white/20 px-4 py-3 pr-12 text-white bg-black/20 placeholder-white/50 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30 transition-all font-semibold"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/50 text-red-100 text-sm font-medium backdrop-blur-sm">
                    {error}
                  </div>
                )}

                <div className="p-4 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-start gap-3 backdrop-blur-sm">
                  <ShieldCheck className="h-5 w-5 text-sky-200 shrink-0 mt-0.5" />
                  <p className="text-xs text-sky-100 leading-relaxed font-medium">
                    By activating your account, your device's IP address will be securely recorded. You will not be able to use a different IP address for check-ins to prevent proxy attendance.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-white hover:bg-blue-50 text-blue-900 font-bold rounded-xl shadow-[0_4px_14px_0_rgba(255,255,255,0.39)] transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                >
                  {isSubmitting ? (
                    <div className="h-5 w-5 border-2 border-blue-900/30 border-t-blue-900 rounded-full animate-spin" />
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
                    className="text-white/70 hover:text-white text-sm font-semibold transition-colors"
                  >
                    Back
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-sky-400 via-blue-700 to-red-600 rounded-t-3xl sm:rounded-3xl border border-white/20 shadow-2xl w-full max-w-md p-6 sm:p-8 text-white relative animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors border border-white/10"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-white rounded-xl mx-auto mb-4 shadow-lg overflow-hidden">
                <img src="/uroll-logo.jpg" alt="HTU" className="w-full h-full object-cover" />
              </div>
              <h3 className="text-2xl font-extrabold drop-shadow-md">Install HTU Attendance</h3>
              <p className="text-blue-100 text-sm mt-1 font-medium">Add the app to your home screen</p>
            </div>

            {getIsIOS() ? (
              <div className="space-y-4">
                <p className="text-xs text-blue-200 font-bold uppercase tracking-wider text-center">Follow these steps in Safari</p>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-4 bg-white/10 rounded-2xl p-4 border border-white/10">
                    <div className="w-8 h-8 bg-white text-blue-900 rounded-full flex items-center justify-center font-extrabold text-sm shrink-0">1</div>
                    <div>
                      <p className="font-bold text-white text-sm">Tap the Share button</p>
                      <p className="text-blue-100 text-xs mt-0.5 flex items-center gap-1">
                        Look for the <Share className="w-3.5 h-3.5 inline" /> icon at the bottom of Safari
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 bg-white/10 rounded-2xl p-4 border border-white/10">
                    <div className="w-8 h-8 bg-white text-blue-900 rounded-full flex items-center justify-center font-extrabold text-sm shrink-0">2</div>
                    <div>
                      <p className="font-bold text-white text-sm">Scroll down and tap</p>
                      <p className="text-blue-100 text-xs mt-0.5 flex items-center gap-1">
                        <PlusSquare className="w-3.5 h-3.5 inline" /> <strong>&quot;Add to Home Screen&quot;</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 bg-white/10 rounded-2xl p-4 border border-white/10">
                    <div className="w-8 h-8 bg-white text-blue-900 rounded-full flex items-center justify-center font-extrabold text-sm shrink-0">3</div>
                    <div>
                      <p className="font-bold text-white text-sm">Tap &quot;Add&quot;</p>
                      <p className="text-blue-100 text-xs mt-0.5">The app will appear on your home screen like a native app</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-3 mt-2">
                  <p className="text-xs text-blue-200 text-center font-semibold">⚠️ Make sure you&apos;re using <strong>Safari</strong> — this won&apos;t work in Chrome or other iOS browsers</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-blue-200 font-bold uppercase tracking-wider text-center">Install from your browser</p>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-4 bg-white/10 rounded-2xl p-4 border border-white/10">
                    <div className="w-8 h-8 bg-white text-blue-900 rounded-full flex items-center justify-center font-extrabold text-sm shrink-0">1</div>
                    <div>
                      <p className="font-bold text-white text-sm">Tap the menu button</p>
                      <p className="text-blue-100 text-xs mt-0.5 flex items-center gap-1">
                        Look for <MoreVertical className="w-3.5 h-3.5 inline" /> (three dots) in your browser
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 bg-white/10 rounded-2xl p-4 border border-white/10">
                    <div className="w-8 h-8 bg-white text-blue-900 rounded-full flex items-center justify-center font-extrabold text-sm shrink-0">2</div>
                    <div>
                      <p className="font-bold text-white text-sm">Select &quot;Add to Home Screen&quot;</p>
                      <p className="text-blue-100 text-xs mt-0.5">or &quot;Install App&quot; if available</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 bg-white/10 rounded-2xl p-4 border border-white/10">
                    <div className="w-8 h-8 bg-white text-blue-900 rounded-full flex items-center justify-center font-extrabold text-sm shrink-0">3</div>
                    <div>
                      <p className="font-bold text-white text-sm">Confirm installation</p>
                      <p className="text-blue-100 text-xs mt-0.5">The app will appear on your home screen</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full mt-6 py-3.5 bg-white text-blue-900 rounded-xl font-bold transition-all hover:bg-blue-50 hover:scale-[1.02] active:scale-[0.98] shadow-md"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
