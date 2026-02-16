'use client';
import { useState, useTransition } from 'react';
import { submitAwardVote } from '@/lib/actions';
import { AWARD_EMOJIS } from '@/types';
import type { AwardCategory } from '@/types';

interface Player { id: string; name: string; }
interface Props {
  gameId: string;
  categories: AwardCategory[];
  nominees: Player[];
  existingVotes: Record<string, string>;
}

export function VoteAwardsForm({ gameId, categories, nominees, existingVotes }: Props) {
  const [votes, setVotes] = useState<Record<string, string>>(existingVotes);
  const [saved, setSaved] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    Object.keys(existingVotes).forEach((k) => { init[k] = true; });
    return init;
  });
  const [isPending, startTransition] = useTransition();
  const [savingCat, setSavingCat] = useState<string | null>(null);
  const [allSaved, setAllSaved] = useState(false);

  function handleSelect(categoryId: string, nomineeId: string) {
    setVotes((prev) => ({ ...prev, [categoryId]: nomineeId }));
    setSaved((prev) => ({ ...prev, [categoryId]: false }));
    setAllSaved(false);
  }

  function handleSaveAll() {
    const unsaved = categories.filter((c) => votes[c.id] && !saved[c.id]);
    if (unsaved.length === 0) { setAllSaved(true); return; }

    startTransition(async () => {
      for (const cat of unsaved) {
        setSavingCat(cat.id);
        const fd = new FormData();
        fd.set('game_id', gameId);
        fd.set('category_id', cat.id);
        fd.set('nominee_id', votes[cat.id]);
        try {
          await submitAwardVote(fd);
          setSaved((prev) => ({ ...prev, [cat.id]: true }));
        } catch (err: any) {
          alert(`Error saving ${cat.label}: ${err.message}`);
        }
      }
      setSavingCat(null);
      setAllSaved(true);
    });
  }

  const allVoted = categories.every((c) => votes[c.id]);
  const allAreSaved = categories.every((c) => !votes[c.id] || saved[c.id]);

  return (
    <div className="space-y-4">
      {categories.map((cat) => {
        const emoji = AWARD_EMOJIS[cat.id] || '🏅';
        const selected = votes[cat.id];
        return (
          <div key={cat.id} className="card">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-display font-bold">
                  {emoji} {cat.label}
                </h3>
                {cat.description && <p className="text-xs text-gray-500">{cat.description}</p>}
              </div>
              {saved[cat.id] && <span className="badge-green text-[11px]">✓ Saved</span>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {nominees.map((n) => (
                <button key={n.id} type="button" onClick={() => handleSelect(cat.id, n.id)}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-all cursor-pointer ${
                    selected === n.id
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}>
                  {n.name}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <button onClick={handleSaveAll} disabled={isPending || !allVoted}
        className="btn-primary w-full">
        {isPending ? `Saving ${savingCat ? '...' : ''}` : allAreSaved ? '✓ All Votes Saved' : 'Save All Votes'}
      </button>

      {allSaved && allAreSaved && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-600/10 p-3 text-center text-sm text-emerald-400">
          Your votes have been saved! Results will be available once the admin computes them.
        </div>
      )}
    </div>
  );
}
