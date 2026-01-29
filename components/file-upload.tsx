"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { UploadDropzone } from "@/lib/uploadthing";
import { ourFileRouter } from "@/lib/uploadthing/core";
import toast from "react-hot-toast";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/lib/contexts/language-context";

interface FileUploadProps {
    onChange: (res?: { url: string; name: string }) => void;
    endpoint: keyof typeof ourFileRouter;
}

interface UploadProgressData {
    bytesUploaded: number;
    totalBytes: number;
    time: number;
}

export const FileUpload = ({
    onChange,
    endpoint,
}: FileUploadProps) => {
    const { t } = useLanguage();
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const progressHistoryRef = useRef<UploadProgressData[]>([]);
    const fileSizeRef = useRef<number | null>(null);
    const activeXHRRef = useRef<XMLHttpRequest | null>(null);
    const fileInputObserverRef = useRef<MutationObserver | null>(null);
    const isInterceptingRef = useRef(false);

    // Calculate time remaining based on actual upload speed
    const calculateTimeRemaining = useCallback(() => {
        if (progressHistoryRef.current.length < 2 || !fileSizeRef.current) {
            return null;
        }

        const now = Date.now();
        const latest = progressHistoryRef.current[progressHistoryRef.current.length - 1];
        
        // Calculate time elapsed since last progress update
        const timeSinceLastUpdate = (now - latest.time) / 1000; // seconds
        
        // Get recent progress data points (last 5) for speed calculation
        const recent = progressHistoryRef.current.slice(-5);
        if (recent.length < 2) return null;

        const oldest = recent[0];
        
        const timeDelta = (latest.time - oldest.time) / 1000; // seconds
        const bytesDelta = latest.bytesUploaded - oldest.bytesUploaded;

        if (timeDelta > 0.5 && bytesDelta > 0) {
            // Calculate upload speed (bytes per second)
            const uploadSpeed = bytesDelta / timeDelta;
            
            // Calculate remaining bytes
            const remainingBytes = fileSizeRef.current - latest.bytesUploaded;
            
            if (remainingBytes > 0 && uploadSpeed > 0) {
                // Account for time passed since last progress event
                const estimatedSecondsRemaining = remainingBytes / uploadSpeed;
                
                // Subtract time that has passed since last update for smoother countdown
                const adjustedSecondsRemaining = Math.max(0, estimatedSecondsRemaining - timeSinceLastUpdate);
                
                if (adjustedSecondsRemaining > 0 && adjustedSecondsRemaining < 3600) {
                    const minutes = Math.floor(adjustedSecondsRemaining / 60);
                    const seconds = Math.floor(adjustedSecondsRemaining % 60);
                    
                    if (minutes > 0) {
                        return t('common.timeRemainingMinutes', { minutes, seconds });
                    } else if (seconds >= 0) {
                        return t('common.timeRemainingSeconds', { seconds });
                    }
                }
            }
        }
        
        return null;
    }, [t]);

    // Intercept XMLHttpRequest to track upload progress
    useEffect(() => {
        if (isInterceptingRef.current) return;
        isInterceptingRef.current = true;

        const originalXHROpen = XMLHttpRequest.prototype.open;
        const originalXHRSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function(method: string, url: string | URL, async?: boolean, username?: string | null, password?: string | null) {
            (this as any)._utUrl = url.toString();
            return originalXHROpen.call(this, method, url, async ?? true, username ?? null, password ?? null);
        };

        XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
            const url = (this as any)._utUrl;
            
            // Check if this is an UploadThing upload request
            if (url && (url.includes('/api/uploadthing') || url.includes('uploadthing'))) {
                activeXHRRef.current = this;
                
                // Get file size from FormData if available
                if (body instanceof FormData) {
                    const file = body.get('file') as File;
                    if (file && file.size > 0) {
                        fileSizeRef.current = file.size;
                    }
                }

                // Track upload progress
                this.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable && fileSizeRef.current) {
                        const now = Date.now();
                        const bytesUploaded = e.loaded;
                        const percentComplete = (bytesUploaded / fileSizeRef.current) * 100;
                        
                        // Store progress data
                        progressHistoryRef.current.push({
                            bytesUploaded,
                            totalBytes: fileSizeRef.current,
                            time: now,
                        });

                        // Keep only last 20 entries
                        if (progressHistoryRef.current.length > 20) {
                            progressHistoryRef.current.shift();
                        }

                        // Update progress - only from actual events, no timer
                        const progressValue = Math.min(95, percentComplete);
                        setUploadProgress(progressValue);
                        
                        // Calculate and set time remaining based on actual speed
                        const timeRemainingStr = calculateTimeRemaining();
                        if (timeRemainingStr) {
                            setTimeRemaining(timeRemainingStr);
                        }
                    }
                });

                this.addEventListener('load', () => {
                    activeXHRRef.current = null;
                });

                this.addEventListener('error', () => {
                    activeXHRRef.current = null;
                });
            }
            
            return originalXHRSend.call(this, body ?? null);
        };

        return () => {
            XMLHttpRequest.prototype.open = originalXHROpen;
            XMLHttpRequest.prototype.send = originalXHRSend;
            isInterceptingRef.current = false;
        };
    }, [calculateTimeRemaining]);

    // Intercept fetch requests (UploadThing might use fetch)
    useEffect(() => {
        if (!isUploading) return;

        const originalFetch = window.fetch;
        
        window.fetch = async function(...args) {
            const [url, options] = args;
            const urlString = typeof url === 'string' ? url : url.toString();
            
            // Check if this is an UploadThing upload request
            if ((urlString.includes('/api/uploadthing') || urlString.includes('uploadthing')) && options?.body instanceof FormData) {
                const formData = options.body as FormData;
                const file = formData.get('file') as File;
                
                if (file && file.size > 0) {
                    fileSizeRef.current = file.size;
                }

                // Use XMLHttpRequest for progress tracking
                const xhr = new XMLHttpRequest();
                activeXHRRef.current = xhr;
                
                return new Promise((resolve, reject) => {
                    xhr.upload.addEventListener('progress', (e) => {
                        if (e.lengthComputable && fileSizeRef.current) {
                            const now = Date.now();
                            const bytesUploaded = e.loaded;
                            const percentComplete = (bytesUploaded / fileSizeRef.current) * 100;
                            
                            // Store progress data
                            progressHistoryRef.current.push({
                                bytesUploaded,
                                totalBytes: fileSizeRef.current,
                                time: now,
                            });

                            // Keep only last 20 entries
                            if (progressHistoryRef.current.length > 20) {
                                progressHistoryRef.current.shift();
                            }

                            // Update progress - only from actual events
                            const progressValue = Math.min(95, percentComplete);
                            setUploadProgress(progressValue);
                            
                            // Calculate time remaining
                            const timeRemainingStr = calculateTimeRemaining();
                            if (timeRemainingStr) {
                                setTimeRemaining(timeRemainingStr);
                            }
                        }
                    });

                    xhr.addEventListener('load', () => {
                        activeXHRRef.current = null;
                        if (xhr.status >= 200 && xhr.status < 300) {
                            try {
                                const response = new Response(xhr.responseText, {
                                    status: xhr.status,
                                    statusText: xhr.statusText,
                                    headers: new Headers()
                                });
                                resolve(response);
                            } catch (error) {
                                reject(error);
                            }
                        } else {
                            reject(new Error(`HTTP ${xhr.status}`));
                        }
                    });

                    xhr.addEventListener('error', () => {
                        activeXHRRef.current = null;
                        reject(new Error('Network error'));
                    });

                    xhr.open('POST', urlString);
                    
                    // Copy headers from original request
                    if (options?.headers) {
                        const headers = options.headers as Headers;
                        if (headers instanceof Headers) {
                            headers.forEach((value, key) => {
                                xhr.setRequestHeader(key, value);
                            });
                        } else if (typeof headers === 'object') {
                            Object.entries(headers).forEach(([key, value]) => {
                                if (typeof value === 'string') {
                                    xhr.setRequestHeader(key, value);
                                }
                            });
                        }
                    }
                    
                    xhr.send(formData);
                });
            }
            
            // For non-upload requests, use original fetch
            return originalFetch.apply(this, args);
        };

        return () => {
            window.fetch = originalFetch;
        };
    }, [isUploading, calculateTimeRemaining]);

    // Update time remaining display smoothly every second
    useEffect(() => {
        if (!isUploading) return;

        // Update time remaining every second for smooth countdown
        const interval = setInterval(() => {
            if (progressHistoryRef.current.length >= 2 && fileSizeRef.current) {
                const timeRemainingStr = calculateTimeRemaining();
                if (timeRemainingStr) {
                    setTimeRemaining(timeRemainingStr);
                } else {
                    // If calculation returns null, clear the display
                    setTimeRemaining(null);
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isUploading, calculateTimeRemaining]);

    // Monitor file input to get file size
    useEffect(() => {
        const findAndObserveFileInput = () => {
            const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
            if (fileInput && !fileInput.dataset.observed) {
                fileInput.dataset.observed = 'true';
                
                fileInput.addEventListener('change', (e) => {
                    const input = e.target as HTMLInputElement;
                    if (input.files && input.files.length > 0) {
                        const file = input.files[0];
                        fileSizeRef.current = file.size;
                    }
                });
            }
        };

        findAndObserveFileInput();

        const observer = new MutationObserver(() => {
            findAndObserveFileInput();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        fileInputObserverRef.current = observer;

        return () => {
            observer.disconnect();
        };
    }, []);

    const handleUploadBegin = (fileName: string) => {
        setIsUploading(true);
        setUploadProgress(0);
        progressHistoryRef.current = [];
        startTimeRef.current = Date.now();
        setTimeRemaining(null);
        
        // Try to get file size from file input
        setTimeout(() => {
            const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
            if (fileInput && fileInput.files && fileInput.files.length > 0) {
                fileSizeRef.current = fileInput.files[0].size;
            }
        }, 100);
    };

    const handleUploadComplete = (res: any) => {
        setUploadProgress(100);
        setIsUploading(false);
        setTimeRemaining(null);
        activeXHRRef.current = null;

        setTimeout(() => {
            setUploadProgress(0);
            startTimeRef.current = null;
            progressHistoryRef.current = [];
            fileSizeRef.current = null;
        }, 1500);

        if (res && res[0]) {
            onChange({
                url: res[0].url || res[0].ufsUrl,
                name: res[0].name
            });
        }
    };

    const handleUploadError = (error: Error) => {
        setIsUploading(false);
        setUploadProgress(0);
        setTimeRemaining(null);
        startTimeRef.current = null;
        progressHistoryRef.current = [];
        fileSizeRef.current = null;
        activeXHRRef.current = null;
        
        toast.error(`${error?.message}`);
    };

    return (
        <div className="space-y-4">
            <UploadDropzone
                endpoint={endpoint}
                onUploadBegin={handleUploadBegin}
                onClientUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
            />
            {isUploading && (
                <div className="space-y-2 p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground font-medium">
                            {t('common.uploading')}...
                        </span>
                        <span className="font-semibold text-primary">
                            {Math.round(uploadProgress)}%
                        </span>
                    </div>
                    <Progress value={uploadProgress} className="h-2.5" />
                    {timeRemaining && (
                        <div className="text-xs text-muted-foreground text-center mt-1">
                            {timeRemaining}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
