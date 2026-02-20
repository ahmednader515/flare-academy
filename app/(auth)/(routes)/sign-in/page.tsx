"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, ChevronLeft } from "lucide-react";
import Image from "next/image";
import { getDashboardUrlByRole } from "@/lib/utils";
import { useLanguage } from "@/lib/contexts/language-context";

export default function SignInPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    phoneNumber: "",
    password: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Don't proceed if already loading
    if (isLoading) {
      console.log("[SIGN_IN] Already loading, ignoring submit");
      return;
    }
    
    console.log("[SIGN_IN] Form submitted");
    setIsLoading(true);

    // Store form data in case of redirect
    const currentPhoneNumber = formData.phoneNumber;
    const currentPassword = formData.password;

    // First, validate credentials and check if user is already logged in
    // This prevents the 401 error and allows us to redirect before attempting sign-in
    let shouldRedirect = false;
    let redirectUrl = "";

    try {
      console.log("[SIGN_IN] Starting validation check...");
      const validateResponse = await fetch("/api/auth/validate-and-check-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: currentPhoneNumber,
          password: currentPassword,
        }),
      });

      console.log("[SIGN_IN] Validation response status:", validateResponse.status);
      const validateData = await validateResponse.json();
      console.log("[SIGN_IN] Validation result:", validateData);

      if (validateResponse.ok) {
        // If credentials are valid and user is already logged in, prepare redirect
        if (validateData.isValid && validateData.isAlreadyLoggedIn) {
          console.log("[SIGN_IN] User already logged in, preparing redirect to device-conflict");
          const params = new URLSearchParams({
            phone: currentPhoneNumber,
          });
          redirectUrl = `/device-conflict?${params.toString()}`;
          shouldRedirect = true;
        }

        // If credentials are invalid, show error and stop
        if (!validateData.isValid && !shouldRedirect) {
          console.log("[SIGN_IN] Credentials invalid");
          toast.error(t('auth.invalidCredentials'));
          setIsLoading(false);
          return;
        }
        
        if (!shouldRedirect) {
          console.log("[SIGN_IN] Credentials valid, user not logged in, proceeding with sign-in");
        }
      } else {
        // If validation fails with 401, credentials are invalid
        if (validateResponse.status === 401) {
          console.log("[SIGN_IN] Validation returned 401 - invalid credentials");
          toast.error(t('auth.invalidCredentials'));
          setIsLoading(false);
          return;
        }
        // For other errors, continue with normal sign-in
        console.log("[SIGN_IN] Validation returned error, continuing with sign-in");
      }
    } catch (validateError) {
      console.error("[SIGN_IN] Error validating credentials:", validateError);
      // Continue with normal sign-in if validation fails
    }

    // If we need to redirect, do it now before any other code runs
    if (shouldRedirect && redirectUrl) {
      console.log("[SIGN_IN] Executing redirect to:", redirectUrl);
      // Use window.location for a hard redirect that can't be interrupted
      window.location.href = redirectUrl;
      return;
    }

    // If user is not already logged in, proceed with normal sign-in
    try {
      const result = await signIn("credentials", {
        phoneNumber: currentPhoneNumber,
        password: currentPassword,
        redirect: false,
      });

      console.log("[SIGN_IN] Sign-in result:", result);

      if (result?.error) {
        if (result.error === "CredentialsSignin") {
          toast.error(t('auth.invalidCredentials'));
        } else {
          toast.error(t('auth.signInError'));
        }
        setIsLoading(false);
        return;
      }

      toast.success(t('auth.signInSuccess'));
      
      // Get user data to determine role and redirect accordingly
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const sessionData = await response.json();
      const userRole = sessionData?.user?.role || "USER";
      const dashboardUrl = getDashboardUrlByRole(userRole);

      // Force a full reload to ensure fresh session on the dashboard
      const target = `${dashboardUrl}?t=${Date.now()}`;
      if (typeof window !== "undefined") {
        window.location.replace(target);
      } else {
        router.replace(target);
      }
    } catch (signInError) {
      console.error("[SIGN_IN] Sign-in error:", signInError);
      toast.error(t('auth.signInError'));
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background overflow-y-auto">
      <div className="absolute top-4 left-4 z-10">
        <Button variant="ghost" size="lg" asChild>
          <Link href="/">
            <ChevronLeft className="h-10 w-10" />
          </Link>
        </Button>
      </div>
      
      {/* Right Side - Image */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-[#FF6B35]/8 to-[#FF6B35]/4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#FF6B35]/6"></div>
        <div className="relative z-10 flex items-center justify-center w-full">
          <div className="text-center space-y-6 p-8">
            <div className="relative w-64 h-64 mx-auto">
              <Image
                src="/logo.png"
                alt="Teacher"
                fill
                className="object-cover rounded-full border-4 border-[#FF6B35]/20 shadow-2xl"
                unoptimized
              />
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-[#FF6B35]">
                {t('auth.welcomeBack')}
              </h3>
              <p className="text-lg text-muted-foreground max-w-md">
                {t('auth.signInSubtitle')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Left Side - Form */}
      <div className="flex-1 flex items-start justify-center p-8">
        <div className="w-full max-w-md space-y-6 py-8 mt-8">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              {t('auth.signIn')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('auth.enterPhonePassword')}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">{t('auth.phoneNumber')}</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                autoComplete="tel"
                required
                disabled={isLoading}
                className="h-10"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                placeholder="+20XXXXXXXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                  className="h-10"
                  value={formData.password}
                  onChange={handleInputChange}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute rtl:left-0 ltr:right-0 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <LoadingButton
              type="submit"
              loading={isLoading}
              loadingText={t('auth.signingIn')}
              className="w-full h-10 bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white"
            >
              {t('auth.signIn')}
            </LoadingButton>
          </form>
          <div className="text-center text-sm">
            <span className="text-muted-foreground">{t('auth.noAccount')} </span>
            <Link 
              href="/sign-up" 
              className="text-primary hover:underline transition-colors"
            >
              {t('auth.createAccount')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 