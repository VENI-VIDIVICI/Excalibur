import { Color, vec, Vector } from "../../..";
import { GraphicsDiagnostics } from "../../GraphicsDiagnostics";
import { HTMLImageSource } from "../ExcaliburGraphicsContext";
import { WebGLGraphicsContextInfo } from "../ExcaliburGraphicsContextWebGL";
import { Renderer } from "../renderer";
import { Shader } from "../shader";
import { TextureLoader } from "../texture-loader";
import { buildQuad, buildQuadUV, ensurePowerOfTwo } from "../webgl-util";
import textFragmentSource from './text-fragment.glsl';
import textVertexSource from './text-vertex.glsl';

export interface SDFData {
  [char: string]: {
    x: number;
    y: number;
    width: number;
    height: number;
  }
}

export class TextRenderer implements Renderer {
  private _MAX_CHARS_PER_DRAW = 2000;
  public readonly type = 'text';
  shader: Shader;

  private _texture: WebGLTexture;
  private _gl: WebGLRenderingContext;
  private _info: WebGLGraphicsContextInfo;

  private _vertices!: Float32Array;
  private _buffer!: WebGLBuffer;
  private _vertIndex = 0;

  private _charCount = 0;

  initialize(gl: WebGLRenderingContext, info: WebGLGraphicsContextInfo): void {
    this._gl = gl;
    this._info = info;
    this.shader = new Shader(textVertexSource, textFragmentSource);
    this.shader.compile(this._gl);
    this.shader.setVertexAttributeLayout([
      'a_position',
      'a_uv',
      'a_textColor'
    ]);
    this.shader.addUniformMatrix('u_matrix', info.matrix.data);
    this.shader.addUniformInteger('u_text_sdf', gl.TEXTURE0);
    this.shader.addUniformFloat('u_smoothing', .05); // smooth step factor .01
    this.shader.addUniformFloat('u_buffer', 0.75); // how "bold" the text is 0.1
    this.shader.addUniformFloat('u_opacity', 1.0);
    // this.shader.addUniformFloat('u_outlineSize', 0.01);
    // Quads have 6 verts
    const verticesPerCommand = 6;
    this._vertices = new Float32Array(this.shader.vertexAttributeSize * verticesPerCommand * this._MAX_CHARS_PER_DRAW);
    this._buffer = gl.createBuffer() ?? new Error("WebGL - Could not create vertex buffer for TextRenderer");
    gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this._vertices, gl.DYNAMIC_DRAW);
    TextureLoader.registerContext(gl);
  }

  private _isFull() {
    if (this._charCount >= this._MAX_CHARS_PER_DRAW) {
      return true;
    }
    return false;
  }
  // TODO update FOnt to produce a sddf
  draw(fontSDFAtlasImage: HTMLImageSource, fontData: SDFData, pos: Vector, text: string): void {
    if (this._isFull()) {
      this.render();
    }

    // Update font atlas as texture
    this._texture = TextureLoader.load(fontSDFAtlasImage); // should we only support 1 text atlas at a time?
    let color = Color.Black;
    // A quad per char
    let cursor = pos;
    for (let char of text) {
      this._charCount++;
      const charInfo = fontData[char];
      // Use font data to produce size and uv info
      const currentTransform = this._info.transform.current;
      const potWidth = ensurePowerOfTwo(fontSDFAtlasImage.width);
      const potHeight = ensurePowerOfTwo(fontSDFAtlasImage.height);
      
      let uvx0 = charInfo.x / potWidth;
      let uvy0 = charInfo.y / potHeight;
      let uvx1 = (charInfo.x + charInfo.width) / potWidth;
      let uvy1 = (charInfo.y + charInfo.height) / potHeight;

      const quad = buildQuad(cursor, charInfo.width, charInfo.height, Vector.Zero, currentTransform);
      const uvQuad = buildQuadUV(uvx0, uvy0, uvx1, uvy1);
      cursor = cursor.add(vec(charInfo.width, 0));

      for (let quadIndex = 0; quadIndex < quad.length; quadIndex++) {
        let vert = quad[quadIndex];
        let uv = uvQuad[quadIndex];
        this._vertices[this._vertIndex++] = vert.x;
        this._vertices[this._vertIndex++] = vert.y;
        this._vertices[this._vertIndex++] = uv.x;
        this._vertices[this._vertIndex++] = uv.y;

        this._vertices[this._vertIndex++] = color.r / 255;
        this._vertices[this._vertIndex++] = color.g / 255;
        this._vertices[this._vertIndex++] = color.b / 255;
      }
    }
  }
  render(): void {
    const gl = this._gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
    
    // Switch to current renderer shader
    this.shader.use();
    
    // Ship geometry to graphics hardware
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._vertices);

    // Bind the font atlas
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._texture);

    // Draw all the quads
    gl.drawArrays(gl.TRIANGLES, 0, this._vertIndex / this.shader.vertexAttributeSize);

    // Diags
    GraphicsDiagnostics.DrawRenderer.push(this.constructor.name);
    GraphicsDiagnostics.DrawCallCount++;
    GraphicsDiagnostics.DrawnImagesCount += this._charCount;

    // Reset
    this._vertIndex = 0;
    this._charCount = 0;
  }

}