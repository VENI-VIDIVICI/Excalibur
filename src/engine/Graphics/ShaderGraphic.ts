import { GraphicOptions } from '.';
import { ExcaliburGraphicsContext } from './Context/ExcaliburGraphicsContext';
import { Shader } from './Context/shader';
import { Graphic } from './Graphic';
export interface ShaderGraphicOptions {
  shader: Shader
}
export class ShaderGraphic extends Graphic {
  private _shader: Shader;
  constructor(options: ShaderGraphicOptions & GraphicOptions) {
    super(options);
    this._shader = options.shader;
  }
  protected _drawImage(ex: ExcaliburGraphicsContext, x: number, y: number): void {
    throw new Error('Method not implemented.');
  }
  clone(): Graphic {
    throw new Error('Method not implemented.');
  }

}