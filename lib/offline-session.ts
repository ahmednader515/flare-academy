"use client";

const SESSION_STORAGE_KEY = "flare_academy_offline_session";

export interface OfflineSession {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: string;
  };
  expires: string;
}

/**
 * Save session data to localStorage for offline access
 */
export function saveOfflineSession(session: OfflineSession): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.error("Error saving offline session:", error);
  }
}

/**
 * Load session data from localStorage
 */
export function loadOfflineSession(): OfflineSession | null {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return null;
    
    const session = JSON.parse(stored) as OfflineSession;
    
    // Check if session is expired
    const expiryDate = new Date(session.expires);
    if (expiryDate < new Date()) {
      clearOfflineSession();
      return null;
    }
    
    return session;
  } catch (error) {
    console.error("Error loading offline session:", error);
    return null;
  }
}

/**
 * Clear session data from localStorage
 */
export function clearOfflineSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    console.error("Error clearing offline session:", error);
  }
}

/**
 * Check if user has valid offline session
 */
export function hasOfflineSession(): boolean {
  return loadOfflineSession() !== null;
}

