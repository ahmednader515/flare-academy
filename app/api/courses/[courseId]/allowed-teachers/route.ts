import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const { userId, user } = await auth();
        const resolvedParams = await params;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only admins can view allowed teachers
        if (user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const course = await db.course.findUnique({
            where: { id: resolvedParams.courseId },
            include: {
                allowedTeachers: {
                    select: { teacherId: true }
                },
                user: {
                    select: {
                        id: true,
                        role: true
                    }
                }
            }
        });

        if (!course) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        // Get all teachers
        const allTeachers = await db.user.findMany({
            where: { role: "TEACHER" },
            select: {
                id: true,
                fullName: true,
                email: true,
            }
        });

        // Create a set of allowed teacher IDs
        const allowedTeacherIds = new Set(course.allowedTeachers.map(at => at.teacherId));
        
        // If the course creator is a teacher, they should always be allowed
        const isCreatorTeacher = course.user.role === "TEACHER";
        if (isCreatorTeacher) {
            allowedTeacherIds.add(course.userId);
        }

        // Map teachers with their allowed status
        const teachersWithStatus = allTeachers.map(teacher => ({
            ...teacher,
            isAllowed: allowedTeacherIds.has(teacher.id),
            isCreator: teacher.id === course.userId
        }));

        return NextResponse.json(teachersWithStatus);
    } catch (error) {
        console.error("[ALLOWED_TEACHERS_GET]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const { userId, user } = await auth();
        const resolvedParams = await params;
        const { teacherIds } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only admins can update allowed teachers
        if (user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Get the course with user info to check if creator is a teacher
        const course = await db.course.findUnique({
            where: { id: resolvedParams.courseId },
            include: {
                user: {
                    select: {
                        id: true,
                        role: true
                    }
                }
            }
        });

        if (!course) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        // Ensure course creator (if teacher) is always included
        const isCreatorTeacher = course.user.role === "TEACHER";
        const safeTeacherIds = Array.isArray(teacherIds) ? teacherIds : [];
        const finalTeacherIds = isCreatorTeacher && !safeTeacherIds.includes(course.userId)
            ? [...safeTeacherIds, course.userId]
            : safeTeacherIds;

        // Verify all teacherIds are actually teachers
        if (finalTeacherIds.length > 0) {
            const teachers = await db.user.findMany({
                where: {
                    id: { in: finalTeacherIds },
                    role: "TEACHER"
                }
            });

            if (teachers.length !== finalTeacherIds.length) {
                return NextResponse.json({ error: "Invalid teacher IDs" }, { status: 400 });
            }
        }

        // Delete all existing allowed teachers for this course
        await db.courseTeacher.deleteMany({
            where: { courseId: resolvedParams.courseId }
        });

        // Add new allowed teachers
        if (finalTeacherIds.length > 0) {
            await db.courseTeacher.createMany({
                data: finalTeacherIds.map((teacherId: string) => ({
                    courseId: resolvedParams.courseId,
                    teacherId: teacherId
                }))
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[ALLOWED_TEACHERS_PUT]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

