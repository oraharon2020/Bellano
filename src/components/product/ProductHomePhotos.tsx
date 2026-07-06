'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { X, Copy, Check, Trash2, Upload, Home } from 'lucide-react';
import { useAdminStore } from '@/lib/store/admin';

interface HomePhoto {
  id: string;
  url: string;
  thumb: string;
}

/**
 * Admin-only "photos from homes" gallery. Sales reps open it during a call to
 * copy an image link and paste it to the customer. Not visible to customers.
 * Uploads go into the WordPress media library via the same-origin proxy.
 */
export function ProductHomePhotos({ productId }: { productId: number }) {
  const { isAdmin, adminToken } = useAdminStore();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [photos, setPhotos] = useState<HomePhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  const load = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/home-photos?productId=${productId}`, {
        headers: { 'x-admin-token': adminToken },
        cache: 'no-store',
      });
      const d = await res.json();
      setPhotos(Array.isArray(d?.photos) ? d.photos : []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [productId, adminToken]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // Lock body scroll while the gallery is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onUpload = async (files: FileList | null) => {
    if (!files || !files.length || !adminToken) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const fd = new FormData();
        fd.append('productId', String(productId));
        fd.append('adminToken', adminToken);
        fd.append('file', file);
        const res = await fetch(`/api/home-photos/upload`, { method: 'POST', body: fd });
        const d = await res.json();
        if (d?.success && d.photo) {
          setPhotos((prev) => [...prev, d.photo]);
        }
      }
    } catch {
      alert('שגיאה בהעלאה, נסו שוב.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const copyLink = async (p: HomePhoto) => {
    try {
      await navigator.clipboard.writeText(p.url);
      setCopiedId(p.id);
      setTimeout(() => setCopiedId((c) => (c === p.id ? null : c)), 1500);
    } catch {
      /* ignore */
    }
  };

  const remove = async (id: string) => {
    const next = photos.filter((p) => p.id !== id);
    setPhotos(next);
    try {
      await fetch(`/api/home-photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, adminToken, photos: next }),
      });
    } catch {
      /* ignore */
    }
  };

  if (!isAdmin) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm rounded-lg px-3 py-2 bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
      >
        <Home className="w-4 h-4" />
        תמונות מבתים
        {photos.length > 0 && <span className="text-xs opacity-70">({photos.length})</span>}
      </button>

      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/60 flex items-end sm:items-center justify-center" dir="rtl">
            <div
              className="bg-white w-full sm:max-w-3xl sm:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-2 font-semibold text-gray-900">
                  <Home className="w-5 h-5 text-amber-700" />
                  תמונות מבתים
                  <span className="text-xs font-normal text-gray-400">למנהל בלבד</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="סגור"
                  className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Upload bar */}
              <div className="px-4 py-3 border-b bg-gray-50">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 text-sm rounded-lg px-3 py-2 bg-black text-white disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? 'מעלה…' : 'העלאת תמונות'}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => onUpload(e.target.files)}
                />
                <span className="text-xs text-gray-400 mr-3">אפשר לבחור כמה תמונות ביחד</span>
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                  <p className="text-center text-gray-400 py-10">טוען…</p>
                ) : photos.length === 0 ? (
                  <p className="text-center text-gray-400 py-10">אין עדיין תמונות. העלו תמונות כדי להתחיל.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {photos.map((p) => (
                      <div key={p.id} className="relative group rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                        <div className="relative aspect-square">
                          <Image src={p.thumb || p.url} alt="תמונת בית" fill className="object-cover" sizes="200px" unoptimized />
                        </div>
                        <div className="absolute inset-x-0 bottom-0 flex">
                          <button
                            type="button"
                            onClick={() => copyLink(p)}
                            className="flex-1 flex items-center justify-center gap-1 text-xs py-2 bg-white/95 text-gray-800 hover:bg-white"
                          >
                            {copiedId === p.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-green-600" /> הועתק
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" /> העתק לינק
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(p.id)}
                            aria-label="מחק"
                            className="px-3 bg-white/95 text-red-600 hover:bg-red-50 border-r border-gray-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
