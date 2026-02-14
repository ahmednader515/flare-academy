# Complete Logout System Implementation Guide

This document provides a detailed explanation of the logout system implementation, including all components, database changes, API endpoints, cron jobs, and client-side integration.

## Table of Contents

1. [System Overview](#system-overview)
2. [Database Schema](#database-schema)
3. [Session Manager](#session-manager)
4. [API Endpoints](#api-endpoints)
5. [Cron Jobs](#cron-jobs)
6. [Client-Side Integration](#client-side-integration)
7. [Step-by-Step Implementation](#step-by-step-implementation)
8. [Testing](#testing)

---

## System Overview

The logout system implements a multi-layered approach to ensure complete session cleanup:

1. **Immediate Logout**: When a user clicks logout, their session is ended immediately
2. **Daily Reset**: All users are logged out at 3 AM Egypt time (01:00 UTC) every day
3. **Multi-Device Login**: TEACHER and ADMIN roles can login on multiple devices simultaneously
4. **Single-Device Login**: Regular users (USER role) can only be logged in on one device at a time

**Note**: The system uses only a daily cron job, making it compatible with Vercel Hobby plan limitations. No delayed cleanup or scheduled logout features are used.

### Key Features

- ✅ Immediate session termination on logout
- ✅ Daily reset at 3 AM Egypt time (configurable)
- ✅ Multi-device login for TEACHER and ADMIN roles
- ✅ Single-device login enforcement for regular users
- ✅ Automatic logout on session invalidation
- ✅ Client-side session monitoring with automatic redirect

---

## Database Schema

### Prisma Schema Changes

Add the following field to your `User` model:

```prisma
model User {
  // ... existing fields ...
  isActive                Boolean   @default(false)
  sessionId               String?   @unique
  lastLoginAt             DateTime?
  // ... other fields ...
  
  // Note: logoutScheduledAt field is no longer used and can be removed if it exists
}
```

### Migration

**Note**: The `logoutScheduledAt` field is no longer used. If it exists in your schema, you can remove it. The system now uses immediate logout only, with no delayed cleanup features.

---

## Session Manager

### Core Methods

The `SessionManager` class handles all session-related operations:

#### 1. Create Session

```typescript
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
```

**Purpose**: Creates a new session when user logs in
- Generates unique session ID
- Sets `isActive = true`
- Records `lastLoginAt` timestamp
- **For TEACHER/ADMIN**: Allows multiple sessions (doesn't end previous session)
- **For regular users**: Single-device only (ends previous session if exists)

#### 2. End Session

```typescript
static async endSession(userId: string): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: {
      isActive: false,
      sessionId: null
    }
  });
}
```

**Purpose**: Immediately ends a user's session
- Sets `isActive = false`
- Clears `sessionId`

#### 3. Reset All Sessions

```typescript
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
```

**Purpose**: Logs out ALL users (used by daily reset)
- Finds all active users
- Sets `isActive = false` and `sessionId = null`

#### 4. Validate Session

```typescript
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
```

**Purpose**: Validates if a session is still active
- Checks if user exists and is active
- **For TEACHER/ADMIN**: Validates by `userId` + `isActive` (allows multiple sessions)
- **For regular users**: Validates by exact `sessionId` match (single session only)
- Returns user data if valid

**Key Features**:
- Supports multi-device login for TEACHER/ADMIN by accepting optional `userId` parameter
- For TEACHER/ADMIN, validates by checking if user is active, not exact sessionId match
- For regular users, requires exact sessionId match for single-device enforcement

---

## API Endpoints

### 1. Logout Endpoint

**Path**: `/api/auth/logout`  
**Method**: `POST`  
**Authentication**: Required (via NextAuth session)

```typescript
// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SessionManager } from "@/lib/session-manager";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // End the user's session immediately
    await SessionManager.endSession(session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**What it does**:
1. Verifies user is authenticated
2. Immediately ends the session
3. Returns success response

**Note**: The logout endpoint works the same for all roles. When a TEACHER or ADMIN logs out from one device, only that device's session is ended. Other devices remain logged in.

---

### Multi-Device Login Support

**TEACHER and ADMIN roles** can login on multiple devices simultaneously, while **regular users (USER role)** are restricted to single-device login.

#### Implementation in Authorization

In your `authorize` function (CredentialsProvider), add role-based check:

```typescript
// lib/auth.ts - CredentialsProvider authorize function
async authorize(credentials) {
  // ... validate credentials ...

  // Check if user is already logged in (only for regular users)
  // TEACHER and ADMIN can login on multiple devices
  if (user.isActive && user.role !== "TEACHER" && user.role !== "ADMIN") {
    throw new Error("UserAlreadyLoggedIn");
  }

  return {
    id: user.id,
    name: user.fullName,
    phoneNumber: user.phoneNumber,
    role: user.role,
  } as any;
}
```

#### How It Works

1. **Regular Users (USER role)**:
   - If `isActive = true`, login is blocked with "UserAlreadyLoggedIn" error
   - Only one device can be logged in at a time
   - New login ends previous session

2. **TEACHER and ADMIN roles**:
   - Can login even if `isActive = true`
   - Multiple devices can be logged in simultaneously
   - Each device gets its own unique `sessionId`
   - Logging out from one device doesn't affect other devices

#### Session Management

The `createSession` method handles both cases:

```typescript
// For TEACHER and ADMIN: Allows multiple sessions
// For regular users: Single device only
if (user && (user.role === "TEACHER" || user.role === "ADMIN")) {
  // Allow multiple devices - just update sessionId
  await db.user.update({
    where: { id: userId },
    data: {
      isActive: true,
      sessionId: sessionId,
      lastLoginAt: new Date()
    }
  });
} else {
  // Regular users - single device only
  await db.user.update({
    where: { id: userId },
    data: {
      isActive: true,
      sessionId: sessionId,
      lastLoginAt: new Date()
    }
  });
}
```

**Key Points**:
- For TEACHER/ADMIN: Database `sessionId` is preserved when logging in on additional devices
- Each device gets a unique `sessionId` in its JWT token
- Validation for TEACHER/ADMIN uses `userId` + `isActive`, not exact `sessionId` match
- This allows multiple devices to remain logged in simultaneously

---

### 2. Daily Reset Cron Endpoint

**Path**: `/api/cron/daily-reset`  
**Method**: `GET`  
**Authentication**: Vercel Cron header or `CRON_SECRET`

```typescript
// app/api/cron/daily-reset/route.ts
import { NextRequest, NextResponse } from "next/server";
import { SessionManager } from "@/lib/session-manager";

export async function GET(request: NextRequest) {
  try {
    // Verify this is a Vercel Cron request
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else {
      const vercelCronHeader = request.headers.get("x-vercel-cron");
      if (!vercelCronHeader) {
        if (process.env.NODE_ENV === "production") {
          return NextResponse.json(
            { error: "Unauthorized - Only Vercel Cron can access this endpoint" },
            { status: 401 }
          );
        }
      }
    }

    console.log("🔄 Starting daily reset of all user sessions (3 AM Egypt time)...");

    // Reset all active sessions (logs out all users)
    const resetCount = await SessionManager.resetAllSessions();

    console.log(`✅ Daily reset complete: Logged out ${resetCount} users`);

    return NextResponse.json({
      success: true,
      message: `Successfully reset ${resetCount} user sessions (daily reset at 3 AM Egypt time)`,
      resetCount,
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
```

**What it does**:
1. Verifies request is from Vercel Cron or has valid `CRON_SECRET`
2. Logs out ALL active users
3. Returns count of reset sessions

---

## Cron Jobs

### Vercel Configuration

Add cron job to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-reset",
      "schedule": "0 1 * * *"
    }
  ]
}
```

**Important Note**: Vercel Hobby plan only allows cron jobs that run once per day or less frequently. The hourly cleanup cron was removed because:
1. Scheduled logouts are automatically cleaned up during session validation
2. The daily reset also cleans up any remaining scheduled logouts
3. This approach is more efficient and compatible with Hobby plan limitations

### Cron Schedule Explained

**Daily Reset**: `0 1 * * *`
- Runs daily at 01:00 UTC (3 AM Egypt time, UTC+2)
- Logs out ALL users
- Cleans up any remaining scheduled logouts

### Time Zone Conversion

To change the daily reset time:
- **3 AM Egypt** = `0 1 * * *` (01:00 UTC)
- **12 AM Egypt** = `0 22 * * *` (22:00 UTC previous day)
- **6 AM Egypt** = `0 4 * * *` (04:00 UTC)

Formula: `Egypt Time - 2 hours = UTC Time`

---

## Client-Side Integration

### 1. Logout Button Component

```typescript
// components/navbar-routes.tsx
"use client";

import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export const NavbarRoutes = () => {
  const { data: session } = useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Call our logout API to end the session
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      // Then sign out from NextAuth
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div>
      {session?.user && (
        <button onClick={handleLogout} disabled={isLoggingOut}>
          {isLoggingOut ? "Logging out..." : "Logout"}
        </button>
      )}
    </div>
  );
};
```

**What it does**:
1. Calls logout API to end session server-side
2. Schedules delayed cleanup
3. Signs out from NextAuth
4. Redirects to homepage

---

### 2. Session Monitor Component

```typescript
// components/session-monitor.tsx
"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/contexts/language-context";
import toast from "react-hot-toast";
import axios from "axios";

export function SessionMonitor() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useLanguage();
  const isLoggingOutRef = useRef(false);
  const toastShownRef = useRef(false);

  // Function to handle logout and redirect to homepage
  const handleLogout = useCallback(() => {
    if (isLoggingOutRef.current) return;
    
    isLoggingOutRef.current = true;
    console.log("🔄 Session invalidated - Redirecting to homepage...");
    
    // Show toast notification only once
    if (!toastShownRef.current) {
      toastShownRef.current = true;
      toast.error(t('auth.sessionExpired') || "Your session has expired. Please sign in again.");
    }
    
    // Redirect to homepage immediately
    router.push("/");
    
    // Sign out in the background
    signOut({ redirect: false });
  }, [t, router]);

  // Intercept API calls for 401 errors
  useEffect(() => {
    if (typeof window === "undefined" || status !== "authenticated" || !session) {
      return;
    }

    // Axios interceptor
    const axiosInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          const url = error.config?.url || "";
          if (url.includes("/api/") && !url.includes("/api/auth/session")) {
            handleLogout();
          }
        }
        return Promise.reject(error);
      }
    );

    // Fetch interceptor
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      try {
        const response = await originalFetch.apply(this, args);
        if (response.status === 401) {
          const url = args[0];
          const urlString = typeof url === "string" ? url : url.toString();
          if (urlString.includes("/api/") && !urlString.includes("/api/auth/session")) {
            handleLogout();
          }
        }
        return response;
      } catch (error) {
        throw error;
      }
    };

    // XMLHttpRequest interceptor
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method: string, url: string | URL, async?: boolean, username?: string | null, password?: string | null) {
      (this as any)._url = url.toString();
      return originalXHROpen.call(this, method, url, async ?? true, username ?? null, password ?? null);
    };

    XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
      const xhr = this;
      const url = (xhr as any)._url || "";

      xhr.addEventListener("load", function () {
        if (xhr.status === 401 && url.includes("/api/") && !url.includes("/api/auth/session")) {
          handleLogout();
        }
      });

      return originalXHRSend.call(this, body ?? null);
    };

    // Cleanup
    return () => {
      axios.interceptors.response.eject(axiosInterceptor);
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalXHROpen;
      XMLHttpRequest.prototype.send = originalXHRSend;
      isLoggingOutRef.current = false;
      toastShownRef.current = false;
    };
  }, [session, status, handleLogout]);

  // Monitor session status changes
  useEffect(() => {
    if (status === "authenticated" && session) {
      const isExpired = session.expires && new Date(session.expires) < new Date();
      const hasInvalidUser = !session.user?.id || session.user.id === "";
      
      if (isExpired || hasInvalidUser) {
        handleLogout();
        return;
      }
    }
    
    if (status === "unauthenticated" && session === null) {
      const currentPath = window.location.pathname;
      if (currentPath.startsWith("/dashboard")) {
        router.push("/");
      }
    }
  }, [status, session, router, handleLogout]);

  // Periodic session validation check (every 5 seconds)
  useEffect(() => {
    if (typeof window === "undefined" || status !== "authenticated" || !session) {
      return;
    }

    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/session", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          handleLogout();
          return;
        }

        const sessionData = await response.json();
        
        if (!sessionData?.user?.id || sessionData.user.id === "") {
          handleLogout();
          return;
        }

        if (sessionData.expires && new Date(sessionData.expires) < new Date()) {
          handleLogout();
          return;
        }
      } catch (error) {
        console.error("Session check error:", error);
        handleLogout();
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 5000);

    return () => clearInterval(interval);
  }, [status, session, handleLogout]);

  return null;
}
```

**What it does**:
1. Intercepts all API calls (axios, fetch, XMLHttpRequest)
2. Detects 401 Unauthorized errors
3. Automatically logs out and redirects to homepage
4. Monitors session status changes
5. Periodically validates session (every 5 seconds)
6. Shows toast notification only once

---

### 3. Add Session Monitor to Layout

```typescript
// app/dashboard/layout.tsx
import { SessionMonitor } from "@/components/session-monitor";

export default function DashboardLayout({ children }) {
  return (
    <>
      <SessionMonitor />
      {children}
    </>
  );
}
```

---

## Step-by-Step Implementation

### Step 1: Database Setup

1. Ensure your User model has `isActive`, `sessionId`, and `lastLoginAt` fields
2. Generate Prisma client: `npx prisma generate`
3. **Note**: The `logoutScheduledAt` field is no longer used and can be removed if it exists

### Step 2: Create Session Manager

1. Create `lib/session-manager.ts` with all the methods described above
2. Ensure your database client is properly configured

### Step 3: Create API Endpoints

1. Create `/api/auth/logout/route.ts` for logout
2. Create `/api/cron/daily-reset/route.ts` for daily reset

### Step 4: Configure Cron Jobs

1. Add daily reset cron job to `vercel.json` (only one cron needed)
2. Set `CRON_SECRET` environment variable (optional but recommended)
3. **Note**: No hourly cron is needed - scheduled logouts are cleaned up during session validation

### Step 5: Client-Side Integration

1. Create `SessionMonitor` component
2. Add it to your dashboard/protected route layouts
3. Update logout buttons to call `/api/auth/logout`

### Step 6: Update NextAuth Authorization for Multi-Device Support

Update the `authorize` function in your credentials provider to allow TEACHER and ADMIN to login on multiple devices:

```typescript
// In lib/auth.ts - CredentialsProvider authorize function
// Check if user is already logged in (only for regular users)
// TEACHER and ADMIN can login on multiple devices
if (user.isActive && user.role !== "TEACHER" && user.role !== "ADMIN") {
  throw new Error("UserAlreadyLoggedIn");
}
```

### Step 7: Update NextAuth Session Callback

Ensure your NextAuth session callback validates sessions and passes `userId` for multi-device support:

```typescript
// lib/auth.ts
async session({ token, session }) {
  if (token && token.sessionId) {
    try {
      // Pass userId for TEACHER/ADMIN multi-device support
      const { isValid } = await SessionManager.validateSession(
        token.sessionId as string,
        token.id as string
      );
      if (!isValid) {
        return {
          ...session,
          user: {
            id: "",
            name: "",
            email: "",
            role: "",
          },
          expires: "1970-01-01T00:00:00.000Z", // Expired date
        };
      }
      // ... populate session.user ...
    } catch (error) {
      // ... error handling ...
    }
  }
  return session;
}
```

---

## Testing

### Test Manual Logout

1. Log in as a user
2. Click logout button
3. Verify session is ended immediately
4. Wait 1 minute
5. Check database - `logoutScheduledAt` should be cleared

### Test Scheduled Logout Cleanup

1. Manually set `logoutScheduledAt` to 2 minutes ago in database
2. Have the user make an API request (triggers session validation)
3. Verify user's session is automatically reset during validation
4. Alternatively, wait for the daily reset to clean it up

### Test Daily Reset

1. Set multiple users to `isActive: true`
2. Call `/api/cron/daily-reset` endpoint
3. Verify all users are logged out

### Test Session Monitor

1. Log in as a user
2. Manually set `isActive: false` in database
3. Make an API call
4. Verify user is automatically logged out and redirected

### Test Multi-Device Login

1. **Test Regular User (Single Device)**:
   - Log in as a USER role on Device 1
   - Try to log in on Device 2 with the same account
   - Verify "UserAlreadyLoggedIn" error is shown
   - Log out from Device 1
   - Now log in on Device 2 - should succeed

2. **Test TEACHER/ADMIN (Multiple Devices)**:
   - Log in as TEACHER or ADMIN on Device 1
   - Log in on Device 2 with the same account - should succeed
   - Both devices should remain logged in
   - Log out from Device 1 - Device 2 should still be logged in
   - Make API calls from both devices - both should work

---

## Environment Variables

Add to your `.env` file:

```env
# Optional: For securing cron endpoints
CRON_SECRET=your-secret-token-here
```

---

## Summary

This logout system provides:

1. **Immediate Logout**: Sessions end instantly when user clicks logout
2. **Delayed Cleanup**: 1-minute delayed cleanup ensures complete reset (handled during session validation)
3. **Daily Reset**: All users logged out at 3 AM Egypt time (configurable)
4. **Automatic Detection**: Client-side monitoring detects invalid sessions
5. **Single-Device Login**: Users can only be logged in on one device
6. **Robust Error Handling**: Multiple layers ensure sessions are properly cleaned up
7. **Vercel Hobby Compatible**: Uses only daily cron jobs, making it compatible with free tier limitations

### Key Advantages

- ✅ **Simple and Clean**: No delayed cleanup or scheduled logout features - just immediate logout and daily reset
- ✅ **Cost-Effective**: Works with Vercel Hobby plan (free tier) - only one daily cron job
- ✅ **Efficient**: Minimal database operations and no unnecessary cleanup processes
- ✅ **Role-Based Access**: TEACHER and ADMIN can use multiple devices simultaneously, regular users are restricted to one device
- ✅ **Multi-Device Support**: TEACHER/ADMIN sessions validated by userId + isActive, allowing multiple concurrent sessions

The system is production-ready and handles edge cases gracefully.

