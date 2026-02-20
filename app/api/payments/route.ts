import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: Get payment history for a specific purchase
export async function GET(req: NextRequest) {
    try {
        const { userId, user } = await auth();
        
        if (!userId || !user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Only admins and teachers can view payments
        if (user.role !== "ADMIN" && user.role !== "TEACHER") {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(req.url);
        const purchaseId = searchParams.get("purchaseId");

        if (!purchaseId) {
            return NextResponse.json(
                { error: "Purchase ID is required" },
                { status: 400 }
            );
        }

        const payments = await db.payment.findMany({
            where: {
                purchaseId: purchaseId
            },
            orderBy: {
                paymentNumber: "asc"
            },
            include: {
                purchase: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                fullName: true,
                                phoneNumber: true
                            }
                        },
                        course: {
                            select: {
                                id: true,
                                title: true,
                                price: true
                            }
                        }
                    }
                }
            }
        });

        return NextResponse.json(payments);
    } catch (error) {
        console.error("[PAYMENTS_GET]", error);
        return NextResponse.json(
            { error: "Internal Error" },
            { status: 500 }
        );
    }
}

// POST: Record a new payment
export async function POST(req: NextRequest) {
    try {
        const { userId, user } = await auth();
        
        if (!userId || !user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Only admins and teachers can record payments
        if (user.role !== "ADMIN" && user.role !== "TEACHER") {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        const { purchaseId, amount, notes } = await req.json();

        if (!purchaseId || !amount || amount <= 0) {
            return NextResponse.json(
                { error: "Purchase ID and valid amount are required" },
                { status: 400 }
            );
        }

        // Get the purchase with course info
        const purchase = await db.purchase.findUnique({
            where: {
                id: purchaseId
            },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true,
                        price: true
                    }
                },
                payments: {
                    orderBy: {
                        paymentNumber: "desc"
                    },
                    take: 1
                }
            }
        });

        if (!purchase) {
            return NextResponse.json(
                { error: "Purchase not found" },
                { status: 404 }
            );
        }

        // Use purchase coursePrice if available, otherwise fall back to course price
        const coursePrice = purchase.coursePrice ?? purchase.course.price ?? 0;
        const currentTotalPaid = purchase.totalPaid || 0;
        const newTotalPaid = currentTotalPaid + amount;

        // Check if payment exceeds course price
        if (newTotalPaid > coursePrice) {
            return NextResponse.json(
                { error: "Payment amount exceeds course price" },
                { status: 400 }
            );
        }

        // Get the next payment number
        const lastPayment = purchase.payments[0];
        const nextPaymentNumber = lastPayment ? lastPayment.paymentNumber + 1 : 1;

        // Create payment and update purchase in a transaction
        const result = await db.$transaction(async (tx) => {
            // Create the payment
            const payment = await tx.payment.create({
                data: {
                    purchaseId: purchaseId,
                    amount: amount,
                    paymentNumber: nextPaymentNumber,
                    notes: notes || null,
                    recordedBy: userId
                }
            });

            // Update purchase totalPaid
            await tx.purchase.update({
                where: {
                    id: purchaseId
                },
                data: {
                    totalPaid: newTotalPaid
                }
            });

            return payment;
        });

        // Fetch the complete payment with relations
        const createdPayment = await db.payment.findUnique({
            where: {
                id: result.id
            },
            include: {
                purchase: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                fullName: true,
                                phoneNumber: true
                            }
                        },
                        course: {
                            select: {
                                id: true,
                                title: true,
                                price: true
                            }
                        }
                    }
                }
            }
        });

        return NextResponse.json({
            success: true,
            payment: createdPayment
        });
    } catch (error) {
        console.error("[PAYMENTS_POST]", error);
        return NextResponse.json(
            { error: "Internal Error" },
            { status: 500 }
        );
    }
}

