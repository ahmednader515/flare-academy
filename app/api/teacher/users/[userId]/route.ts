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
        const { userId } = await params;

        console.log("[TEACHER_USER_PATCH] Session:", { userId: session?.user?.id, role: session?.user?.role });

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (session.user.role !== "TEACHER") {
            console.log("[TEACHER_USER_PATCH] Access denied:", { userId: session.user.id, role: session.user.role });
            return new NextResponse("Forbidden", { status: 403 });
        }

        const { fullName, phoneNumber, email, college, faculty, level } = await req.json();

        // Check if user exists (teachers can edit all users)
        const existingUser = await db.user.findUnique({
            where: {
                id: userId,
                role: {
                    in: ["USER", "TEACHER", "ADMIN"] // Teachers can edit all users
                }
            }
        });

        if (!existingUser) {
            console.log("[TEACHER_USER_PATCH] User not found:", userId);
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
                        not: userId
                    }
                }
            });

            if (emailExists) {
                return new NextResponse("Email already exists", { status: 400 });
            }
        }

        // Update user (teachers can update basic info, but NOT role)
        const updatedUser = await db.user.update({
            where: {
                id: userId,
                role: {
                    in: ["USER", "TEACHER", "ADMIN"] // Ensure we're only updating existing users
                }
            },
            data: {
                ...(fullName && { fullName }),
                ...(phoneNumber && { phoneNumber }),
                ...(email && { email }),
                ...(college && { college }),
                ...(faculty && { faculty }),
                ...(level && { level })
            }
        });

        console.log("[TEACHER_USER_PATCH] User updated successfully:", userId);
        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error("[TEACHER_USER_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { userId } = await params;

        console.log("[TEACHER_USER_DELETE] Session:", { userId: session?.user?.id, role: session?.user?.role });

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (session.user.role !== "TEACHER") {
            console.log("[TEACHER_USER_DELETE] Access denied:", { userId: session.user.id, role: session.user.role });
            return new NextResponse("Forbidden", { status: 403 });
        }

        // Check if user exists (teachers can delete all users)
        const existingUser = await db.user.findUnique({
            where: {
                id: userId,
                role: {
                    in: ["USER", "TEACHER", "ADMIN"] // Teachers can delete all users
                }
            }
        });

        if (!existingUser) {
            console.log("[TEACHER_USER_DELETE] User not found:", userId);
            return new NextResponse("User not found", { status: 404 });
        }

        // Delete the user (this will cascade delete related data due to Prisma relations)
        await db.user.delete({
            where: {
                id: userId,
                role: {
                    in: ["USER", "TEACHER", "ADMIN"] // Ensure we're only deleting existing users
                }
            }
        });

        console.log("[TEACHER_USER_DELETE] User deleted successfully:", userId);
        return new NextResponse("User deleted successfully", { status: 200 });
    } catch (error) {
        console.error("[TEACHER_USER_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
