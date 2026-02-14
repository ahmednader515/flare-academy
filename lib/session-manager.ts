import { db } from "@/lib/db";
import { randomBytes } from "crypto";

export class SessionManager {
  /**
   * Generate a unique session ID
   */
  private static generateSessionId(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Check if user is already logged in
   */
  static async isUserActive(userId: string): Promise<boolean> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { isActive: true, sessionId: true }
    });

    return user?.isActive || false;
  }

  /**
   * Check if user has an active session by phone number
   */
  static async isUserActiveByPhone(phoneNumber: string): Promise<boolean> {
    const user = await db.user.findUnique({
      where: { phoneNumber },
      select: { isActive: true, sessionId: true }
    });

    return user?.isActive || false;
  }

  /**
   * Create a new session for user
   */
  static async createSession(userId: string): Promise<string> {
    const sessionId = this.generateSessionId();
    
    await db.user.update({
      where: { id: userId },
      data: {
        isActive: true,
        sessionId: sessionId,
        lastLoginAt: new Date()
      }
    });

    return sessionId;
  }

  /**
   * End user session
   */
  static async endSession(userId: string): Promise<void> {
    await db.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        sessionId: null
      }
    });
  }

  /**
   * Schedule delayed logout cleanup (1 minute after manual logout)
   * Sets logoutScheduledAt timestamp to ensure complete session reset
   */
  static async scheduleDelayedLogoutCleanup(userId: string): Promise<void> {
    await db.user.update({
      where: { id: userId },
      data: {
        logoutScheduledAt: new Date()
      }
    });
  }

  /**
   * Clean up scheduled logouts that are older than 1 minute
   * This ensures complete session reset after manual logout
   */
  static async cleanupScheduledLogouts(): Promise<number> {
    const oneMinuteInMs = 1 * 60 * 1000; // 1 minute in milliseconds
    const oneMinuteAgo = new Date(Date.now() - oneMinuteInMs);

    const result = await db.user.updateMany({
      where: {
        logoutScheduledAt: {
          not: null,
          lte: oneMinuteAgo, // Scheduled logout was 1+ minute ago
        },
      },
      data: {
        isActive: false,
        sessionId: null,
        logoutScheduledAt: null, // Clear the scheduled timestamp
      },
    });

    return result.count;
  }

  /**
   * End session by session ID
   */
  static async endSessionById(sessionId: string): Promise<void> {
    await db.user.updateMany({
      where: { sessionId },
      data: {
        isActive: false,
        sessionId: null
      }
    });
  }

  /**
   * Validate session and return user if valid
   * Checks if session is active (no time-based expiration)
   * Cached for 30 seconds to reduce database operations
   */
  static async validateSession(sessionId: string): Promise<{ user: any; isValid: boolean }> {
    const user = await db.user.findUnique({
      where: { sessionId },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        email: true,
        role: true,
        image: true,
        isActive: true,
        sessionId: true,
        lastLoginAt: true
      },
      cacheStrategy: { ttl: 30 }, // Cache for 30 seconds - session validation happens on every request
    });

    if (!user || !user.isActive || user.sessionId !== sessionId) {
      return { user: null, isValid: false };
    }

    // Session is valid (no time-based expiration - only daily reset at 3 AM)
    return { user, isValid: true };
  }

  /**
   * Force logout all other sessions for a user (except current session)
   */
  static async forceLogoutOtherSessions(userId: string, currentSessionId: string): Promise<void> {
    await db.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        sessionId: null
      }
    });
  }

  /**
   * Clean up expired sessions (legacy - for maintenance)
   * @deprecated Use cleanupExpiredUserSessions instead for 6-hour expiration
   */
  static async cleanupExpiredSessions(): Promise<void> {
    // Legacy method - now uses the new cleanupExpiredUserSessions
    await this.cleanupExpiredUserSessions();
  }

  /**
   * Reset all user sessions (logs out all users)
   * Used by daily cron job to reset all sessions at 3 AM Egypt time
   * This ensures a clean slate every day and prevents session-related bugs
   */
  static async resetAllSessions(): Promise<number> {
    const result = await db.user.updateMany({
      where: {
        isActive: true,
      },
      data: {
        isActive: false,
        sessionId: null,
      },
    });

    return result.count;
  }

  /**
   * Clean up sessions that have expired (6 hours since login)
   * @deprecated This method is no longer used - sessions no longer expire after 6 hours
   * Sessions are only reset by the daily reset at 3 AM Egypt time
   */
  static async cleanupExpiredUserSessions(): Promise<number> {
    // This method is deprecated and returns 0
    // Sessions are no longer expired based on time
    // Only the daily reset at 3 AM Egypt time logs out all users
    return 0;
  }
}
