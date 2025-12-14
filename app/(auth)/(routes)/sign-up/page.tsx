"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import Link from "next/link";
import axios, { AxiosError } from "axios";
import { Check, X, Eye, EyeOff, ChevronLeft, Shield, Loader2 } from "lucide-react";
import Image from "next/image";
import { useLanguage } from "@/lib/contexts/language-context";
import ReCAPTCHA from "react-google-recaptcha";

// Dropdown options
const collegeOptions = [
  "الجامعة المصرية الصينية",
  "جامعة الدلتا",
  "جامعة القاهرة الأهلية",
  "جامعة المنوفية الأهلية",
  "جامعة سفنكس",
  "جامعة السادات الأهلية"
];

const facultyOptions = [
  "كلية الطب البيطري",
  "كلية العلاج الطبيعي",
  "كلية الصيدلة",
  "كلية طب أسنان"
];

const VERIFICATION_STORAGE_KEY = "recaptcha_gate_verified";
const VERIFICATION_EXPIRY_HOURS = 24;

export default function SignUpPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  
  // Gate verification states
  const [isGateVerified, setIsGateVerified] = useState(false);
  const [isGateVerifying, setIsGateVerifying] = useState(false);
  const [isGateLoading, setIsGateLoading] = useState(true);
  const gateRecaptchaRef = useRef<ReCAPTCHA>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    college: "",
    faculty: "",
    password: "",
    confirmPassword: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validatePasswords = () => {
    return {
      match: formData.password === formData.confirmPassword,
      isValid: formData.password === formData.confirmPassword && formData.password.length > 0,
    };
  };

  const passwordChecks = validatePasswords();

  // Check gate verification on mount
  useEffect(() => {
    const checkVerification = () => {
      try {
        const stored = localStorage.getItem(VERIFICATION_STORAGE_KEY);
        if (stored) {
          const { timestamp } = JSON.parse(stored);
          const now = Date.now();
          const expiryTime = VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000;
          
          if (now - timestamp < expiryTime) {
            setIsGateVerified(true);
            setIsGateLoading(false);
            return;
          } else {
            localStorage.removeItem(VERIFICATION_STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error("Error checking verification:", error);
        localStorage.removeItem(VERIFICATION_STORAGE_KEY);
      }
      setIsGateLoading(false);
    };

    checkVerification();
  }, []);

  const handleGateRecaptchaChange = async (token: string | null) => {
    if (!token) {
      return;
    }

    setIsGateVerifying(true);

    try {
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
        localStorage.setItem(
          VERIFICATION_STORAGE_KEY,
          JSON.stringify({
            timestamp: Date.now(),
          })
        );
        setIsGateVerified(true);
      } else {
        throw new Error("Verification failed");
      }
    } catch (error) {
      console.error("reCaptcha verification error:", error);
      gateRecaptchaRef.current?.reset();
      alert("فشل التحقق من reCaptcha. يرجى المحاولة مرة أخرى");
    } finally {
      setIsGateVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (!passwordChecks.isValid) {
      toast.error(t('auth.passwordsDoNotMatch'));
      setIsLoading(false);
      return;
    }

    if (!formData.college || !formData.faculty) {
      toast.error("الجامعة والكلية مطلوبان");
      setIsLoading(false);
      return;
    }

    if (!recaptchaToken) {
      toast.error("الرجاء إكمال التحقق من reCaptcha");
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post("/api/auth/register", {
        ...formData,
        recaptchaToken,
      });
      
      if (response.data.success) {
        toast.success(t('auth.signUpSuccess'));
        router.push("/sign-in");
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 400) {
        const errorMessage = axiosError.response.data as string;
        if (errorMessage.includes("Phone number already exists")) {
          toast.error(t('auth.phoneAlreadyExists'));
        } else if (errorMessage.includes("Email already exists")) {
          toast.error(t('auth.emailAlreadyExists'));
        } else if (errorMessage.includes("Invalid email format")) {
          toast.error(t('auth.invalidEmailFormat'));
        } else if (errorMessage.includes("Passwords do not match")) {
          toast.error(t('auth.passwordsDoNotMatch'));
        } else if (errorMessage.includes("reCaptcha")) {
          toast.error("فشل التحقق من reCaptcha. يرجى المحاولة مرة أخرى");
        } else {
          toast.error(t('auth.signUpError'));
        }
      } else {
        toast.error(t('auth.signUpError'));
      }
      // Reset reCaptcha on error
      recaptchaRef.current?.reset();
      setRecaptchaToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token);
  };

  // Show loading state while checking verification
  if (isGateLoading) {
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
  if (!isGateVerified) {
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
              ref={gateRecaptchaRef}
              sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
              onChange={handleGateRecaptchaChange}
              theme="light"
            />
          </div>

          {isGateVerifying && (
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

  return (
    <React.Fragment>
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
                {t('auth.welcomeToFlareAcademy')}
              </h3>
              <p className="text-lg text-muted-foreground max-w-md">
                {t('auth.joinUsToday')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Left Side - Form */}
      <div className="flex-1 flex items-start justify-center p-8">
        <div className="w-full max-w-md space-y-6 py-8 mt-8">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold tracking-tight mt-8">
              {t('auth.signUp')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('auth.enterDataToCreateAccount')}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">{t('auth.fullName')}</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                disabled={isLoading}
                className="h-10"
                value={formData.fullName}
                onChange={handleInputChange}
              />
            </div>
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
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={isLoading}
                className="h-10"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="student@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="college">{t('auth.college')}</Label>
              <Select
                value={formData.college}
                onValueChange={(value) => handleSelectChange("college", value)}
                disabled={isLoading}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={t('auth.selectCollege')} />
                </SelectTrigger>
                <SelectContent>
                  {collegeOptions.map((college) => (
                    <SelectItem key={college} value={college}>
                      {college}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="faculty">{t('auth.faculty')}</Label>
              <Select
                value={formData.faculty}
                onValueChange={(value) => handleSelectChange("faculty", value)}
                disabled={isLoading}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={t('auth.selectFaculty')} />
                </SelectTrigger>
                <SelectContent>
                  {facultyOptions.map((faculty) => (
                    <SelectItem key={faculty} value={faculty}>
                      {faculty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  disabled={isLoading}
                  className="h-10"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute rtl:left-0 ltr:right-0 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {passwordChecks.match ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <X className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm text-muted-foreground">{t('auth.passwordsMatch')}</span>
              </div>
            </div>

            <div className="flex justify-center">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
                onChange={handleRecaptchaChange}
                theme="light"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-10 bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white"
              disabled={isLoading || !passwordChecks.isValid || !recaptchaToken}
            >
              {isLoading ? t('auth.signingUp') : t('auth.signUp')}
            </Button>
          </form>
          <div className="text-center text-sm">
            <span className="text-muted-foreground">{t('auth.hasAccount')} </span>
            <Link 
              href="/sign-in" 
              className="text-primary hover:underline transition-colors"
            >
              {t('auth.signIn')}
            </Link>
          </div>
        </div>
      </div>
      </div>
    </React.Fragment>
  );
} 