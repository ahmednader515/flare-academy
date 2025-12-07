"use client";

import { useEffect, useRef, useState } from "react";
import { X, FileText, Lock, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/contexts/language-context";

interface SecureDocumentViewerProps {
  documentUrl: string;
  documentName: string;
  onClose: () => void;
}

export const SecureDocumentViewer = ({
  documentUrl,
  documentName,
  onClose,
}: SecureDocumentViewerProps) => {
  const { t } = useLanguage();
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  const isPDF = documentUrl.toLowerCase().includes('.pdf') || documentName.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(documentUrl) || /\.(jpg|jpeg|png|gif|webp)$/i.test(documentName);

  useEffect(() => {
    // Prevent context menu (right-click)
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Prevent keyboard shortcuts for save, print, etc.
    const preventKeyboardShortcuts = (e: KeyboardEvent) => {
      // Prevent Ctrl+S (Save)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        return false;
      }
      // Prevent Ctrl+P (Print)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        return false;
      }
      // Prevent F12 (DevTools)
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      // Prevent Ctrl+Shift+I (DevTools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
      }
      // Prevent Ctrl+U (View Source)
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        return false;
      }
    };

    // Prevent drag and drop
    const preventDragDrop = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Prevent text selection
    const preventSelection = (e: Event) => {
      e.preventDefault();
      return false;
    };

    const viewer = viewerRef.current;
    if (viewer) {
      viewer.addEventListener('contextmenu', preventContextMenu);
      viewer.addEventListener('dragstart', preventDragDrop);
      viewer.addEventListener('selectstart', preventSelection);
      document.addEventListener('keydown', preventKeyboardShortcuts);
    }

    return () => {
      if (viewer) {
        viewer.removeEventListener('contextmenu', preventContextMenu);
        viewer.removeEventListener('dragstart', preventDragDrop);
        viewer.removeEventListener('selectstart', preventSelection);
      }
      document.removeEventListener('keydown', preventKeyboardShortcuts);
    };
  }, []);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
      {/* Header */}
      <div className="bg-card border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold">{documentName}</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Lock className="h-3 w-3" />
              {t('student.secureViewing')}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Toolbar */}
      <div className="bg-card border-b p-2 flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomOut}
          disabled={zoom <= 0.5}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium min-w-[60px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomIn}
          disabled={zoom >= 3}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        {isImage && (
          <Button variant="outline" size="sm" onClick={handleRotate}>
            <RotateCw className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Viewer */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-900 relative"
        style={{ userSelect: 'none' }}
      >
        {/* Watermark Overlay */}
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="absolute inset-0 flex flex-wrap items-center justify-center opacity-10">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="text-white text-4xl font-bold transform rotate-[-45deg] m-8"
                style={{ userSelect: 'none' }}
              >
                Flare Academy
              </div>
            ))}
          </div>
        </div>

        {/* Document Content */}
        <div
          ref={viewerRef}
          className="flex items-center justify-center min-h-full p-8"
          style={{ userSelect: 'none' }}
        >
          {isPDF ? (
            <div className="w-full h-full min-h-[600px] relative">
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(documentUrl)}&embedded=true`}
                className="w-full h-full min-h-[600px] bg-white shadow-2xl"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center top',
                  border: 'none',
                }}
                title={documentName}
                allow="fullscreen"
              />
              {/* Overlay to block Google Docs toolbar buttons */}
              <div 
                className="absolute top-0 left-0 right-0 h-16 pointer-events-auto z-20"
                style={{ 
                  background: 'transparent',
                  cursor: 'default' 
                }}
                onContextMenu={(e) => e.preventDefault()}
              />
              <div 
                className="absolute bottom-0 left-0 right-0 h-16 pointer-events-auto z-20"
                style={{ 
                  background: 'transparent',
                  cursor: 'default' 
                }}
                onContextMenu={(e) => e.preventDefault()}
              />
            </div>
          ) : isImage ? (
            <img
              src={documentUrl}
              alt={documentName}
              className="max-w-full h-auto shadow-2xl"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'center',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          ) : (
            <div className="text-white text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>{t('student.unsupportedFileType')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

