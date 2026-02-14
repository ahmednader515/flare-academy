import { NextRequest, NextResponse } from "next/server";
import { SessionManager } from "@/lib/session-manager";

/**
 * Daily reset of all user sessions - runs at 3 AM Egypt time (01:00 UTC) via Vercel Cron
 * This logs out ALL users regardless of their login time
 * This ensures a clean slate every day and prevents any session-related bugs
 * 
 * Schedule: Daily at 01:00 UTC (3:00 AM Egypt time, UTC+2)
 * - Egypt time is UTC+2, so 3 AM Egypt = 01:00 UTC (same day)
 * - Cron: 0 1 * * * (runs at 01:00 UTC every day)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a Vercel Cron request
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // If CRON_SECRET is set, verify the request
    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    } else {
      // If no CRON_SECRET is set, only allow requests from Vercel Cron
      // Vercel Cron sends a special header in production
      const vercelCronHeader = request.headers.get("x-vercel-cron");
      if (!vercelCronHeader) {
        // In development, allow manual testing
        if (process.env.NODE_ENV === "production") {
          return NextResponse.json(
            { error: "Unauthorized - Only Vercel Cron can access this endpoint" },
            { status: 401 }
          );
        }
      }
    }

    console.log("🔄 Starting daily reset of all user sessions (3 AM Egypt time)...");

    // Clean up any remaining scheduled logouts first
    const scheduledLogoutCount = await SessionManager.cleanupScheduledLogouts();
    console.log(`✅ Cleaned up ${scheduledLogoutCount} scheduled logouts`);

    // Reset all active sessions (logs out all users)
    const resetCount = await SessionManager.resetAllSessions();

    console.log(`✅ Daily reset complete: Logged out ${resetCount} users`);

    return NextResponse.json({
      success: true,
      message: `Successfully reset ${resetCount} user sessions and cleaned up ${scheduledLogoutCount} scheduled logouts (daily reset at 3 AM Egypt time)`,
      resetCount,
      scheduledLogoutCount,
      timestamp: new Date().toISOString(),
      egyptTime: new Date().toLocaleString("en-US", { timeZone: "Africa/Cairo" }),
    });
  } catch (error: any) {
    console.error("❌ Error during daily reset:", error);
    return NextResponse.json(
      {
        error: "Failed to reset sessions",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

