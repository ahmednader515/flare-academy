"use client";

import React, { useState, useEffect, useRef } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { Button } from "@/components/ui/button";
import { Shield, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/contexts/language-context";

interface RecaptchaGateProps {
  children: React.ReactNode;
}

const VERIFICATION_STORAGE_KEY = "recaptcha_gate_verified";
const VERIFICATION_EXPIRY_HOURS = 24; // Verification expires after 24 hours

export function RecaptchaGate({ children }: RecaptchaGateProps) {
  const { t } = useLanguage();
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  useEffect(() => {
    // Check if user is already verified (within expiry time)
    const checkVerification = () => {
      try {
        const stored = localStorage.getItem(VERIFICATION_STORAGE_KEY);
        if (stored) {
          const { timestamp } = JSON.parse(stored);
          const now = Date.now();
          const expiryTime = VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000; // Convert hours to milliseconds
          
          if (now - timestamp < expiryTime) {
            setIsVerified(true);
            setIsLoading(false);
            return;
          } else {
            // Expired, remove from storage
            localStorage.removeItem(VERIFICATION_STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error("Error checking verification:", error);
        localStorage.removeItem(VERIFICATION_STORAGE_KEY);
      }
      setIsLoading(false);
    };

    checkVerification();
  }, []);

  const handleRecaptchaChange = async (token: string | null) => {
    if (!token) {
      return;
    }

    setIsVerifying(true);

    try {
      // Verify token with server
      const response = await fetch("/api/auth/verify-recaptcha-gate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error("Verification failed");
      }

      const data = await response.json();
      
      if (data.success) {
        // Store verification with timestamp
        localStorage.setItem(
          VERIFICATION_STORAGE_KEY,
          JSON.stringify({
            timestamp: Date.now(),
          })
        );
        setIsVerified(true);
      } else {
        throw new Error("Verification failed");
      }
    } catch (error) {
      console.error("reCaptcha verification error:", error);
      // Reset reCaptcha on error
      recaptchaRef.current?.reset();
      alert("فشل التحقق من reCaptcha. يرجى المحاولة مرة أخرى");
    } finally {
      setIsVerifying(false);
    }
  };

  // Show loading state while checking verification
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-[9999]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#FF6B35]" />
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // Show reCaptcha gate if not verified
  if (!isVerified) {
    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-[9999]">
        <div className="bg-card border rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[#FF6B35]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-[#FF6B35]" />
            </div>
            <h2 className="text-2xl font-bold mb-2">التحقق من الأمان</h2>
            <p className="text-muted-foreground text-sm">
              يرجى إكمال التحقق من reCaptcha للوصول إلى الموقع
            </p>
          </div>

          <div className="flex justify-center mb-6">
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
              onChange={handleRecaptchaChange}
              theme="light"
            />
          </div>

          {isVerifying && (
            <div className="text-center">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-[#FF6B35]" />
              <p className="text-sm text-muted-foreground mt-2">جاري التحقق...</p>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              هذا التحقق يساعدنا في حماية الموقع من الروبوتات والوصول غير المصرح به
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render children if verified
  return <>{children}</>;
}

