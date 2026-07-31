import { useEffect, useCallback } from "react";
import { auth } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { toast } from "sonner";

// Google OAuth Client ID — must match the one configured in Firebase Console → Auth → Google provider
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (callback?: (notification: any) => void) => void;
          cancel: () => void;
          renderButton: (element: HTMLElement, config: any) => void;
        };
      };
    };
  }
}

let gsiScriptLoaded = false;

function loadGsiScript(): Promise<void> {
  if (gsiScriptLoaded || window.google?.accounts) {
    gsiScriptLoaded = true;
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => { gsiScriptLoaded = true; resolve(); };
    script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(script);
  });
}

interface UseGoogleOneTapOptions {
  disabled?: boolean;
  onSuccess?: () => void;
}

export function useGoogleOneTap({ disabled = false, onSuccess }: UseGoogleOneTapOptions = {}) {
  const handleCredentialResponse = useCallback(async (response: any) => {
    try {
      const credential = GoogleAuthProvider.credential(response.credential);
      await signInWithCredential(auth, credential);
      toast.success("Signed in with Google");
      onSuccess?.();
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/account-exists-with-different-credential") {
        toast.error("An account with this email already exists. Please sign in with your original method.");
      } else {
        toast.error(err.message || "Google sign-in failed");
      }
    }
  }, [onSuccess]);

  useEffect(() => {
    if (disabled || !GOOGLE_CLIENT_ID) return;

    // Don't show One Tap if user is already signed in
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) return;

      loadGsiScript().then(() => {
        window.google?.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: true,
          cancel_on_tap_outside: true,
          itp_support: true,
        });
        window.google?.accounts.id.prompt();
      }).catch(() => {
        // Silently fail — popup login still works
      });
    });

    return () => {
      unsubscribe();
      try { window.google?.accounts.id.cancel(); } catch {}
    };
  }, [disabled, handleCredentialResponse]);
}
