import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: Get all purchases with payment information
export async function GET(req: NextRequest) {
    try {
        const { userId, user } = await auth();
        
        if (!userId || !user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Only admins and teachers can view purchases
        if (user.role !== "ADMIN" && user.role !== "TEACHER") {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        const purchases = await db.purchase.findMany({
            where: {
                status: "ACTIVE"
            },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        phoneNumber: true,
                        college: true,
                        faculty: true
                    }
                },
                course: {
                    select: {
                        id: true,
                        title: true,
                        price: true
                    }
                },
                payments: {
                    orderBy: {
                        paymentNumber: "asc"
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return NextResponse.json(purchases);
    } catch (error) {
        console.error("[PURCHASES_GET]", error);
        return NextResponse.json(
            { error: "Internal Error" },
            { status: 500 }
        );
    }
}

