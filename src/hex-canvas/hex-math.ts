export const HEX_SIZE: number = 40;
export const DEFAULT_GRID_COLS: number = 20;
export const DEFAULT_GRID_ROWS: number = 15;

export type CubeCoord = { q: number; r: number; s: number };
export type PixelPoint = { x: number; y: number };

// Flat-top hex orientation
export function hexToPixel(coord: CubeCoord, hexSize: number): PixelPoint {
  const x = hexSize * (3 / 2) * coord.q;
  const y = hexSize * (Math.sqrt(3) / 2 * coord.q + Math.sqrt(3) * coord.r);
  return { x, y };
}

export function pixelToHex(point: PixelPoint, hexSize: number): CubeCoord {
  const q = (2 / 3) * point.x / hexSize;
  const r = (-1 / 3 * point.x + Math.sqrt(3) / 3 * point.y) / hexSize;
  const s = -q - r;
  return cubeRound({ q, r, s });
}

export function cubeRound(coord: CubeCoord): CubeCoord {
  let rq = Math.round(coord.q);
  let rr = Math.round(coord.r);
  let rs = Math.round(coord.s);

  const dq = Math.abs(rq - coord.q);
  const dr = Math.abs(rr - coord.r);
  const ds = Math.abs(rs - coord.s);

  // The component with the largest rounding error is recomputed to maintain q+r+s=0
  if (dq > dr && dq > ds) {
    rq = -rr - rs;
  } else if (dr > ds) {
    rr = -rq - rs;
  } else {
    rs = -rq - rr;
  }

  rq = rq || 0;
  rr = rr || 0;
  rs = rs || 0;

  return { q: rq, r: rr, s: rs };
}

export function snapToHexCenter(point: PixelPoint, hexSize: number): PixelPoint {
  const coord = pixelToHex(point, hexSize);
  return hexToPixel(coord, hexSize);
}

export function generateGridCoords(cols: number, rows: number): CubeCoord[] {
  const coords: CubeCoord[] = [];
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      coords.push(offsetToCube(col, row));
    }
  }
  return coords;
}

const CUBE_DIRECTIONS: CubeCoord[] = [
  { q: 1, r: 0, s: -1 },
  { q: 1, r: -1, s: 0 },
  { q: 0, r: -1, s: 1 },
  { q: -1, r: 0, s: 1 },
  { q: -1, r: 1, s: 0 },
  { q: 0, r: 1, s: -1 },
];

export function hexNeighbors(coord: CubeCoord): CubeCoord[] {
  return CUBE_DIRECTIONS.map((dir) => ({
    q: coord.q + dir.q,
    r: coord.r + dir.r,
    s: coord.s + dir.s,
  }));
}

// Flat-top "even-q" offset conversion
export function cubeToOffset(coord: CubeCoord): { col: number; row: number } {
  const col = coord.q;
  const row = coord.r + (coord.q - (coord.q & 1)) / 2;
  return { col, row };
}

export function offsetToCube(col: number, row: number): CubeCoord {
  const q = col;
  const r = row - (col - (col & 1)) / 2;
  const s = -q - r;
  return { q: q || 0, r: r || 0, s: s || 0 };
}

export function hexDistance(a: CubeCoord, b: CubeCoord): number {
  return Math.max(
    Math.abs(a.q - b.q),
    Math.abs(a.r - b.r),
    Math.abs(a.s - b.s)
  );
}

// Returns the 6 corner vertices of a flat-top hex, starting from the rightmost corner
export function hexVertices(center: PixelPoint, hexSize: number): PixelPoint[] {
  const vertices: PixelPoint[] = [];
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i;
    const angleRad = (Math.PI / 180) * angleDeg;
    vertices.push({
      x: center.x + hexSize * Math.cos(angleRad),
      y: center.y + hexSize * Math.sin(angleRad),
    });
  }
  return vertices;
}