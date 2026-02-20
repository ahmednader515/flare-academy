"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/contexts/language-context";
import toast from "react-hot-toast";
import axios from "axios";

/**
 * SessionMonitor component
 * Monitors API calls for 401 errors and automatically logs out users
 * when their session is invalidated (isActive = false)
 */
export function SessionMonitor() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useLanguage();
  const isLoggingOutRef = useRef(false);
  const toastShownRef = useRef(false);

  // Function to handle logout and redirect to homepage
  const handleLogout = useCallback(() => {
    if (isLoggingOutRef.current) return; // Prevent multiple logout calls
    
    isLoggingOutRef.current = true;
    console.log("🔄 Session invalidated - Redirecting to homepage...");
    
    // Show toast notification only once
    if (!toastShownRef.current) {
      toastShownRef.current = true;
      toast.error(t('auth.sessionExpired') || "Your session has expired. Please sign in again.");
    }
    
    // Sign out from NextAuth first
    signOut({ 
      redirect: false
    }).then(() => {
      // Force a full page reload to ensure complete logout
      // This ensures the old device fully refreshes when logged out from another device
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    });
  }, [t]);

  useEffect(() => {
    // Only run on client side and when user is authenticated
    if (typeof window === "undefined" || status !== "authenticated" || !session) {
      return;
    }

    // Set up axios interceptor
    const axiosInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        // Check for 401 Unauthorized
        if (error.response?.status === 401) {
          const url = error.config?.url || "";
          
          // Only handle API routes, not auth session checks
          if (url.includes("/api/") && !url.includes("/api/auth/session")) {
            handleLogout();
          }
        }
        
        return Promise.reject(error);
      }
    );

    // Intercept fetch requests
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      try {
        const response = await originalFetch.apply(this, args);
        
        // Check for 401 Unauthorized
        if (response.status === 401) {
          // Check if this is an API route (not a page navigation)
          const url = args[0];
          const urlString = typeof url === "string" ? url : url.toString();
          
          // Only handle API routes, not page navigations or auth session
          if (urlString.includes("/api/") && !urlString.includes("/api/auth/session")) {
            handleLogout();
          }
        }
        
        return response;
      } catch (error) {
        // If fetch fails with network error, let it propagate normally
        throw error;
      }
    };

    // Intercept XMLHttpRequest (for other libraries)
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method: string, url: string | URL, async?: boolean, username?: string | null, password?: string | null) {
      (this as any)._url = url.toString();
      return originalXHROpen.call(this, method, url, async ?? true, username ?? null, password ?? null);
    };

    XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
      const xhr = this;
      const url = (xhr as any)._url || "";

      xhr.addEventListener("load", function () {
        if (xhr.status === 401 && url.includes("/api/") && !url.includes("/api/auth/session")) {
          handleLogout();
        }
      });

      return originalXHRSend.call(this, body ?? null);
    };

    // Cleanup function
    return () => {
      axios.interceptors.response.eject(axiosInterceptor);
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalXHROpen;
      XMLHttpRequest.prototype.send = originalXHRSend;
      isLoggingOutRef.current = false;
      toastShownRef.current = false;
    };
  }, [session, status, handleLogout]);

  // Monitor session status changes and invalid sessions
  useEffect(() => {
    // Check if session is invalid (empty user ID or expired)
    if (status === "authenticated" && session) {
      const isExpired = session.expires && new Date(session.expires) < new Date();
      const hasInvalidUser = !session.user?.id || session.user.id === "";
      
      if (isExpired || hasInvalidUser) {
        console.log("🔄 Session expired or invalid - Redirecting to homepage...");
        handleLogout();
        return;
      }
    }
    
    if (status === "unauthenticated" && session === null) {
      // Session was invalidated, redirect to homepage
      const currentPath = window.location.pathname;
      if (currentPath.startsWith("/dashboard")) {
        console.log("🔄 Session invalidated - Redirecting to homepage...");
        router.push("/");
      }
    }
  }, [status, session, router, handleLogout]);

  // Periodic session validation check (every 5 seconds)
  // This catches expired sessions even if no API calls are made
  useEffect(() => {
    if (typeof window === "undefined" || status !== "authenticated" || !session) {
      return;
    }

    const checkSession = async () => {
      try {
        // Check session validity by calling the session endpoint
        const response = await fetch("/api/auth/session", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          // Session check failed
          handleLogout();
          return;
        }

        const sessionData = await response.json();
        
        // Check if session is invalid
        if (!sessionData?.user?.id || sessionData.user.id === "") {
          console.log("🔄 Periodic check: Session invalid - Redirecting to homepage...");
          handleLogout();
          return;
        }

        // Check if session is expired
        if (sessionData.expires && new Date(sessionData.expires) < new Date()) {
          console.log("🔄 Periodic check: Session expired - Redirecting to homepage...");
          handleLogout();
          return;
        }
      } catch (error) {
        // If session check fails, assume session is invalid
        console.error("Session check error:", error);
        handleLogout();
      }
    };

    // Check immediately
    checkSession();

    // Then check every 5 seconds
    const interval = setInterval(checkSession, 5000);

    return () => clearInterval(interval);
  }, [status, session, handleLogout]);

  return null; // This component doesn't render anything
}

