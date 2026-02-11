'use client';
import { useState, useTransition } from 'react';
import { saveFormAdjustment } from '@/lib/actions';
import { ATTRIBUTES, ATTRIBUTE_LABELS } from '@/types';
import type { FormAdjustment } from '@/types';

interface Player { id: string; name: string; }
interface Props { gameId: string; confirmed: Player[]; existing: FormAdjustment[]; }

export function AdminFormAdjustments({ gameId, confirmed, existing }: Props) {
  const existingMap = new Map(existing.map((a) => [a.user_id, a]));

  const [adjs, setAdjs] = useState(() => {
    const init: Record<string, Record<string, number>> = {};
    confirmed.forEach((p) => {
      const ex = existingMap.get(p.id);
      init[p.id] = {
        tc: ex?.tc ?? 0, pd: ex?.pd ?? 0, da: ex?.da ?? 0,
        en: ex?.en ?? 0, fi: ex?.fi ?? 0, iq: ex?.iq ?? 0,
      };
    });
    return init;
  });

  const [notes, setNotes] = useState(() => {
    const init: Record<string, string> = {};
    confirmed.forEach((p) => { init[p.id] = existingMap.get(p.id)?.note ?? ''; });
    return init;
  });

  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);

  function cycle(pid: string, attr: string) {
    setAdjs((prev) => {
      const cur = prev[pid][attr];
      const next = cur >= 1 ? -1 : cur + 1;
      return { ...prev, [pid]: { ...prev[pid], [attr]: next } };
    });
    setSaved((prev) => ({ ...prev, [pid]: false }));
  }

  function handleSave(pid: string) {
    setSavingId(pid);
    const a = adjs[pid];
    const fd = new FormData();
    fd.set('game_id', gameId);
    fd.set('user_id', pid);
    ATTRIBUTES.forEach((attr) => fd.set(attr, String(a[attr])));
    fd.set('note', notes[pid] || '');
    startTransition(async () => {
      try {
        await saveFormAdjustment(fd);
        setSaved((prev) => ({ ...prev, [pid]: true }));
      } catch (err: any) { alert(err.message); }
      setSavingId(null);
    });
  }

  if (confirmed.length === 0) return null;

  return (
    <div className="card">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
        Form Adjustments (this game)
      </h2>
      <p className="text-xs text-gray-500 mb-4">Click each attribute to cycle through -1, 0, +1 adjustments.</p>
      <div className="space-y-3">
        {confirmed.map((p) => (
          <div key={p.id} className="rounded-lg border border-gray-800 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm text-gray-200">{p.name}</span>
              {saved[p.id] && <span className="badge-green text-[11px]">Saved</span>}
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {ATTRIBUTES.map((attr) => {
                const val = adjs[p.id]?.[attr] ?? 0;
                const color = val > 0 ? 'bg-emerald-700 text-emerald-200' : val < 0 ? 'bg-red-700 text-red-200' : 'bg-gray-800 text-gray-400';
                return (
                  <button key={attr} type="button" onClick={() => cycle(p.id, attr)}
                    className={`px-2 py-1 rounded text-xs font-mono font-bold ${color} transition cursor-pointer`}>
                    {attr.toUpperCase()} {val > 0 ? '+1' : val < 0 ? '-1' : '0'}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input type="text" placeholder="Note (optional)" value={notes[p.id] || ''}
                onChange={(e) => { setNotes((prev) => ({ ...prev, [p.id]: e.target.value })); setSaved((prev) => ({ ...prev, [p.id]: false })); }}
                className="input text-xs flex-1" />
              <button onClick={() => handleSave(p.id)}
                disabled={savingId === p.id && isPending} className="btn-secondary text-xs whitespace-nowrap">
                {savingId === p.id && isPending ? '...' : 'Save'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
