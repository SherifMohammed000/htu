"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { User, Role } from '@/lib/mock/db';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  login: (identifier: string, password: string) => Promise<void>;
  registerStudent: (indexNumber: string, fullName: string, password: string, ipAddress: string) => Promise<void>;
  registerLecturer: (courseCode: string, fullName: string, password: string, ipAddress: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        // Fetch the user profile from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            let finalUser = { id: fbUser.uid, ...userData } as User;

            if (finalUser.role === 'student' && !finalUser.stream && finalUser.indexNumber) {
              try {
                const cleanIndex = finalUser.indexNumber.replace(/\s+/g, "");
                const studentDoc = await getDoc(doc(db, 'students', cleanIndex));
                if (studentDoc.exists()) {
                  const resolvedStream = studentDoc.data().stream || "";
                  if (resolvedStream) {
                    await updateDoc(doc(db, 'users', fbUser.uid), { stream: resolvedStream });
                    finalUser.stream = resolvedStream;
                  }
                }
              } catch (e) {
                console.error("Error resolving missing stream on load:", e);
              }
            }

            // Acknowledge reps' index numbers and promote/demote accordingly
            const reps = ["0324080539", "0324080114"];
            const cleanIndex = (finalUser.indexNumber || "").replace(/\s+/g, "");
            if (cleanIndex) {
              if (reps.includes(cleanIndex)) {
                if (finalUser.role !== "course_rep") {
                  try {
                    await updateDoc(doc(db, 'users', fbUser.uid), { role: "course_rep" });
                    finalUser.role = "course_rep";
                  } catch (e) {
                    console.error("Failed to promote to course_rep on load:", e);
                  }
                }
              } else {
                if (finalUser.role === "course_rep") {
                  try {
                    await updateDoc(doc(db, 'users', fbUser.uid), { role: "student" });
                    finalUser.role = "student";
                  } catch (e) {
                    console.error("Failed to demote to student on load:", e);
                  }
                }
              }
            }

            setUser(finalUser);
          } else {
            // Fallback: build a basic user from Firebase Auth data
            const email = fbUser.email || '';
            const isStudent = email.endsWith('@student.htu.edu');
            const isLecturer = email.endsWith('@lecturer.htu.edu');
            const indexOrCode = email.split('@')[0] || '';
            
            let resolvedName = fbUser.displayName || indexOrCode || 'Unknown';
            let role: Role = 'student';
            let stream = "";
            let indexNumber = "";
            let courseCode = "";

            if (isLecturer) {
              role = 'lecturer';
              courseCode = indexOrCode.toUpperCase();
            } else if (isStudent) {
              indexNumber = indexOrCode;
              const reps = ["0324080539", "0324080114"];
              role = reps.includes(indexNumber.replace(/\s+/g, "")) ? "course_rep" : "student";
            }

            // Build the fallback user
            const fallbackUser: User = {
              id: fbUser.uid,
              fullName: resolvedName,
              email,
              department: '',
              role,
            };
            if (indexNumber) fallbackUser.indexNumber = indexNumber;
            if (courseCode) fallbackUser.courseCode = courseCode;

            setUser(fallbackUser);

            // Self-heal: auto-create the missing Firestore profile on the fly
            if (isStudent && indexNumber) {
              (async () => {
                try {
                  const cleanIndex = indexNumber.replace(/\s+/g, "");
                  const studentDoc = await getDoc(doc(db, 'students', cleanIndex));
                  if (studentDoc.exists()) {
                    const studentData = studentDoc.data();
                    resolvedName = studentData.name || resolvedName;
                    stream = studentData.stream || "";
                  }
                  
                  await setDoc(doc(db, 'users', fbUser.uid), {
                    id: fbUser.uid,
                    indexNumber,
                    fullName: resolvedName,
                    email,
                    role,
                    stream,
                    createdAt: new Date().toISOString()
                  });
                  
                  setUser({ ...fallbackUser, fullName: resolvedName, stream });
                } catch (e) {
                  console.error("Failed to auto-create missing student profile:", e);
                }
              })();
            } else if (isLecturer && courseCode) {
              (async () => {
                try {
                  await setDoc(doc(db, 'users', fbUser.uid), {
                    id: fbUser.uid,
                    courseCode,
                    fullName: resolvedName,
                    email,
                    role: 'lecturer',
                    createdAt: new Date().toISOString()
                  });
                } catch (e) {
                  console.error("Failed to auto-create missing lecturer profile:", e);
                }
              })();
            }
          }
        } catch (e) {
          console.error('Error fetching user profile:', e);
          setUser(null);
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (identifier: string, password: string) => {
    setIsLoading(true);
    try {
      // Check if the identifier is a course code (like CS301, MATH201, ENG101) after stripping all spaces
      const cleanIdentifier = identifier.replace(/\s+/g, "");
      const isCourseCode = /^[A-Z]{2,5}\d{3,4}$/i.test(cleanIdentifier);
      const email = identifier.includes('@')
        ? identifier
        : isCourseCode
          ? `${cleanIdentifier.toUpperCase()}@lecturer.htu.edu`
          : `${identifier.trim()}@student.htu.edu`;
      
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  };

  const registerStudent = async (indexNumber: string, fullName: string, password: string, ipAddress: string) => {
    setIsLoading(true);
    try {
      const cleanIndex = indexNumber.replace(/\s+/g, "");
      const email = `${cleanIndex}@student.htu.edu`;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      const reps = ["0324080539", "0324080114"];
      const role = reps.includes(cleanIndex) ? "course_rep" : "student";

      // Fetch stream from students collection
      let stream = "";
      try {
        const studentDoc = await getDoc(doc(db, "students", cleanIndex));
        if (studentDoc.exists()) {
          stream = studentDoc.data().stream || "";
        }
      } catch (e) {
        console.error("Failed to fetch stream during registration:", e);
      }

      // Create user profile in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        id: userCredential.user.uid,
        indexNumber: cleanIndex,
        fullName,
        email,
        role: role,
        ipAddress,
        stream,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  };

  const registerLecturer = async (courseCode: string, fullName: string, password: string, ipAddress: string) => {
    setIsLoading(true);
    try {
      const formattedCode = courseCode.replace(/\s+/g, "").toUpperCase();
      const email = `${formattedCode}@lecturer.htu.edu`;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create lecturer profile in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        id: userCredential.user.uid,
        courseCode: formattedCode,
        fullName,
        email,
        role: 'lecturer',
        ipAddress,
        createdAt: new Date().toISOString()
      });

      // Update any course with this courseCode to use the new lecturer UID
      const q = query(collection(db, 'courses'), where('courseCode', '==', formattedCode));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await updateDoc(d.ref, { lecturerId: userCredential.user.uid });
      }
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, login, registerStudent, registerLecturer, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
