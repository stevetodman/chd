import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Link } from 'react-router-dom';
import { classNames } from '../../lib/utils';

interface AdminItem {
  id: string;
  slug: string;
  status: string;
  lesion?: string | null;
  topic?: string | null;
}

export default function Items() {
  const [items, setItems] = useState<AdminItem[]>([]);

  useEffect(() => {
    // Supabase integration: admin-only access to manage question versions.
    supabase
      .from('questions')
      .select('id, slug, status, lesion, topic')
      .order('updated_at', { ascending: false })
      .then(({ data }) => setItems((data as AdminItem[]) ?? []));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Items</h1>
        <Link to="/admin/import" className="text-sm text-brand-600 underline">
          Import CSV
        </Link>
      </div>
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-neutral-200 text-sm">
          <thead className="bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 text-left">Slug</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Lesion</th>
              <th className="px-4 py-3 text-left">Topic</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">{item.slug}</td>
                <td className="px-4 py-3">{item.status}</td>
                <td className="px-4 py-3">{item.lesion ?? '–'}</td>
                <td className="px-4 py-3">{item.topic ?? '–'}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/admin/item/${item.id}`}
                    className={classNames(
                      'inline-flex items-center rounded-md border border-neutral-200 px-3 py-1 text-sm text-neutral-700 hover:bg-neutral-100',
                    )}
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
