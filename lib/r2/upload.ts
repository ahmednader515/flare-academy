import { PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "./config";
import * as fs from "fs";
import * as path from "path";

/**
 * Upload a file to R2
 */
export async function uploadToR2(
  filePath: string,
  key: string,
  contentType?: string
): Promise<string> {
  const fileBuffer = fs.readFileSync(filePath);
  
  // Detect content type from extension if not provided
  if (!contentType) {
    const ext = path.extname(key).toLowerCase().slice(1);
    const mimeTypes: Record<string, string> = {
      mp4: "video/mp4",
      webm: "video/webm",
      ogg: "video/ogg",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      pdf: "application/pdf",
      txt: "text/plain",
      mp3: "audio/mpeg",
      wav: "audio/wav",
    };
    contentType = mimeTypes[ext] || "application/octet-stream";
  }

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  });

  await r2Client.send(command);

  // Return public URL
  const url = R2_PUBLIC_URL.endsWith("/")
    ? `${R2_PUBLIC_URL}${key}`
    : `${R2_PUBLIC_URL}/${key}`;

  return url;
}

/**
 * Check if a file exists in R2
 */
export async function fileExistsInR2(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });
    await r2Client.send(command);
    return true;
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Generate a unique key for a file based on its original name
 */
export function generateR2Key(originalName: string, folder?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = folder
    ? `${folder}/${timestamp}-${random}-${sanitizedName}`
    : `${timestamp}-${random}-${sanitizedName}`;
  return key;
}

/**
 * Determine folder based on file type
 */
export function getFolderByType(fileName: string, contentType?: string): string {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  
  // Check by content type first
  if (contentType) {
    if (contentType.startsWith('video/')) return 'videos';
    if (contentType.startsWith('image/')) return 'images';
    if (contentType.startsWith('audio/')) return 'audio';
    if (contentType === 'application/pdf') return 'documents';
    if (contentType.startsWith('text/')) return 'documents';
  }
  
  // Fallback to extension
  const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi'];
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  const audioExts = ['mp3', 'wav', 'ogg', 'm4a'];
  const docExts = ['pdf', 'txt', 'doc', 'docx'];
  
  if (videoExts.includes(ext)) return 'videos';
  if (imageExts.includes(ext)) return 'images';
  if (audioExts.includes(ext)) return 'audio';
  if (docExts.includes(ext)) return 'documents';
  
  return 'misc';
}

