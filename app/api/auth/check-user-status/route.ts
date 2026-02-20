import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: {
        phoneNumber,
      },
      select: {
        id: true,
        isActive: true,
        role: true,
      },
      cacheStrategy: { ttl: 0 }, // No cache - must be fresh
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      isActive: user.isActive,
      role: user.role,
    });
  } catch (error) {
    console.error("[CHECK_USER_STATUS_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

