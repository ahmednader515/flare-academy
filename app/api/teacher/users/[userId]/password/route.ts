import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

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
        const { newPassword } = await req.json();

        if (!newPassword) {
            return new NextResponse("New password is required", { status: 400 });
        }

        const user = await db.user.findUnique({
            where: {
                id: userId
            }
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await db.user.update({
            where: { id: userId },
            data: { hashedPassword },
        });

        return NextResponse.json({ 
            success: true,
            message: "Password updated successfully" 
        });
    } catch (error) {
        console.error("[TEACHER_UPDATE_PASSWORD]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
