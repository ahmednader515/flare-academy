"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/contexts/language-context";
import { useNavigation } from "@/lib/contexts/navigation-context";

export const NavigationLoading = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { isNavigating, startNavigating, stopNavigating } = useNavigation();
  const prevPathnameRef = useRef(pathname);

  // Listen for link clicks and navigation events
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      const button = target.closest('button');
      
      // Handle anchor tag clicks
      if (link && link.href && !link.href.startsWith('#') && !link.target) {
        try {
          const url = new URL(link.href);
          if (url.origin === window.location.origin && url.pathname !== pathname) {
            startNavigating(false); // Regular navigation, not browser navigation
          }
        } catch (e) {
          // Invalid URL, ignore
        }
      }
      
      // Handle button clicks that might trigger navigation
      // Check if button has data-href or is inside a navigation context
      if (button) {
        const href = button.getAttribute('data-href');
        if (href && href !== pathname && !href.startsWith('#')) {
          startNavigating(false); // Regular navigation, not browser navigation
        }
      }
    };

    const handlePopState = () => {
      startNavigating(true); // Browser navigation (back/forward)
    };

    document.addEventListener('click', handleClick, true);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('click', handleClick, true);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [pathname, startNavigating]);

  // Stop loading when pathname changes
  useEffect(() => {
    if (isNavigating && prevPathnameRef.current !== pathname) {
      stopNavigating();
      prevPathnameRef.current = pathname;
    }
  }, [pathname, searchParams, isNavigating, stopNavigating]);

  if (!isNavigating) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-black/60 via-black/50 to-black/60 backdrop-blur-md animate-in fade-in duration-200">
      {/* Animated background circles with orange theme */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#FF6B35]/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#ff8710]/10 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      {/* Loading Card */}
      <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl p-10 shadow-2xl flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300 border border-gray-100">
        {/* Spinner Container with orange gradient ring */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#FF6B35] via-[#ff8710] to-orange-500 blur-lg opacity-40 animate-pulse" />
          <div className="relative bg-white rounded-full p-4">
            <Loader2 className="h-14 w-14 text-[#FF6B35] animate-spin" strokeWidth={2.5} />
          </div>
        </div>

        {/* Loading Text */}
        <div className="text-center space-y-1">
          <p className="text-base font-bold bg-gradient-to-r from-[#FF6B35] to-[#ff8710] bg-clip-text text-transparent">
            {t('common.loading')}
          </p>
          <p className="text-xs text-gray-500">
            {t('common.pleaseWait')}
          </p>
        </div>

        {/* Animated dots with orange theme */}
        <div className="flex gap-1.5">
          <div className="w-2 h-2 bg-[#FF6B35] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-[#ff8710] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};

