"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { QrCode, LogIn } from "lucide-react";

export default function Home() {
  const { user, login, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === "lecturer") router.push("/lecturer/dashboard");
      else if (user.role === "student") router.push("/student/dashboard");
      else if (user.role === "admin") router.push("/admin/dashboard");
    }
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await login(email);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Failed to login");
      } else {
        setError("Failed to login");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || user) {
    return (
      <div className="flex items-center justify-center h-full flex-col gap-4 mt-32">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        <p className="text-slate-500">Loading your workspace...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8 bg-white dark:bg-slate-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
          <QrCode className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          HTU Attendance
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
          Smart Check-in System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-800 py-8 px-4 shadow-xl shadow-slate-200/50 dark:shadow-none sm:rounded-2xl sm:px-10 border border-slate-100 dark:border-slate-700">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Institutional Email Address
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full appearance-none rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 placeholder-slate-400 focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm dark:bg-slate-900 dark:text-white transition-colors"
                  placeholder="e.g. sarah.connor@htu.edu"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full justify-center rounded-xl border border-transparent bg-red-600 py-3 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="mr-2 h-5 w-5" aria-hidden="true" />
                    Sign In
                  </>
                )}
              </button>
            </div>
            
            <div className="mt-6 text-xs text-center text-slate-500 dark:text-slate-400">
              <p>Demo accounts:</p>
              <p className="mt-1 font-mono text-slate-600 dark:text-slate-300">Lecturer: sarah.connor@htu.edu</p>
              <p className="font-mono text-slate-600 dark:text-slate-300">Student: john.doe@student.htu.edu</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
