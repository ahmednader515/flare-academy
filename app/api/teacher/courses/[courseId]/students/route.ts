import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { courseId } = await params;

    // Verify course exists
    const course = await db.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Get all active purchases for this course with user details
    const purchases = await db.purchase.findMany({
      where: {
        courseId: courseId,
        status: "ACTIVE",
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            college: true,
            faculty: true,
            level: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const students = purchases.map((purchase) => ({
      id: purchase.user.id,
      fullName: purchase.user.fullName,
      email: purchase.user.email,
      phoneNumber: purchase.user.phoneNumber,
      college: purchase.user.college,
      faculty: purchase.user.faculty,
      level: purchase.user.level,
      enrolledAt: purchase.createdAt,
    }));

    return NextResponse.json({ students });
  } catch (error) {
    console.error("[TEACHER_GET_COURSE_STUDENTS]", error);
    return NextResponse.json(
      { error: "Internal Error" },
      { status: 500 }
    );
  }
}

