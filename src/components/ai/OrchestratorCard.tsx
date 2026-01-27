import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

import { orchestrate, orchestrateAction } from "@/api/functions";
import type {
  OrchestratorRequestInput,
  OrchestratorResponse,
} from "@/lib/orchestrator/types";

type UiAction = {
  label: string;
  action?: string;
  actionId?: string;
  payload?: unknown;
  url?: string;
};

type Props = {
  response: OrchestratorResponse;
  /** Base request context to round-trip UI actions back into the orchestrator */
  baseRequest: OrchestratorRequestInput;
  /** Called when a button/choice triggers a new orchestrator response */
  onResponse?: (next: OrchestratorResponse) => void;
  className?: string;
  hideBadge?: boolean;
};

function hasDeterministicUiAction(
  action?: UiAction
): action is UiAction & { actionId: string } {
  return Boolean(action?.actionId && String(action.actionId).trim().length > 0);
}

function deriveNavigateTarget(ui: any, action?: UiAction): string | null {
  if (action?.url) return String(action.url);
  if (ui?.deepLink) return String(ui.deepLink);

  const a = String(action?.action || "").toUpperCase();
  const p: any = action?.payload || {};
  if (a === "OPEN_THREAD" && p?.threadId) {
    return `/hub/thread/${encodeURIComponent(String(p.threadId))}`;
  }
  if (a === "OPEN_HUB") return "/hub";
  if (a === "OPEN_HUB_DRAFT") return "/hub";

  return null;
}

export default function OrchestratorCard({
  response,
  baseRequest,
  onResponse,
  className,
  hideBadge,
}: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [followup, setFollowup] = useState("");

  const ui: any = response?.ui || {};
  const needs: any = response?.needs || {};
  const prompt: any = needs?.promptUser || null;

  const primary: UiAction | undefined = ui?.primaryAction;
  const secondary: UiAction | undefined = ui?.secondaryAction;

  const mode = useMemo(() => {
    if (ui?.type === "ERROR") return "ERROR";
    if (prompt?.type === "CHOICE") return "CHOICE";
    if (prompt?.type === "FOLLOWUP_QUESTION") return "FOLLOWUP_QUESTION";
    return "CARD";
  }, [prompt?.type, ui?.type]);

  async function runUiAction(action: UiAction) {
    try {
      setBusy(true);

      if (
        hasDeterministicUiAction(action) ||
        String(action?.action || "").toUpperCase() === "UI_ACTION"
      ) {
        const actionId = action.actionId || String(action?.action || "");
        const next = await orchestrateAction(baseRequest, {
          actionId,
          payload: action.payload,
        });
        onResponse?.(next);
        return;
      }

      const target = deriveNavigateTarget(ui, action);
      if (target) {
        navigate(target);
        return;
      }

      toast({
        title: "No action available",
        description: "This card does not provide a runnable action.",
        variant: "destructive",
      });
    } catch (err: any) {
      toast({
        title: "Action failed",
        description: String(err?.message || err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function resolveChoice(value: unknown) {
    try {
      setBusy(true);

      if (prompt?.actionId) {
        const next = await orchestrateAction(baseRequest, {
          actionId: String(prompt.actionId),
          payload: { value },
        });
        onResponse?.(next);
        return;
      }

      const missing: string[] = Array.isArray(needs?.missing)
        ? needs.missing
        : [];
      const selected = { ...(baseRequest.selected || {}) } as any;

      if (missing.includes("threadId")) selected.threadId = value;
      if (missing.includes("recipientUserId")) {
        selected.recipientUserId = value;
      }
      if (missing.includes("teacherId")) selected.teacherId = value;

      const next = await orchestrate({ ...baseRequest, selected });
      onResponse?.(next);
    } catch (err: any) {
      toast({
        title: "Selection failed",
        description: String(err?.message || err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function submitFollowup() {
    const answer = String(followup || "").trim();
    if (!answer) return;

    try {
      setBusy(true);

      if (prompt?.actionId) {
        const next = await orchestrateAction(baseRequest, {
          actionId: String(prompt.actionId),
          payload: { answer },
        });
        onResponse?.(next);
        setFollowup("");
        return;
      }

      const next = await orchestrate({
        ...baseRequest,
        channel: "CHAT",
        text: answer,
      });
      onResponse?.(next);
      setFollowup("");
    } catch (err: any) {
      toast({
        title: "Could not submit",
        description: String(err?.message || err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  if (!response) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-lg font-semibold text-gray-900">
                {ui?.title || "Teachmo"}
              </CardTitle>
              {ui?.subtitle ? (
                <CardDescription className="mt-1">
                  {String(ui.subtitle)}
                </CardDescription>
              ) : null}
            </div>

            {!hideBadge ? (
              <Badge variant="outline" className="text-xs shrink-0">
                Teachmo™
              </Badge>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {ui?.body ? (
            <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
              {String(ui.body)}
            </div>
          ) : null}

          {mode === "ERROR" ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {ui?.message ? String(ui.message) : "Something went wrong."}
            </div>
          ) : null}

          {mode === "CHOICE" ? (
            <div className="space-y-3">
              {prompt?.title ? (
                <div className="text-sm font-medium text-gray-800">
                  {String(prompt.title)}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {(prompt?.options || []).map((opt: any, idx: number) => (
                  <Button
                    key={`${String(opt?.value ?? idx)}`}
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => resolveChoice(opt?.value)}
                  >
                    {String(opt?.label ?? opt?.value ?? "Select")}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          {mode === "FOLLOWUP_QUESTION" ? (
            <div className="space-y-2">
              <Label className="text-sm text-gray-800">
                {String(prompt?.question || "Quick question")}
              </Label>
              <div className="flex gap-2">
                <Input
                  value={followup}
                  onChange={(e) => setFollowup(e.target.value)}
                  placeholder="Type your answer…"
                  disabled={busy}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitFollowup();
                  }}
                />
                <Button
                  onClick={submitFollowup}
                  disabled={busy || !String(followup || "").trim()}
                >
                  Continue
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>

        {mode === "CARD" && (primary || secondary || ui?.deepLink) ? (
          <CardFooter className="flex gap-2 justify-start">
            {primary ? (
              <Button onClick={() => runUiAction(primary)} disabled={busy}>
                {primary.label}
              </Button>
            ) : ui?.deepLink ? (
              <Button
                onClick={() => navigate(String(ui.deepLink))}
                disabled={busy}
              >
                Open
              </Button>
            ) : null}

            {secondary ? (
              <Button
                variant="outline"
                onClick={() => runUiAction(secondary)}
                disabled={busy}
              >
                {secondary.label}
              </Button>
            ) : null}
          </CardFooter>
        ) : null}
      </Card>
    </motion.div>
  );
}
