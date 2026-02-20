"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { signIn } from "next-auth/react";
import { getDashboardUrlByRole } from "@/lib/utils";
import { useLanguage } from "@/lib/contexts/language-context";
import { Smartphone, LogOut, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function DeviceConflictPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, isRTL } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Get phone number from URL params (password should not be in URL for security)
    const phone = searchParams.get("phone");
    if (phone) setPhoneNumber(phone);
  }, [searchParams]);

  const handleForceLogin = async () => {
    if (!phoneNumber || !password) {
      toast.error(t('auth.phonePasswordRequired') || "Phone number and password are required");
      return;
    }

    setIsLoading(true);

    try {
      // Call API to force logout all devices and prepare for login
      const response = await fetch("/api/auth/force-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || t('auth.forceLoginError') || "Failed to sign out other devices");
        setIsLoading(false);
        return;
      }

      // Now sign in with the credentials
      const result = await signIn("credentials", {
        phoneNumber,
        password,
        redirect: false,
      });

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
      const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
      const sessionData = await sessionResponse.json();
      const userRole = sessionData?.user?.role || "USER";
      const dashboardUrl = getDashboardUrlByRole(userRole);

      // Force a full reload to ensure fresh session on the dashboard
      const target = `${dashboardUrl}?t=${Date.now()}`;
      if (typeof window !== "undefined") {
        window.location.replace(target);
      } else {
        router.replace(target);
      }
    } catch (error) {
      console.error("Force login error:", error);
      toast.error(t('auth.forceLoginError') || "Failed to sign out other devices");
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    router.push("/sign-in");
  };

  return (
    <div className="flex min-h-screen bg-background items-center justify-center p-4">
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-orange-100 dark:bg-orange-900/20 p-4">
                <Smartphone className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">
              {t('auth.accountLoggedInAnotherDevice') || "Account Logged In on Another Device"}
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              {t('auth.accountLoggedInAnotherDeviceDescription') || 
                "This account is currently logged in on another device. To sign in on this device, you need to sign out from all other devices first."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground text-center">
                {t('auth.forceLoginWarning') || 
                  "This will sign you out from all other devices. You will then be signed in on this device."}
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">{t('auth.phoneNumber')}</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+20XXXXXXXXXX"
                  disabled={isLoading}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.password') || "Password"}
                    disabled={isLoading}
                    className="h-10"
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
            </div>
            <div className="flex flex-col gap-2">
              <LoadingButton
                onClick={handleForceLogin}
                loading={isLoading}
                loadingText={t('auth.signingOutAllDevices') || "Signing out all devices..."}
                className="w-full"
                disabled={!phoneNumber || !password}
              >
                <LogOut className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {t('auth.signOutAllDevicesAndSignIn') || "Sign Out All Devices & Sign In"}
              </LoadingButton>
              <Button
                variant="outline"
                onClick={handleGoBack}
                disabled={isLoading}
                className="w-full"
              >
                {t('common.cancel') || "Cancel"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

