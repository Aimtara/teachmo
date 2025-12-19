// ULTRA MINIMAL TOAST - FINAL FIX: Avoid all prototype issues
// A11Y-6: Enhanced with proper ARIA attributes
// UX FIX: Enforce specific, contextual messages
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { createPortal } from "react-dom";

const toastStore = {
  toasts: [],
  listeners: [],
  nextId: 1
};

export const createSuccessMessage = (action, item) => {
  const templates = {
    saved: `${item} saved successfully`,
    created: `${item} created successfully`,
    updated: `${item} updated`,
    deleted: `${item} removed`,
    added: `${item} added`,
    completed: `${item} completed`,
    sent: `${item} sent`,
    scheduled: `${item} scheduled`,
    connected: `Connected to ${item}`,
    disconnected: `Disconnected from ${item}`
  };

  return templates[action] || `${action} successful`;
};

export const createErrorMessage = (action, item, retryable = false) => {
  const friendlyMessages = {
    save: `Oops! We couldn't save your ${item.toLowerCase()}`,
    create: `Hmm, something went wrong creating the ${item.toLowerCase()}`,
    update: `The ${item.toLowerCase()} couldn't be updated right now`,
    delete: `We weren't able to remove that ${item.toLowerCase()}`,
    load: `We're having trouble loading your ${item.toLowerCase()}`,
    send: `Your ${item.toLowerCase()} didn't go through`,
    connect: `Couldn't connect to ${item}`,
    fetch: `We couldn't get your ${item.toLowerCase()} just now`
  };

  const base = friendlyMessages[action] || `Couldn't ${action} ${item.toLowerCase()}`;
  return retryable ? `${base}. Give it another try?` : base;
};

const undoStore = {
  pendingActions: [],
  nextId: 1
};

export function createUndoableAction(actionName, itemName, onUndoCallback, duration = 5000) {
  const undoId = undoStore.nextId++;

  const undoInstance = {
    id: undoId,
    onUndo: onUndoCallback,
    timeout: null
  };
  undoStore.pendingActions.push(undoInstance);

  const toastUndoButtonAction = {
    id: undoId,
    onUndo: () => {
      executeUndo(undoId);
    }
  };

  const toastId = ultraMinimalToast(
    `${itemName} ${actionName}`,
    "success",
    duration,
    toastUndoButtonAction
  );

  undoInstance.timeout = setTimeout(() => {
    const idx = undoStore.pendingActions.findIndex((a) => a.id === undoId);
    if (idx >= 0) {
      undoStore.pendingActions.splice(idx, 1);
    }
  }, duration);

  return {
    undoId,
    toastId,
    cancel: () => {
      clearTimeout(undoInstance.timeout);
      const idx = undoStore.pendingActions.findIndex((a) => a.id === undoId);
      if (idx >= 0) {
        undoStore.pendingActions.splice(idx, 1);
      }
      dismissToast(toastId);
    }
  };
}

export function executeUndo(undoId) {
  const actionIndex = undoStore.pendingActions.findIndex((a) => a.id === undoId);
  if (actionIndex >= 0) {
    const action = undoStore.pendingActions[actionIndex];
    clearTimeout(action.timeout);
    action.onUndo();
    undoStore.pendingActions.splice(actionIndex, 1);

    ultraMinimalToast("Undo successful", "success", 2000);
  }
}

export function ultraMinimalToast(msg, typ, dur, undoAction = null) {
  try {
    if (msg === "Success" || msg === "Error") {
      console.warn('[TOAST] Generic message detected. Use specific messages like "Activity saved to calendar" instead.');
    }

    const id = toastStore.nextId++;
    const message = String(msg || "Notification");
    const type = String(typ || "info");
    const duration = typeof dur === "number" ? dur : 5000;

    const newToast = {
      id,
      message,
      type,
      undoAction: undoAction || null
    };
    toastStore.toasts.push(newToast);

    toastStore.listeners.forEach((fn) => {
      try {
        fn([...toastStore.toasts]);
      } catch (err) {
        console.error("[TOAST] Listener error:", err);
      }
    });

    if (duration > 0) {
      setTimeout(() => {
        const idx = toastStore.toasts.findIndex((t) => t.id === id);
        if (idx >= 0) {
          toastStore.toasts.splice(idx, 1);
          toastStore.listeners.forEach((fn) => fn([...toastStore.toasts]));
        }
      }, duration);
    }

    return id;
  } catch (err) {
    console.error("[TOAST] Error:", err);
    return -1;
  }
}

export function dismissToast(id) {
  try {
    const idx = toastStore.toasts.findIndex((t) => t.id === id);
    if (idx >= 0) {
      toastStore.toasts.splice(idx, 1);
      toastStore.listeners.forEach((fn) => fn([...toastStore.toasts]));
    }
  } catch (err) {
    console.error("[TOAST] Dismiss error:", err);
  }
}

function ToastItem({ toast, onDismiss }) {
  let bgColor = "bg-gray-800 text-white";
  let icon = "ℹ";
  let ariaLabel = "Info notification";

  const safeType = String(toast?.type || "info");

  if (safeType === "success") {
    bgColor = "bg-green-600 text-white";
    icon = "✓";
    ariaLabel = "Success notification";
  } else if (safeType === "error") {
    bgColor = "bg-red-600 text-white";
    icon = "✕";
    ariaLabel = "Error notification";
  } else if (safeType === "warning") {
    bgColor = "bg-yellow-500 text-black";
    icon = "⚠";
    ariaLabel = "Warning notification";
  }

  const safeMessage = String(toast?.message || "");
  const undoAction = toast?.undoAction;

  return (
    <div
      className="pointer-events-auto animate-fade-in"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={ariaLabel}
    >
      <div className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[200px] max-w-md ${bgColor} min-h-[44px]`}>
        <span className="text-xl" aria-hidden="true">{icon}</span>
        <span className="flex-1 text-sm font-medium">{safeMessage}</span>

        {undoAction && (
          <button
            onClick={() => {
              undoAction.onUndo();
              onDismiss();
            }}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm font-semibold transition-colors touch-target"
            aria-label="Undo action"
            type="button"
          >
            Undo
          </button>
        )}

        <button
          onClick={onDismiss}
          className="hover:opacity-70 transition-opacity text-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Dismiss notification"
          type="button"
        >
          ×
        </button>
      </div>
    </div>
  );
}

ToastItem.propTypes = {
  toast: PropTypes.shape({
    id: PropTypes.number.isRequired,
    message: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    undoAction: PropTypes.shape({
      id: PropTypes.number,
      onUndo: PropTypes.func
    })
  }),
  onDismiss: PropTypes.func.isRequired
};

export function UltraMinimalToastContainer() {
  const [displayToasts, setDisplayToasts] = useState([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const handleUpdate = (newList) => {
      try {
        const cleanList = newList.map((t) => ({
          id: Number(t.id),
          message: String(t.message),
          type: String(t.type),
          undoAction: t.undoAction
            ? {
                id: Number(t.undoAction.id),
                onUndo: t.undoAction.onUndo
              }
            : null
        }));
        setDisplayToasts(cleanList);
      } catch (err) {
        console.error("[TOAST] Update error:", err);
      }
    };

    toastStore.listeners.push(handleUpdate);
    handleUpdate(toastStore.toasts);

    return () => {
      const idx = toastStore.listeners.indexOf(handleUpdate);
      if (idx >= 0) {
        toastStore.listeners.splice(idx, 1);
      }
    };
  }, []);

  if (!isMounted) return null;
  if (typeof window === "undefined") return null;
  if (typeof document === "undefined") return null;
  if (!document.body) return null;
  if (!displayToasts || displayToasts.length === 0) return null;

  try {
    const content = (
      <div
        className="fixed bottom-4 right-4 z-[9999] pointer-events-none"
        role="region"
        aria-label="Notifications"
      >
        <div className="flex flex-col gap-2 items-end">
          {displayToasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onDismiss={() => dismissToast(toast.id)}
            />
          ))}
        </div>
      </div>
    );

    return createPortal(content, document.body);
  } catch (err) {
    console.error("[TOAST] Portal error:", err);
    return (
      <div
        className="fixed bottom-4 right-4 z-[9999] pointer-events-none"
        role="region"
        aria-label="Notifications"
      >
        <div className="flex flex-col gap-2 items-end">
          {displayToasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onDismiss={() => dismissToast(toast.id)}
            />
          ))}
        </div>
      </div>
    );
  }
}

export default UltraMinimalToastContainer;
export const showToast = ultraMinimalToast;
