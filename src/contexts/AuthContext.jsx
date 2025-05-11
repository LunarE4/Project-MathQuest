import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  browserSessionPersistence,
  setPersistence
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot,
  serverTimestamp,
  increment,
  arrayUnion
} from 'firebase/firestore';
import { auth, db } from './firebase/init';

const AuthContext = createContext();
const AUTH_TIMEOUT = 10000; // 10 seconds auth initialization timeout
const INACTIVITY_TIMEOUT = 3000 * 60 * 1000; // 30 minutes inactivity timeout

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [idleTimer, setIdleTimer] = useState(null);

  // Helper functions
  const getDefaultUserData = (user = null) => ({
    // Basic user info
    displayName: user?.displayName || '',
    email: user?.email || '',
    photoURL: user?.photoURL || null,
    
    // Progression system
    xp: 0,
    level: 1,
    streak: 0,
    overallProgress: 0,
    
    // Skills tracking
    skills: { 
      algebra: 0, 
      geometry: 0, 
      calculus: 0,
      // Add more subjects
    },
    
    // Lessons tracking
    completedLessons: {
      // Format: 
      // lessonId: {
      //   id: string,
      //   title: string,
      //   score: number (0-100),
      //   date: timestamp,
      //   timeTaken: number (seconds),
      //   attempts: number,
      //   finalScore: number,
      //   avgScore: number,
      //   problems: {
      //     problemId: {
      //       attempts: number,
      //       solved: boolean
      //     }
      //   }
      // }
    },
    
    // Achievements system
    achievements: {
      // Format:
      // achievementId: {
      //   id: string,
      //   name: string,
      //   description: string,
      //   icon: string,
      //   unlocked: boolean,
      //   dateUnlocked: timestamp | null,
      //   lessonId: string | null, // which lesson unlocked it
      //   xpReward: number
      // }
    },
    
    // Statistics - new additions
    stats: {
      totalLessonsCompleted: 0,
      totalProblemsSolved: 0,
      totalTimeSpent: 0, // in seconds
      averageScore: 0,
      highestStreak: 0
    },
    
    // Activity tracking
    lastActive: serverTimestamp(),
    createdAt: serverTimestamp(),
    
    // User preferences
    preferences: {
      theme: 'light',
      difficulty: 'medium',
      notifications: true,
      soundEnabled: true,
      vibrationEnabled: false
    },
    
    // Account status
    onboardingComplete: false,
    lastLessonCompleted: null,
    currentLesson: null
  });

  const sanitizeUserData = (data = {}, user = null) => ({
    ...getDefaultUserData(user),
    ...data,
    skills: {
      ...getDefaultUserData().skills,
      ...(data.skills || {})
    }
  });

  const calculateProgress = useCallback((data) => {
    if (!data?.skills) return 0;
    const skills = Object.values(data.skills);
    return Math.round(skills.reduce((a, b) => a + b, 0) / skills.length);
  }, []);

  // Timeout fallback function
  const authTimeoutFallback = useCallback(() => {
    setAuthLoading(false);
    setDataLoading(false);
    setAuthError('Authentication is taking longer than expected. Please check your connection.');
    console.warn('Auth state check timeout');
  }, []);

  // Reset idle timer on user activity
  const resetIdleTimer = useCallback(() => {
    if (idleTimer) clearTimeout(idleTimer);
    
    if (user) {
      const timer = setTimeout(async () => {
        console.log('User logged out due to inactivity');
        await updateUserData({ lastActive: serverTimestamp() });
        await logout();
      }, INACTIVITY_TIMEOUT);
      
      setIdleTimer(timer);
    }
  }, [user]);

  // Activity event listeners
  const setupActivityListeners = useCallback(() => {
    const events = ['mousedown', 'keypress', 'scroll', 'touchstart', 'mousemove'];
    events.forEach(event => {
      window.addEventListener(event, resetIdleTimer);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetIdleTimer);
      });
    };
  }, [resetIdleTimer]);

  // Auth functions
  const googleLogin = async () => {
    try {
      setAuthLoading(true);
      setAuthError(null);
      
      await setPersistence(auth, browserSessionPersistence);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const userRef = doc(db, 'users', result.user.uid);
      const docSnap = await getDoc(userRef);
      
      if (!docSnap.exists()) {
        // Initialize all user data fields
        const initialData = {
          ...getDefaultUserData(result.user),
          firstLogin: serverTimestamp()
        };
        
        await setDoc(userRef, initialData);
        
        // Create private profile subcollection
        await setDoc(doc(db, `users/${result.user.uid}/private/profile`), {
          emailVerified: result.user.emailVerified,
          providerData: result.user.providerData,
          createdAt: serverTimestamp()
        });
      } else {
        // Update existing user with any new fields
        const updates = {};
        const currentData = docSnap.data();
        
        // Add any missing fields from default data
        Object.entries(getDefaultUserData()).forEach(([key, value]) => {
          if (currentData[key] === undefined) {
            updates[key] = value;
          }
        });
        
        if (Object.keys(updates).length > 0) {
          await updateDoc(userRef, updates);
        }
      }
      
      resetIdleTimer();
      return result.user;
    } catch (error) {
      console.error("Login error:", error);
      setAuthError(error.message);
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (idleTimer) clearTimeout(idleTimer);
      if (user) {
        await updateUserData({ lastActive: serverTimestamp() });
      }
      await signOut(auth);
      setUser(null);
      setUserData(null);
    } catch (error) {
      console.error("Logout error:", error);
      setAuthError(error.message);
    }
  };

  // Database operations
  const updateUserData = async (updates) => {
    if (!user) return false;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        ...updates,
        lastUpdated: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error("User data update error:", error);
      return false;
    }
  };

  const completeLesson = async (results) => {
    if (!user) return false;

    try {
      const userRef = doc(db, 'users', user.uid);
      const { finalScore, xpEarned, lessonStats } = results;
      const { lessonId, topic } = lessonStats;

      const updates = {
        xp: increment(xpEarned),
        lastActive: serverTimestamp(),
        [`completedLessons.${lessonId}`]: {
          ...lessonStats,
          completedAt: serverTimestamp()
        },
        [`lessonAttempts.${lessonId}.count`]: increment(1),
        [`lessonAttempts.${lessonId}.lastAttempt`]: serverTimestamp(),
        [`lessonScores.${lessonId}`]: finalScore,
      };

      // Update skills based on topic
      if (topic) {
        updates[`skills.${topic}`] = increment(1);
      }

      // Handle achievements
      if (lessonStats.achievements?.length > 0) {
        lessonStats.achievements.forEach(ach => {
          const achievementKey = ach.replace(/\s+/g, '');
          updates[`achievements.${achievementKey}`] = {
            unlocked: true,
            date: serverTimestamp(),
            xpEarned: ach === 'Perfect Score' ? 50 : 
                     ach === 'First Try Master' ? 30 : 20
          };
        });
      }

      // Calculate new level
      const userDoc = await getDoc(userRef);
      const currentXP = userDoc.data()?.xp || 0;
      const newLevel = Math.floor((currentXP + xpEarned) / 100) + 1;
      
      if (newLevel > (userDoc.data()?.level || 1)) {
        updates.level = newLevel;
      }

      // Update streak if completed same day
      const lastActive = userDoc.data()?.lastActive?.toDate();
      const today = new Date();
      if (lastActive && 
          lastActive.getDate() === today.getDate() &&
          lastActive.getMonth() === today.getMonth() &&
          lastActive.getFullYear() === today.getFullYear()) {
        updates.streak = increment(1);
      } else {
        updates.streak = 1;
      }

      await updateDoc(userRef, updates);
      return true;
    } catch (error) {
      console.error("Lesson completion error:", error);
      return false;
    }
  };

  const getUserAchievements = async () => {
    if (!user) return [];
    
    try {
      const userRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userRef);
      
      if (docSnap.exists()) {
        const achievements = docSnap.data().achievements || {};
        return Object.entries(achievements)
          .filter(([_, value]) => value.unlocked)
          .map(([key, value]) => ({
            id: key,
            name: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
            ...value
          }));
      }
      return [];
    } catch (error) {
      console.error("Achievements fetch error:", error);
      return [];
    }
  };

  const updateProfile = async (updates) => {
    if (!user) return false;
    
    try {
      const allowedUpdates = {
        displayName: updates.displayName,
        photoURL: updates.photoURL,
        preferences: updates.preferences
      };
      
      return await updateUserData(allowedUpdates);
    } catch (error) {
      console.error("Profile update error:", error);
      return false;
    }
  };

  // Main auth effect
  useEffect(() => {
    let unsubscribeAuth;
    let unsubscribeFirestore;
    let authTimeout;

    const initializeAuth = () => {
      authTimeout = setTimeout(authTimeoutFallback, AUTH_TIMEOUT);

      unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
        clearTimeout(authTimeout);
        setAuthLoading(true);
        setAuthError(null);

        try {
          if (currentUser) {
            setUser(currentUser);
            const userRef = doc(db, 'users', currentUser.uid);
            
            unsubscribeFirestore = onSnapshot(userRef, (doc) => {
              if (doc.exists()) {
                const data = doc.data();
                setUserData({
                  ...sanitizeUserData(data, currentUser),
                  overallProgress: calculateProgress(data)
                });
              } else {
                setUserData(sanitizeUserData({}, currentUser));
              }
              setAuthLoading(false);
              setDataLoading(false);
            });

            resetIdleTimer();
          } else {
            setUser(null);
            setUserData(null);
            setAuthLoading(false);
            setDataLoading(false);
          }
        } catch (error) {
          console.error("Auth processing error:", error);
          setAuthError(error.message);
          setAuthLoading(false);
          setDataLoading(false);
        }
      });
    };

    initializeAuth();

    return () => {
      clearTimeout(authTimeout);
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, [authTimeoutFallback, calculateProgress, resetIdleTimer]);

  // Setup activity listeners after auth is ready
  useEffect(() => {
    if (!authLoading && user) {
      const cleanup = setupActivityListeners();
      return cleanup;
    }
  }, [authLoading, user, setupActivityListeners]);

  const value = {
    user,
    userData,
    loading: authLoading || dataLoading,
    authError,
    googleLogin,
    logout,
    completeLesson,
    updateUserData,
    getUserAchievements,
    updateProfile,
    resetIdleTimer,
    clearError: () => setAuthError(null)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);