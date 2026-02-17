'use client';
import { useState, useTransition } from 'react';
import { adminAddPlayer, adminRemovePlayer } from '@/lib/actions';

interface Player { id: string; name: string; }
interface Rsvp { user_id: string; status: string; name: string; }

interface Props {
  gameId: string;
  allPlayers: Player[];
  currentRsvps: Rsvp[];
}

export function AdminRsvpManager({ gameId, allPlayers, currentRsvps }: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState('');

  const activeIds = new Set(currentRsvps.filter((r) => r.status !== 'cancelled').map((r) => r.user_id));
  const availablePlayers = allPlayers.filter((p) => !activeIds.has(p.id));

  function handleAdd() {
    if (!selectedPlayer) return;
    startTransition(async () => {
      const res = await adminAddPlayer(gameId, selectedPlayer);
      if (res?.error) setMessage('Error: ' + res.error);
      else { setMessage('Player added!'); setSelectedPlayer(''); setTimeout(() => setMessage(''), 3000); }
    });
  }

  function handleRemove(userId: string, name: string) {
    if (!confirm(`Remove ${name} from this game?`)) return;
    startTransition(async () => {
      const res = await adminRemovePlayer(gameId, userId);
      if (res?.error) setMessage('Error: ' + res.error);
      else { setMessage('Player removed'); setTimeout(() => setMessage(''), 3000); }
    });
  }

  const confirmed = currentRsvps.filter((r) => r.status === 'confirmed');
  const waitlist = currentRsvps.filter((r) => r.status === 'waitlist');

  return (
    <div className="card">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
        Manage Players
      </h2>

      <div className="grid gap-2 sm:grid-cols-2 mb-4">
        <div>
          <p className="text-xs text-gray-500 mb-1.5">Confirmed ({confirmed.length})</p>
          {confirmed.length === 0 && <p className="text-sm text-gray-600">None</p>}
          {confirmed.map((r) => (
            <div key={r.user_id} className="flex items-center justify-between py-1">
              <span className="text-sm text-gray-300">{r.name}</span>
              <button onClick={() => handleRemove(r.user_id, r.name)}
                disabled={isPending}
                className="text-xs text-red-400 hover:text-red-300 transition cursor-pointer">
                ✕
              </button>
            </div>
          ))}
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1.5">Waitlist ({waitlist.length})</p>
          {waitlist.length === 0 ? <p className="text-sm text-gray-600">Empty</p> :
            waitlist.map((r) => (
              <div key={r.user_id} className="flex items-center justify-between py-1">
                <span className="text-sm text-gray-300">{r.name}</span>
                <button onClick={() => handleRemove(r.user_id, r.name)}
                  disabled={isPending}
                  className="text-xs text-red-400 hover:text-red-300 transition cursor-pointer">
                  ✕
                </button>
              </div>
            ))
          }
        </div>
      </div>

      {availablePlayers.length > 0 && (
        <div className="flex gap-2">
          <select value={selectedPlayer} onChange={(e) => setSelectedPlayer(e.target.value)}
            className="input flex-1">
            <option value="">Select player to add...</option>
            {availablePlayers.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button onClick={handleAdd} disabled={isPending || !selectedPlayer}
            className="btn-primary text-sm whitespace-nowrap">
            {isPending ? '...' : 'Add'}
          </button>
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
