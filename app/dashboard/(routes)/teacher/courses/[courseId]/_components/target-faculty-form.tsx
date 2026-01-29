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
import { useLanguage } from "@/lib/contexts/language-context";

// Dropdown options for course targeting
const facultyOptions = [
    "كلية الطب البيطري",
    "كلية العلاج الطبيعي",
    "كلية الصيدلة",
    "كلية طب أسنان"
];

interface TargetFacultyFormProps {
    initialData: Course;
    courseId: string;
}

const formSchema = z.object({
    targetFaculty: z.string().optional(),
});

const NOT_SPECIFIED_VALUE = "__NOT_SPECIFIED__";

export const TargetFacultyForm = ({
    initialData,
    courseId
}: TargetFacultyFormProps) => {
    const { t } = useLanguage();
    const [isEditing, setIsEditing] = useState(false);
    const router = useRouter();

    const toggleEdit = () => setIsEditing((current) => !current);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            targetFaculty: initialData.targetFaculty || NOT_SPECIFIED_VALUE,
        },
    });

    const { isSubmitting, isValid } = form.formState;

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            const payload = {
                ...values,
                targetFaculty:
                    values.targetFaculty === NOT_SPECIFIED_VALUE
                        ? ""
                        : values.targetFaculty,
            };
            await axios.patch(`/api/courses/${courseId}`, payload);
            toast.success(t('teacher.targetFacultyUpdatedSuccessfully'));
            toggleEdit();
            router.refresh();
        } catch {
            toast.error(t('teacher.errorOccurred'));
        }
    }

    return (
        <div className="mt-6 border bg-card rounded-md p-4">
            <div className="font-medium flex items-center justify-between">
                {t('teacher.targetFaculty')}
                <Button onClick={toggleEdit} variant="ghost">
                    {isEditing && (<>{t('common.cancel')}</>)}
                    {!isEditing && (
                    <>
                        <Pencil className="h-4 w-4 mr-2" />
                        {t('teacher.editFaculty')}
                    </>)}
                </Button>
            </div>
            {!isEditing && (
                <p className={cn(
                    "text-sm mt-2 text-muted-foreground",
                    !initialData.targetFaculty && "text-muted-foreground italic"
                )}>
                    {initialData.targetFaculty || t('teacher.notSpecified')}
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
                                                <SelectValue placeholder={t('teacher.selectTargetFaculty')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={NOT_SPECIFIED_VALUE}>
                                                    {t('teacher.notSpecified')}
                                                </SelectItem>
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
                                {t('common.save')}
                            </Button>
                        </div>
                    </form>
                </Form>
            )}
        </div>
    )
}
