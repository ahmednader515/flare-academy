import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ courseId: string; chapterId: string; attachmentId: string }> }
) {
    try {
        const { userId, user } = await auth();
        const resolvedParams = await params;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const course = await db.course.findUnique({
            where: {
                id: resolvedParams.courseId,
            },
            include: {
                allowedTeachers: {
                    select: { teacherId: true }
                }
            }
        });

        if (!course) {
            return new NextResponse("Course not found", { status: 404 });
        }

        const isAdmin = user?.role === "ADMIN";
        const isOwner = course.userId === userId;
        const isAllowedTeacher = user?.role === "TEACHER" && 
            course.allowedTeachers.some(ct => ct.teacherId === userId);

        if (!isAdmin && !isOwner && !isAllowedTeacher) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Delete the attachment
        await db.chapterAttachment.delete({
            where: {
                id: resolvedParams.attachmentId,
                chapterId: resolvedParams.chapterId,
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.log("[CHAPTER_ATTACHMENT_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 