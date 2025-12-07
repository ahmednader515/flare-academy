import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const resolvedParams = await params;
        const session = await getServerSession(authOptions);

        // Get chapters
        const chapters = await db.chapter.findMany({
            where: {
                courseId: resolvedParams.courseId,
                isPublished: true
            },
            include: {
                userProgress: {
                    where: session?.user ? {
                        userId: session.user.id
                    } : {
                        userId: "non-existent-user-id"
                    },
                    select: {
                        isCompleted: true
                    }
                }
            },
            orderBy: {
                position: "asc"
            },
            cacheStrategy: { ttl: session?.user ? 60 : 300 }, // Cache for 1 min if user-specific, 5 min if public
        });

        // Get published quizzes
        const quizzes = await db.quiz.findMany({
            where: {
                courseId: resolvedParams.courseId,
                isPublished: true
            },
            include: {
                quizResults: {
                    where: session?.user ? {
                        studentId: session.user.id
                    } : {
                        studentId: "non-existent-user-id"
                    },
                    select: {
                        id: true,
                        score: true,
                        totalPoints: true,
                        percentage: true
                    }
                }
            },
            orderBy: {
                position: "asc"
            },
            cacheStrategy: { ttl: session?.user ? 60 : 300 }, // Cache for 1 min if user-specific, 5 min if public
        });

        // Combine and sort by position
        const allContent = [
            ...chapters.map(chapter => ({
                ...chapter,
                type: 'chapter' as const,
                userProgress: chapter.userProgress || []
            })),
            ...quizzes.map(quiz => ({
                ...quiz,
                type: 'quiz' as const,
                quizResults: quiz.quizResults || []
            }))
        ].sort((a, b) => a.position - b.position);

        return NextResponse.json(allContent);
    } catch (error) {
        console.log("[COURSE_CONTENT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 