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
import { User } from '@/lib/mock/db';

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
            setUser({ id: fbUser.uid, ...userDoc.data() } as User);
          } else {
            // Fallback: build a basic user from Firebase Auth data
            setUser({
              id: fbUser.uid,
              fullName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Unknown',
              email: fbUser.email || '',
              department: '',
              role: 'student',
            });
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
      // Check if the identifier is a course code (like CS301, MATH201, ENG101)
      const isCourseCode = /^[A-Z]{2,5}\d{3,4}$/i.test(identifier.trim());
      const email = identifier.includes('@')
        ? identifier
        : isCourseCode
          ? `${identifier.trim().toUpperCase()}@lecturer.htu.edu`
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
      const email = `${indexNumber}@student.htu.edu`;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user profile in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        id: userCredential.user.uid,
        indexNumber,
        fullName,
        email,
        role: 'student',
        ipAddress,
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
      const formattedCode = courseCode.trim().toUpperCase();
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
