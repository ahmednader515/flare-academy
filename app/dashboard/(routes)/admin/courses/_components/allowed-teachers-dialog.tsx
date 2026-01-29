"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/contexts/language-context";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Teacher {
    id: string;
    fullName: string;
    email: string;
    isAllowed?: boolean;
    isCreator?: boolean;
}

interface AllowedTeachersDialogProps {
    courseId: string;
    courseTitle: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export const AllowedTeachersDialog = ({
    courseId,
    courseTitle,
    open,
    onOpenChange,
    onSuccess,
}: AllowedTeachersDialogProps) => {
    const { t, isRTL } = useLanguage();
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            fetchTeachers();
        }
    }, [open, courseId]);

    const fetchTeachers = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/courses/${courseId}/allowed-teachers`);
            if (response.ok) {
                const data: Teacher[] = await response.json();
                setTeachers(data);
                // Always include course creator if they are a teacher
                const allowedIds = data.filter(t => t.isAllowed).map(t => t.id);
                setSelectedTeacherIds(allowedIds);
            } else {
                const error = await response.json();
                toast.error(error.error || t('common.error') || 'Error loading teachers');
            }
        } catch (error) {
            console.error("Error fetching teachers:", error);
            toast.error(t('common.error') || 'Error loading teachers');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleTeacher = (teacherId: string) => {
        // Prevent unchecking the course creator
        const teacher = teachers.find(t => t.id === teacherId);
        if (teacher?.isCreator && selectedTeacherIds.includes(teacherId)) {
            return; // Don't allow unchecking the creator
        }
        
        setSelectedTeacherIds(prev =>
            prev.includes(teacherId)
                ? prev.filter(id => id !== teacherId)
                : [...prev, teacherId]
        );
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const response = await fetch(`/api/courses/${courseId}/allowed-teachers`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ teacherIds: selectedTeacherIds }),
            });

            if (response.ok) {
                toast.success(t('admin.allowedTeachersUpdated') || 'Allowed teachers updated successfully');
                onSuccess?.();
                onOpenChange(false);
            } else {
                const error = await response.json();
                toast.error(error.error || t('common.error'));
            }
        } catch (error) {
            console.error("Error saving allowed teachers:", error);
            toast.error(t('common.error') || 'Error saving allowed teachers');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>
                        {t('admin.selectAllowedTeachers') || 'Select Allowed Teachers'}
                    </DialogTitle>
                    <DialogDescription>
                        {t('admin.selectAllowedTeachersDescription') || `Select which teachers can edit "${courseTitle}". Non-selected teachers will only be able to edit their own courses.`}
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : (
                    <div className="max-h-[400px] overflow-y-auto pr-4">
                        <div className="space-y-3">
                            {teachers.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                    {t('admin.noTeachersFound') || 'No teachers found'}
                                </p>
                            ) : (
                                teachers.map((teacher) => (
                                    <div
                                        key={teacher.id}
                                        className={`flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent ${teacher.isCreator ? 'bg-muted/50' : ''}`}
                                    >
                                        <Checkbox
                                            id={teacher.id}
                                            checked={selectedTeacherIds.includes(teacher.id)}
                                            onCheckedChange={() => handleToggleTeacher(teacher.id)}
                                            disabled={teacher.isCreator}
                                        />
                                        <Label
                                            htmlFor={teacher.id}
                                            className={`flex-1 ${teacher.isCreator ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                                        >
                                            <div>
                                                <p className="font-medium">
                                                    {teacher.fullName}
                                                    {teacher.isCreator && (
                                                        <span className="ml-2 text-xs text-muted-foreground">
                                                            ({t('admin.courseCreator') || 'Course Creator'})
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="text-sm text-muted-foreground">{teacher.email}</p>
                                            </div>
                                        </Label>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={saving}
                    >
                        {t('common.cancel') || t('dashboard.cancel') || 'Cancel'}
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving || loading}
                    >
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                {t('common.saving') || t('dashboard.saving') || 'Saving...'}
                            </>
                        ) : (
                            t('common.save') || t('dashboard.saveChanges') || 'Save'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

