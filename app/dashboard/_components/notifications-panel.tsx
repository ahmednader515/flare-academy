"use client";

import { useState, useEffect } from "react";
import { Bell, X, BookOpen, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/contexts/language-context";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import axios from "axios";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  courseId: string;
  chapterId: string | null;
  createdAt: string;
  course: {
    id: string;
    title: string;
    imageUrl: string | null;
  };
}

export const NotificationsPanel = () => {
  const { t, isRTL } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/notifications");
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      await axios.patch("/api/notifications", { notificationId });
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.patch("/api/notifications", { markAllAsRead: true });
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative h-11 w-11 md:h-12 md:w-12 hover:bg-primary/10 hover:text-primary transition-all rounded-full border-2 border-transparent hover:border-primary/20"
      >
        <Bell className="h-7 w-7 md:h-8 md:w-8 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 rtl:-right-1 ltr:-left-1 h-6 w-6 md:h-7 md:w-7 rounded-full bg-red-500 text-white text-xs md:text-sm font-bold flex items-center justify-center border-2 border-background shadow-lg animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {/* Notifications Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div 
            className="absolute top-14 w-80 md:w-96 bg-white dark:bg-gray-900 rounded-lg shadow-2xl border z-50 max-h-[500px] flex flex-col max-w-[calc(100vw-2rem)]"
            style={{
              left: isRTL ? 0 : 'auto',
              right: isRTL ? 'auto' : 0
            }}
          >
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-lg">
              {t("dashboard.notifications") || "الإشعارات"}
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  {t("dashboard.markAllAsRead") || "تحديد الكل كمقروء"}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <Bell className="h-12 w-12 mb-4 opacity-50" />
                <p>{t("dashboard.noNotifications") || "لا توجد إشعارات"}</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <Link
                    key={notification.id}
                    href={
                      notification.chapterId
                        ? `/courses/${notification.courseId}/chapters/${notification.chapterId}`
                        : `/courses/${notification.courseId}`
                    }
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div
                      className={`p-4 hover:bg-muted transition-colors cursor-pointer ${
                        !notification.isRead ? "bg-blue-50 dark:bg-blue-900/20" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium text-sm">
                              {notification.title}
                            </h4>
                            {!notification.isRead && (
                              <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1"></div>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span
                              className="text-xs text-muted-foreground"
                              dir="ltr"
                            >
                              {formatDistanceToNow(
                                new Date(notification.createdAt),
                                {
                                  addSuffix: true,
                                }
                              )}
                            </span>
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                {t("dashboard.markAsRead") || "تحديد كمقروء"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
        </>
      )}
    </div>
  );
};

