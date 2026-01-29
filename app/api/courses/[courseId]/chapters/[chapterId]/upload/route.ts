import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ courseId: string; chapterId: string }> }
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

        const { url } = await req.json();

        if (!url) {
            return new NextResponse("Missing URL", { status: 400 });
        }

        // Update chapter with video URL and set videoType to UPLOAD
        await db.chapter.update({
            where: {
                id: resolvedParams.chapterId,
                courseId: resolvedParams.courseId,
            },
            data: {
                videoUrl: url,
                videoType: "UPLOAD",
                youtubeVideoId: null, // Clear any YouTube video ID
            }
        });

        return NextResponse.json({ 
            success: true,
            url: url
        });
    } catch (error) {
        console.log("[CHAPTER_UPLOAD]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 