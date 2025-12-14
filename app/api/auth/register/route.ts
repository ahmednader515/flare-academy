import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

async function verifyRecaptcha(token: string): Promise<boolean> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  
  if (!secretKey) {
    console.error("[RECAPTCHA] Secret key not configured");
    return false;
  }

  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `secret=${secretKey}&response=${token}`,
    });

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error("[RECAPTCHA] Verification error:", error);
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const { fullName, phoneNumber, email, college, faculty, password, confirmPassword, recaptchaToken } = await req.json();

    if (!fullName || !phoneNumber || !email || !password || !confirmPassword || !college || !faculty) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Verify reCaptcha token
    if (!recaptchaToken) {
      return new NextResponse("reCaptcha verification required", { status: 400 });
    }

    const isRecaptchaValid = await verifyRecaptcha(recaptchaToken);
    if (!isRecaptchaValid) {
      return new NextResponse("reCaptcha verification failed", { status: 400 });
    }

    if (password !== confirmPassword) {
      return new NextResponse("Passwords do not match", { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new NextResponse("Invalid email format", { status: 400 });
    }

    // Check if user already exists
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { phoneNumber },
          { email }
        ]
      },
    });

    if (existingUser) {
      if (existingUser.phoneNumber === phoneNumber) {
        return new NextResponse("Phone number already exists", { status: 400 });
      }
      if (existingUser.email === email) {
        return new NextResponse("Email already exists", { status: 400 });
      }
    }

    // Hash password (no complexity requirements)
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user directly without email verification
    await db.user.create({
      data: {
        fullName,
        phoneNumber,
        email,
        college,
        faculty,
        hashedPassword,
        role: "USER",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[REGISTER]", error);
    
    // If the table doesn't exist or there's a database connection issue,
    // return a specific error message
    if (error instanceof Error && (
      error.message.includes("does not exist") || 
      error.message.includes("P2021") ||
      error.message.includes("table")
    )) {
      return new NextResponse("Database not initialized. Please run database migrations.", { status: 503 });
    }
    
    return new NextResponse("Internal Error", { status: 500 });
  }
} 