"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Edit, Trash2, Download, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import { useLanguage } from "@/lib/contexts/language-context";
import { exportToExcel } from "@/lib/utils/excel-export";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface User {
    id: string;
    fullName: string;
    phoneNumber: string;
    email: string;
    college?: string;
    faculty?: string;
    level?: string;
    role: string;
    balance: number;
    createdAt: string;
    updatedAt: string;
    _count: {
        courses: number;
        purchases: number;
        userProgress: number;
    };
}

interface EditUserData {
    fullName: string;
    phoneNumber: string;
    email: string;
    college: string;
    faculty: string;
    level: string;
    role: string;
}

const UsersPage = () => {
    const { t, isRTL } = useLanguage();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editData, setEditData] = useState<EditUserData>({
        fullName: "",
        phoneNumber: "",
        email: "",
        college: "",
        faculty: "",
        level: "",
        role: ""
    });
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [selectedStudentCourses, setSelectedStudentCourses] = useState<{ userId: string; userName: string; courses: any[] } | null>(null);
    const [isCoursesDialogOpen, setIsCoursesDialogOpen] = useState(false);
    const [loadingCourses, setLoadingCourses] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch("/api/teacher/users");
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            } else {
                console.error("Error fetching users:", response.status, response.statusText);
                if (response.status === 403) {
                    toast.error(t('teacher.noAccessToPage'));
                } else {
                    toast.error(t('teacher.loadStudentsError'));
                }
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error(t('teacher.loadStudentsError'));
        } finally {
            setLoading(false);
        }
    };

    const handleEditUser = (user: User) => {
        setEditingUser(user);
        setEditData({
            fullName: user.fullName,
            phoneNumber: user.phoneNumber,
            email: user.email,
            college: user.college || "",
            faculty: user.faculty || "",
            level: user.level || "",
            role: user.role
        });
        setIsEditDialogOpen(true);
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;

        try {
            const response = await fetch(`/api/teacher/users/${editingUser.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(editData),
            });

            if (response.ok) {
                const userType = editingUser.role === "TEACHER" ? t('teacher.teacher') : editingUser.role === "ADMIN" ? t('teacher.admin') : t('teacher.student');
                toast.success(t('teacher.updateUserSuccess') + " " + userType);
                setIsEditDialogOpen(false);
                setEditingUser(null);
                fetchUsers(); // Refresh the list
            } else {
                const error = await response.text();
                console.error("Error updating user:", response.status, error);
                if (response.status === 403) {
                    toast.error(t('teacher.noPermissionToEdit'));
                } else if (response.status === 404) {
                    toast.error(t('teacher.userNotFound'));
                } else if (response.status === 400) {
                    toast.error(error || t('teacher.invalidData'));
                } else {
                    toast.error(t('teacher.updateDataError'));
                }
            }
        } catch (error) {
            console.error("Error updating user:", error);
            toast.error(t('teacher.updateStudentDataError'));
        }
    };

    const handleDeleteUser = async (userId: string) => {
        setIsDeleting(true);
        try {
            const response = await fetch(`/api/teacher/users/${userId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                toast.success(t('teacher.deleteUserSuccess'));
                fetchUsers(); // Refresh the list
            } else {
                const error = await response.text();
                console.error("Error deleting user:", response.status, error);
                if (response.status === 403) {
                    toast.error(t('teacher.noPermissionToDelete'));
                } else if (response.status === 404) {
                    toast.error(t('teacher.userNotFound'));
                } else {
                    toast.error(error || t('teacher.deleteUserError'));
                }
            }
        } catch (error) {
            console.error("Error deleting user:", error);
            toast.error(t('teacher.deleteStudentError'));
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phoneNumber.includes(searchTerm)
    );

    // Separate users by role
    let studentUsers = filteredUsers.filter(user => user.role === "USER");
    const staffUsers = filteredUsers.filter(user => user.role === "TEACHER" || user.role === "ADMIN");

    // Sorting logic
    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    if (sortConfig) {
        studentUsers = [...studentUsers].sort((a, b) => {
            let aValue: any = a[sortConfig.key as keyof User];
            let bValue: any = b[sortConfig.key as keyof User];

            // Handle nested properties
            if (sortConfig.key === '_count') {
                aValue = a._count.purchases;
                bValue = b._count.purchases;
            }

            // Handle null/undefined values
            if (aValue == null) aValue = '';
            if (bValue == null) bValue = '';

            // Handle dates
            if (sortConfig.key === 'createdAt') {
                aValue = new Date(aValue).getTime();
                bValue = new Date(bValue).getTime();
            }

            // Handle numbers
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
            }

            // Handle strings
            const aStr = String(aValue).toLowerCase();
            const bStr = String(bValue).toLowerCase();

            if (sortConfig.direction === 'asc') {
                return aStr > bStr ? 1 : aStr < bStr ? -1 : 0;
            } else {
                return aStr < bStr ? 1 : aStr > bStr ? -1 : 0;
            }
        });
    }

    const getSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) {
            return <ArrowUpDown className="h-4 w-4 ml-2" />;
        }
        return sortConfig.direction === 'asc' 
            ? <ArrowUp className="h-4 w-4 ml-2" />
            : <ArrowDown className="h-4 w-4 ml-2" />;
    };

    const handleViewCourses = async (userId: string, userName: string) => {
        setLoadingCourses(true);
        setIsCoursesDialogOpen(true);
        try {
            const response = await fetch(`/api/teacher/users/${userId}/courses`);
            if (response.ok) {
                const data = await response.json();
                setSelectedStudentCourses({
                    userId,
                    userName,
                    courses: data.courses || []
                });
            } else {
                toast.error(t('common.error') || 'Error loading courses');
            }
        } catch (error) {
            console.error("Error fetching courses:", error);
            toast.error(t('common.error') || 'Error loading courses');
        } finally {
            setLoadingCourses(false);
        }
    };

    const handleExportStudents = () => {
        const headers = [
            { key: 'fullName' as any, label: t('teacher.name') },
            { key: 'phoneNumber' as any, label: t('teacher.phoneNumber') },
            { key: 'email' as any, label: t('teacher.email') },
            { key: 'college' as any, label: t('teacher.college') || 'الكلية' },
            { key: 'faculty' as any, label: t('teacher.faculty') || 'الكلية' },
            { key: 'level' as any, label: t('teacher.level') || 'المستوى' },
            { key: 'balance' as any, label: t('teacher.balance') },
            { key: 'purchasedCourses' as any, label: t('teacher.purchasedCourses') },
            { key: 'createdAt' as any, label: t('teacher.registrationDate') },
        ];

        // Prepare data with formatted values
        const exportData = studentUsers.map(user => ({
            fullName: user.fullName,
            phoneNumber: user.phoneNumber,
            email: user.email,
            college: user.college || '',
            faculty: user.faculty || '',
            level: user.level || '',
            balance: user.balance,
            purchasedCourses: user._count?.purchases || 0,
            createdAt: format(new Date(user.createdAt), "dd/MM/yyyy", { locale: ar }),
        }));

        exportToExcel(exportData, headers, {
            filename: 'students_list',
            sheetName: t('teacher.studentsList') || 'Students',
        });

        toast.success(t('teacher.exportSuccess') || 'تم تصدير البيانات بنجاح');
    };

    // Debug logging
    console.log("All users:", users);
    console.log("Filtered users:", filteredUsers);
    console.log("Student users:", studentUsers);
    console.log("Staff users:", staffUsers);
    console.log("Admin users:", filteredUsers.filter(user => user.role === "ADMIN"));

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">{t('teacher.loading')}</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {t('teacher.userManagement')}
                </h1>
            </div>

            {/* Staff Table (Admins and Teachers) */}
            {staffUsers.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t('teacher.adminsAndTeachers')}</CardTitle>
                        <div className="flex items-center space-x-2">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('teacher.searchByNameOrPhone')}
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
                                    <TableHead>{t('teacher.name')}</TableHead>
                                    <TableHead>{t('teacher.phoneNumber')}</TableHead>
                                    <TableHead>{t('teacher.email')}</TableHead>
                                    <TableHead>{t('teacher.role')}</TableHead>
                                    <TableHead>{t('teacher.registrationDate')}</TableHead>
                                    <TableHead>{t('teacher.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {staffUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            {user.fullName}
                                        </TableCell>
                                        <TableCell>{user.phoneNumber}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <Badge 
                                                variant="secondary"
                                                className={
                                                    user.role === "TEACHER" ? "bg-[#FF6B35] text-white hover:bg-[#FF6B35]/90" : 
                                                    user.role === "ADMIN" ? "bg-orange-600 text-white hover:bg-orange-700" : 
                                                    ""
                                                }
                                            >
                                                {user.role === "TEACHER" ? t('teacher.teacher') : 
                                                 user.role === "ADMIN" ? t('teacher.admin') : user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            {format(new Date(user.createdAt), "dd/MM/yyyy", { locale: ar })}
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            <div className="flex items-center gap-2">
                                                <Dialog open={isEditDialogOpen && editingUser?.id === user.id} onOpenChange={(open) => {
                                                    if (!open) {
                                                        setIsEditDialogOpen(false);
                                                        setEditingUser(null);
                                                    }
                                                }}>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEditUser(user)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>{t('teacher.editData')} {user.role === "TEACHER" ? t('teacher.teacher') : t('teacher.admin')}</DialogTitle>
                                                            <DialogDescription>
                                                                {t('teacher.editInformation')} {user.role === "TEACHER" ? t('teacher.teacher') : t('teacher.admin')}
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="grid gap-4 py-4">
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="fullName" className="text-right">
                                                                    {t('teacher.name')}
                                                                </Label>
                                                                <Input
                                                                    id="fullName"
                                                                    value={editData.fullName}
                                                                    onChange={(e) => setEditData({...editData, fullName: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="phoneNumber" className="text-right">
                                                                    {t('teacher.phoneNumber')}
                                                                </Label>
                                                                <Input
                                                                    id="phoneNumber"
                                                                    value={editData.phoneNumber}
                                                                    onChange={(e) => setEditData({...editData, phoneNumber: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="email" className="text-right">
                                                                    {t('teacher.email')}
                                                                </Label>
                                                                <Input
                                                                    id="email"
                                                                    type="email"
                                                                    value={editData.email}
                                                                    onChange={(e) => setEditData({...editData, email: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="role" className="text-right">
                                                                    {t('teacher.role')}
                                                                </Label>
                                                                <Select
                                                                    value={editData.role}
                                                                    onValueChange={(value) => setEditData({...editData, role: value})}
                                                                >
                                                                    <SelectTrigger className="col-span-3">
                                                                        <SelectValue placeholder={t('teacher.selectRole')} />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="USER">{t('teacher.student')}</SelectItem>
                                                                        <SelectItem value="TEACHER">{t('teacher.teacher')}</SelectItem>
                                                                        <SelectItem value="ADMIN">{t('teacher.admin')}</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                        <DialogFooter>
                                                            <Button variant="outline" onClick={() => {
                                                                setIsEditDialogOpen(false);
                                                                setEditingUser(null);
                                                            }}>
                                                                {t('common.cancel')}
                                                            </Button>
                                                            <Button onClick={handleSaveUser}>
                                                                {t('teacher.saveChanges')}
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                                
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            disabled={isDeleting}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>{t('teacher.areYouSure')}</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                {t('teacher.deleteUserWarning')} {user.role === "TEACHER" ? t('teacher.teacher') : t('teacher.admin')} {t('teacher.andAllAssociatedData')}
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDeleteUser(user.id)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                {t('teacher.delete')}
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
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
                        <div className="flex items-center justify-between">
                            <CardTitle>{t('teacher.studentsList')}</CardTitle>
                            <Button
                                onClick={handleExportStudents}
                                variant="outline"
                                className="flex items-center gap-2"
                            >
                                <Download className="h-4 w-4" />
                                {t('teacher.exportToExcel') || 'تصدير Excel'}
                            </Button>
                        </div>
                        <div className="flex items-center space-x-2 mt-4">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('teacher.searchByNameOrPhone')}
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
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>
                                        <Button
                                            variant="ghost"
                                            onClick={() => handleSort('fullName')}
                                            className="h-auto p-0 font-semibold hover:bg-transparent"
                                        >
                                            {t('teacher.name')}
                                            {getSortIcon('fullName')}
                                        </Button>
                                    </TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>
                                        <Button
                                            variant="ghost"
                                            onClick={() => handleSort('phoneNumber')}
                                            className="h-auto p-0 font-semibold hover:bg-transparent"
                                        >
                                            {t('teacher.phoneNumber')}
                                            {getSortIcon('phoneNumber')}
                                        </Button>
                                    </TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>
                                        <Button
                                            variant="ghost"
                                            onClick={() => handleSort('email')}
                                            className="h-auto p-0 font-semibold hover:bg-transparent"
                                        >
                                            {t('teacher.email')}
                                            {getSortIcon('email')}
                                        </Button>
                                    </TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>
                                        <Button
                                            variant="ghost"
                                            onClick={() => handleSort('college')}
                                            className="h-auto p-0 font-semibold hover:bg-transparent"
                                        >
                                            {t('dashboard.college') || 'الجامعة'}
                                            {getSortIcon('college')}
                                        </Button>
                                    </TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>
                                        <Button
                                            variant="ghost"
                                            onClick={() => handleSort('balance')}
                                            className="h-auto p-0 font-semibold hover:bg-transparent"
                                        >
                                            {t('teacher.balance')}
                                            {getSortIcon('balance')}
                                        </Button>
                                    </TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>
                                        <Button
                                            variant="ghost"
                                            onClick={() => handleSort('_count')}
                                            className="h-auto p-0 font-semibold hover:bg-transparent"
                                        >
                                            {t('teacher.purchasedCourses')}
                                            {getSortIcon('_count')}
                                        </Button>
                                    </TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>
                                        <Button
                                            variant="ghost"
                                            onClick={() => handleSort('createdAt')}
                                            className="h-auto p-0 font-semibold hover:bg-transparent"
                                        >
                                            {t('teacher.registrationDate')}
                                            {getSortIcon('createdAt')}
                                        </Button>
                                    </TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('teacher.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {studentUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className={`font-medium ${isRTL ? "text-right" : "text-left"}`}>
                                            {user.fullName}
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>{user.phoneNumber}</TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>{user.email}</TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            {user.college || "-"}
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            <Badge variant="secondary">
                                                {user.balance} {t('teacher.currency')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            <Button
                                                variant="ghost"
                                                onClick={() => handleViewCourses(user.id, user.fullName)}
                                                className="h-auto p-0 hover:bg-transparent"
                                            >
                                                <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                                                    {user._count.purchases}
                                                </Badge>
                                            </Button>
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            {format(new Date(user.createdAt), "dd/MM/yyyy", { locale: ar })}
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            <div className="flex items-center gap-2">
                                                <Dialog open={isEditDialogOpen && editingUser?.id === user.id} onOpenChange={(open) => {
                                                    if (!open) {
                                                        setIsEditDialogOpen(false);
                                                        setEditingUser(null);
                                                    }
                                                }}>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEditUser(user)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>{t('teacher.editStudentData')}</DialogTitle>
                                                            <DialogDescription>
                                                                {t('teacher.editStudentInformation')}
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="grid gap-4 py-4">
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="fullName" className="text-right">
                                                                    {t('teacher.name')}
                                                                </Label>
                                                                <Input
                                                                    id="fullName"
                                                                    value={editData.fullName}
                                                                    onChange={(e) => setEditData({...editData, fullName: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="phoneNumber" className="text-right">
                                                                    {t('teacher.phoneNumber')}
                                                                </Label>
                                                                <Input
                                                                    id="phoneNumber"
                                                                    value={editData.phoneNumber}
                                                                    onChange={(e) => setEditData({...editData, phoneNumber: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="email" className="text-right">
                                                                    {t('teacher.email')}
                                                                </Label>
                                                                <Input
                                                                    id="email"
                                                                    type="email"
                                                                    value={editData.email}
                                                                    onChange={(e) => setEditData({...editData, email: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="role" className="text-right">
                                                                    {t('teacher.role')}
                                                                </Label>
                                                                <Select
                                                                    value={editData.role}
                                                                    onValueChange={(value) => setEditData({...editData, role: value})}
                                                                >
                                                                    <SelectTrigger className="col-span-3">
                                                                        <SelectValue placeholder={t('teacher.selectRole')} />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="USER">{t('teacher.student')}</SelectItem>
                                                                        <SelectItem value="TEACHER">{t('teacher.teacher')}</SelectItem>
                                                                        <SelectItem value="ADMIN">{t('teacher.admin')}</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                        <DialogFooter>
                                                            <Button variant="outline" onClick={() => {
                                                                setIsEditDialogOpen(false);
                                                                setEditingUser(null);
                                                            }}>
                                                                {t('common.cancel')}
                                                            </Button>
                                                            <Button onClick={handleSaveUser}>
                                                                {t('teacher.saveChanges')}
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                                
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            disabled={isDeleting}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>{t('teacher.areYouSure')}</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                {t('teacher.deleteStudentWarning')} {t('teacher.andAllAssociatedData')}
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDeleteUser(user.id)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                {t('teacher.delete')}
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {staffUsers.length === 0 && studentUsers.length === 0 && !loading && (
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center text-muted-foreground">
                            {t('teacher.noUsersRegistered')}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Courses Dialog */}
            <Dialog open={isCoursesDialogOpen} onOpenChange={setIsCoursesDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {t('teacher.purchasedCourses') || 'Purchased Courses'} - {selectedStudentCourses?.userName}
                        </DialogTitle>
                        <DialogDescription>
                            {t('dashboard.studentCoursesDescription') || 'Courses enrolled by this student'}
                        </DialogDescription>
                    </DialogHeader>
                    {loadingCourses ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent" />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {selectedStudentCourses?.courses && selectedStudentCourses.courses.length > 0 ? (
                                selectedStudentCourses.courses.map((course: any) => (
                                    <Card key={course.id} className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="font-semibold">{course.title}</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    {course.isPublished ? t('dashboard.published') : t('dashboard.draft')}
                                                </p>
                                            </div>
                                            {course.price !== null && (
                                                <Badge variant="secondary">
                                                    {course.price} {t('teacher.currency')}
                                                </Badge>
                                            )}
                                        </div>
                                    </Card>
                                ))
                            ) : (
                                <p className="text-center text-muted-foreground py-8">
                                    {t('dashboard.noCourses') || 'No courses enrolled'}
                                </p>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setIsCoursesDialogOpen(false)}>
                            {t('common.close') || 'Close'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default UsersPage;
