import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User as FirebaseUser, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  UserCredential,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { auth, database } from '../firebase';
import { ref, get } from 'firebase/database';

// User details tipini tanımla
export interface UserDetails {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  companyId: string;
  companyName: string;
  role: string;
  createdAt: number;
  branchesId?: string;
}

// Firebase User tipini genişlet
interface User extends FirebaseUser {
  companyId?: string;
}

interface AuthContextType {
  currentUser: User | null;
  userDetails: UserDetails | null;
  login: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  return useContext(AuthContext) as AuthContextType;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);

  async function login(email: string, password: string): Promise<UserCredential> {
    // Kalıcılık ayarını LOGIN işlemi sırasında belirle
    await setPersistence(auth, browserLocalPersistence);
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return firebaseSignOut(auth);
  }

  // Kullanıcı detaylarını getir
  async function fetchUserDetails(user: User) {
    try {
      const userRef = ref(database, `users/${user.uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val() as UserDetails;
        setUserDetails(userData);
        // Kullanıcı verilerini localStorage'a da kaydet
        localStorage.setItem('userDetails', JSON.stringify(userData));
      } else {
        console.error("Kullanıcı detayları bulunamadı");
        setUserDetails(null);
        localStorage.removeItem('userDetails');
      }
    } catch (error) {
      console.error("Kullanıcı detayları yüklenirken hata:", error);
      setUserDetails(null);
      localStorage.removeItem('userDetails');
    }
  }

  useEffect(() => {
    // Başlangıçta kalıcılık ayarını yapılandır
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        console.log("Oturum kalıcılığı ayarlandı: LOCAL");
      })
      .catch((error) => {
        console.error("Oturum kalıcılığı ayarlanırken hata:", error);
      });

    // Kaydedilmiş kullanıcı detaylarını kontrol et
    const savedUserDetails = localStorage.getItem('userDetails');
    if (savedUserDetails) {
      try {
        setUserDetails(JSON.parse(savedUserDetails));
      } catch (e) {
        console.error("Kaydedilmiş kullanıcı verilerini ayrıştırma hatası:", e);
        localStorage.removeItem('userDetails');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      
      if (user) {
        fetchUserDetails(user as User);
      } else {
        setUserDetails(null);
        localStorage.removeItem('userDetails');
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userDetails,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 