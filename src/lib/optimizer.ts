interface PlayerStats {
  user_id: string;
  tc: number;
  pd: number;
  da: number;
  en: number;
  fi: number;
  iq: number;
  strength: number;
}

interface TeamSplit {
  team_a: string[];
  team_b: string[];
  cost: number;
}

function computeCost(a: PlayerStats[], b: PlayerStats[]): number {
  const sum = (team: PlayerStats[], attr: keyof PlayerStats) =>
    team.reduce((s, p) => s + (p[attr] as number), 0);

  const dS = Math.abs(sum(a, 'strength') - sum(b, 'strength'));
  const dTC = Math.abs(sum(a, 'tc') - sum(b, 'tc'));
  const dPD = Math.abs(sum(a, 'pd') - sum(b, 'pd'));
  const dDA = Math.abs(sum(a, 'da') - sum(b, 'da'));
  const dEN = Math.abs(sum(a, 'en') - sum(b, 'en'));
  const dFI = Math.abs(sum(a, 'fi') - sum(b, 'fi'));
  const dIQ = Math.abs(sum(a, 'iq') - sum(b, 'iq'));

  return 3.0 * dS + 1.5 * (dTC + dPD + dDA) + 1.0 * (dEN + dFI) + 0.8 * dIQ;
}

function combinations(arr: number[], k: number): number[][] {
  const result: number[][] = [];
  function helper(start: number, combo: number[]) {
    if (combo.length === k) { result.push([...combo]); return; }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      helper(i + 1, combo);
      combo.pop();
    }
  }
  helper(0, []);
  return result;
}

export function generateTeams(players: PlayerStats[]): TeamSplit {
  if (players.length !== 10) throw new Error('Need exactly 10 players');

  const indices = Array.from({ length: 10 }, (_, i) => i);
  const combos = combinations(indices, 5);
  let bestCost = Infinity;
  let bestA: number[] = [];

  const half = combos.length / 2;
  for (let i = 0; i < half; i++) {
    const aIdx = combos[i];
    const bIdx = indices.filter((x) => !aIdx.includes(x));
    const cost = computeCost(aIdx.map((j) => players[j]), bIdx.map((j) => players[j]));
    if (cost < bestCost) { bestCost = cost; bestA = aIdx; }
  }

  const bestBIdx = indices.filter((x) => !bestA.includes(x));
  return {
    team_a: bestA.map((i) => players[i].user_id),
    team_b: bestBIdx.map((i) => players[i].user_id),
    cost: Math.round(bestCost * 1000) / 1000,
  };
}

export function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}
