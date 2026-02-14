import "dotenv/config";
import { SessionManager } from "../lib/session-manager";

/**
 * Manual script to reset all user sessions
 * Can be run for testing or manual session resets
 */
async function resetAllSessions() {
  try {
    console.log("🔄 Starting manual session reset for all users...");

    const resetCount = await SessionManager.resetAllSessions();

    console.log(`✅ Successfully reset ${resetCount} user sessions`);
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  } catch (error: any) {
    console.error("❌ Error resetting sessions:", error.message);
    process.exit(1);
  } finally {
    // Disconnect from database
    const { db } = await import("../lib/db");
    await db.$disconnect();
  }
}

resetAllSessions();

