"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { MOCK_DB } from "@/lib/mock/db";
import { Camera, MapPin, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function StudentScan() {
  const { user } = useAuth();
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState<"idle" | "scanning" | "verifying" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  
  // In a real app, this would come from a QR code scanner component
  // We'll simulate scanning the active session's QR code token
  const simulateScan = () => {
    setStatus("scanning");
    setTimeout(() => {
      setStatus("idle");
      // Pre-fill the form with something to show it "worked"
    }, 1500);
  };

  const verifyAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("verifying");
    
    // Simulate verifying PIN and Location
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Find an active session with this PIN
          const session = MOCK_DB.sessions.find(s => s.pinCode === pin && s.status === 'active');
          
          if (session) {
            // Check Geofencing (Haversine formula simplified)
            const R = 6371e3; // metres
            const φ1 = session.location.lat * Math.PI/180;
            const φ2 = position.coords.latitude * Math.PI/180;
            const Δφ = (position.coords.latitude-session.location.lat) * Math.PI/180;
            const Δλ = (position.coords.longitude-session.location.lng) * Math.PI/180;

            const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                      Math.cos(φ1) * Math.cos(φ2) *
                      Math.sin(Δλ/2) * Math.sin(Δλ/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const distance = R * c; // in metres

            // 30 meters geofencing radius
            if (distance <= 30) {
              // Record attendance
              MOCK_DB.records.push({
                id: `record_${Date.now()}`,
                studentId: user!.id,
                sessionId: session.id,
                timestamp: new Date().toISOString(),
                gpsCoordinates: {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude
                },
                status: 'present',
                method: 'qr'
              });
              setStatus("success");
            } else {
              setStatus("error");
              setErrorMessage(`You are too far from the classroom (${Math.round(distance)}m away). Maximum allowed radius is 30m.`);
            }
          } else {
            setStatus("error");
            setErrorMessage("Invalid or expired PIN code.");
          }
        },
        (error) => {
          setStatus("error");
          setErrorMessage("Location access denied. Please enable location services to check in.");
        }
      );
    } else {
      setStatus("error");
      setErrorMessage("Geolocation is not supported by your browser.");
    }
  };

  if (status === "success") {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-xl text-center animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Check-in Successful!</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          Your attendance has been recorded and verified via GPS.
        </p>
        <Link
          href="/student/dashboard"
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-xl font-bold transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Scan & Check-in</h1>
        <p className="text-slate-500 mt-2">Scan the QR code displayed by your lecturer and enter the classroom PIN.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Mock QR Scanner Area */}
        <div className="bg-slate-900 aspect-video relative flex flex-col items-center justify-center">
          {status === "scanning" ? (
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-blue-400 font-medium animate-pulse">Scanning...</p>
            </div>
          ) : (
            <>
              <div className="absolute inset-0 border-[40px] border-black/40" />
              <div className="relative z-10 w-48 h-48 border-2 border-white/50 rounded-3xl flex items-center justify-center">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl" />
                <Camera className="w-12 h-12 text-white/50" />
              </div>
            </>
          )}
          <button 
            onClick={simulateScan}
            disabled={status === "scanning"}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
          >
            Start Camera
          </button>
        </div>

        <div className="p-6">
          {status === "error" && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-300">{errorMessage}</p>
            </div>
          )}

          <form onSubmit={verifyAttendance} className="space-y-6">
            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Classroom PIN
              </label>
              <input
                id="pin"
                type="text"
                maxLength={4}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="0000"
                className="w-full text-center text-4xl font-mono tracking-[0.5em] py-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400 pb-2">
              <MapPin className="w-4 h-4" />
              Location will be verified automatically
            </div>

            <button
              type="submit"
              disabled={pin.length !== 4 || status === "verifying"}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {status === "verifying" ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Verify & Check-in
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
