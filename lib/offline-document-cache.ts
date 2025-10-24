"use client";

/**
 * Download and convert a file to base64 for offline caching
 */
export async function downloadAndCacheDocument(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch document");
    }

    const blob = await response.blob();
    
    // Convert blob to base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error caching document:", error);
    return null;
  }
}

/**
 * Check if a document is cached for offline use
 */
export function isDocumentCached(attachmentId: string): boolean {
  try {
    const key = `flare_academy_cached_doc_${attachmentId}`;
    return localStorage.getItem(key) !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Get cached document content
 */
export function getCachedDocument(attachmentId: string): string | null {
  try {
    const key = `flare_academy_cached_doc_${attachmentId}`;
    return localStorage.getItem(key);
  } catch (error) {
    console.error("Error getting cached document:", error);
    return null;
  }
}

/**
 * Save document content to cache
 */
export function saveCachedDocument(attachmentId: string, base64Content: string): boolean {
  try {
    const key = `flare_academy_cached_doc_${attachmentId}`;
    localStorage.setItem(key, base64Content);
    return true;
  } catch (error) {
    console.error("Error saving cached document:", error);
    // localStorage might be full
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.warn("localStorage quota exceeded. Document may not be fully cached for offline use.");
    }
    return false;
  }
}

/**
 * Delete cached document
 */
export function deleteCachedDocument(attachmentId: string): void {
  try {
    const key = `flare_academy_cached_doc_${attachmentId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Error deleting cached document:", error);
  }
}

/**
 * Get the size of cached document in MB
 */
export function getCachedDocumentSize(attachmentId: string): number {
  try {
    const cached = getCachedDocument(attachmentId);
    if (!cached) return 0;
    
    // Calculate size in MB
    const bytes = new Blob([cached]).size;
    return bytes / (1024 * 1024);
  } catch (error) {
    return 0;
  }
}

