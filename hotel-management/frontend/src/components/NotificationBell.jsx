import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../config/api';

/** Uses /api/notifications — works for guests, hotel admins, and superadmins. */
const NotificationBell = ({
  emptyHint = 'No notifications yet. Refund and booking updates will appear here.'
}) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);

  const loadSummary = useCallback(async () => {
    try {
      const res = await api.get('/notifications/summary');
      if (res.data.success) setUnread(Number(res.data.unread ?? 0));
    } catch {
      /* offline or unauthenticated */
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications?limit=40');
      if (res.data.success) setItems(res.data.notifications || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
    const id = setInterval(loadSummary, 45000);
    return () => clearInterval(id);
  }, [loadSummary]);

  useEffect(() => {
    if (open) {
      loadList();
      loadSummary();
    }
  }, [open, loadList, loadSummary]);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setItems((prev) =>
        prev.map((n) => (Number(n.id) === Number(id) ? { ...n, is_read: 1 } : n))
      );
      setUnread((u) => Math.max(0, u - 1));
    } catch {
      /* noop */
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setItems((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnread(0);
    } catch {
      /* noop */
    }
  };

  const isUnread = (n) => !n.is_read || n.is_read === 0;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#E8E4DE] bg-[#FAF8F5] text-[#5c5346] transition-colors hover:border-[#C4993E]/50 hover:bg-[#FFFDFB] hover:text-[#1A2332]"
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined text-[22px]">notifications</span>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#B91C1C] px-1 text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-[60] w-[min(100vw-24px,380px)] overflow-hidden rounded-xl border border-[#E8E4DE] bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-[#F0EBE4] bg-[#FAF7F2] px-3 py-2.5">
            <span className="text-[12px] font-bold text-[#1f1c1a]">Notifications</span>
            {items.some(isUnread) && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[10px] font-semibold uppercase tracking-wider text-[#B88E2F] hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[min(70vh,360px)] overflow-y-auto custom-scrollbar">
            {loading && items.length === 0 ? (
              <p className="px-4 py-8 text-center text-[12px] text-[#7a6d62]">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-[12px] text-[#7a6d62]">{emptyHint}</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    if (isUnread(n)) markRead(n.id);
                  }}
                  className={`flex w-full flex-col gap-0.5 border-b border-[#f4f0ea] px-3 py-2.5 text-left transition-colors hover:bg-[#FAF7F2] ${
                    isUnread(n) ? 'bg-[#FFFBF5]' : ''
                  }`}
                >
                  <span className="text-[12px] font-semibold text-[#1f1c1a]">{n.title}</span>
                  <span className="text-[11px] leading-snug text-[#5c5346]">{n.message}</span>
                  <span className="text-[10px] text-[#9a8b7e]">
                    {n.created_at
                      ? new Date(n.created_at).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })
                      : ''}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
