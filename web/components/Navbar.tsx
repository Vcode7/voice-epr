'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, ShieldCheck, AlertCircle, Mic } from 'lucide-react';
import { AskAIModal } from './modals/AskAIModal';

export function Navbar() {
  const [showAskAI, setShowAskAI] = useState(false);
  const [keyStatus, setKeyStatus] = useState<{ isConfigured: boolean; activeKeyType: string }>({
    isConfigured: false,
    activeKeyType: 'none',
  });

  useEffect(() => {
    fetch('/api/groq/status')
      .then((res) => res.json())
      .then((data) => setKeyStatus(data))
      .catch(() => {});
  }, []);

  return (
    <>
      <header className="h-14 sm:h-16 bg-card/75 backdrop-blur-md border-b border-cardBorder px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 no-print">
        <div className="flex items-center space-x-3">
          {/* Mobile Brand Logo */}
          <Link href="/" className="md:hidden flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primaryDark to-primary flex items-center justify-center shadow-md shadow-primary/20">
              <Mic className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm text-text tracking-tight flex items-center gap-1">
              Voice EPR
            </span>
          </Link>

          {/* Desktop & Mobile Status Badge */}
          <div className="flex items-center space-x-2 text-[11px] sm:text-xs">
            {keyStatus.isConfigured ? (
              <span className="flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-secondary/15 text-secondary border border-secondary/30 font-medium">
                <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden xs:inline">Groq AI</span> Online
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium">
                <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                Offline
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={() => setShowAskAI(true)}
            className="flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-primaryDark to-primary hover:from-primary hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-primary/20 transition-all cursor-pointer active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            <span>Ask AI</span>
          </button>
        </div>
      </header>

      {showAskAI && <AskAIModal onClose={() => setShowAskAI(false)} />}
    </>
  );
}
