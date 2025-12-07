import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (session.user.role !== "TEACHER") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const { userId } = await params;
        const { newBalance } = await req.json();

        if (typeof newBalance !== "number" || newBalance < 0) {
            return new NextResponse("Invalid balance amount", { status: 400 });
        }

        const user = await db.user.findUnique({
            where: {
                id: userId
            }
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        const updatedUser = await db.user.update({
            where: { id: userId },
            data: { balance: newBalance },
            select: {
                id: true,
                fullName: true,
                balance: true,
            },
        });

        // Create balance transaction record
        await db.balanceTransaction.create({
            data: {
                userId: userId,
                type: "DEPOSIT",
                amount: newBalance,
                description: `Balance updated by teacher to ${newBalance} EGP`,
            },
        });

        return NextResponse.json({ 
            success: true, 
            user: updatedUser 
        });
    } catch (error) {
        console.error("[TEACHER_UPDATE_BALANCE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
