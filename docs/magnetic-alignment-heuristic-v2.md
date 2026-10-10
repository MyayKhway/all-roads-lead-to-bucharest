# Magnetic Alignment Heuristic V2

Magnetic Alignment V2 is an A* heuristic that treats the goal city as an
attractor. It combines a safe Manhattan-distance estimate with the direction of
the road currently being considered. All coordinates come from manual pixel
measurements of the assignment map, and all edge costs come from the supplied
Romania graph.

## Directional alignment

For a road from the current city `u` to a neighboring city `v`, and goal `G`,
the implementation creates two vectors:

```text
road = v - u
goal = G - u
```

Their cosine alignment is:

```text
A(u, v, G) = dot(road, goal) / (|road| * |goal|)
```

`A` is between `-1` and `1`:

| Alignment | Meaning |
| ---: | --- |
| `-1` | the road points directly away from the goal |
| `0` | the road points sideways relative to the goal |
| `1` | the road points directly toward the goal |

The heuristic maps this value into a magnetic factor between `0` and `1`:

```text
M(u, v, G) = (A(u, v, G) + 1) / 2
```

| Alignment | Magnetic factor |
| ---: | ---: |
| `-1` | `0` |
| `0` | `0.5` |
| `1` | `1` |

Vector length is used only to normalize direction for the cosine calculation.
It is not used as a straight-line distance estimate.

## Calibrated Manhattan base

The remaining-distance estimate uses Manhattan distance on the measured map:

```text
D_M(v, G) = |x_v - x_G| + |y_v - y_G|
```

Pixel distance is converted into road-cost units with the smallest ratio found
among the supplied roads:

```text
k = min over roads (a, b) of roadCost(a, b) / D_M(a, b)
h_base(v) = k * D_M(v, G)
```

For the current map data:

```text
k = 97 / 333, approximately 0.2913 road-cost units per pixel
```

## Complete heuristic and A* priority

The magnetic factor applies a small discount to the base estimate:

```text
h_mag(v) = h_base(v) * (1 - alpha * M(u, v, G))
f(v) = g(v) + h_mag(v)
```

`g(v)` is the real accumulated road cost. The default is:

```text
alpha = 0.0027
```

A road aimed more directly at the goal receives a slightly smaller heuristic,
so A* may prefer it when priorities are otherwise close. The starting city has
no incoming road and is the only initial frontier entry, so its estimate is
handled directly as zero without needing a cached value.

Because `0 <= M <= 1` and `0 <= alpha <= 1`, the adjusted estimate stays between
zero and the calibrated Manhattan base:

```text
0 <= h_mag(v) <= h_base(v)
```

## Preprocessing and timed lookup

The implementation calculates every road-goal estimate before a timed search
begins. It stores 8,000 possible `(current, neighbor, goal)` positions in one
`Float64Array`, which occupies 64,000 bytes. During the search, a road heuristic
evaluation is direct numeric-array indexing in O(1) time. The starting city is
handled directly as zero. Vector construction, cosine, square roots, and the
magnetic formula are outside benchmark timing.

The transition data is private to the A* V2 implementation. The
shared contributor contracts remain unchanged.

## Alpha results

All 380 ordered pairs with different start and goal cities were used during the
structural sweep. Every tested alpha from `0` through `1` still returned an
optimal path for all pairs.

The fine sweep found that `0.0027` was the strongest tested positive value with
no structural regression. At `0.00271`, three pairs expanded more nodes than the
`alpha = 0` Manhattan control. No tested positive alpha reduced node expansion
for any pair.

At the selected default, the structural benchmark is:

| Variant | Optimal pairs | Mean generated | Mean expanded | Mean examined |
| --- | ---: | ---: | ---: | ---: |
| Magnetic Alignment V2 | 380 | 10.337 | 7.087 | 15.945 |
| Magnetic Alignment with `alpha = 0` | 380 | 10.337 | 7.087 | 15.945 |

V2 therefore retains a measurable directional term but ties its `alpha = 0`
Manhattan control on the recorded structural metrics at its default alpha.

## Commands

Run the alpha sweep:

```powershell
npm run sweep:magnetic-alpha-v2 -- --from 0 --to 0.01 --step 0.0001
```

Add `--timing` to rank the values by execution time. The cache is prepared
before the timed workload:

```powershell
npm run sweep:magnetic-alpha-v2 -- --from 0 --to 0.01 --step 0.0001 --timing
```

Benchmark the registered magnetic variant across every ordered pair:

```powershell
npm run benchmark -- --focus astar-magnetic-alignment --pairs all --no-timing
```
