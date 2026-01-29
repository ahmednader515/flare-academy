"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useLanguage } from "@/lib/contexts/language-context";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import { exportToExcel } from "@/lib/utils/excel-export";

interface User {
    id: string;
    fullName: string;
    phoneNumber: string;
    email: string;
    role: string;
    createdAt: string;
}

const AccountsPage = () => {
    const { t, isRTL } = useLanguage();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            const response = await fetch("/api/admin/users");
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (error) {
            console.error("Error fetching accounts:", error);
        } finally {
            setLoading(false);
        }
    };

    const getRoleBadge = (role: string) => {
        const roleMap: { [key: string]: { label: string; variant: "default" | "secondary" | "destructive" | "outline" } } = {
            ADMIN: { label: t('dashboard.admin') || "Admin", variant: "destructive" },
            TEACHER: { label: t('dashboard.teacher') || "Teacher", variant: "default" },
            USER: { label: t('dashboard.student') || "Student", variant: "secondary" },
        };
        const roleInfo = roleMap[role] || { label: role, variant: "outline" as const };
        return <Badge variant={roleInfo.variant}>{roleInfo.label}</Badge>;
    };

    const getRoleLabel = (role: string): string => {
        const roleMap: { [key: string]: string } = {
            ADMIN: t('dashboard.admin') || "Admin",
            TEACHER: t('dashboard.teacher') || "Teacher",
            USER: t('dashboard.student') || "Student",
        };
        return roleMap[role] || role;
    };

    const handleExportAccounts = () => {
        interface ExportData {
            index: number;
            fullName: string;
            phoneNumber: string;
            email: string;
            role: string;
            createdAt: string;
        }

        const headers = [
            { key: 'index' as keyof ExportData, label: '#' },
            { key: 'fullName' as keyof ExportData, label: t('dashboard.name') },
            { key: 'phoneNumber' as keyof ExportData, label: t('dashboard.phoneNumber') },
            { key: 'email' as keyof ExportData, label: t('dashboard.email') },
            { key: 'role' as keyof ExportData, label: t('dashboard.role') },
            { key: 'createdAt' as keyof ExportData, label: t('dashboard.registrationDate') },
        ];

        const exportData: ExportData[] = users.map((user, index) => ({
            index: index + 1,
            fullName: user.fullName,
            phoneNumber: user.phoneNumber,
            email: user.email || '',
            role: getRoleLabel(user.role),
            createdAt: format(new Date(user.createdAt), "dd/MM/yyyy", { locale: ar }),
        }));

        exportToExcel(exportData, headers, {
            filename: 'accounts_list',
            sheetName: t('admin.accountsList') || 'Accounts',
        });

        toast.success(t('dashboard.exportSuccess') || t('admin.exportSuccess') || 'Data exported successfully');
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent" />
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">{t('admin.totalAccounts')}</h1>
                <p className="text-muted-foreground">
                    {t('admin.totalAccountsDescription')} {users.length}
                </p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>{t('admin.accountsList')}</CardTitle>
                        <Button
                            onClick={handleExportAccounts}
                            variant="outline"
                            className="flex items-center gap-2"
                        >
                            <Download className="h-4 w-4" />
                            {t('dashboard.exportToExcel') || t('admin.exportToExcel') || 'Export to Excel'}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className={`w-16 text-center`}>#</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.name')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.phoneNumber')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.email')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.role')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.registrationDate')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                                            {t('dashboard.noData') || 'No accounts found'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    users.map((user, index) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="text-center font-medium">
                                                {index + 1}
                                            </TableCell>
                                            <TableCell className={isRTL ? "text-right" : "text-left"}>{user.fullName}</TableCell>
                                            <TableCell className={isRTL ? "text-right" : "text-left"}>{user.phoneNumber}</TableCell>
                                            <TableCell className={isRTL ? "text-right" : "text-left"}>{user.email || "-"}</TableCell>
                                            <TableCell className={isRTL ? "text-right" : "text-left"}>{getRoleBadge(user.role)}</TableCell>
                                            <TableCell className={isRTL ? "text-right" : "text-left"}>
                                                {format(new Date(user.createdAt), "dd/MM/yyyy", { locale: ar })}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AccountsPage;

