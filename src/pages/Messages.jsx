import React from "react";
import NotYetMigrated from "./_parity/NotYetMigrated";

export default function Messages() {
  return (
    <NotYetMigrated
      title="Messages"
      notes={[
        "Next: merge Base44 Messages page + messages components.",
        "useAppContextSafe shim is included in this patch."
      ]}
    />
  );
}
