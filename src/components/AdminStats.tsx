'use client';
import { useTransition, useState } from 'react';
import { computeSkillProfiles } from '@/lib/actions';
import { ATTRIBUTES, ATTRIBUTE_LABELS } from '@/types';
import type { PlayerSkillProfile } from '@/types';

interface Props { stats: PlayerSkillProfile[]; profiles: Record<string, string>; }

export function AdminStats({ stats, profiles }: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState('');

  function handleCompute() {
    startTransition(async () => {
      try {
        await computeSkillProfiles();
        setMessage('Skill profiles computed! Refresh to see updated data.');
        setTimeout(() => setMessage(''), 4000);
      } catch (err: any) { setMessage('Error: ' + err.message); }
    });
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Player Skill Profiles</h2>
        <button onClick={handleCompute} disabled={isPending} className="btn-secondary text-xs">
          {isPending ? 'Computing...' : 'Compute Profiles'}
        </button>
      </div>
      {message && <p className={`mb-3 text-sm ${message.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>{message}</p>}
      {stats.length === 0 ? (
        <p className="text-sm text-gray-600">No profiles yet. Players need to rate each other first, then click &quot;Compute Profiles&quot;.</p>
      ) : (
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="py-2 pr-3 text-left text-xs font-medium text-gray-500">Player</th>
                {ATTRIBUTES.map((a) => (
                  <th key={a} className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">{a}</th>
                ))}
                <th className="pl-3 py-2 text-right text-xs font-medium text-amber-500 uppercase">STR</th>
                <th className="pl-2 py-2 text-right text-xs font-medium text-gray-500">N</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.user_id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-2 pr-3 font-medium text-gray-200">{profiles[s.user_id] ?? s.user_id.slice(0, 8)}</td>
                  {ATTRIBUTES.map((a) => (
                    <td key={a} className="px-2 py-2 text-center font-mono text-gray-400">{Number((s as any)[a]).toFixed(1)}</td>
                  ))}
                  <td className="pl-3 py-2 text-right font-mono font-bold text-amber-400">{Number(s.strength).toFixed(2)}</td>
                  <td className="pl-2 py-2 text-right font-mono text-gray-500">{s.n_votes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
