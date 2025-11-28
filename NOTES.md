# Implementation Notes & Learnings

This document captures patterns, gotchas, and integration notes useful for future development. Focus is on reusable knowledge rather than historical fixes.

---

## WASM Integration Patterns

### Config Field Synchronization

**Pattern**: When adding new fields to `MatchmakingConfig` in Rust, always update:
1. `MatchmakingConfig::default()` in `src/types.rs`
2. `convertConfigToRust()` in `web/src/MatchmakingSimulator.jsx`
3. `defaultConfig` object in `web/src/MatchmakingSimulator.jsx`
4. Config sliders in UI (if user-configurable)

**Checklist for New Config Fields**:
- [ ] Add to Rust struct with default value
- [ ] Add to JavaScript `defaultConfig`
- [ ] Add to `convertConfigToRust()` mapping
- [ ] Add UI slider if needed
- [ ] Rebuild WASM: `wasm-pack build --target web --out-dir web/src/wasm`
- [ ] Test in browser

**Example**: When adding `party_player_fraction`, had to add it to all three places above.

---

### Probability Validation Pattern

**Critical**: Always validate probabilities before using with `gen_bool()`:

```rust
// Good pattern:
let prob = calculation.clamp(0.0, 1.0);
let prob = if prob.is_finite() { prob } else { 0.5 }; // fallback to neutral
rng.gen_bool(prob);

// Bad pattern:
rng.gen_bool(calculation); // Can panic if calculation is NaN or out of range
```

**Why**: `rand::Rng::gen_bool()` requires values in [0, 1], not NaN, not infinite. Rust's `f64` type doesn't prevent these invalid states.

**Apply To**:
- Win probability calculations
- Blowout probability calculations  
- Continuation probability calculations
- Any probability derived from floating-point math

---

### WASM Method Call Safety

**Pattern**: Debounce/throttle WASM calls from React effects to avoid recursive errors:

```javascript
// Good pattern:
useEffect(() => {
  if (sim && wasmReady && stats) {
    const timeoutId = setTimeout(() => {
      try {
        refreshParties();
      } catch (error) {
        console.error('Error:', error);
      }
    }, 100);
    return () => clearTimeout(timeoutId);
  }
}, [sim, wasmReady, stats, refreshParties]);

// Bad pattern:
useEffect(() => {
  if (sim && wasmReady && stats) {
    refreshParties(); // Can cause "recursive use of object" errors
  }
}, [sim, wasmReady, stats, refreshParties]);
```

**Why**: WASM bindings have strict rules about concurrent access. Calling methods too frequently (e.g., on every stats update) can cause borrow checker violations.

**Apply To**: Any WASM method called from React effects that update frequently.

---

## UI Integration Checklist

When adding new features to the simulation, ensure full integration:

### Engine → WASM → UI Pipeline

1. **Rust Engine** (`src/`):
   - [ ] Add data structures/types
   - [ ] Implement logic
   - [ ] Add to `SimulationStats` if it's a metric
   - [ ] Expose via WASM bindings in `src/lib.rs`

2. **WASM Bindings** (`src/lib.rs`):
   - [ ] Add `#[wasm_bindgen]` methods
   - [ ] Return JSON strings for complex types
   - [ ] Handle errors with `Result<..., JsValue>`
   - [ ] Rebuild: `wasm-pack build --target web --out-dir web/src/wasm`

3. **React Frontend** (`web/src/MatchmakingSimulator.jsx`):
   - [ ] Import WASM module: `import init, { SimulationEngine } from './wasm/cod_matchmaking_sim.js'`
   - [ ] Call WASM methods (parse JSON responses)
   - [ ] Update state with results
   - [ ] Add UI components (charts, cards, controls)
   - [ ] Add to appropriate tab (Overview, Distributions, etc.)

### Example: Adding Party Metrics

1. ✅ Added party stats to `SimulationStats` in Rust
2. ✅ Exposed `get_stats()` via WASM (already returns JSON)
3. ✅ Parsed party fields in `setStats()` callback
4. ✅ Added "Party Statistics" section to Overview tab
5. ✅ Added party charts to Distributions tab
6. ✅ Added config slider for `party_player_fraction`

---

## WASM Build Process

**Command**: `wasm-pack build --target web --out-dir web/src/wasm`

**Important**: 
- Must rebuild WASM after **any** Rust changes
- Build takes ~3-5 seconds
- Always test in browser after rebuild - some issues only appear at runtime
- Check console for WASM initialization errors

**Common Warnings (Safe to Ignore)**:
- `unused variable: rng` - Some RNG parameters reserved for future use
- `method X is never used` - Methods exposed via WASM aren't "used" in Rust's sense
- `struct ExperimentConfig is never constructed` - Reserved for future use

**Troubleshooting**:
- If WASM fails to load: Check browser console, verify `init()` is called before using `SimulationEngine`
- If methods undefined: Rebuild WASM, clear browser cache
- If JSON parse errors: Check Rust struct serialization matches JavaScript expectations

---

## Design Patterns

### Automatic vs Manual Controls

**Decision Framework**: For simulation parameters, prefer automatic/config-driven behavior over manual UI controls when:
- Parameter should be tunable but not require constant interaction
- Parameter aligns with experiment scenarios (e.g., "50% parties")
- Parameter affects initial state (population generation)

**Example**: `party_player_fraction` slider controls automatic party generation during population creation, rather than manual "create party" buttons.

**When to Use Manual Controls**:
- Debugging/testing specific scenarios
- Interactive exploration of edge cases
- Features that require user choice (e.g., selecting specific players)

---

## Future Considerations

### Party Size Distribution

**Current**: Parties created with sizes 2-4, biased toward 2-3.

**Potential Enhancement**: Make configurable:
- Add `party_size_distribution: Vec<(usize, f64)>` to config
- Allow custom distributions (e.g., more 4-player parties)

**Status**: Not implemented, easy to add if needed.

---

### Party Formation Rules

**Current**: Random formation from shuffled player list.

**Potential Enhancement**: Add formation rules:
- Skill-based grouping
- Geographic grouping
- Platform/input device preferences

**Status**: Not implemented. Random formation sufficient for current experiments.

---

### Performance Considerations

**Party Aggregation**: Computing party aggregates is O(n) per party. For 5k-10k players with ~500-1000 parties, this is fine. If scaling to 100k+ players, consider:
- Caching aggregates
- Computing incrementally
- Using approximate aggregates

---

## Quick Reference

### Adding a New Config Parameter

1. Add to `MatchmakingConfig` in `src/types.rs`
2. Add default in `MatchmakingConfig::default()`
3. Add to `defaultConfig` in `web/src/MatchmakingSimulator.jsx`
4. Add to `convertConfigToRust()` mapping
5. Add UI slider in CONFIG PARAMS section
6. Rebuild WASM
7. Test

### Adding a New Metric/Stat

1. Add to `SimulationStats` in `src/types.rs`
2. Update `update_stats()` in `src/simulation.rs`
3. `get_stats()` already exposed via WASM (returns JSON)
4. Parse new field in `setStats()` callback in React
5. Add visualization (chart, card, etc.) to appropriate tab
6. Rebuild WASM
7. Test

### Adding a New WASM Method

1. Add method to `SimulationEngine` impl in `src/lib.rs`
2. Mark with `#[wasm_bindgen]`
3. Return JSON string for complex types
4. Rebuild WASM
5. Import and call from React
6. Parse JSON response
7. Update UI state

---

## Common Gotchas

1. **JSX Structure**: Always verify closing tags when adding nested containers. Use linter/formatter.

2. **Naming Conflicts**: When migrating from JS to WASM, completely remove old implementations to avoid conflicts.

3. **JSON Serialization**: Rust struct field names (snake_case) don't match JavaScript (camelCase). Use conversion functions.

4. **Probability Validation**: Always clamp and check for NaN/infinite before `gen_bool()`.

5. **WASM Debouncing**: Debounce WASM calls from React effects to avoid recursive errors.

6. **Config Sync**: Keep Rust config, JS config, and conversion function in sync.

---

**Contributors**: Implementation notes from Slice A (Parties) and Slice B (Constraints/Backoff) completion

---

## Slice B Implementation Notes

### Breaking Changes: Method Signature Updates

**Pattern**: When fixing critical bugs that require method signature changes, update all call sites systematically.

**Example**: `SearchObject::wait_time()` signature changed from:
```rust
pub fn wait_time(&self, current_time: u64) -> f64
```
to:
```rust
pub fn wait_time(&self, current_time: u64, tick_interval: f64) -> f64
```

**Checklist for Breaking Changes**:
- [ ] Update method signature
- [ ] Find all call sites using `grep` or IDE search
- [ ] Update each call site to pass new parameter
- [ ] Verify compilation with `cargo check`
- [ ] Run unit tests to verify behavior
- [ ] Update WASM bindings if method is exposed

**Impact**: This affected 8 call sites across `src/matchmaker.rs` and `src/lib.rs`.

### Units Consistency Pattern

**Critical**: Always verify units when working with time-based calculations.

**Pattern**: When a method accepts or returns time values:
1. Document the unit (ticks, seconds, milliseconds) in comments
2. Use consistent naming (e.g., `wait_time_seconds`, `duration_ticks`)
3. Convert at boundaries (e.g., when calling backoff functions that expect seconds)

**Example from Slice B**:
- `SearchObject::wait_time()` now returns seconds (was returning ticks - bug)
- Backoff methods expect seconds
- `tick_interval` parameter ensures correct conversion

**Apply To**:
- Any time-based calculations
- Backoff functions
- Search time tracking
- Match duration calculations

### Skill Range Check Formula

**Pattern**: When implementing mathematical formulas from whitepaper, verify the exact formula matches.

**Slice B Fix**: The skill similarity check was incorrectly implemented as:
```rust
if skill_range > allowed_range * 2.0 { return None; }
```

**Correct formula** (per whitepaper §3.3):
```rust
// For each search j: [π_min(M), π_max(M)] ⊆ [ℓ_j(t), u_j(t)]
let ell_j = search.avg_skill_percentile - f_skill;
let u_j = search.avg_skill_percentile + f_skill;
if pi_min < ell_j || pi_max > u_j { return None; }
```

**Why**: The original check didn't verify that the match's skill range is contained within each search's acceptable range. The correct check ensures all searches can accept the full match range.

### Debug Feature Flag Pattern

**Pattern**: Use Rust feature flags for optional debug functionality:

```rust
#[cfg(feature = "debug")]
eprintln!("Debug message: {}", details);
```

**Benefits**:
- Zero runtime cost when disabled
- Can be enabled during development/testing
- Doesn't bloat production builds

**Usage**: Enable with `cargo build --features debug` or add to `Cargo.toml`:
```toml
[features]
default = []
debug = []
```

**Apply To**:
- Debug logging
- Verbose diagnostics
- Development-only features
