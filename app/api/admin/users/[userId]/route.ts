import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
    req: NextRequest,
    { params }: { params: { userId: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (session.user.role !== "ADMIN") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const { fullName, phoneNumber, email, college, faculty, level, role } = await req.json();

        // Check if user exists
        const existingUser = await db.user.findUnique({
            where: {
                id: params.userId
            }
        });

        if (!existingUser) {
            return new NextResponse("User not found", { status: 404 });
        }

        // Check if phone number is already taken by another user
        if (phoneNumber && phoneNumber !== existingUser.phoneNumber) {
            const phoneExists = await db.user.findUnique({
                where: {
                    phoneNumber: phoneNumber
                }
            });

            if (phoneExists) {
                return new NextResponse("Phone number already exists", { status: 400 });
            }
        }

        // Check if email is already taken by another user
        if (email && email !== existingUser.email) {
            const emailExists = await db.user.findFirst({
                where: {
                    email: email,
                    id: {
                        not: params.userId
                    }
                }
            });

            if (emailExists) {
                return new NextResponse("Email already exists", { status: 400 });
            }
        }

        // Update user
        const updatedUser = await db.user.update({
            where: {
                id: params.userId
            },
            data: {
                ...(fullName && { fullName }),
                ...(phoneNumber && { phoneNumber }),
                ...(email && { email }),
                ...(college && { college }),
                ...(faculty && { faculty }),
                ...(level && { level }),
                ...(role && { role })
            }
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error("[ADMIN_USER_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { userId: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (session.user.role !== "ADMIN") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        // Check if user exists
        const existingUser = await db.user.findUnique({
            where: {
                id: params.userId
            }
        });

        if (!existingUser) {
            return new NextResponse("User not found", { status: 404 });
        }

        // Prevent admin from deleting themselves
        if (params.userId === session.user.id) {
            return new NextResponse("Cannot delete your own account", { status: 400 });
        }

        // Delete user (this will cascade delete related data due to Prisma relations)
        await db.user.delete({
            where: {
                id: params.userId
            }
        });

        return NextResponse.json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("[ADMIN_USER_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
