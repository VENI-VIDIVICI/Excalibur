import { Matrix, vec, Vector } from "../..";

/**
 * Checks if the current number is a power of two
 */
export function isPowerOfTwo(x: number): boolean {
  return (x & (x - 1)) === 0;
}

/**
 * Returns the next highest power of two
 */
export function nextHighestPowerOfTwo(x: number): number {
  --x;
  for (let i = 1; i < 32; i <<= 1) {
    x = x | (x >> i);
  }
  return x + 1;
}

/**
 * Returns the input number if a power of two, otherwise the next highest power of two
 */
export function ensurePowerOfTwo(x: number): number {
  if (!isPowerOfTwo(x)) {
    return nextHighestPowerOfTwo(x);
  }
  return x;
}

export function buildQuad(pos: Vector, width: number, height: number, anchor: Vector = Vector.Zero, transform?: Matrix): Vector[] {
  let index = 0;
  let quad = [];
  const offsetX = -width * anchor.x;
  const offsetY = -height * anchor.y
  const topLeft =     pos.add(vec(0 + offsetX, 0 + offsetY));
  const topRight =    pos.add(vec(width + offsetX, 0 + offsetY));
  const bottomRight = pos.add(vec(width + offsetX, height + offsetY));
  const bottomLeft =  pos.add(vec(0 + offsetX, height + offsetY));
  transform = transform ?? Matrix.identity();
  quad[index++] = transform.multv(topLeft);
  quad[index++] = transform.multv(topRight);
  quad[index++] = transform.multv(bottomLeft);
  quad[index++] = transform.multv(bottomLeft);
  quad[index++] = transform.multv(topRight);
  quad[index++] = transform.multv(bottomRight);
  return quad;
}

export function buildQuadUV(uvx0: number, uvy0: number, uvx1: number, uvy1: number): Vector[] {
  return [
    vec(uvx0, uvy0),
    vec(uvx0, uvy1),
    vec(uvx1, uvy0),
    vec(uvx1, uvy0),
    vec(uvx0, uvy1),
    vec(uvx1, uvy1)
  ]
}