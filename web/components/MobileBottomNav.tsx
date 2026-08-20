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
  Settings,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Studio', href: '/', icon: Mic },
  { name: 'Data EPR', href: '/voice-data', icon: FileSpreadsheet },
  { name: 'History', href: '/history', icon: History },
  { name: 'Invoices', href: '/invoices', icon: Receipt },
  { name: 'Analytics', href: '/analytics', icon: PieChart },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-t border-cardBorder px-1 py-1.5 flex items-center justify-around shadow-2xl no-print">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl text-[9px] font-medium transition-all ${
              isActive
                ? 'text-primary font-bold scale-105'
                : 'text-textMuted hover:text-text'
            }`}
          >
            <div
              className={`p-1.5 rounded-lg transition-colors ${
                isActive ? 'bg-primary/20 text-primary' : 'text-textSubtle'
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
            <span className="mt-0.5 truncate max-w-[50px]">{item.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
