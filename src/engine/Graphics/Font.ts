import { Vector } from '../Math/vector';
import { BoundingBox } from '../Collision/Index';
import { Color } from '../Color';
import { line } from '../Util/DrawUtil';
import { ExcaliburGraphicsContext } from './Context/ExcaliburGraphicsContext';
import { BaseAlign, Direction, FontOptions, FontStyle, FontUnit, TextAlign, FontRenderer } from './FontCommon';
import { Graphic, GraphicOptions } from './Graphic';
import { RasterOptions } from './Raster';
import { TextureLoader } from '.';
import { ImageFiltering } from './Filtering';

/**
 * Represents a system or web font in Excalibur
 *
 * If no options specfied, the system sans-serif 10 pixel is used
 *
 * If loading a custom web font be sure to have the font loaded before you use it https://erikonarheim.com/posts/dont-test-fonts/
 */
export class Font extends Graphic implements FontRenderer {
  /**
   * Set the font filtering mode, by default set to [[ImageFiltering.Blended]] regardles of the engine default smoothing
   *
   * If you have a pixel style font that may be a reason to switch this to [[ImageFiltering.Pixel]]
   */
  public filtering: ImageFiltering = ImageFiltering.Blended;
  constructor(options: FontOptions & GraphicOptions & RasterOptions = {}) {
    super(options); // <- Graphics properties

    // Raster properties
    this.smoothing = options?.smoothing ?? this.smoothing;
    this.padding = options?.padding ?? this.padding;
    this.color = options?.color ?? this.color;
    this.strokeColor = options?.strokeColor ?? this.strokeColor;
    this.lineDash = options?.lineDash ?? this.lineDash;
    this.lineWidth = options?.lineWidth ?? this.lineWidth;
    this.filtering = options?.filtering ?? this.filtering;

    // Font specific properts
    this.family = options?.family ?? this.family;
    this.style = options?.style ?? this.style;
    this.bold = options?.bold ?? this.bold;
    this.size = options?.size ?? this.size;
    this.unit = options?.unit ?? this.unit;
    this.textAlign = options?.textAlign ?? this.textAlign;
    this.baseAlign = options?.baseAlign ?? this.baseAlign;
    this.direction = options?.direction ?? this.direction;
    this.quality = options?.quality ?? this.quality;
    if (options?.shadow) {
      this.shadow = {};
      this.shadow.blur = options.shadow.blur ?? this.shadow.blur;
      this.shadow.offset = options.shadow.offset ?? this.shadow.offset;
      this.shadow.color = options.shadow.color ?? this.shadow.color;
    }
  }

  public clone() {
    return new Font({
      ...this.cloneGraphicOptions(),
      size: this.size,
      unit: this.unit,
      family: this.family,
      style: this.style,
      bold: this.bold,
      textAlign: this.textAlign,
      baseAlign: this.baseAlign,
      direction: this.direction,
      shadow: this.shadow
        ? {
          blur: this.shadow.blur,
          offset: this.shadow.offset,
          color: this.shadow.color
        }
        : null
    });
  }

  /**
   * Font quality determines the size of the underlying rastered text, higher quality means less jagged edges.
   * If quality is set to 1, then just enough raster bitmap is generated to render the text.
   *
   * You can think of quality as how zoomed in to the text you can get before seeing jagged edges.
   *
   * (Default 2)
   */
  public quality = 2;

  // Raster properties for fonts
  public padding = 2;
  public smoothing = false;
  public lineWidth = 1;
  public lineDash: number[] = [];
  public color: Color = Color.Black;
  public strokeColor: Color;

  public family: string = 'sans-serif';
  public style: FontStyle = FontStyle.Normal;
  public bold: boolean = false;
  public unit: FontUnit = FontUnit.Px;
  public textAlign: TextAlign = TextAlign.Left;
  public baseAlign: BaseAlign = BaseAlign.Alphabetic;
  public direction: Direction = Direction.LeftToRight;
  public size: number = 10;
  public shadow: { blur?: number; offset?: Vector; color?: Color } = null;

  public get fontString() {
    return `${this.style} ${this.bold ? 'bold' : ''} ${this.size}${this.unit} ${this.family}`;
  }

  private _textBounds: BoundingBox = new BoundingBox();

  public get localBounds(): BoundingBox {
    return this._textBounds;
  }


  protected _drawImage(_ex: ExcaliburGraphicsContext, _x: number, _y: number) {
    // TODO weird vestigial drawimage
  }


  protected _rotate(ex: ExcaliburGraphicsContext) {
    // TODO this needs to change depending on the bounding box...
    const origin = this.origin ?? this._textBounds.center;
    ex.translate(origin.x, origin.y);
    ex.rotate(this.rotation);
    ex.translate(-origin.x, -origin.y);
  }

  protected _flip(ex: ExcaliburGraphicsContext) {
    if (this.flipHorizontal) {
      ex.translate(this._textBounds.width / this.scale.x, 0);
      ex.scale(-1, 1);
    }

    if (this.flipVertical) {
      ex.translate(0, -this._textBounds.height / 2 / this.scale.y);
      ex.scale(1, -1);
    }
  }


  /**
   * Returns a BoundingBox that is the total size of the text including mutliple lines
   *
   * Does not include any padding or adjustment
   * @param text
   * @returns BoundingBox
   */
  public measureText(text: string): BoundingBox {
    const lines = text.split('\n');
    const maxWidthLine = lines.reduce((a, b) => {
      return a.length > b.length ? a : b;
    });
    const ctx = this._getTextBitmap(text);

    this._applyFont(ctx); // font must be applied to the context to measure it
    const metrics = ctx.measureText(maxWidthLine);
    let textHeight = Math.abs(metrics.actualBoundingBoxAscent) + Math.abs(metrics.actualBoundingBoxDescent);

    // TODO lineheight makes the text bounds wonky
    const lineAdjustedHeight = textHeight * lines.length;
    textHeight = lineAdjustedHeight;
    const bottomBounds = lineAdjustedHeight - Math.abs(metrics.actualBoundingBoxAscent);
    const x = 0;
    const y = 0;
    return new BoundingBox({
      left: x - Math.abs(metrics.actualBoundingBoxLeft) - this.padding,
      top: y - Math.abs(metrics.actualBoundingBoxAscent) - this.padding,
      bottom: y + bottomBounds + this.padding,
      right: x + Math.abs(metrics.actualBoundingBoxRight) + this.padding
    });
  }

  private _setDimension(text: string, bitmap: CanvasRenderingContext2D): BoundingBox {
    const textBounds = this.measureText(text);

    // Changing the width and height clears the context properties
    // We double the bitmap width to account for all possible alignment
    // We scale by "quality" so we render text without jaggies
    bitmap.canvas.width = (textBounds.width + this.padding * 2) * 2 * this.quality;
    bitmap.canvas.height = (textBounds.height + this.padding * 2) * 2 * this.quality;

    return textBounds;
  }

  protected _postDraw(ex: ExcaliburGraphicsContext): void {
    ex.restore();
  }

  /**
   * We need to identify bitmaps with more than just the text content
   *
   * Any properites that can change the rendering of the text
   */
  private _getRasterPropertiesHash(color?: Color): string {
    const hash = '__hashcode__' +
    this.fontString +
    this.showDebug +
    this.textAlign +
    this.baseAlign +
    this.direction +
    JSON.stringify(this.shadow) +
    (this.padding.toString() +
    this.smoothing.toString() +
    this.lineWidth.toString() +
    this.lineDash.toString() +
    this.strokeColor?.toString() +
    ( color ? color.toString() : this.color?.toString()).toString());
    return hash;
  }

  protected _applyRasterProperites(ctx: CanvasRenderingContext2D, color: Color) {
    ctx.translate(this.padding, this.padding);
    ctx.imageSmoothingEnabled = this.smoothing;
    ctx.lineWidth = this.lineWidth;
    ctx.setLineDash(this.lineDash ?? ctx.getLineDash());
    ctx.strokeStyle = this.strokeColor?.toString();
    ctx.fillStyle = color ? color.toString() : this.color?.toString();
  }

  private _applyFont(ctx: CanvasRenderingContext2D) {
    ctx.translate(this.padding + ctx.canvas.width / 2, this.padding + ctx.canvas.height / 2);
    ctx.scale(this.quality, this.quality);
    ctx.textAlign = this.textAlign;
    ctx.textBaseline = this.baseAlign;
    ctx.font = this.fontString;
    ctx.direction = this.direction;

    if (this.shadow) {
      ctx.shadowColor = this.shadow.color.toString();
      ctx.shadowBlur = this.shadow.blur;
      ctx.shadowOffsetX = this.shadow.offset.x;
      ctx.shadowOffsetY = this.shadow.offset.y;
    }
  }

  private _drawText(ctx: CanvasRenderingContext2D, text: string, colorOverride: Color, lineHeight: number): void {
    const lines = text.split('\n');
    this._applyRasterProperites(ctx, colorOverride);
    this._applyFont(ctx);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (this.color) {
        ctx.fillText(line, 0, i * lineHeight);
      }

      if (this.strokeColor) {
        ctx.strokeText(line, 0, i * lineHeight);
      }
    }

    if (this.showDebug) {
      // Horizontal line
      /* istanbul ignore next */
      line(ctx, Color.Red, -ctx.canvas.width / 2, 0, ctx.canvas.width / 2, 0, 2);
      // Vertical line
      /* istanbul ignore next */
      line(ctx, Color.Red, 0, -ctx.canvas.height / 2, 0, ctx.canvas.height / 2, 2);
    }
  }

  private _textToBitmap = new Map<string, CanvasRenderingContext2D>();
  private _bitmapUsage = new Map<CanvasRenderingContext2D, number>();
  private _getTextBitmap(text: string, color?: Color): CanvasRenderingContext2D {
    const textAndHash = text + this._getRasterPropertiesHash(color);
    const bitmap = this._textToBitmap.get(textAndHash);
    if (bitmap) {
      return bitmap;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    this._textToBitmap.set(textAndHash, ctx);
    return ctx;
  }

  public render(ex: ExcaliburGraphicsContext, text: string, colorOverride: Color, x: number, y: number) {
    if (this.showDebug) {
      this.clearCache();
    }
    this.checkAndClearCache();
    const bitmap = this._getTextBitmap(text, colorOverride);
    const bounds = this._setDimension(text, bitmap);
    this._textBounds = bounds;

    bitmap.canvas.width = (bounds.width + this.padding * 2) * 2 * this.quality;
    bitmap.canvas.height = (bounds.height + this.padding * 2) * 2 * this.quality;

    this._preDraw(ex, x, y);

    const lines = text.split('\n');
    const lineHeight = bounds.height / lines.length;

    // draws the text to the bitmap
    this._drawText(bitmap, text, colorOverride, lineHeight);
    // Cache the bitmap for certain amount of time
    this._bitmapUsage.set(bitmap, performance.now());

    const rasterWidth = bitmap.canvas.width;
    const rasterHeight = bitmap.canvas.height;

    // draws the bitmap to excalibur graphics context
    TextureLoader.load(bitmap.canvas, this.filtering, true);
    ex.drawImage(
      bitmap.canvas,
      0,
      0,
      rasterWidth,
      rasterHeight,
      x - rasterWidth / this.quality / 2,
      y - rasterHeight / this.quality / 2,
      rasterWidth / this.quality,
      rasterHeight / this.quality
    );

    this._postDraw(ex);
  }

  /**
   * Get the internal cache size of the font
   * This is useful when debugging memory useage, these numbers indicate the number of cached in memory text bitmaps
   */
  public get cacheSize() {
    return this._bitmapUsage.size;
  }

  /**
   * Force clear all cached text bitmaps
   */
  public clearCache() {
    this._bitmapUsage.clear();
  }

  /**
   * Remove any expired cached text bitmaps
   */
  public checkAndClearCache() {
    for (const [bitmap, time] of this._bitmapUsage.entries()) {
      // if bitmap hasn't been used in 1 second clear it
      if (time + 1000 < performance.now()) {
        this._bitmapUsage.delete(bitmap);
      }
    }
  }
}
