"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Eye, EyeOff, UserPlus, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";
import axios, { AxiosError } from "axios";
import { useLanguage } from "@/lib/contexts/language-context";

interface CreatedUser {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: string;
}

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

export default function CreateAccountPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [createdUser, setCreatedUser] = useState<CreatedUser | null>(null);
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (!passwordChecks.isValid) {
      toast.error(t('teacher.passwordsDoNotMatch'));
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post("/api/teacher/create-account", formData);
      
      if (response.data.success) {
        setCreatedUser(response.data.user);
        toast.success(t('teacher.accountCreatedSuccessfully'));
        // Reset form
        setFormData({
          fullName: "",
          phoneNumber: "",
          email: "",
          college: "",
          faculty: "",
          level: "",
          password: "",
          confirmPassword: "",
        });
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 400) {
        const errorMessage = axiosError.response.data as string;
        if (errorMessage.includes("Phone number already exists")) {
          toast.error(t('teacher.phoneAlreadyExists'));
        } else if (errorMessage.includes("Email already exists")) {
          toast.error(t('teacher.emailAlreadyExists'));
        } else if (errorMessage.includes("Invalid email format")) {
          toast.error(t('teacher.invalidEmailFormat'));
        } else if (errorMessage.includes("Passwords do not match")) {
          toast.error(t('teacher.passwordsDoNotMatch'));
        } else {
          toast.error(t('teacher.accountCreationError'));
        }
      } else {
        toast.error(t('teacher.accountCreationError'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: "",
      phoneNumber: "",
      email: "",
      college: "",
      faculty: "",
      level: "",
      password: "",
      confirmPassword: "",
    });
    setCreatedUser(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/teacher/courses">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('teacher.back')}
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('teacher.createNewStudentAccount')}
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {createdUser ? (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle className="h-5 w-5" />
                {t('teacher.accountCreatedSuccessfully')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-green-700 dark:text-green-300">{t('teacher.fullName')}</Label>
                  <p className="text-green-800 dark:text-green-200 font-semibold">{createdUser.fullName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-green-700 dark:text-green-300">{t('teacher.phoneNumber')}</Label>
                  <p className="text-green-800 dark:text-green-200 font-semibold">{createdUser.phoneNumber}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Button onClick={resetForm} className="bg-green-600 hover:bg-green-700 text-white">
                  {t('teacher.createAnotherAccount')}
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard/teacher/courses">
                    {t('teacher.backToCourses')}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                {t('teacher.studentInformation')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">{t('teacher.fullName')} *</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      type="text"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder={t('teacher.enterFullName')}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">{t('teacher.phoneNumber')} *</Label>
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      placeholder={t('teacher.enterPhoneNumber')}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t('teacher.email')} *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder={t('teacher.enterEmail')}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="college">{t('teacher.college')}</Label>
                    <Select
                      value={formData.college}
                      onValueChange={(value) => handleSelectChange("college", value)}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('teacher.selectCollege')} />
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
                    <Label htmlFor="faculty">{t('teacher.faculty')}</Label>
                    <Select
                      value={formData.faculty}
                      onValueChange={(value) => handleSelectChange("faculty", value)}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('teacher.selectFaculty')} />
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">{t('teacher.password')} *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder={t('teacher.enterPassword')}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute rtl:left-0 ltr:right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t('teacher.confirmPassword')} *</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder={t('teacher.confirmPasswordPlaceholder')}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute rtl:left-0 ltr:right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {formData.password && formData.confirmPassword && (
                  <div className={`text-sm ${passwordChecks.match ? 'text-green-600' : 'text-red-600'}`}>
                    {passwordChecks.match ? (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                        {t('teacher.passwordsMatch')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                        {t('teacher.passwordsDoNotMatch')}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={isLoading || !passwordChecks.isValid}
                    className="flex-1 bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white"
                  >
                    {isLoading ? t('teacher.creating') : t('teacher.createAccount')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                  >
                    {t('teacher.resetForm')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 