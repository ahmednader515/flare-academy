import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function PATCH(
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

        const chapter = await db.chapter.findUnique({
            where: {
                id: resolvedParams.chapterId,
                courseId: resolvedParams.courseId,
            },
            include: {
                course: {
                    select: {
                        title: true,
                    },
                },
            },
        });

        if (!chapter) {
            return new NextResponse("Not Found", { status: 404 });
        }

        const wasPublished = chapter.isPublished;
        const publishedChapter = await db.chapter.update({
            where: {
                id: resolvedParams.chapterId,
                courseId: resolvedParams.courseId,
            },
            data: {
                isPublished: !chapter.isPublished,
            }
        });

        // Create notifications for enrolled students when publishing a new chapter
        if (!wasPublished && publishedChapter.isPublished) {
            // Get all enrolled students for this course
            const enrolledStudents = await db.purchase.findMany({
                where: {
                    courseId: resolvedParams.courseId,
                    status: "ACTIVE",
                },
                select: {
                    userId: true,
                },
            });

            // Create notifications for each enrolled student
            if (enrolledStudents.length > 0) {
                await db.notification.createMany({
                    data: enrolledStudents.map((purchase) => ({
                        userId: purchase.userId,
                        courseId: resolvedParams.courseId,
                        chapterId: resolvedParams.chapterId,
                        type: "NEW_CHAPTER",
                        title: "محاضرة جديدة",
                        message: `تم نشر محاضرة جديدة في كورس "${chapter.course.title}": ${chapter.title}`,
                    })),
                });
            }
        }

        return NextResponse.json(publishedChapter);
    } catch (error) {
        console.log("[CHAPTER_PUBLISH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 