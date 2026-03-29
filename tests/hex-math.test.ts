import { describe, it, expect } from 'vitest';
import {
  HEX_SIZE,
  DEFAULT_GRID_COLS,
  DEFAULT_GRID_ROWS,
  hexToPixel,
  pixelToHex,
  cubeRound,
  snapToHexCenter,
  generateGridCoords,
  hexNeighbors,
  cubeToOffset,
  offsetToCube,
  hexDistance,
  hexVertices,
} from '../src/hex-canvas/hex-math';
import type { CubeCoord, PixelPoint } from '../src/hex-canvas/hex-math';

const SQRT3 = Math.sqrt(3);
const EPSILON = 1e-9;

function expectCoordsEqual(a: CubeCoord, b: CubeCoord) {
  expect(a.q).toBe(b.q);
  expect(a.r).toBe(b.r);
  expect(a.s).toBe(b.s);
}

function expectPixelClose(a: PixelPoint, b: PixelPoint, epsilon = 1e-6) {
  expect(Math.abs(a.x - b.x)).toBeLessThan(epsilon);
  expect(Math.abs(a.y - b.y)).toBeLessThan(epsilon);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('exported constants', () => {
  it('HEX_SIZE is 40', () => {
    expect(HEX_SIZE).toBe(40);
  });

  it('DEFAULT_GRID_COLS is 20', () => {
    expect(DEFAULT_GRID_COLS).toBe(20);
  });

  it('DEFAULT_GRID_ROWS is 15', () => {
    expect(DEFAULT_GRID_ROWS).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// hexToPixel
// ---------------------------------------------------------------------------

describe('hexToPixel', () => {
  it('maps the origin hex (0,0,0) to pixel (0,0)', () => {
    const result = hexToPixel({ q: 0, r: 0, s: 0 }, 40);
    expectPixelClose(result, { x: 0, y: 0 });
  });

  it('maps (1,0,-1) correctly for flat-top orientation', () => {
    const size = 40;
    const expected = {
      x: size * (3 / 2) * 1,
      y: size * (SQRT3 / 2 * 1 + SQRT3 * 0),
    };
    expectPixelClose(hexToPixel({ q: 1, r: 0, s: -1 }, size), expected);
  });

  it('maps (0,1,-1) correctly', () => {
    const size = 40;
    const expected = {
      x: 0,
      y: size * SQRT3,
    };
    expectPixelClose(hexToPixel({ q: 0, r: 1, s: -1 }, size), expected);
  });

  it('maps negative coordinates correctly', () => {
    const size = 40;
    const coord: CubeCoord = { q: -1, r: 0, s: 1 };
    const expected = {
      x: size * (3 / 2) * -1,
      y: size * (SQRT3 / 2 * -1 + SQRT3 * 0),
    };
    expectPixelClose(hexToPixel(coord, size), expected);
  });

  it('scales proportionally with hexSize', () => {
    const coord: CubeCoord = { q: 1, r: 1, s: -2 };
    const small = hexToPixel(coord, 20);
    const large = hexToPixel(coord, 40);
    expectPixelClose(large, { x: small.x * 2, y: small.y * 2 });
  });

  it('returns a PixelPoint with x and y properties', () => {
    const result = hexToPixel({ q: 2, r: -1, s: -1 }, 40);
    expect(result).toHaveProperty('x');
    expect(result).toHaveProperty('y');
  });
});

// ---------------------------------------------------------------------------
// pixelToHex
// ---------------------------------------------------------------------------

describe('pixelToHex', () => {
  it('maps pixel (0,0) to hex (0,0,0)', () => {
    expectCoordsEqual(pixelToHex({ x: 0, y: 0 }, 40), { q: 0, r: 0, s: 0 });
  });

  it('round-trips through hexToPixel for origin', () => {
    const coord: CubeCoord = { q: 0, r: 0, s: 0 };
    const pixel = hexToPixel(coord, 40);
    expectCoordsEqual(pixelToHex(pixel, 40), coord);
  });

  it('round-trips through hexToPixel for (1,0,-1)', () => {
    const coord: CubeCoord = { q: 1, r: 0, s: -1 };
    const pixel = hexToPixel(coord, 40);
    expectCoordsEqual(pixelToHex(pixel, 40), coord);
  });

  it('round-trips through hexToPixel for (0,1,-1)', () => {
    const coord: CubeCoord = { q: 0, r: 1, s: -1 };
    const pixel = hexToPixel(coord, 40);
    expectCoordsEqual(pixelToHex(pixel, 40), coord);
  });

  it('round-trips through hexToPixel for negative coords (-2,1,1)', () => {
    const coord: CubeCoord = { q: -2, r: 1, s: 1 };
    const pixel = hexToPixel(coord, 40);
    expectCoordsEqual(pixelToHex(pixel, 40), coord);
  });

  it('always returns a coord where q+r+s=0', () => {
    const points: PixelPoint[] = [
      { x: 0, y: 0 },
      { x: 37, y: 22 },
      { x: -100, y: 80 },
      { x: 500, y: -300 },
    ];
    for (const pt of points) {
      const { q, r, s } = pixelToHex(pt, 40);
      expect(q + r + s).toBe(0);
    }
  });

  it('works with a different hexSize', () => {
    const coord: CubeCoord = { q: 3, r: -1, s: -2 };
    const pixel = hexToPixel(coord, 20);
    expectCoordsEqual(pixelToHex(pixel, 20), coord);
  });
});

// ---------------------------------------------------------------------------
// cubeRound
// ---------------------------------------------------------------------------

describe('cubeRound', () => {
  it('returns exact integer coords unchanged', () => {
    expectCoordsEqual(cubeRound({ q: 1, r: -1, s: 0 }), { q: 1, r: -1, s: 0 });
  });

  it('rounds to nearest hex when q has largest error', () => {
    // q error is largest, so rq is recomputed
    const result = cubeRound({ q: 0.6, r: -0.1, s: -0.5 });
    expect(result.q + result.r + result.s).toBe(0);
    expect(result.q).toBe(1);
  });

  it('rounds to nearest hex when r has largest error', () => {
    const result = cubeRound({ q: 0.1, r: 0.6, s: -0.7 });
    expect(result.q + result.r + result.s).toBe(0);
    expect(result.r).toBe(1);
  });

  it('rounds to nearest hex when s has largest error', () => {
    const result = cubeRound({ q: 0.1, r: -0.1, s: 0.0 });
    expect(result.q + result.r + result.s).toBe(0);
  });

  it('always produces q+r+s=0', () => {
    const inputs: CubeCoord[] = [
      { q: 0.4999, r: -0.2, s: -0.2999 },
      { q: -0.7, r: 0.3, s: 0.4 },
      { q: 1.5, r: -0.5, s: -1.0 },
      { q: 0, r: 0, s: 0 },
    ];
    for (const coord of inputs) {
      const rounded = cubeRound(coord);
      expect(rounded.q + rounded.r + rounded.s).toBe(0);
    }
  });

  it('returns integer values', () => {
    const result = cubeRound({ q: 0.3, r: 0.4, s: -0.7 });
    expect(Number.isInteger(result.q)).toBe(true);
    expect(Number.isInteger(result.r)).toBe(true);
    expect(Number.isInteger(result.s)).toBe(true);
  });

  it('handles origin (0,0,0)', () => {
    expectCoordsEqual(cubeRound({ q: 0, r: 0, s: 0 }), { q: 0, r: 0, s: 0 });
  });
});

// ---------------------------------------------------------------------------
// snapToHexCenter
// ---------------------------------------------------------------------------

describe('snapToHexCenter', () => {
  it('returns the same pixel when already at a hex center', () => {
    const center = hexToPixel({ q: 0, r: 0, s: 0 }, 40);
    expectPixelClose(snapToHexCenter(center, 40), center);
  });

  it('snaps a nearby point to the nearest hex center', () => {
    const center = hexToPixel({ q: 1, r: 0, s: -1 }, 40);
    const nearby: PixelPoint = { x: center.x + 5, y: center.y - 3 };
    expectPixelClose(snapToHexCenter(nearby, 40), center);
  });

  it('snaps origin-adjacent point back to origin center', () => {
    const snapped = snapToHexCenter({ x: 1, y: 1 }, 40);
    expectPixelClose(snapped, { x: 0, y: 0 });
  });

  it('result is always a valid hex center (round-trips through pixelToHex)', () => {
    const points: PixelPoint[] = [
      { x: 37, y: 22 },
      { x: -100, y: 80 },
      { x: 200, y: -150 },
    ];
    for (const pt of points) {
      const snapped = snapToHexCenter(pt, 40);
      const coord = pixelToHex(snapped, 40);
      const reSnapped = hexToPixel(coord, 40);
      expectPixelClose(snapped, reSnapped);
    }
  });
});

// ---------------------------------------------------------------------------
// generateGridCoords
// ---------------------------------------------------------------------------

describe('generateGridCoords', () => {
  it('generates cols*rows coordinates', () => {
    const coords = generateGridCoords(5, 4);
    expect(coords).toHaveLength(20);
  });

  it('generates DEFAULT_GRID_COLS * DEFAULT_GRID_ROWS coords with defaults', () => {
    const coords = generateGridCoords(DEFAULT_GRID_COLS, DEFAULT_GRID_ROWS);
    expect(coords).toHaveLength(DEFAULT_GRID_COLS * DEFAULT_GRID_ROWS);
  });

  it('returns empty array for 0 cols', () => {
    expect(generateGridCoords(0, 10)).toHaveLength(0);
  });

  it('returns empty array for 0 rows', () => {
    expect(generateGridCoords(10, 0)).toHaveLength(0);
  });

  it('returns empty array for 0 cols and 0 rows', () => {
    expect(generateGridCoords(0, 0)).toHaveLength(0);
  });

  it('returns a single coordinate for 1x1 grid', () => {
    const coords = generateGridCoords(1, 1);
    expect(coords).toHaveLength(1);
  });

  it('all returned coords satisfy q+r+s=0', () => {
    const coords = generateGridCoords(5, 5);
    for (const { q, r, s } of coords) {
      expect(q + r + s).toBe(0);
    }
  });

  it('all returned coords are unique', () => {
    const coords = generateGridCoords(4, 4);
    const keys = coords.map(({ q, r, s }) => `${q},${r},${s}`);
    const unique = new Set(keys);
    expect(unique.size).toBe(coords.length);
  });

  it('first coordinate corresponds to offset (0,0)', () => {
    const coords = generateGridCoords(3, 3);
    expectCoordsEqual(coords[0], offsetToCube(0, 0));
  });
});

// ---------------------------------------------------------------------------
// hexNeighbors
// ---------------------------------------------------------------------------

describe('hexNeighbors', () => {
  it('returns exactly 6 neighbors', () => {
    expect(hexNeighbors({ q: 0, r: 0, s: 0 })).toHaveLength(6);
  });

  it('all neighbors of origin satisfy q+r+s=0', () => {
    const neighbors = hexNeighbors({ q: 0, r: 0, s: 0 });
    for (const { q, r, s } of neighbors) {
      expect(q + r + s).toBe(0);
    }
  });

  it('all neighbors are at distance 1 from the center hex', () => {
    const center: CubeCoord = { q: 0, r: 0, s: 0 };
    const neighbors = hexNeighbors(center);
    for (const n of neighbors) {
      expect(hexDistance(center, n)).toBe(1);
    }
  });

  it('all neighbors of a non-origin hex are at distance 1', () => {
    const center: CubeCoord = { q: 3, r: -1, s: -2 };
    const neighbors = hexNeighbors(center);
    for (const n of neighbors) {
      expect(hexDistance(center, n)).toBe(1);
    }
  });

  it('all 6 neighbors are distinct', () => {
    const neighbors = hexNeighbors({ q: 2, r: 0, s: -2 });
    const keys = neighbors.map(({ q, r, s }) => `${q},${r},${s}`);
    const unique = new Set(keys);
    expect(unique.size).toBe(6);
  });

  it('neighbors of a neighbor include the original hex', () => {
    const center: CubeCoord = { q: 1, r: -1, s: 0 };
    const neighbors = hexNeighbors(center);
    const firstNeighbor = neighbors[0];
    const backNeighbors = hexNeighbors(firstNeighbor);
    const containsCenter = backNeighbors.some(
      (n) => n.q === center.q && n.r === center.r && n.s === center.s
    );
    expect(containsCenter).toBe(true);
  });

  it('works for negative coordinates', () => {
    const neighbors = hexNeighbors({ q: -3, r: 2, s: 1 });
    expect(neighbors).toHaveLength(6);
    for (const { q, r, s } of neighbors) {
      expect(q + r + s).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// cubeToOffset / offsetToCube (round-trip)
// ---------------------------------------------------------------------------

describe('cubeToOffset', () => {
  it('maps origin (0,0,0) to col=0, row=0', () => {
    expect(cubeToOffset({ q: 0, r: 0, s: 0 })).toEqual({ col: 0, row: 0 });
  });

  it('maps (1,0,-1) to col=1', () => {
    const { col } = cubeToOffset({ q: 1, r: 0, s: -1 });
    expect(col).toBe(1);
  });

  it('returns an object with col and row', () => {
    const result = cubeToOffset({ q: 2, r: -1, s: -1 });
    expect(result).toHaveProperty('col');
    expect(result).toHaveProperty('row');
  });
});

describe('offsetToCube', () => {
  it('maps (0,0) to origin cube coord', () => {
    expectCoordsEqual(offsetToCube(0, 0), { q: 0, r: 0, s: 0 });
  });

  it('always produces q+r+s=0', () => {
    const pairs = [
      [0, 0], [1, 0], [0, 1], [3, 5], [10, 7], [1, 1],
    ];
    for (const [col, row] of pairs) {
      const { q, r, s } = offsetToCube(col, row);
      expect(q + r + s).toBe(0);
    }
  });
});

describe('cubeToOffset and offsetToCube round-trip', () => {
  it('offsetToCube(cubeToOffset(coord)) returns original coord', () => {
    const coords: CubeCoord[] = [
      { q: 0, r: 0, s: 0 },
      { q: 1, r: 0, s: -1 },
      { q: 2, r: -1, s: -1 },
      { q: 4, r: -2, s: -2 },
      { q: -1, r: 1, s: 0 },
    ];
    for (const coord of coords) {
      const { col, row } = cubeToOffset(coord);
      expectCoordsEqual(offsetToCube(col, row), coord);
    }
  });

  it('cubeToOffset(offsetToCube(col, row)) returns original offset', () => {
    const offsets = [
      [0, 0], [1, 0], [2, 3], [5, 7], [0, 4],
    ];
    for (const [col, row] of offsets) {
      const coord = offsetToCube(col, row);
      const back = cubeToOffset(coord);
      expect(back.col).toBe(col);
      expect(back.row).toBe(row);
    }
  });
});

// ---------------------------------------------------------------------------
// hexDistance
// ---------------------------------------------------------------------------

describe('hexDistance', () => {
  it('distance from a hex to itself is 0', () => {
    expect(hexDistance({ q: 0, r: 0, s: 0 }, { q: 0, r: 0, s: 0 })).toBe(0);
  });

  it('distance between adjacent hexes is 1', () => {
    const a: CubeCoord = { q: 0, r: 0, s: 0 };
    const b: CubeCoord = { q: 1, r: 0, s: -1 };
    expect(hexDistance(a, b)).toBe(1);
  });

  it('distance is symmetric', () => {
    const a: CubeCoord = { q: 2, r: -1, s: -1 };
    const b: CubeCoord = { q: -1, r: 3, s: -2 };
    expect(hexDistance(a, b)).toBe(hexDistance(b, a));
  });

  it('distance of 2 between two hexes separated by one step', () => {
    const a: CubeCoord = { q: 0, r: 0, s: 0 };
    const b: CubeCoord = { q: 2, r: 0, s: -2 };
    expect(hexDistance(a, b)).toBe(2);
  });

  it('distance between all neighbors of origin is at most 2', () => {
    const origin: CubeCoord = { q: 0, r: 0, s: 0 };
    const neighbors = hexNeighbors(origin);
    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        expect(hexDistance(neighbors[i], neighbors[j])).toBeLessThanOrEqual(2);
      }
    }
  });

  it('returns a non-negative value', () => {
    const a: CubeCoord = { q: -3, r: 2, s: 1 };
    const b: CubeCoord = { q: 5, r: -1, s: -4 };
    expect(hexDistance(a, b)).toBeGreaterThanOrEqual(0);
  });

  it('distance equals number of steps needed to walk between hexes', () => {
    // Walk from origin along q axis 3 steps
    const a: CubeCoord = { q: 0, r: 0, s: 0 };
    const b: CubeCoord = { q: 3, r: 0, s: -3 };
    expect(hexDistance(a, b)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// hexVertices
// ---------------------------------------------------------------------------

describe('hexVertices', () => {
  it('returns exactly 6 vertices', () => {
    expect(hexVertices({ x: 0, y: 0 }, 40)).toHaveLength(6);
  });

  it('all vertices are at the correct distance from center', () => {
    const center: PixelPoint = { x: 0, y: 0 };
    const size = 40;
    const vertices = hexVertices(center, size);
    for (const v of vertices) {
      const dist = Math.sqrt(v.x ** 2 + v.y ** 2);
      expect(Math.abs(dist - size)).toBeLessThan(1e-6);
    }
  });

  it('vertices are offset correctly from a non-origin center', () => {
    const center: PixelPoint = { x: 100, y: 50 };
    const size = 40;
    const vertices = hexVertices(center, size);
    for (const v of vertices) {
      const dx = v.x - center.x;
      const dy = v.y - center.y;
      const dist = Math.sqrt(dx ** 2 + dy ** 2);
      expect(Math.abs(dist - size)).toBeLessThan(1e-6);
    }
  });

  it('first vertex is at angle 0 (rightmost point)', () => {
    const center: PixelPoint = { x: 0, y: 0 };
    const size = 40;
    const vertices = hexVertices(center, size);
    expectPixelClose(vertices[0], { x: size, y: 0 });
  });

  it('vertices are evenly spaced at 60 degrees apart', () => {
    const center: PixelPoint = { x: 0, y: 0 };
    const size = 40;
    const vertices = hexVertices(center, size);
    for (let i = 0; i < 6; i++) {
      const next = vertices[(i + 1) % 6];
      const curr = vertices[i];
      // chord length between adjacent vertices of a regular hexagon = size
      const chord = Math.sqrt((next.x - curr.x) ** 2 + (next.y - curr.y) ** 2);
      expect(Math.abs(chord - size)).toBeLessThan(1e-6);
    }
  });

  it('all 6 vertices are distinct', () => {
    const vertices = hexVertices({ x: 0, y: 0 }, 40);
    const keys = vertices.map(({ x, y }) => `${x.toFixed(6)},${y.toFixed(6)}`);
    const unique = new Set(keys);
    expect(unique.size).toBe(6);
  });

  it('scales correctly with different hexSize', () => {
    const center: PixelPoint = { x: 0, y: 0 };
    const small = hexVertices(center, 20);
    const large = hexVertices(center, 40);
    for (let i = 0; i < 6; i++) {
      expectPixelClose(
        { x: large[i].x, y: large[i].y },
        { x: small[i].x * 2, y: small[i].y * 2 }
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Integration: pixelToHex / hexToPixel / snapToHexCenter
// ---------------------------------------------------------------------------

describe('integration: pixel-to-hex-to-pixel round-trips', () => {
  it('any hex center round-trips through pixelToHex and back', () => {
    const coords: CubeCoord[] = generateGridCoords(10, 10);
    for (const coord of coords) {
      const pixel = hexToPixel(coord, 40);
      const back = pixelToHex(pixel, 40);
      expectCoordsEqual(back, coord);
    }
  });

  it('snapToHexCenter is idempotent', () => {
    const point: PixelPoint = { x: 55, y: 33 };
    const once = snapToHexCenter(point, 40);
    const twice = snapToHexCenter(once, 40);
    expectPixelClose(once, twice);
  });

  it('hexNeighbors of a grid hex are each at distance 1', () => {
    const gridCoords = generateGridCoords(5, 5);
    for (const coord of gridCoords) {
      for (const neighbor of hexNeighbors(coord)) {
        expect(hexDistance(coord, neighbor)).toBe(1);
      }
    }
  });
});