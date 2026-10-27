import Link from 'next/link';
import { Mic, ArrowRight, Settings } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { VOICE_APPS } from '@/lib/apps';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-4 sm:px-8 h-16 flex items-center justify-between max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primaryDark to-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-text tracking-tight leading-none">Voice ERP</h1>
            <p className="text-xs text-textMuted mt-1">Smart Voice Intelligence</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface hover:bg-surfaceMuted border border-cardBorder text-text text-xs font-semibold transition"
          >
            <Settings className="w-4 h-4 text-textSubtle" />
            <span className="hidden sm:inline">Settings</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-8 pb-12 max-w-6xl w-full mx-auto flex flex-col justify-center">
        <div className="py-8 sm:py-12 max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-text tracking-tight">
            What would you like to do?
          </h2>
          <p className="text-sm sm:text-base text-textMuted mt-3">
            Pick an app. Each one works on its own — you can come back here any time from the Home
            button.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {VOICE_APPS.map((app) => {
            const Icon = app.icon;
            return (
              <Link
                key={app.id}
                href={app.href}
                className="group relative overflow-hidden bg-card border border-cardBorder hover:border-primary/50 rounded-3xl p-6 sm:p-7 shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200 flex flex-col gap-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div
                  className={`absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-to-br ${app.gradient} opacity-10 group-hover:opacity-20 blur-2xl transition-opacity`}
                />

                <div
                  className={`relative w-14 h-14 rounded-2xl bg-gradient-to-tr ${app.gradient} flex items-center justify-center shadow-lg`}
                >
                  <Icon className="w-7 h-7 text-white" />
                </div>

                <div className="relative flex-1">
                  <div className={`text-[11px] font-bold uppercase tracking-wider ${app.accent}`}>
                    {app.tagline}
                  </div>
                  <h3 className="text-xl font-bold text-text mt-1 tracking-tight">{app.name}</h3>
                  <p className="text-sm text-textMuted mt-2 leading-relaxed">{app.description}</p>
                </div>

                <div className="relative flex items-center gap-1.5 text-sm font-semibold text-primary">
                  <span>Open</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
