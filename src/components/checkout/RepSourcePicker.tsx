'use client';

import { REP_SOURCE_NOTE_MAX, REP_SOURCE_OPTIONS, REP_SOURCE_QUESTION, type RepSource } from '@/lib/rep-source';

/** Anchor the checkout's "still missing" hint links to. */
export const REP_SOURCE_ANCHOR = 'rep-source';

interface RepSourcePickerProps {
  value: RepSource | '';
  note: string;
  onChange: (value: RepSource) => void;
  onNoteChange: (note: string) => void;
}

/**
 * "איך הלקוח הגיע אלינו?" — rendered by the checkout in sales-rep mode only.
 * Native radios under one name give the group its keyboard behaviour (arrows
 * move and select); they are visually hidden and the label is the tap target.
 */
export default function RepSourcePicker({ value, note, onChange, onNoteChange }: RepSourcePickerProps) {
  return (
    <section
      id={REP_SOURCE_ANCHOR}
      aria-labelledby="rep-source-title"
      className="bg-white rounded-lg shadow-sm p-6 scroll-mt-28"
    >
      <div className="flex items-start justify-between gap-3 mb-1">
        <h2 id="rep-source-title" className="text-lg font-bold">
          {REP_SOURCE_QUESTION} <span className="text-red-500" aria-hidden="true">*</span>
        </h2>
        <span className="shrink-0 text-xs font-medium bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
          מצב נציג
        </span>
      </div>
      <p id="rep-source-help" className="text-sm text-gray-500 mb-4">
        שאלו את הלקוח וסמנו תשובה אחת — חובה לפני סיום ההזמנה. הלקוח לא רואה את השאלה הזו.
      </p>

      <div
        role="radiogroup"
        aria-labelledby="rep-source-title"
        aria-describedby="rep-source-help"
        aria-required="true"
        className="grid grid-cols-2 sm:grid-cols-3 gap-2"
      >
        {REP_SOURCE_OPTIONS.map((option) => (
          // The catch-all gets a row of its own, under the named answers.
          <label key={option.value} className={option.value === 'other' ? 'block col-span-2 sm:col-span-3' : 'block'}>
            <input
              type="radio"
              name="rep_source"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span className="flex min-h-12 items-center justify-center rounded-lg border border-gray-200 px-3 py-3 text-center text-sm cursor-pointer transition-colors hover:border-gray-300 peer-checked:border-black peer-checked:bg-gray-50 peer-checked:font-medium peer-focus-visible:ring-2 peer-focus-visible:ring-black peer-focus-visible:ring-offset-2">
              {option.label}
            </span>
          </label>
        ))}
      </div>

      {value === 'other' && (
        <div className="mt-4">
          <label htmlFor="rep-source-note" className="block text-sm font-medium mb-1">
            פירוט (לא חובה)
          </label>
          <input
            id="rep-source-note"
            type="text"
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            maxLength={REP_SOURCE_NOTE_MAX}
            placeholder="למשל: שלט ברחוב, תערוכה, רדיו"
            aria-describedby="rep-source-note-count"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
          />
          <p id="rep-source-note-count" className="text-xs text-gray-400 mt-1">
            {note.length}/{REP_SOURCE_NOTE_MAX}
          </p>
        </div>
      )}
    </section>
  );
}
