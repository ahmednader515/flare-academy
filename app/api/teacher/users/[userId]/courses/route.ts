import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId } = await params;

    const user = await db.user.findUnique({
      where: { id: userId, role: "USER" },
    });

    if (!user) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const purchases = await db.purchase.findMany({
      where: { userId: userId, status: "ACTIVE" },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            price: true,
            isPublished: true,
          }
        }
      }
    });

    const courses = purchases.map(purchase => purchase.course);

    return NextResponse.json({ courses });
  } catch (error) {
    console.error("[TEACHER_GET_USER_COURSES]", error);
    return NextResponse.json(
      { error: "Internal Error" },
      { status: 500 }
    );
  }
}
