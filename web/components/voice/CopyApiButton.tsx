'use client';

import React, { useState } from 'react';
import { Copy, Check, Code2, Link as LinkIcon } from 'lucide-react';

interface CopyApiButtonProps {
  endpoint: string; // e.g. '/api/history/123' or '/api/data/maintenance-report'
  label?: string;
  variant?: 'button' | 'icon' | 'badge';
  size?: 'sm' | 'xs';
  showEndpointText?: boolean;
  className?: string;
  title?: string;
}

export function CopyApiButton({
  endpoint,
  label = 'Copy API Endpoint',
  variant = 'button',
  size = 'xs',
  showEndpointText = false,
  className = '',
  title = 'Copy API Endpoint URL',
}: CopyApiButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Construct full URL with origin if in browser
    const fullUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
        : endpoint;

    navigator.clipboard
      .writeText(fullUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      })
      .catch((err) => {
        console.error('Failed to copy API endpoint:', err);
        // Fallback to copying relative path
        navigator.clipboard.writeText(endpoint);
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      });
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleCopy}
        className={`p-1.5 rounded-lg border transition-all cursor-pointer relative group flex items-center justify-center ${
          copied
            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 ring-1 ring-emerald-500/30'
            : 'bg-surface hover:bg-surfaceMuted text-textSubtle hover:text-cyan-400 border-cardBorder hover:border-cyan-500/40'
        } ${className}`}
        title={copied ? 'Copied full URL to clipboard!' : title || `Copy ${endpoint}`}
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-400 animate-in zoom-in-50 duration-150" />
        ) : (
          <Code2 className="w-3.5 h-3.5 text-cyan-400" />
        )}
        {copied && (
          <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-surface border border-emerald-500/40 text-[10px] font-bold text-emerald-400 shadow-lg whitespace-nowrap z-30 animate-fade-in">
            Copied!
          </span>
        )}
      </button>
    );
  }

  if (variant === 'badge') {
    return (
      <button
        onClick={handleCopy}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-mono font-semibold transition cursor-pointer select-none ${
          copied
            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
            : 'bg-surface/80 hover:bg-surface text-cyan-400 border-cyan-500/30 hover:border-cyan-400/60'
        } ${className}`}
        title={title || `Click to copy ${endpoint}`}
      >
        {copied ? (
          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
        ) : (
          <LinkIcon className="w-3 h-3 text-cyan-400 shrink-0" />
        )}
        <span className="truncate max-w-[140px] sm:max-w-none">{endpoint}</span>
        <span className="text-[9px] text-textSubtle ml-0.5 font-sans">
          {copied ? 'Copied' : 'Copy'}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={handleCopy}
      className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 select-none ${
        copied
          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 ring-1 ring-emerald-500/30'
          : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/30 hover:border-cyan-500/50'
      } ${size === 'sm' ? 'px-3 py-2 text-xs' : 'px-2.5 py-1 text-[11px]'} ${className}`}
      title={title || `Copy API Endpoint: ${endpoint}`}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-400 animate-in zoom-in-50 duration-150 shrink-0" />
      ) : (
        <Code2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
      )}
      <span>{copied ? 'Endpoint Copied!' : label}</span>
      {showEndpointText && (
        <span className="text-[10px] text-cyan-300/70 font-mono hidden md:inline ml-0.5">
          ({endpoint})
        </span>
      )}
    </button>
  );
}
