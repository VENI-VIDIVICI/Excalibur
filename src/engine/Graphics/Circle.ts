import { GraphicOptions } from './Graphic';
import { Color } from '../Color';
import { ExcaliburGraphicsContext } from './Context/ExcaliburGraphicsContext';
import { Graphic } from './Graphic';
import { vec } from '../Math/vector';

export interface CircleOptions {
  radius: number;
  color?: Color;
  strokeColor?: Color;
  strokeWidth?: number;
}

/**
 * A circle [[Graphic]] for drawing circles to the [[ExcaliburGraphicsContext]]
 */
export class Circle extends Graphic {
  public color = Color.Black;
  public strokeColor = Color.Black;
  public strokeWidth: number = 0;
  private _radius: number = 0;
  public get radius() {
    return this._radius;
  }
  public set radius(value: number) {
    this._radius = value;
    this.width = this._radius * 2;
    this.height = this._radius * 2;
  }
  constructor(options: CircleOptions & GraphicOptions) {
    super(options);
    this.radius = options.radius;
    this.color = options.color ?? this.color;
    this.strokeColor = options.strokeColor ?? this.strokeColor;
    this.strokeWidth = options.strokeWidth ?? this.strokeWidth;
  }

  protected _drawImage(ex: ExcaliburGraphicsContext, x: number, y: number): void {
    ex.draw('circle', vec(x, y), this.radius, this.color, this.strokeColor, this.strokeWidth);
  }

  public clone(): Circle {
    return new Circle({
      radius: this.radius,
      ...this.cloneGraphicOptions(),
    });
  }
}
