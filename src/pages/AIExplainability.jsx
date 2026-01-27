import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchAiJson } from '@/api/ai/client';

export default function AIExplainability() {
  const { id } = useParams();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    const load = async () => {
      try {
        const response = await fetchAiJson(`/ai/explainability/${id}`);
        if (isMounted) {
          setSummary(response.summary);
          setError('');
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to load AI interaction summary.');
        }
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!summary) {
    return <p className="text-sm text-gray-500">Loading AI interaction...</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">AI Interaction Summary</h1>
        <p className="text-sm text-gray-600">Review how this response was generated.</p>
      </div>

      <div className="rounded-lg border bg-white p-4 shadow-sm space-y-3">
        <p>
          <strong>Model:</strong> {summary.model ?? '—'}
        </p>
        <p>
          <strong>Total tokens:</strong> {summary.totalTokens ?? '—'}
        </p>
        <p>
          <strong>Cost (USD):</strong>{' '}
          {summary.costUsd != null ? `$${Number(summary.costUsd).toFixed(4)}` : '—'}
        </p>
        <p>
          <strong>Risk score:</strong> {summary.riskScore ?? '—'}
        </p>
        {summary.flags?.length ? (
          <p>
            <strong>Flags:</strong> {summary.flags.join(', ')}
          </p>
        ) : null}
        <p>
          <strong>Created:</strong>{' '}
          {summary.createdAt ? new Date(summary.createdAt).toLocaleString() : '—'}
        </p>
      </div>

      <div className="rounded-lg border bg-white p-4 shadow-sm space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">Review status</h2>
        {summary.review ? (
          <>
            <p>
              <strong>Status:</strong> {summary.review.status ?? '—'}
            </p>
            <p>
              <strong>Reason:</strong> {summary.review.reason ?? '—'}
            </p>
            {summary.review.notes ? (
              <p>
                <strong>Notes:</strong> {summary.review.notes}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-gray-600">Not yet reviewed.</p>
        )}
      </div>
    </div>
  );
}
