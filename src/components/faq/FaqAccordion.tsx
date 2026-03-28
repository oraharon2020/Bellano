'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

export default function FaqAccordion({ faqs }: { faqs: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {faqs.map((faq, index) => (
        <div 
          key={index}
          className="border border-gray-200 rounded-lg overflow-hidden"
        >
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full flex items-center justify-between p-4 text-right hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium">{faq.question}</span>
            <ChevronDown 
              className={`w-5 h-5 text-gray-400 transition-transform ${
                openIndex === index ? 'rotate-180' : ''
              }`} 
            />
          </button>
          {openIndex === index && (
            <div className="px-4 pb-4 text-gray-600 leading-relaxed">
              {faq.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
