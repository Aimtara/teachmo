import React from "react";
import NotYetMigrated from "./_parity/NotYetMigrated";

export default function Discover() {
  return (
    <NotYetMigrated
      title="Discover"
      notes={[
        "Next: merge Base44 Discover module (UnifiedDiscover + discover components).",
        "Data calls are currently stubbed unless you wire Base44 App ID or Hasura GraphQL."
      ]}
    />
  );
}
