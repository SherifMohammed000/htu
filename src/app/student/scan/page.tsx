"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { recordAttendance } from "@/lib/firebase/firestore";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { AttendanceSession } from "@/lib/mock/db";
import { MapPin, CheckCircle, AlertTriangle, ArrowRight, QrCode } from "lucide-react";
import Link from "next/link";

// Haversine formula — returns distance in metres
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function StudentScan() {
  const { user } = useAuth();
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const verifyAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setStatus("verifying");

    const doVerify = async (lat: number, lng: number) => {
      try {
        // Find active session matching PIN
        const q = query(
          collection(db, "sessions"),
          where("pinCode", "==", pin),
          where("status", "==", "active")
        );
        const snap = await getDocs(q);

        if (snap.empty) {
          setStatus("error");
          setErrorMessage("Invalid or expired PIN code. Please check with your lecturer.");
          return;
        }

        const sessionDoc = snap.docs[0];
        const session = { id: sessionDoc.id, ...sessionDoc.data() } as AttendanceSession;

        // Geofencing check — skip if location is 0,0 (permission denied on lecturer side)
        if (session.location.lat !== 0 && session.location.lng !== 0 && lat !== 0) {
          const distance = haversineDistance(session.location.lat, session.location.lng, lat, lng);
          if (distance > 30) {
            setStatus("error");
            setErrorMessage(
              `You are ${Math.round(distance)}m from the classroom. You must be within 30m to check in.`
            );
            return;
          }
        }

        // Record attendance
        await recordAttendance({
          studentId: user.id,
          sessionId: session.id,
          timestamp: new Date().toISOString(),
          gpsCoordinates: { lat, lng },
          status: "present",
          method: "qr",
        });

        setStatus("success");
      } catch (err: unknown) {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "An error occurred. Please try again.");
      }
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => doVerify(pos.coords.latitude, pos.coords.longitude),
        () => {
          // Location denied — still try to record without GPS
          setStatus("error");
          setErrorMessage("Location access denied. Please enable location services to check in.");
        }
      );
    } else {
      doVerify(0, 0);
    }
  };

  if (status === "success") {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-xl text-center text-white animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-white/25 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-extrabold text-white mb-2 drop-shadow-sm">Check-in Successful!</h2>
        <p className="text-blue-100 mb-8 font-medium">
          Your attendance has been recorded and verified.
        </p>
        <Link
          href="/student/dashboard"
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white text-blue-900 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-md"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-white">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-white drop-shadow-md">Scan &amp; Check-in</h1>
        <p className="text-blue-100 mt-2 font-medium">Enter the 4-digit PIN shown by your lecturer.</p>
      </div>

      <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-xl overflow-hidden">
        {/* QR visual area */}
        <div className="bg-black/20 py-12 relative flex flex-col items-center justify-center gap-4 border-b border-white/10">
          <div className="relative z-10 w-40 h-40 border-2 border-white/30 rounded-3xl flex items-center justify-center">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl" />
            <QrCode className="w-16 h-16 text-white/50 animate-pulse" />
          </div>
          <p className="text-white/80 text-sm font-semibold">Point camera at lecturer&apos;s QR code</p>
          <p className="text-blue-200 text-xs font-medium">(Camera scanning coming soon — use PIN below)</p>
        </div>

        <div className="p-6">
          {status === "error" && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-start gap-3 text-white">
              <AlertTriangle className="w-5 h-5 text-white shrink-0 mt-0.5" />
              <p className="text-sm font-semibold">{errorMessage}</p>
            </div>
          )}

          <form onSubmit={verifyAttendance} className="space-y-6">
            <div>
              <label htmlFor="pin" className="block text-sm font-bold text-blue-100 mb-2">
                Classroom PIN
              </label>
              <input
                id="pin"
                type="text"
                inputMode="numeric"
                maxLength={4}
                required
                value={pin}
                onChange={(e) => {
                  setStatus("idle");
                  setPin(e.target.value.replace(/\D/g, ""));
                }}
                placeholder="0 0 0 0"
                className="w-full text-center text-5xl font-mono tracking-[0.5em] py-5 rounded-xl border border-white/20 bg-white/5 text-white placeholder-white/10 focus:outline-none focus:border-white focus:ring-2 focus:ring-white/15 transition-all"
              />
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-blue-200 font-semibold">
              <MapPin className="w-4 h-4" />
              Location will be verified automatically
            </div>

            <button
              type="submit"
              disabled={pin.length !== 4 || status === "verifying"}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white text-blue-900 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] shadow-md"
            >
              {status === "verifying" ? (
                <>
                  <div className="w-5 h-5 border-2 border-blue-900/30 border-t-blue-900 rounded-full animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Verify &amp; Check-in
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
