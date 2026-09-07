'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Mic,
  FileSpreadsheet,
  Stethoscope,
  History,
  Receipt,
  PieChart,
  Layers,
  Settings,
  UploadCloud,
} from 'lucide-react';
import { ThemeToggle } from './theme/ThemeToggle';

const NAV_ITEMS = [
  { name: 'Voice Studio', href: '/', icon: Mic },
  { name: 'Doctor Prescription', href: '/prescriptions', icon: Stethoscope },
  { name: 'Voice to Data', href: '/voice-data', icon: FileSpreadsheet },
  { name: 'History & Logs', href: '/history', icon: History },
  { name: 'Voice Invoice', href: '/invoices', icon: Receipt },
  { name: 'Analytics & Budgets', href: '/analytics', icon: PieChart },
  { name: 'Templates', href: '/templates', icon: Layers },
  { name: 'SAP Upload', href: '/sap-upload', icon: UploadCloud },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 bg-card border-r border-cardBorder flex-col justify-between shrink-0 no-print h-screen sticky top-0 transition-colors duration-200">
      <div className="flex flex-col h-full overflow-hidden">
        {/* Brand Header */}
        <div className="p-6 border-b border-cardBorder shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primaryDark to-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-text tracking-tight flex items-center gap-1.5">
                Voice EPR
              </h1>
              <p className="text-xs text-textMuted font-medium">Smart Voice Intelligence</p>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="p-4 space-y-1.5 overflow-y-auto flex-1 custom-scrollbar">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/25 font-semibold'
                    : 'text-textMuted hover:bg-surface hover:text-text'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-textSubtle'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Theme & Status Box */}
      <div className="p-4 border-t border-cardBorder shrink-0">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface/70 border border-cardBorder">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-text">Appearance</span>
            <span className="text-[10px] text-textMuted">Theme Switcher</span>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
