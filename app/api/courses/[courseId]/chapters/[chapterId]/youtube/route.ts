import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { extractYouTubeVideoId, isValidYouTubeUrl } from "@/lib/youtube";

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

        const { youtubeUrl } = await req.json();

        if (!youtubeUrl) {
            return new NextResponse("Missing YouTube URL", { status: 400 });
        }

        if (!isValidYouTubeUrl(youtubeUrl)) {
            return new NextResponse("Invalid YouTube URL", { status: 400 });
        }

        const youtubeVideoId = extractYouTubeVideoId(youtubeUrl);

        if (!youtubeVideoId) {
            return new NextResponse("Could not extract video ID", { status: 400 });
        }

        // Update chapter with YouTube video
        await db.chapter.update({
            where: {
                id: resolvedParams.chapterId,
                courseId: resolvedParams.courseId,
            },
            data: {
                videoUrl: youtubeUrl,
                videoType: "YOUTUBE",
                youtubeVideoId: youtubeVideoId,
            }
        });

        return NextResponse.json({ 
            success: true,
            youtubeVideoId,
            url: youtubeUrl
        });
    } catch (error) {
        console.log("[CHAPTER_YOUTUBE_UPLOAD]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 