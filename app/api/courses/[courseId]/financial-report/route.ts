import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const { userId, user } = await auth();
        const resolvedParams = await params;
        
        if (!userId || !user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Only admins and teachers can view financial reports
        if (user.role !== "ADMIN" && user.role !== "TEACHER") {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        const courseId = resolvedParams.courseId;

        // Get course with all purchases
        const course = await db.course.findUnique({
            where: {
                id: courseId
            },
            include: {
                purchases: {
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
                        payments: {
                            orderBy: {
                                createdAt: "asc"
                            }
                        }
                    }
                }
            }
        });

        if (!course) {
            return NextResponse.json(
                { error: "Course not found" },
                { status: 404 }
            );
        }

        const coursePrice = course.price || 0;
        let totalPaid = 0;
        let totalRemaining = 0;
        const studentPayments: Array<{
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
                createdAt: Date;
            }>;
        }> = [];

        // Calculate totals for each student
        course.purchases.forEach((purchase) => {
            const studentTotalPaid = purchase.totalPaid || 0;
            const studentRemaining = Math.max(0, coursePrice - studentTotalPaid);
            
            totalPaid += studentTotalPaid;
            totalRemaining += studentRemaining;

            studentPayments.push({
                studentId: purchase.userId,
                studentName: purchase.user.fullName,
                studentPhone: purchase.user.phoneNumber,
                studentCollege: purchase.user.college,
                studentFaculty: purchase.user.faculty,
                coursePrice: coursePrice,
                totalPaid: studentTotalPaid,
                remaining: studentRemaining,
                isFullyPaid: studentRemaining === 0,
                payments: purchase.payments.map(p => ({
                    id: p.id,
                    amount: p.amount,
                    paymentNumber: p.paymentNumber,
                    notes: p.notes,
                    createdAt: p.createdAt
                }))
            });
        });

        return NextResponse.json({
            course: {
                id: course.id,
                title: course.title,
                price: coursePrice
            },
            summary: {
                totalStudents: course.purchases.length,
                totalPaid: totalPaid,
                totalRemaining: totalRemaining,
                totalExpected: coursePrice * course.purchases.length
            },
            studentPayments: studentPayments
        });
    } catch (error) {
        console.error("[FINANCIAL_REPORT_GET]", error);
        return NextResponse.json(
            { error: "Internal Error" },
            { status: 500 }
        );
    }
}

