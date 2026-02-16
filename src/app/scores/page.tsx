import { createServerSupabase } from '@/lib/supabase/server';
import { ATTRIBUTES, ATTRIBUTE_LABELS } from '@/types';
import type { PlayerSkillPublic } from '@/types';

export const dynamic = 'force-dynamic';

function confidence(n: number) {
  if (n >= 8) return { label: 'High', color: 'text-emerald-400' };
  if (n >= 4) return { label: 'Medium', color: 'text-amber-400' };
  if (n >= 1) return { label: 'Low', color: 'text-red-400' };
  return { label: '—', color: 'text-gray-600' };
}

export default async function ScoresPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: stats } = await supabase
    .from('player_skill_public' as any)
    .select('*');

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name');

  const nameMap: Record<string, string> = {};
  if (profiles) profiles.forEach((p: any) => { nameMap[p.id] = p.name; });

  const skillProfiles: PlayerSkillPublic[] = (stats ?? []).sort((a: any, b: any) => {
    const nameA = (nameMap[a.user_id] ?? '').toLowerCase();
    const nameB = (nameMap[b.user_id] ?? '').toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Player Skills</h1>
        <p className="mt-1 text-sm text-gray-400">
          Aggregated skill profiles based on all player ratings.
        </p>
      </div>

      {skillProfiles.length === 0 ? (
        <div className="card text-center">
          <span className="text-4xl">📊</span>
          <h2 className="mt-3 font-display text-lg font-bold">No scores yet</h2>
          <p className="mt-1 text-sm text-gray-400">The admin needs to compute skill profiles first.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="py-2.5 pr-3 text-left text-xs font-medium text-gray-500">Player</th>
                {ATTRIBUTES.map((a) => (
                  <th key={a} className="px-2 py-2.5 text-center text-xs font-medium text-gray-500">
                    {ATTRIBUTE_LABELS[a]}
                  </th>
                ))}
               <th className="px-2 py-2.5 text-center text-xs font-medium text-gray-500">
                  {ATTRIBUTE_LABELS.presence}
                </th>
                <th className="pl-3 py-2.5 text-right text-xs font-medium text-gray-500">Votes</th>
                <th className="pl-3 py-2.5 text-right text-xs font-medium text-gray-500 hidden sm:table-cell">Conf.</th>
              </tr>
            </thead>
            <tbody>
              {skillProfiles.map((s) => {
                const conf = confidence(s.n_votes);
                const isMe = s.user_id === user.id;
                return (
                  <tr key={s.user_id} className={`border-b border-gray-800/50 ${isMe ? 'bg-emerald-900/10' : 'hover:bg-gray-800/30'}`}>
                    <td className={`py-2.5 pr-3 font-medium ${isMe ? 'text-emerald-400' : 'text-gray-200'}`}>
                      {nameMap[s.user_id] ?? s.user_id.slice(0, 8)}
                      {isMe && <span className="ml-1.5 text-[10px] text-emerald-600">(you)</span>}
                    </td>
                    {ATTRIBUTES.map((a) => (
                      <td className="px-2 py-2.5 text-center font-mono text-gray-400">
                        {Number((s as any)[a]).toFixed(1)}
                      </td>
                    ))}
                    <td className="px-2 py-2.5 text-center font-mono text-gray-400">
                      {s.presence != null ? Number(s.presence).toFixed(1) : '—'}
                    </td>
                    <td className="pl-3 py-2.5 text-right font-mono text-gray-500">
                      {s.n_votes}
                    </td>
                    <td className={`pl-3 py-2.5 text-right text-xs font-medium ${conf.color} hidden sm:table-cell`}>
                      {conf.label}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
