# Cloudflare R2 Migration Guide

This guide covers the complete migration from UploadThing to Cloudflare R2 with real-time upload progress tracking.

## Prerequisites

1. Cloudflare account with R2 enabled
2. R2 bucket created and configured
3. API tokens with R2:Read and R2:Write permissions

## Step 1: Environment Variables

Add these to your `.env` file:

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://your-bucket.r2.dev
# Or use custom domain: https://cdn.yourdomain.com

# Optional: Custom endpoint (defaults to https://{ACCOUNT_ID}.r2.cloudflarestorage.com)
R2_ENDPOINT=https://your-custom-endpoint.com
```

## Step 2: Setup CORS

Run the CORS setup script to enable video playback:

```bash
npm run setup-r2-cors
```

This configures CORS headers for GET and HEAD requests, allowing video playback in browsers.

## Step 3: Update Components

The `FileUpload` component has been updated to use R2. It automatically:
- Maps endpoints to folders (`courseImage` → `images`, `chapterVideo` → `videos`, `courseAttachment` → `documents`)
- Provides real-time progress via Server-Sent Events (SSE)
- Supports drag & drop
- Shows upload progress with a progress bar

### Usage Example

```tsx
import { FileUpload } from "@/components/file-upload";

<FileUpload
  endpoint="chapterVideo" // or "courseImage" or "courseAttachment"
  onChange={(res) => {
    if (res) {
      console.log("Uploaded:", res.url, res.name);
    }
  }}
/>
```

## Step 4: Database Migration (Optional)

If you have existing files in UploadThing that need to be migrated:

1. **Backup your database URLs:**
   ```bash
   npm run backup-db-urls
   ```

2. **Download files from UploadThing** (use existing script):
   ```bash
   npm run download-uploadthing
   ```

3. **Upload files to R2** (create mapping file):
   ```bash
   npm run upload-to-r2
   ```

4. **Migrate database URLs:**
   ```bash
   npm run migrate-db-to-r2
   ```

## Step 5: Update Next.js Config

The `next.config.js` has been updated to include R2 image domains. If you're using a custom domain, add it to the `remotePatterns`:

```javascript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'your-custom-domain.com',
    },
  ],
}
```

## Features

### ✅ Real-Time Progress Tracking
- Server-Sent Events (SSE) for live progress updates
- Progress bar showing 0-100% completion
- Smooth progress updates without polling

### ✅ Multipart Upload Support
- Automatic multipart uploads for files > 5MB
- Optimized for large video files
- Progress tracking for multipart uploads

### ✅ Organized File Structure
- Files automatically organized by type:
  - `images/` - Course images, profile pictures
  - `videos/` - Chapter videos
  - `documents/` - PDFs, attachments
  - `misc/` - Other files

### ✅ CORS Configuration
- Pre-configured CORS for video playback
- Supports range requests for video seeking
- Exposes necessary headers

## API Endpoints

### POST `/api/r2/upload`

Uploads a file to R2 with SSE progress updates.

**Request:**
- `file`: File to upload (FormData)
- `folder`: Optional folder name (defaults to auto-detected folder)

**Response:** Server-Sent Events stream with:
- `progress`: Upload progress (0-100)
- `done`: Upload complete with URL
- `error`: Error message if upload fails

## Troubleshooting

### Videos not playing
- Ensure CORS is configured: `npm run setup-r2-cors`
- Check that `R2_PUBLIC_URL` is correct
- Verify bucket has public access enabled

### Upload stuck at 10%
- Check R2 credentials in `.env`
- Verify bucket name is correct
- Check network connectivity

### Progress not updating
- Ensure SSE stream is being parsed correctly
- Check browser console for errors
- Verify API route is returning SSE format

### Database migration fails
- Ensure mapping file exists (`uploadthing-to-r2-mapping.json`)
- Check database connection
- Verify backup was created before migration

## File Structure

```
lib/r2/
  ├── config.ts          # R2 client configuration
  └── upload.ts          # Upload utilities

app/api/r2/
  └── upload/
      └── route.ts       # Upload API with SSE

components/
  ├── file-upload.tsx    # Main upload component (updated)
  └── file-upload-r2.tsx # Alternative R2 component

scripts/
  ├── setup-r2-cors.ts           # CORS configuration script
  ├── backup-db-urls.ts          # Database backup script
  └── migrate-db-urls-to-r2.ts   # Database migration script
```

## Next Steps

1. ✅ Install dependencies (`@aws-sdk/client-s3`, `@aws-sdk/lib-storage`)
2. ✅ Configure environment variables
3. ✅ Setup CORS
4. ✅ Test file uploads
5. ✅ Migrate existing files (if needed)
6. ✅ Update database URLs (if needed)

## Support

For issues or questions:
- Check Cloudflare R2 documentation
- Review AWS S3 SDK documentation (R2 is S3-compatible)
- Check browser console for errors
- Verify environment variables are set correctly

