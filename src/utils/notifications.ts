import type { AppNotification } from "../types.js";

export function isNotificationUnreadForUser(notification: AppNotification, userId: string): boolean {
  return !notification.read && !(notification.readBy || []).includes(userId);
}

export function unreadNotificationCountForUser(notifications: AppNotification[], userId: string): number {
  return notifications.filter(notification => isNotificationUnreadForUser(notification, userId)).length;
}
