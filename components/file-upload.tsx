"use client";

import { useState, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/lib/contexts/language-context";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
    onChange: (res?: { url: string; name: string }) => void;
    endpoint: "courseImage" | "chapterVideo" | "courseAttachment";
}

// Map endpoints to R2 folders
const endpointToFolder: Record<string, string> = {
    courseImage: "images",
    chapterVideo: "videos",
    courseAttachment: "documents",
};

export const FileUpload = ({
    onChange,
    endpoint = "courseAttachment",
}: FileUploadProps) => {
    const { t } = useLanguage();
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [fileName, setFileName] = useState<string>("");
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const folder = endpointToFolder[endpoint] || "misc";

    const uploadFile = async (file: File) => {
        setIsUploading(true);
        setUploadProgress(0);
        setFileName(file.name);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("folder", folder);
                
            // Use fetch with SSE
            const response = await fetch("/api/r2/upload", {
                method: "POST",
                body: formData,
            });
                    
            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            if (!response.body) {
                throw new Error("No response body");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
                        
            // Parse SSE stream
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            if (data.progress !== undefined) {
                                setUploadProgress(data.progress);
                            } else if (data.done) {
                                setUploadProgress(100);
                                onChange({
                                    url: data.url,
                                    name: data.name,
                            });
                                toast.success(t('common.uploadSuccess') || "File uploaded successfully!");
                            
                                // Reset after a short delay
                                setTimeout(() => {
                                    setIsUploading(false);
                                    setUploadProgress(0);
                                    setFileName("");
                                }, 1000);
                            } else if (data.error) {
                                throw new Error(data.error);
                            }
                        } catch (parseError) {
                            console.error("Error parsing SSE data:", parseError);
                        }
                    }
                }
            }
        } catch (error: any) {
            toast.error(error.message || t('common.uploadError') || "Failed to upload file");
            setIsUploading(false);
            setUploadProgress(0);
            setFileName("");
                }
    };

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);

            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                uploadFile(e.dataTransfer.files[0]);
            }
        },
        [uploadFile]
    );

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            e.preventDefault();
            if (e.target.files && e.target.files[0]) {
                uploadFile(e.target.files[0]);
        }
        },
        [uploadFile]
    );

    const onButtonClick = () => {
        fileInputRef.current?.click();
    };

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
                <div
                    className={`relative border-2 border-dashed rounded-lg p-8 transition-colors ${
                        dragActive
                            ? "border-primary bg-primary/5"
                            : "border-muted-foreground/25 bg-muted/50"
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleChange}
                        accept={endpoint === "courseImage" ? "image/*" : endpoint === "chapterVideo" ? "video/*" : undefined}
                    />
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                            <Upload className="h-6 w-6 text-primary" />
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-sm font-medium">
                                {t('common.dragDropFile') || "Drag & drop file here"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {t('common.orClickToSelect') || "or click to select"}
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onButtonClick}
                            className="mt-2"
                        >
                            {t('common.selectFile') || "Select File"}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
