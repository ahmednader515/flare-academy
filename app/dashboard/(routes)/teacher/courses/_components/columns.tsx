"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useLanguage } from "@/lib/contexts/language-context";

export type Course = {
    id: string;
    title: string;
    price: number;
    isPublished: boolean;
    createdAt: Date;
    enrolledStudentsCount: number;
}

interface UseColumnsProps {
    onViewStudents?: (courseId: string, courseTitle: string) => void;
}

export const useColumns = ({ onViewStudents }: UseColumnsProps = {}): ColumnDef<Course>[] => {
    const { t } = useLanguage();
    
    return [
        {
            accessorKey: "title",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        {t('teacher.courseTitle')}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
        },
        {
            accessorKey: "price",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        {t('teacher.price')}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const price = parseFloat(row.getValue("price"));
                return <div>{formatPrice(price)}</div>;
            },
        },
        {
            accessorKey: "enrolledStudentsCount",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        {t('teacher.enrolledStudents')}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const count = row.getValue("enrolledStudentsCount") as number;
                const course = row.original;
                return (
                    <div className="flex items-center justify-center gap-2">
                        <span className="font-medium">{count}</span>
                        {onViewStudents && count > 0 && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => onViewStudents(course.id, course.title)}
                                title="View enrolled students"
                            >
                                <Users className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: "isPublished",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        {t('teacher.status')}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const isPublished = row.getValue("isPublished") || false;
                return (
                    <Badge variant={isPublished ? "default" : "secondary"}>
                        {isPublished ? t('teacher.published') : t('teacher.draft')}
                    </Badge>
                );
            },
        },
        {
            accessorKey: "createdAt",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        {t('teacher.createdAt')}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const date = new Date(row.getValue("createdAt"));
                return <div>{format(date, "dd/MM/yyyy", { locale: ar })}</div>;
            },
        }
    ];
}; 