import { NextRequest, NextResponse } from "next/server";
import { SessionManager } from "@/lib/session-manager";

/**
 * Clean up scheduled logouts - runs every hour via Vercel Cron
 * This cleans up users who manually logged out 1+ minute ago
 * 
 * Schedule: Every hour (0 * * * *)
 * - Runs every hour to clean up scheduled logouts from manual logout
 * - Note: Sessions no longer expire after 6 hours (removed to prevent bugs)
 * - Only the daily reset at 3 AM Egypt time logs out all users
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

    console.log("🔄 Starting cleanup of scheduled logouts (1 minute after manual logout)...");

    // Clean up scheduled logouts (1 minute after manual logout)
    const scheduledLogoutCount = await SessionManager.cleanupScheduledLogouts();

    console.log(`✅ Cleaned up ${scheduledLogoutCount} scheduled logouts (1 minute after manual logout)`);

    return NextResponse.json({
      success: true,
      message: `Successfully cleaned up ${scheduledLogoutCount} scheduled logouts`,
      scheduledLogoutCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("❌ Error cleaning up scheduled logouts:", error);
    return NextResponse.json(
      {
        error: "Failed to cleanup scheduled logouts",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

