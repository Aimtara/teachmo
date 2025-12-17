import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function FeatureDisabled() {
  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>This feature is currently disabled</h1>
      <p style={{ marginTop: 12, lineHeight: 1.5 }}>
        It’s in migration/QA. Enable it in <code>src/config/features.ts</code> when ready.
      </p>
      <div style={{ marginTop: 16 }}>
        <Link to={createPageUrl("Dashboard")}>Go back to Dashboard</Link>
      </div>
    </div>
  );
}
