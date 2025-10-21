"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useLanguage } from "@/lib/contexts/language-context";
import { Search, Eye, EyeOff, Key } from "lucide-react";

interface User {
    id: string;
    fullName: string;
    phoneNumber: string;
    role: string;
}

const TeacherPasswordsPage = () => {
    const { t, isRTL } = useLanguage();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch("/api/teacher/users");
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async () => {
        if (!selectedUser || !newPassword) {
            toast.error(t('dashboard.pleaseEnterNewPassword'));
            return;
        }

        try {
            const response = await fetch(`/api/teacher/users/${selectedUser.id}/password`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ newPassword }),
            });

            if (response.ok) {
                toast.success(t('dashboard.passwordChangeSuccess'));
                setNewPassword("");
                setIsDialogOpen(false);
                setSelectedUser(null);
            } else {
                toast.error(t('dashboard.passwordChangeError'));
            }
        } catch (error) {
            console.error("Error changing password:", error);
            toast.error(t('dashboard.passwordChangeError'));
        }
    };

    const filteredUsers = users.filter(user =>
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phoneNumber.includes(searchTerm)
    );

    const staffUsers = filteredUsers.filter(user => user.role === "ADMIN" || user.role === "TEACHER");
    const studentUsers = filteredUsers.filter(user => user.role === "USER");

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">{t('dashboard.loadingUsers')}</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {t('dashboard.passwordManagement')}
                </h1>
            </div>

            {/* Staff Table (Admins and Teachers) */}
            {staffUsers.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t('dashboard.staffMembers')}</CardTitle>
                        <div className="flex items-center space-x-2">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('dashboard.searchByNameOrPhone')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="max-w-sm"
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.name')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.phoneNumber')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.role')}</TableHead>
                                    <TableHead className={isRTL ? "text-left" : "text-right"}>{t('dashboard.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {staffUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className={`font-medium ${isRTL ? "text-right" : "text-left"}`}>{user.fullName}</TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>{user.phoneNumber}</TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                user.role === "ADMIN" 
                                                    ? "bg-red-100 text-red-800" 
                                                    : "bg-blue-100 text-blue-800"
                                            }`}>
                                                {user.role === "ADMIN" ? t('dashboard.admin') : t('dashboard.teacher')}
                                            </span>
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-left" : "text-right"}>
                                            <Button
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setNewPassword("");
                                                    setIsDialogOpen(true);
                                                }}
                                                className="bg-[#FF6B35] hover:bg-[#FF6B35]/90"
                                            >
                                                <Key className="h-4 w-4 mr-2" />
                                                {t('dashboard.changePassword')}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Students Table */}
            {studentUsers.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t('dashboard.students')}</CardTitle>
                        <div className="flex items-center space-x-2">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('dashboard.searchByNameOrPhone')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="max-w-sm"
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.studentName')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.phoneNumber')}</TableHead>
                                    <TableHead className={isRTL ? "text-left" : "text-right"}>{t('dashboard.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {studentUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className={`font-medium ${isRTL ? "text-right" : "text-left"}`}>{user.fullName}</TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>{user.phoneNumber}</TableCell>
                                        <TableCell className={isRTL ? "text-left" : "text-right"}>
                                            <Button
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setNewPassword("");
                                                    setIsDialogOpen(true);
                                                }}
                                                className="bg-[#FF6B35] hover:bg-[#FF6B35]/90"
                                            >
                                                <Key className="h-4 w-4 mr-2" />
                                                {t('dashboard.changePassword')}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {filteredUsers.length === 0 && (
                <Card>
                    <CardContent className="text-center py-8">
                        <p className="text-muted-foreground">{t('dashboard.noUsersFound')}</p>
                    </CardContent>
                </Card>
            )}

            {/* Password Change Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('dashboard.changePassword')}</DialogTitle>
                        <DialogDescription>
                            {t('dashboard.changePasswordFor')}: {selectedUser?.fullName}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">{t('dashboard.newPassword')}</label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder={t('dashboard.enterNewPassword')}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
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
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handlePasswordChange} className="bg-[#FF6B35] hover:bg-[#FF6B35]/90">
                            {t('dashboard.changePassword')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TeacherPasswordsPage;
