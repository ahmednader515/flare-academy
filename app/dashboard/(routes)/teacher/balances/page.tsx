"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Edit, Search, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/contexts/language-context";

interface User {
    id: string;
    fullName: string;
    phoneNumber: string;
    role: string;
    balance: number;
}

const TeacherBalancesPage = () => {
    const { t, isRTL } = useLanguage();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [newBalance, setNewBalance] = useState("");
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

    const handleBalanceUpdate = async () => {
        if (!selectedUser || !newBalance) {
            toast.error(t('dashboard.pleaseEnterNewBalance'));
            return;
        }

        try {
            const response = await fetch(`/api/teacher/users/${selectedUser.id}/balance`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ newBalance: parseFloat(newBalance) }),
            });

            if (response.ok) {
                toast.success(t('dashboard.balanceUpdateSuccess'));
                setNewBalance("");
                setIsDialogOpen(false);
                setSelectedUser(null);
                fetchUsers();
            } else {
                toast.error(t('dashboard.balanceUpdateError'));
            }
        } catch (error) {
            console.error("Error updating balance:", error);
            toast.error(t('dashboard.balanceUpdateError'));
        }
    };

    const filteredUsers = users.filter(user =>
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phoneNumber.includes(searchTerm)
    );

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
                    {t('dashboard.balanceManagement')}
                </h1>
            </div>

            {/* Students Table */}
            {studentUsers.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t('dashboard.studentsList')}</CardTitle>
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
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.currentBalance')}</TableHead>
                                    <TableHead className={isRTL ? "text-left" : "text-right"}>{t('dashboard.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {studentUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className={`font-medium ${isRTL ? "text-right" : "text-left"}`}>{user.fullName}</TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>{user.phoneNumber}</TableCell>
                                        <TableCell className={`flex items-center gap-2 ${isRTL ? "text-right" : "text-left"}`}>
                                            <Wallet className="h-4 w-4 text-green-600" />
                                            {user.balance.toFixed(2)} {t('dashboard.egyptianPound')}
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-left" : "text-right"}>
                                            <Button
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setNewBalance(user.balance.toString());
                                                    setIsDialogOpen(true);
                                                }}
                                                className="bg-[#FF6B35] hover:bg-[#FF6B35]/90"
                                            >
                                                <Edit className="h-4 w-4 mr-2" />
                                                {t('dashboard.updateBalance')}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {studentUsers.length === 0 && (
                <Card>
                    <CardContent className="text-center py-8">
                        <p className="text-muted-foreground">{t('dashboard.noStudentsFound')}</p>
                    </CardContent>
                </Card>
            )}

            {/* Balance Update Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('dashboard.updateBalance')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="balance">{t('dashboard.newBalance')}</Label>
                            <Input
                                id="balance"
                                type="number"
                                step="0.01"
                                value={newBalance}
                                onChange={(e) => setNewBalance(e.target.value)}
                                placeholder={t('dashboard.enterNewBalance')}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleBalanceUpdate} className="bg-[#FF6B35] hover:bg-[#FF6B35]/90">
                            {t('dashboard.updateBalance')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TeacherBalancesPage;
