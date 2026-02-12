'use client';
import { useTransition, useState } from 'react';
import { generateTeamsAction, lockTeams, unlockTeams, togglePublish } from '@/lib/actions';
import { ATTRIBUTES } from '@/types';
import type { PlayerSkillProfile, Teams } from '@/types';

interface Props {
  gameId: string;
  teams: Teams | null;
  stats: PlayerSkillProfile[];
  profiles: Record<string, string>;
}

export function AdminTeams({ gameId, teams, stats, profiles }: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const statsMap = new Map(stats.map((s) => [s.user_id, s]));

  function run(fn: () => Promise<void>, successMsg: string) {
    startTransition(async () => {
      try { await fn(); setMessage(successMsg); setTimeout(() => setMessage(''), 4000); }
      catch (err: any) { setMessage('Error: ' + (err.message || err.digest || JSON.stringify(err))); }
    });
  }

  function teamStrength(ids: string[]) {
    return ids.reduce((sum, id) => sum + Number(statsMap.get(id)?.strength ?? 0), 0);
  }

  function teamAttrSum(ids: string[], attr: string) {
    return ids.reduce((sum, id) => sum + Number((statsMap.get(id) as any)?.[attr] ?? 0), 0);
  }

  return (
    <div className="card">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Teams</h2>
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => run(() => generateTeamsAction(gameId), 'Teams generated!')}
          disabled={isPending || (teams?.locked ?? false)} className="btn-primary text-sm">
          {isPending ? 'Working...' : teams ? 'Regenerate' : 'Generate Teams'}
        </button>
        {teams && !teams.locked && (
          <button onClick={() => run(() => lockTeams(gameId), 'Locked!')} disabled={isPending} className="btn-secondary text-sm">Lock</button>
        )}
        {teams && teams.locked && (
          <button onClick={() => run(() => unlockTeams(gameId), 'Unlocked!')} disabled={isPending} className="btn-danger text-sm">Unlock</button>
        )}
        {teams && (
          <button onClick={() => run(() => togglePublish(gameId, !teams.published), teams.published ? 'Unpublished' : 'Published!')}
            disabled={isPending} className="btn-secondary text-sm">
            {teams.published ? 'Unpublish' : 'Publish'}
          </button>
        )}
      </div>
      {message && <p className={`mb-3 text-sm ${message.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>{message}</p>}

      {teams ? (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {teams.locked && <span className="badge-red">Locked</span>}
            {teams.published && <span className="badge-green">Published</span>}
            <span className="badge-blue">Cost: {Number(teams.cost).toFixed(2)}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-blue-400">Team A</h4>
                <span className="font-mono text-xs text-blue-300">STR: {teamStrength(teams.team_a).toFixed(2)}</span>
              </div>
              <ul className="space-y-1">
                {teams.team_a.map((id) => (
                  <li key={id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{profiles[id] ?? id.slice(0, 8)}</span>
                    <span className="font-mono text-xs text-gray-500">{Number(statsMap.get(id)?.strength ?? 0).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-orange-400">Team B</h4>
                <span className="font-mono text-xs text-orange-300">STR: {teamStrength(teams.team_b).toFixed(2)}</span>
              </div>
              <ul className="space-y-1">
                {teams.team_b.map((id) => (
                  <li key={id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{profiles[id] ?? id.slice(0, 8)}</span>
                    <span className="font-mono text-xs text-gray-500">{Number(statsMap.get(id)?.strength ?? 0).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="py-1.5 text-left text-gray-500">Attr</th>
                  <th className="py-1.5 text-center text-blue-400">A</th>
                  <th className="py-1.5 text-center text-orange-400">B</th>
                  <th className="py-1.5 text-right text-gray-500">Diff</th>
                </tr>
              </thead>
              <tbody>
                {ATTRIBUTES.map((attr) => {
                  const a = teamAttrSum(teams.team_a, attr);
                  const b = teamAttrSum(teams.team_b, attr);
                  const diff = Math.abs(a - b);
                  return (
                    <tr key={attr} className="border-b border-gray-800/40">
                      <td className="py-1 uppercase text-gray-400">{attr}</td>
                      <td className="py-1 text-center font-mono text-gray-300">{a.toFixed(1)}</td>
                      <td className="py-1 text-center font-mono text-gray-300">{b.toFixed(1)}</td>
                      <td className={`py-1 text-right font-mono ${diff < 1 ? 'text-emerald-400' : diff < 2 ? 'text-amber-400' : 'text-red-400'}`}>
                        {diff.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="font-bold">
                  <td className="py-1 text-amber-400">STR</td>
                  <td className="py-1 text-center font-mono text-gray-200">{teamStrength(teams.team_a).toFixed(2)}</td>
                  <td className="py-1 text-center font-mono text-gray-200">{teamStrength(teams.team_b).toFixed(2)}</td>
                  <td className="py-1 text-right font-mono text-amber-400">
                    {Math.abs(teamStrength(teams.team_a) - teamStrength(teams.team_b)).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-600">No teams yet. Compute profiles first, then generate teams.</p>
      )}
    </div>
  );
}
