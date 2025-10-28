// 5x3 Slot Machine Implementation

interface SymbolDef { key: string; weight: number; payout3: number; payout4: number; payout5: number; emoji: string; }

const SYMBOLS: SymbolDef[] = [
  { key: 'A', weight: 30, payout3: 5, payout4: 15, payout5: 40, emoji: '🔔' },
  { key: 'B', weight: 40, payout3: 4, payout4: 12, payout5: 30, emoji: '🍒' },
  { key: 'C', weight: 55, payout3: 3, payout4: 9,  payout5: 25, emoji: '⭐' },
  { key: 'D', weight: 70, payout3: 2, payout4: 6,  payout5: 18, emoji: '🍋' },
  { key: 'E', weight: 10, payout3: 10, payout4: 30, payout5: 100, emoji: '7️⃣' }
];

const TOTAL_WEIGHT = SYMBOLS.reduce((s, x) => s + x.weight, 0);
const REELS = 5;
const ROWS = 3;
const PAYLINES = [ // row indices
  [0,0,0,0,0],
  [1,1,1,1,1],
  [2,2,2,2,2]
];

interface SpinResult {
  grid: string[][]; // rows x reels (row major: ROWS arrays each length REELS)
  payout: number;
  lineWins: { line: number; symbol: string; count: number; win: number }[];
}

function pickSymbol(): SymbolDef {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const s of SYMBOLS) {
    if (r < s.weight) return s;
    r -= s.weight;
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

function spinOnce(): string[][] {
  const rows: string[][] = [];
  for (let r=0; r<ROWS; r++) {
    const row: string[] = [];
    for (let c=0; c<REELS; c++) {
      row.push(pickSymbol().key);
    }
    rows.push(row);
  }
  return rows;
}

function evaluate(grid: string[][], bet: number): SpinResult {
  const lineWins: { line: number; symbol: string; count: number; win: number }[] = [];
  let total = 0;
  for (let i=0; i<PAYLINES.length; i++) {
    const line = PAYLINES[i];
    const firstSymbol = grid[line[0]][0];
    let count = 1;
    for (let col=1; col<REELS; col++) {
      const sym = grid[line[col]][col];
      if (sym === firstSymbol) count++; else break;
    }
    if (count >= 3) {
      const def = SYMBOLS.find(s => s.key === firstSymbol)!;
      const mult = count === 3 ? def.payout3 : count === 4 ? def.payout4 : def.payout5;
      const win = mult * bet;
      total += win;
      lineWins.push({ line: i, symbol: firstSymbol, count, win });
    }
  }
  return { grid, payout: total, lineWins };
}

// DOM wiring
const slotEl = document.getElementById('slot')!;
const balanceEl = document.getElementById('balance')!;
const betEl = document.getElementById('bet')!;
const lastWinEl = document.getElementById('lastWin')!;
const logEl = document.getElementById('log')!;
const spinBtn = document.getElementById('spinBtn') as HTMLButtonElement;
const betDownBtn = document.getElementById('betDown') as HTMLButtonElement;
const betUpBtn = document.getElementById('betUp') as HTMLButtonElement;
const autoBtn = document.getElementById('autoBtn') as HTMLButtonElement;

let balance = 1000;
let bet = 10;
let auto = false;
let spinning = false;

function setBalance(v: number) { balance = v; balanceEl.textContent = balance.toString(); }
function setBet(v: number) { bet = Math.max(1, Math.min(100, v)); betEl.textContent = bet.toString(); }

function createReels() {
  slotEl.innerHTML = '';
  for (let c=0; c<REELS; c++) {
    const reel = document.createElement('div');
    reel.className = 'reel';
    const inner = document.createElement('div');
    inner.className = 'symbols';
    // add placeholder symbols
    for (let r=0; r<ROWS+6; r++) { // extra for scroll distance
      const sDiv = document.createElement('div');
      sDiv.className = 'symbol';
      sDiv.textContent = SYMBOLS[(r + c) % SYMBOLS.length].emoji;
      inner.appendChild(sDiv);
    }
    reel.appendChild(inner);
    slotEl.appendChild(reel);
  }
}

createReels();

function renderResult(result: SpinResult) {
  const reels = Array.from(slotEl.getElementsByClassName('reel')) as HTMLDivElement[];
  // Fill each reel's visible 3 cells after animation ends
  for (let c=0; c<REELS; c++) {
    const reel = reels[c];
    const inner = reel.querySelector('.symbols') as HTMLDivElement;
    inner.innerHTML = '';
    for (let r=0; r<ROWS; r++) {
      const sDiv = document.createElement('div');
      sDiv.className = 'symbol';
      const sym = SYMBOLS.find(s=>s.key === result.grid[r][c])!;
      sDiv.textContent = sym.emoji;
      inner.appendChild(sDiv);
    }
  }

  // Highlight wins
  result.lineWins.forEach(w => {
    const rowIndex = w.line; // 0..2
    for (let c=0; c<w.count; c++) {
      const reel = reels[c];
      const cell = (reel.querySelector('.symbols') as HTMLDivElement).children[rowIndex] as HTMLElement;
      cell.classList.add('winning');
    }
  });
}

async function spin() {
  if (spinning) return; if (balance < bet) { log('Insufficient balance'); return; }
  spinning = true;
  setBalance(balance - bet);
  disableUI(true);
  clearWinHighlights();
  const resultGrid = spinOnce();
  const result = evaluate(resultGrid, bet);
  animateReels().then(() => {
    renderResult(result);
    setBalance(balance + result.payout);
    lastWinEl.textContent = result.payout.toString();
    log(formatResultLog(result));
    spinning = false;
    disableUI(false);
    if (auto && balance >= bet) {
      setTimeout(spin, 600);
    }
  });
}

function animateReels(): Promise<void> {
  const reels = Array.from(slotEl.getElementsByClassName('reel')) as HTMLDivElement[];
  const promises: Promise<void>[] = [];
  reels.forEach((reel, idx) => {
    const inner = reel.querySelector('.symbols') as HTMLDivElement;
    inner.style.transition = 'none';
    inner.style.transform = 'translateY(0px)';
    // Build a tall list of random symbols to scroll through
    inner.innerHTML = '';
    const totalSymbols = ROWS + 12; // enough for spin distance
    for (let i=0; i<totalSymbols; i++) {
      const d = document.createElement('div');
      d.className = 'symbol';
      // pick random symbol emoji (weighted by duplicating heavier ones)
      d.textContent = pickSymbol().emoji;
      inner.appendChild(d);
    }
    // force reflow
    void inner.offsetHeight;
    const distance = -120 * (totalSymbols - ROWS); // each symbol 120px
    const duration = 900 + idx * 160; // staggered
    inner.style.transition = `transform ${duration}ms cubic-bezier(.25,.6,.3,1)`;
    inner.style.transform = `translateY(${distance}px)`;
    promises.push(new Promise(res => {
      inner.addEventListener('transitionend', function handler(){
        inner.removeEventListener('transitionend', handler);
        res();
      });
    }));
  });
  return Promise.all(promises).then(()=>{});
}

function disableUI(dis: boolean) {
  spinBtn.disabled = dis;
  betDownBtn.disabled = dis;
  betUpBtn.disabled = dis;
  autoBtn.disabled = dis;
}

function clearWinHighlights() {
  Array.from(document.querySelectorAll('.winning')).forEach(el => el.classList.remove('winning'));
}

function log(msg: string) {
  const time = new Date().toLocaleTimeString();
  const p = document.createElement('div');
  p.textContent = `[${time}] ${msg}`;
  logEl.prepend(p);
  while (logEl.children.length > 80) logEl.removeChild(logEl.lastChild!);
}

function formatResultLog(r: SpinResult) {
  if (!r.lineWins.length) return `Spin result: No wins.`;
  return `Win: ${r.payout} (${r.lineWins.map(w=>`${w.symbol}x${w.count}@L${w.line+1}=${w.win}`).join(', ')})`;
}

spinBtn.addEventListener('click', () => spin());
betDownBtn.addEventListener('click', ()=> setBet(bet - 1));
betUpBtn.addEventListener('click', ()=> setBet(bet + 1));
autoBtn.addEventListener('click', () => { auto = !auto; autoBtn.textContent = `Auto: ${auto? 'On':'Off'}`; if (auto && !spinning) spin(); });

// Keyboard shortcuts
window.addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); spin(); }
  if (e.code === 'ArrowUp') setBet(bet + 1);
  if (e.code === 'ArrowDown') setBet(bet - 1);
});

log('Ready. Press Space or Spin.');
