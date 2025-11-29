# OkQueuePD

**OkQueuePD** (Player Dynamics) is a research-oriented agent-based matchmaking simulation based on Call of Duty whitepapers. Built with Rust (WebAssembly) and React, this tool enables detailed research into matchmaking algorithms, SBMM (Skill-Based Match Making), player retention, skill evolution, and player experience optimization.

*PD stands for "Player Dynamics" - reflecting the focus on modeling how player behavior, skill, and satisfaction evolve over time.*

## 🎮 Features

### Core Simulation
- **Full Agent-Based Simulation**: Simulates individual players with skills, locations, platforms, and preferences
- **Realistic Matchmaking Algorithm**: Implements seed + greedy matching with skill similarity, delta ping backoff, and data center selection
- **10 Global Data Centers**: Realistic geographic distribution with latency modeling across 5 regions (North America, Europe, Asia Pacific, South America, Other)
- **Multiple Playlists**: TDM, Search & Destroy, Domination, Ground War, FFA

### Advanced Features
- **Party System**: Full party support with automatic generation, party integrity during matchmaking, and party-level skill aggregates
- **Enhanced Team Balancing**: Exact partitioning for small playlists (Karmarkar-Karp style), snake draft for large playlists
- **Blowout Detection**: Multi-level severity classification (Mild, Moderate, Severe) with configurable thresholds
- **Performance Model & Skill Evolution**: Per-match performance modeling with skill updates based on performance vs. expectation
- **Formal Retention Model**: Logistic-based retention with experience vectors tracking delta ping, search time, blowouts, win rate, and performance
- **Population Health Tracking**: Effective population size, churn rate, return probability, and population change rate over time
- **Regional Analysis**: Region adjacency graph, region-aware backoff, per-region configuration overrides, and cross-region match tracking

### Research Tools
- **Comprehensive Experiment Runner**: Single and multi-parameter sweeps with non-blocking execution
- **Experiment Library**: Storage, search, filtering, tags, and CRUD operations with localStorage persistence
- **Experiment Comparison**: Side-by-side comparison of 2-4 experiments with metric overlays
- **Scenario Presets**: Built-in presets for SBMM, retention, regional, party, and evolution experiments
- **Export/Import**: JSON export/import for experiment sharing and archival
- **Real-time Visualization**: Live charts for search times, ping distributions, skill matching quality, skill evolution, retention metrics, and regional analysis

## 📊 Research Questions This Can Answer

1. How does tightening/loosening SBMM affect search times across skill buckets?
2. What's the tradeoff between ping quality and skill matching?
3. How do backoff curves affect match quality over time?
4. What causes blowouts and how can they be minimized?
5. How does player retention correlate with match quality?
6. How do different retention models affect population health and churn?
7. How does skill evolution over time impact match quality and blowout rates?
8. How do regional population imbalances affect search times and cross-region matching?
9. How do party sizes affect matchmaking efficiency and team balance quality?
10. What are the long-term effects of different matchmaking strategies on player satisfaction?

## 🚀 Quick Start (Web Frontend Only)

The easiest way to run the simulator:

```bash
cd web
npm install
npm run dev
```

Then open http://localhost:3000 in your browser.

## 🦀 Building the Rust/WASM Engine (Optional)

For better performance, you can compile the Rust simulation to WebAssembly:

### Prerequisites

1. Install Rust: https://rustup.rs/
2. Add WASM target:
   ```bash
   rustup target add wasm32-unknown-unknown
   ```
3. Install wasm-pack:
   ```bash
   cargo install wasm-pack
   ```

### Build

```bash
# From the project root (not web/)
wasm-pack build --target web --out-dir web/src/wasm
```

### Integration Note

The frontend already integrates the WASM module. After building, the simulation will automatically use the compiled WebAssembly for improved performance. The frontend includes full TypeScript bindings and handles WASM initialization automatically.

## 📁 Project Structure

```
OkQueuePD/
├── Cargo.toml              # Rust project configuration
├── src/
│   ├── lib.rs              # WASM bindings and exports
│   ├── types.rs            # Core data structures (players, parties, regions, config)
│   ├── matchmaker.rs       # Matchmaking algorithm (seed+greedy, team balancing)
│   └── simulation.rs       # Simulation engine (state machine, retention, skill evolution)
├── docs/
│   ├── cod_matchmaking_model.md    # Mathematical model whitepaper
│   └── COD_MM_ROADMAP.md           # Implementation roadmap
├── web/
│   ├── package.json        # Node.js dependencies
│   ├── vite.config.js      # Vite configuration
│   ├── index.html          # Entry HTML
│   └── src/
│       ├── main.jsx        # React entry point
│       ├── MatchmakingSimulator.jsx  # Main component
│       ├── components/
│       │   ├── Charts/     # Reusable chart components
│       │   └── Experiments/  # Experiment runner, library, comparison UI
│       ├── hooks/          # Custom React hooks
│       └── utils/          # Experiment storage, presets, utilities
└── README.md
```

## ⚙️ Configuration Parameters

### Matchmaking Constraints

| Parameter | Description | Default |
|-----------|-------------|---------|
| `skillSimilarityInitial` | Initial skill tolerance for matching | 0.05 |
| `skillSimilarityRate` | How fast skill tolerance relaxes | 0.01/s |
| `skillSimilarityMax` | Maximum skill tolerance | 0.5 |
| `deltaPingInitial` | Initial delta ping tolerance (ms) | 10 |
| `deltaPingRate` | How fast ping tolerance relaxes | 2ms/s |
| `deltaPingMax` | Maximum delta ping tolerance | 100ms |
| `weightSkill` | Weight of skill in distance metric | 0.4 |
| `weightGeo` | Weight of geography in distance metric | 0.3 |
| `arrivalRate` | Players coming online per tick | 10 |

### Team Balancing & Outcomes

| Parameter | Description | Default |
|-----------|-------------|---------|
| `useExactTeamBalancing` | Use exact partitioning for 6v6 modes | true |
| `gamma` | Win probability logistic coefficient | 2.0 |
| `blowoutSkillCoeff` | Skill difference coefficient for blowout detection | 0.8 |
| `blowoutWinProbCoeff` | Win probability imbalance coefficient | 0.6 |

### Skill Evolution

| Parameter | Description | Default |
|-----------|-------------|---------|
| `enableSkillEvolution` | Enable skill updates based on performance | true |
| `skillLearningRate` | Skill update learning rate (α) | 0.01 |
| `performanceNoiseStd` | Standard deviation of performance noise | 0.15 |
| `skillUpdateBatchSize` | Matches between percentile recalculations | 10 |

### Retention Model

| Parameter | Description | Default |
|-----------|-------------|---------|
| `thetaPing` | Retention coefficient for delta ping | -0.02 |
| `thetaSearchTime` | Retention coefficient for search time | -0.01 |
| `thetaBlowout` | Retention coefficient for blowout rate | -0.5 |
| `thetaWinRate` | Retention coefficient for win rate | 0.3 |
| `thetaPerformance` | Retention coefficient for performance | 0.2 |
| `baseContinueProb` | Base continuation probability | 0.7 |

### Party System

| Parameter | Description | Default |
|-----------|-------------|---------|
| `partyPlayerFraction` | Fraction of players in parties | 0.5 |

### Regional Configuration

Per-region overrides available for: `maxPing`, `deltaPingInitial`, `deltaPingRate`, `skillSimilarityInitial`, `skillSimilarityRate`

## 📈 Key Metrics

### Matchmaking Quality
- **Search Time**: Time from queue to match (P50, P90, P99) by skill bucket and region
- **Delta Ping**: Additional latency vs. best data center, tracked per region
- **Skill Disparity**: Spread of skill in a lobby
- **Blowout Rate**: Percentage of unbalanced matches with severity classification (Mild, Moderate, Severe)
- **Team Skill Difference**: Distribution of skill differences between teams

### Player Dynamics
- **Skill Evolution**: Time series of skill distribution by bucket, skill drift metrics
- **Performance Distribution**: Per-match performance indices with skill-adjusted expectations
- **Retention Metrics**: Continuation rate, return rate, matches per session by skill bucket
- **Population Health**: Effective population size over time, population change rate, churn rate
- **Experience Vectors**: Average delta ping, search time, blowout rate, win rate, performance

### Regional Analysis
- **Per-Region Metrics**: Search time, delta ping, blowout rate, active matches by region
- **Cross-Region Matching**: Rate of matches spanning multiple regions
- **Region-Aware Backoff**: Tracking of DC selection (best region → adjacent → all)

### Party & Team Metrics
- **Party Statistics**: Party size distribution, party vs solo search times, party match rates
- **Team Balance Quality**: Team skill difference with party constraints

## 🔬 Running Experiments

### Using the Experiment Runner UI

The web frontend includes a comprehensive experiment management system accessible via the "Experiments" tab:

- **Single Parameter Sweeps**: Test individual parameters across a range of values
- **Multi-Parameter Sweeps**: Grid search over multiple parameters simultaneously
- **Scenario Presets**: Quick-start experiments using built-in presets:
  - SBMM presets (Tight, Loose, Skill-First, Ping-First)
  - Retention presets (Ping-First, Skill-First, Lenient, Strict)
  - Regional presets (Low Population, High Population)
  - Party presets (Solo Only, Party Heavy)
  - Evolution presets (Static Skill, Evolving Skill, High Learning Rate)

### Experiment Library

- **Storage**: All experiments are saved to localStorage with search and filtering
- **Comparison**: Compare 2-4 experiments side-by-side with overlayed metrics
- **Export/Import**: Share experiments as JSON files
- **Progress Tracking**: Real-time progress updates with non-blocking execution

### Built-in Experiment Scenarios

The roadmap documents 6 canonical experiments ready to run:
1. **SBMM Strictness Sweep**: Vary skill similarity constraints
2. **Ping vs Skill Weight Tradeoff**: Test connection vs. fairness prioritization
3. **Retention Model Comparison**: Compare different retention model presets
4. **Regional Population Effects**: Analyze low-pop vs high-pop region behavior
5. **Skill Evolution Over Time**: Compare static vs evolving skill modes
6. **Party Size Effects**: Analyze solo vs party matchmaking efficiency

## 📚 Documentation

- **[Whitepaper](docs/cod_matchmaking_model.md)**: Full mathematical model specification
- **[Implementation Roadmap](docs/COD_MM_ROADMAP.md)**: Detailed plan for completing the whitepaper implementation in vertical slices

### Model Overview

The simulation implements the model from the whitepaper (`docs/cod_matchmaking_model.md`), which is based on Call of Duty matchmaking research whitepapers.

**Current Implementation Status**: **Stages 1-3 Complete** (full agent-based model with all core features). See `docs/COD_MM_ROADMAP.md` for detailed status.

**Completed Slices** (Phases 1-4):
- ✅ **Slice A**: Parties & Multi-Player Search Objects
- ✅ **Slice B**: Matchmaking Constraints & Backoff Refinement
- ✅ **Slice C**: Team Balancing & Blowout Modeling
- ✅ **Slice D**: Performance Model & Skill Evolution
- ✅ **Slice E**: Satisfaction, Continuation, and Retention Modeling
- ✅ **Slice F**: Region/DC Graph & Regional Metrics
- ✅ **Slice G**: Frontend Experiment Runner & Visualizations

**Optional Future Work**:
- Slice H: Aggregate/Reduced Model for massive-scale simulations (Stage 4)

**Key Components** (All Implemented):
- ✅ **Player State Machine**: `OFFLINE → IN_LOBBY → SEARCHING → IN_MATCH → (IN_LOBBY | OFFLINE)`
- ✅ **Distance Metric**: `D(j,k) = α_geo·d_geo + α_skill·d_skill + α_input·d_input + α_platform·d_platform`
- ✅ **Backoff Functions**: `f_conn(w) = min(δ_init + δ_rate·w, δ_max)`, `f_skill(w) = min(σ_init + σ_rate·w, σ_max)`
- ✅ **Team Balancing**: Exact partitioning (small playlists) and snake draft (large playlists)
- ✅ **Match Outcomes**: Configurable win probability `P(A wins) = σ(γ·(S_A - S_B))` with blowout severity classification
- ✅ **Skill Evolution**: Performance-based skill updates `s_i^+ = s_i^- + α(ŷ_i - E[Y_i])`
- ✅ **Retention Model**: Logistic-based continuation and return probability with experience vectors
- ✅ **Regional Analysis**: Region adjacency graph with region-aware backoff and per-region metrics

**Whitepaper Mapping**:
- Section 2.1-2.7 → `src/types.rs` (state & variables) ✅
- Section 3.1-3.5 → `src/matchmaker.rs` (matchmaking algorithm) ✅
- Section 3.6-3.8 → `src/simulation.rs` (outcomes, retention, skill evolution) ✅
- Section 6.x → Various (treatment of CoD variables) ✅
- Section 7 → `docs/COD_MM_ROADMAP.md` (build order - Stages 1-3 complete)

## 🤝 Contributing

The core agent-based model (Stages 1-3) is complete. Potential extensions include:

- **Aggregate Model** (Slice H): Implement reduced/ODE model for massive-scale simulations
- **Additional Playlists/Modes**: New game modes with different team sizes and rules
- **Enhanced Skill Models**: More sophisticated skill evolution or multiple skill dimensions
- **Server Capacity Dynamics**: Model server capacity constraints and scaling
- **Map Diversity**: Track map rotation and diversity preferences
- **Input Device Crossplay**: Enhanced cross-input device penalty modeling

See `docs/COD_MM_ROADMAP.md` for detailed implementation guidance.

## 📄 License

MIT License - Use freely for research and development.
