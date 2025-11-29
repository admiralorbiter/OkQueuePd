# Glossary

Definitions of technical terms used throughout the OkQueuePD matchmaking simulation documentation.

**Related Documentation:**
- [Interpreting Results](INTERPRETING_RESULTS.md) - Guide to understanding simulation metrics
- [Model Variables Reference](MODEL_VARIABLES.md) - Parameter documentation
- [Mathematical Model](cod_matchmaking_model.md) - Full mathematical specification

---

## A

### Agent-Based Simulation

A simulation approach where individual entities (agents) are modeled with their own state and behavior. In OkQueuePD, each player is an agent with attributes like skill, location, and preferences. The simulation tracks each player's state transitions (OFFLINE → IN_LOBBY → SEARCHING → IN_MATCH) and interactions.

**Related terms:** Player, State Machine

**See also:** [Mathematical Model §2.5](cod_matchmaking_model.md#25-player-activity-state-machine)

---

## B

### Backoff Curve / Backoff Function

A function that relaxes matchmaking constraints over time as players wait longer. The simulation uses two main backoff functions:

- **Connection backoff**: `f_conn(w) = min(δ_init + δ_rate·w, δ_max)` - Increases delta ping tolerance
- **Skill backoff**: `f_skill(w) = min(σ_init + σ_rate·w, σ_max)` - Increases skill similarity tolerance

Where `w` is wait time in seconds. This allows the matchmaker to gradually expand the search space for players who have been waiting.

**Related terms:** Delta Ping, Skill Similarity, Wait Time

**See also:** [Model Variables - Connection Parameters](MODEL_VARIABLES.md#connection--ping-parameters), [Mathematical Model §2.3](cod_matchmaking_model.md#23-player-dc-connectivity-and-ping)

---

### Blowout

An unbalanced match where one team has a significant advantage over the other, typically resulting in a one-sided outcome. Blowouts are classified by severity:

- **Mild**: Minor skill imbalances, generally acceptable
- **Moderate**: Noticeable skill gaps, may cause frustration
- **Severe**: Significant imbalances, likely to cause player dissatisfaction

Blowout detection uses a combination of team skill difference and win probability imbalance.

**Related terms:** Team Skill Difference, Win Probability, Blowout Severity

**See also:** [Model Variables - Blowout Detection](MODEL_VARIABLES.md#blowout-detection-parameters), [Interpreting Results - Blowout Rate](INTERPRETING_RESULTS.md#blowout-rate)

---

## C

### Continuation Probability

The probability that a player will play another match after completing one, calculated using a logistic model based on their recent experience vector (delta ping, search time, blowout rate, win rate, performance).

**Related terms:** Retention Model, Return Probability, Experience Vector

**See also:** [Model Variables - Retention Model](MODEL_VARIABLES.md#retention-model-parameters), [Mathematical Model §3.8](cod_matchmaking_model.md#38-player-satisfaction-and-churn)

---

### Cross-Region Match

A match that includes players from multiple geographic regions. Cross-region matches occur when the matchmaker expands the search to adjacent or all regions after backoff, typically to reduce search times for low-population regions.

**Related terms:** Region, Region Adjacency, Delta Ping

**See also:** [Interpreting Results - Cross-Region Match Rate](INTERPRETING_RESULTS.md#cross-region-match-rate)

---

## D

### Data Center (DC)

A physical server location that hosts game matches. Each data center has a geographic location and serves players in nearby regions. Players have ping measurements to all data centers, and the matchmaker selects a data center for each match based on player locations and ping constraints.

**Related terms:** Region, Ping, Delta Ping

**See also:** [Mathematical Model §2.3](cod_matchmaking_model.md#23-player-dc-connectivity-and-ping)

---

### Delta Ping

The additional latency penalty a player experiences when matched to a data center that is not their best (lowest ping) option. Calculated as: `Δp_i = p_{i,DC} - p_i*` where `p_i*` is the player's best ping.

Delta ping is a key metric for connection quality - lower is better. The matchmaker uses delta ping constraints with backoff to balance connection quality vs. search time.

**Related terms:** Ping, Data Center, Backoff Curve

**See also:** [Model Variables - Delta Ping Parameters](MODEL_VARIABLES.md#connection--ping-parameters), [Interpreting Results - Delta Ping](INTERPRETING_RESULTS.md#delta-ping)

---

### Distance Metric

A function `D(j,k)` that measures the "distance" or compatibility between two search objects (parties or solo players). The distance metric combines:

- Geographic distance (ping/latency)
- Skill difference
- Input device mismatch penalty
- Platform mismatch penalty

Lower distance indicates better compatibility. The matchmaker uses this metric to find candidate matches during the seed + greedy algorithm.

**Related terms:** Search Object, Seed + Greedy Algorithm, Weight Parameters

**See also:** [Model Variables - Distance Metric Weights](MODEL_VARIABLES.md#distance-metric-weights), [Mathematical Model §3.1](cod_matchmaking_model.md#31-candidate-distance-between-searches)

---

## E

### Effective Population

The number of concurrently active players (those in IN_LOBBY, SEARCHING, or IN_MATCH states) at a given time. This metric tracks population health over time and is used to measure churn and retention.

**Related terms:** Population Change Rate, Churn Rate, Retention

**See also:** [Interpreting Results - Retention Metrics](INTERPRETING_RESULTS.md#retention-metrics)

---

### Experience Vector

A vector of recent match experiences used to calculate retention probabilities. The experience vector includes:

- Average delta ping
- Average search time
- Blowout rate
- Win rate
- Average performance index

The retention model uses a logistic function with these experience components to predict whether a player will continue playing.

**Related terms:** Retention Model, Continuation Probability, Performance Index

**See also:** [Model Variables - Retention Model](MODEL_VARIABLES.md#retention-model-parameters), [Mathematical Model §3.8](cod_matchmaking_model.md#38-player-satisfaction-and-churn)

---

## F

### Feasibility Constraints

The set of conditions that must be satisfied for a match to be formed. The simulation checks six feasibility constraints:

1. Playlist compatibility (all searches want the same playlist)
2. Lobby size constraint (total players = required match size)
3. Skill similarity (lobby skill range within each search's acceptable range)
4. Skill disparity (lobby skill spread within each search's maximum disparity)
5. Data center intersection (at least one DC acceptable to all players)
6. Server capacity (at least one free server available)

**Related terms:** Matchmaking Algorithm, Quality Score

**See also:** [Mathematical Model §3.3](cod_matchmaking_model.md#33-feasibility-constraints-for-forming-a-match)

---

## G

### Greedy Matching / Seed + Greedy Algorithm

The matchmaking algorithm used to form matches. The algorithm:

1. Selects seed searches (starting points)
2. For each seed, finds top-K candidate neighbors by distance metric
3. Greedily adds candidates to form a match, checking feasibility and quality
4. Commits the best match found

This approximates the heuristic described in Call of Duty matchmaking whitepapers.

**Related terms:** Distance Metric, Feasibility Constraints, Quality Score

**See also:** [Mathematical Model §3.5](cod_matchmaking_model.md#35-greedy-match-construction)

---

## K

### Karmarkar-Karp Partitioning

An algorithm for optimally partitioning a set of items (with weights) into two groups to minimize the difference between group sums. Used in the simulation for exact team balancing in small playlists (6v6), ensuring parties stay intact while minimizing team skill difference.

**Related terms:** Team Balancing, Party, Exact Team Balancing

**See also:** [Model Variables - Team Balancing](MODEL_VARIABLES.md#team-balancing--win-probability-parameters), [Mathematical Model §3.6](cod_matchmaking_model.md#36-team-balancing-inside-a-lobby)

---

## L

### Lobby

The group of players (or parties) that are matched together for a game. Once a lobby is formed, teams are balanced and the match begins. The lobby size is determined by the playlist (e.g., 12 players for 6v6 TDM).

**Related terms:** Match, Playlist, Team Balancing

**See also:** [Mathematical Model §2.6](cod_matchmaking_model.md#26-playlists-match-sizes-and-servers)

---

## M

### Match Quality Score

A composite score `Q(M)` that evaluates the quality of a potential match, combining:

- Ping quality (inverse of average delta ping)
- Skill balance (inverse of team skill difference)
- Wait time fairness (prioritizes long-waiting players)

The matchmaker uses this score to choose among multiple feasible matches. Higher scores indicate better matches.

**Related terms:** Quality Score Weights, Feasibility Constraints

**See also:** [Model Variables - Quality Score Weights](MODEL_VARIABLES.md#quality-score-weights), [Mathematical Model §3.4](cod_matchmaking_model.md#34-quality-score-for-candidate-matches)

---

## P

### Percentile (Skill Percentile)

A normalized skill value between 0 and 1 that represents a player's rank in the skill distribution. A percentile of 0.9 means the player is in the top 10% of all players. Skill percentiles are used for:

- Skill bucket assignment
- Skill similarity constraints
- Skill disparity calculations

Percentiles are recalculated periodically as skills evolve.

**Related terms:** Skill Bucket, Skill Evolution, Raw Skill

**See also:** [Mathematical Model §2.4](cod_matchmaking_model.md#24-skill-model)

---

### Performance Index

A normalized measure of how well a player performed in a match relative to skill-based expectations. Calculated as: `performance = (actual_performance - expected_performance) / expected_performance`.

Positive values indicate better-than-expected performance, negative values indicate worse. The performance index is used for skill updates and is included in the experience vector for retention calculations.

**Related terms:** Skill Evolution, Experience Vector, Expected Performance

**See also:** [Model Variables - Skill Evolution](MODEL_VARIABLES.md#skill-evolution-parameters), [Mathematical Model §3.7](cod_matchmaking_model.md#37-match-outcome-and-skill-update)

---

### Ping

Round-trip latency (in milliseconds) from a player's location to a data center. Lower ping indicates better connection quality. Players measure ping to all data centers, and the matchmaker uses these measurements to select appropriate data centers for matches.

**Related terms:** Delta Ping, Data Center, Connection Quality

**See also:** [Mathematical Model §2.3](cod_matchmaking_model.md#23-player-dc-connectivity-and-ping)

---

### Playlist

A game mode or match type (e.g., Team Deathmatch, Search & Destroy, Domination). Each playlist has:

- Required lobby size (e.g., 12 for 6v6)
- Team configuration (2 teams, 3 squads, etc.)
- Typical match length

Players can search for multiple playlists simultaneously (Quick Play), and the matchmaker selects a playlist that maximizes overlap among matched players.

**Related terms:** Lobby, Match, Quick Play

**See also:** [Mathematical Model §2.6](cod_matchmaking_model.md#26-playlists-match-sizes-and-servers)

---

### Population Change Rate

The rate of change of effective population over time, measured in players per second. Positive values indicate population growth, negative values indicate population decline (churn). This metric tracks long-term population health.

**Related terms:** Effective Population, Churn Rate, Retention

**See also:** [Interpreting Results - Retention Metrics](INTERPRETING_RESULTS.md#retention-metrics)

---

## R

### Region

A geographic area containing multiple data centers. The simulation defines five regions:

- North America (NA)
- Europe (EU)
- Asia Pacific (APAC)
- South America (SA)
- Other

Regions have an adjacency graph that determines which regions can be matched together during backoff. Players are assigned to regions based on their geographic location.

**Related terms:** Region Adjacency, Data Center, Cross-Region Match

**See also:** [Model Variables - Regional Configuration](MODEL_VARIABLES.md#regional-configuration-overrides), [Mathematical Model §2.3](cod_matchmaking_model.md#23-player-dc-connectivity-and-ping)

---

### Region Adjacency

The relationship between regions that determines which regions can be matched together during backoff. The simulation uses a three-tier backoff system:

1. Short wait: Only best region DCs
2. Medium wait: Best region + adjacent regions
3. Long wait: All regions

For example, North America is adjacent to Europe (transatlantic) and South America (Americas).

**Related terms:** Region, Backoff Curve, Cross-Region Match

**See also:** [Interpreting Results - Regional Metrics](INTERPRETING_RESULTS.md#regional-metrics)

---

### Return Probability

The probability that an offline player will return for a new session, calculated using the same logistic model as continuation probability but based on their last session's experience vector.

**Related terms:** Continuation Probability, Retention Model, Experience Vector

**See also:** [Model Variables - Retention Model](MODEL_VARIABLES.md#retention-model-parameters)

---

### Retention Model

A logistic regression model that predicts player retention (continuation and return) based on experience vectors. The model uses coefficients (θ) for:

- Delta ping (typically negative - high ping reduces retention)
- Search time (typically negative - long waits reduce retention)
- Blowout rate (typically negative - blowouts reduce retention)
- Win rate (typically positive - winning increases retention)
- Performance (typically positive - good performance increases retention)

**Related terms:** Continuation Probability, Return Probability, Experience Vector

**See also:** [Model Variables - Retention Model](MODEL_VARIABLES.md#retention-model-parameters), [Mathematical Model §3.8](cod_matchmaking_model.md#38-player-satisfaction-and-churn)

---

## S

### Search Object

An entity that the matchmaker operates on - either a solo player or a party searching for a match. Each search object has:

- Player set (one or more players)
- Average skill and skill disparity
- Location (average coordinates)
- Platform and input device composition
- Playlist preferences
- Search start time

The matchmaker attempts to combine search objects into matches.

**Related terms:** Party, Player, Matchmaking Algorithm

**See also:** [Mathematical Model §2.7](cod_matchmaking_model.md#27-search-objects-what-the-matchmaker-sees)

---

### Seed + Greedy Algorithm

See **Greedy Matching**.

---

### Skill Bucket

A discrete skill category used for analysis and tracking. Players are assigned to buckets based on skill percentile: `bucket = floor(B * percentile) + 1` where `B` is the number of buckets (default 10).

Buckets are numbered 1-10, where 1 is lowest skill and 10 is highest skill. Metrics are often tracked per bucket to analyze skill-based differences.

**Related terms:** Skill Percentile, Skill Disparity

**See also:** [Mathematical Model §2.4](cod_matchmaking_model.md#24-skill-model)

---

### Skill Disparity

The difference between the highest and lowest skill percentile in a lobby. Lower disparity indicates more balanced skill matching. The matchmaker enforces maximum skill disparity constraints that increase with wait time (backoff).

**Related terms:** Skill Similarity, Skill Percentile, Backoff Curve

**See also:** [Model Variables - Skill Disparity](MODEL_VARIABLES.md#skill-similarity--disparity-parameters), [Interpreting Results - Skill Disparity](INTERPRETING_RESULTS.md#skill-disparity)

---

### Skill Evolution

The process by which player skill estimates update over time based on match performance. The update rule is: `s_i^+ = s_i^- + α(ŷ_i - E[Y_i])` where:

- `s_i^+` is updated skill
- `s_i^-` is previous skill
- `α` is learning rate
- `ŷ_i` is actual performance
- `E[Y_i]` is expected performance

Skill percentiles are recalculated periodically to maintain consistency.

**Related terms:** Performance Index, Skill Learning Rate, Skill Percentile

**See also:** [Model Variables - Skill Evolution](MODEL_VARIABLES.md#skill-evolution-parameters), [Mathematical Model §3.7](cod_matchmaking_model.md#37-match-outcome-and-skill-update)

---

### Skill Similarity

The allowed range of skill percentiles around a player's skill when searching for matches. The similarity constraint defines: `[π̄_j - f_skill(w), π̄_j + f_skill(w)]` where `π̄_j` is the player's skill percentile and `f_skill(w)` is the skill backoff function.

Tighter similarity (smaller range) means better skill matching but potentially longer search times.

**Related terms:** Skill Disparity, Backoff Curve, Skill Percentile

**See also:** [Model Variables - Skill Similarity](MODEL_VARIABLES.md#skill-similarity--disparity-parameters), [Mathematical Model §2.7](cod_matchmaking_model.md#27-search-objects-what-the-matchmaker-sees)

---

## T

### Team Balancing

The process of dividing a lobby into teams while minimizing skill differences between teams. The simulation uses:

- **Exact partitioning** (Karmarkar-Karp style) for small playlists (6v6) - finds optimal balance
- **Snake draft** for large playlists - faster heuristic that approximates balance

Team balancing must respect party boundaries (parties cannot be split across teams).

**Related terms:** Party, Karmarkar-Karp Partitioning, Team Skill Difference

**See also:** [Model Variables - Team Balancing](MODEL_VARIABLES.md#team-balancing--win-probability-parameters), [Mathematical Model §3.6](cod_matchmaking_model.md#36-team-balancing-inside-a-lobby)

---

### Team Skill Difference

The absolute difference in total team skill between two teams in a match. Lower values indicate better team balance. This metric is used for blowout detection and match quality evaluation.

**Related terms:** Team Balancing, Blowout, Match Quality Score

**See also:** [Interpreting Results - Team Skill Difference](INTERPRETING_RESULTS.md#team-skill-difference)

---

### Tick / Tick Interval

A discrete time step in the simulation. Each tick represents `tickInterval` seconds (default 5.0 seconds). During each tick, the simulation:

1. Processes player arrivals
2. Processes search starts
3. Runs matchmaking
4. Creates matches
5. Processes match completions
6. Updates statistics

All time-based calculations (backoff, wait times) use seconds, but the simulation advances in ticks.

**Related terms:** Wait Time, Simulation Time

**See also:** [Model Variables - Matchmaking Algorithm](MODEL_VARIABLES.md#matchmaking-algorithm-parameters)

---

## W

### Wait Time

The time (in seconds) that a search object has been waiting for a match, calculated as: `wait_time = (current_tick - search_start_tick) * tick_interval`.

Wait time is used by backoff functions to gradually relax constraints. Longer wait times allow wider skill ranges and more distant data centers.

**Related terms:** Backoff Curve, Tick, Search Object

**See also:** [Model Variables - Backoff Parameters](MODEL_VARIABLES.md#connection--ping-parameters)

---

### Win Probability

The probability that a team will win a match, calculated using a logistic function: `P(A wins) = σ(γ·(S_A - S_B))` where:

- `S_A`, `S_B` are total team skills
- `γ` is the logistic coefficient (default 2.0)
- `σ` is the logistic function

Higher `γ` values make outcomes more deterministic (skill differences matter more). Win probability is used for blowout detection and match outcome determination.

**Related terms:** Team Skill Difference, Blowout, Gamma Parameter

**See also:** [Model Variables - Team Balancing](MODEL_VARIABLES.md#team-balancing--win-probability-parameters), [Mathematical Model §3.7](cod_matchmaking_model.md#37-match-outcome-and-skill-update)

---

## Related Documentation

- **[Interpreting Results](INTERPRETING_RESULTS.md)**: Guide to understanding simulation metrics
- **[Model Variables Reference](MODEL_VARIABLES.md)**: Complete parameter documentation
- **[Mathematical Model](cod_matchmaking_model.md)**: Full mathematical specification
- **[README](../README.md)**: Project overview and quick start guide

