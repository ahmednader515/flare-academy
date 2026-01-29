"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Plus, DollarSign } from "lucide-react";
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
            toast.error("Failed to load payments");
        } finally {
            setLoading(false);
        }
    };

    const handleRecordPayment = async () => {
        if (!selectedPurchase) return;

        const amount = parseFloat(paymentAmount);
        if (!amount || amount <= 0) {
            toast.error("Please enter a valid payment amount");
            return;
        }

        const coursePrice = selectedPurchase.course.price || 0;
        const currentTotalPaid = selectedPurchase.totalPaid || 0;
        const newTotalPaid = currentTotalPaid + amount;

        if (newTotalPaid > coursePrice) {
            toast.error("Payment amount exceeds course price");
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
                toast.success("Payment recorded successfully");
                setIsPaymentDialogOpen(false);
                setPaymentAmount("");
                setPaymentNotes("");
                setSelectedPurchase(null);
                fetchPurchases();
            }
        } catch (error: any) {
            console.error("[PAYMENT_RECORD]", error);
            toast.error(error.response?.data?.error || "Failed to record payment");
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
            const coursePrice = purchase.course.price || 0;
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
                    <h1 className="text-3xl font-bold">Payment Registration</h1>
                    <p className="text-muted-foreground mt-1">
                        Record and track student payments for courses
                    </p>
                </div>
                <Button onClick={exportPaymentsToExcel} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export to Excel
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>All Payments</CardTitle>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4`} />
                                <Input
                                    placeholder="Search by student name, phone, or course..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className={`${isRTL ? 'pr-10' : 'pl-10'} w-64`}
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>#</TableHead>
                                    <TableHead>Student Name</TableHead>
                                    <TableHead>Phone Number</TableHead>
                                    <TableHead>Course</TableHead>
                                    <TableHead>Course Price</TableHead>
                                    <TableHead>Total Paid</TableHead>
                                    <TableHead>Remaining</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPurchases.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                            No payments found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredPurchases.map((purchase, index) => {
                                        const coursePrice = purchase.course.price || 0;
                                        const totalPaid = purchase.totalPaid || 0;
                                        const remaining = Math.max(0, coursePrice - totalPaid);
                                        const isFullyPaid = remaining === 0;

                                        return (
                                            <TableRow key={purchase.id}>
                                                <TableCell>{index + 1}</TableCell>
                                                <TableCell className="font-medium">{purchase.user.fullName}</TableCell>
                                                <TableCell>{purchase.user.phoneNumber}</TableCell>
                                                <TableCell>{purchase.course.title}</TableCell>
                                                <TableCell>{coursePrice.toFixed(2)} EGP</TableCell>
                                                <TableCell>{totalPaid.toFixed(2)} EGP</TableCell>
                                                <TableCell>
                                                    <span className={remaining > 0 ? "text-red-600 font-semibold" : "text-green-600"}>
                                                        {remaining.toFixed(2)} EGP
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={isFullyPaid ? "default" : "secondary"}>
                                                        {isFullyPaid ? "Fully Paid" : "Pending"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => openPaymentDialog(purchase)}
                                                        disabled={isFullyPaid}
                                                    >
                                                        <Plus className="h-4 w-4 mr-2" />
                                                        Record Payment
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

            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Record Payment</DialogTitle>
                        <DialogDescription>
                            Record a payment for {selectedPurchase?.user.fullName} - {selectedPurchase?.course.title}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Course Price</Label>
                            <Input
                                value={`${selectedPurchase?.course.price || 0} EGP`}
                                disabled
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Total Paid</Label>
                            <Input
                                value={`${selectedPurchase?.totalPaid || 0} EGP`}
                                disabled
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Remaining</Label>
                            <Input
                                value={`${Math.max(0, (selectedPurchase?.course.price || 0) - (selectedPurchase?.totalPaid || 0))} EGP`}
                                disabled
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="amount">Payment Amount (EGP) *</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                placeholder="Enter payment amount"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes (Optional)</Label>
                            <Textarea
                                id="notes"
                                value={paymentNotes}
                                onChange={(e) => setPaymentNotes(e.target.value)}
                                placeholder="Add any notes about this payment..."
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
                            Cancel
                        </Button>
                        <Button
                            onClick={handleRecordPayment}
                            disabled={isSubmitting || !paymentAmount}
                        >
                            {isSubmitting ? "Recording..." : "Record Payment"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PaymentsPage;

