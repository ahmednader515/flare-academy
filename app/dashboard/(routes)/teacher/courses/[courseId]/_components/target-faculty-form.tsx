"use client"

import * as z from "zod";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { Course } from "@prisma/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Dropdown options for course targeting
const facultyOptions = [
    "كلية الهندسة",
    "كلية الطب",
    "كلية الصيدلة",
    "كلية طب الأسنان",
    "كلية العلوم",
    "كلية التجارة",
    "كلية الآداب",
    "كلية الحقوق",
    "كلية التربية",
    "كلية الزراعة",
    "كلية الطب البيطري",
    "كلية التمريض",
    "كلية العلاج الطبيعي",
    "كلية الإعلام",
    "كلية الاقتصاد والعلوم السياسية",
    "كلية الحاسبات والمعلومات",
    "كلية الفنون التطبيقية",
    "كلية الفنون الجميلة",
    "كلية التربية الرياضية",
    "جميع الكليات"
];

interface TargetFacultyFormProps {
    initialData: Course;
    courseId: string;
}

const formSchema = z.object({
    targetFaculty: z.string().optional(),
});

export const TargetFacultyForm = ({
    initialData,
    courseId
}: TargetFacultyFormProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const router = useRouter();

    const toggleEdit = () => setIsEditing((current) => !current);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            targetFaculty: initialData.targetFaculty || "",
        },
    });

    const { isSubmitting, isValid } = form.formState;

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            await axios.patch(`/api/courses/${courseId}`, values);
            toast.success("تم تحديث الكلية المستهدفة");
            toggleEdit();
            router.refresh();
        } catch {
            toast.error("حدث خطأ");
        }
    }

    return (
        <div className="mt-6 border bg-card rounded-md p-4">
            <div className="font-medium flex items-center justify-between">
                الكلية المستهدفة
                <Button onClick={toggleEdit} variant="ghost">
                    {isEditing && (<>إلغاء</>)}
                    {!isEditing && (
                    <>
                        <Pencil className="h-4 w-4 mr-2" />
                        تعديل الكلية
                    </>)}
                </Button>
            </div>
            {!isEditing && (
                <p className={cn(
                    "text-sm mt-2 text-muted-foreground",
                    !initialData.targetFaculty && "text-muted-foreground italic"
                )}>
                    {initialData.targetFaculty || "غير محدد"}
                </p>
            )}

            {isEditing && (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                        <FormField
                            control={form.control}
                            name="targetFaculty"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            disabled={isSubmitting}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="اختر الكلية المستهدفة" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {facultyOptions.map((faculty) => (
                                                    <SelectItem key={faculty} value={faculty}>
                                                        {faculty}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex items-center gap-x-2">
                            <Button
                                disabled={!isValid || isSubmitting}
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
