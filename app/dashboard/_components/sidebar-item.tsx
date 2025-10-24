"use client";

import { cn } from "@/lib/utils";
import { LucideIcon, Lock } from "lucide-react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { SheetClose } from "@/components/ui/sheet";
import { useOnline } from "@/hooks/use-online";
import { toast } from "sonner";
import { useLanguage } from "@/lib/contexts/language-context";

interface SidebarItemProps {
    icon: LucideIcon;
    label: string;
    href: string;
    closeOnClick?: boolean;
}

export const SidebarItem = ({
    icon: Icon,
    label,
    href,
    closeOnClick = false
}: SidebarItemProps) => {

    const pathName = usePathname();
    const router = useRouter();
    const isOnline = useOnline();
    const { t } = useLanguage();
    

    const isActive = pathName === href;
    const isSavedDocuments = href.includes('/saved-documents');
    const isLocked = !isOnline && !isSavedDocuments;

    const onClick = () => {
        if (isLocked) {
            toast.error(t('dashboard.offlineAccessDescription'));
            return;
        }
        if (!isActive) router.push(href);
    }

    const ButtonEl = (
        <button
            onClick={onClick}
            type="button"
            className={cn(
                "flex items-center gap-x-2 text-muted-foreground text-sm font-[500] rtl:pr-6 ltr:pl-6 transition-all hover:text-primary hover:bg-primary/10",
                isActive && "text-primary bg-primary/10 hover:bg-primary/10",
                isLocked && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground"
            )}
        >
            <div className="flex items-center gap-x-2 py-3">
                <Icon 
                    size={22} 
                    className={cn(
                        "text-muted-foreground",
                        isActive && "text-primary"
                    )} 
                />
                {label}
                {isLocked && (
                    <Lock size={16} className="rtl:mr-1 ltr:ml-1 text-muted-foreground" />
                )}
            </div>

            <div 
                className={cn(
                    "rtl:mr-auto ltr:ml-auto opacity-0 border-2 border-primary h-full transition-all",
                    isActive && "opacity-100"
                )}
            />
        </button>
    );

    return closeOnClick ? (
        <SheetClose asChild>
            {ButtonEl}
        </SheetClose>
    ) : (
        ButtonEl
    );
}