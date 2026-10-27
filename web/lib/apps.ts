import {
  Mic,
  FileSpreadsheet,
  Stethoscope,
  Receipt,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface AppRoute {
  name: string;
  href: string;
}

export interface VoiceApp {
  id: 'studio' | 'voice-data' | 'prescription' | 'invoice' | 'settings';
  name: string;
  tagline: string;
  description: string;
  href: string;
  icon: LucideIcon;
  /** Tailwind classes: icon tile gradient, and accent text colour. */
  gradient: string;
  accent: string;
  /** Pages that live inside this app; shown as tabs in the app header. */
  routes: AppRoute[];
}

export const VOICE_APPS: VoiceApp[] = [
  {
    id: 'studio',
    name: 'Voice Studio',
    tagline: 'Expenses & income',
    description: 'Speak transactions and receipts, then track history, cash flow and budgets.',
    href: '/studio',
    icon: Mic,
    gradient: 'from-indigo-600 to-violet-500',
    accent: 'text-indigo-400',
    routes: [
      { name: 'Studio', href: '/studio' },
      { name: 'History', href: '/history' },
      { name: 'Analytics & Budgets', href: '/analytics' },
    ],
  },
  {
    id: 'voice-data',
    name: 'Voice Data',
    tagline: 'Dictate into templates',
    description: 'Fill structured ERP templates by voice and push the records to SAP.',
    href: '/voice-data',
    icon: FileSpreadsheet,
    gradient: 'from-cyan-600 to-sky-500',
    accent: 'text-cyan-400',
    routes: [
      { name: 'Voice Data', href: '/voice-data' },
      { name: 'Templates', href: '/templates' },
      { name: 'SAP Upload', href: '/sap-upload' },
    ],
  },
  {
    id: 'prescription',
    name: 'Voice Prescription',
    tagline: 'Clinical dictation',
    description: 'Dictate a consultation and get a printable prescription with a medicine table.',
    href: '/prescriptions',
    icon: Stethoscope,
    gradient: 'from-teal-600 to-emerald-500',
    accent: 'text-teal-400',
    routes: [{ name: 'Prescription', href: '/prescriptions' }],
  },
  {
    id: 'invoice',
    name: 'Voice Invoice',
    tagline: 'GST vouchers',
    description: 'Create sales, purchase, receipt and payment vouchers and manage masters.',
    href: '/invoices',
    icon: Receipt,
    gradient: 'from-amber-600 to-orange-500',
    accent: 'text-amber-400',
    routes: [{ name: 'Invoice', href: '/invoices' }],
  },
];

export const SETTINGS_APP: VoiceApp = {
  id: 'settings',
  name: 'Settings',
  tagline: 'Preferences',
  description: 'API keys, shortcuts and enterprise profile.',
  href: '/settings',
  icon: Settings,
  gradient: 'from-slate-600 to-slate-500',
  accent: 'text-slate-400',
  routes: [{ name: 'Settings', href: '/settings' }],
};

export function findAppForPath(pathname: string): VoiceApp | null {
  for (const app of [...VOICE_APPS, SETTINGS_APP]) {
    if (app.routes.some((r) => pathname === r.href || pathname.startsWith(r.href + '/'))) {
      return app;
    }
  }
  return null;
}
