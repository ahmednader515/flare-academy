"use client";

/**
 * Register Service Worker for offline support
 */
export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration.scope);

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is ready, inform user
              console.log('🔄 New version available! Refresh to update.');
              
              // Optionally show a toast notification
              if (typeof window !== 'undefined' && 'sonner' in window) {
                // @ts-ignore
                window.sonner?.toast?.info('New version available! Refresh to update.', {
                  duration: 10000,
                  action: {
                    label: 'Refresh',
                    onClick: () => window.location.reload(),
                  },
                });
              }
            }
          });
        });
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
      });
  });
}

/**
 * Unregister Service Worker
 */
export async function unregisterServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
      console.log('✅ Service Worker unregistered');
    }
  } catch (error) {
    console.error('❌ Failed to unregister Service Worker:', error);
  }
}

