"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { api } from "@/lib/api";
import {
  getNotifications,
  markNotificationsRead,
  NOTIF_SEVERITY_META,
  type DemoCollege,
} from "@/lib/demo";

function unwrap(data: unknown): DemoCollege[] {
  if (Array.isArray(data)) return data as DemoCollege[];
  const c = (data as { colleges?: DemoCollege[] })?.colleges;
  return Array.isArray(c) ? c : [];
}

function timeAgo(d: Date): string {
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [readVersion, setReadVersion] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const { data: colleges = [] } = useQuery({
    queryKey: ["colleges"],
    queryFn: () => api.get("/platform/colleges").then((r) => unwrap(r.data)),
  });

  // readVersion forces a recompute of read-state after "mark all read".
  const notifications = colleges.length
    ? getNotifications(colleges)
    : [];
  void readVersion;
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function markAll() {
    markNotificationsRead(notifications.map((n) => n.id));
    setReadVersion((v) => v + 1);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Notifications</p>
            {notifications.length > 0 && (
              <button
                onClick={markAll}
                className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-primary"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-gray-400">You&apos;re all caught up</div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {notifications.map((n) => {
                  const meta = NOTIF_SEVERITY_META[n.severity];
                  return (
                    <li key={n.id} className={`flex gap-3 px-4 py-3 ${n.read ? "" : "bg-primary/[0.03]"}`}>
                      <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                        <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.time)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
