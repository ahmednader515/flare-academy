import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { SessionManager } from "@/lib/session-manager";

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, password } = await request.json();

    if (!phoneNumber || !password) {
      return NextResponse.json(
        { error: "Phone number and password are required" },
        { status: 400 }
      );
    }

    // Verify credentials
    const user = await db.user.findUnique({
      where: {
        phoneNumber,
      },
      cacheStrategy: { ttl: 0 }, // No cache for login - must be fresh
    });

    if (!user || !user.hashedPassword) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.hashedPassword
    );

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check if user is actually logged in on another device
    // (Only for regular users - TEACHER/ADMIN can login on multiple devices)
    if (user.role !== "TEACHER" && user.role !== "ADMIN") {
      if (!user.isActive) {
        // User is not active, so no conflict - they can just sign in normally
        return NextResponse.json(
          { error: "No active session found. Please sign in normally." },
          { status: 400 }
        );
      }
    }

    // Force logout from all devices by ending the session
    // This clears both isActive (sets to false) and sessionId (sets to null)
    await SessionManager.endSession(user.id);

    // Verify that both fields were cleared
    const updatedUser = await db.user.findUnique({
      where: { id: user.id },
      select: { isActive: true, sessionId: true },
    });

    if (updatedUser?.isActive || updatedUser?.sessionId) {
      console.error("[FORCE_LOGIN_ERROR] Session not properly cleared:", {
        userId: user.id,
        isActive: updatedUser?.isActive,
        sessionId: updatedUser?.sessionId,
      });
      // Try to clear again explicitly
      await db.user.update({
        where: { id: user.id },
        data: {
          isActive: false,
          sessionId: null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "All devices signed out successfully",
    });
  } catch (error) {
    console.error("[FORCE_LOGIN_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

