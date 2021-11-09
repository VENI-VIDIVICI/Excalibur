import { Vector } from "../../..";
import { RenderSource } from "../../RenderSource";
import { WebGLGraphicsContextInfo } from "../ExcaliburGraphicsContextWebGL";
import { Shader } from "../shader";
import { buildQuad, buildQuadUV } from "../webgl-util";
import copyFragmentSource from "./copy-fragment.glsl";
import copyVertexSource from "./copy-vertex.glsl";


// todo post process? implements renderer?
// source texture (image source?)


export class CopyScreenPostprocess {
  type: string;
  shader: Shader;
  private _gl: WebGLRenderingContext;
  private _vertices: Float32Array;
  private _buffer: WebGLBuffer;
  initialize(gl: WebGLRenderingContext, _info: WebGLGraphicsContextInfo): void {
    this._gl = gl;
    this.shader = new Shader(copyVertexSource, copyFragmentSource);
    this.shader.compile(gl);
    this.shader.setVertexAttributeLayout([
      'a_postion',
      'a_texcoord'
    ]);

    // 6 verts per quad
    this._vertices = new Float32Array(this.shader.vertexAttributeSize * 6);
    this._buffer = gl.createBuffer() ?? new Error("WebGL - Could not create vertex buffer for ImageRenderer");
    gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this._vertices, gl.STATIC_DRAW);

  }

  process(renderSource: RenderSource): void {
    const gl = this._gl;
    // TODO should the quad be the size of the render source?
    const screenQuad = buildQuad(Vector.Zero, gl.canvas.width, gl.canvas.height);
    const screenUV = buildQuadUV(0, 0, 1, 1);
    let index = 0;
    for (let i = 0; i < screenQuad.length; i++) {
      this._vertices[index++] = screenQuad[i].x;
      this._vertices[index++] = screenQuad[i].y;
      this._vertices[index++] = screenUV[i].x;
      this._vertices[index++] = screenUV[i].y;
    }

    renderSource.use();
    // Clear the canvas AND the depth buffer.
    gl.clearColor(1, 1, 1, 1);   // clear to white
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
    
    // Switch to current renderer shader
    this.shader.use();
    
    // Ship geometry to graphics hardware
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._vertices);

    // Draw all the quads
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}