# Offline Functionality Implementation

## Overview
This document describes the comprehensive offline functionality implemented for Flare Academy. The platform now works as a **Progressive Web App (PWA)** with full offline support, allowing users to:
- Load the homepage even when starting offline
- Access saved documents and view them offline
- See their session information when offline
- Get appropriate messages when internet is needed

## Features Implemented

### 1. **Service Worker & PWA Support** 🆕
- **Files**: 
  - `public/sw.js` - Service Worker script
  - `lib/register-sw.ts` - Registration utilities
  - `components/service-worker-registration.tsx` - React component
  - `public/manifest.json` - PWA manifest
- **Purpose**: Enables true offline-first functionality
- **Features**:
  - Caches homepage assets automatically
  - Network-first strategy with cache fallback
  - Works even when starting completely offline
  - Auto-updates when new version is available
  - Can be installed as a mobile/desktop app
  - Supports "Add to Home Screen" on mobile
- **Caching Strategy**:
  - Static assets cached on install (logo, hero images, etc.)
  - Dynamic pages cached as user visits them
  - Network first, then fallback to cache if offline
  - Old caches automatically cleaned up

### 2. **Offline Detection Hook**
- **File**: `hooks/use-online.ts`
- **Purpose**: Detects when the user goes online or offline using browser APIs
- **Usage**: Can be imported and used in any component to check online status

### 3. **Session Storage in localStorage**
- **File**: `lib/offline-session.ts`
- **Purpose**: Saves user session data to localStorage for offline access
- **Functions**:
  - `saveOfflineSession()` - Saves session to localStorage
  - `loadOfflineSession()` - Loads session from localStorage
  - `clearOfflineSession()` - Clears session from localStorage
  - `hasOfflineSession()` - Checks if valid offline session exists

### 4. **Document Caching System**
- **File**: `lib/offline-document-cache.ts`
- **Purpose**: Downloads and caches actual document content for true offline viewing
- **Functions**:
  - `downloadAndCacheDocument()` - Downloads document and converts to base64
  - `saveCachedDocument()` - Saves base64 content to localStorage
  - `getCachedDocument()` - Retrieves cached document content
  - `deleteCachedDocument()` - Removes cached document
  - `isDocumentCached()` - Checks if document is cached
  - `getCachedDocumentSize()` - Gets size of cached document in MB
- **Features**:
  - Automatically caches documents when user clicks "Save"
  - Stores documents as base64 in localStorage
  - Handles quota exceeded errors gracefully
  - Works with PDFs and images

### 5. **Homepage Offline Support**
- **File**: `app/page.tsx`
- **Changes**:
  - **Works completely offline from the start** (via Service Worker)
  - Hero section, features, and CTA sections always accessible
  - Shows "Internet Connection Required" message in courses section when offline
  - Prevents API calls when offline to avoid errors
  - All images and assets cached for offline viewing

### 6. **Navbar Session Persistence**
- **File**: `components/navbar.tsx`
- **Changes**:
  - Automatically saves session to localStorage when user logs in
  - Displays dashboard button even when offline (using cached session)
  - Shows logout button but disables it when offline
  - Clears offline session when user logs out

### 7. **Dashboard Offline Redirect**
- **File**: `components/offline-redirect.tsx`
- **Purpose**: Automatically redirects users to saved documents page when accessing dashboard offline
- **Behavior**:
  - Checks if user is offline on any dashboard page
  - Redirects to `/dashboard/saved-documents` if not already there
  - Shows toast notification informing user of the redirect

### 8. **Sidebar Lock System**
- **File**: `app/dashboard/_components/sidebar-item.tsx`
- **Changes**:
  - Shows lock icon (🔒) on pages that require internet
  - Saved Documents page remains accessible without lock
  - Clicking locked items shows error toast
  - Visual indication with reduced opacity for locked items

### 9. **Dashboard Layout Integration**
- **File**: `app/dashboard/layout.tsx`
- **Changes**: Added OfflineRedirect component to handle offline navigation

### 10. **Secure Document Viewer Offline Mode**
- **File**: `components/secure-document-viewer.tsx`
- **Changes**:
  - Checks for cached documents when offline
  - Displays cached base64 content directly
  - Shows "Offline" badge when viewing cached documents
  - Shows helpful error message if document not cached
  - Works seamlessly for both PDFs and images

### 11. **Auto-Caching on Save**
- **File**: `app/(course)/courses/[courseId]/chapters/[chapterId]/page.tsx`
- **Changes**:
  - Downloads document when user clicks "Save"
  - Converts to base64 and stores in localStorage
  - Shows progress toast during caching
  - Deletes cache when document is unsaved
  - Passes attachment ID to viewer for offline access

### 12. **Translation Support**
- **Files**: `lib/translations/en.json` and `lib/translations/ar.json`
- **New Keys Added**:
  ```json
  "home": {
    "offlineCoursesTitle": "Internet Connection Required",
    "offlineCoursesDescription": "To view courses, you need to be connected to the internet..."
  },
  "dashboard": {
    "offlineAccessTitle": "Internet Connection Required",
    "offlineAccessDescription": "This page requires an internet connection...",
    "offlineRedirectMessage": "You are currently offline. Redirecting to saved documents...",
    "goToSavedDocuments": "Go to Saved Documents"
  },
  "student": {
    "cachingDocument": "Caching document for offline use...",
    "documentCachedForOffline": "Document cached for offline viewing",
    "documentNotCached": "This document is not cached for offline viewing..."
  }
  ```

## User Experience Flow

### Starting Offline (No Prior Connection):

1. **Homepage Loads Perfectly**:
   - All cached assets load from Service Worker
   - Hero section displays with images
   - Features section shows completely
   - CTA buttons work
   - Courses section shows: "Internet Connection Required"
   - Navigation works smoothly

### When User Goes Offline (After Using App):

1. **On Homepage**:
   - Everything continues to work from cache
   - Hero section, features, and CTA sections remain visible
   - Courses section shows "Internet Connection Required" message
   - Dashboard button still visible if user was logged in
   - All previously visited pages work from cache

2. **Accessing Dashboard**:
   - User can still see their dashboard button in navbar
   - Clicking dashboard redirects them to saved documents page
   - Toast notification informs them they're offline

3. **In Dashboard Sidebar**:
   - Saved Documents page is accessible (no lock)
   - All other pages show lock icon 🔒
   - Clicking locked pages shows error message
   - Visual feedback with reduced opacity

4. **On Saved Documents Page**:
   - Full offline access to previously cached documents
   - Can view PDFs and images offline (if cached)
   - Documents show "Offline" badge when viewing cached version
   - Online/Offline indicator shows current status
   - Refresh button disabled when offline
   - Shows helpful error if document not cached

### When User Goes Online Again:

1. Session automatically syncs with server
2. All dashboard pages become accessible
3. Locks removed from sidebar items
4. Full functionality restored

## Technical Details

### Browser APIs Used:
- `navigator.onLine` - Check online status
- `window.addEventListener('online')` - Listen for online event
- `window.addEventListener('offline')` - Listen for offline event
- `localStorage` - Store session and document data

### Session Data Structure:
```typescript
interface OfflineSession {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: string;
  };
  expires: string;
}
```

### Storage Keys:
- `flare_academy_offline_session` - User session data
- `flare_academy_saved_documents` - Saved documents list
- `flare_academy_cached_doc_[attachmentId]` - Individual cached document content (base64)

### Document Caching Process:
1. **When Saving**: 
   - User clicks "Save" button on document
   - Document is downloaded via fetch API
   - Converted to base64 using FileReader
   - Stored in localStorage with unique key
   - Shows progress toast during caching
   
2. **When Viewing Offline**:
   - Checks localStorage for cached version
   - If found: displays base64 content directly
   - If not found: shows error message
   - Works for both PDFs (in iframe) and images (in img tag)
   
3. **When Unsaving**:
   - Removes from database
   - Deletes cached content from localStorage
   - Frees up storage space

## Security Considerations

1. **Session Expiry**: Offline sessions respect the original session expiry time
2. **Data Validation**: Session data is validated before use
3. **Automatic Cleanup**: Expired sessions are automatically removed
4. **Logout Cleanup**: Offline session and cached documents cleared when user logs out
5. **Limited Access**: Only saved documents are accessible offline
6. **Document Protection**: Cached documents retain watermarks and security features
7. **Storage Limits**: Handles localStorage quota gracefully

## Performance & Storage

### Storage Usage:
- **Session Data**: ~1-2 KB per session
- **Document Metadata**: ~0.5 KB per document
- **Cached Documents**: Varies by file size (PDFs: 500KB-5MB, Images: 100KB-1MB)
- **Total Recommended**: Keep cached documents under 50MB for best performance

### Browser Limits:
- localStorage limit: ~5-10MB (varies by browser)
- Automatic quota exceeded handling
- Graceful degradation if storage full

### Performance Tips:
1. Cache only frequently accessed documents
2. Clear old cached documents periodically
3. Prefer smaller file sizes for offline caching
4. Monitor localStorage usage in dev tools

## Future Enhancements

Possible improvements:
1. Service Worker for true offline support
2. Background sync for document updates
3. Offline course content caching
4. Progressive Web App (PWA) features
5. Offline form submissions with sync queue

## Testing the Feature

### Test 1: Starting Completely Offline
1. **Open DevTools** (F12) → Network tab
2. **Set to "Offline"** BEFORE loading the page
3. **Visit** `localhost:3000`
4. ✅ Homepage loads perfectly with all images
5. ✅ Courses section shows "Internet Connection Required"
6. ✅ Navigation works, all cached pages load

### Test 2: Going Offline While Using App
1. **Load the application** normally (online)
2. **Log in** and save a document
3. **Open DevTools** (F12) → Network tab
4. **Set to "Offline"**
5. ✅ Try navigating - everything works from cache
6. ✅ Dashboard redirects to saved documents
7. ✅ View saved documents offline

### Test 3: Service Worker Inspection
1. Open DevTools → **Application** tab
2. Click **Service Workers** in left sidebar
3. ✅ See "flare-academy" service worker active
4. ✅ Check **Cache Storage** → see cached assets
5. ✅ Inspect what's cached

### Test 4: PWA Installation
1. Visit the site in Chrome/Edge
2. Look for **Install** button in address bar
3. Click to install as desktop/mobile app
4. ✅ App works standalone
5. ✅ Works offline after installation

## Files Created/Modified

### New Files (Service Worker & PWA):
1. `public/sw.js` - **New** - Service Worker script
2. `lib/register-sw.ts` - **New** - Service Worker registration
3. `components/service-worker-registration.tsx` - **New** - Registration component
4. `public/manifest.json` - **New** - PWA manifest

### New Files (Offline Core):
5. `hooks/use-online.ts` - **New** - Online/offline detection hook
6. `lib/offline-session.ts` - **New** - Session persistence utilities
7. `lib/offline-document-cache.ts` - **New** - Document caching system
8. `components/offline-redirect.tsx` - **New** - Dashboard redirect logic

### Modified Files:
9. `app/layout.tsx` - Modified - Added Service Worker registration & PWA metadata
10. `components/navbar.tsx` - Modified - Session storage & display
11. `components/secure-document-viewer.tsx` - Modified - Offline document viewing
12. `app/page.tsx` - Modified - Offline message in courses
13. `app/dashboard/layout.tsx` - Modified - Added offline redirect
14. `app/dashboard/_components/sidebar-item.tsx` - Modified - Lock system
15. `app/dashboard/(routes)/saved-documents/page.tsx` - Modified - Pass attachment ID
16. `app/(course)/courses/[courseId]/chapters/[chapterId]/page.tsx` - Modified - Auto-caching
17. `app/api/saved-documents/[savedDocumentId]/route.ts` - Modified - Async params fix
18. `app/api/saved-documents/by-attachment/[attachmentId]/route.ts` - Modified - Async params fix
19. `lib/translations/en.json` - Modified - New translations
20. `lib/translations/ar.json` - Modified - New translations

## Support

For issues or questions about offline functionality, please check:
1. Browser console for error messages
2. Network tab for failed requests
3. Application tab for localStorage data
4. Console logs for offline detection events

