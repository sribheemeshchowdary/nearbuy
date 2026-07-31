import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { auth, db } from "@/lib/firebase";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  signInWithPopup,
  GoogleAuthProvider,
  getAdditionalUserInfo,
} from "firebase/auth";
import { Loader2, Store, Shield, Zap, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import signupIllustration from "@/assets/signup-illustration.png";
import { useGoogleOneTap } from "@/hooks/useGoogleOneTap";

// Google-only authentication (email/password removed)
const googleProvider = new GoogleAuthProvider();

const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const SignUp = () => {
  const { user, role, loading: authLoading, devLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isLoginRoute = location.pathname === "/login";

  const [mode, setMode] = useState<"login" | "signup">(isLoginRoute ? "login" : "signup");
  const [socialLoading, setSocialLoading] = useState(false);
  // "Account already exists" popup for returning users signing up
  const [existingOpen, setExistingOpen] = useState(false);
  const [existingEmail, setExistingEmail] = useState("");

  const DEV_BYPASS_ENABLED = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_BYPASS === "true";

  // Sync mode with route if changed externally
  useEffect(() => {
    setMode(location.pathname === "/login" ? "login" : "signup");
  }, [location.pathname]);

  // Set page document title dynamically
  useEffect(() => {
    document.title = mode === "login" ? "Sign In — Nearbuy" : "Sign Up — Nearbuy";
  }, [mode]);

  // Redirect authenticated users based on role. Held back while the
  // "account already exists" popup is open — closing it triggers the redirect.
  useEffect(() => {
    if (user && !authLoading && !existingOpen) {
      if (role === "superadmin" || role === "admin") {
        navigate("/admin");
      } else if (role === "business_owner") {
        navigate("/dashboard");
      } else {
        navigate("/add-listing");
      }
    }
  }, [user, role, authLoading, navigate, existingOpen]);

  // Google One Tap — auto sign-in prompt. Routing is handled by the
  // role-based redirect effect above once the role resolves.
  useGoogleOneTap({
    disabled: !!user,
  });

  const handleGoogleSignUp = async () => {
    // Guard against re-entry: while a sign-in is already in flight the button
    // stays disabled, but this also blocks any programmatic double-invoke.
    if (socialLoading) return;
    setSocialLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const isNewUser = getAdditionalUserInfo(result)?.isNewUser ?? false;

      if (isNewUser) {
        // Brand-new account — create the user profile document.
        await setDoc(doc(db, "users", result.user.uid), {
          email: result.user.email || "",
          displayName: result.user.displayName || "",
          createdAt: serverTimestamp(),
        }, { merge: true });
        toast.success("Account created!");
      } else if (mode === "login") {
        // Returning user on the sign-in route — this is the expected path.
        // Let the role-based redirect effect take them straight to their
        // dashboard; no extra confirmation step.
      } else {
        // On the sign-UP route the account already exists — surface a popup so
        // the user understands they weren't charged a duplicate, then continue.
        // Setting existingOpen holds back the auto-redirect until they confirm.
        setExistingEmail(result.user.email || "");
        setExistingOpen(true);
      }
      // On success we intentionally keep the button disabled: the redirect
      // effect unmounts this page as soon as the role resolves, so re-enabling
      // here would let a second tap fire another popup during that window.
    } catch (err) {
      const firebaseError = err as { code?: string; message?: string };
      if (firebaseError.code !== "auth/popup-closed-by-user") {
        toast.error(firebaseError.message || "Google sign-in failed");
      }
      // Only re-enable on failure so the user can retry.
      setSocialLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel — Illustration (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary/[0.03] items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(hsl(var(--primary)) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="relative z-10 max-w-lg text-center space-y-8">
          <img
            src={signupIllustration}
            alt="Business registration illustration"
            width={400}
            height={300}
            className="mx-auto drop-shadow-sm"
          />
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground tracking-tight">
              Grow your business locally
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
              Join hundreds of Singapore businesses already reaching more customers through Nearbuy.
            </p>
          </div>
          <div className="flex items-center justify-center gap-8 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> UEN Verified</span>
            <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Free Forever</span>
            <span className="flex items-center gap-1.5"><Store className="w-3.5 h-3.5" /> Local Focus</span>
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-[400px] space-y-6 animate-fade-in">
          {/* Mobile illustration */}
          <div className="lg:hidden flex justify-center">
            <img
              src={signupIllustration}
              alt="Business registration"
              width={200}
              height={150}
              className="drop-shadow-sm"
            />
          </div>

          {/* Header */}
          <div className="text-center lg:text-left space-y-1">
            <h1 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === "login" ? "Sign in to manage your listings" : "List your business for free in seconds"}
            </p>
          </div>

          {/* Google Sign-In — the only auth method */}
          <Button
            className="w-full h-12 rounded-xl text-sm font-semibold"
            onClick={handleGoogleSignUp}
            disabled={socialLoading}
          >
            {socialLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <GoogleIcon />}
            <span className="ml-2">Continue with Google</span>
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            {mode === "login"
              ? "Sign in securely with your Google account."
              : "Create your account instantly with Google — no passwords needed."}
          </p>

          {DEV_BYPASS_ENABLED && mode === "login" && (
            <div className="border-t border-dashed border-muted pt-3 mt-2">
              <p className="text-[10px] text-muted-foreground text-center mb-2 font-mono uppercase tracking-wider">Dev Quick Login</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { role: "superadmin" as UserRole, label: "Super Admin", color: "bg-red-500 hover:bg-red-600" },
                  { role: "admin" as UserRole, label: "Admin", color: "bg-orange-500 hover:bg-orange-600" },
                  { role: "business_owner" as UserRole, label: "Business Owner", color: "bg-blue-500 hover:bg-blue-600" },
                  { role: "user" as UserRole, label: "Regular User", color: "bg-green-500 hover:bg-green-600" },
                ]).map(({ role, label, color }) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => devLogin(role)}
                    className={`${color} text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trust badges (mobile) */}
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-2">
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Secure</span>
            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Free</span>
            <span className="flex items-center gap-1">🇸🇬 Singapore</span>
          </div>
        </div>
      </div>

      {/* Existing-account popup for returning users */}
      <Dialog open={existingOpen} onOpenChange={setExistingOpen}>
        <DialogContent className="sm:max-w-sm text-center" aria-describedby="existing-account-desc">
          <DialogHeader className="items-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-lg font-semibold">Account already exists</DialogTitle>
          </DialogHeader>
          <p id="existing-account-desc" className="text-sm text-muted-foreground">
            A user account already exists with{" "}
            <span className="font-medium text-foreground break-all">{existingEmail || "this email"}</span>.
            You're signed in — continue to your dashboard.
          </p>
          <Button className="w-full h-11 rounded-xl mt-1" onClick={() => setExistingOpen(false)}>
            Continue to Dashboard
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SignUp;
