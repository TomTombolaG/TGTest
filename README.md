# Slot Test 1 - 5x3 Slot Machine

Lightweight HTML/CSS/JavaScript slot machine prototype (5 reels x 3 rows) focused on clarity of maths + features. Originally used independent weighted random symbol picks; it now uses traditional fixed reel strips for authentic spin behaviour.

Current feature set:

- Fixed reel strips (cyclical) powering a strip-driven spin animation
- 20 paylines (horizontal, V, zig‑zag, pattern lines)
- Left‑to‑right contiguous win evaluation (3–5 of a kind) with wild substitution
- Balance, bet, last win, auto‑spin
- Cash (X) & Collector (Z) feature symbols (cash collect mechanic)
- Highlighting of winning symbols + dimming of others, win line overlay canvas
- Wild pulse landing animation & cash value badges
- Cash Collect animation (cash values fly toward collector before crediting)
- Deterministic outcome chosen before animation (no symbol swap after stop)

> Prototype / educational use only – NOT for real-money wagering.

## Running

Open `index.html` directly in a modern browser (no build step required) or serve the folder with a static server for consistent caching behavior.

## Gameplay

- Currency: GBP (£)
- Default balance: £1000
- Default bet: £1 (min £1, max £100)
- Press Spin button or Space to spin
- Increase / decrease bet with buttons or ArrowUp / ArrowDown
- Auto toggle performs repeated spins with a short delay until balance < bet or you toggle it off.

## Symbols & Dynamic Payout Scaling

Base symbol set (A–H plus feature / special symbols W, X, Z). At load a scaling pass still runs that was originally designed for the previous weighted-random model to target ~95% theoretical RTP. Since the game now uses reel strips (fixed discrete frequencies per reel), the printed "theoretical RTP" in the console is an approximation: it assumes independent draws using the historical weights below. Actual RTP with strips will differ slightly (typically a modest shift). A future step is to recompute RTP directly from strip frequencies (see Further Work).

Below are the original unscaled BASE payouts (before auto scaling). The active, scaled values are logged to the console on load.

| Symbol | Emoji | Weight | Base 3 | Base 4 | Base 5 | Notes |
|--------|-------|--------|-------|-------|-------|-------|
| A | 🔔 | 30 | 2 | 6 | 20 | Low-tier |
| B | 🍒 | 40 | 2 | 6 | 18 | Low-tier |
| C | ⭐ | 55 | 2 | 5 | 12 | Low-tier |
| D | 🍋 | 70 | 1 | 3 | 8 | Lowest-tier |
| E | 7️⃣ | 10 | 4 | 20 | 100 | High-tier |
| F | 🍇 | 50 | 1 | 3 | 9 | Mid-tier |
| G | 💎 | 25 | 2 | 6 | 15 | Mid-high |
| H | 🍀 | 15 | 2 | 6 | 18 | High-tier |
| W | 🃏 | 12 | 6 | 24 | 150 | Wild (substitutes) |
| X | 💰 | 14 | 0 | 0 | 0 | Cash (value only) |
| Z | 🧲 | 8 | 0 | 0 | 0 | Collector |

"Weight" column reflects the legacy weighting used for the analytical scaling pass (still executed). With reel strips, actual appearance rates are determined by strip composition (see Reel Strips & Frequencies). For now, the weight-based scaling is retained simply to preserve previously tuned relative payout tiers; it effectively acts as a global multiplier on the table.

Payout for a winning line = (scaled multiplier) * bet (single total bet model).

Low-tier shaping: Common symbols (A, B, C, D, F) have their 3-of-a-kind wins capped below 1× bet (0.9 after scaling) to create frequent small partial returns.

Wild (W): Substitutes for any non-feature base symbol. A pure wild line pays the wild's own (higher) payout. Mixed wild lines pay as the best base symbol achievable.

Cash & Collector Feature:
- Cash symbols (X) each roll a random face value from a weighted set (many small values, rare larger values) and display it directly.
- If any Collector (Z) appears anywhere in the 5×3 window, all visible X values are summed and awarded (face values, not multiplied further by bet) and logged as Cash Collect.
- Without a collector, cash symbols show their values but do not pay (logged as Uncollected Cash for transparency).
- Multiple collectors still only collect once (no extra multiplier) in this prototype.

## Payout Logic

For each of the 20 paylines the engine collects the row index on each reel, producing a 5-symbol sequence. From the leftmost reel it searches for the longest contiguous run (5 down to 3) that can be satisfied either as:
1. Pure wild line (all W)
2. A base symbol line where wilds substitute to complete the run

Only the longest qualifying run per line is awarded. Multiple distinct lines can and do win simultaneously. Feature symbols X and Z do not form line wins.

## Paylines – Visual Examples

Each diagram shows a 5×3 grid (rows Top / Mid / Bot). An `X` marks the row position a payline uses on that reel. Blank cells are shown as `·` for spacing.

```
Reels →   1   2   3   4   5

Line 01: Top      X   X   X   X   X
		  Mid     ·   ·   ·   ·   ·
		  Bot     ·   ·   ·   ·   ·

Line 02: Top      ·   ·   ·   ·   ·
		  Mid     X   X   X   X   X
		  Bot     ·   ·   ·   ·   ·

Line 03: Top      ·   ·   ·   ·   ·
		  Mid     ·   ·   ·   ·   ·
		  Bot     X   X   X   X   X

Line 04: Top      X   ·   ·   ·   X
		  Mid     ·   X   ·   X   ·
		  Bot     ·   ·   X   ·   ·

Line 05: Top      ·   ·   X   ·   ·
		  Mid     ·   X   ·   X   ·
		  Bot     X   ·   ·   ·   X

Line 06: Top      X   X   ·   X   X
		  Mid     ·   ·   X   ·   ·
		  Bot     ·   ·   ·   ·   ·

Line 07: Top      ·   ·   ·   ·   ·
		  Mid     ·   ·   X   ·   ·
		  Bot     X   X   ·   X   X

Line 08: Top      ·   X   X   X   ·
		  Mid     X   ·   ·   ·   X
		  Bot     ·   ·   ·   ·   ·

Line 09: Top      ·   ·   ·   ·   ·
		  Mid     X   ·   ·   ·   X
		  Bot     ·   X   X   X   ·

Line 10: Top      X   ·   ·   ·   X
		  Mid     ·   X   X   X   ·
		  Bot     ·   ·   ·   ·   ·

Line 11: Top      ·   ·   ·   ·   ·
		  Mid     ·   X   X   X   ·
		  Bot     X   ·   ·   ·   X

Line 12: Top      ·   X   ·   ·   ·
		  Mid     X   ·   X   ·   X
		  Bot     ·   ·   ·   X   ·

Line 13: Top      ·   ·   ·   X   ·
		  Mid     X   ·   X   ·   X
		  Bot     ·   X   ·   ·   ·

Line 14: Top      X   ·   X   ·   X
		  Mid     ·   X   ·   X   ·
		  Bot     ·   ·   ·   ·   ·

Line 15: Top      ·   ·   ·   ·   ·
		  Mid     ·   X   ·   X   ·
		  Bot     X   ·   X   ·   X

Line 16: Top      X   ·   X   ·   X
		  Mid     ·   ·   ·   ·   ·
		  Bot     ·   X   ·   X   ·

Line 17: Top      ·   X   ·   X   ·
		  Mid     ·   ·   ·   ·   ·
		  Bot     X   ·   X   ·   X

Line 18: Top      ·   X   ·   X   ·
		  Mid     X   ·   ·   ·   X
		  Bot     ·   ·   X   ·   ·

Line 19: Top      ·   ·   X   ·   ·
		  Mid     X   ·   ·   ·   X
		  Bot     ·   X   ·   X   ·

Line 20: Top      X   ·   ·   ·   X
		  Mid     ·   ·   X   ·   ·
		  Bot     ·   X   ·   X   ·
```

Legend:
- Lines 1–3: Straight horizontal (top, middle, bottom)
- Lines 4–5: Large V / inverted V patterns
- Lines 6–7: Shallow dip / rise
- Lines 8–11: Corner wraps & inner bands
- Lines 12–13: Zig‑zag diagonals
- Lines 14–17: Alternating / saw-tooth style
- Lines 18–20: Hourglass variants & crown pattern

All paylines evaluate strictly from reel 1 to 5; only the left-most contiguous run (3–5) counts, with wild (W) substitution.

## Reel Strips & Frequencies

Each reel now has a fixed ordered strip (cyclic). A spin selects a random stop index per reel; the top, middle, bottom rows display strip positions (stop, stop+1, stop+2). Animation scrolls through several full cycles before settling exactly on the pre-chosen stops (no symbol swap after stop => outcome integrity).

Example (Reel 1) composition (length 48): D×13, C×9, B×7, A×4, F×6, G×2, H×2, W×1, X×2, Z×1, E×1. Other reels intentionally vary distribution to avoid perfect symmetry. This creates natural clustering patterns not present with independent weighted sampling.

Note: The original weight-based RTP scaling is still executed; treat the printed theoretical RTP as indicative only until a strip-frequency-based calculation or simulation is added.

### Why keep the historical weight table?
It preserves earlier tuning of relative payouts and allows quick experimentation. Transitioning fully to strip-driven RTP would involve either: (a) recomputing expected line hit counts via combinatorial traversal of per-reel symbol counts & positions, or (b) Monte Carlo simulation using the strips directly.

## Spin Flow
1. spinOnce(): picks a stop index for each reel (uniform over strip length) and derives the visible 3-row window; assigns random cash values to any X symbols.
2. evaluate(): computes line wins & feature payout deterministically from that grid (no later mutation).
3. animateReels(): builds a DOM sequence representing several full strip rotations plus the final window and performs eased scrolling + bounce.
4. After animation resolves: highlight wins, draw win lines, add cash value badges, log result.

## Debug / Dev Aids
- Console logs full grid & cash values per spin.
- Optional force-collector button ensures at least one collector and two cash symbols for quick feature testing.
- Force-scatters button guarantees 3 scatters on the next spin for bonus testing.
- Wild pulse & collector glow CSS classes make feature outcomes visually distinct.
 - Scatter (🎰) symbol triggers Free Spins: landing 3 or more scatters awards +4 Free Spins (retrigger adds +4 more). Free spins do not deduct the bet; slot background adopts a purple/orange theme while active.

## Code Overview

- `main.js` – symbol definitions, spin generation, evaluation, DOM updates, reel animation. (Originally authored in TypeScript; converted to plain JS for direct browser loading.)
- `index.html` – layout with status bar, slot container, controls.
- `style.css` – layout & animations.

Grid representation stored as `string[][]` with `ROWS` arrays each containing `REELS` symbol keys.

## RTP & Calibration

Current state:
- Single total bet per spin covers all 20 lines.
- Global scaling pass aims for ~95% RTP under legacy independent-weight assumptions.
- Reel strips mean actual RTP deviates from printed figure (usually modest). Cash/Collector feature adds extra volatility & RTP uplift beyond the base-line model.

Planned improvement pathways:
1. Strip-based analytical RTP: Enumerate symbol frequencies per reel and compute probability of each 3/4/5-of-a-kind pattern considering wild substitution.
2. Monte Carlo simulation: Run N (e.g. 10M) random stop sets to empirically estimate RTP & hit frequencies; adjust payout table accordingly.
3. Per-line stake model: Charge bet * 20, adjust table to conventional per-line multipliers.

## Further Work / Ideas

- Replace weight-based RTP printout with strip-frequency or simulated calculation
- Scatter / free spin feature (independent of paylines)
- Multi-level collector variants (e.g., double collect, add multipliers)
- Bonus mini-game (pick & reveal or hold-and-spin for cash values)
- Persistent balance (localStorage) & session stats (hit rates, largest win)
- Sound design (spin, stop ticks per reel, win celebration, collect whoosh)
- Responsive layout & mobile touch improvements
- Visual polish: reel gloss, symbol sprite sheet, motion blur refinement
- Accessibility: ARIA live region for wins, high-contrast mode, reduced motion setting
- Monte Carlo RTP tool integrated into a dev console panel

## Disclaimer

Prototype for educational/demo purposes only; not intended for real gambling use.
