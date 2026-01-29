import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET messages for a course
export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const { userId, user } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user has access to the course (enrolled student, teacher, or admin)
    const course = await db.course.findUnique({
      where: { id: courseId },
      include: {
        purchases: {
          where: {
            userId,
            status: "ACTIVE",
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // Check access: teacher, admin, or enrolled student
    const isAdmin = user?.role === "ADMIN";
    const isTeacher = course.userId === userId;
    const isEnrolled = course.purchases.length > 0;

    if (!isAdmin && !isTeacher && !isEnrolled) {
      return NextResponse.json(
        { error: "Access denied. You must be enrolled in this course." },
        { status: 403 }
      );
    }

    // Get messages with user info
    const messages = await db.courseMessage.findMany({
      where: {
        courseId,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            image: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 100, // Limit to last 100 messages
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("[COURSE_CHAT_GET]", error);
    return NextResponse.json(
      { error: "Internal Error" },
      { status: 500 }
    );
  }
}

// POST new message
export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const { userId, user } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { message } = await req.json();

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: "Message is too long (max 2000 characters)" },
        { status: 400 }
      );
    }

    // Check if user has access to the course
    const course = await db.course.findUnique({
      where: { id: courseId },
      include: {
        purchases: {
          where: {
            userId,
            status: "ACTIVE",
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // Check access: teacher, admin, or enrolled student
    const isAdmin = user?.role === "ADMIN";
    const isTeacher = course.userId === userId;
    const isEnrolled = course.purchases.length > 0;

    if (!isAdmin && !isTeacher && !isEnrolled) {
      return NextResponse.json(
        { error: "Access denied. You must be enrolled in this course." },
        { status: 403 }
      );
    }

    // Create message
    const newMessage = await db.courseMessage.create({
      data: {
        courseId,
        userId,
        message: message.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            image: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ message: newMessage });
  } catch (error) {
    console.error("[COURSE_CHAT_POST]", error);
    return NextResponse.json(
      { error: "Internal Error" },
      { status: 500 }
    );
  }
}

