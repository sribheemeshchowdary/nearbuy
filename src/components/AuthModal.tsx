import { useState, forwardRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";
import {
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useGoogleOneTap } from "@/hooks/useGoogleOneTap";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

const googleProvider = new GoogleAuthProvider();

const SocialIcon = forwardRef<HTMLSpanElement, { name: string; loading: boolean }>(
  ({ name, loading }, ref) => {
    if (loading) return <span ref={ref}><Loader2 className="w-5 h-5 animate-spin shrink-0" /></span>;
    const icon = (() => {
      switch (name) {
        case "google":
          return (
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          );
        default: return null;
      }
    })();
    return <span ref={ref}>{icon}</span>;
  }
);
SocialIcon.displayName = "SocialIcon";

const AuthModal = ({ open, onClose }: AuthModalProps) => {
  const { user, role, loading: authLoading, devLogin } = useAuth();
  const navigate = useNavigate();
  const DEV_BYPASS_ENABLED = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_BYPASS === "true";
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [pendingRedirect, setPendingRedirect] = useState(false);

  // Redirect based on role after successful login
  useEffect(() => {
    if (pendingRedirect && user && !authLoading) {
      setPendingRedirect(false);
      onClose();
      if (role === "superadmin" || role === "admin") {
        navigate("/admin");
      } else if (role === "business_owner") {
        navigate("/dashboard");
      } else {
        navigate("/add-listing");
      }
    }
  }, [pendingRedirect, user, authLoading, role, navigate, onClose]);

  // Google One Tap — auto sign-in prompt when modal is open
  useGoogleOneTap({
    disabled: !open || !!user,
    onSuccess: () => setPendingRedirect(true),
  });

  const handleSocialSignIn = async (providerName: string) => {
    setSocialLoading(providerName);
    try {
      const provider = googleProvider;
      await signInWithPopup(auth, provider);
      toast.success(`Signed in with ${providerName.charAt(0).toUpperCase() + providerName.slice(1)}`);
      setPendingRedirect(true);
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        toast.error(err.message || `${providerName} sign-in failed`);
      }
    }
    setSocialLoading(null);
  };


  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md gap-4" aria-describedby="auth-modal-desc">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-semibold">
            Welcome to Nearbuy
          </DialogTitle>
          <p id="auth-modal-desc" className="text-xs sm:text-sm text-muted-foreground">
            Continue with Google to sign in or create your account
          </p>
        </DialogHeader>

        {/* Google Sign-In */}
        <Button
          variant="outline"
          className="h-11 rounded-xl w-full"
          onClick={() => handleSocialSignIn("google")}
          disabled={!!socialLoading}
          title="Continue with Google"
        >
          <SocialIcon name="google" loading={socialLoading === "google"} />
          <span className="ml-2">Continue with Google</span>
        </Button>

        <p className="text-center text-[11px] text-muted-foreground">
          We only use Google to sign you in. No passwords to remember.
        </p>

        {DEV_BYPASS_ENABLED && (
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
                  onClick={() => { devLogin(role); onClose(); }}
                  className={`${color} text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
