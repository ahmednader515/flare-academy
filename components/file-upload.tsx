"use client";

import { useState } from "react";
import { UploadDropzone } from "@/lib/uploadthing";
import { useLanguage } from "@/lib/contexts/language-context";
import toast from "react-hot-toast";
import { Progress } from "@/components/ui/progress";

interface FileUploadProps {
    onChange: (res?: { url: string; name: string }) => void;
    endpoint: "courseImage" | "chapterVideo" | "courseAttachment";
}

export const FileUpload = ({
    onChange,
    endpoint = "courseAttachment",
}: FileUploadProps) => {
    const { t } = useLanguage();
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [fileName, setFileName] = useState<string>("");

    return (
        <div className="space-y-4">
            {isUploading ? (
                <div className="space-y-2 p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground font-medium">
                            {t('common.uploading') || "Uploading"}... {fileName}
                        </span>
                        <span className="font-semibold text-primary">
                            {Math.round(uploadProgress)}%
                        </span>
                    </div>
                    <Progress value={uploadProgress} className="h-2.5" />
                </div>
            ) : (
                <UploadDropzone
                    endpoint={endpoint}
                    onUploadBegin={(name) => {
                        setIsUploading(true);
                        setUploadProgress(0);
                        setFileName(name);
                        // Simulate progress since UploadThing doesn't provide real-time progress
                        let progress = 0;
                        const interval = setInterval(() => {
                            progress += Math.random() * 15;
                            if (progress > 90) {
                                progress = 90; // Cap at 90% until upload completes
                            }
                            setUploadProgress(progress);
                        }, 200);
                        // Store interval to clear it later
                        (window as any).uploadProgressInterval = interval;
                    }}
                    onClientUploadComplete={(res) => {
                        // Clear progress interval
                        if ((window as any).uploadProgressInterval) {
                            clearInterval((window as any).uploadProgressInterval);
                        }
                        setUploadProgress(100);
                        if (res && res[0]) {
                            onChange({
                                url: res[0].url,
                                name: res[0].name,
                            });
                            toast.success(t('common.uploadSuccess') || "File uploaded successfully!");
                            
                            // Reset after a short delay
                            setTimeout(() => {
                                setIsUploading(false);
                                setUploadProgress(0);
                                setFileName("");
                            }, 1000);
                        }
                    }}
                    onUploadError={(error: Error) => {
                        // Clear progress interval
                        if ((window as any).uploadProgressInterval) {
                            clearInterval((window as any).uploadProgressInterval);
                        }
                        setIsUploading(false);
                        setUploadProgress(0);
                        setFileName("");
                        toast.error(error.message || t('common.uploadError') || "Failed to upload file");
                    }}
                />
            )}
        </div>
    );
};
