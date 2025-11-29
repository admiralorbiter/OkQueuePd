# Interpreting Simulation Results

This guide helps you understand and interpret the metrics produced by the OkQueuePD matchmaking simulation. Use this document to evaluate experiment outcomes, identify configuration issues, and understand what "good" results look like.

**Related Documentation:**
- [Model Variables Reference](MODEL_VARIABLES.md) - Parameter documentation and tuning guidelines
- [Mathematical Model](cod_matchmaking_model.md) - Full mathematical specification
- [Glossary](GLOSSARY.md) - Definitions of technical terms

---

## Introduction

The simulation produces a wide variety of metrics that capture different aspects of matchmaking quality, player experience, and system health. This guide explains:

- What each metric means
- How to interpret its values
- What indicates good vs. problematic results
- How metrics relate to each other

On the web UI, these metrics surface in three main places on the experiment details page:
- **Key Metrics chart** – shows a small set of high-signal metrics (search time, delta ping, skill disparity, blowout rate) vs. the swept parameter.
- **Results table** – mirrors those key metrics as a per-run table for quick inspection.
- **Detailed Metrics table** – dynamically shows *all* additional metric fields that were collected when **Collect Detailed Metrics** was enabled (including retention metrics, percentile stats, regional aggregates, etc.). If no extra fields exist for a given experiment, this section is hidden.

**Key Principles:**
- **No single metric tells the whole story** - Always consider multiple metrics together
- **Context matters** - Good values depend on your configuration and goals
- **Tradeoffs are inherent** - Improving one metric often degrades another
- **Distribution matters** - Percentiles (P50, P90, P99) reveal more than averages

---

## Core Matchmaking Metrics

These metrics directly measure the matchmaking process and connection quality.

### Search Time

**What it measures:** Time from when a player starts searching until they are matched (in seconds).

**Metrics available:**
- **Average (Mean)**: Overall average search time
- **P50 (Median)**: Half of players wait less than this
- **P90**: 90% of players wait less than this
- **P99**: 99% of players wait less than this

**How to interpret:**

| Metric | Good | Acceptable | Problematic |
|--------|------|------------|-------------|
| P50 | < 15s | 15-30s | > 30s |
| P90 | < 45s | 45-90s | > 90s |
| P99 | < 120s | 120-180s | > 180s |

**By skill bucket:**
- **Low skill (buckets 1-2)**: Should have fast search times (high population density)
- **Mid skill (buckets 5-6)**: Typically fastest (largest population)
- **High skill (buckets 9-10)**: May have longer search times (smaller population)

**By region:**
- **High-population regions** (NA, EU): Should have shorter search times
- **Low-population regions** (APAC, SA): May have longer search times, especially for extreme skill buckets

**Red flags:**
- P99 > 180s consistently indicates insufficient population or overly strict constraints
- Large gap between P50 and P99 (> 3x) suggests some players are waiting excessively
- Extreme skill buckets (1, 10) with P90 > 120s may need looser constraints

**What to check:**
- If search times are too high: Consider increasing backoff rates (`deltaPingRate`, `skillSimilarityRate`)
- If search times vary dramatically by bucket: May need bucket-specific tuning
- If regional differences are extreme: Consider per-region configuration overrides

---

### Delta Ping

**What it measures:** Additional latency penalty vs. the player's best data center (in milliseconds).

**Metrics available:**
- **Average**: Mean delta ping across all matches
- **P50**: Median delta ping
- **P90**: 90th percentile delta ping

**How to interpret:**

| Metric | Excellent | Good | Acceptable | Problematic |
|--------|-----------|------|------------|-------------|
| Average | < 10ms | 10-25ms | 25-50ms | > 50ms |
| P90 | < 30ms | 30-60ms | 60-100ms | > 100ms |

**What good looks like:**
- Most players (P50) should have delta ping < 20ms
- Even long-waiting players (P90) should rarely exceed 50ms
- Average delta ping should be well below `deltaPingMax` (default 100ms)

**By region:**
- **High-population regions**: Should have lower delta ping (more local matches)
- **Low-population regions**: May have higher delta ping due to cross-region matching

**Red flags:**
- Average delta ping approaching `deltaPingMax` indicates most players are hitting backoff limits
- P90 > 80ms suggests many players are being matched to distant data centers
- Large gap between P50 and P90 (> 40ms) indicates inconsistent connection quality

**What to check:**
- If delta ping is too high: Decrease `deltaPingRate` or increase `deltaPingInitial` to maintain quality longer
- If delta ping varies dramatically by region: Consider per-region `deltaPingInitial` overrides
- If delta ping increases rapidly over time: `deltaPingRate` may be too aggressive

---

### Skill Disparity

**What it measures:** The spread of skill levels within a lobby (difference between highest and lowest skill percentile).

**Metrics available:**
- **Average**: Mean skill disparity across all matches
- **Distribution**: Histogram of skill disparity values

**How to interpret:**

| Average Disparity | Interpretation |
|-------------------|----------------|
| < 0.1 (10 percentile units) | Very tight skill matching |
| 0.1 - 0.2 | Good skill matching |
| 0.2 - 0.3 | Acceptable skill spread |
| 0.3 - 0.5 | Wide skill spread (may cause blowouts) |
| > 0.5 | Very wide spread (likely unfair matches) |

**What good looks like:**
- Average disparity should be well below `maxSkillDisparityMax` (default 0.8)
- Most matches should have disparity < 0.3
- Distribution should be centered around 0.15-0.25 for balanced matchmaking

**By skill bucket:**
- **Mid-skill buckets**: Should have lower disparity (more similar players available)
- **Extreme buckets**: May have higher disparity due to smaller population

**Red flags:**
- Average disparity > 0.4 suggests skill constraints are too loose
- Distribution heavily skewed toward high values (> 0.5) indicates poor skill matching
- Disparity increasing over time suggests backoff is too aggressive

**What to check:**
- If disparity is too high: Decrease `maxSkillDisparityMax` or `maxSkillDisparityRate`
- If disparity is too low but search times are high: May need to increase `maxSkillDisparityInitial`
- If disparity varies dramatically by bucket: Consider bucket-specific analysis

---

## Match Quality Metrics

These metrics measure the fairness and balance of matches.

### Blowout Rate

**What it measures:** Percentage of matches classified as "blowouts" (unbalanced matches) with severity classification.

**Metrics available:**
- **Overall blowout rate**: Percentage of all matches that are blowouts
- **Severity breakdown**: Counts of Mild, Moderate, Severe blowouts
- **Per-playlist blowout rate**: Blowout rate by game mode

**How to interpret:**

| Blowout Rate | Interpretation |
|--------------|----------------|
| < 5% | Excellent match quality |
| 5-10% | Good match quality |
| 10-20% | Acceptable (mostly mild blowouts) |
| 20-30% | Problematic (many moderate blowouts) |
| > 30% | Poor match quality (many severe blowouts) |

**Severity breakdown:**
- **Mild blowouts** (< 15% of matches): Minor imbalances, generally acceptable
- **Moderate blowouts** (5-10% of matches): Noticeable skill gaps, may cause frustration
- **Severe blowouts** (< 5% of matches): Significant imbalances, likely to cause player dissatisfaction

**What good looks like:**
- Overall blowout rate < 15%
- Severe blowouts should be < 3% of all matches
- Most blowouts should be Mild severity
- Blowout rate should be relatively stable across playlists

**By playlist:**
- **Small playlists** (6v6): Should have lower blowout rates (exact team balancing available)
- **Large playlists** (Ground War): May have slightly higher blowout rates

**Red flags:**
- Blowout rate > 25% indicates significant matchmaking quality issues
- Severe blowouts > 5% suggests team balancing or skill matching is failing
- Blowout rate increasing over time suggests skill evolution or population changes are degrading match quality

**What to check:**
- If blowout rate is too high: Increase `qualityWeightSkillBalance`, enable `useExactTeamBalancing`, or tighten skill constraints
- If severe blowouts are common: Check team balancing algorithm and skill disparity settings
- If blowout rate varies by playlist: May need playlist-specific tuning

---

### Team Skill Difference

**What it measures:** The absolute difference in total team skill between the two teams in a match.

**Metrics available:**
- **Distribution**: Histogram of team skill differences
- **Average**: Mean team skill difference

**How to interpret:**

| Team Skill Difference | Interpretation |
|----------------------|----------------|
| < 0.1 | Very balanced teams |
| 0.1 - 0.2 | Well-balanced teams |
| 0.2 - 0.3 | Acceptable balance |
| 0.3 - 0.5 | Noticeable imbalance |
| > 0.5 | Significant imbalance (likely blowout) |

**What good looks like:**
- Distribution should be centered near 0.15-0.25
- Most matches should have team skill difference < 0.3
- Distribution should be roughly symmetric (no systematic bias toward one team)

**Red flags:**
- Average team skill difference > 0.4 suggests team balancing is failing
- Distribution heavily skewed toward high values indicates poor team balancing
- Large variance in team skill difference suggests inconsistent balancing quality

**What to check:**
- If team skill difference is too high: Enable `useExactTeamBalancing` for small playlists, or check party constraints
- If distribution is asymmetric: May indicate a bug in team balancing algorithm
- If team skill difference correlates with blowout rate: Team balancing is a key factor

---

### Match Quality Score

**What it measures:** A composite score combining ping quality, skill balance, and wait time fairness (higher is better).

**Metrics available:**
- **Average match quality**: Mean quality score across all matches

**How to interpret:**

| Average Quality Score | Interpretation |
|---------------------|----------------|
| > 0.8 | Excellent match quality |
| 0.6 - 0.8 | Good match quality |
| 0.4 - 0.6 | Acceptable quality |
| < 0.4 | Poor match quality |

**Note:** The quality score is relative and depends on your weight configuration (`qualityWeightPing`, `qualityWeightSkillBalance`, `qualityWeightWaitTime`). Use it for comparing configurations rather than as an absolute measure.

**What good looks like:**
- Quality score should be relatively stable over time
- Quality score should correlate inversely with blowout rate
- Quality score should be higher when constraints are tighter (but search times may increase)

**Red flags:**
- Quality score decreasing over time suggests matchmaking is degrading
- Quality score < 0.3 indicates fundamental matchmaking issues
- Large variance in quality score suggests inconsistent match quality

---

## Player Dynamics Metrics

These metrics track how players evolve and how their behavior changes over time.

### Skill Evolution

**What it measures:** How player skill distributions change over time based on match performance.

**Metrics available:**
- **Skill distribution over time**: Time series of mean skill per bucket
- **Skill drift metrics**: Average change, most improved/declined buckets
- **Total skill updates**: Number of skill updates applied

**How to interpret:**

**Distribution stability:**
- **Stable distribution**: Mean skill per bucket remains relatively constant over time
- **Gradual drift**: Slow, consistent changes (e.g., players improving over time)
- **Volatile distribution**: Rapid, unpredictable changes (may indicate `skillLearningRate` too high)

**What good looks like:**
- Skill distribution should evolve gradually, not dramatically
- Most buckets should show small changes (< 0.05 percentile units per 100 matches)
- High-skill buckets should remain high, low-skill buckets should remain low (relative ordering preserved)

**Red flags:**
- Skill distribution collapsing (all players converging to one skill level) suggests `skillLearningRate` too high
- Skill distribution expanding dramatically suggests performance model is too noisy
- Buckets swapping positions frequently indicates unstable skill estimation

**What to check:**
- If skill distribution is too volatile: Decrease `skillLearningRate` (try 0.005 instead of 0.01)
- If skill distribution is too static: Increase `skillLearningRate` or check if `enableSkillEvolution` is on
- If skill drift is asymmetric: Check performance model and win probability settings

---

### Performance Distribution

**What it measures:** Distribution of per-match performance indices (how well players performed relative to skill-based expectations).

**Metrics available:**
- **Distribution histogram**: Frequency of different performance values
- **Average performance**: Mean performance index

**How to interpret:**

**Expected patterns:**
- Distribution should be roughly centered around 0 (performance matches expectation)
- Distribution should be approximately normal (bell curve)
- Standard deviation should match `performanceNoiseStd` (default 0.15)

**What good looks like:**
- Most players should have performance indices between -0.3 and +0.3
- Distribution should be symmetric (no systematic bias)
- Outliers (> 0.5 or < -0.5) should be rare (< 5% of matches)

**Red flags:**
- Distribution heavily skewed toward positive values suggests skill estimates are too low
- Distribution heavily skewed toward negative values suggests skill estimates are too high
- Distribution too narrow suggests `performanceNoiseStd` is too low (unrealistic)
- Distribution too wide suggests `performanceNoiseStd` is too high or skill estimates are poor

**What to check:**
- If distribution is skewed: Adjust `skillLearningRate` or check win probability model
- If distribution is too narrow/wide: Adjust `performanceNoiseStd` to match expected game variance
- If outliers are common: Check for bugs in performance model or skill update logic

---

### Retention Metrics

**What it measures:** How likely players are to continue playing after matches and return for future sessions.

**Metrics available:**
- **Continuation rate**: Percentage of players who play another match after completing one
- **Return rate**: Percentage of offline players who return for a new session
- **Matches per session**: Average number of matches per player session
- **Effective population**: Number of concurrently active players
- **Population change rate**: Rate of change of effective population (players per second)

**How to interpret:**

**Continuation rate:**
- **Good**: > 60% of players continue after a match
- **Acceptable**: 50-60% continuation rate
- **Problematic**: < 50% continuation rate

**Return rate:**
- **Good**: > 40% of offline players return within reasonable time
- **Acceptable**: 30-40% return rate
- **Problematic**: < 30% return rate

**Matches per session:**
- **Good**: > 3 matches per session on average
- **Acceptable**: 2-3 matches per session
- **Problematic**: < 2 matches per session

**Effective population:**
- Should be relatively stable over time (not declining rapidly)
- Should correlate with total population size
- Declining effective population indicates churn is exceeding new arrivals

**Population change rate:**
- **Positive** (> 0): Population is growing (good for long-term health)
- **Near zero** (-0.1 to +0.1): Population is stable
- **Negative** (< -0.1): Population is shrinking (concerning)

**By skill bucket:**
- **Mid-skill buckets**: Should have higher continuation and return rates (better match quality)
- **Extreme skill buckets**: May have lower retention (longer search times, more blowouts)

**Red flags:**
- Continuation rate < 40% suggests players are having poor experiences
- Population change rate < -0.5 players/second indicates significant churn
- Effective population declining > 10% over 1000 ticks suggests retention model issues
- Large differences in retention by skill bucket (> 20 percentage points) indicates fairness issues

**What to check:**
- If continuation rate is too low: Check blowout rate, search times, and delta ping (these drive retention)
- If population is declining: Review retention model coefficients (`retentionConfig`) and match quality metrics
- If retention varies dramatically by bucket: May need bucket-specific tuning or investigate match quality by bucket

---

## Regional Metrics

These metrics track matchmaking behavior across different geographic regions.

### Per-Region Metrics

**What it measures:** Search times, delta ping, blowout rates, and active matches broken down by region.

**Metrics available:**
- **Search time by region**: Average and percentiles per region
- **Delta ping by region**: Average delta ping per region
- **Blowout rate by region**: Percentage of blowouts per region
- **Active matches by region**: Number of concurrent matches per region
- **Player count by region**: Number of players per region

**How to interpret:**

**Regional balance:**
- **Balanced**: All regions have similar search times and delta ping
- **Imbalanced**: Some regions have significantly worse metrics than others

**What good looks like:**
- Search time differences between regions should be < 20 seconds
- Delta ping differences should be < 15ms between regions
- All regions should have similar blowout rates (< 5 percentage point difference)
- Active matches should be proportional to player count per region

**Red flags:**
- One region with search time > 2x other regions indicates population imbalance
- Low-population regions with delta ping > 50ms suggests excessive cross-region matching
- Regions with blowout rate > 20% while others are < 10% suggests regional configuration issues

**What to check:**
- If regional differences are extreme: Consider per-region configuration overrides (see `MODEL_VARIABLES.md`)
- If low-population regions struggle: May need to adjust `deltaPingRate` or `skillSimilarityRate` for those regions
- If cross-region matching is excessive: Review region adjacency graph and backoff thresholds

---

### Cross-Region Match Rate

**What it measures:** Percentage of matches that include players from multiple regions.

**Metrics available:**
- **Cross-region match rate**: Overall percentage of cross-region matches

**How to interpret:**

| Cross-Region Rate | Interpretation |
|-------------------|----------------|
| < 5% | Mostly local matching (ideal) |
| 5-15% | Some cross-region matching (acceptable) |
| 15-30% | Significant cross-region matching (may indicate population issues) |
| > 30% | Excessive cross-region matching (likely problematic) |

**What good looks like:**
- Cross-region rate should be low (< 10%) for high-population regions
- Cross-region rate may be higher for low-population regions (acceptable)
- Cross-region matches should primarily occur after longer search times (backoff working)

**Red flags:**
- Cross-region rate > 25% for high-population regions suggests configuration issues
- Cross-region matches occurring at short search times (< 15s) suggests backoff is too aggressive
- Cross-region rate increasing over time suggests population is declining

**What to check:**
- If cross-region rate is too high: Review region-aware backoff thresholds and `deltaPingInitial` settings
- If cross-region matches happen too early: Increase backoff wait time thresholds
- If cross-region rate is necessary but causing issues: Consider per-region `maxPing` overrides

---

## Party Metrics

These metrics track how parties affect matchmaking.

### Solo vs Party Search Times

**What it measures:** Comparison of search times for solo players vs. players in parties.

**Metrics available:**
- **Solo search times**: Average and distribution for solo players
- **Party search times**: Average and distribution for party players
- **Party size distribution**: How many parties of each size exist

**How to interpret:**

**Expected patterns:**
- **Solo players**: Should have faster search times (more flexible matching)
- **Small parties (2-3 players)**: May have slightly longer search times
- **Large parties (4+ players)**: Should have longer search times (harder to find compatible matches)

**What good looks like:**
- Solo search time should be < 20s on average
- Party search time should be < 30s on average for small parties
- Search time difference between solo and parties should be < 15s
- Party size distribution should match `partyPlayerFraction` configuration

**Red flags:**
- Party search time > 2x solo search time suggests party matching is too constrained
- Large parties (4+) with search time > 60s may indicate insufficient population for party sizes
- Solo search time > party search time (unexpected) suggests a bug or configuration issue

**What to check:**
- If party search times are too high: Review party integrity constraints and skill similarity settings
- If party size distribution is unexpected: Check `partyPlayerFraction` and party generation logic
- If solo vs party difference is extreme: May need to adjust distance metric weights for parties

---

## Red Flags: Warning Signs

These patterns indicate configuration issues or simulation problems that need attention.

### Search Time Issues

- **P99 > 180s consistently**: Population too small or constraints too strict
- **Large gap P50 vs P99 (> 3x)**: Some players waiting excessively, may need better backoff
- **Search time increasing over time**: Population declining or constraints tightening
- **Extreme skill buckets with P90 > 120s**: Need looser constraints for those buckets

### Connection Quality Issues

- **Average delta ping > 50ms**: Most players hitting backoff limits, connection quality degraded
- **P90 delta ping > 80ms**: Many players matched to distant data centers
- **Delta ping increasing rapidly**: `deltaPingRate` too aggressive

### Match Quality Issues

- **Blowout rate > 25%**: Significant matchmaking quality problems
- **Severe blowouts > 5%**: Team balancing or skill matching failing
- **Blowout rate increasing over time**: Skill evolution or population changes degrading quality

### Retention Issues

- **Continuation rate < 40%**: Players having poor experiences
- **Population change rate < -0.5**: Significant churn, population declining
- **Effective population declining > 10%**: Retention model or match quality issues

### Regional Issues

- **One region with search time > 2x others**: Population imbalance
- **Cross-region rate > 30%**: Excessive cross-region matching, likely problematic
- **Regional blowout rate differences > 10 percentage points**: Regional configuration issues

### Skill Evolution Issues

- **Skill distribution collapsing**: `skillLearningRate` too high
- **Skill distribution expanding dramatically**: Performance model too noisy
- **Buckets swapping positions**: Unstable skill estimation

---

## Example Interpretations

### Scenario 1: Tight SBMM Configuration

**Configuration:** `skillSimilarityInitial = 0.02`, `skillSimilarityRate = 0.005`

**Results:**
- Search time P50: 25s, P90: 95s, P99: 180s
- Average delta ping: 12ms
- Average skill disparity: 0.08
- Blowout rate: 8% (mostly mild)
- Continuation rate: 65%

**Interpretation:**
- **Good**: Excellent skill matching (low disparity), good connection quality, acceptable blowout rate
- **Tradeoff**: Longer search times, especially for extreme skill buckets (P99 = 180s)
- **Verdict**: Good configuration for prioritizing match quality over speed. Consider slightly increasing `skillSimilarityRate` if P99 search times are problematic.

### Scenario 2: Loose SBMM Configuration

**Configuration:** `skillSimilarityInitial = 0.15`, `skillSimilarityRate = 0.03`

**Results:**
- Search time P50: 8s, P90: 20s, P99: 45s
- Average delta ping: 18ms
- Average skill disparity: 0.35
- Blowout rate: 22% (5% moderate, 2% severe)
- Continuation rate: 52%

**Interpretation:**
- **Good**: Very fast search times, good connection quality
- **Problematic**: High blowout rate, wide skill disparity, lower continuation rate
- **Verdict**: Configuration prioritizes speed over quality. Blowout rate > 20% and continuation rate < 55% suggest players are having poor experiences. Consider tightening skill constraints.

### Scenario 3: Regional Population Imbalance

**Configuration:** Default settings, but NA has 70% of population, APAC has 5%

**Results:**
- NA search time P90: 25s, APAC search time P90: 120s
- NA delta ping P90: 15ms, APAC delta ping P90: 65ms
- Cross-region match rate: 18%
- APAC blowout rate: 28%, NA blowout rate: 12%

**Interpretation:**
- **Good**: NA region performing well
- **Problematic**: APAC region struggling with long search times, high delta ping, high blowout rate
- **Verdict**: Low-population region needs per-region configuration overrides. Consider increasing `deltaPingInitial` and `skillSimilarityInitial` for APAC to improve matchmaking speed, or accept higher cross-region matching.

### Scenario 4: Skill Evolution Enabled

**Configuration:** `enableSkillEvolution = true`, `skillLearningRate = 0.01`

**Results (after 1000 ticks):**
- Skill distribution: Stable, gradual improvement in mid-skill buckets
- Blowout rate: Started at 12%, now 9% (improving)
- Search time: Stable (P90 = 35s)
- Continuation rate: 58% (stable)

**Interpretation:**
- **Good**: Skill evolution working as expected, match quality improving over time
- **Stable**: No concerning trends, system is self-improving
- **Verdict**: Skill evolution is beneficial. Consider monitoring for longer runs to ensure stability.

---

## Best Practices for Interpretation

1. **Look at multiple metrics together** - No single metric tells the whole story
2. **Consider percentiles, not just averages** - P90 and P99 reveal tail behavior
3. **Compare across skill buckets** - Extreme buckets may need different evaluation
4. **Track trends over time** - Is the system improving or degrading?
5. **Compare to baseline** - Use default configuration as a reference point
6. **Consider tradeoffs** - Faster search times often mean worse match quality
7. **Validate with experiments** - Run multiple seeds to check consistency
8. **Check regional differences** - Low-population regions may need different standards

---

## Related Documentation

- **[Model Variables Reference](MODEL_VARIABLES.md)**: Detailed parameter documentation and tuning guidelines
- **[Mathematical Model](cod_matchmaking_model.md)**: Full mathematical specification of the simulation
- **[Glossary](GLOSSARY.md)**: Definitions of technical terms used in this guide
- **[README](../README.md)**: Project overview and quick start guide

