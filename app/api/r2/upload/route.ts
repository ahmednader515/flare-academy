import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { Upload } from "@aws-sdk/lib-storage";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/r2/config";
import { generateR2Key, getFolderByType } from "@/lib/r2/upload";

// Route segment config for large file uploads
export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  try {
    // 1. Authentication check
    const session = await auth();
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Get file from FormData
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const folder = formData.get("folder") as string | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Create ReadableStream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Convert file to buffer
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);

          // Detect content type
          let contentType = file.type;
          if (!contentType || contentType === "application/octet-stream") {
            const ext = file.name.toLowerCase().split('.').pop();
            const mimeTypes: Record<string, string> = {
              mp4: "video/mp4",
              webm: "video/webm",
              ogg: "video/ogg",
              mov: "video/quicktime",
              avi: "video/x-msvideo",
              jpg: "image/jpeg",
              jpeg: "image/jpeg",
              png: "image/png",
              gif: "image/gif",
              webp: "image/webp",
              pdf: "application/pdf",
              txt: "text/plain",
              mp3: "audio/mpeg",
              wav: "audio/wav",
            };
            contentType = mimeTypes[ext || ""] || "application/octet-stream";
          }

          // Determine folder
          const targetFolder = folder || getFolderByType(file.name, contentType);

          // Generate key
          const key = generateR2Key(file.name, targetFolder);

          // Send initial progress
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 10 })}\n\n`));

          // 4. Setup multipart upload with progress tracking
          const uploadParams: any = {
            client: r2Client,
            params: {
              Bucket: R2_BUCKET_NAME,
              Key: key,
              Body: buffer,
              ContentType: contentType,
              CacheControl: "public, max-age=31536000, immutable",
            },
            queueSize: 1,
          };

          // Only use multipart for files > 5MB (R2 requirement)
          if (file.size > 5 * 1024 * 1024) {
            uploadParams.partSize = 5 * 1024 * 1024;
          }

          const upload = new Upload(uploadParams);

          // 5. Track progress and send SSE events
          let lastProgress = 10;
          let actualR2Progress = 0;

          upload.on("httpUploadProgress", (progress) => {
            if (progress.loaded && progress.total) {
              actualR2Progress = (progress.loaded / progress.total) * 100;
              const percent = Math.min(95, Math.round(10 + (actualR2Progress * 0.85)));

              if (percent > lastProgress) {
                lastProgress = percent;
                const progressData = JSON.stringify({
                  progress: percent,
                  loaded: progress.loaded,
                  total: progress.total,
                });
                controller.enqueue(encoder.encode(`data: ${progressData}\n\n`));
              }
            }
          });

          // 6. Complete upload and send final URL
          await upload.done();

          const url = R2_PUBLIC_URL.endsWith("/")
            ? `${R2_PUBLIC_URL}${key}`
            : `${R2_PUBLIC_URL}/${key}`;

          const result = JSON.stringify({
            done: true,
            url,
            name: file.name,
            key,
          });
          controller.enqueue(encoder.encode(`data: ${result}\n\n`));
          controller.close();
        } catch (error: any) {
          const errorData = JSON.stringify({
            error: error.message || "Failed to upload file",
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    // 7. Return SSE stream
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Failed to upload file" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

