'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, ShieldCheck, AlertCircle } from 'lucide-react';
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
      <header className="h-16 bg-card/60 backdrop-blur-md border-b border-cardBorder px-6 flex items-center justify-between shrink-0 no-print">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-xs">
            {keyStatus.isConfigured ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/15 text-secondary border border-secondary/30 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                Groq AI Online
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                Offline Heuristics Active
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAskAI(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primaryDark to-primary hover:from-primary hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-primary/20 transition-all cursor-pointer active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>Ask Finance AI</span>
          </button>
        </div>
      </header>

      {showAskAI && <AskAIModal onClose={() => setShowAskAI(false)} />}
    </>
  );
}
