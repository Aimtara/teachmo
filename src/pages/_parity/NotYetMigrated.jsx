import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NotYetMigrated({ title, notes = [] }) {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card className="rounded-2xl">
        <CardContent className="p-6 space-y-4">
          <div>
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground">
              This route is live in GitHub, but the full Base44 UI module hasn’t been merged yet.
            </p>
          </div>

          {notes.length > 0 && (
            <ul className="list-disc pl-5 text-sm space-y-1">
              {notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <Button variant="default" onClick={() => window.history.back()}>
              Go back
            </Button>
            <Button
              variant="outline"
              onClick={() => navigator.clipboard?.writeText(window.location.href)}
            >
              Copy link
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
