"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/contexts/language-context";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface Student {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  college: string | null;
  faculty: string | null;
  level: string | null;
  enrolledAt: Date;
}

interface EnrolledStudentsDialogProps {
  courseId: string;
  courseTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EnrolledStudentsDialog = ({
  courseId,
  courseTitle,
  open,
  onOpenChange,
}: EnrolledStudentsDialogProps) => {
  const { t } = useLanguage();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/teacher/courses/${courseId}/students`);
      if (!response.ok) {
        throw new Error("Failed to fetch students");
      }
      const data = await response.json();
      setStudents(data.students || []);
    } catch (err) {
      console.error("Error fetching students:", err);
      setError("Failed to load students");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (open && courseId) {
      fetchStudents();
    }
  }, [open, courseId, fetchStudents]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-[90vw] xl:max-w-[85vw] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('teacher.enrolledStudents')}
          </DialogTitle>
          <DialogDescription>
            {courseTitle}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">{error}</div>
        ) : students.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No students enrolled
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              {t('teacher.totalStudents')}: {students.length}
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      {t('teacher.studentName')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      {t('teacher.email')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      {t('teacher.phoneNumber')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      {t('teacher.college')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      {t('teacher.faculty')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      {t('teacher.level')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Enrolled At
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => (
                    <tr
                      key={student.id}
                      className={index % 2 === 0 ? "bg-background" : "bg-muted/50"}
                    >
                      <td className="px-4 py-3 text-sm">{student.fullName}</td>
                      <td className="px-4 py-3 text-sm">{student.email}</td>
                      <td className="px-4 py-3 text-sm">{student.phoneNumber}</td>
                      <td className="px-4 py-3 text-sm">{student.college || "-"}</td>
                      <td className="px-4 py-3 text-sm">{student.faculty || "-"}</td>
                      <td className="px-4 py-3 text-sm">{student.level || "-"}</td>
                      <td className="px-4 py-3 text-sm">
                        {format(new Date(student.enrolledAt), "dd/MM/yyyy", {
                          locale: ar,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

