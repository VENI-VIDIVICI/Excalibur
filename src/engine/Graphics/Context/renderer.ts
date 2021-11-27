import { Shader } from './shader';
import { ExcaliburGraphicsContextState, WebGLGraphicsContextInfo } from '..';
import { Matrix } from '../..';


export interface Renderer {
  readonly type: string;
  priority: number;
  shader: Shader;
  initialize(gl: WebGLRenderingContext, info: WebGLGraphicsContextInfo): void;
  setState(state: ExcaliburGraphicsContextState): void;
  setTransform(transform: Matrix): void;
  draw(...args: any[]): void;
  flush(): void;
}
