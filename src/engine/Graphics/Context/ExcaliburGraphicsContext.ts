import { Vector } from '../../Math/vector';
import { Color } from '../../Color';
import { Renderer } from "./renderer";
import { Matrix } from '../../Math/matrix';

export type HTMLImageSource = HTMLImageElement | HTMLCanvasElement;

export interface ExcaliburGraphicsContextOptions {
  canvasElement: HTMLCanvasElement;
  smoothing?: boolean;
  enableTransparency?: boolean;
  snapToPixel?: boolean;
  backgroundColor?: Color;
  powerPreference?: WebGLPowerPreference;
}

export interface ExcaliburGraphicsContextState {
  opacity: number;
  z: number;
}
export interface LineGraphicsOptions {
  color: Color;
}

export interface RectGraphicsOptions {
  color: Color;
}

export interface PointGraphicsOptions {
  color: Color;
  size: number;
}

export interface DebugDraw {
  /**
   * Draw a debugging rectangle to the screen
   * @param x
   * @param y
   * @param width
   * @param height
   * @param rectOptions
   */
  drawRect(x: number, y: number, width: number, height: number, rectOptions?: RectGraphicsOptions): void;
  /**
   * Draw a debugging line to the screen
   * @param start '
   * @param end
   * @param lineOptions
   */
  drawLine(start: Vector, end: Vector, lineOptions?: LineGraphicsOptions): void;
  /**
   * Draw a debugging point to the screen
   * @param point
   * @param pointOptions
   */
  drawPoint(point: Vector, pointOptions?: PointGraphicsOptions): void;

  /**
   * Draw debug text
   * @param text
   * @param pos
   */
  drawText(text: string, pos: Vector): void;
}

export interface ExcaliburGraphicsContext {
  width: number;
  height: number;

  /**
   * Snaps all drawings to the nearest pixel trucated down, by default false
   */
  snapToPixel: boolean;

  /**
   * Enable smoothed drawing (also known as anti-aliasing), by default false
   */
  smoothing: boolean;

  /**
   * Set the background color of the graphics context, default is [[Color.ExcaliburBlue]]
   */
  backgroundColor: Color;

  /**
   * Sets the opacity of the current [[Graphic]] or draw call being drawn, default is 1
   */
  opacity: number;

  /**
   * Sets the z index of the current [[Graphic]] or draw call being drawn, default is 0
   */
  z: number;

  /**
   * Resets the current transform to the identity matrix
   */
  resetTransform(): void;

  /**
   * Update the context with the curren tviewport dimensions (used in resizing)
   */
  updateViewport(): void;

  /**
   * Access the debug drawing api
   */
  debug: DebugDraw;

  /**
   * Draw an image to the Excalibur Graphics context at an x and y coordinate using the images width and height
   */
  drawImage(image: HTMLImageSource, x: number, y: number): void;
  /**
   *
   * Draw an image to the Excalibur Graphics context at an x and y coordinate with a specific width and height
   */
  drawImage(image: HTMLImageSource, x: number, y: number, width: number, height: number): void;
  /**
   *
   * Draw an image to the Excalibur Graphics context specifying the source image coordinates (sx, sy, swidth, sheight)
   * and to a specific destination on the context (dx, dy, dwidth, dheight)
   */
  drawImage(
    image: HTMLImageSource,
    sx: number,
    sy: number,
    swidth?: number,
    sheight?: number,
    dx?: number,
    dy?: number,
    dwidth?: number,
    dheight?: number
  ): void;

  /**
   * Draw a solid line to the Excalibur Graphics context
   * @param start
   * @param end
   * @param color
   * @param thickness
   */
  drawLine(start: Vector, end: Vector, color: Color, thickness: number): void;

  /**
   * Draw a solid rectangle to the Excalibur Graphics context
   * @param pos
   * @param width
   * @param height
   * @param color
   */
  drawRectangle(pos: Vector, width: number, height: number, color: Color): void;

  /**
   * Draw a solid circle to the Excalibur Graphics context
   * @param pos
   * @param radius
   * @param color
   */
  drawCircle(pos: Vector, radius: number, color: Color): void;

  register<T extends Renderer>(name: string, renderer: T): void;
  draw<TRenderer extends Renderer>(name: string, ...args: Parameters<TRenderer['draw']>): void;

  /**
   * Save the current state of the canvas to the stack (transforms and opacity)
   */
  save(): void;

  /**
   * Restore the state of the canvas from the stack
   */
  restore(): void;

  setTransform(transform: Matrix): void;

  /**
   * Translate the origin of the context by an x and y
   * @param x
   * @param y
   */
  translate(x: number, y: number): void;

  /**
   * Rotate the context about the current origin
   */
  rotate(angle: number): void;

  /**
   * Scale the context by an x and y factor
   * @param x
   * @param y
   */
  scale(x: number, y: number): void;

  /**
   * Clears the screen with the current background color
   */
  clear(): void;

  /**
   * Flushes the batched draw calls to the screen
   */
  flush(): void;
}
