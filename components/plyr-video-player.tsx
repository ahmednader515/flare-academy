"use client";

import { useEffect, useRef, useState, useMemo, memo } from "react";
import "plyr/dist/plyr.css";

interface PlyrVideoPlayerProps {
  videoUrl?: string;
  youtubeVideoId?: string;
  videoType?: "UPLOAD" | "YOUTUBE";
  className?: string;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
}

const PlyrVideoPlayerComponent = ({
  videoUrl,
  youtubeVideoId,
  videoType = "UPLOAD",
  className,
  onEnded,
  onTimeUpdate
}: PlyrVideoPlayerProps) => {
  const html5VideoRef = useRef<HTMLVideoElement>(null);
  const youtubeEmbedRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const isPlayerReadyRef = useRef(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Create a stable key for the video to prevent unnecessary re-renders
  const videoKey = useMemo(() => {
    if (videoType === "YOUTUBE" && youtubeVideoId) {
      return `youtube-${youtubeVideoId}`;
    }
    if (videoUrl) {
      return `upload-${videoUrl}`;
    }
    return "no-video";
  }, [videoType, youtubeVideoId, videoUrl]);

  // Initialize Plyr on mount/update and destroy on unmount
  useEffect(() => {
    let isCancelled = false;
    let readyTimeout: NodeJS.Timeout;

    async function setupPlayer() {
      // For YouTube videos, ensure we start in loading state
      if (videoType === "YOUTUBE") {
        setIsLoading(true);
        setIsPlayerReady(false);
      }

      // Wait for next tick to ensure DOM is ready, especially for YouTube
      await new Promise(resolve => {
        if (typeof window !== 'undefined') {
          // Use requestAnimationFrame to ensure DOM is ready
          requestAnimationFrame(() => {
            setTimeout(resolve, videoType === "YOUTUBE" ? 150 : 0);
          });
        } else {
          resolve(undefined);
        }
      });

      const targetEl =
        videoType === "YOUTUBE" ? youtubeEmbedRef.current : html5VideoRef.current;
      if (!targetEl) {
        setIsLoading(false);
        return;
      }

      // Dynamically import Plyr to be SSR-safe
      const plyrModule: any = await import("plyr");
      const Plyr: any = plyrModule.default ?? plyrModule;

      if (isCancelled) return;

      // Destroy any previous instance
      if (playerRef.current && typeof playerRef.current.destroy === "function") {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.warn("Error destroying previous player:", e);
        }
        playerRef.current = null;
      }

      const player = new Plyr(targetEl, {
        controls: [
          "play-large",
          "play",
          "progress",
          "current-time",
          "duration",
          "mute",
          "volume",
          "captions",
          "settings",
          "pip",
          "airplay",
          "fullscreen"
        ],
        settings: ["speed", "quality", "loop"],
        speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
        youtube: { rel: 0, modestbranding: 1 },
        ratio: "16:9"
      });

      playerRef.current = player;

      // Wait for player to be ready, especially for YouTube
      if (videoType === "YOUTUBE") {
        isPlayerReadyRef.current = false;
        const handleReady = () => {
          if (!isCancelled && !isPlayerReadyRef.current) {
            isPlayerReadyRef.current = true;
            setIsPlayerReady(true);
            setIsLoading(false);
          }
        };

        player.on("ready", handleReady);
        
        // Fallback: if ready event doesn't fire within 3 seconds, assume ready
        readyTimeout = setTimeout(() => {
          if (!isCancelled && !isPlayerReadyRef.current) {
            isPlayerReadyRef.current = true;
            setIsPlayerReady(true);
            setIsLoading(false);
          }
        }, 3000);
      } else {
        isPlayerReadyRef.current = true;
        setIsLoading(false);
        setIsPlayerReady(true);
      }

      if (onEnded) player.on("ended", onEnded);
      if (onTimeUpdate)
        player.on("timeupdate", () => onTimeUpdate(player.currentTime || 0));
    }

    setupPlayer();

    return () => {
      isCancelled = true;
      if (readyTimeout) {
        clearTimeout(readyTimeout);
      }
      if (playerRef.current && typeof playerRef.current.destroy === "function") {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.warn("Error destroying player on cleanup:", e);
        }
      }
      playerRef.current = null;
      isPlayerReadyRef.current = false;
      setIsPlayerReady(false);
      setIsLoading(true);
    };
  }, [videoKey, videoType, onEnded, onTimeUpdate]);

  const hasVideo = (videoType === "YOUTUBE" && !!youtubeVideoId) || !!videoUrl;

  if (!hasVideo) {
    return (
      <div className={`aspect-video bg-muted rounded-lg flex items-center justify-center ${className || ""}`}>
        <div className="text-muted-foreground">لا يوجد فيديو</div>
      </div>
    );
  }

  // Render YouTube embed
  if (videoType === "YOUTUBE" && youtubeVideoId) {
    return (
      <div 
        ref={containerRef}
        className={`aspect-video relative ${className || ""}`}
      >
        {isLoading && (
          <div className="absolute inset-0 bg-black flex items-center justify-center z-10">
            <div className="text-white animate-pulse">Loading video...</div>
          </div>
        )}
        <div
          ref={youtubeEmbedRef}
          data-plyr-provider="youtube"
          data-plyr-embed-id={youtubeVideoId}
          className={`w-full h-full ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-500`}
          style={{ minHeight: '100%' }}
        />
      </div>
    );
  }

  // Render HTML5 video
  return (
    <div 
      ref={containerRef}
      className={`aspect-video relative ${className || ""}`}
    >
      <video 
        ref={html5VideoRef} 
        className="w-full h-full" 
        playsInline 
        crossOrigin="anonymous"
      >
        {videoUrl ? <source src={videoUrl} type="video/mp4" /> : null}
      </video>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders that cause DOM conflicts
export const PlyrVideoPlayer = memo(PlyrVideoPlayerComponent, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.videoUrl === nextProps.videoUrl &&
    prevProps.youtubeVideoId === nextProps.youtubeVideoId &&
    prevProps.videoType === nextProps.videoType &&
    prevProps.className === nextProps.className
  );
});