'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAdminStore } from '@/lib/store/admin';
import { siteConfig } from '@/config/site';

const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || siteConfig.wordpressUrl;

interface Hotspot {
  id: string;
  image: string;
  x: number;
  y: number;
  title: string;
  text: string;
}

/**
 * Overlay of clickable info points on the product's main image.
 * - Everyone: sees the points and taps them for info.
 * - Admins: an inline editor to add/move-less place, edit and delete points,
 *   then save straight to WordPress (write is admin-token authorised server-side).
 */
export function ProductHotspots({ productId, imageUrl }: { productId: number; imageUrl: string }) {
  const { isAdmin, adminToken } = useAdminStore();
  const [all, setAll] = useState<Hotspot[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${WP_URL}/wp-json/bellano/v1/hotspots/${productId}`)
      .then((r) => (r.ok ? r.json() : { hotspots: [] }))
      .then((d) => {
        if (!cancelled) setAll(Array.isArray(d?.hotspots) ? d.hotspots : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [productId]);

  // Match by image PATH so admin.* vs www.* (or query strings) don't hide dots.
  const imgKey = (u: string) => {
    try {
      return new URL(u, WP_URL).pathname;
    } catch {
      return u;
    }
  };
  const current = all.filter((h) => imgKey(h.image) === imgKey(imageUrl));

  const addAt = useCallback(
    (e: React.MouseEvent) => {
      if (!editing || !ref.current) return;
      if ((e.target as HTMLElement).closest('[data-hs-dot],[data-hs-pop],[data-hs-bar]')) return;
      const rect = ref.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const id = 'hs_' + Math.random().toString(36).slice(2, 9);
      setAll((prev) => [
        ...prev,
        { id, image: imageUrl, x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, title: '', text: '' },
      ]);
      setOpenId(id);
      setDirty(true);
    },
    [editing, imageUrl]
  );

  const update = (id: string, patch: Partial<Hotspot>) => {
    setAll((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)));
    setDirty(true);
  };

  const remove = (id: string) => {
    setAll((prev) => prev.filter((h) => h.id !== id));
    setOpenId(null);
    setDirty(true);
  };

  const save = async () => {
    if (!adminToken) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/hotspots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, hotspots: all, adminToken }),
      });
      const d = await res.json();
      if (d?.success) {
        setAll(Array.isArray(d.hotspots) ? d.hotspots : all);
        setDirty(false);
      } else {
        alert(d?.message === 'unauthorized' ? 'ההרשאה פגה — התחברו מחדש כאדמין.' : 'שמירה נכשלה, נסו שוב.');
      }
    } catch {
      alert('שגיאת רשת בשמירה.');
    } finally {
      setSaving(false);
    }
  };

  // Regular visitors with no points: render nothing.
  if (!isAdmin && current.length === 0) return null;

  return (
    <div
      ref={ref}
      onClick={editing ? addAt : undefined}
      className={`absolute inset-0 z-20 ${editing ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'}`}
    >
      {isAdmin && (
        <div data-hs-bar className="absolute top-2 left-2 z-30 flex gap-1 pointer-events-auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditing((v) => !v);
              setOpenId(null);
            }}
            className={`text-xs rounded-md px-2 py-1 shadow ${
              editing ? 'bg-black text-white' : 'bg-white/90 text-gray-800'
            }`}
          >
            {editing ? 'סיום סימון' : '✏️ נקודות'}
          </button>
          {editing && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                save();
              }}
              disabled={saving || !dirty}
              className="text-xs rounded-md px-2 py-1 shadow bg-green-600 text-white disabled:opacity-50"
            >
              {saving ? 'שומר…' : 'שמור'}
            </button>
          )}
        </div>
      )}

      {editing && (
        <div data-hs-bar className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <span className="text-[11px] bg-black/70 text-white rounded-full px-3 py-1">
            לחצו על התמונה כדי להוסיף נקודה
          </span>
        </div>
      )}

      {current.map((h) => (
        <div
          key={h.id}
          className="absolute pointer-events-auto"
          style={{ left: `${h.x}%`, top: `${h.y}%`, transform: 'translate(-50%, -50%)' }}
        >
          <button
            type="button"
            data-hs-dot
            onClick={(e) => {
              e.stopPropagation();
              setOpenId(openId === h.id ? null : h.id);
            }}
            className="w-6 h-6 rounded-full bg-white shadow-md ring-2 ring-black/70 flex items-center justify-center text-black text-sm font-bold hover:scale-110 transition-transform"
            aria-label={h.title || 'מידע'}
          >
            +
          </button>

          {openId === h.id && (
            <div
              data-hs-pop
              dir="rtl"
              onClick={(e) => e.stopPropagation()}
              className="absolute z-40 mt-2 w-56 max-w-[70vw] bg-white rounded-xl shadow-xl border border-gray-100 p-3 text-right"
              style={{ left: '50%', transform: 'translateX(-50%)' }}
            >
              {editing ? (
                <div className="space-y-2">
                  <input
                    value={h.title}
                    onChange={(e) => update(h.id, { title: e.target.value })}
                    placeholder="כותרת"
                    className="w-full text-base border border-gray-300 rounded-md px-2 py-1"
                  />
                  <textarea
                    value={h.text}
                    onChange={(e) => update(h.id, { text: e.target.value })}
                    placeholder="תיאור"
                    rows={3}
                    className="w-full text-base border border-gray-300 rounded-md px-2 py-1"
                  />
                  <div className="flex justify-between">
                    <button type="button" onClick={() => remove(h.id)} className="text-xs text-red-600">
                      מחק
                    </button>
                    <button type="button" onClick={() => setOpenId(null)} className="text-xs text-gray-500">
                      סגור
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {h.title && <div className="font-semibold text-gray-900 text-sm mb-1">{h.title}</div>}
                  {h.text && <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{h.text}</div>}
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
