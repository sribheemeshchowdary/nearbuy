import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type UserRole = "superadmin" | "admin" | "business_owner" | "user";

const DEV_AUTH_KEY = "dev_auth_role";
const DEV_BYPASS_ENABLED = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_BYPASS === "true";

// Emails that always resolve to super admin (case-insensitive), independent of
// the `superadmins` Firestore collection. Keep in sync with firestore.rules.
const SUPER_ADMIN_EMAILS = new Set([
  "ravikanth.revuru@gmail.com",
  "harshu.18@gmail.com",
  "findlocalsg@gmail.com",
]);

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: UserRole;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isBusinessOwner: boolean;
  // Dev bypass
  devLogin: (role: UserRole) => void;
  devLogout: () => void;
  isDevMode: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: "user",
  isAdmin: false,
  isSuperAdmin: false,
  isBusinessOwner: false,
  devLogin: () => {},
  devLogout: () => {},
  isDevMode: false,
});

export const useAuth = () => useContext(AuthContext);

// Fake user object for dev bypass
const createFakeUser = (role: UserRole): Partial<User> => ({
  uid: `dev-${role}`,
  email: `${role}@dev.local`,
  displayName: role === "superadmin" ? "Super Admin" : role === "admin" ? "Admin" : role === "business_owner" ? "Business Owner" : "Test User",
  emailVerified: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>("user");
  const [isDevMode, setIsDevMode] = useState(false);

  const devLogin = (devRole: UserRole) => {
    if (!DEV_BYPASS_ENABLED) return;
    localStorage.setItem(DEV_AUTH_KEY, devRole);
    setRole(devRole);
    setUser(createFakeUser(devRole) as User);
    setIsDevMode(true);
    setLoading(false);
  };

  const devLogout = () => {
    localStorage.removeItem(DEV_AUTH_KEY);
    setRole("user");
    setUser(null);
    setIsDevMode(false);
  };

  // Restore dev session on mount, but always allow real Firebase auth to take over
  useEffect(() => {
    if (!DEV_BYPASS_ENABLED) {
      try {
        localStorage.removeItem(DEV_AUTH_KEY);
      } catch {}
    }

    const getSavedDevRole = (): UserRole | null => {
      if (!DEV_BYPASS_ENABLED) return null;
      try {
        return localStorage.getItem(DEV_AUTH_KEY) as UserRole | null;
      } catch {
        return null;
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Block unverified email/password users (social logins are always verified)
        const isEmailProvider = firebaseUser.providerData.some(p => p.providerId === "password");
        if (isEmailProvider && !firebaseUser.emailVerified) {
          await auth.signOut();
          setRole("user");
          setUser(null);
          setIsDevMode(false);
          setLoading(false);
          return;
        }

        try {
          localStorage.removeItem(DEV_AUTH_KEY);
        } catch {}

        // Gate consumers (e.g. the post-login redirect in AuthModal) until the
        // role is resolved. Without this, a returning login redirects using the
        // stale default role ("user") before the Firestore role lookup finishes,
        // sending business owners to /add-listing instead of /dashboard.
        setLoading(true);
        setIsDevMode(false);
        setUser(firebaseUser);

        // Email allowlist takes precedence over Firestore role docs.
        const email = (firebaseUser.email || "").trim().toLowerCase();
        if (email && SUPER_ADMIN_EMAILS.has(email)) {
          setRole("superadmin");
          setLoading(false);
          return;
        }

        try {
          // Resolve the role from a single parallel batch of reads instead of
          // chaining them (the old sequential version made the post-login
          // redirect feel slow). Use allSettled so a single failing read — e.g.
          // a transient permission/network error on the admin docs — cannot
          // collapse a real business owner down to "user" and misroute them to
          // /add-listing instead of /dashboard.
          const { getDocs, query, where, collection } = await import("firebase/firestore");
          const [superRes, userRes, adminRes, listingsRes] = await Promise.allSettled([
            getDoc(doc(db, "superadmins", firebaseUser.uid)),
            getDoc(doc(db, "users", firebaseUser.uid)),
            getDoc(doc(db, "admins", firebaseUser.uid)),
            getDocs(query(collection(db, "listings"), where("ownerId", "==", firebaseUser.uid))),
          ]);
          const superDoc = superRes.status === "fulfilled" ? superRes.value : null;
          const userDoc = userRes.status === "fulfilled" ? userRes.value : null;
          const adminDoc = adminRes.status === "fulfilled" ? adminRes.value : null;
          const listingsSnap = listingsRes.status === "fulfilled" ? listingsRes.value : null;

          if (superDoc?.exists()) {
            setRole("superadmin");
          } else if (userDoc?.exists() && userDoc.data()?.disabled === true) {
            // Blocked account: a super admin disabled this user — sign them out.
            await auth.signOut();
            setRole("user");
            setUser(null);
            setIsDevMode(false);
            setLoading(false);
            try {
              const { toast } = await import("sonner");
              toast.error("Your account has been disabled. Please contact support.");
            } catch { /* ignore */ }
            return;
          } else if (adminDoc?.exists()) {
            setRole("admin");
          } else if (listingsSnap) {
            setRole(listingsSnap.empty ? "user" : "business_owner");
          }
          // If the listings read itself failed we leave the role unchanged
          // rather than demoting to "user" on a transient error.
        } catch {
          setRole("user");
        }

        setLoading(false);
        return;
      }

      const savedRole = getSavedDevRole();
      if (savedRole) {
        setRole(savedRole);
        setUser(createFakeUser(savedRole) as User);
        setIsDevMode(true);
      } else {
        setRole("user");
        setUser(null);
        setIsDevMode(false);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const isAdmin = role === "admin" || role === "superadmin";
  const isSuperAdmin = role === "superadmin";
  const isBusinessOwner = role === "business_owner" || isAdmin;

  return (
    <AuthContext.Provider value={{ user, loading, role, isAdmin, isSuperAdmin, isBusinessOwner, devLogin, devLogout, isDevMode }}>
      {children}
    </AuthContext.Provider>
  );
};
