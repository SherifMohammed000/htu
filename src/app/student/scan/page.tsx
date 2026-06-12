"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { recordAttendance } from "@/lib/firebase/firestore";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { AttendanceSession } from "@/lib/mock/db";
import { MapPin, CheckCircle, AlertTriangle, ArrowRight, QrCode, ShieldCheck, Scan } from "lucide-react";
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

type PageStatus = "idle" | "locating" | "scanning" | "submitting" | "success" | "error";

export default function StudentScan() {
  const { user } = useAuth();
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState<PageStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [verifiedSession, setVerifiedSession] = useState<AttendanceSession | null>(null);
  const [studentCoords, setStudentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const qrRegionRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<any>(null);

  // Step 1: Verify PIN + GPS location
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setStatus("locating");
    setErrorMessage("");

    const doLocate = async (lat: number, lng: number) => {
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

        // Stream validation check
        const sessionTarget = session.targetStream || "both";
        if (sessionTarget !== "both") {
          const studentIndexNumber = (user?.indexNumber || user?.email?.split("@")[0] || "").replace(/\s+/g, "");
          let officialStream = "";

          if (studentIndexNumber) {
            try {
              const studentDoc = await getDoc(doc(db, "students", studentIndexNumber));
              if (studentDoc.exists()) {
                officialStream = studentDoc.data().stream || "";
              }
            } catch (e) {
              console.error("Failed to query official student stream on scan:", e);
            }
          }

          const cleanStudentStream = officialStream.replace(/stream/i, "").trim().toUpperCase();
          const cleanTargetStream = sessionTarget.replace(/stream/i, "").trim().toUpperCase();

          if (cleanStudentStream !== cleanTargetStream) {
            setStatus("error");
            setErrorMessage(
              `This session is only open to Stream ${cleanTargetStream}. Your index number ${studentIndexNumber} is assigned to Stream ${cleanStudentStream || "Unknown"}.`
            );
            return;
          }
        }

        // Geofencing check — mandatory if session has a real location
        if (session.location.lat !== 0 && session.location.lng !== 0) {
          if (lat === 0) {
            setStatus("error");
            setErrorMessage("Location access is required. Please enable GPS and try again.");
            return;
          }
          const distance = haversineDistance(session.location.lat, session.location.lng, lat, lng);
          if (distance > 30) {
            setStatus("error");
            setErrorMessage(
              `You are ${Math.round(distance)}m away. You must be within 30m of the classroom to check in.`
            );
            return;
          }
        }

        if (session.verificationMode === "pin_only") {
          setStatus("submitting");
          await recordAttendance({
            studentId: user.id,
            sessionId: session.id,
            timestamp: new Date().toISOString(),
            gpsCoordinates: { lat, lng },
            status: "present",
            method: "pin",
          });

          // Notify student that check-in was successful
          fetch("/api/notifications", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: "checkin_success",
              studentId: user.id,
              courseId: session.courseId,
            }),
          }).catch((err) => console.error("Error triggering check-in success notification:", err));

          setStatus("success");
          return;
        }

        // PIN valid + within radius → go to scanning QR code
        setVerifiedSession(session);
        setStudentCoords({ lat, lng });
        setStatus("scanning");
      } catch (err: unknown) {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "An error occurred. Please try again.");
      }
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => doLocate(pos.coords.latitude, pos.coords.longitude),
        () => {
          setStatus("error");
          setErrorMessage("Location access denied. Please enable location services to check in.");
        },
        { timeout: 10000, maximumAge: 0 }
      );
    } else {
      doLocate(0, 0);
    }
  };

  // Scanner cleanup and setup handled below

  // Step 2: Start QR scanner after location verified
  useEffect(() => {
    if (status !== "scanning" || !qrRegionRef.current) return;

    let stopped = false;

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (stopped || !qrRegionRef.current) return;

      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (stopped) return;
          stopped = true;
          scanner.stop().catch(() => {});
          handleQrScanned(decodedText);
        },
        () => {}
      ).catch(() => {
        setStatus("error");
        setErrorMessage("Could not access camera. Please allow camera access and try again.");
      });
    });

    return () => {
      stopped = true;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Step 2 result: validate and record attendance
  const handleQrScanned = async (qrData: string) => {
    if (!user || !verifiedSession || !studentCoords) return;
    setStatus("submitting");

    try {
      // Parse QR payload — expects { sessionId, token }
      let payload: { sessionId?: string; token?: string } = {};
      try { payload = JSON.parse(qrData); } catch { /* not JSON */ }

      if (payload.sessionId !== verifiedSession.id) {
        setStatus("error");
        setErrorMessage("QR code does not match the session for this PIN. Please scan the correct code.");
        return;
      }

      await recordAttendance({
        studentId: user.id,
        sessionId: verifiedSession.id,
        timestamp: new Date().toISOString(),
        gpsCoordinates: studentCoords,
        status: "present",
        method: "qr",
      });

      // Notify student that check-in was successful
      fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "checkin_success",
          studentId: user.id,
          courseId: verifiedSession.courseId,
        }),
      }).catch((err) => console.error("Error triggering check-in success notification:", err));

      setStatus("success");
    } catch (err: unknown) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "An error occurred. Please try again.");
    }
  };

  // ── SUCCESS ──
  if (status === "success") {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-xl text-center text-white animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-white/25 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-extrabold text-white mb-2 drop-shadow-sm">Check-in Successful!</h2>
        <p className="text-blue-100 mb-8 font-medium">Your attendance has been recorded and verified.</p>
        <Link
          href="/student/dashboard"
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white text-blue-900 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-md"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // Face verification step removed

  // ── QR SCANNER STEP ──
  if (status === "scanning" || status === "submitting") {
    return (
      <div className="max-w-lg mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-white">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-500/20 border border-green-400/30 rounded-full text-green-200 text-sm font-bold mb-4">
            <ShieldCheck className="w-4 h-4" /> Location Verified — Within Range
          </div>
          <h1 className="text-3xl font-extrabold text-white drop-shadow-md">Scan QR Code</h1>
          <p className="text-blue-100 mt-2 font-medium">Point your camera at the QR code on the screen.</p>
        </div>

        {status === "submitting" ? (
          <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-xl p-12 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <p className="text-white font-semibold">Recording attendance...</p>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-xl overflow-hidden">
            <div className="p-4">
              <div
                id="qr-reader"
                ref={qrRegionRef}
                className="w-full rounded-2xl overflow-hidden"
                style={{ minHeight: 300 }}
              />
            </div>
            <div className="px-6 pb-6 flex items-center justify-center gap-2 text-sm text-blue-200 font-semibold">
              <Scan className="w-4 h-4" />
              Scanning for QR code...
            </div>
          </div>
        )}

        <button
          onClick={() => { setStatus("idle"); setVerifiedSession(null); setStudentCoords(null); setPin(""); }}
          className="w-full py-3 px-6 border border-white/20 rounded-xl text-white/70 hover:text-white text-sm font-semibold transition-colors"
        >
          ← Back to PIN entry
        </button>
      </div>
    );
  }

  // ── PIN ENTRY STEP ──
  return (
    <div className="max-w-lg mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-white">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-white drop-shadow-md">Scan &amp; Check-in</h1>
        <p className="text-blue-100 mt-2 font-medium">Enter the 4-digit PIN shown by your lecturer.</p>
      </div>

      <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-xl overflow-hidden">
        {/* Steps indicator */}
        <div className="bg-black/20 px-6 py-4 border-b border-white/10 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white text-blue-900 flex items-center justify-center text-xs font-extrabold">1</div>
            <span className="text-sm font-bold text-white">Enter PIN</span>
          </div>
          <div className="flex-1 h-px bg-white/20" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white/20 text-white/40 flex items-center justify-center text-xs font-extrabold border border-white/10">2</div>
            <span className="text-sm font-bold text-white/40">Scan QR</span>
          </div>
        </div>

        <div className="p-6">
          {status === "error" && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-start gap-3 text-white">
              <AlertTriangle className="w-5 h-5 text-white shrink-0 mt-0.5" />
              <p className="text-sm font-semibold">{errorMessage}</p>
            </div>
          )}

          <form onSubmit={handlePinSubmit} className="space-y-6">
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

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-3">
              <MapPin className="w-5 h-5 text-blue-200 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-white">Location Required</p>
                <p className="text-xs text-blue-200 mt-0.5">You must be within 30m of the classroom. After PIN verification, you'll scan the QR code on screen.</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={pin.length !== 4 || status === "locating"}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white text-blue-900 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] shadow-md"
            >
              {status === "locating" ? (
                <>
                  <div className="w-5 h-5 border-2 border-blue-900/30 border-t-blue-900 rounded-full animate-spin" />
                  Checking Location...
                </>
              ) : (
                <>
                  Verify Location &amp; Continue
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
