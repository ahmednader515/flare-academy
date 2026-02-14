# Vercel Cron Job Setup - Session Management

This document explains how the automatic session management system works.

## Overview

The system uses one cron job to manage user sessions:

1. **Daily Reset**: Logs out ALL users at 3 AM Egypt time every day (also cleans up scheduled logouts)

**Note**: Scheduled logouts (1 minute after manual logout) are also cleaned up automatically during session validation, so no hourly cron is needed.

Sessions no longer expire after 6 hours (removed to prevent bugs). Users remain logged in until:
- They manually log out
- The daily reset at 3 AM Egypt time logs them out
- Their session is invalidated by the system (e.g., single-device login enforcement)

## Schedule

### Daily Reset (All Users)
- **Schedule**: `0 1 * * *` (cron expression)
- **Frequency**: Once per day at 01:00 UTC (3:00 AM Egypt time, UTC+2)
- **Purpose**: Log out ALL users regardless of login time
- **Endpoint**: `/api/cron/daily-reset`

## Configuration

### 1. Vercel Configuration (`vercel.json`)

The cron job is configured in `vercel.json`:

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

**Note**: The hourly cleanup cron was removed because:
1. Vercel Hobby plan only allows daily cron jobs (not hourly)
2. Scheduled logouts are automatically cleaned up during session validation
3. The daily reset also cleans up any remaining scheduled logouts

### 2. Environment Variables (Optional)

You can optionally set a `CRON_SECRET` environment variable for additional security:

```env
CRON_SECRET=your-secret-token-here
```

If set, the cron endpoint will require this token in the Authorization header.

## Security

The endpoint is secured in the following ways:

1. **Vercel Cron Header**: In production, only requests with the `x-vercel-cron` header are allowed
2. **Optional Secret**: If `CRON_SECRET` is set, requests must include `Authorization: Bearer {CRON_SECRET}`
3. **Development Mode**: In development, manual testing is allowed

## Manual Testing

You can test the endpoint manually:

```bash
# Without CRON_SECRET (development only)
curl http://localhost:3000/api/cron/reset-sessions

# With CRON_SECRET
curl -H "Authorization: Bearer your-secret-token" \
     http://localhost:3000/api/cron/reset-sessions
```

## Monitoring

The endpoint returns a JSON response:

```json
{
  "success": true,
  "message": "Successfully reset 42 user sessions",
  "resetCount": 42,
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

You can monitor cron job execution in:
- **Vercel Dashboard** → Your Project → Settings → Cron Jobs
- **Vercel Logs** → Check for cron job execution logs

## How It Works

1. **User Login**: When a user logs in, `lastLoginAt` is set to the current timestamp
2. **Session Validation**: On each API request, the system checks if the session is active (no time-based expiration)
3. **Manual Logout**: When a user manually logs out, `logoutScheduledAt` is set for delayed cleanup
4. **Automatic Cleanup**: Scheduled logouts are cleaned up:
   - Immediately during session validation (when user makes API requests)
   - During the daily reset (as a backup)
5. **Daily Reset**: Runs at 3 AM Egypt time to log out ALL users and clean up scheduled logouts, ensuring a clean slate every day

## Changing the Daily Reset Time

To change the daily reset time, update the cron schedule in `vercel.json`:

Egypt time is UTC+2, so:
- 3 AM Egypt = 01:00 UTC (current)
- 12 AM Egypt = 22:00 UTC
- 6 AM Egypt = 04:00 UTC

Example: To change to 6 AM Egypt time:
```json
{
  "path": "/api/cron/daily-reset",
  "schedule": "0 4 * * *"  // 04:00 UTC = 6 AM Egypt
}
```

## Changing the Cron Schedule

### Daily Reset Schedule

The daily reset runs once per day. To change the time, update the schedule in `vercel.json`:
- Current: `0 1 * * *` (3 AM Egypt time)
- See "Changing the Daily Reset Time" section above for time conversion

## Troubleshooting

### Cron job not running

1. **Check Vercel Dashboard**: Verify the cron job is configured in your project settings
2. **Check Logs**: Look for errors in Vercel function logs
3. **Verify Deployment**: Ensure `vercel.json` is deployed
4. **Check Schedule**: Verify the cron expression is correct

### Unauthorized errors

- If using `CRON_SECRET`, ensure it's set in Vercel environment variables
- In production, ensure the request comes from Vercel Cron (has `x-vercel-cron` header)

### No sessions being reset

- Check database connection
- Verify users have `isActive: true` before the cron runs
- Check function logs for errors

## API Endpoints

### Daily Reset (`/api/cron/daily-reset`)
- **Method**: `GET`
- **Purpose**: Log out ALL users at 3 AM Egypt time
- **Authentication**: Vercel Cron header or CRON_SECRET
- **Returns**: Count of reset sessions

## Implementation Details

### Scheduled Logout Cleanup
Scheduled logouts are cleaned up in two ways:

1. **During Session Validation** (`SessionManager.validateSession()`):
   - Checks if user has `logoutScheduledAt` older than 1 minute
   - If so, immediately ends the session and clears `logoutScheduledAt`
   - This happens automatically when users make API requests

2. **During Daily Reset** (`SessionManager.cleanupScheduledLogouts()`):
   - Finds all users with `logoutScheduledAt` older than 1 minute
   - Updates them to `isActive: false`, `sessionId: null`, and clears `logoutScheduledAt`
   - This is a backup cleanup that runs during the daily reset

### Daily Reset
Uses `SessionManager.resetAllSessions()` which:
1. Finds all users with `isActive: true`
2. Updates them to `isActive: false` and `sessionId: null`
3. Returns the count of reset sessions

Both methods use efficient batch updates rather than looping through individual users.

