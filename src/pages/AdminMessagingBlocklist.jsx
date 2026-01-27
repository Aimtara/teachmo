import { useEffect, useState } from 'react';
import { MessagingModerationAPI } from '@/api/adapters';

export default function AdminMessagingBlocklist() {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lifting, setLifting] = useState({});

  const loadBlocks = async () => {
    setLoading(true);
    try {
      const list = await MessagingModerationAPI.listBlocks();
      setBlocks(Array.isArray(list) ? list : []);
      setError('');
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Failed to load blocklist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlocks();
  }, []);

  const lift = async (blockId) => {
    if (!blockId) return;
    setLifting((prev) => ({ ...prev, [blockId]: true }));
    try {
      await MessagingModerationAPI.liftBlock({ blockId });
      await loadBlocks();
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Unable to lift block');
    } finally {
      setLifting((prev) => ({ ...prev, [blockId]: false }));
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-gray-500">Messaging moderation</p>
          <h1 className="text-3xl font-semibold text-gray-900">Messaging Blocklist</h1>
          <p className="text-sm text-gray-600">See who is blocked from messaging within your school.</p>
        </div>

        <button
          type="button"
          onClick={loadBlocks}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-600">Loading blocklist…</p>
      ) : blocks.length === 0 ? (
        <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
          <p className="font-semibold text-gray-900">No blocked users</p>
          <p className="text-sm text-gray-600">No active messaging blocks for your school.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {blocks.map((block) => (
                <tr key={block.id}>
                  <td className="px-4 py-3 text-sm text-gray-800">{block.blocked_user_id}</td>
                  <td className="px-4 py-3 text-sm text-gray-800 capitalize">{block.status}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{block.reason || 'Not provided'}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">
                    <button
                      type="button"
                      disabled={lifting[block.id] || block.status === 'lifted'}
                      onClick={() => lift(block.id)}
                      className="rounded border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
                    >
                      {block.status === 'lifted' ? 'Lifted' : 'Lift block'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
