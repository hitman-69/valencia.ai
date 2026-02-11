'use client';
import { useTransition, useState } from 'react';
import { createGame, updateGame } from '@/lib/actions';
import type { Game } from '@/types';

function toLocalInput(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

export function AdminGameForm({ game }: { game: Game | null }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState('');

  function handleSubmit(fd: FormData) {
    startTransition(async () => {
      try {
        if (game) { await updateGame(game.id, fd); setMessage('Game updated!'); }
        else { await createGame(fd); setMessage('Game created!'); }
        setTimeout(() => setMessage(''), 3000);
      } catch (err: any) { setMessage('Error: ' + err.message); }
    });
  }

  return (
    <div className="card">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
        {game ? 'Edit Game' : 'Create New Game'}
      </h2>
      <form action={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Date &amp; Time</label>
            <input type="datetime-local" name="starts_at" defaultValue={toLocalInput(game?.starts_at ?? null)} required className="input" />
          </div>
          <div>
            <label className="label">Location</label>
            <input type="text" name="location" defaultValue={game?.location ?? ''} placeholder="Field name" className="input" />
          </div>
          <div>
            <label className="label">Capacity</label>
            <input type="number" name="capacity" defaultValue={game?.capacity ?? 10} min={2} max={30} className="input" />
          </div>
          <div>
            <label className="label">Status</label>
            <select name="status" defaultValue={game?.status ?? 'open'} className="input">
              <option value="draft">Draft</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div>
            <label className="label">RSVP Cutoff</label>
            <input type="datetime-local" name="rsvp_cutoff" defaultValue={toLocalInput(game?.rsvp_cutoff ?? null)} className="input" />
          </div>
          <div>
            <label className="label">Rating Cutoff</label>
            <input type="datetime-local" name="rating_cutoff" defaultValue={toLocalInput(game?.rating_cutoff ?? null)} className="input" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="hidden" name="use_form_adjustments" value="false" />
            <input type="checkbox" name="use_form_adjustments" value="true"
              defaultChecked={game?.use_form_adjustments ?? false}
              className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-emerald-500" />
            Enable form adjustments
          </label>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary" disabled={isPending}>
            {isPending ? 'Saving...' : game ? 'Update Game' : 'Create Game'}
          </button>
          {message && <span className={`text-sm ${message.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>{message}</span>}
        </div>
      </form>
    </div>
  );
}
