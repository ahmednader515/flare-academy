import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, password } = await request.json();

    if (!phoneNumber || !password) {
      return NextResponse.json(
        { error: "Phone number and password are required" },
        { status: 400 }
      );
    }

    // Find user
    const user = await db.user.findUnique({
      where: {
        phoneNumber,
      },
      select: {
        id: true,
        hashedPassword: true,
        isActive: true,
        role: true,
      },
      cacheStrategy: { ttl: 0 }, // No cache - must be fresh
    });

    if (!user || !user.hashedPassword) {
      return NextResponse.json(
        { error: "Invalid credentials", isValid: false },
        { status: 401 }
      );
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid credentials", isValid: false },
        { status: 401 }
      );
    }

    // Credentials are valid, check if user is already logged in
    const isAlreadyLoggedIn = user.isActive && user.role !== "TEACHER" && user.role !== "ADMIN";

    return NextResponse.json({
      isValid: true,
      isAlreadyLoggedIn,
      role: user.role,
    });
  } catch (error) {
    console.error("[VALIDATE_AND_CHECK_STATUS_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

