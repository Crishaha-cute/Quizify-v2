import React, { useEffect, useState } from 'react';
import { supabase } from '../../../services/supabase.ts';

interface AuditLogRow {
  id: string;
  admin_id: string;
  action: string;
  target_table: string | null;
  target_id: string | null;
  details: any;
  created_at: string;
}

const AdminAuditPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<AuditLogRow[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('admin_audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);
        if (error) throw error;
        setLogs(data ?? []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load audit log.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="text-2xl font-black">Admin Audit Log</div>
      {error && <div className="rounded-2xl border border-red-900/60 bg-red-950/40 p-4 text-red-200">{error}</div>}
      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="text-left font-semibold py-2">Time</th>
                <th className="text-left font-semibold py-2">Admin</th>
                <th className="text-left font-semibold py-2">Action</th>
                <th className="text-left font-semibold py-2">Table</th>
                <th className="text-left font-semibold py-2">Target ID</th>
                <th className="text-left font-semibold py-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-800">
                  <td className="py-2 pr-4 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="py-2 pr-4">{log.admin_id}</td>
                  <td className="py-2 pr-4">{log.action}</td>
                  <td className="py-2 pr-4">{log.target_table}</td>
                  <td className="py-2 pr-4">{log.target_id}</td>
                  <td className="py-2 pr-4 max-w-xs truncate">{log.details ? JSON.stringify(log.details) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminAuditPage;
