import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        const { userId, user } = await auth();
        
        if (!userId || !user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Only admins can access this endpoint
        if (user.role !== "ADMIN") {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        const courses = await db.course.findMany({
            select: {
                id: true,
                title: true,
                price: true,
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return NextResponse.json(courses);
    } catch (error) {
        console.error("[ADMIN_COURSES_GET]", error);
        return NextResponse.json(
            { error: "Internal Error" },
            { status: 500 }
        );
    }
}

