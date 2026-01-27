import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type MessageInputProps = {
  /**
   * Called when the user requests to send a message.
   * Implementations may return a promise; failures are handled internally.
   */
  onSend?: (message: string) => Promise<void> | void;
  placeholder?: string;
  disabled?: boolean;
  debounceMs?: number;
  initialValue?: string;
};

/**
 * A resilient message input that throttles outbound sends to prevent
 * duplicate requests when users spam the keyboard.
 */
export default function MessageInput({
  onSend,
  placeholder = 'Type a message…',
  disabled = false,
  debounceMs = 450,
  initialValue = '',
}: MessageInputProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const sendingRef = useRef(false);
  const lastSentRef = useRef(0);

  const normalizedDebounce = useMemo(() => Math.max(150, debounceMs), [debounceMs]);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const sendMessage = useCallback(async () => {
    if (disabled || !value.trim() || sendingRef.current) return;

    const now = Date.now();
    if (now - lastSentRef.current < normalizedDebounce) return;

    sendingRef.current = true;
    lastSentRef.current = now;
    setError(null);

    try {
      await Promise.resolve(onSend?.(value.trim()));
      setValue('');
    } catch (e) {
      // Reset the debounce window if the send fails so the user can retry immediately.
      lastSentRef.current = 0;
      setError((e as Error)?.message ?? 'Unable to send message.');
      console.error('sendMessage failed', e);
    } finally {
      sendingRef.current = false;
    }
  }, [disabled, normalizedDebounce, onSend, value]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    },
    [sendMessage],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          aria-label="Message input"
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          value={value}
        />
        <button
          aria-label="Send message"
          className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled || !value.trim() || sendingRef.current}
          onClick={sendMessage}
          type="button"
        >
          Send
        </button>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

export { MessageInput };
