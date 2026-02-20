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
   * For TEACHER and ADMIN: Allows multiple sessions (doesn't overwrite existing sessionId)
   * For regular users: Only one session allowed (overwrites previous sessionId)
   */
  static async createSession(userId: string): Promise<string> {
    const sessionId = this.generateSessionId();
    
    // Get user to check role and current state
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, isActive: true, sessionId: true }
    });

    // For TEACHER and ADMIN, allow multiple sessions
    // Don't overwrite sessionId if user is already active (allows multiple devices)
    if (user && (user.role === "TEACHER" || user.role === "ADMIN")) {
      if (user.isActive && user.sessionId) {
        // User already has active session(s) - don't overwrite sessionId
        // Just update lastLoginAt to track activity
        // Each device will have its own sessionId in JWT, validated by userId
        await db.user.update({
          where: { id: userId },
          data: {
            lastLoginAt: new Date()
          }
        });
        // Return new sessionId for this device's JWT token
        // Validation will use userId to check if user is active
        return sessionId;
      } else {
        // First login - set sessionId normally
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
    } else {
      // Regular users - single device only (overwrite previous sessionId)
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
  }

  /**
   * End user session
   * Clears both isActive (sets to false) and sessionId (sets to null)
   * This ensures the user is fully logged out from all devices
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
   * @deprecated This method is no longer used - delayed cleanup has been removed
   */
  static async scheduleDelayedLogoutCleanup(userId: string): Promise<void> {
    // No-op: Delayed cleanup has been removed
    return;
  }

  /**
   * Clean up scheduled logouts that are older than 1 minute
   * @deprecated This method is no longer used - delayed cleanup has been removed
   */
  static async cleanupScheduledLogouts(): Promise<number> {
    // No-op: Delayed cleanup has been removed
    return 0;
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
   * For TEACHER/ADMIN: Validates by checking if user is active (allows multiple sessions)
   * For regular users: Validates by exact sessionId match (single session only)
   * Cached for 30 seconds to reduce database operations
   */
  static async validateSession(sessionId: string, userId?: string): Promise<{ user: any; isValid: boolean }> {
    let user = null;

    // For TEACHER/ADMIN multi-device support: if userId is provided, find by userId first
    // This allows validation even if sessionId was overwritten by another device
    if (userId) {
      user = await db.user.findUnique({
        where: { id: userId },
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
        cacheStrategy: { ttl: 30 },
      });

      // If found by userId and it's TEACHER/ADMIN, validate by isActive (multi-device)
      if (user && (user.role === "TEACHER" || user.role === "ADMIN")) {
        // For TEACHER/ADMIN, validate by isActive, not exact sessionId match
        if (!user.isActive) {
          return { user: null, isValid: false };
        }
        return { user, isValid: true };
      }
    }

    // For regular users or if userId not provided, find by sessionId
    if (!user) {
      user = await db.user.findUnique({
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
        cacheStrategy: { ttl: 30 },
      });
    }

    if (!user || !user.isActive) {
      return { user: null, isValid: false };
    }

    // For regular users, require exact sessionId match
    if (user.role !== "TEACHER" && user.role !== "ADMIN") {
      if (user.sessionId !== sessionId) {
        return { user: null, isValid: false };
      }
    }

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

