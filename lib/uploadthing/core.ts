import { auth } from "@/lib/auth";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

const handleAuth = async () => {
    const { userId } = await auth();
    if (!userId) throw new UploadThingError("Unauthorized");
    return { userId };
}

export const ourFileRouter = {
    courseImage: f({ image: {maxFileSize: "4MB", maxFileCount: 1} })
    .middleware(() => handleAuth())
    .onUploadComplete(() => {}),

    courseAttachment: f({ 
        "text/plain": { maxFileSize: "16MB", maxFileCount: 10 },
        "image/*": { maxFileSize: "4MB", maxFileCount: 10 },
        "video/*": { maxFileSize: "512MB", maxFileCount: 5 },
        "audio/*": { maxFileSize: "50MB", maxFileCount: 10 },
        "application/pdf": { maxFileSize: "16MB", maxFileCount: 10 }
    })
    .middleware(() => handleAuth())
    .onUploadComplete(async ({ file }) => {
        return { url: file.url, name: file.name };
    }),

    chapterVideo: f({ video: {maxFileCount: 1, maxFileSize: "512GB"} })
    .middleware(() => handleAuth())
    .onUploadComplete(() => {}),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
