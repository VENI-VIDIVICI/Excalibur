import { Shader } from './shader';
import { WebGLGraphicsContextInfo } from '..';


export interface Renderer {
  readonly type: string;
  shader: Shader;
  initialize(gl: WebGLRenderingContext, info: WebGLGraphicsContextInfo): void;
  draw(...args: any[]): void;
  render(): void;
}
