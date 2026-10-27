'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Sparkles, Settings } from 'lucide-react';
import { AskAIModal } from './modals/AskAIModal';
import { ThemeToggle } from './theme/ThemeToggle';
import { VOICE_APPS, findAppForPath } from '@/lib/apps';

/**
 * Wraps every page. The home launcher (`/`) renders bare; every other page is
 * treated as part of one app and gets a slim top bar (Home, app switcher,
 * the app's own tabs) instead of a permanent sidebar.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showAskAI, setShowAskAI] = useState(false);
  if (pathname === '/') {
    return <div className="min-h-screen w-full">{children}</div>;
  }

  const app = findAppForPath(pathname);
  const AppIcon = app?.icon;
  const showTabs = app && app.routes.length > 1;

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-screen">
      <header className="bg-card/85 backdrop-blur-md border-b border-cardBorder sticky top-0 z-30 no-print transition-colors duration-200">
        <div className="h-14 sm:h-16 px-3 sm:px-6 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-surface hover:bg-surfaceMuted border border-cardBorder text-text text-xs font-semibold transition shrink-0"
              title="Back to all apps"
            >
              <Home className="w-4 h-4 text-primary" />
              <span className="hidden sm:inline">Home</span>
            </Link>

            {app && AppIcon && (
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${app.gradient} flex items-center justify-center shadow-md shrink-0`}
                >
                  <AppIcon className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-sm text-text tracking-tight truncate">{app.name}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick switch between apps */}
            <nav className="hidden md:flex items-center gap-1 mr-1" aria-label="Switch app">
              {VOICE_APPS.map((a) => {
                const Icon = a.icon;
                const isCurrent = app?.id === a.id;
                return (
                  <Link
                    key={a.id}
                    href={a.href}
                    title={a.name}
                    aria-label={a.name}
                    aria-current={isCurrent ? 'page' : undefined}
                    className={`p-2 rounded-lg transition ${
                      isCurrent
                        ? 'bg-primary/15 text-primary'
                        : 'text-textSubtle hover:text-text hover:bg-surface'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </Link>
                );
              })}
              <Link
                href="/settings"
                title="Settings"
                aria-label="Settings"
                className={`p-2 rounded-lg transition ${
                  app?.id === 'settings'
                    ? 'bg-primary/15 text-primary'
                    : 'text-textSubtle hover:text-text hover:bg-surface'
                }`}
              >
                <Settings className="w-4 h-4" />
              </Link>
            </nav>

            <ThemeToggle />

            <button
              onClick={() => setShowAskAI(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-primaryDark to-primary hover:from-primary hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-primary/20 transition-all cursor-pointer active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              <span>Ask AI</span>
            </button>
          </div>
        </div>

        {showTabs && app && (
          <div className="px-3 sm:px-6 flex items-center gap-1 overflow-x-auto custom-scrollbar">
            {app.routes.map((route) => {
              const isActive = pathname === route.href || pathname.startsWith(route.href + '/');
              return (
                <Link
                  key={route.href}
                  href={route.href}
                  className={`px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition ${
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-textMuted hover:text-text'
                  }`}
                >
                  {route.name}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      <main className="flex-1 p-3.5 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">{children}</main>

      {showAskAI && <AskAIModal onClose={() => setShowAskAI(false)} />}
    </div>
  );
}
