'use client';
import { useState, useTransition } from 'react';
import { submitRating } from '@/lib/actions';
import { ATTRIBUTES, ATTRIBUTE_LABELS } from '@/types';
import type { PlayerRating } from '@/types';

interface Player { id: string; name: string; }
interface Props { players: Player[]; existingRatings: Record<string, PlayerRating>; }

export function VoteForm({ players, existingRatings }: Props) {
  const [ratings, setRatings] = useState<Record<string, Record<string, number>>>(() => {
    const init: Record<string, Record<string, number>> = {};
    players.forEach((p) => {
      const ex = existingRatings[p.id];
      init[p.id] = { tc: ex?.tc ?? 3, pd: ex?.pd ?? 3, da: ex?.da ?? 3, en: ex?.en ?? 3, fi: ex?.fi ?? 3, iq: ex?.iq ?? 3 };
    });
    return init;
  });
  const [saved, setSaved] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    players.forEach((p) => { init[p.id] = !!existingRatings[p.id]; });
    return init;
  });
  const [isPending, startTransition] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);

  function setAttr(pid: string, attr: string, val: number) {
    setRatings((prev) => ({ ...prev, [pid]: { ...prev[pid], [attr]: val } }));
    setSaved((prev) => ({ ...prev, [pid]: false }));
  }

  function handleSave(pid: string) {
    setSavingId(pid);
    const r = ratings[pid];
    const fd = new FormData();
    fd.set('ratee_id', pid);
    ATTRIBUTES.forEach((a) => fd.set(a, String(r[a])));
    startTransition(async () => {
      try {
        await submitRating(fd);
        setSaved((prev) => ({ ...prev, [pid]: true }));
      } catch (err: any) { alert(err.message); }
      setSavingId(null);
    });
  }

  return (
    <div className="space-y-4">
      {players.map((p) => (
        <div key={p.id} className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-lg">{p.name}</h3>
            {saved[p.id] && <span className="badge-green text-[11px]">✓ Saved</span>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {ATTRIBUTES.map((attr) => (
              <div key={attr}>
                <label className="label">{ATTRIBUTE_LABELS[attr]}</label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button key={v} type="button" onClick={() => setAttr(p.id, attr, v)}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-mono font-bold transition-all cursor-pointer ${
                        ratings[p.id][attr] === v
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 scale-110'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                      }`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => handleSave(p.id)}
            disabled={savingId === p.id && isPending} className="btn-secondary mt-4 w-full">
            {savingId === p.id && isPending ? 'Saving...' : saved[p.id] ? 'Update Rating' : 'Save Rating'}
          </button>
        </div>
      ))}
    </div>
  );
}
