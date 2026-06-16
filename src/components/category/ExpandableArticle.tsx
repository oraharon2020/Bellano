'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ExpandableArticleProps {
  html: string;
  /** Collapsed height in pixels. */
  collapsedHeight?: number;
  className?: string;
}

/**
 * Renders a long HTML article (buying guide) collapsed to a fixed height with a
 * soft fade-out and a "קרא עוד" / "הצג פחות" toggle, matching the behaviour of
 * the short ExpandableDescription used in the category header.
 */
export function ExpandableArticle({
  html,
  collapsedHeight = 220,
  className = '',
}: ExpandableArticleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      setNeedsTruncation(contentRef.current.scrollHeight > collapsedHeight + 40);
    }
  }, [html, collapsedHeight]);

  const showFade = needsTruncation && !isExpanded;

  return (
    <div>
      <div
        className="relative overflow-hidden transition-[max-height] duration-500 ease-in-out"
        style={{
          maxHeight: isExpanded || !needsTruncation ? '6000px' : `${collapsedHeight}px`,
        }}
      >
        <div
          ref={contentRef}
          className={className}
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Fade-out overlay while collapsed */}
        {showFade && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
        )}
      </div>

      {needsTruncation && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-primary hover:text-primary"
          >
            {isExpanded ? (
              <>
                <span>הצג פחות</span>
                <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                <span>קרא עוד</span>
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
