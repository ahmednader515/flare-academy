import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// PATCH: Update the course price for a purchase (Admin only)
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ purchaseId: string }> }
) {
    try {
        const { userId, user } = await auth();
        
        if (!userId || !user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Only admins can update course price
        if (user.role !== "ADMIN") {
            return NextResponse.json(
                { error: "Forbidden - Only admins can update course price" },
                { status: 403 }
            );
        }

        const { purchaseId } = await params;
        const { coursePrice } = await req.json();

        if (coursePrice === undefined || coursePrice === null) {
            return NextResponse.json(
                { error: "Course price is required" },
                { status: 400 }
            );
        }

        if (coursePrice < 0) {
            return NextResponse.json(
                { error: "Course price must be non-negative" },
                { status: 400 }
            );
        }

        // Get the purchase to check current totalPaid
        const purchase = await db.purchase.findUnique({
            where: {
                id: purchaseId
            }
        });

        if (!purchase) {
            return NextResponse.json(
                { error: "Purchase not found" },
                { status: 404 }
            );
        }

        // Check if the new course price is less than total paid
        if (coursePrice < purchase.totalPaid) {
            return NextResponse.json(
                { error: "Course price cannot be less than total amount paid" },
                { status: 400 }
            );
        }

        // Update the purchase course price
        const updatedPurchase = await db.purchase.update({
            where: {
                id: purchaseId
            },
            data: {
                coursePrice: coursePrice
            },
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
        });

        return NextResponse.json({
            success: true,
            purchase: updatedPurchase
        });
    } catch (error) {
        console.error("[UPDATE_PURCHASE_COURSE_PRICE]", error);
        return NextResponse.json(
            { error: "Internal Error" },
            { status: 500 }
        );
    }
}

