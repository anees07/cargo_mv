import assert from "node:assert/strict";
import test from "node:test";

import { isNotificationUnreadForUser, unreadNotificationCountForUser } from "./notifications.js";
import type { AppNotification } from "../types.js";

const notification = (overrides: Partial<AppNotification>): AppNotification => ({
  id: "n_1",
  title: "Notification",
  body: "Body",
  type: "info",
  createdAt: "2026-06-18T08:00:00.000Z",
  read: false,
  ...overrides,
});

test("notification unread state respects readBy for the current user", () => {
  assert.equal(isNotificationUnreadForUser(notification({ readBy: ["user_1"] }), "user_1"), false);
  assert.equal(isNotificationUnreadForUser(notification({ readBy: ["user_2"] }), "user_1"), true);
});

test("notification unread count excludes globally read and current-user read notifications", () => {
  const count = unreadNotificationCountForUser([
    notification({ id: "unread" }),
    notification({ id: "global_read", read: true }),
    notification({ id: "current_user_read", readBy: ["user_1"] }),
    notification({ id: "other_user_read", readBy: ["user_2"] }),
  ], "user_1");

  assert.equal(count, 2);
});
