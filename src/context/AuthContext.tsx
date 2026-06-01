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
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { User } from '@/lib/mock/db';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  login: (identifier: string, password: string) => Promise<void>;
  registerStudent: (indexNumber: string, fullName: string, password: string, ipAddress: string) => Promise<void>;
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
      // If no @ is present, assume it's a student index number
      const email = identifier.includes('@') ? identifier : `${identifier}@student.htu.edu`;
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

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, login, registerStudent, logout, isLoading }}>
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
