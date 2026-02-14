import "dotenv/config";
import { SessionManager } from "../lib/session-manager";

/**
 * Manual script to reset all user sessions (daily reset)
 * Can be run for testing the daily reset functionality
 */
async function dailyReset() {
  try {
    console.log("🔄 Starting daily reset of all user sessions...");

    const resetCount = await SessionManager.resetAllSessions();

    console.log(`✅ Successfully reset ${resetCount} user sessions`);
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    console.log(`🇪🇬 Egypt Time: ${new Date().toLocaleString("en-US", { timeZone: "Africa/Cairo" })}`);
  } catch (error: any) {
    console.error("❌ Error resetting sessions:", error.message);
    process.exit(1);
  } finally {
    // Disconnect from database
    const { db } = await import("../lib/db");
    await db.$disconnect();
  }
}

dailyReset();

