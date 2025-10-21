import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (session.user.role !== "TEACHER") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const users = await db.user.findMany({
            select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                email: true,
                college: true,
                faculty: true,
                level: true,
                role: true,
                balance: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        purchases: {
                            where: {
                                status: "ACTIVE"
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error("[TEACHER_USERS]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}