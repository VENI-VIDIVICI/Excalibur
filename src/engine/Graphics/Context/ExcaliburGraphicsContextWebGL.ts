import {
  ExcaliburGraphicsContext,
  LineGraphicsOptions,
  RectGraphicsOptions,
  PointGraphicsOptions,
  ExcaliburGraphicsContextOptions,
  DebugDraw,
  HTMLImageSource
} from './ExcaliburGraphicsContext';

import { Matrix } from '../../Math/matrix';
import { TransformStack } from './transform-stack';
import { Vector, vec } from '../../Math/vector';
import { Color } from '../../Color';
import { StateStack } from './state-stack';
// import { Logger } from '../../Util/Log';
import { LineRenderer } from './LineRenderer/line-renderer';
// import { ImageRenderer } from './EverythingRenderer/image-renderer';
import { PointRenderer } from './PointRenderer/point-renderer';
import { Canvas } from '../Canvas';
import { GraphicsDiagnostics } from '../GraphicsDiagnostics';
import { DebugText } from './debug-text';
import { Renderer } from "./renderer";
import { ImageRendererV2 } from './ImageRendererV2/image-renderer-v2';
import { CircleRenderer } from './CircleRenderer/circle-renderer';
import { RectangleRenderer } from './RectangleRenderer/rectangle-renderer';
// import { TextRenderer } from './TextRenderer/text-renderer';
import { ExcaliburGraphicsContextState } from './ExcaliburGraphicsContext';
import { SimplePool } from '../../Util/SimplePool';

/**
 * Represents a deferred draw call, used by the excalibur renderer to intelligently
 * batch calls between renderers
 */
export class DrawCall<TRenderer extends Renderer> {
  renderer: TRenderer;
  args: Parameters<TRenderer['draw']>[];
  transform: Matrix;
  state: ExcaliburGraphicsContextState;
}

class ExcaliburGraphicsContextWebGLDebug implements DebugDraw {
  private _debugText = new DebugText();
  constructor(private _webglCtx: ExcaliburGraphicsContextWebGL) { }

  /**
   * Draw a debugging rectangle to the context
   * @param x
   * @param y
   * @param width
   * @param height
   */
  drawRect(x: number, y: number, width: number, height: number, rectOptions: RectGraphicsOptions = { color: Color.Black }): void {

    this._webglCtx.draw<RectangleRenderer>('rectangle', vec(x, y), width, height, Color.Transparent, 0, rectOptions.color, 4);
    // this.drawLine(vec(x, y), vec(x + width, y), { ...rectOptions });
    // this.drawLine(vec(x + width, y), vec(x + width, y + height), { ...rectOptions });
    // this.drawLine(vec(x + width, y + height), vec(x, y + height), { ...rectOptions });
    // this.drawLine(vec(x, y + height), vec(x, y), { ...rectOptions });
  }

  /**
   * Draw a debugging line to the context
   * @param start
   * @param end
   * @param lineOptions
   */
  drawLine(start: Vector, end: Vector, lineOptions: LineGraphicsOptions = { color: Color.Black }): void {
    this._webglCtx.draw<LineRenderer>('line', start, end, lineOptions.color);
  }

  /**
   * Draw a debugging point to the context
   * @param point
   * @param pointOptions
   */
  drawPoint(point: Vector, pointOptions: PointGraphicsOptions = { color: Color.Black, size: 5 }): void {
    this._webglCtx.draw<PointRenderer>('point', point, pointOptions.color, pointOptions.size);
  }

  drawText(text: string, pos: Vector) {
    this._debugText.write(this._webglCtx, text, pos);
  }
}

export interface WebGLGraphicsContextInfo {
  transform: TransformStack;
  state: StateStack;
  matrix: Matrix;
}

export class ExcaliburGraphicsContextWebGL implements ExcaliburGraphicsContext {
  /**
   * Meant for internal use only. Access the internal context at your own risk and no guarantees this will exist in the future.
   * @internal
   */
  public __gl: WebGLRenderingContext;

  /**
   * Holds the 2d context shim
   */
  private _canvas: Canvas; // Configure z for shim?
  /**
   * Meant for internal use only. Access the internal context at your own risk and no guarantees this will exist in the future.
   * @internal
   */
  public __ctx: CanvasRenderingContext2D;

  private _transform = new TransformStack();
  private _state = new StateStack();
  private _projection!: Matrix;
  private _renderers = new Map<string, Renderer>();
  private _drawCalls: DrawCall<Renderer>[] = [];
  private _drawCallPool = new SimplePool<DrawCall<Renderer>>(
    () => new DrawCall()
  )

  public snapToPixel: boolean = true;

  public smoothing: boolean = false;

  public backgroundColor: Color = Color.ExcaliburBlue;

  public get opacity(): number {
    return this._state.current.opacity;
  }

  public set opacity(value: number) {
    this._state.current.opacity = value;
  }

  public get z(): number {
    return this._state.current.z;
  }

  public set z(value: number) {
    this._state.current.z = value;
  }

  private _width: number;
  public get width() {
    if (this._width) {
      return this._width;
    }
    return this._width = this.__gl.canvas.width;
  }

  private _height: number;
  public get height() {
    if (this._height) {
      return this._height;
    }
    return this._height = this.__gl.canvas.height;
  }

  constructor(options: ExcaliburGraphicsContextOptions) {
    const { canvasElement, enableTransparency, smoothing, snapToPixel, backgroundColor, powerPreference } = options;
    this.__gl = canvasElement.getContext('webgl', {
      antialias: smoothing ?? this.smoothing,
      premultipliedAlpha: true,
      alpha: enableTransparency ?? true,
      depth: false,
      powerPreference: powerPreference ?? 'high-performance'
    });
    this.snapToPixel = snapToPixel ?? this.snapToPixel;
    this.smoothing = smoothing ?? this.smoothing;
    this.backgroundColor = backgroundColor ?? this.backgroundColor;
    this._init();
  }

  private _init() {
    const gl = this.__gl;
    // Setup viewport and view matrix
    this._projection = Matrix.ortho(0, gl.canvas.width, gl.canvas.height, 0, 400, -400);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Clear background
    gl.clearColor(this.backgroundColor.r / 255, this.backgroundColor.g / 255, this.backgroundColor.b / 255, this.backgroundColor.a);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Enable alpha blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    this.register('image', new ImageRendererV2);
    // this.register('text', new TextRenderer);
    this.register('circle', new CircleRenderer);
    this.register('rectangle', new RectangleRenderer);

    this.register('point', new PointRenderer(gl, { matrix: this._projection, transform: this._transform, state: this._state }));
    this.register('line', new LineRenderer(gl, { matrix: this._projection, transform: this._transform, state: this._state }));
    // this.register('ex.image', new ImageRenderer(gl, { matrix: this._ortho, transform: this._transform, state: this._state }));

    // 2D ctx shim
    this._canvas = new Canvas({
      width: gl.canvas.width,
      height: gl.canvas.height
    });
    this.__ctx = this._canvas.ctx;
  }

  public register<T extends Renderer>(name: T['type'], renderer: T) {
    this._renderers.set(name, renderer);
    renderer.initialize(this.__gl, { matrix: this._projection, transform: this._transform, state: this._state });
  }


  public draw<TRenderer extends Renderer>(name: TRenderer['type'], ...args: Parameters<TRenderer['draw']>) {
    const dc = this._drawCallPool.get();
    dc.renderer = this._renderers.get(name);
    dc.args = args;
    dc.transform = this._transform.current;
    dc.state = this._state.current;
    this._drawCalls.push(dc);
  }

  public resetTransform(): void {
    this._transform.current = Matrix.identity();
  }

  public updateViewport(): void {
    const gl = this.__gl;
    this._projection = Matrix.ortho(0, gl.canvas.width, gl.canvas.height, 0, 400, -400);
    for (let renderer of this._renderers.values()) {
      renderer.shader.addUniformMatrix('u_matrix', this._projection.data);
    }
    this._width =gl.canvas.width;
    this._height = gl.canvas.height;
    // 2D ctx shim
    this._canvas.width =  this._width;
    this._canvas.height = this._height;
  }

  drawImage(image: HTMLImageSource, x: number, y: number): void;
  drawImage(image: HTMLImageSource, x: number, y: number, width: number, height: number): void;
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
  ): void {
    this.draw<ImageRendererV2>('image', image, sx, sy, swidth, sheight, dx, dy, dwidth, dheight);
  }

  public drawLine(start: Vector, end: Vector, color: Color, _thickness = 1) {
    // todo thickness using the rectangle renderer
    this.draw<LineRenderer>('line', start, end, color);
    // this.draw<RectangleRenderer>('rectangle', )
    // this.__lineRenderer.addLine(start, end, color);
  }

  public drawRectangle(pos: Vector, width: number, height: number, color: Color = Color.Black) {
    // this.__imageRenderer.addRectangle(color, pos, width, height);
    this.draw<RectangleRenderer>('rectangle', pos, width, height, color);
  }

  public drawCircle(pos: Vector, radius: number, color: Color) {
    // this.__imageRenderer.addCircle(pos, radius, color);
    this.draw<CircleRenderer>('circle', pos, radius, color, Color.Transparent, 0);
  }

  debug = new ExcaliburGraphicsContextWebGLDebug(this);

  public save(): void {
    this._transform.save();
    this._state.save();
  }

  public restore(): void {
    this._transform.restore();
    this._state.restore();
  }

  public setTransform(transform: Matrix) {
    this._transform.current = transform;
  }

  public translate(x: number, y: number): void {
    this._transform.translate(this.snapToPixel ? ~~x : x, this.snapToPixel ? ~~y : y);
  }

  public rotate(angle: number): void {
    this._transform.rotate(angle);
  }

  public scale(x: number, y: number): void {
    this._transform.scale(x, y);
  }

  public transform(matrix: Matrix) {
    this._transform.current = matrix;
  }

  clear() {
    const gl = this.__gl;
    gl.clearColor(this.backgroundColor.r / 255, this.backgroundColor.g / 255, this.backgroundColor.b / 255, this.backgroundColor.a);
    // Clear the context with the newly set color. This is
    // the function call that actually does the drawing.
    gl.clear(gl.COLOR_BUFFER_BIT);
    GraphicsDiagnostics.clear();
  }

  /**
   * Flushes all batched rendering to the screen
   */
  flush() {

    const gl = this.__gl;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    if (this._drawCalls.length === 0) {
      return;
    }

    // sort by z index first, then renderer type, break ties with renderer priority
    this._drawCalls.sort((a, b) => {
      const zIndex = a.state.z - b.state.z;
      const name = a.renderer.constructor.name.localeCompare(b.renderer.constructor.name);
      const priority = a.renderer.priority - b.renderer.priority;
      if (zIndex === 0) {
        if (priority === 0) {
          return name;
        }
        return priority;
      }
      return zIndex;
    });

    // run draws
    let currentRenderer: Renderer = this._drawCalls[0].renderer;
    for (let i = 0; i < this._drawCalls.length; i++) {
      const drawCall = this._drawCalls[i];

      // If the renderer switches flush the current to the screen
      if (currentRenderer !== drawCall.renderer) {
        currentRenderer.flush();
      }

      // Add draw to the current renderer
      if (drawCall.renderer) {
        currentRenderer = drawCall.renderer;
        currentRenderer.setState(drawCall.state);
        currentRenderer.setTransform(drawCall.transform);
        drawCall.renderer.draw.call(drawCall.renderer, ...drawCall.args);
      }
    }
    // flush the last renderer
    currentRenderer.flush();
    this._drawCallPool.done();
    this._drawCalls.length = 0;
    this._transform.done();
  }
}
