'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Pencil, X, Bold, Heading2, List, Loader2 } from 'lucide-react';
import { useAdminStore } from '@/lib/store/admin';

type EditableField = 'description' | 'short_description';

const FIELD_LABELS: Record<EditableField, string> = {
  description: 'התיאור המלא',
  short_description: 'התיאור הקצר',
};

/**
 * Count WordPress shortcodes, e.g. [video src="…"].
 *
 * The editor shows the raw post content, so shortcodes appear as literal text
 * and are easy to delete by accident, with nothing on the page afterwards to
 * hint at what went missing.
 */
const countShortcodes = (html: string) => (html.match(/\[[a-z_]+[^\]]*\]/gi) || []).length;

/**
 * Admin-only pencil for fixing product copy without opening WordPress.
 *
 * It loads the RAW text from WordPress rather than reading the rendered DOM, so
 * a save writes back the stored markup rather than whatever the browser made of
 * it — contentEditable normalises markup as it renders, and the description also
 * carries things the page does not display verbatim.
 */
export function EditProductText({
  productId,
  field,
}: {
  productId: number;
  field: EditableField;
}) {
  const { isAdmin, adminToken, logout, openLoginModal } = useAdminStore();
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [original, setOriginal] = useState('');

  useEffect(() => setMounted(true), []);

  /**
   * Push the loaded text into the editor once it is actually on screen.
   *
   * It has to happen here rather than straight after the fetch: while the text
   * is loading the modal renders a spinner instead of the editor, so at that
   * point editorRef is still null and the assignment silently does nothing.
   *
   * innerHTML rather than React state, because the editor is contentEditable —
   * if React owned its children every keystroke would fight the DOM.
   */
  useEffect(() => {
    if (!open || loading || !editorRef.current) return;
    editorRef.current.innerHTML = original;
  }, [open, loading, original]);

  // A 401 means the admin token expired. Surface it instead of failing silently
  // and send the user back to the login modal.
  const handleExpired = useCallback(() => {
    setOpen(false);
    logout();
    openLoginModal();
    alert('ההרשאה פגה — התחברו מחדש כמנהל.');
  }, [logout, openLoginModal]);

  const openEditor = useCallback(async () => {
    if (!adminToken) return;

    setOpen(true);
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/product-text?productId=${productId}`, {
        headers: { 'x-admin-token': adminToken },
        cache: 'no-store',
      });

      if (res.status === 401) {
        handleExpired();
        return;
      }

      const data = await res.json();

      if (!data?.success) {
        setError(data?.message || 'לא ניתן לטעון את הטקסט');
        return;
      }

      setOriginal((data[field] as string) || '');
    } catch {
      setError('לא ניתן לטעון את הטקסט');
    } finally {
      setLoading(false);
    }
  }, [adminToken, productId, field, handleExpired]);

  const save = useCallback(async () => {
    if (!adminToken || !editorRef.current) return;

    const value = editorRef.current.innerHTML;

    if (value === original) {
      setOpen(false);
      return;
    }

    if (countShortcodes(value) < countShortcodes(original)) {
      const proceed = confirm(
        'שים לב: נמחק מהטקסט רכיב מיוחד (למשל סרטון). לשמור בכל זאת?'
      );
      if (!proceed) return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/admin/product-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({ productId, field, value }),
      });

      if (res.status === 401) {
        handleExpired();
        return;
      }

      const data = await res.json();

      if (!data?.success) {
        setError(data?.message || 'השמירה נכשלה');
        return;
      }

      setOpen(false);
      // The plugin clears the Vercel cache for this product on save; refresh so
      // the editor sees the saved text instead of the previously rendered page.
      router.refresh();
    } catch {
      setError('השמירה נכשלה');
    } finally {
      setSaving(false);
    }
  }, [adminToken, original, productId, field, handleExpired, router]);

  /**
   * document.execCommand is deprecated but still the only one-line way to get
   * bold/heading/list out of contentEditable in every browser. This is an
   * internal tool for a handful of staff — a real editor library would be more
   * weight than the feature is worth.
   */
  /**
   * Paste as plain text.
   *
   * Staff copy from Word, WhatsApp and the old site, and a rich paste drags in
   * <span style> soup with it. This page renders the description as-is, so that
   * markup would show up on the storefront directly — and it also leaks into
   * everything else reading the description: the Google feed, exports, the AI
   * chat. insertText is used rather than writing to the DOM directly so the
   * paste stays on the browser's native undo stack.
   */
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    if (text) document.execCommand('insertText', false, text);
  };

  const format = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
  };

  if (!isAdmin || !mounted) return null;

  return (
    <>
      <button
        type="button"
        onClick={openEditor}
        title={`עריכת ${FIELD_LABELS[field]}`}
        className="no-link inline-flex items-center gap-1 align-middle mr-2 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500 transition hover:border-gray-400 hover:text-gray-900"
      >
        <Pencil className="h-3 w-3" />
        עריכה
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" dir="rtl">
            <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
                <h2 className="text-sm font-semibold text-gray-900">
                  עריכת {FIELD_LABELS[field]}
                </h2>
                <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-900">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center gap-1 border-b border-gray-100 px-5 py-2">
                <button type="button" onClick={() => format('bold')} title="מודגש" className="rounded p-1.5 text-gray-600 hover:bg-gray-100">
                  <Bold className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => format('formatBlock', 'h2')} title="כותרת" className="rounded p-1.5 text-gray-600 hover:bg-gray-100">
                  <Heading2 className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => format('insertUnorderedList')} title="רשימה" className="rounded p-1.5 text-gray-600 hover:bg-gray-100">
                  <List className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => format('removeFormat')} title="נקה עיצוב" className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100">
                  נקה עיצוב
                </button>
              </div>

              <div className="flex-1 overflow-auto px-5 py-4">
                {loading ? (
                  <div className="flex items-center justify-center py-10 text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : (
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onPaste={handlePaste}
                    dir="rtl"
                    className="min-h-[220px] rounded-lg border border-gray-200 p-3 text-sm leading-relaxed text-gray-800 outline-none focus:border-gray-400 [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_li]:mb-1 [&_p]:mb-3 [&_ul]:mr-5 [&_ul]:list-disc"
                  />
                )}

                {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-3">
                <p className="text-xs text-gray-400">השינוי נשמר בוורדפרס ומתועד ביומן העריכות</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                  >
                    ביטול
                  </button>
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving || loading}
                    className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm text-white transition hover:bg-gray-800 disabled:opacity-50"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    שמירה
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
