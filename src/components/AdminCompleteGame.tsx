'use client';
import { useState, useTransition } from 'react';
import { completeGame, computeAwardResults } from '@/lib/actions';

interface Props {
  gameId: string;
  isCompleted: boolean;
  scoreA: number | null;
  scoreB: number | null;
  notes: string | null;
  voteCount: number;
}

export function AdminCompleteGame({ gameId, isCompleted, scoreA, scoreB, notes, voteCount }: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState('');

  function handleComplete(fd: FormData) {
    startTransition(async () => {
      try {
        const res = await completeGame(gameId, fd);
        if (res?.error) setMessage('Error: ' + res.error);
        else { setMessage('Game completed!'); setTimeout(() => setMessage(''), 4000); }
      } catch (err: any) { setMessage('Error: ' + (err.message || 'Unknown')); }
    });
  }

  function handleComputeAwards() {
    startTransition(async () => {
      try {
        const res = await computeAwardResults(gameId);
        if (res?.error) setMessage('Error: ' + res.error);
        else { setMessage('Awards computed & performance modifiers applied!'); setTimeout(() => setMessage(''), 4000); }
      } catch (err: any) { setMessage('Error: ' + (err.message || 'Unknown')); }
    });
  }

  return (
    <div className="card">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
        {isCompleted ? 'Game Completed' : 'Complete Game'}
      </h2>

      {!isCompleted ? (
        <form action={handleComplete} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Team A Score</label>
              <input type="number" name="score_team_a" min={0} required className="input" placeholder="0" />
            </div>
            <div>
              <label className="label">Team B Score</label>
              <input type="number" name="score_team_b" min={0} required className="input" placeholder="0" />
            </div>
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <input type="text" name="notes" className="input" placeholder="Any notes about the match" />
          </div>
          <button type="submit" className="btn-primary" disabled={isPending}>
            {isPending ? 'Saving...' : 'Mark Completed'}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-xs text-blue-400">Team A</p>
              <p className="font-mono text-3xl font-bold">{scoreA}</p>
            </div>
            <span className="text-gray-600 text-xl">—</span>
            <div className="text-center">
              <p className="text-xs text-orange-400">Team B</p>
              <p className="font-mono text-3xl font-bold">{scoreB}</p>
            </div>
          </div>
          {notes && <p className="text-sm text-gray-500 text-center italic">{notes}</p>}

          <div className="border-t border-gray-800 pt-4">
            <p className="text-sm text-gray-400 mb-2">
              Award votes received: <span className="font-mono text-gray-200">{voteCount}</span>
            </p>
            <button onClick={handleComputeAwards} disabled={isPending} className="btn-secondary">
              {isPending ? 'Computing...' : 'Compute Award Results'}
            </button>
          </div>
        </div>
      )}

      {message && (
        <p className={`mt-3 text-sm ${message.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
