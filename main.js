// 5x3 Slot Machine Implementation (Plain JS)
(function(){
if (window.__SLOT_INITED__) { console.warn('Slot machine already initialized.'); return; }
window.__SLOT_INITED__ = true;

// Base paytable expanded to 8 symbols (A-H). Payouts will be scaled dynamically to target ~95% RTP.
let SYMBOLS = [
  // Common / low-tier symbols (higher weight, lower base payouts)
  { key: 'A', weight: 30, payout3: 2,  payout4: 6,  payout5: 20, emoji: '🔔' },
  { key: 'B', weight: 40, payout3: 2,  payout4: 6,  payout5: 18, emoji: '🍒' },
  { key: 'C', weight: 55, payout3: 2,  payout4: 5,  payout5: 12, emoji: '⭐' },
  { key: 'D', weight: 70, payout3: 1,  payout4: 3,  payout5: 8,  emoji: '🍋' },
  // High / rare symbols
  { key: 'E', weight: 10, payout3: 4,  payout4: 20, payout5: 100, emoji: '7️⃣' },
  { key: 'F', weight: 50, payout3: 1,  payout4: 3,  payout5: 9,  emoji: '🍇' },
  { key: 'G', weight: 25, payout3: 2,  payout4: 6,  payout5: 15, emoji: '💎' },
  { key: 'H', weight: 15, payout3: 2,  payout4: 6,  payout5: 18, emoji: '🍀' },
  // Wild symbol: substitutes for any other symbol, has its own high payout when forming a pure line
  { key: 'W', weight: 12, payout3: 6, payout4: 24, payout5: 150, emoji: '🃏', wild: true },
  // Cash symbol: does not form line wins. Displays a random cash value collected by collectors.
  { key: 'X', weight: 14, payout3: 0, payout4: 0, payout5: 0, emoji: '💰', cash: true },
  // Collector symbol: if present anywhere, collects all visible cash symbol values.
  { key: 'Z', weight: 8, payout3: 0, payout4: 0, payout5: 0, emoji: '🧲', collector: true }
  // Scatter symbol triggers free spins when 3+ land anywhere
  ,{ key: 'S', weight: 9, payout3: 0, payout4: 0, payout5: 0, emoji: '🎰', scatter: true }
];

// --- Theoretical RTP calibration (single-bet model) ---
// In this model: player stakes 'bet' once per spin, but payouts for all 20 lines are scaled by full bet.
// Target RTP = 0.95 (95%). We compute current theoretical RTP and scale multipliers.
const TARGET_RTP = 0.95;

function computeTheoreticalRTP(symbols) {
  const totalW = symbols.reduce((s,x)=>s+x.weight,0);
  // Per-line expected value
  let evLine = 0;
  for (const s of symbols) {
  if (s.cash || s.collector || s.scatter) continue; // exclude feature + scatter symbols from base RTP calc
    const p = s.weight / totalW;
    const q = 1 - p;
    const p3exact = Math.pow(p,3) * Math.pow(q,2); // exactly 3
    const p4exact = Math.pow(p,4) * q;              // exactly 4
    const p5 = Math.pow(p,5);                       // exactly 5
    evLine += s.payout3 * p3exact + s.payout4 * p4exact + s.payout5 * p5;
  }
  const lines = 20; // PAYLINES length (defined below but constant here)
  return { evLine, rtp: evLine * lines };
}

function scalePayoutsToTarget(symbols, targetRTP) {
  // First pass: naive uniform scale
  const initial = computeTheoreticalRTP(symbols);
  if (initial.rtp === 0) return { scale: 1, initial, final: initial };
  let scale = targetRTP / initial.rtp;
  for (const s of symbols) {
    s.payout3 = s.payout3 * scale;
    s.payout4 = s.payout4 * scale;
    s.payout5 = s.payout5 * scale;
  }
  // Constraint: low-tier symbols (by weight threshold) must have 3-of-a-kind < 1 * stake.
  // Define low-tier as weight >= 40 (common symbols) OR explicitly keys A-D,F
  const LOW_TIER_KEYS = new Set(['A','B','C','D','F']); // do not include wild
  let adjusted = false;
  for (const s of symbols) {
    if (LOW_TIER_KEYS.has(s.key) && s.payout3 >= 1) { s.payout3 = 0.9; adjusted = true; }
  }
  // If we capped anything, re-solve scale for remaining payouts to reach target RTP by proportionally scaling ALL payouts again
  if (adjusted) {
    // Freeze capped payout3 values (treat them as fixed) and scale others.
    let infoAfterCap = computeTheoreticalRTP(symbols);
    // If still above/below target, apply a fine-tune scaling only to non-capped payouts.
    const attemptLimit = 8;
    let iter = 0;
    while (Math.abs(infoAfterCap.rtp - targetRTP) > 0.0005 && iter < attemptLimit) {
      const needed = targetRTP / infoAfterCap.rtp;
      for (const s of symbols) {
        // Do not rescale capped payout3 if it is exactly 0.9 from cap.
        if (LOW_TIER_KEYS.has(s.key) && Math.abs(s.payout3 - 0.9) < 1e-9) {
          // leave payout3; scale higher hits and high-tier full set
          s.payout4 *= needed;
          s.payout5 *= needed;
        } else {
          s.payout3 *= needed;
          s.payout4 *= needed;
          s.payout5 *= needed;
        }
      }
      infoAfterCap = computeTheoreticalRTP(symbols);
      iter++;
    }
    const final = infoAfterCap;
    // Round for presentation
    for (const s of symbols) {
      s.payout3 = +s.payout3.toFixed(3);
      s.payout4 = +s.payout4.toFixed(3);
      s.payout5 = +s.payout5.toFixed(3);
    }
    return { scale, initial, final };
  }
  const final = computeTheoreticalRTP(symbols);
  for (const s of symbols) {
    s.payout3 = +s.payout3.toFixed(3);
    s.payout4 = +s.payout4.toFixed(3);
    s.payout5 = +s.payout5.toFixed(3);
  }
  return { scale, initial, final };
}

const _rtpCalibration = scalePayoutsToTarget(SYMBOLS, TARGET_RTP);
console.log('[RTP Calib] Initial RTP:', _rtpCalibration.initial?.rtp?.toFixed(6), 'Scale:', _rtpCalibration.scale.toFixed(6), 'Final RTP:', _rtpCalibration.final.rtp.toFixed(6));
console.table(SYMBOLS.map(s=>({key:s.key, weight:s.weight, p3:s.payout3, p4:s.payout4, p5:s.payout5})));

const REELS = 5;
const ROWS = 3;
// Fixed reel strips (traditional slot). Each reel is a cyclic sequence of symbol keys.
// Distribution roughly mirrors earlier weight tendencies while introducing per-reel variation.
// stopIndex chosen for a reel corresponds to the TOP visible symbol; next two advance downward.
const REEL_STRIPS = [
  // Reel 1 (length 48)
  ['D','C','A','B','X','D','F','G','D','B','C','D','A','F','H','D','C','B','W','D','C','A','B','D','F','Z','D','C','E','B','F','D','C','A','G','D','B','C','F','D','H','C','B','D','X','C','F','D','S','D'],
  // Reel 2
  ['C','D','B','F','C','A','D','G','C','B','D','F','C','A','D','H','C','B','D','F','C','A','D','X','C','B','D','F','C','A','D','G','C','B','D','F','C','A','D','W','C','B','D','F','Z','A','E','D','S'],
  // Reel 3
  ['B','D','C','F','B','A','D','C','B','F','D','C','B','A','D','C','B','F','D','C','B','A','D','G','B','F','D','C','B','A','D','C','B','F','D','H','B','A','D','C','B','F','W','C','Z','X','E','C','S'],
  // Reel 4
  ['C','D','A','B','C','F','D','A','C','B','D','F','C','A','D','B','C','F','D','A','C','B','D','F','C','A','D','B','C','F','D','A','C','B','D','G','C','F','D','A','C','B','D','H','C','F','Z','X','S'],
  // Reel 5
  ['D','C','B','F','D','A','C','B','D','F','C','B','D','A','C','B','D','F','C','B','D','A','C','B','D','F','C','B','D','A','C','B','D','F','C','B','D','A','C','B','D','F','W','B','Z','X','E','G','S']
];
// 20-line layout (common style). Each array has 5 entries (row index per reel 0..ROWS-1)
const PAYLINES = [
  [0,0,0,0,0], // 1 Top
  [1,1,1,1,1], // 2 Middle
  [2,2,2,2,2], // 3 Bottom
  [0,1,2,1,0], // 4 V down-up
  [2,1,0,1,2], // 5 V up-down
  [0,0,1,0,0], // 6 small dip
  [2,2,1,2,2], // 7 small rise
  [1,0,0,0,1], // 8 upper corners
  [1,2,2,2,1], // 9 lower corners
  [0,1,1,1,0], //10 top-mid band
  [2,1,1,1,2], //11 bottom-mid band
  [1,0,1,2,1], //12 zig zag down
  [1,2,1,0,1], //13 zig zag up
  [0,1,0,1,0], //14 saw top-mid
  [2,1,2,1,2], //15 saw bottom-mid
  [0,2,0,2,0], //16 alternating extremes
  [2,0,2,0,2], //17 inverted extremes
  [1,0,2,0,1], //18 hourglass tall
  [1,2,0,2,1], //19 hourglass inverted
  [0,2,1,2,0]  //20 crown shape
];


function spinOnce() {
  // Choose a stop index per reel referencing REEL_STRIPS. The stop index is the top (row0) symbol.
  const stopIndices = [];
  const rows = Array.from({length: ROWS}, ()=> Array(REELS).fill(null));
  const cashValues = Array.from({length: ROWS}, ()=> Array(REELS).fill(null));
  for (let c=0; c<REELS; c++) {
    const strip = REEL_STRIPS[c];
    const stop = Math.floor(Math.random() * strip.length);
    stopIndices[c] = stop;
    for (let r=0; r<ROWS; r++) {
      const sym = strip[(stop + r) % strip.length];
      rows[r][c] = sym;
      if (sym === 'X') {
        cashValues[r][c] = generateCashValue();
      }
    }
  }
  return { rows, cashValues, stopIndices };
}

// Weighted random cash values (common low values, occasional high hit)
const CASH_VALUE_TABLE = [5,5,5,10,10,15,15,20,25,50];
function generateCashValue(){
  return CASH_VALUE_TABLE[Math.floor(Math.random()*CASH_VALUE_TABLE.length)];
}

function evaluate(resultObj, bet) {
  const grid = resultObj.rows;
  const lineWins = [];
  let total = 0;
  const symbolMap = Object.fromEntries(SYMBOLS.map(s=>[s.key,s]));
  let featurePayout = 0;
  let collectorsPresent = false;
  let rawCashTotal = 0; // sum of cash symbol face values (before collector)
  let scatterCount = 0;
  for (let i=0; i<PAYLINES.length; i++) {
    const pattern = PAYLINES[i];
    // Collect first 5 symbols along this line
    const lineSymbols = [];
    for (let col=0; col<REELS; col++) {
      const rowIndex = pattern[col];
      lineSymbols.push(grid[rowIndex][col]);
    }
    // Determine max consecutive from reel 0 including wild substitutions.
    // Approach: for k from 5 down to 3, see if there exists a base symbol (non-wild) or pure wild that can fill first k positions.
    let awarded = false;
    for (let k=5; k>=3 && !awarded; k--) {
      // Slice first k symbols
      const slice = lineSymbols.slice(0,k);
      // Count wilds and candidate non-wild symbols
      const wilds = slice.filter(s=>symbolMap[s]?.wild).length;
      // If all wilds, treat as wild line
      if (wilds === k) {
        const wDef = symbolMap['W'];
        const mult = k===3? wDef.payout3 : k===4? wDef.payout4 : wDef.payout5;
        const win = mult * bet;
        total += win;
        lineWins.push({ line: i, symbol: 'W', count: k, win, wildSub:true });
        awarded = true;
        break;
      }
      // Consider each distinct non-wild symbol present in slice as candidate base symbol
      const baseCandidates = Array.from(new Set(slice.filter(s=>!symbolMap[s]?.wild)));
      for (const base of baseCandidates) {
        const needed = slice.filter(s=> s===base || symbolMap[s]?.wild).length;
        if (needed === k) {
          const def = symbolMap[base];
          if (def?.scatter) continue; // scatter does not create line wins
          const mult = k===3? def.payout3 : k===4? def.payout4 : def.payout5;
          const win = mult * bet;
          total += win;
          lineWins.push({ line: i, symbol: base, count: k, win, wildSub: wilds>0 });
          awarded = true;
          break;
        }
      }
    }
  }
  // Feature: Cash Collector
  // If any collector symbol (Z) appears anywhere in visible window, collect all visible cash values.
  // Visible window is rows 0..ROWS-1 for each reel as stored in grid.
  for (let r=0; r<ROWS; r++) {
    for (let c=0; c<REELS; c++) {
      if (grid[r][c] === 'Z') collectorsPresent = true;
    }
  }
  if (collectorsPresent) {
    for (let r=0; r<ROWS; r++) {
      for (let c=0; c<REELS; c++) {
        if (grid[r][c] === 'X') {
          const val = resultObj.cashValues[r][c];
          // Feature payout: use raw face value (not multiplied by bet) for clarity matching displayed badge
          if (val) featurePayout += val; 
        }
      }
    }
    total += featurePayout;
  } else {
    // Track raw cash values (not awarded) for debug transparency
    for (let r=0; r<ROWS; r++) {
      for (let c=0; c<REELS; c++) {
        if (grid[r][c] === 'X') {
          const val = resultObj.cashValues[r][c];
          if (val) rawCashTotal += val; // raw value (no bet)
        }
      }
    }
  }
  // Count scatters anywhere
  for (let r=0; r<ROWS; r++) {
    for (let c=0; c<REELS; c++) {
      if (grid[r][c] === 'S') scatterCount++;
    }
  }
  return { grid, payout: total, lineWins, featurePayout, collectorsPresent, cashValues: resultObj.cashValues, rawCashTotal, scatterCount };
}

// DOM references
const slotEl = document.getElementById('slot');
const balanceEl = document.getElementById('balance');
const betEl = document.getElementById('bet');
const lastWinEl = document.getElementById('lastWin');
const logEl = document.getElementById('log');
const spinBtn = document.getElementById('spinBtn');
const betDownBtn = document.getElementById('betDown');
const betUpBtn = document.getElementById('betUp');
const autoBtn = document.getElementById('autoBtn');
const forceCollectorBtn = document.getElementById('forceCollector');
const forceScatterBtn = document.getElementById('forceScatter');
const forceTwoScattersBtn = document.getElementById('forceTwoScatters');
const simulateRTPBtn = document.getElementById('simulateRTP');
const linesCanvas = document.getElementById('lines');
let linesCtx = linesCanvas ? linesCanvas.getContext('2d') : null;

// Basic element existence validation
const required = { slotEl, balanceEl, betEl, lastWinEl, logEl, spinBtn, betDownBtn, betUpBtn, autoBtn };
for (const [k,v] of Object.entries(required)) {
  if (!v) {
    console.error('Slot init failed: missing element', k);
    return;
  }
}

let balance = 1000;
let bet = 1;
let auto = false;
let spinning = false;
let freeSpinsRemaining = 0; // remaining free spins
let scatterProgress = 0; // cumulative scatters from spins with <3 scatters (persistent)
try { const saved = localStorage.getItem('scatterProgress'); if (saved!=null) scatterProgress = Math.min(10, Math.max(0, parseInt(saved)||0)); } catch(_e) {}

function formatMoney(v) {
  // Display as pounds sterling with two decimals; strip trailing .00 for integers
  const fixed = v.toFixed(2);
  return '£' + (fixed.endsWith('.00') ? fixed.slice(0, -3) : fixed);
}
function setBalance(v) { balance = v; balanceEl.textContent = formatMoney(balance); }
function setBet(v) { bet = Math.max(1, Math.min(100, v)); betEl.textContent = formatMoney(bet); }
function setFreeSpins(v){ freeSpinsRemaining = v; updateFreeSpinsDisplay(); }
function updateFreeSpinsDisplay(){
  let el = document.getElementById('freeSpins');
  if (!el) {
    el = document.createElement('div');
    el.id = 'freeSpins';
    el.style.marginLeft='auto';
    el.style.fontWeight='700';
    el.style.color='#ffd85a';
    const bar = document.querySelector('.status-bar');
    if (bar) bar.appendChild(el);
  }
  if (freeSpinsRemaining>0) { el.textContent=`Free Spins: ${freeSpinsRemaining}`; el.style.display='block'; }
  else { el.textContent=''; el.style.display='none'; }
}

function createReels() {
  // Preserve existing lines canvas if present
  const existingCanvas = document.getElementById('lines');
  ensureScatterProgressBar();
  slotEl.innerHTML = '';
  for (let c=0; c<REELS; c++) {
    const reel = document.createElement('div');
    reel.className = 'reel';
    const inner = document.createElement('div');
    inner.className = 'symbols';
    for (let r=0; r<ROWS+6; r++) {
      const def = SYMBOLS[(r + c) % SYMBOLS.length];
      const sDiv = document.createElement('div');
      // Ensure feature symbol classes also present in the initial placeholder set
      let baseCls = 'symbol';
      if (def.wild) baseCls += ' wild';
      if (def.cash) baseCls += ' cash-symbol';
      if (def.collector) baseCls += ' collector-symbol';
  if (def.scatter) baseCls += ' scatter-symbol';
      sDiv.className = baseCls;
      sDiv.textContent = def.emoji;
      inner.appendChild(sDiv);
    }
    reel.appendChild(inner);
    slotEl.appendChild(reel);
  }
  if (existingCanvas) {
    slotEl.appendChild(existingCanvas); // re-append overlay on top
    // ensure canvas dimension attributes match expected logical pixels
    existingCanvas.width = 120*5 + 12*4; // 720
    existingCanvas.height = 120*3; // 360
  }
}

function ensureScatterProgressBar(){
  let bar = document.getElementById('scatterProgressBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'scatterProgressBar';
    bar.style.display='flex';
    bar.style.alignItems='center';
    bar.style.gap='10px';
    bar.style.margin='10px 0 8px';
    bar.style.font='600 14px system-ui';
    const outer = document.createElement('div');
    outer.style.flex='1';
    outer.style.height='14px';
    outer.style.background='#1d2732';
    outer.style.border='1px solid #394a5d';
    outer.style.borderRadius='8px';
    outer.style.position='relative';
    const fill = document.createElement('div');
    fill.id='scatterProgressFill';
    fill.style.height='100%';
    fill.style.width='0%';
    fill.style.background='linear-gradient(90deg,#ff9f1a,#ffd85a)';
    fill.style.borderRadius='7px';
    fill.style.boxShadow='0 0 6px rgba(255,159,26,0.6)';
    fill.style.transition='width .4s cubic-bezier(.25,.8,.3,1)';
    outer.appendChild(fill);
    const label = document.createElement('div');
    label.id='scatterProgressLabel';
    label.textContent='0/10';
    label.style.minWidth='60px';
    label.style.textAlign='right';
    bar.appendChild(outer);
    bar.appendChild(label);
    slotEl.parentElement.insertBefore(bar, slotEl); // above reels
  }
  updateScatterProgressBar();
}

function setScatterProgress(v){
  scatterProgress = Math.min(10, Math.max(0, v));
  try { localStorage.setItem('scatterProgress', scatterProgress.toString()); } catch(_e) {}
  updateScatterProgressBar();
}

function updateScatterProgressBar(){
  const fill = document.getElementById('scatterProgressFill');
  const label = document.getElementById('scatterProgressLabel');
  if (!fill || !label) return;
  fill.style.width = ((scatterProgress/10)*100).toFixed(1)+'%';
  label.textContent = `${scatterProgress}/10`;
  fill.style.filter = scatterProgress>=10? 'brightness(1.15) drop-shadow(0 0 6px #ff9f1a)' : 'none';
}

createReels();

function highlightWins(result) {
  const reels = Array.from(slotEl.getElementsByClassName('reel'));
  // Track winning positions for quick lookup
  const winningPositions = new Set(); // key: `${col}:${row}`
  result.lineWins.forEach(w => {
    const linePattern = PAYLINES[w.line];
    for (let c=0; c<w.count; c++) {
      const rowIdx = linePattern[c];
      const reel = reels[c];
      const inner = reel.querySelector('.symbols');
  const finalCells = Array.from(inner.querySelectorAll('[data-final-row]')).sort((a,b)=>+a.getAttribute('data-final-row')-+b.getAttribute('data-final-row'));
      const cell = finalCells[rowIdx];
      if (cell) cell.classList.add('winning');
      winningPositions.add(`${c}:${rowIdx}`);
    }
  });
  // Dim all non-winning visible symbols (only final ROWS per reel)
  reels.forEach((reel, col) => {
    const inner = reel.querySelector('.symbols');
  const finalCells = Array.from(inner.querySelectorAll('[data-final-row]')).sort((a,b)=>+a.getAttribute('data-final-row')-+b.getAttribute('data-final-row'));
    for (let r=0; r<ROWS; r++) {
      const cell = finalCells[r];
      if (!cell) continue;
      const symKey = result.grid[r][col];
        const isFeature = symKey === 'X' || symKey === 'Z' || symKey === 'S';
      if (!winningPositions.has(`${col}:${r}`) && cell && !isFeature) {
        cell.classList.add('dimmed');
      }
      if (symKey === 'Z') {
        cell.classList.add('collector-symbol');
      }
    }
  });
  // Add cash value badges for any cash symbols (X) if feature present or always show
  reels.forEach((reel, col) => {
    const inner = reel.querySelector('.symbols');
  const finalCells = Array.from(inner.querySelectorAll('[data-final-row]')).sort((a,b)=>+a.getAttribute('data-final-row')-+b.getAttribute('data-final-row'));
    for (let r=0; r<ROWS; r++) {
      const cell = finalCells[r];
      if (!cell) continue;
      const symKey = result.grid[r][col];
      if (symKey === 'X') {
        const val = result.cashValues?.[r]?.[col];
        if (val != null) {
          const badge = document.createElement('div');
          badge.textContent = formatMoney(val);
          badge.style.position='absolute';
          badge.style.bottom='6px';
          badge.style.right='6px';
          badge.style.padding='2px 6px';
          badge.style.font='11px system-ui';
          badge.style.background='rgba(255,215,64,0.9)';
          badge.style.color='#222';
          badge.style.borderRadius='4px';
          badge.style.boxShadow='0 0 4px rgba(0,0,0,0.6)';
          badge.style.pointerEvents='none';
          badge.className='cash-badge';
          cell.style.position='relative';
          // Remove old badge if reusing DOM (safety)
          const old = cell.querySelector('.cash-badge'); if (old) old.remove();
          cell.appendChild(badge);
          if (result.collectorsPresent) cell.classList.add('cash-collected');
        }
      }
    }
  });
  // If collector present and feature payout > 0, show a transient banner
  if (result.collectorsPresent && result.featurePayout > 0) {
    const banner = document.createElement('div');
    banner.textContent = `Cash Collect: +${formatMoney(result.featurePayout)}`;
    banner.style.position='absolute';
    banner.style.top='8px';
    banner.style.left='50%';
    banner.style.transform='translateX(-50%)';
    banner.style.background='linear-gradient(90deg,#ffe76a,#ffc400)';
    banner.style.padding='6px 14px';
    banner.style.font='bold 16px system-ui';
    banner.style.color='#222';
    banner.style.borderRadius='30px';
    banner.style.boxShadow='0 0 10px rgba(0,0,0,0.4)';
    banner.style.zIndex='50';
    banner.style.opacity='0';
    banner.style.transition='opacity .25s ease-out, transform .25s ease-out';
    document.getElementById('slot').appendChild(banner);
    requestAnimationFrame(()=>{
      banner.style.opacity='1';
      banner.style.transform='translateX(-50%) translateY(0)';
    });
    setTimeout(()=>{
      banner.style.opacity='0';
      banner.style.transform='translateX(-50%) translateY(-10px)';
      setTimeout(()=> banner.remove(), 400);
    }, 2600);
  }
}

function clearWinLines() {
  if (!linesCtx || !linesCanvas) return;
  linesCtx.clearRect(0,0,linesCanvas.width, linesCanvas.height);
}

function drawWinLines(result) {
  if (!linesCtx || !linesCanvas) return;
  clearWinLines();
  result.lineWins.forEach(win => {
    const pattern = PAYLINES[win.line];
    const color = lineColor(win.line);
    linesCtx.strokeStyle = color;
    linesCtx.lineWidth = 4;
    linesCtx.lineJoin = 'round';
    linesCtx.lineCap = 'round';
    linesCtx.beginPath();
    for (let c=0; c<win.count; c++) {
      const row = pattern[c];
      const x = c * (120 + 12) + 60; // reel center
      const y = row * 120 + 60; // row center
      if (c === 0) linesCtx.moveTo(x, y); else linesCtx.lineTo(x, y);
    }
    linesCtx.stroke();
    for (let c=0; c<win.count; c++) {
      const row = pattern[c];
      const x = c * (120 + 12) + 60;
      const y = row * 120 + 60;
      linesCtx.fillStyle = color;
      linesCtx.beginPath();
      linesCtx.arc(x, y, 7, 0, Math.PI*2);
      linesCtx.fill();
    }
  });
}

function lineColor(i) {
  const palette = ['#ff4d4d','#ffc94d','#4dff6e','#4dc4ff','#b84dff','#ff7ab8','#9cff4d','#ffb24d','#4dffe3','#ff4de2'];
  return palette[i % palette.length];
}

function spin() {
  if (spinning) return; if (freeSpinsRemaining <= 0 && balance < bet) { log('Insufficient balance'); return; }
  const wasInFreeSpins = freeSpinsRemaining > 0; // track for end-of-round reset
  spinning = true;
  if (freeSpinsRemaining > 0) {
    setFreeSpins(freeSpinsRemaining - 1);
    log(`Free Spin (${freeSpinsRemaining-1} left after this)`);
  } else {
    setBalance(balance - bet);
  }
  disableUI(true);
  clearWinHighlights();
  clearWinLines();
  const spinData = spinOnce(); // precompute final grid + cash values + stop indices
  // If force-collector debug active (button was recently clicked), mutate spinData
  if (forceCollectorBtn && forceCollectorBtn.dataset.active === '1') {
    // Guarantee at least one collector and two cash symbols
    // Place collector at bottom middle, cash at bottom col1 & col3 if not already
    const rCollector = 2, cCollector = 2;
    spinData.rows[rCollector][cCollector] = 'Z';
    const cashSlots = [ [2,1],[2,3] ];
    cashSlots.forEach(([rr,cc]) => { spinData.rows[rr][cc] = 'X'; });
    // Rebuild cashValues for forced cash symbols if needed
    spinData.cashValues[rCollector][cCollector] = null; // collector never has cash value
    cashSlots.forEach(([rr,cc]) => {
      spinData.cashValues[rr][cc] = generateCashValue();
    });
    // Recompute stop indices so that the 3 visible symbols per reel match an actual successive triple on the strip.
    for (let c=0; c<REELS; c++) {
      const strip = REEL_STRIPS[c];
      const wantTop = spinData.rows[0][c];
      const wantMid = spinData.rows[1][c];
      const wantBot = spinData.rows[2][c];
      let found = -1;
      for (let s=0; s<strip.length; s++) {
        const a = strip[s];
        const b = strip[(s+1)%strip.length];
        const d = strip[(s+2)%strip.length];
        if (a===wantTop && b===wantMid && d===wantBot) { found = s; break; }
      }
      if (found >= 0) {
        spinData.stopIndices[c] = found;
      } else {
        // Fallback: adjust grid to match strip starting at existing stopIndices[c]
        const base = spinData.stopIndices[c];
        for (let r=0; r<ROWS; r++) {
          const sym = strip[(base + r) % strip.length];
          spinData.rows[r][c] = sym;
          if (sym === 'X' && spinData.cashValues[r][c] == null) {
            spinData.cashValues[r][c] = generateCashValue();
          } else if (sym !== 'X') {
            spinData.cashValues[r][c] = null;
          }
        }
      }
    }
    console.debug('[Force Collector Applied]', JSON.stringify(spinData.rows), JSON.stringify(spinData.cashValues));
    // One-shot activation reset
    delete forceCollectorBtn.dataset.active;
  }
  // Force scatter debug (guarantee exactly 3 scatters across first 3 reels)
  if (forceScatterBtn && forceScatterBtn.dataset.active === '1') {
    for (let c=0; c<3; c++) {
      const strip = REEL_STRIPS[c];
      const scatterPositions = [];
      for (let i=0; i<strip.length; i++) if (strip[i] === 'S') scatterPositions.push(i);
      if (scatterPositions.length) {
        const p = scatterPositions[0]; // choose first occurrence
        spinData.stopIndices[c] = p; // S will appear as top row
        for (let r=0; r<ROWS; r++) {
          const sym = strip[(p + r) % strip.length];
          spinData.rows[r][c] = sym;
          if (sym === 'X') spinData.cashValues[r][c] = generateCashValue(); else spinData.cashValues[r][c] = null;
        }
      }
    }
    console.debug('[Force Scatter Applied]', JSON.stringify(spinData.rows));
    delete forceScatterBtn.dataset.active;
  }
  // Force TWO scatters (guarantee exactly 2 scatters on reels 1 & 2 top position)
  if (forceTwoScattersBtn && forceTwoScattersBtn.dataset.active === '1') {
    for (let c=0; c<2; c++) {
      const strip = REEL_STRIPS[c];
      const pos = strip.indexOf('S');
      if (pos >= 0) {
        spinData.stopIndices[c] = pos;
        for (let r=0; r<ROWS; r++) {
          const sym = strip[(pos + r) % strip.length];
          spinData.rows[r][c] = sym;
          if (sym === 'X') spinData.cashValues[r][c] = generateCashValue(); else spinData.cashValues[r][c] = null;
        }
      }
    }
    console.debug('[Force Two Scatters Applied]', JSON.stringify(spinData.rows));
    delete forceTwoScattersBtn.dataset.active;
  }
  const result = evaluate(spinData, bet);
  console.debug('[Scatter Count]', result.scatterCount);
  // Debug: log raw grid + cash values structure for troubleshooting feature symbols
  console.debug('[Spin Grid]', JSON.stringify(result.grid));
  console.debug('[Cash Values]', JSON.stringify(result.cashValues));
  animateReels(result, spinData.stopIndices).then(() => {
    verifyFinalWindow(result);
    highlightWins(result);
    drawWinLines(result);
    // Apply pulse animation to newly landed wild symbols
    try {
      const reelsAfter = Array.from(slotEl.getElementsByClassName('reel'));
      reelsAfter.forEach(reel => {
        const inner = reel.querySelector('.symbols');
        // Remove any previous wild-landed markers
        inner.querySelectorAll('.wild-landed').forEach(el => el.classList.remove('wild-landed'));
  // Use tagged final visible symbols
  const finalCells = Array.from(inner.querySelectorAll('[data-final-row]')).sort((a,b)=>+a.getAttribute('data-final-row')-+b.getAttribute('data-final-row'));
        finalCells.forEach(cell => {
          if (cell.classList.contains('wild')) {
            // Force reflow to allow retrigger if class was present recently
            cell.classList.remove('wild-landed');
            void cell.offsetWidth;
            cell.classList.add('wild-landed');
          }
        });
      });
    } catch(e) { console.warn('Wild pulse error', e); }
    const finishPayout = () => {
      setBalance(balance + result.payout);
      lastWinEl.textContent = formatMoney(result.payout);
      log(formatResultLog(result));
      if (result.scatterCount >= 3) {
        const awarded = 4; // base free spins per trigger
        setFreeSpins(freeSpinsRemaining + awarded);
        showScatterBanner(awarded, result.scatterCount);
        log(`Bonus Triggered: ${result.scatterCount} Scatters -> +${awarded} Free Spins`);
        // Reset progress bar AFTER free spins round completes; mark intent
        finishPayout._triggeredBonusFromScatterCount = true;
      } else if (!wasInFreeSpins && result.scatterCount > 0) {
        // Accumulate scatters only when <3 and not in free spins
        const newTotal = scatterProgress + result.scatterCount;
        if (newTotal >= 10) {
          setScatterProgress(10);
          const awarded = 4;
          setFreeSpins(freeSpinsRemaining + awarded);
          showScatterBanner(awarded, 10);
          log(`Bonus Triggered: Progress Bar Filled (10 scatters) -> +${awarded} Free Spins`);
          finishPayout._triggeredBonusFromProgress = true;
        } else {
          setScatterProgress(newTotal);
          log(`Scatter Progress: +${result.scatterCount} (now ${newTotal}/10)`);
        }
      }
      spinning = false;
      disableUI(false);
      // Toggle free spins visual theme
      const slotRoot = document.getElementById('slot');
      if (slotRoot) {
        if (freeSpinsRemaining > 0) slotRoot.classList.add('in-free-spins'); else slotRoot.classList.remove('in-free-spins');
      }
      // If we just ended a free spins round this spin (were in free spins before spin, now 0 remaining) => reset progress bar
      if (wasInFreeSpins && freeSpinsRemaining === 0) {
        setScatterProgress(0);
        log('Free Spins complete. Scatter progress reset to 0/10');
      }
      // Also reset if round triggered and immediately finished (edge case: awarded spins but autoplay off and user stops later handled by above when consumed)
      if (auto && (freeSpinsRemaining > 0 || balance >= bet)) setTimeout(spin, 600);
    };
    if (result.collectorsPresent && result.featurePayout > 0) {
      animateCashCollect(result).then(finishPayout);
    } else {
      finishPayout();
    }
  });
}

function animateReels(result, stopIndices) {
  // Strip-driven animation: we build a scrolling list of actual strip symbols so the visual order matches reel strips.
  const reels = Array.from(slotEl.getElementsByClassName('reel'));
  const symbolHeight = 120;
  const baseDuration = 2000;
  const stagger = 220;
  const accelPortion = 0.22;
  const decelPortion = 0.36;
  const overshoot = 20;
  const baseCycles = 2; // full extra rotations before settling
  return Promise.all(reels.map((reel, idx) => {
    const inner = reel.querySelector('.symbols');
    inner.style.transition = 'none';
    inner.innerHTML = '';
    inner.classList.add('spinning-phase');
    const strip = REEL_STRIPS[idx];
    const stop = stopIndices[idx]; // top symbol index for final window
    const cycles = baseCycles + idx; // full rotations before landing
    // We generate: (cycles * strip.length) pre-rotation symbols + stop symbols before the stop index + ROWS final window symbols
    const preWindowCount = cycles * strip.length + stop; // number of symbols BEFORE final window
    const totalToGenerate = preWindowCount + ROWS; // ensure last ROWS are the landing window
    const startIndex = (stop - preWindowCount + strip.length * 1000) % strip.length; // starting strip index
    const sequence = [];
    for (let i=0; i<totalToGenerate; i++) {
      const symKey = strip[(startIndex + i) % strip.length];
      const sym = SYMBOLS.find(s=>s.key===symKey) || {emoji: symKey};
      const div = document.createElement('div');
      let cls = 'symbol';
      if (sym.wild) cls += ' wild';
      if (sym.cash) cls += ' cash-symbol';
      if (sym.collector) cls += ' collector-symbol';
  if (sym.scatter) cls += ' scatter-symbol';
  if (sym.scatter) cls += ' scatter-symbol';
      div.className = cls;
      div.textContent = sym.emoji;
      inner.appendChild(div);
      sequence.push(div);
    }
    const totalSymbols = sequence.length;
    const finalOffset = -symbolHeight * (totalSymbols - ROWS); // so last ROWS elements are visible
    const startOffset = 0; // start at 0 showing earliest built symbols
    inner.style.transform = `translateY(${startOffset}px)`;
    return new Promise(res => {
      const startTime = performance.now() + idx * stagger;
      const duration = baseDuration + idx * 340;
      function easeOutCubic(t){ return 1 - Math.pow(1-t,3); }
      function easeInCubic(t){ return t*t*t; }
      function frame(now) {
        if (now < startTime) { requestAnimationFrame(frame); return; }
        const t = Math.min(1, (now - startTime) / duration);
        let eased;
        if (t < accelPortion) {
          const p = t/accelPortion; eased = easeInCubic(p) * accelPortion;
        } else if (t > 1 - decelPortion) {
          const p = (t - (1 - decelPortion)) / decelPortion; eased = (1 - decelPortion) + easeOutCubic(p) * decelPortion;
        } else {
          eased = t;
        }
        const current = startOffset + (finalOffset - startOffset) * eased;
        inner.style.transform = `translateY(${current}px)`;
        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          // Bounce settle
          inner.style.transition = 'transform 160ms cubic-bezier(.3,.7,.4,1)';
          inner.style.transform = `translateY(${finalOffset + overshoot}px)`;
          setTimeout(()=>{
            inner.style.transition = 'transform 130ms cubic-bezier(.25,.55,.35,1)';
            inner.style.transform = `translateY(${finalOffset}px)`;
            setTimeout(()=>{ 
              inner.classList.remove('spinning-phase');
              // Tag final visible symbols for reliable downstream selection
              inner.querySelectorAll('[data-final-row]').forEach(el=>el.removeAttribute('data-final-row'));
              const children = Array.from(inner.children);
              const finalSlice = children.slice(-ROWS);
              finalSlice.forEach((el, rIdx) => el.setAttribute('data-final-row', rIdx));
              res();
            }, 140);
          }, 170);
        }
      }
      requestAnimationFrame(frame);
    });
  })).then(()=>{});
}

// Animate cash values flying from each cash symbol (X) to the first collector symbol encountered
function animateCashCollect(result) {
  return new Promise(resolve => {
    try {
      const slotRect = slotEl.getBoundingClientRect();
      // Gather collector targets (use first for now)
      const collectorEls = Array.from(slotEl.querySelectorAll('.collector-symbol[data-final-row]'));
      if (!collectorEls.length) { resolve(); return; }
      const target = collectorEls[0];
      const tRect = target.getBoundingClientRect();
      const tx = tRect.left + tRect.width/2 - slotRect.left;
      const ty = tRect.top + tRect.height/2 - slotRect.top;
      const cashCells = [];
      Array.from(slotEl.querySelectorAll('.cash-symbol[data-final-row]')).forEach(cell => {
        const valEl = cell.querySelector('.cash-badge');
        if (!valEl) return;
        cashCells.push({cell, val: valEl.textContent});
      });
      if (!cashCells.length) { resolve(); return; }
      // Parse total collected value (strip currency symbol)
      const parseVal = v => parseFloat(v.replace(/[^0-9.]/g,'')) || 0;
      const totalVal = cashCells.reduce((s,x)=> s + parseVal(x.val), 0);
      let remaining = cashCells.length;
      cashCells.forEach((info, idx) => {
        const cRect = info.cell.getBoundingClientRect();
        const sx = cRect.left + cRect.width/2 - slotRect.left;
        const sy = cRect.top + cRect.height/2 - slotRect.top;
        const fly = document.createElement('div');
        fly.className = 'cash-fly';
        fly.textContent = info.val;
        fly.style.left = '0px';
        fly.style.top = '0px';
        fly.style.setProperty('--sx', `${sy}px`); // we will use translate(var(--sx), var(--sy)) but easier to embed full transform values
        fly.style.setProperty('--sy', `${sx}px`);
        fly.style.setProperty('--tx', `${ty}px`);
        fly.style.setProperty('--ty', `${tx}px`);
        // Instead of relying solely on CSS custom properties for order (X/Y swapped earlier), build transform manually in keyframe by mapping variables
        // We'll override with inline animation using dynamic keyframes via offset calculation
        const dx = tx - sx;
        const dy = ty - sy;
        // Use a random slight curve
        const ctrlX = sx + dx * 0.4 + (Math.random()*60 - 30);
        const ctrlY = sy + dy * 0.4 + (Math.random()*40 - 20);
        // We approximate curve with JS rAF instead of dynamic path in CSS for simplicity
        fly.style.transform = `translate(${sx}px,${sy}px) scale(.55)`;
        slotEl.appendChild(fly);
        const duration = 600 + idx*40;
        const start = performance.now();
        function easeOut(t){ return 1 - Math.pow(1-t,3); }
        function frame(now){
          const p = Math.min(1, (now - start)/duration);
          const e = easeOut(p);
          // Quadratic Bezier interpolation
            const x = (1-e)*(1-e)*sx + 2*(1-e)*e*ctrlX + e*e*tx;
            const y = (1-e)*(1-e)*sy + 2*(1-e)*e*ctrlY + e*e*ty;
          fly.style.opacity = p<0.05? (p/0.05) : (p>0.9? (1-p)/0.1 : 1);
          fly.style.transform = `translate(${x}px,${y}px) scale(${0.55 - 0.2*e})`;
          if (p < 1) {
            requestAnimationFrame(frame);
          } else {
            fly.remove();
            remaining--;
            if (remaining === 0) {
              // Pulse collector after all arrive then show total badge
              target.classList.add('collector-pulse-burst');
              setTimeout(()=>{ 
                target.classList.remove('collector-pulse-burst');
                try {
                  // Remove existing badge if present
                  const old = target.querySelector('.collector-total-badge'); if (old) old.remove();
                  const badge = document.createElement('div');
                  badge.className = 'collector-total-badge';
                  badge.textContent = `+£${totalVal}`;
                  target.appendChild(badge);
                } catch(_e){}
                resolve();
              }, 320);
            }
          }
        }
        requestAnimationFrame(frame);
      });
    } catch(e) {
      console.warn('animateCashCollect error', e);
      resolve();
    }
  });
}

// Post-spin verification helper (dev/debug): ensures visual DOM matches logical grid
function verifyFinalWindow(result) {
  try {
    const reels = Array.from(slotEl.getElementsByClassName('reel'));
    const mismatches = [];
    reels.forEach((reel, c) => {
      const inner = reel.querySelector('.symbols');
  const visibleEls = Array.from(inner.querySelectorAll('[data-final-row]')).sort((a,b)=>+a.getAttribute('data-final-row')-+b.getAttribute('data-final-row'));
  const visible = visibleEls.map(el=>el.textContent);
      for (let r=0; r<ROWS; r++) {
        const key = result.grid[r][c];
        const sym = SYMBOLS.find(s=>s.key===key);
        const expectedEmoji = sym?.emoji || key;
        if (visible[r] !== expectedEmoji) {
          mismatches.push({reel:c,row:r,expected:key,expectedEmoji,dom:visible[r]});
        }
      }
    });
    if (mismatches.length) {
      console.warn('[VERIFY] Visible window mismatch', mismatches);
    } else {
      console.debug('[VERIFY] Final window OK');
    }
  } catch(e) { console.warn('verifyFinalWindow error', e); }
}

function disableUI(dis) {
  spinBtn.disabled = dis;
  betDownBtn.disabled = dis;
  betUpBtn.disabled = dis;
  autoBtn.disabled = dis;
}

function clearWinHighlights() {
  Array.from(document.querySelectorAll('.winning')).forEach(el => el.classList.remove('winning'));
  Array.from(document.querySelectorAll('.dimmed')).forEach(el => el.classList.remove('dimmed'));
  Array.from(document.querySelectorAll('.collector-total-badge')).forEach(el => el.remove());
}

function showScatterBanner(awarded, count) {
  const banner = document.createElement('div');
  banner.textContent = `FREE SPINS +${awarded}! (${count} Scatter${count>1?'s':''})`;
  banner.style.position='absolute';
  banner.style.top='50%';
  banner.style.left='50%';
  banner.style.transform='translate(-50%,-50%) scale(.7)';
  banner.style.padding='18px 34px';
  banner.style.font='700 28px system-ui';
  banner.style.letterSpacing='1px';
  banner.style.background='linear-gradient(135deg,#ffdf5b,#ff9f1a)';
  banner.style.color='#222';
  banner.style.borderRadius='40px';
  banner.style.boxShadow='0 0 18px rgba(0,0,0,0.55), 0 0 22px rgba(255,223,91,0.7)';
  banner.style.zIndex='70';
  banner.style.opacity='0';
  banner.style.pointerEvents='none';
  banner.style.transition='opacity .35s ease, transform .4s cubic-bezier(.25,1.4,.35,1)';
  document.getElementById('slot').appendChild(banner);
  requestAnimationFrame(()=>{ banner.style.opacity='1'; banner.style.transform='translate(-50%,-50%) scale(1)'; });
  setTimeout(()=>{ banner.style.opacity='0'; banner.style.transform='translate(-50%,-60%) scale(.85)'; setTimeout(()=>banner.remove(),450); }, 2500);
}

function log(msg) {
  const time = new Date().toLocaleTimeString();
  const p = document.createElement('div');
  p.textContent = `[${time}] ${msg}`;
  logEl.prepend(p);
  while (logEl.children.length > 80) logEl.removeChild(logEl.lastChild);
}

function formatResultLog(r) {
  const parts = [];
  if (r.lineWins.length) {
    parts.push(r.lineWins.map(w=>`${w.symbol}x${w.count}@L${w.line+1}=${formatMoney(w.win)}`).join(', '));
  }
  if (r.collectorsPresent) {
    parts.push(`Cash Collect=${formatMoney(r.featurePayout||0)}`);
  } else if (!r.collectorsPresent && r.rawCashTotal > 0) {
    parts.push(`Uncollected Cash=${formatMoney(r.rawCashTotal)}`);
  }
  if (r.scatterCount) parts.push(`${r.scatterCount} Scatter${r.scatterCount>1?'s':''}${r.scatterCount>=3?' (Bonus)':''}`);
  if (!parts.length) return 'Spin result: No wins.';
  return `Win: ${formatMoney(r.payout)} (${parts.join(' | ')})`;
}

// Monte Carlo RTP simulation (does not touch live UI state).
// Includes: line wins, cash collect, free spin triggers (scatter >=3 or progress fill), progress accumulation.
function simulateRTP(spins=100000, betValue=1) {
  const symbolMap = Object.fromEntries(SYMBOLS.map(s=>[s.key,s]));
  let totalStake = 0;
  let totalReturn = 0;
  let progress = scatterProgress; // start from current persisted progress but do NOT write back
  let freeSpinsQueue = 0;
  let naturalScatterTriggers = 0;
  let progressTriggers = 0;
  let totalFreeSpinsAwarded = 0;
  let freeSpinWins = 0;
  let cashCollectHits = 0;
  let cashCollectTotal = 0;
  function spinOnceInternal() {
    const stopIndices = [];
    const rows = Array.from({length: ROWS}, ()=> Array(REELS).fill(null));
    const cashValues = Array.from({length: ROWS}, ()=> Array(REELS).fill(null));
    for (let c=0; c<REELS; c++) {
      const strip = REEL_STRIPS[c];
      const stop = Math.floor(Math.random() * strip.length);
      stopIndices[c] = stop;
      for (let r=0; r<ROWS; r++) {
        const sym = strip[(stop + r) % strip.length];
        rows[r][c] = sym;
        if (sym === 'X') cashValues[r][c] = CASH_VALUE_TABLE[Math.floor(Math.random()*CASH_VALUE_TABLE.length)];
      }
    }
    return { rows, cashValues, stopIndices };
  }
  function evaluateInternal(resultObj) {
    const grid = resultObj.rows;
    let payout = 0;
    let scatterCount = 0;
    let featurePayout = 0;
    let collectorsPresent = false;
    // Line wins
    for (let i=0; i<PAYLINES.length; i++) {
      const pattern = PAYLINES[i];
      const lineSymbols = [];
      for (let col=0; col<REELS; col++) lineSymbols.push(grid[pattern[col]][col]);
      let awarded = false;
      for (let k=5; k>=3 && !awarded; k--) {
        const slice = lineSymbols.slice(0,k);
        const wilds = slice.filter(s=>symbolMap[s]?.wild).length;
        if (wilds === k) {
          const wDef = symbolMap['W'];
          payout += (k===3? wDef.payout3 : k===4? wDef.payout4 : wDef.payout5) * betValue;
          awarded = true; break;
        }
        const baseCandidates = Array.from(new Set(slice.filter(s=>!symbolMap[s]?.wild)));
        for (const base of baseCandidates) {
          const needed = slice.filter(s=> s===base || symbolMap[s]?.wild).length;
          if (needed === k) {
            const def = symbolMap[base];
            if (def?.scatter || def?.cash || def?.collector) continue;
            payout += (k===3? def.payout3 : k===4? def.payout4 : def.payout5) * betValue;
            awarded = true; break;
          }
        }
      }
    }
    // Collector / Cash
    for (let r=0; r<ROWS; r++) {
      for (let c=0; c<REELS; c++) {
        const sym = grid[r][c];
        if (sym === 'Z') collectorsPresent = true;
        if (sym === 'S') scatterCount++;
      }
    }
    if (collectorsPresent) {
      for (let r=0; r<ROWS; r++) {
        for (let c=0; c<REELS; c++) {
          if (grid[r][c] === 'X') {
            const val = resultObj.cashValues[r][c];
            if (val) featurePayout += val;
          }
        }
      }
      payout += featurePayout;
      if (featurePayout > 0) { cashCollectHits++; cashCollectTotal += featurePayout; }
    }
    return { payout, scatterCount };
  }
  function processPaidSpin() {
    totalStake += betValue; // deduct stake
    const spinData = spinOnceInternal();
    const r = evaluateInternal(spinData);
    totalReturn += r.payout;
    if (r.scatterCount >= 3) {
      naturalScatterTriggers++;
      freeSpinsQueue += 4;
      totalFreeSpinsAwarded += 4;
    } else if (r.scatterCount > 0) {
      // accumulate progress outside free spins
      const newProg = progress + r.scatterCount;
      if (newProg >= 10) {
        progressTriggers++;
        freeSpinsQueue += 4;
        totalFreeSpinsAwarded += 4;
        progress = 0; // reset
      } else {
        progress = newProg;
      }
    }
  }
  function processFreeSpin() {
    const spinData = spinOnceInternal();
    const r = evaluateInternal(spinData);
    totalReturn += r.payout; // no stake deduction
    freeSpinWins += r.payout;
    if (r.scatterCount >= 3) {
      naturalScatterTriggers++;
      freeSpinsQueue += 4;
      totalFreeSpinsAwarded += 4;
    } // no progress accumulation inside free spins when <3
  }
  for (let i=0; i<spins; i++) {
    processPaidSpin();
    while (freeSpinsQueue > 0) {
      freeSpinsQueue--;
      processFreeSpin();
    }
  }
  const rtp = totalReturn / totalStake;
  return {
    spins,
    stake: totalStake,
    return: totalReturn,
    rtp,
    naturalScatterTriggers,
    progressTriggers,
    totalFreeSpinsAwarded,
    avgFreeSpinsPerTrigger: totalFreeSpinsAwarded / (naturalScatterTriggers + progressTriggers || 1),
    cashCollectHits,
    cashCollectTotal,
    avgCashCollect: cashCollectHits? (cashCollectTotal / cashCollectHits) : 0
  };
}

function logSimulation(stats) {
  const rtpPct = (stats.rtp * 100).toFixed(2) + '%';
  log(`Sim RTP (${stats.spins} spins): ${rtpPct} (raw=${stats.rtp.toFixed(4)}) | FreeSpinsAwarded=${stats.totalFreeSpinsAwarded} | Triggers=N:${stats.naturalScatterTriggers} P:${stats.progressTriggers} | AvgFS/Trigger=${stats.avgFreeSpinsPerTrigger.toFixed(2)} | CashCollectAvg=${formatMoney(stats.avgCashCollect)} (${stats.cashCollectHits} hits)`);
}

spinBtn.addEventListener('click', () => spin());
betDownBtn.addEventListener('click', ()=> setBet(bet - 1));
betUpBtn.addEventListener('click', ()=> setBet(bet + 1));
autoBtn.addEventListener('click', () => { auto = !auto; autoBtn.textContent = `Auto: ${auto? 'On':'Off'}`; if (auto && !spinning) spin(); });
if (forceCollectorBtn) {
  forceCollectorBtn.addEventListener('click', () => {
    forceCollectorBtn.dataset.active = '1';
    spin();
  });
}
if (forceScatterBtn) {
  forceScatterBtn.addEventListener('click', () => {
    forceScatterBtn.dataset.active = '1';
    spin();
  });
}
if (forceTwoScattersBtn) {
  forceTwoScattersBtn.addEventListener('click', () => {
    forceTwoScattersBtn.dataset.active = '1';
    spin();
  });
}
if (simulateRTPBtn) {
  simulateRTPBtn.addEventListener('click', () => {
    disableUI(true);
    setTimeout(()=>{
      const stats = simulateRTP(100000, bet); // use current bet as stake baseline
      logSimulation(stats);
      disableUI(false);
    }, 30);
  });
}

window.addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); spin(); }
  if (e.code === 'ArrowUp') setBet(bet + 1);
  if (e.code === 'ArrowDown') setBet(bet - 1);
});

// Initialize displayed monetary values with currency formatting
setBalance(balance);
setBet(bet);
lastWinEl.textContent = formatMoney(0);
log('Ready. Press Space or Spin.');
updateScatterProgressBar();

// Debug overlay
const dbg = document.createElement('div');
dbg.style.position='fixed'; dbg.style.bottom='6px'; dbg.style.right='8px'; dbg.style.background='rgba(0,0,0,0.55)'; dbg.style.padding='4px 8px'; dbg.style.font='12px monospace'; dbg.style.borderRadius='6px'; dbg.style.pointerEvents='none'; dbg.textContent='Slot init OK';
document.body.appendChild(dbg);
setTimeout(()=> dbg.remove(), 4000);

})();
