"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useOnline } from "@/hooks/use-online";
import { toast } from "sonner";
import { useLanguage } from "@/lib/contexts/language-context";

export const OfflineRedirect = () => {
  const isOnline = useOnline();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();

  useEffect(() => {
    // Allow access to saved-documents page when offline
    if (!isOnline && !pathname.includes('/saved-documents')) {
      toast.info(t('dashboard.offlineRedirectMessage'));
      router.push('/dashboard/saved-documents');
    }
  }, [isOnline, pathname, router, t]);

  return null;
};

