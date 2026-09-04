'use client';

import React, { useState } from 'react';
import {
  X,
  Code2,
  Copy,
  Check,
  ExternalLink,
  Layers,
  Sparkles,
  Database,
  Mic,
  Play,
  FileCode,
  BookOpen,
  Filter,
} from 'lucide-react';
import { DataTemplate } from '@/types';
import { CopyApiButton } from '@/components/voice/CopyApiButton';

interface ApiEndpointsModalProps {
  templates: DataTemplate[];
  activeTemplate: DataTemplate;
  onClose: () => void;
}

export function ApiEndpointsModal({
  templates,
  activeTemplate,
  onClose,
}: ApiEndpointsModalProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'templates' | 'voice' | 'curl'>('history');
  const [selectedTemplateSlug, setSelectedTemplateSlug] = useState<string>(
    activeTemplate.name.toLowerCase().replace(/\s+/g, '-')
  );
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [copiedCodeKey, setCopiedCodeKey] = useState<string | null>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const copySnippet = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeKey(key);
    setTimeout(() => setCopiedCodeKey(null), 2000);
  };

  const handleTestEndpoint = async (url: string, method: string = 'GET', body?: any) => {
    try {
      setTesting(true);
      setTestResult('Calling endpoint...');
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      setTestResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setTestResult(`Error: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  const currentTmplObj =
    templates.find(
      (t) =>
        t.name.toLowerCase().replace(/\s+/g, '-') === selectedTemplateSlug ||
        t.id === selectedTemplateSlug
    ) || activeTemplate;

  const currentSlug = (currentTmplObj?.name || 'monitoring-details')
    .toLowerCase()
    .replace(/\s+/g, '-');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto no-print">
      <div className="bg-card border border-cardBorder rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-cardBorder bg-surface/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-text flex items-center gap-2">
                Voice-to-Data REST APIs
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                  Open Access / v1
                </span>
              </h2>
              <p className="text-xs text-textMuted mt-0.5">
                Programmatically query history records, query &amp; filter template data, and upload audio to receive extracted JSON.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-textMuted hover:text-text hover:bg-surfaceMuted transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 sm:px-6 pt-3 border-b border-cardBorder bg-surface/30 flex items-center gap-2 overflow-x-auto text-xs">
          <button
            onClick={() => {
              setActiveTab('history');
              setTestResult(null);
            }}
            className={`px-3 py-2 border-b-2 font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-textMuted hover:text-text'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>1. History API</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('templates');
              setTestResult(null);
            }}
            className={`px-3 py-2 border-b-2 font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'templates'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-textMuted hover:text-text'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2. Template Data &amp; Filter API</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('voice');
              setTestResult(null);
            }}
            className={`px-3 py-2 border-b-2 font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'voice'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-textMuted hover:text-text'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>3. Audio-to-JSON API</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('curl');
              setTestResult(null);
            }}
            className={`px-3 py-2 border-b-2 font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'curl'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-textMuted hover:text-text'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>cURL &amp; Integration Guide</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 bg-background/50 flex-1">
          {/* TAB 1: HISTORY API */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-card border border-cardBorder space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-mono font-bold text-xs">
                      GET
                    </span>
                    <span className="font-mono text-xs font-bold text-text">
                      /api/history/&#123;record_id&#125;
                    </span>
                  </div>
                  <CopyApiButton
                    endpoint="/api/history/{record_id}"
                    label="Copy Endpoint"
                    variant="button"
                  />
                </div>
                <p className="text-xs text-textMuted">
                  Returns a previously saved Voice-to-Data record or specific child entry as structured JSON.
                </p>

                {/* Example Request & Response */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-textSubtle block mb-1">
                      Example Request
                    </span>
                    <div className="p-3 rounded-lg bg-surface font-mono text-[11px] text-text border border-cardBorder overflow-x-auto">
                      GET {origin}/api/history/entry_1725270123_abc
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-textSubtle block mb-1">
                      Example JSON Response
                    </span>
                    <pre className="p-3 rounded-lg bg-surface font-mono text-[11px] text-cyan-300 border border-cardBorder overflow-x-auto max-h-48">
{`{
  "id": "entry_1725270123_abc",
  "template": "Monitoring Details",
  "template_id": "default_monitoring_details",
  "data": {
    "part_no": "PART-889",
    "shift": "Shift A",
    "production_qty": 500,
    "ok_qty": 490,
    "rejected_qty": 10
  },
  "created_at": "2026-09-02T10:30:00.000Z",
  "date": "02-09-2026"
}`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TEMPLATE DATA & FILTER API */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              {/* Template Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-surface border border-cardBorder">
                <label className="text-xs font-bold text-text flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Select Template for Endpoint:
                </label>
                <select
                  value={selectedTemplateSlug}
                  onChange={(e) => setSelectedTemplateSlug(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-text font-medium focus:border-cyan-400"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.name.toLowerCase().replace(/\s+/g, '-')}>
                      {t.name} (/api/data/{t.name.toLowerCase().replace(/\s+/g, '-')})
                    </option>
                  ))}
                  <option value="flexible">Flexible Records (/api/data/flexible)</option>
                </select>
              </div>

              {/* GET Endpoint Card */}
              <div className="p-4 rounded-xl bg-card border border-cardBorder space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-mono font-bold text-xs">
                      GET
                    </span>
                    <span className="font-mono text-xs font-bold text-text">
                      /api/data/{currentSlug}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTestEndpoint(`/api/data/${currentSlug}`)}
                      disabled={testing}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
                    >
                      <Play className="w-3 h-3" />
                      <span>{testing ? 'Testing...' : 'Test GET'}</span>
                    </button>
                    <CopyApiButton
                      endpoint={`/api/data/${currentSlug}`}
                      label="Copy GET URL"
                    />
                  </div>
                </div>
                <p className="text-xs text-textMuted">
                  Returns all records belonging to <strong>{currentTmplObj?.name || currentSlug}</strong>. Supports optional query parameters (e.g. <code>?id=123&amp;part_no=ABC</code>).
                </p>
              </div>

              {/* POST Filter Endpoint Card */}
              <div className="p-4 rounded-xl bg-card border border-cardBorder space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-mono font-bold text-xs">
                      POST
                    </span>
                    <span className="font-mono text-xs font-bold text-text">
                      /api/data/{currentSlug}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        handleTestEndpoint(`/api/data/${currentSlug}`, 'POST', {
                          filters: {
                            date_from: '2026-01-01',
                            date_to: '2026-12-31',
                          },
                        })
                      }
                      disabled={testing}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
                    >
                      <Play className="w-3 h-3" />
                      <span>Test POST Filter</span>
                    </button>
                    <CopyApiButton
                      endpoint={`/api/data/${currentSlug}`}
                      label="Copy POST URL"
                    />
                  </div>
                </div>
                <p className="text-xs text-textMuted">
                  Dynamically filters records by <code>id</code>, <code>date_from</code>, <code>date_to</code>, and any template field.
                </p>

                {/* Example Request & Response */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-textSubtle block mb-1">
                      Example POST Request Body
                    </span>
                    <pre className="p-3 rounded-lg bg-surface font-mono text-[11px] text-text border border-cardBorder overflow-x-auto">
{`{
  "filters": {
    "part_no": "PART-889",
    "shift": "Shift A",
    "date_from": "2026-09-01",
    "date_to": "2026-09-02"
  }
}`}
                    </pre>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-textSubtle block mb-1">
                      Example Response
                    </span>
                    <pre className="p-3 rounded-lg bg-surface font-mono text-[11px] text-cyan-300 border border-cardBorder overflow-x-auto max-h-48">
{`{
  "template": "${currentTmplObj?.name || 'Monitoring Details'}",
  "template_id": "${currentTmplObj?.id || 'default_monitoring_details'}",
  "count": 1,
  "filters_applied": {
    "part_no": "PART-889"
  },
  "data": [
    {
      "id": "entry_1725270123_abc",
      "part_no": "PART-889",
      "shift": "Shift A",
      "production_qty": 500,
      "ok_qty": 490,
      "rejected_qty": 10,
      "date": "02-09-2026",
      "created_at": "2026-09-02T10:30:00.000Z"
    }
  ]
}`}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Live Test Console */}
              {testResult && (
                <div className="p-4 rounded-xl bg-surface border border-cardBorder space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      Live Test Response
                    </span>
                    <button
                      onClick={() => setTestResult(null)}
                      className="text-[11px] text-textMuted hover:text-text"
                    >
                      Clear
                    </button>
                  </div>
                  <pre className="p-3 rounded-lg bg-card font-mono text-[11px] text-text border border-cardBorder overflow-x-auto max-h-60">
                    {testResult}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AUDIO-TO-JSON API */}
          {activeTab === 'voice' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-card border border-cardBorder space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-mono font-bold text-xs">
                      POST
                    </span>
                    <span className="font-mono text-xs font-bold text-text">
                      /api/voice-to-data
                    </span>
                  </div>
                  <CopyApiButton
                    endpoint="/api/voice-to-data"
                    label="Copy Voice API Endpoint"
                  />
                </div>
                <p className="text-xs text-textMuted">
                  Upload an audio recording file along with a selected template name/id. The server transcribes the voice using Whisper AI and extracts structured entities into JSON directly using the existing Voice-to-Data pipeline.
                </p>

                {/* Form Data Specification */}
                <div className="p-3 rounded-lg bg-surface border border-cardBorder text-xs space-y-2">
                  <p className="font-bold text-text">Multipart / Form-Data Parameters:</p>
                  <ul className="list-disc pl-5 space-y-1 text-textMuted font-mono text-[11px]">
                    <li>
                      <strong className="text-cyan-400">audio</strong> (File / Blob): The audio file (mp3, webm, wav, m4a, ogg).
                    </li>
                    <li>
                      <strong className="text-cyan-400">template</strong> (String): Template name, ID, or &quot;flexible&quot; (e.g. <code>&quot;{currentSlug}&quot;</code>).
                    </li>
                    <li>
                      <strong className="text-textSubtle">save</strong> (Optional Query/Field): <code>true</code> to automatically persist record to history database.
                    </li>
                  </ul>
                </div>

                {/* Response Structure */}
                <div>
                  <span className="text-[10px] uppercase font-bold text-textSubtle block mb-1">
                    JSON Response Schema
                  </span>
                  <pre className="p-3 rounded-lg bg-surface font-mono text-[11px] text-cyan-300 border border-cardBorder overflow-x-auto max-h-56">
{`{
  "template": "Monitoring Details",
  "template_id": "default_monitoring_details",
  "data": {
    "part_no": "ABC-123",
    "shift": "Shift A",
    "production_qty": 100,
    "ok_qty": 98,
    "rejected_qty": 2
  },
  "table_rows": [],
  "raw_transcript": "Part number ABC 123 shift A production quantity 100 OK quantity 98 rejected quantity 2"
}`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CURL & INTEGRATION GUIDE */}
          {activeTab === 'curl' && (
            <div className="space-y-4">
              {/* cURL 1 */}
              <div className="p-4 rounded-xl bg-card border border-cardBorder space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text">
                    1. Fetch History Record (cURL)
                  </span>
                  <button
                    onClick={() =>
                      copySnippet(
                        'curl1',
                        `curl -X GET "${origin}/api/history/YOUR_RECORD_ID"`
                      )
                    }
                    className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    {copiedCodeKey === 'curl1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCodeKey === 'curl1' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-surface font-mono text-[11px] text-text border border-cardBorder overflow-x-auto">
{`curl -X GET "${origin}/api/history/YOUR_RECORD_ID"`}
                </pre>
              </div>

              {/* cURL 2 */}
              <div className="p-4 rounded-xl bg-card border border-cardBorder space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text">
                    2. Query &amp; Filter Template Data (cURL)
                  </span>
                  <button
                    onClick={() =>
                      copySnippet(
                        'curl2',
                        `curl -X POST "${origin}/api/data/${currentSlug}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"filters":{"date_from":"2026-09-01","date_to":"2026-09-02"}}'`
                      )
                    }
                    className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    {copiedCodeKey === 'curl2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCodeKey === 'curl2' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-surface font-mono text-[11px] text-text border border-cardBorder overflow-x-auto">
{`curl -X POST "${origin}/api/data/${currentSlug}" \\
  -H "Content-Type: application/json" \\
  -d '{"filters":{"date_from":"2026-09-01","date_to":"2026-09-02"}}'`}
                </pre>
              </div>

              {/* cURL 3 */}
              <div className="p-4 rounded-xl bg-card border border-cardBorder space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text">
                    3. Send Audio + Template to Receive JSON (cURL)
                  </span>
                  <button
                    onClick={() =>
                      copySnippet(
                        'curl3',
                        `curl -X POST "${origin}/api/voice-to-data" \\\n  -F "audio=@recording.mp3" \\\n  -F "template=${currentSlug}"`
                      )
                    }
                    className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    {copiedCodeKey === 'curl3' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCodeKey === 'curl3' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-surface font-mono text-[11px] text-text border border-cardBorder overflow-x-auto">
{`curl -X POST "${origin}/api/voice-to-data" \\
  -F "audio=@recording.mp3" \\
  -F "template=${currentSlug}"`}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-cardBorder bg-surface/40 flex items-center justify-between text-xs">
          <span className="text-textSubtle">
            Authentication is currently disabled for developer simplicity.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-surface hover:bg-surfaceMuted border border-cardBorder text-text font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
