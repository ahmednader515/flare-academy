import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const resolvedParams = await params;
        const { userId } = await auth();
        const { courseId } = resolvedParams;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const course = await db.course.findUnique({
            where: {
                id: courseId,
                isPublished: true,
            },
            include: {
                chapters: {
                    where: {
                        isPublished: true,
                    },
                    orderBy: {
                        position: "asc",
                    },
                },
                attachments: {
                    orderBy: {
                        createdAt: "desc",
                    },
                },
                purchases: {
                    where: {
                        userId,
                    },
                },
            },
            cacheStrategy: { ttl: 120 }, // Cache for 2 minutes
        });

        if (!course) {
            return new NextResponse("Not found", { status: 404 });
        }

        return NextResponse.json(course);
    } catch (error) {
        console.error("[COURSE_ID]", error);
        if (error instanceof Error) {
            return new NextResponse(`Internal Error: ${error.message}`, { status: 500 });
        }
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const { userId, user } = await auth();
        const resolvedParams = await params;
        const values = await req.json();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Check access: admin, owner, or allowed teacher
        const existingCourse = await db.course.findUnique({
            where: { id: resolvedParams.courseId },
            select: { id: true, userId: true },
        });

        if (!existingCourse) {
            return new NextResponse("Course not found", { status: 404 });
        }

        const isAdmin = user?.role === "ADMIN";
        const isOwner = existingCourse.userId === userId;
        const isAllowedTeacher =
            user?.role === "TEACHER" &&
            (await (db as any).courseTeacher.count({
                where: { courseId: resolvedParams.courseId, teacherId: userId },
            })) > 0;

        if (!isAdmin && !isOwner && !isAllowedTeacher) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        // Normalize targeting fields: treat empty string as "not specified"
        const normalizedValues = {
            ...values,
            targetCollege:
                values?.targetCollege === "" ? null : values?.targetCollege,
            targetFaculty:
                values?.targetFaculty === "" ? null : values?.targetFaculty,
            targetLevel:
                values?.targetLevel === "" ? null : values?.targetLevel,
        };

        const whereClause = { id: resolvedParams.courseId };

        const updatedCourse = await db.course.update({
            where: whereClause,
            data: {
                ...normalizedValues,
            }
        });

        return NextResponse.json(updatedCourse);
    } catch (error) {
        console.log("[COURSE_ID]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ courseId: string }> }
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
            }
        });

        if (!course) {
            return new NextResponse("Not found", { status: 404 });
        }

        // Only owner or admin can delete
        if (user?.role !== "ADMIN" && course.userId !== userId) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const deletedCourse = await db.course.delete({
            where: {
                id: resolvedParams.courseId,
            },
        });

        return NextResponse.json(deletedCourse);
    } catch (error) {
        console.log("[COURSE_ID_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}