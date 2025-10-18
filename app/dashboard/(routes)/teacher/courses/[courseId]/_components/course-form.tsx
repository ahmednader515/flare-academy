"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Course } from "@prisma/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import toast from "react-hot-toast";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Globe } from "lucide-react";

// Dropdown options for course targeting
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

const formSchema = z.object({
    title: z.string().min(1, {
        message: "العنوان مطلوب",
    }),
    description: z.string().min(1, {
        message: "الوصف مطلوب",
    }),
    targetFaculty: z.string().optional(),
    targetCollege: z.string().optional(),
});

interface CourseFormProps {
    initialData: Course;
    courseId: string;
}

export const CourseForm = ({
    initialData,
    courseId
}: CourseFormProps) => {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: initialData.title || "",
            description: initialData.description || "",
            targetFaculty: initialData.targetFaculty || "",
            targetCollege: initialData.targetCollege || "",
        },
    });

    const toggleEdit = () => setIsEditing((current) => !current);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            setIsLoading(true);
            await axios.patch(`/api/courses/${courseId}`, values);
            toast.success("تم تحديث الكورس");
            toggleEdit();
            router.refresh();
        } catch {
            toast.error("حدث خطأ ما");
        } finally {
            setIsLoading(false);
        }
    }

    const onPublish = async () => {
        try {
            setIsLoading(true);
            await axios.patch(`/api/courses/${courseId}/publish`);
            toast.success(initialData.isPublished ? "تم إلغاء النشر" : "تم النشر");
            router.refresh();
        } catch {
            toast.error("حدث خطأ ما");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="mt-6 border bg-slate-100 rounded-md p-4">
            <div className="font-medium flex items-center justify-between">
                إعدادات الكورس
                <Button onClick={toggleEdit} variant="ghost">
                    {isEditing ? (
                        <>إلغاء</>
                    ) : (
                        <>
                            <Pencil className="h-4 w-4 mr-2" />
                            تعديل الكورس
                        </>
                    )}
                </Button>
            </div>
            {!isEditing && (
                <div className="mt-4 space-y-4">
                    {/* Target Audience Display */}
                    {(initialData.targetFaculty || initialData.targetCollege) && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-slate-700">الجمهور المستهدف</h4>
                            <div className="flex flex-wrap gap-2">
                                {initialData.targetCollege && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                        {initialData.targetCollege}
                                    </span>
                                )}
                                {initialData.targetFaculty && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                        {initialData.targetFaculty}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-500">
                            {initialData.isPublished ? "منشور" : "مسودة"}
                        </p>
                        <Button
                            onClick={onPublish}
                            disabled={isLoading}
                            variant={initialData.isPublished ? "destructive" : "default"}
                        >
                            <Globe className="h-4 w-4 mr-2" />
                            {initialData.isPublished ? "إلغاء النشر" : "نشر"}
                        </Button>
                    </div>
                </div>
            )}
            {isEditing && (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input
                                            disabled={isLoading}
                                            placeholder="e.g. 'تطوير الويب '"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>الوصف</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            disabled={isLoading}
                                            placeholder="e.g. 'هذه الكورس سوف تعلمك...'"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="targetCollege"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>الجامعة المستهدفة (اختياري)</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        disabled={isLoading}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="اختر الجامعة المستهدفة" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {collegeOptions.map((college) => (
                                                <SelectItem key={college} value={college}>
                                                    {college}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="targetFaculty"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>الكلية المستهدفة (اختياري)</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        disabled={isLoading}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="اختر الكلية المستهدفة" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {facultyOptions.map((faculty) => (
                                                <SelectItem key={faculty} value={faculty}>
                                                    {faculty}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex items-center gap-x-2">
                            <Button
                                disabled={isLoading}
                                type="submit"
                            >
                                حفظ
                            </Button>
                        </div>
                    </form>
                </Form>
            )}
        </div>
    )
} 