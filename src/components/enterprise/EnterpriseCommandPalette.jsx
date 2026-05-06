import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Command, Mic, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnterpriseBadge } from './EnterpriseBadge';

function normalize(value) {
  return String(value ?? '').toLowerCase();
}

export function EnterpriseCommandPalette({ commands = [], onCommand, roleLabel = 'System Admin' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [voiceStatus, setVoiceStatus] = useState('idle');
  const inputRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return commands;
    return commands.filter((command) =>
      [command.label, command.description, command.group, command.voice]
        .some((value) => normalize(value).includes(q))
    );
  }, [commands, query]);

  const runCommand = (command) => {
    onCommand?.(command);
    setOpen(false);
    setQuery('');
  };

  const startVoiceCommand = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceStatus('Voice commands are not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => setVoiceStatus('Listening for a navigation or search command...');
    recognition.onerror = () => setVoiceStatus('Voice command failed. Try Ctrl+K search.');
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? '';
      const match = commands.find((command) =>
        normalize(transcript).includes(normalize(command.voice || command.label))
      );
      setVoiceStatus(`Heard: "${transcript}"`);
      if (match) runCommand(match);
      else setQuery(transcript);
    };
    recognition.start();
  };

  return (
    <>
      <button
        type="button"
        className="enterprise-focus enterprise-motion flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--enterprise-border)] bg-[var(--enterprise-surface)] px-4 py-3 text-left shadow-sm hover:-translate-y-0.5 hover:shadow-[var(--enterprise-shadow)]"
        onClick={() => setOpen(true)}
        aria-label="Open command palette with Ctrl+K"
      >
        <span className="flex items-center gap-3 text-[var(--enterprise-muted)]">
          <Search className="h-4 w-4" aria-hidden="true" />
          Search, navigate, or ask ambient AI
        </span>
        <span className="rounded-lg border border-[var(--enterprise-border)] px-2 py-1 text-xs text-[var(--enterprise-muted)]">
          Ctrl K
        </span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/35 p-4 backdrop-blur-sm" role="presentation">
          <div
            className="mx-auto mt-16 max-w-2xl overflow-hidden rounded-3xl border border-[var(--enterprise-border)] bg-[var(--enterprise-surface)] shadow-[var(--enterprise-shadow)]"
            role="dialog"
            aria-modal="true"
            aria-label="Global command palette"
          >
            <div className="flex items-center gap-3 border-b border-[var(--enterprise-border)] p-4">
              <Command className="h-5 w-5 text-[var(--enterprise-primary)]" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="enterprise-focus flex-1 bg-transparent text-base text-[var(--enterprise-foreground)] placeholder:text-[var(--enterprise-muted)]"
                placeholder={`Command ${roleLabel}'s workspace...`}
                aria-label="Search commands"
              />
              <button className="enterprise-focus rounded-lg p-2" type="button" onClick={startVoiceCommand} aria-label="Start voice command">
                <Mic className="h-4 w-4" aria-hidden="true" />
              </button>
              <button className="enterprise-focus rounded-lg p-2" type="button" onClick={() => setOpen(false)} aria-label="Close command palette">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex items-center gap-2 border-b border-[var(--enterprise-border)] px-4 py-3 text-sm text-[var(--enterprise-muted)]">
              <Bot className="h-4 w-4" aria-hidden="true" />
              Ambient AI stays quiet until critical approvals, security, or adoption risk appears.
              <EnterpriseBadge variant="info">Role aware</EnterpriseBadge>
            </div>
            {voiceStatus !== 'idle' ? <p className="px-4 py-2 text-sm text-[var(--enterprise-muted)]">{voiceStatus}</p> : null}

            <ul className="max-h-[28rem] overflow-y-auto p-2">
              {filtered.map((command) => (
                <li key={command.id}>
                  <button
                    type="button"
                    className={cn(
                      'enterprise-focus enterprise-motion flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left hover:bg-[color-mix(in_srgb,var(--enterprise-primary)_8%,transparent)]'
                    )}
                    onClick={() => runCommand(command)}
                  >
                    <span>
                      <span className="block font-medium text-[var(--enterprise-foreground)]">{command.label}</span>
                      <span className="block text-sm text-[var(--enterprise-muted)]">{command.description}</span>
                    </span>
                    <EnterpriseBadge variant={command.variant ?? 'neutral'}>{command.group}</EnterpriseBadge>
                  </button>
                </li>
              ))}
              {filtered.length === 0 ? <li className="p-4 text-sm text-[var(--enterprise-muted)]">No commands found.</li> : null}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
