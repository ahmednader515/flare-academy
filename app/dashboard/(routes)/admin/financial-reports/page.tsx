"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, TrendingUp, DollarSign, Users } from "lucide-react";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/contexts/language-context";
import { exportToExcel } from "@/lib/utils/excel-export";
import axios from "axios";

interface Course {
    id: string;
    title: string;
    price: number;
}

interface FinancialReport {
    course: {
        id: string;
        title: string;
        price: number;
    };
    summary: {
        totalStudents: number;
        totalPaid: number;
        totalRemaining: number;
        totalExpected: number;
    };
    studentPayments: Array<{
        studentId: string;
        studentName: string;
        studentPhone: string;
        studentCollege: string | null;
        studentFaculty: string | null;
        coursePrice: number;
        totalPaid: number;
        remaining: number;
        isFullyPaid: boolean;
        payments: Array<{
            id: string;
            amount: number;
            paymentNumber: number;
            notes: string | null;
            createdAt: string;
        }>;
    }>;
}

const FinancialReportsPage = () => {
    const { t, isRTL } = useLanguage();
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<string>("");
    const [report, setReport] = useState<FinancialReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingReport, setLoadingReport] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchCourses();
    }, []);

    useEffect(() => {
        if (selectedCourseId) {
            fetchFinancialReport(selectedCourseId);
        } else {
            setReport(null);
        }
    }, [selectedCourseId]);

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const response = await axios.get("/api/admin/courses");
            setCourses(response.data);
        } catch (error) {
            console.error("[COURSES_FETCH]", error);
            toast.error(t("admin.failedToLoadCourses"));
        } finally {
            setLoading(false);
        }
    };

    const fetchFinancialReport = async (courseId: string) => {
        try {
            setLoadingReport(true);
            const response = await axios.get(`/api/courses/${courseId}/financial-report`);
            setReport(response.data);
        } catch (error) {
            console.error("[FINANCIAL_REPORT_FETCH]", error);
            toast.error(t("admin.failedToLoadFinancialReport"));
        } finally {
            setLoadingReport(false);
        }
    };

    const exportReportToExcel = () => {
        if (!report) return;

        const filteredPayments = report.studentPayments.filter(sp => {
            const searchLower = searchTerm.toLowerCase();
            return (
                sp.studentName.toLowerCase().includes(searchLower) ||
                sp.studentPhone.includes(searchLower)
            );
        });

        const exportData = filteredPayments.map((sp, index) => ({
            "#": index + 1,
            "Student Name": sp.studentName,
            "Phone Number": sp.studentPhone,
            "College": sp.studentCollege || "N/A",
            "Faculty": sp.studentFaculty || "N/A",
            "Course Price (EGP)": sp.coursePrice,
            "Total Paid (EGP)": sp.totalPaid,
            "Remaining (EGP)": sp.remaining,
            "Status": sp.isFullyPaid ? "Fully Paid" : "Pending",
            "Number of Payments": sp.payments.length
        }));

        exportToExcel(exportData, [
            { key: "#" as any, label: "#" },
            { key: "Student Name" as any, label: "Student Name" },
            { key: "Phone Number" as any, label: "Phone Number" },
            { key: "College" as any, label: "College" },
            { key: "Faculty" as any, label: "Faculty" },
            { key: "Course Price (EGP)" as any, label: "Course Price (EGP)" },
            { key: "Total Paid (EGP)" as any, label: "Total Paid (EGP)" },
            { key: "Remaining (EGP)" as any, label: "Remaining (EGP)" },
            { key: "Status" as any, label: "Status" },
            { key: "Number of Payments" as any, label: "Number of Payments" }
        ], {
            filename: `financial_report_${report.course.title.replace(/[^a-z0-9]/gi, '_')}`,
            sheetName: "Financial Report"
        });
    };

    const filteredPayments = report?.studentPayments.filter(sp => {
        const searchLower = searchTerm.toLowerCase();
        return (
            sp.studentName.toLowerCase().includes(searchLower) ||
            sp.studentPhone.includes(searchLower)
        );
    }) || [];

    if (loading) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">{t("common.loading")}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">{t("admin.financialReports")}</h1>
                    <p className="text-muted-foreground mt-1">
                        {t("admin.viewFinancialSummaries")}
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t("admin.selectCourse")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                        <SelectTrigger className="w-full max-w-md">
                            <SelectValue placeholder={t("admin.selectCourseToViewReport")} />
                        </SelectTrigger>
                        <SelectContent>
                            {courses.map((course) => (
                                <SelectItem key={course.id} value={course.id}>
                                    {course.title} - {course.price || 0} {t("dashboard.egp")}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {report && (
                <>
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {t("admin.totalStudents")}
                                </CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{report.summary.totalStudents}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {t("admin.totalPaid")}
                                </CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">
                                    {report.summary.totalPaid.toFixed(2)} {t("dashboard.egp")}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {t("admin.remaining")}
                                </CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600">
                                    {report.summary.totalRemaining.toFixed(2)} {t("dashboard.egp")}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {t("admin.totalExpected")}
                                </CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {report.summary.totalExpected.toFixed(2)} {t("dashboard.egp")}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>{t("dashboard.students")} {t("admin.payments")} - {report.course.title}</CardTitle>
                                <Button onClick={exportReportToExcel} variant="outline">
                                    <Download className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                    {t("dashboard.exportToExcel")}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4">
                                <div className="relative">
                                    <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4`} />
                                    <Input
                                        placeholder={t("admin.searchByStudentNamePhoneOrCourse")}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className={`${isRTL ? 'pr-10' : 'pl-10'} w-64`}
                                    />
                                </div>
                            </div>
                            <div className="rounded-md border overflow-auto">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-background z-10">
                                        <TableRow>
                                            <TableHead className={isRTL ? "text-right" : "text-left"}>#</TableHead>
                                            <TableHead className={isRTL ? "text-right" : "text-left"}>{t("dashboard.studentName")}</TableHead>
                                            <TableHead className={isRTL ? "text-right" : "text-left"}>{t("dashboard.phoneNumber")}</TableHead>
                                            <TableHead className={isRTL ? "text-right" : "text-left"}>{t("dashboard.college")}</TableHead>
                                            <TableHead className={isRTL ? "text-right" : "text-left"}>{t("dashboard.faculty")}</TableHead>
                                            <TableHead className={isRTL ? "text-right" : "text-left"}>{t("admin.coursePrice")}</TableHead>
                                            <TableHead className={isRTL ? "text-right" : "text-left"}>{t("admin.totalPaid")}</TableHead>
                                            <TableHead className={isRTL ? "text-right" : "text-left"}>{t("admin.remaining")}</TableHead>
                                            <TableHead className={isRTL ? "text-right" : "text-left"}>{t("dashboard.status")}</TableHead>
                                            <TableHead className={isRTL ? "text-right" : "text-left"}>{t("admin.payments")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loadingReport ? (
                                            <TableRow>
                                                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                                    {t("admin.loadingReport")}
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredPayments.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                                    {t("admin.noStudentsFound")}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredPayments.map((sp, index) => (
                                                <TableRow key={sp.studentId}>
                                                    <TableCell className={isRTL ? "text-right" : "text-left"}>{index + 1}</TableCell>
                                                    <TableCell className={`font-medium ${isRTL ? "text-right" : "text-left"}`}>{sp.studentName}</TableCell>
                                                    <TableCell className={isRTL ? "text-right" : "text-left"}>{sp.studentPhone}</TableCell>
                                                    <TableCell className={isRTL ? "text-right" : "text-left"}>{sp.studentCollege || "N/A"}</TableCell>
                                                    <TableCell className={isRTL ? "text-right" : "text-left"}>{sp.studentFaculty || "N/A"}</TableCell>
                                                    <TableCell className={isRTL ? "text-right" : "text-left"}>{sp.coursePrice.toFixed(2)} {t("dashboard.egp")}</TableCell>
                                                    <TableCell className={isRTL ? "text-right" : "text-left"}>{sp.totalPaid.toFixed(2)} {t("dashboard.egp")}</TableCell>
                                                    <TableCell className={isRTL ? "text-right" : "text-left"}>
                                                        <span className={sp.remaining > 0 ? "text-red-600 font-semibold" : "text-green-600"}>
                                                            {sp.remaining.toFixed(2)} {t("dashboard.egp")}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className={isRTL ? "text-right" : "text-left"}>
                                                        <Badge variant={sp.isFullyPaid ? "default" : "secondary"}>
                                                            {sp.isFullyPaid ? t("admin.fullyPaid") : t("admin.pending")}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className={isRTL ? "text-right" : "text-left"}>
                                                        <Badge variant="outline">
                                                            {sp.payments.length} {t("admin.payments")}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
};

export default FinancialReportsPage;

