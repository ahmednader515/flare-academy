"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Plus, DollarSign, Edit2, Save, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/lib/contexts/language-context";
import { exportToExcel } from "@/lib/utils/excel-export";
import axios from "axios";

interface Purchase {
    id: string;
    userId: string;
    courseId: string;
    totalPaid: number;
    coursePrice: number | null;
    user: {
        id: string;
        fullName: string;
        phoneNumber: string;
    };
    course: {
        id: string;
        title: string;
        price: number;
    };
    payments: Array<{
        id: string;
        amount: number;
        paymentNumber: number;
        notes: string | null;
        createdAt: string;
    }>;
}

const PaymentsPage = () => {
    const { t, isRTL } = useLanguage();
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentNotes, setPaymentNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingPricePurchaseId, setEditingPricePurchaseId] = useState<string | null>(null);
    const [editingPrice, setEditingPrice] = useState("");
    const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);

    useEffect(() => {
        fetchPurchases();
    }, []);

    const fetchPurchases = async () => {
        try {
            setLoading(true);
            const response = await axios.get("/api/purchases");
            setPurchases(response.data);
        } catch (error) {
            console.error("[PAYMENTS_FETCH]", error);
            toast.error(t("admin.failedToLoadPayments"));
        } finally {
            setLoading(false);
        }
    };

    const handleRecordPayment = async () => {
        if (!selectedPurchase) return;

        const amount = parseFloat(paymentAmount);
        if (!amount || amount <= 0) {
            toast.error(t("admin.pleaseEnterValidPaymentAmount"));
            return;
        }

        const coursePrice = selectedPurchase.coursePrice ?? selectedPurchase.course.price ?? 0;
        const currentTotalPaid = selectedPurchase.totalPaid || 0;
        const newTotalPaid = currentTotalPaid + amount;

        if (newTotalPaid > coursePrice) {
            toast.error(t("admin.paymentAmountExceedsCoursePrice"));
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await axios.post("/api/payments", {
                purchaseId: selectedPurchase.id,
                amount: amount,
                notes: paymentNotes
            });

            if (response.data.success) {
                toast.success(t("admin.paymentRecorded"));
                setIsPaymentDialogOpen(false);
                setPaymentAmount("");
                setPaymentNotes("");
                setSelectedPurchase(null);
                fetchPurchases();
            }
        } catch (error: any) {
            console.error("[PAYMENT_RECORD]", error);
            toast.error(error.response?.data?.error || t("admin.paymentFailed"));
        } finally {
            setIsSubmitting(false);
        }
    };

    const openPaymentDialog = (purchase: Purchase) => {
        setSelectedPurchase(purchase);
        setPaymentAmount("");
        setPaymentNotes("");
        setIsPaymentDialogOpen(true);
    };

    const handleStartEditPrice = (purchase: Purchase) => {
        const currentPrice = purchase.coursePrice ?? purchase.course.price ?? 0;
        setEditingPricePurchaseId(purchase.id);
        setEditingPrice(currentPrice.toString());
    };

    const handleCancelEditPrice = () => {
        setEditingPricePurchaseId(null);
        setEditingPrice("");
    };

    const handleSavePrice = async (purchase: Purchase) => {
        const newPrice = parseFloat(editingPrice);
        if (isNaN(newPrice) || newPrice < 0) {
            toast.error(t("admin.pleaseEnterValidPrice") || "Please enter a valid price");
            return;
        }

        if (newPrice < purchase.totalPaid) {
            toast.error(t("admin.priceCannotBeLessThanPaid") || "Price cannot be less than total paid");
            return;
        }

        try {
            setIsUpdatingPrice(true);
            const response = await axios.patch(`/api/purchases/${purchase.id}/course-price`, {
                coursePrice: newPrice
            });

            if (response.data.success) {
                toast.success(t("admin.coursePriceUpdated") || "Course price updated successfully");
                setEditingPricePurchaseId(null);
                setEditingPrice("");
                fetchPurchases();
            }
        } catch (error: any) {
            console.error("[UPDATE_PRICE]", error);
            toast.error(error.response?.data?.error || t("admin.failedToUpdatePrice") || "Failed to update price");
        } finally {
            setIsUpdatingPrice(false);
        }
    };

    const exportPaymentsToExcel = () => {
        const filteredPurchases = purchases.filter(p => {
            const searchLower = searchTerm.toLowerCase();
            return (
                p.user.fullName.toLowerCase().includes(searchLower) ||
                p.user.phoneNumber.includes(searchLower) ||
                p.course.title.toLowerCase().includes(searchLower)
            );
        });

        const exportData = filteredPurchases.map((purchase, index) => {
            const coursePrice = purchase.coursePrice ?? purchase.course.price ?? 0;
            const totalPaid = purchase.totalPaid || 0;
            const remaining = Math.max(0, coursePrice - totalPaid);
            const isFullyPaid = remaining === 0;

            return {
                "#": index + 1,
                "Student Name": purchase.user.fullName,
                "Phone Number": purchase.user.phoneNumber,
                "Course": purchase.course.title,
                "Course Price (EGP)": coursePrice,
                "Total Paid (EGP)": totalPaid,
                "Remaining (EGP)": remaining,
                "Status": isFullyPaid ? "Fully Paid" : "Pending",
                "Number of Payments": purchase.payments.length
            };
        });

        exportToExcel(exportData, [
            { key: "#" as any, label: "#" },
            { key: "Student Name" as any, label: "Student Name" },
            { key: "Phone Number" as any, label: "Phone Number" },
            { key: "Course" as any, label: "Course" },
            { key: "Course Price (EGP)" as any, label: "Course Price (EGP)" },
            { key: "Total Paid (EGP)" as any, label: "Total Paid (EGP)" },
            { key: "Remaining (EGP)" as any, label: "Remaining (EGP)" },
            { key: "Status" as any, label: "Status" },
            { key: "Number of Payments" as any, label: "Number of Payments" }
        ], {
            filename: "payment_registration",
            sheetName: "Payments"
        });
    };

    const filteredPurchases = purchases.filter(p => {
        const searchLower = searchTerm.toLowerCase();
        return (
            p.user.fullName.toLowerCase().includes(searchLower) ||
            p.user.phoneNumber.includes(searchLower) ||
            p.course.title.toLowerCase().includes(searchLower)
        );
    });

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
                    <h1 className="text-3xl font-bold">{t("admin.paymentRegistration")}</h1>
                    <p className="text-muted-foreground mt-1">
                        {t("admin.recordAndTrackPayments")}
                    </p>
                </div>
                <Button onClick={exportPaymentsToExcel} variant="outline">
                    <Download className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {t("dashboard.exportToExcel")}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>{t("admin.allPayments")}</CardTitle>
                        <div className="flex items-center gap-2">
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
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background z-10">
                                <TableRow>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>#</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t("dashboard.studentName")}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t("dashboard.phoneNumber")}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t("dashboard.course")}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t("admin.coursePrice")}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t("admin.totalPaid")}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t("admin.remaining")}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t("dashboard.status")}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t("dashboard.actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPurchases.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                            {t("admin.noPaymentsFound")}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredPurchases.map((purchase, index) => {
                                        const coursePrice = purchase.coursePrice ?? purchase.course.price ?? 0;
                                        const totalPaid = purchase.totalPaid || 0;
                                        const remaining = Math.max(0, coursePrice - totalPaid);
                                        const isFullyPaid = remaining === 0;
                                        const isEditing = editingPricePurchaseId === purchase.id;

                                        return (
                                            <TableRow key={purchase.id}>
                                                <TableCell className={isRTL ? "text-right" : "text-left"}>{index + 1}</TableCell>
                                                <TableCell className={`font-medium ${isRTL ? "text-right" : "text-left"}`}>{purchase.user.fullName}</TableCell>
                                                <TableCell className={isRTL ? "text-right" : "text-left"}>{purchase.user.phoneNumber}</TableCell>
                                                <TableCell className={isRTL ? "text-right" : "text-left"}>{purchase.course.title}</TableCell>
                                                <TableCell className={isRTL ? "text-right" : "text-left"}>
                                                    {isEditing ? (
                                                        <div className="flex items-center gap-2">
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                value={editingPrice}
                                                                onChange={(e) => setEditingPrice(e.target.value)}
                                                                className="w-24 h-8"
                                                                disabled={isUpdatingPrice}
                                                            />
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleSavePrice(purchase)}
                                                                disabled={isUpdatingPrice}
                                                                className="h-8 w-8 p-0"
                                                            >
                                                                <Save className="h-3 w-3" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={handleCancelEditPrice}
                                                                disabled={isUpdatingPrice}
                                                                className="h-8 w-8 p-0"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <span>{coursePrice.toFixed(2)} {t("dashboard.egp")}</span>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleStartEditPrice(purchase)}
                                                                className="h-6 w-6 p-0"
                                                                title={t("admin.editPrice") || "Edit price"}
                                                            >
                                                                <Edit2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className={isRTL ? "text-right" : "text-left"}>{totalPaid.toFixed(2)} {t("dashboard.egp")}</TableCell>
                                                <TableCell className={isRTL ? "text-right" : "text-left"}>
                                                    <span className={remaining > 0 ? "text-red-600 font-semibold" : "text-green-600"}>
                                                        {remaining.toFixed(2)} {t("dashboard.egp")}
                                                    </span>
                                                </TableCell>
                                                <TableCell className={isRTL ? "text-right" : "text-left"}>
                                                    <Badge variant={isFullyPaid ? "default" : "secondary"}>
                                                        {isFullyPaid ? t("admin.fullyPaid") : t("admin.pending")}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className={isRTL ? "text-right" : "text-left"}>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => openPaymentDialog(purchase)}
                                                        disabled={isFullyPaid}
                                                    >
                                                        <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                                        {t("admin.recordPayment")}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isPaymentDialogOpen} onOpenChange={(open) => {
                setIsPaymentDialogOpen(open);
                if (!open) {
                    // Cancel any ongoing price edit when dialog closes
                    setEditingPricePurchaseId(null);
                    setEditingPrice("");
                }
            }}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{t("admin.recordPayment")}</DialogTitle>
                        <DialogDescription>
                            {t("admin.recordPaymentFor")} {selectedPurchase?.user.fullName} - {selectedPurchase?.course.title}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>{t("admin.coursePrice")}</Label>
                                {selectedPurchase && editingPricePurchaseId !== selectedPurchase.id && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleStartEditPrice(selectedPurchase)}
                                        className="h-7"
                                    >
                                        <Edit2 className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                                        {t("admin.edit") || "Edit"}
                                    </Button>
                                )}
                            </div>
                            {selectedPurchase && editingPricePurchaseId === selectedPurchase.id ? (
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={editingPrice}
                                        onChange={(e) => setEditingPrice(e.target.value)}
                                        disabled={isUpdatingPrice}
                                    />
                                    <span className="text-sm text-muted-foreground">{t("dashboard.egp")}</span>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleSavePrice(selectedPurchase)}
                                        disabled={isUpdatingPrice}
                                        className="h-8 w-8 p-0"
                                    >
                                        <Save className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleCancelEditPrice}
                                        disabled={isUpdatingPrice}
                                        className="h-8 w-8 p-0"
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ) : (
                                <Input
                                    value={`${(selectedPurchase?.coursePrice ?? selectedPurchase?.course.price ?? 0).toFixed(2)} ${t("dashboard.egp")}`}
                                    disabled
                                />
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>{t("admin.totalPaid")}</Label>
                            <Input
                                value={`${selectedPurchase?.totalPaid || 0} ${t("dashboard.egp")}`}
                                disabled
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("admin.remaining")}</Label>
                            <Input
                                value={`${Math.max(0, ((selectedPurchase?.coursePrice ?? selectedPurchase?.course.price ?? 0) - (selectedPurchase?.totalPaid || 0))).toFixed(2)} ${t("dashboard.egp")}`}
                                disabled
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="amount">{t("admin.paymentAmount")} ({t("dashboard.egp")}) *</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                placeholder={t("admin.enterPaymentAmount")}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notes">{t("admin.paymentNotes")} ({t("common.optional")})</Label>
                            <Textarea
                                id="notes"
                                value={paymentNotes}
                                onChange={(e) => setPaymentNotes(e.target.value)}
                                placeholder={t("admin.addNotesAboutPayment")}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsPaymentDialogOpen(false)}
                            disabled={isSubmitting}
                        >
                            {t("common.cancel")}
                        </Button>
                        <Button
                            onClick={handleRecordPayment}
                            disabled={isSubmitting || !paymentAmount}
                        >
                            {isSubmitting ? t("admin.recording") : t("admin.recordPayment")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PaymentsPage;

