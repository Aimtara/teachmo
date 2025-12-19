import React from "react";
import NotYetMigrated from "./_parity/NotYetMigrated";

export default function Community() {
  return (
    <NotYetMigrated
      title="Community"
      notes={[
        "Next: merge Base44 UnifiedCommunity module + hooks (useOptimizedQuery).",
        "Requires React Query (added in this patch)."
      ]}
    />
  );
}
