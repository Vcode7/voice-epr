'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Mic,
  FileSpreadsheet,
  History,
  Receipt,
  PieChart,
  Layers,
  Settings,
  Sparkles,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Voice Studio', href: '/', icon: Mic },
  { name: 'Voice to Data', href: '/voice-data', icon: FileSpreadsheet },
  { name: 'History & Logs', href: '/history', icon: History },
  { name: 'Voice Invoices', href: '/invoices', icon: Receipt },
  { name: 'Analytics & Budgets', href: '/analytics', icon: PieChart },
  { name: 'Templates', href: '/templates', icon: Layers },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 bg-card border-r border-cardBorder flex-col justify-between shrink-0 no-print h-screen sticky top-0">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-cardBorder">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primaryDark to-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-text tracking-tight flex items-center gap-1.5">
                Voice EPR
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                  Web
                </span>
              </h1>
              <p className="text-xs text-textMuted font-medium">Smart Voice Intelligence</p>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="p-4 space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/25 font-semibold'
                    : 'text-textMuted hover:bg-slate-800/80 hover:text-text'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-textSubtle'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info Box */}
      <div className="p-4 border-t border-cardBorder m-4 bg-slate-900/60 rounded-xl border">
        <div className="flex items-center space-x-2 text-accent mb-1">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs font-semibold">MongoDB Atlas Sync</span>
        </div>
        <p className="text-[11px] text-textSubtle leading-relaxed">
          Real-time synchronized single source of truth for Web & React Native Mobile.
        </p>
      </div>
    </aside>
  );
}
