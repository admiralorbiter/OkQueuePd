# COD Matchmaking Whitepaper Implementation Roadmap

## Overview

This roadmap guides the implementation of a full agent-based matchmaking simulation that matches the mathematical model described in `cod_matchmaking_model.md`. The current codebase already implements a substantial portion of the whitepaper (approximately Stage 1-2), and this document breaks down the remaining work into **vertical slices** that can be implemented incrementally.

**📝 Important**: See `NOTES.md` for implementation learnings, common mistakes, and gotchas discovered during development.

### Progress Summary

**Completed Slices**:
- ✅ **Slice A: Parties & Multi-Player Search Objects**
  - Full party system integrated into matchmaking
  - WASM frontend integration complete
  - Party metrics and visualizations added
  - Automatic party generation via config parameter
- ✅ **Slice B: Matchmaking Constraints & Backoff Refinement**
  - Fixed critical units mismatch bug (ticks → seconds)
  - Fixed skill range check to match whitepaper §3.3 exactly
  - Added optional debug logging behind feature flag
  - All backoff formulas verified correct
- ✅ **Slice C: Team Balancing & Blowout Modeling**
  - Exact team balancing for small playlists (6v6) using Karmarkar-Karp partitioning
  - Enhanced blowout detection with severity classification (Mild, Moderate, Severe)
  - Configurable win probability logistic with gamma parameter
  - Per-playlist blowout rate tracking
  - Team skill difference distribution tracking
  - Frontend charts for blowout metrics and severity distribution
- ✅ **Slice D: Performance Model & Skill Evolution**
  - Per-match performance model with configurable noise
  - Skill update rule: \(s_i^+ = s_i^- + \alpha(\hat{y}_i - \mathbb{E}[Y_i])\)
  - Batch-based percentile recalculation
  - Skill distribution evolution tracking over time
  - Frontend visualizations: skill evolution time series, current skill distribution, performance distribution
  - Toggle between static and evolving skill modes
  - Skill drift summary metrics
- ✅ **Slice E: Satisfaction, Continuation, and Retention Modeling**
  - Formal retention model with logistic function and experience vectors
  - Return probability model (between-sessions)
  - Effective population size and churn tracking
  - Population change rate metric
  - Retention presets (ping-first, skill-first, lenient, strict)
  - Diagnostic panel for retention model debugging
- ✅ **Slice F: Region/DC Graph & Regional Metrics**
  - Explicit Region enum (NorthAmerica, Europe, AsiaPacific, SouthAmerica, Other)
  - Region adjacency graph with realistic geographic connections
  - Region-aware backoff (best region → adjacent → all based on wait time)
  - Per-region configuration overrides (max ping, delta ping, skill similarity)
  - Regional metrics tracking (search time, delta ping, blowout rate, cross-region match rate)
  - Frontend region-split charts and region filter dropdown
  - Per-region config UI panel
- ✅ **Slice G: Frontend Experiment Runner & Visualizations**
  - Comprehensive experiment storage system with localStorage persistence
  - Enhanced experiment runner supporting single and multi-parameter sweeps
  - Scenario preset system with built-in presets (SBMM, retention, regional, party, evolution)
  - Experiment library with search, filtering, tags, and CRUD operations
  - Side-by-side experiment comparison tool (2-4 experiments)
  - Export/import experiments as JSON files
  - Progress tracking with non-blocking execution (optimized to prevent UI freezing)
  - Reusable chart components (MetricChart, ComparisonChart, HeatmapChart)
  - Experiment builder UI for visual configuration
  - All metrics from slices A-F accessible via experiment runner

**Remaining Slices**: H (optional)

### Relationship to Whitepaper

The whitepaper (`cod_matchmaking_model.md`) describes:
- **Section 2**: State & variables (players, DCs, playlists, skill, search objects)
- **Section 3**: High-fidelity matchmaking process (seed+greedy, feasibility, quality scoring, team balancing)
- **Section 4-5**: Reduced/aggregate models for scale (optional, later phase)
- **Section 6**: Treatment of each CoD variable (connection, skill, input, platform, etc.)
- **Section 7**: Concrete build order (Stage 0-4)

This roadmap focuses on completing the **agent-based model** (Stages 1-3) and preparing for the aggregate model (Stage 4, optional).

### Current Implementation Status

The Rust/WASM engine (`src/`) already implements:
- ✅ Player state machine (OFFLINE → IN_LOBBY → SEARCHING → IN_MATCH)
- ✅ Data centers with ping modeling and backoff
- ✅ Skill system (raw skill, percentiles, buckets)
- ✅ Search objects and seed+greedy matchmaking
- ✅ Feasibility constraints (playlist, size, skill similarity/disparity, DC intersection, server capacity)
- ✅ Quality scoring (ping, skill balance, wait time)
- ✅ Team balancing (exact partitioning for 6v6, snake draft for large playlists)
- ✅ Match outcomes with configurable logistic and blowout severity classification
- ✅ Performance model with per-match performance indices
- ✅ Skill evolution system with update rule and batch percentile recalculation
- ✅ Skill distribution evolution tracking over time
- ✅ Formal retention model with logistic function and experience vectors
- ✅ Return probability model (between-sessions)
- ✅ Population health tracking (effective population size, population change rate)
- ✅ Per-bucket statistics
- ✅ Blowout severity tracking and per-playlist metrics
- ✅ Region adjacency graph and region-aware backoff
- ✅ Regional metrics tracking (per-region search times, delta ping, blowout rates, cross-region match rate)

The React frontend (`web/src/`) provides:
- ✅ Real-time visualization (charts, histograms, bucket stats)
- ✅ Parameter sweeps and experiments
- ✅ Configuration controls
- ✅ Full WASM integration (Rust simulation engine running in browser)
- ✅ Party metrics and visualizations
- ✅ Blowout rate by playlist and severity distribution charts
- ✅ Team balancing configuration controls
- ✅ Skill evolution visualizations (time series, current distribution, drift metrics)
- ✅ Performance distribution charts
- ✅ Skill evolution toggle and configuration controls
- ✅ Retention model diagnostic panel with computed probabilities and config values
- ✅ Population change rate metric (tracks rate of change of effective population)
- ✅ Region-split charts (search time, delta ping, blowout rate by region)
- ✅ Region filter dropdown and per-region configuration UI
- ✅ Cross-region match rate tracking and visualization
- ✅ Comprehensive experiment management system (storage, library, comparison)
- ✅ Enhanced experiment runner with single/multi-param sweeps and progress tracking
- ✅ Scenario preset system with built-in presets for all major configuration categories
- ✅ Experiment export/import functionality
- ✅ Non-blocking experiment execution (optimized to prevent UI freezing)

---

## Current State vs Whitepaper Mapping

| Topic | Whitepaper Section | Current Implementation | Gap / To-Do |
|-------|-------------------|------------------------|-------------|
| **Player State Machine** | §2.5 | `PlayerState` enum, 4-state loop | ✅ Complete |
| **Player Attributes** | §2.2 | `Player` struct (location, platform, input, skill, playlists) | ✅ Complete |
| **DC & Ping Model** | §2.3 | `DataCenter`, `dc_pings`, `acceptable_dcs()` with backoff | ✅ Complete |
| **Skill System** | §2.4 | Raw skill, percentile, buckets, skill evolution | ✅ Complete |
| **Search Objects** | §2.7 | `SearchObject` struct | ✅ Complete (supports solo and parties) |
| **Distance Metric** | §3.1 | `calculate_distance()` with weights | ✅ Complete |
| **Feasibility Checks** | §3.3 | `check_feasibility()` implements 6 constraints | ✅ Complete (units fixed, skill range check corrected) |
| **Quality Score** | §3.4 | `calculate_quality()` with 3 components | ✅ Complete |
| **Team Balancing** | §3.6 | `balance_teams()` with exact partitioning for 6v6 | ✅ Complete (exact for small, snake draft for large) |
| **Match Outcomes** | §3.7 | `determine_outcome()` with configurable logistic and blowout severity | ✅ Complete (includes performance model) |
| **Skill Evolution** | §3.7 | Performance model and skill update rule implemented | ✅ Complete |
| **Retention Model** | §3.8 | Formal logistic model with experience vectors, return probability | ✅ Complete |
| **Parties** | §2.4, §2.7 | `Party` struct with full integration | ✅ Complete |
| **Region Graph** | §2.3, §6.1 | `Region` enum with adjacency graph, region-aware backoff | ✅ Complete |
| **Under-full Lobbies** | §6.8 | Exact size match only | ⚠️ Missing |
| **Aggregate Model** | §5 | None | ❌ Optional Phase |

**Legend**: ✅ Complete | ⚠️ Partial/Needs Refinement | ❌ Missing

---

## Vertical Slices

Each vertical slice is a self-contained feature that touches engine, metrics, and optionally frontend. Slices can be implemented independently, but some have dependencies (noted below).

### Slice A: Parties & Multi-Player Search Objects ✅ **COMPLETE**

**Whitepaper References**: §2.4 (party aggregates), §2.7 (search objects), §3.6 (team balancing with parties)

**Status**: ✅ **Completed**

**Goals**:
- ✅ Enable players to form parties and search together
- ✅ Build `SearchObject`s from parties (not just solo players)
- ✅ Maintain party integrity during matchmaking (no splitting parties across teams)
- ✅ Compute party-level skill aggregates (\(\bar{s}_P\), \(\Delta s_P\), \(\bar{\pi}_P\), \(\Delta\pi_P\))

**Engine Work**:
- ✅ **`src/types.rs`**:
  - Extended `Party` struct: added `preferred_playlists: HashSet<Playlist>`, `platforms: HashMap<Platform, usize>`, `input_devices: HashMap<InputDevice, usize>`, `avg_location: Location`, `avg_skill_percentile`, `skill_percentile_disparity`
  - Added methods: `Party::from_players(players: &[&Player]) -> Party`, `Party::update_aggregates()`, `Party::to_search_object()`
- ✅ **`src/simulation.rs`**:
  - Added `parties: HashMap<usize, Party>` to `Simulation`
  - Implemented `create_party(player_ids: Vec<usize>) -> Result<usize, String>`
  - Implemented `join_party(party_id: usize, player_id: usize)`, `leave_party(party_id: usize, player_id: usize)`, `disband_party(party_id: usize)`
  - Modified `start_search()`: if player has `party_id`, create `SearchObject` from party; otherwise solo
  - Updated `SearchObject` creation to compute aggregates from party members
  - Added automatic party generation in `generate_population()` based on `party_player_fraction` config
- ✅ **`src/matchmaker.rs`**:
  - Updated `balance_teams()` to respect party boundaries (no splitting parties)
  - Team balancing uses party-aggregated skills when assigning teams
- ✅ **`src/lib.rs`**:
  - Exposed party management methods via WASM bindings
  - Added `get_parties()`, `get_party_members()`, `get_lobby_players()` for UI integration

**Frontend Work**:
- ✅ Full WASM integration replacing JavaScript simulation engine
- ✅ Party metrics displayed in Overview tab (party count, avg size, match rates, search times)
- ✅ Search queue visualization showing solo vs party searches
- ✅ Party size distribution and party vs solo search time comparison charts
- ✅ Config parameter: `party_player_fraction` (0.0-1.0) to control automatic party generation
- ✅ Removed manual party creation UI in favor of automatic generation based on config

**Metrics & Experiments**:
- ✅ Track: average party size, party match rate vs solo match rate, skill disparity within parties
- ✅ Party search times vs solo search times tracked and displayed
- ✅ Party size distribution visualization

**Enhancements Beyond Original Plan**:
- Added `party_player_fraction` config parameter (default 0.5) to automatically generate parties during population creation
- This allows controlled solo vs party mix without manual intervention, aligning with whitepaper's "50% parties of size 2-4" experiment scenario

**Dependencies**: None (was first slice)

---

### Slice B: Matchmaking Constraints & Backoff Refinement

**Whitepaper References**: §2.3 (DC backoff), §2.7 (skill backoff), §3.3 (feasibility)

**Status**: ✅ **COMPLETE**

**Critical Issues Fixed**:
1. ✅ **Units Mismatch (BUG FIXED)**: `SearchObject::wait_time()` now returns seconds by accepting `tick_interval` parameter. All 8 call sites updated.
2. ✅ **Skill Range Check (BUG FIXED)**: Replaced incorrect implementation with correct whitepaper §3.3 formula: \([\pi_{\min}(M), \pi_{\max}(M)] \subseteq [\ell_j(t), u_j(t)]\) for all searches j.
3. ✅ **Backoff Formulas**: Verified correct - formulas match whitepaper exactly.

**Goals**:
- ✅ Fix units mismatch (ticks → seconds) in `wait_time()` and all backoff calls
- ✅ Fix skill range check to match whitepaper §3.3 exactly
- ✅ Add debug logging for feasibility failures (optional, behind feature flag)
- **Defer**: Under-full lobby support (optional, per whitepaper §6.8 - only needed for extremely sparse populations)

**Engine Work**:
- ✅ **`src/types.rs`**:
  - ✅ Backoff methods already match whitepaper formulas (no changes needed):
    - \(f_{\text{conn}}(w) = \min(\delta_{\text{init}} + \delta_{\text{rate}} \cdot w, \delta_{\text{max}})\)
    - \(f_{\text{skill}}(w) = \min(\sigma_{\text{init}} + \sigma_{\text{rate}} \cdot w, \sigma_{\text{max}})\)
  - ✅ Fixed `SearchObject::wait_time()`: now returns **seconds** by multiplying ticks by `tick_interval` parameter
- ✅ **`src/matchmaker.rs`**:
  - ✅ Updated all 8 `wait_time()` call sites to pass `tick_interval` parameter
  - ✅ Fixed `check_feasibility()` skill similarity check:
    - For each search j, compute \(\ell_j(t) = \bar{\pi}_j - f_{\text{skill}}(w_j)\) and \(u_j(t) = \bar{\pi}_j + f_{\text{skill}}(w_j)\)
    - Verify \([\pi_{\min}(M), \pi_{\max}(M)] \subseteq [\ell_j(t), u_j(t)]\) for all j
    - Replaced incorrect `skill_range > allowed_range * 2.0` check
  - ✅ Added debug logging (behind `#[cfg(feature = "debug")]`) that records why feasibility checks fail
  - ✅ Fixed skill disparity check to use correct variable name
- ✅ **`src/simulation.rs`**:
  - ✅ Verified `tick_interval` is accessible where `wait_time()` is called
  - ✅ Audited all tick ↔ seconds conversions for consistency (all correct)
- ✅ **`src/lib.rs`**:
  - ✅ Updated WASM binding to use new `wait_time()` signature
- ✅ **`Cargo.toml`**:
  - ✅ Added optional `debug` feature flag

**Frontend Work**:
- ⚠️ Debug panel deferred (debug logging available in console when feature enabled)

**Metrics & Experiments**:
- ✅ Added unit tests: `test_wait_time_converts_ticks_to_seconds`, `test_backoff_formulas`, `test_backoff_with_seconds`, `test_skill_range_check_correct`
- ✅ Validated: backoff curves match expected formulas when wait_time is in seconds
- ✅ Validated: skill range constraints work correctly with fixed implementation

**Optional/Future Work** (defer to later slice if needed):
- Under-full lobby support: Add config `allow_underfull_lobbies: bool`, `underfull_threshold: f64`, `underfull_min_wait_seconds: f64`
- Frontend config sliders for under-full lobby parameters
- Frontend debug panel to display feasibility failure reasons

**Dependencies**: None (can be parallel with Slice A)

---

### Slice C: Team Balancing & Blowout Modeling ✅ **COMPLETE**

**Whitepaper References**: §3.6 (team balancing), §3.7 (outcomes, blowouts)

**Status**: ✅ **Completed**

**Goals**:
- ✅ Improve team balancing to better approximate Karmarkar-Karp partitioning
- ✅ Enhance blowout detection with more nuanced metrics
- ✅ Track blowout severity/severity buckets

**Engine Work**:
- ✅ **`src/types.rs`**:
  - Added `BlowoutSeverity` enum: `{ Mild, Moderate, Severe }`
  - Extended `Match`: `expected_score_differential: f64`, `win_probability_imbalance: f64`, `blowout_severity: Option<BlowoutSeverity>`
  - Extended `MatchmakingConfig`: `use_exact_team_balancing: bool`, `gamma: f64`, blowout detection coefficients and thresholds
  - Extended `SimulationStats`: `blowout_severity_counts`, `per_playlist_blowout_rate`, `team_skill_difference_samples`, per-playlist tracking fields
- ✅ **`src/matchmaker.rs`**:
  - Refactored `balance_teams()`:
    - Implemented exact partitioning for small playlists (6v6) using recursive backtracking
    - Minimizes `|sum(skills_team1) - sum(skills_team2)|` while respecting party boundaries
    - Falls back to snake draft for large playlists or if exact partitioning fails
    - Always ensures parties stay intact (no splitting)
  - Added `exact_partition_teams()` and `exact_partition_recursive()` helper methods
- ✅ **`src/simulation.rs`**:
  - Enhanced `determine_outcome()`:
    - Uses configurable logistic: \(P(A \text{ wins}) = \sigma(\gamma (S_A - S_B))\) with configurable \(\gamma\)
    - Computes `win_probability_imbalance` and `expected_score_differential`
    - Refactored blowout detection using configurable coefficients for skill difference vs win-probability imbalance
    - Assigns `blowout_severity` based on configurable thresholds
  - Updated `create_matches()` to calculate and store new match fields
  - Updated `process_match_completions()` to track blowout severity and per-playlist stats
  - Updated `update_stats()` to calculate per-playlist blowout rates

**Frontend Work**:
- ✅ Added config sliders:
  - `useExactTeamBalancing` (checkbox)
  - `gamma` (0.5-5.0)
  - Blowout coefficients and thresholds (6 sliders)
- ✅ Added charts:
  - Blowout Rate by Playlist (bar chart)
  - Blowout Severity Distribution (bar chart with color coding)
  - Team Skill Difference Distribution (histogram)
- ✅ Updated `defaultConfig` and `convertConfigToRust()` with new fields
- ✅ Updated stats parsing to include new metrics

**Metrics & Experiments**:
- ✅ Track: team skill difference distribution, blowout rate by playlist, blowout severity breakdown
- ✅ Experiment ready: Compare blowout rates with exact vs heuristic team balancing

**Dependencies**: Slice A (parties) recommended but not required

---

### Slice D: Performance Model & Skill Evolution ✅ **COMPLETE**

**Whitepaper References**: §2.4 (skill), §3.7 (performance, skill update), §6.4 (skill evolution)

**Status**: ✅ **Completed**

**Goals**:
- ✅ Add per-match performance model (KPM/SPM or performance index)
- ✅ Implement skill update rule based on performance vs expectation
- ✅ Track skill distribution evolution over time

**Engine Work**:
- ✅ **`src/types.rs`**:
  - Added to `Player`: `recent_performance: Vec<f64>` (performance indices from recent matches)
  - Added to `Match`: `player_performances: HashMap<usize, f64>` (performance index per player)
  - Added to `MatchmakingConfig`: `skill_learning_rate: f64` (α in update rule, default 0.01), `performance_noise_std: f64` (default 0.15), `enable_skill_evolution: bool` (default true), `skill_update_batch_size: usize` (default 10)
  - Added to `SimulationStats`: `skill_distribution_over_time`, `skill_evolution_enabled`, `total_skill_updates`, `performance_samples`
- ✅ **`src/simulation.rs`**:
  - Implemented `generate_performance()`: generates performance index with base performance based on skill and lobby context, plus configurable noise
  - Implemented `compute_expected_performance()`: computes expected performance (deterministic part) for skill updates
  - Modified `process_match_completions()`: computes performance for each player, updates skills using formula \(s_i^+ = s_i^- + \alpha(\hat{y}_i - \mathbb{E}[Y_i])\), tracks performance samples
  - Added batch update logic: calls `update_skill_percentiles()` every N matches (configurable batch size)
  - Implemented `record_skill_distribution_snapshot()`: records time series of mean skill per bucket
  - Added `matches_since_percentile_update` tracking field to `Simulation`
- ✅ **`src/lib.rs`**:
  - Added `get_skill_evolution_data()` WASM method
  - Added `get_performance_distribution()` WASM method
  - Added `toggle_skill_evolution()` WASM method

**Frontend Work**:
- ✅ Added config controls: `skillLearningRate`, `performanceNoiseStd`, `enableSkillEvolution`, `skillUpdateBatchSize` sliders/checkbox
- ✅ Added skill evolution metrics section in Overview tab (total updates, update rate, evolution mode)
- ✅ Added comprehensive skill evolution visualizations in Distributions tab:
  - Skill evolution over time (line chart showing key buckets: Low 1-2, Mid 5-6, High 9-10)
  - Current skill distribution by bucket (bar chart)
  - Performance distribution histogram
  - Skill drift summary (avg change, most improved/declined buckets)
- ✅ Added toggle button for static vs evolving skill mode
- ✅ Updated stats parsing to include skill evolution metrics

**Metrics & Experiments**:
- ✅ Track: skill drift over time, performance distribution, skill update rate, total skill updates
- ✅ Experiment ready: Compare blowout rates and search times with static vs evolving skill

**Enhancements Beyond Original Plan**:
- Added skill drift summary metrics showing overall skill change and most improved/declined buckets
- Color-coded bucket visualization (red for low, green for high)
- Real-time skill evolution tracking with automatic snapshot recording

**Dependencies**: Slice C (team balancing) - completed, provides accurate performance context

---

### Slice E: Satisfaction, Continuation, and Retention Modeling ✅ **COMPLETE**

**Whitepaper References**: §3.8 (satisfaction, quit probability), §6.9 (KPIs)

**Status**: ✅ **Completed** (including return probability)

**Goals**:
- ✅ Replace ad-hoc continuation logic with formal logistic model
- ✅ Define experience vector and parameterized retention function
- ✅ Track per-bucket retention metrics
- ✅ Implement return probability model (between-sessions)
- ✅ Track effective population size and churn rate

**Engine Work**:
- **`src/types.rs`**:
  - Add struct `RetentionConfig`:
    ```rust
    pub struct RetentionConfig {
        pub theta_ping: f64,      // Coefficient for delta ping
        pub theta_search_time: f64,
        pub theta_blowout: f64,
        pub theta_win_rate: f64,
        pub theta_performance: f64,
        pub base_continue_prob: f64,  // Base probability (before penalties)
    }
    ```
  - Add to `Player`: `recent_experience: Vec<ExperienceVector>` (last N matches)
  - Add struct `ExperienceVector`:
    ```rust
    pub struct ExperienceVector {
        pub avg_delta_ping: f64,
        pub avg_search_time: f64,
        pub blowout_rate: f64,
        pub win_rate: f64,
        pub avg_performance: f64,
    }
    ```
- **`src/simulation.rs`**:
  - Add function `compute_continue_probability(player: &Player, config: &RetentionConfig) -> f64`:
    - Build experience vector from recent history
    - Compute: \(P(\text{continue}) = \sigma(\theta^T \mathbf{z}_i)\)
    - Return probability
  - Replace inline continuation logic in `process_match_completions()` with call to `compute_continue_probability()`
  - After each match, update `player.recent_experience`
  - Add to `SimulationStats`: `per_bucket_continue_rate: HashMap<usize, f64>`, `avg_matches_per_session: f64`, `session_length_distribution: Vec<usize>`

**Frontend Work**:
- Add config panel for retention model coefficients
- Add presets: "Ping-First", "Skill-First", "Lenient", "Strict"
- Add chart: continuation rate by skill bucket
- Add chart: average matches per session over time

**Metrics & Experiments**:
- ✅ Track: continuation rate by bucket, matches per session, effective population size (concurrent players)
- ✅ Track: return rate by bucket, churn rate, effective population size over time
- ✅ Track: population change rate (first derivative of effective population, players per second)
- ✅ Diagnostic: average computed continue probability, logit values, experience values, and active config
- ✅ Experiment: Compare population health (total concurrent players, population change rate) with different retention models (Experiment 3 ready)

**Return Probability Implementation**:
- ✅ Added `compute_return_probability()` using same logistic model as continuation
- ✅ Modified `process_arrivals()` to use return probability (threshold-based selection)
- ✅ Preserve last session experience when players quit (goes to `last_session_experience`)
- ✅ Track churn rate (players offline > threshold without returning)
- ✅ Track effective population size over time (sampled every 10 ticks)
- ✅ Track return rate by skill bucket
- ✅ Track population change rate (rate of change of effective population, players per second)
- ✅ Frontend charts: Effective Population Size Over Time, Population Change Rate metric, Return Rate by Skill Bucket
- ✅ Diagnostic panel: Shows average computed continue probability, logit values, experience values, and active retention config for debugging

**Dependencies**: Slice D (performance model) ✅ - completed, provides complete experience vector

---

### Slice F: Region/DC Graph & Regional Metrics ✅ **COMPLETE**

**Whitepaper References**: §2.3 (DC connectivity), §2.6 (DCs), §4 (regions), §6.1 (regional behavior)

**Status**: ✅ **Completed**

**Goals**:
- ✅ Make regions explicit (enum instead of strings)
- ✅ Define region adjacency graph
- ✅ Add region-aware backoff and tuning
- ✅ Track region-split metrics

**Engine Work**:
- ✅ **`src/types.rs`**:
  - Added enum `Region { NorthAmerica, Europe, AsiaPacific, SouthAmerica, Other }` with `Serialize`, `Deserialize`, `Clone`, `Copy`, `Debug`, `PartialEq`, `Eq`, `Hash`
  - Updated `DataCenter`: `region: Region` (replaced `String`)
  - Updated `Player`: added `region: Region` field
  - Added struct `RegionConfig` with optional overrides:
    ```rust
    pub struct RegionConfig {
        pub max_ping: Option<f64>,
        pub delta_ping_initial: Option<f64>,
        pub delta_ping_rate: Option<f64>,
        pub skill_similarity_initial: Option<f64>,
        pub skill_similarity_rate: Option<f64>,
    }
    ```
  - Added to `MatchmakingConfig`: `region_configs: HashMap<Region, RegionConfig>` with helper methods for region-specific config retrieval
  - Implemented `Region::adjacent_regions() -> Vec<Region>` defining adjacency graph:
    - NA ↔ EU (transatlantic), NA ↔ SA (Americas)
    - EU ↔ APAC (via Middle East/Asia), APAC ↔ SA (Pacific)
    - Other is adjacent to all (catch-all)
  - Added struct `RegionStats`:
    ```rust
    pub struct RegionStats {
        pub player_count: usize,
        pub avg_search_time: f64,
        pub avg_delta_ping: f64,
        pub blowout_rate: f64,
        pub active_matches: usize,
        pub cross_region_match_rate: f64,
        pub total_matches: usize,
        pub blowout_count: usize,
        pub cross_region_matches: usize,
    }
    ```
  - Updated `SimulationStats`: added `region_stats: HashMap<Region, RegionStats>` and `cross_region_match_samples: Vec<bool>`
  - Updated `Player::acceptable_dcs()`: implemented region-aware backoff with three-tier system:
    1. Short wait (0-10s): Only best region DCs
    2. Medium wait (10-30s): Best region + adjacent regions
    3. Long wait (30s+): All regions
- ✅ **`src/simulation.rs`**:
  - Updated `init_default_data_centers()`: replaced string regions with `Region` enum variants
  - Updated `generate_population()`: added `determine_region_from_location()` helper using geographic bounds to assign player regions
  - Updated `start_search()`: modified to pass `player.region` and `data_centers` to `acceptable_dcs()`
  - Updated `create_matches()`: added cross-region match detection and tracking
  - Added `update_region_stats()` method: aggregates per-region metrics (search times, delta pings, blowout rates, cross-region match rates)
  - Updated `update_stats()`: calls `update_region_stats()` to populate regional statistics
- ✅ **`src/matchmaker.rs`**:
  - Updated `check_feasibility()`: implemented region-aware DC prioritization (best region → adjacent → other)
  - Updated `run_tick()`: added cross-region match detection by checking player regions
  - Updated `MatchResult`: added `is_cross_region: bool` field
- ✅ **`src/lib.rs`**:
  - Added `get_region_stats() -> String` WASM method to expose regional statistics
  - Updated `get_data_centers()`: ensured Region enum serializes correctly as string

**Frontend Work**:
- ✅ Added region filter dropdown with "All Regions" option
- ✅ Added region-split charts:
  - Search Time by Region (bar chart)
  - Delta Ping by Region (bar chart)
  - Blowout Rate by Region (bar chart)
  - Cross-Region Match Rate (metric card)
  - Active Matches by Region (bar chart)
- ✅ Added region config UI panel (collapsible section in config panel):
  - Per-region overrides for `maxPing`, `deltaPingInitial`, `deltaPingRate`, `skillSimilarityInitial`, `skillSimilarityRate`
  - Handles nested configuration updates correctly
- ✅ Updated stats parsing: handles `region_stats` JSON with Region enum string keys
- ⚠️ DC map visualization deferred (optional enhancement)

**Metrics & Experiments**:
- ✅ Track: search times by region, cross-region match rate, delta ping by region, blowout rate by region
- ✅ Track: active matches per region, player count per region
- ✅ Experiment ready: Compare behavior in low-population vs high-population regions (Experiment 4 ready)

**Enhancements Beyond Original Plan**:
- Added cross-region match rate tracking and visualization
- Implemented flexible per-region config overrides with fallback to global values
- Added geographic bounds-based region assignment from player location
- Enhanced region stats with additional metrics (total matches, blowout count, cross-region matches)

**Dependencies**: Slice B (backoff refinement) ✅ - completed, provides foundation for region-aware backoff

---

### Slice G: Frontend Experiment Runner & Visualizations ✅ **COMPLETE**

**Whitepaper References**: §7 (experiments), §6.9 (KPIs)

**Status**: ✅ **Completed**

**Goals**:
- ✅ Enhance frontend to support all new metrics from slices A-F
- ✅ Build reusable experiment runner UI
- ✅ Add scenario preset system

**Engine Work**:
- ✅ **`src/lib.rs`**:
  - ✅ Verified all new stats/metrics are exposed via WASM (region stats, retention metrics, skill evolution, etc.)
  - ✅ Functions confirmed: `get_region_stats() -> String`, `get_retention_stats() -> String`, `get_skill_evolution_data() -> String`
  - ✅ All WASM bindings verified for complete metric access

**Frontend Work**:
- ✅ **`web/src/utils/ExperimentStorage.js`**:
  - ✅ Comprehensive storage system with localStorage persistence
  - ✅ Export/import JSON functionality
  - ✅ Search, filtering, and tag management
  - ✅ Storage size limits and quota management
  
- ✅ **`web/src/utils/ScenarioPresets.js`**:
  - ✅ Built-in presets for SBMM (Tight, Loose, Skill-First, Ping-First)
  - ✅ Built-in retention presets (Ping-First, Skill-First, Lenient, Strict)
  - ✅ Built-in regional presets (Low Population, High Population)
  - ✅ Built-in party presets (Solo Only, Party Heavy)
  - ✅ Built-in evolution presets (Static Skill, Evolving Skill, High Learning Rate)
  - ✅ Custom preset creation and management
  
- ✅ **`web/src/components/Experiments/ExperimentRunner.jsx`**:
  - ✅ Enhanced experiment runner with single-parameter sweeps
  - ✅ Multi-parameter sweeps (grid search over multiple parameters)
  - ✅ Preset-based experiments
  - ✅ Real-time progress tracking with non-blocking execution
  - ✅ Comprehensive metric collection from all slices
  - ✅ Experiment configuration builder
  
- ✅ **`web/src/components/Experiments/ExperimentLibrary.jsx`**:
  - ✅ Experiment library with grid/list view
  - ✅ Search and filtering by name, tags, type, status, date
  - ✅ Tag management and organization
  - ✅ Batch operations (delete, export)
  - ✅ Experiment details view
  
- ✅ **`web/src/components/Experiments/ExperimentComparison.jsx`**:
  - ✅ Side-by-side comparison (2-4 experiments)
  - ✅ Config difference visualization
  - ✅ Metric overlays on charts
  - ✅ Statistical summaries
  
- ✅ **`web/src/components/Charts/`**:
  - ✅ Reusable MetricChart component
  - ✅ ComparisonChart for overlay comparisons
  - ✅ HeatmapChart for multi-parameter sweep results
  
- ✅ **`web/src/MatchmakingSimulator.jsx`**:
  - ✅ New "Experiments" tab with enhanced runner
  - ✅ New "Experiment Library" tab for management
  - ✅ New "Comparison" tab for side-by-side analysis
  - ✅ Integration of all experiment components
  
- ✅ **`web/src/hooks/useExperimentRunner.js`**:
  - ✅ Optimized experiment execution with batched tick processing
  - ✅ Non-blocking execution using requestAnimationFrame
  - ✅ Progress updates that don't freeze the UI

**Metrics & Experiments**:
- ✅ All experiments from slices A-F are runnable from UI
- ✅ Experiment storage and management system enables research-grade workflows
- ✅ Export/import functionality for sharing and archival
- ✅ All canonical experiments can be run via the new experiment runner

**Enhancements Beyond Original Plan**:
- ✅ Full experiment management system (CRUD operations, search, filtering)
- ✅ Experiment comparison tool for side-by-side analysis
- ✅ Non-blocking execution optimization: Batched tick processing (50-100 ticks per batch) with requestAnimationFrame yielding to prevent UI freezing during long experiments
- ✅ Comprehensive metric collection including all slices A-F metrics
- ✅ Tag-based organization system
- ✅ Bulk export/import capabilities
- ✅ Experiment builder UI for visual configuration
- ✅ Duration estimation for experiment planning
- ✅ Real-time progress tracking with smooth UI updates

**Dependencies**: Slices A-F ✅ - all metrics implemented and verified

---

### Slice H (Optional): Aggregate / Reduced Model

**Whitepaper References**: §5 (aggregate model), §7 Stage 4

**Goals**:
- Implement bucketed/ODE-style model for massive scale
- Derive pairing kernel and throughput functions from micro-sim
- Validate aggregate model against agent-based model

**Engine Work**:
- **`src/aggregate.rs`** (new module):
  - Define bucket structure: \((r, m, b, k)\) where \(r\)=region, \(m\)=playlist, \(b\)=skill bucket, \(k\)=wait bin
  - State variables: \(S_{rmbk}(t)\), \(P_{rmb}(t)\), \(H_{rmb}(t)\)
  - Implement ODE update rules:
    - Arrivals: \(\lambda_{rmb}(t)\)
    - Aging between wait bins
    - Match throughput: \(\mu_{rmbk}(t)\)
    - Match completions: \(P_{rmb}(t) / \mathbb{E}[L_m]\)
  - Implement pairing kernel \(K_{bb'}\) (empirically fit from micro-sim or analytical approximation)
  - Implement throughput function: \(\nu_{rm}(t) = \min(S_{rm}(t) / N_m^{\text{req}}, \sum_d F_{d,m}(t))\)
- **`src/simulation.rs`**:
  - Add function `export_micro_data() -> AggregateTrainingData` (export samples for fitting)
- **`src/lib.rs`**:
  - Add `AggregateSimulation` struct and WASM bindings
  - Add function `run_aggregate_simulation(config, initial_state) -> AggregateResults`

**Frontend Work**:
- Add toggle: "Micro" vs "Aggregate" simulation mode
- Run same experiments in both modes and compare results
- Visualize pairing kernel \(K_{bb'}\) as heatmap

**Metrics & Experiments**:
- Validate: aggregate model reproduces micro-model outputs (search times, delta ping, blowouts) within acceptable error
- Experiment: Run long-term scenarios (months) with aggregate model

**Dependencies**: Slices A-F ✅ (complete micro-model available for parameter fitting)

---

## Implementation Phases

Phases group slices into logical execution order. Each phase produces working artifacts and can be validated independently.

### Phase 1: Core Matchmaking Fidelity

**Slices**: A (Parties) ✅ **COMPLETE** + B (Constraints/Backoff) ✅ **COMPLETE**

**Goal**: Complete the core matchmaking loop with parties and accurate constraints.

**Deliverables**:
- ✅ Parties fully integrated into search and matchmaking
- ✅ Backoff functions match whitepaper formulas exactly (verified with unit tests)
- ⚠️ Under-full lobby support (optional, deferred)
- ✅ Debug logging for feasibility failures (behind feature flag)

**Validation**:
- ✅ Run simulation with parties and verify: party integrity maintained, search times reasonable
- ✅ Verify backoff curves match expected formulas (unit tests added)
- ✅ Verify skill range constraints work correctly (unit tests added)
- ⚠️ Compare search times with/without under-full lobbies in low-population scenarios (deferred)

**Status**: Phase 1 complete. Both slices A and B implemented and tested.

**Estimated Effort**: 2-3 weeks (Slice A: ~1 week, Slice B: ~1 week)

---

### Phase 2: Match Quality & Outcomes

**Slices**: C (Team Balancing/Blowouts) ✅ **COMPLETE** + D (Performance/Skill Evolution) ✅ **COMPLETE**

**Goal**: Improve match quality prediction and enable dynamic skill evolution.

**Deliverables**:
- ✅ Exact team balancing for small playlists
- ✅ Enhanced blowout detection with severity
- ✅ Performance model and skill update rule
- ✅ Skill distribution evolution tracking

**Validation**:
- ✅ Compare blowout rates with exact vs heuristic balancing (ready for testing)
- ✅ Verify skill evolution: players improve/decline based on performance (implemented and ready for testing)
- ✅ Track skill distribution stability over long runs (tracking implemented)

**Status**: Phase 2 complete. Both slices C and D implemented and ready for validation.

**Estimated Effort**: 3-4 weeks (Slice C: ~1 week, Slice D: ~2-3 weeks) - **COMPLETED**

---

### Phase 3: Player Behavior & Regional Analysis

**Slices**: E (Retention) ✅ **COMPLETE** + F (Regions) ✅ **COMPLETE**

**Goal**: Model player satisfaction and enable regional analysis.

**Deliverables**:
- ✅ Formal retention model with experience vector
- ✅ Return probability model (between-sessions)
- ✅ Effective population size and churn tracking
- ✅ Region adjacency graph and region-aware backoff
- ✅ Per-region metrics and analysis
- ✅ Retention presets (ping-first, skill-first, lenient, strict)
- ✅ Population change rate metric (tracks rate of change of effective population)
- ✅ Diagnostic panel for retention model debugging
- ✅ Region-split charts and region filter controls
- ✅ Per-region configuration overrides

**Validation**:
- ✅ Compare population health (concurrent players, population change rate) with different retention models (Experiment 3 ready)
- ✅ Analyze regional differences: search times, delta ping, blowout rates (Slice F complete)
- ✅ Verify low-population regions can spill into adjacent regions (region-aware backoff implemented)

**Status**: Phase 3 complete. Both slices E and F implemented and ready for validation.

**Estimated Effort**: 2-3 weeks (Slice E: ✅ Complete, Slice F: ✅ Complete)

---

### Phase 4: Frontend & Experimentation ✅ **COMPLETE**

**Slice**: G (Frontend Enhancements) ✅ **COMPLETE**

**Goal**: Make all new features accessible via UI and enable comprehensive experiments.

**Deliverables**:
- ✅ All new metrics visualized (retention, skill evolution, regions, blowouts)
- ✅ Enhanced experiment runner (multi-param sweeps, config comparison)
- ✅ Scenario preset system with built-in presets for all major categories
- ✅ Region filters and regional analysis tools
- ✅ Comprehensive experiment management system
- ✅ Export/import functionality for experiments
- ✅ Non-blocking experiment execution (optimized to prevent UI freezing)

**Validation**:
- ✅ Run all canonical experiments from roadmap via UI (Experiments 1-6 ready)
- ✅ Scenario presets implemented and available for use
- ✅ Experiment runner tested with various parameter combinations
- ✅ Storage, search, filtering, and comparison tools functional

**Status**: Phase 4 complete. All deliverables implemented and integrated.

**Estimated Effort**: 2-3 weeks - **COMPLETED**

---

### Phase 5 (Optional): Aggregate Model

**Slice**: H (Aggregate/ODE Model)

**Goal**: Enable massive-scale simulations via reduced model.

**Deliverables**:
- Bucketed ODE model implementation
- Pairing kernel and throughput functions (fitted from micro-sim)
- Aggregate simulation driver
- Validation against micro-model

**Validation**:
- Run identical scenarios in micro and aggregate modes
- Compare outputs: search times, delta ping, blowouts, retention
- Verify aggregate model runs 100x+ faster for large populations

**Estimated Effort**: 4-6 weeks

---

## Experiment Catalog

This section documents canonical experiments that can be run once the relevant slices are implemented. Each experiment should be reproducible via the frontend experiment runner.

### Experiment 1: SBMM Strictness Sweep ✅ **READY**

**Dependencies**: Slices A ✅, B ✅, C ✅

**Parameters**: Vary `skill_similarity_initial` from 0.01 to 0.3

**Metrics to Track**:
- Search time (P50, P90, P99) by skill bucket
- Delta ping by skill bucket
- Blowout rate overall and by bucket (now includes severity breakdown)
- Skill disparity distribution
- Team skill difference distribution (new from Slice C)
- Per-playlist blowout rates (new from Slice C)

**Expected Results**:
- Tighter SBMM → longer search times, especially for extreme skill buckets
- Tighter SBMM → lower blowout rate, better skill matching
- Tradeoff: search time vs match quality
- Exact team balancing should reduce blowout rates compared to snake draft

**Config Preset**: `experiments/sbmm_strictness_sweep.json`

**Status**: All dependencies complete. Experiment can be run with enhanced metrics from Slice C.

---

### Experiment 2: Ping vs Skill Weight Tradeoff

**Dependencies**: Slices A, B

**Parameters**: Vary `weight_skill` from 0.1 to 0.7 (with `weight_geo` = 1.0 - `weight_skill`)

**Metrics to Track**:
- Average delta ping
- Average search time
- Skill disparity
- Blowout rate

**Expected Results**:
- Higher skill weight → better skill matching, worse ping
- Higher geo weight → better ping, worse skill matching
- Optimal point depends on population density

**Config Preset**: `experiments/ping_vs_skill_tradeoff.json`

---

### Experiment 3: Retention Model Comparison ✅ **READY**

**Dependencies**: Slices E ✅, D ✅

**Parameters**: Compare retention presets: "Ping-First", "Skill-First", "Lenient", "Strict"

**Metrics to Track**:
- ✅ Effective population size (concurrent players) over time
- ✅ Population change rate (players per second, positive = growing, negative = shrinking)
- ✅ Average matches per session
- ✅ Continuation rate by skill bucket
- ✅ Churn rate
- ✅ Return rate by skill bucket
- ✅ Diagnostic metrics: average computed continue probability, logit values, experience values

**Expected Results**:
- Ping-First → higher retention for low-ping players, lower for high-ping
- Skill-First → higher retention for mid-skill players
- Lenient → higher overall retention but more blowouts
- Strict → lower retention but better match quality

**Config Preset**: `experiments/retention_model_comparison.json`

**Status**: All dependencies complete. Experiment can be run with full return probability and population health tracking.

---

### Experiment 4: Regional Population Effects ✅ **READY**

**Dependencies**: Slices F ✅, B ✅

**Parameters**: Vary regional population weights (e.g., NA: 0.7, EU: 0.2, APAC: 0.1 vs balanced 0.33 each)

**Metrics to Track**:
- ✅ Search time by region
- ✅ Delta ping by region
- ✅ Cross-region match rate
- ✅ Blowout rate by region
- ✅ Active matches by region
- ✅ Player count by region

**Expected Results**:
- Low-population regions → longer search times, higher delta ping (spill to other regions)
- High-population regions → shorter search times, better ping
- Regional backoff helps but doesn't eliminate disparities
- Region-aware backoff should show three-tier expansion (best → adjacent → all) as wait time increases

**Config Preset**: `experiments/regional_population_effects.json`

**Status**: All dependencies complete. Experiment can be run with full regional metrics tracking and region-aware backoff.

---

### Experiment 5: Skill Evolution Over Time ✅ **READY**

**Dependencies**: Slices D ✅, C ✅

**Parameters**: Compare "Static Skill" vs "Evolving Skill" modes over long runs (1000+ ticks)

**Metrics to Track**:
- Skill distribution evolution (mean, variance by bucket)
- Blowout rate over time
- Search time trends
- Performance distribution by skill bucket
- Skill drift metrics (avg change, most improved/declined buckets)

**Expected Results**:
- Evolving skill → skill distribution may shift (e.g., players improve)
- Evolving skill → blowout rates may change as skill estimates improve
- Static skill → stable but potentially unrealistic

**Config Preset**: `experiments/skill_evolution_comparison.json`

**Status**: All dependencies complete. Experiment can be run with full skill evolution tracking and visualizations.

---

### Experiment 6: Party Size Effects

**Dependencies**: Slice A

**Parameters**: Vary party size distribution (solo-only vs 50% parties of size 2-4)

**Metrics to Track**:
- Search time for solo vs party players
- Match rate by party size
- Skill disparity within parties
- Team balance quality (with parties)

**Expected Results**:
- Larger parties → longer search times (harder to find compatible matches)
- Parties maintain skill cohesion better than random groups
- Team balancing with parties is more constrained

**Config Preset**: `experiments/party_size_effects.json`

---

## Next Steps

1. **Review this roadmap** and confirm slice priorities
2. **Start with Phase 1** (Slices A + B) for core matchmaking fidelity
3. **Implement incrementally**: Complete one slice, validate, then move to next
4. **Update roadmap** as you discover gaps or adjust scope
5. **Document findings**: Add "Results" sections to slices as you complete them

---

## Notes

- **Intentional Simplifications**: Some whitepaper features are intentionally simplified or deferred:
  - Map diversity/rotation (low priority)
  - Voice chat matching (weak signal, can ignore)
  - Platform-specific optimizations (can treat as cross-platform penalty only)
- **Performance**: Current implementation handles ~5k-10k players comfortably. For larger populations, use aggregate model (Slice H).
- **Testing**: Each slice should include unit tests and integration tests. Use property-based tests where possible (e.g., party integrity, backoff monotonicity).

---

**Version**: 1.0

