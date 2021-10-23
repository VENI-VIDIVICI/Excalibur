import { GraphicsDiagnostics } from "../../GraphicsDiagnostics";
import { WebGLGraphicsContextInfo } from "../ExcaliburGraphicsContextWebGL";
import { Renderer } from "../renderer";
import { Shader } from "../shader";
import rectangleVertexSource from './rectangle-vertex.glsl';
import rectangleFragmentSource from './rectangle-fragment.glsl';
import { vec, Vector } from "../../../Math/vector";
import { Color } from "../../../Color";

export class RectangleRenderer implements Renderer {
  public readonly type = 'rectangle';
  shader!: Shader;

  private _gl!: WebGLRenderingContext;
  private _info!: WebGLGraphicsContextInfo

  private _vertices!: Float32Array;
  private _buffer!: WebGLBuffer;
  private _vertIndex = 0; // starts at 0
  private _MAX_RECTANGLES_PER_DRAW: number = 1000;
  private _rectangleCount = 0;
  initialize(gl: WebGLRenderingContext, info: WebGLGraphicsContextInfo): void {
    this._gl = gl;
    this._info = info;
    this.shader = new Shader(gl, rectangleVertexSource, rectangleFragmentSource);
    this.shader.addAttribute('a_position', 3, gl.FLOAT);
    this.shader.addAttribute('a_uv', 2, gl.FLOAT);
    this.shader.addAttribute('a_radius', 1, gl.FLOAT);
    this.shader.addAttribute('a_opacity', 1, gl.FLOAT);
    this.shader.addAttribute('a_color', 4, gl.FLOAT);
    this.shader.addAttribute('a_strokeColor', 4, gl.FLOAT);
    this.shader.addAttribute('a_strokeThickness', 1, gl.FLOAT);
    this.shader.addUniformMatrix('u_matrix', info.matrix.data);

    const verticesPerCommand = 6;
    // Initialize VBO
    // https://groups.google.com/forum/#!topic/webgl-dev-list/vMNXSNRAg8M
    this._vertices = new Float32Array(this.shader.vertexAttributeSize * verticesPerCommand * this._MAX_RECTANGLES_PER_DRAW);
    this._buffer = gl.createBuffer() ?? new Error("WebGL - Could not create vertex buffer for ImageRenderer");
    gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this._vertices, gl.DYNAMIC_DRAW);
  }
  private _isFull() {
    if (this._rectangleCount >= this._MAX_RECTANGLES_PER_DRAW) {
      return true;
    }
    return false;
  }
  draw(pos: Vector, width: number, height: number, color: Color, borderRadius: number = 0, stroke: Color = Color.Transparent, strokeThickness: number = 0): void {
    if (this._isFull()) {
      this.render();
    }
    this._rectangleCount++;

    const currentTransform = this._info.transform.current;
    let index = 0;
    let quad = [];
    const topLeft = pos.add(vec(0, 0));
    const topRight = pos.add(vec(width, 0));
    const bottomRight = pos.add(vec(width, height));
    const bottomLeft = pos.add(vec(0, height));
    quad[index++] = currentTransform.multv([topLeft.x, topLeft.y]);
    quad[index++] = currentTransform.multv([topRight.x, topRight.y]);
    quad[index++] = currentTransform.multv([bottomLeft.x, bottomLeft.y]);
    quad[index++] = currentTransform.multv([bottomLeft.x, bottomLeft.y]);
    quad[index++] = currentTransform.multv([topRight.x, topRight.y]);
    quad[index++] = currentTransform.multv([bottomRight.x, bottomRight.y]);

    const opacity = this._info.state.current.opacity;

    const uvx0 = 0;
    const uvy0 = 0;
    const uvx1 = 1;
    const uvy1 = 1;

    // Quad update
    // (0, 0, z) z-index doesn't work in batch rendering between batches
    this._vertices[this._vertIndex++] = quad[0][0]; // x + 0 * width;
    this._vertices[this._vertIndex++] = quad[0][1]; //y + 0 * height;
    this._vertices[this._vertIndex++] = 0;
    // UV coords
    this._vertices[this._vertIndex++] = uvx0; // 0;
    this._vertices[this._vertIndex++] = uvy0; // 0;
    // radius
    this._vertices[this._vertIndex++] = borderRadius / width;
    // opacity
    this._vertices[this._vertIndex++] = opacity;
    // color
    this._vertices[this._vertIndex++] = color.r / 255;
    this._vertices[this._vertIndex++] = color.g / 255;
    this._vertices[this._vertIndex++] = color.b / 255;
    this._vertices[this._vertIndex++] = color.a;
    // stroke color
    this._vertices[this._vertIndex++] = stroke.r / 255;
    this._vertices[this._vertIndex++] = stroke.g / 255;
    this._vertices[this._vertIndex++] = stroke.b / 255;
    this._vertices[this._vertIndex++] = stroke.a;
    // stroke thickness
    this._vertices[this._vertIndex++] = strokeThickness / (width);

    // (0, 1)
    this._vertices[this._vertIndex++] = quad[1][0]; // x + 0 * width;
    this._vertices[this._vertIndex++] = quad[1][1]; // y + 1 * height;
    this._vertices[this._vertIndex++] = 0;
    // UV coords
    this._vertices[this._vertIndex++] = uvx0; // 0;
    this._vertices[this._vertIndex++] = uvy1; // 1;
    // radius
    this._vertices[this._vertIndex++] = borderRadius / width;
    // opacity
    this._vertices[this._vertIndex++] = opacity;
    // color
    this._vertices[this._vertIndex++] = color.r / 255;
    this._vertices[this._vertIndex++] = color.g / 255;
    this._vertices[this._vertIndex++] = color.b / 255;
    this._vertices[this._vertIndex++] = color.a;
    // stroke color
    this._vertices[this._vertIndex++] = stroke.r / 255;
    this._vertices[this._vertIndex++] = stroke.g / 255;
    this._vertices[this._vertIndex++] = stroke.b / 255;
    this._vertices[this._vertIndex++] = stroke.a;
    // stroke thickness
    this._vertices[this._vertIndex++] = strokeThickness / (width);

    // (1, 0)
    this._vertices[this._vertIndex++] = quad[2][0]; // x + 1 * width;
    this._vertices[this._vertIndex++] = quad[2][1]; // y + 0 * height;
    this._vertices[this._vertIndex++] = 0;

    // UV coords
    this._vertices[this._vertIndex++] = uvx1; //1;
    this._vertices[this._vertIndex++] = uvy0; //0;
    // radius
    this._vertices[this._vertIndex++] = borderRadius / width;
    // opacity
    this._vertices[this._vertIndex++] = opacity;
    // color
    this._vertices[this._vertIndex++] = color.r / 255;
    this._vertices[this._vertIndex++] = color.g / 255;
    this._vertices[this._vertIndex++] = color.b / 255;
    this._vertices[this._vertIndex++] = color.a;
    // stroke color
    this._vertices[this._vertIndex++] = stroke.r / 255;
    this._vertices[this._vertIndex++] = stroke.g / 255;
    this._vertices[this._vertIndex++] = stroke.b / 255;
    this._vertices[this._vertIndex++] = stroke.a;
    // stroke thickness
    this._vertices[this._vertIndex++] = strokeThickness / (width);

    // (1, 0)
    this._vertices[this._vertIndex++] = quad[3][0]; // x + 1 * width;
    this._vertices[this._vertIndex++] = quad[3][1]; // y + 0 * height;
    this._vertices[this._vertIndex++] = 0;

    // UV coords
    this._vertices[this._vertIndex++] = uvx1; //1;
    this._vertices[this._vertIndex++] = uvy0; //0;
    // radius
    this._vertices[this._vertIndex++] = borderRadius / width;
    // opacity
    this._vertices[this._vertIndex++] = opacity;
    // color
    this._vertices[this._vertIndex++] = color.r / 255;
    this._vertices[this._vertIndex++] = color.g / 255;
    this._vertices[this._vertIndex++] = color.b / 255;
    this._vertices[this._vertIndex++] = color.a;
    // stroke color
    this._vertices[this._vertIndex++] = stroke.r / 255;
    this._vertices[this._vertIndex++] = stroke.g / 255;
    this._vertices[this._vertIndex++] = stroke.b / 255;
    this._vertices[this._vertIndex++] = stroke.a;
    // stroke thickness
    this._vertices[this._vertIndex++] = strokeThickness / (width);

    // (0, 1)
    this._vertices[this._vertIndex++] = quad[4][0]; // x + 0 * width;
    this._vertices[this._vertIndex++] = quad[4][1]; // y + 1 * height
    this._vertices[this._vertIndex++] = 0;

    // UV coords
    this._vertices[this._vertIndex++] = uvx0; // 0;
    this._vertices[this._vertIndex++] = uvy1; // 1;
    // radius
    this._vertices[this._vertIndex++] = borderRadius / width;
    // opacity
    this._vertices[this._vertIndex++] = opacity;
    // color
    this._vertices[this._vertIndex++] = color.r / 255;
    this._vertices[this._vertIndex++] = color.g / 255;
    this._vertices[this._vertIndex++] = color.b / 255;
    this._vertices[this._vertIndex++] = color.a;
    // stroke color
    this._vertices[this._vertIndex++] = stroke.r / 255;
    this._vertices[this._vertIndex++] = stroke.g / 255;
    this._vertices[this._vertIndex++] = stroke.b / 255;
    this._vertices[this._vertIndex++] = stroke.a;
    // stroke thickness
    this._vertices[this._vertIndex++] = strokeThickness / (width);

    // (1, 1)
    this._vertices[this._vertIndex++] = quad[5][0]; // x + 1 * width;
    this._vertices[this._vertIndex++] = quad[5][1]; // y + 1 * height;
    this._vertices[this._vertIndex++] = 0;

    // UV coords
    this._vertices[this._vertIndex++] = uvx1; // 1;
    this._vertices[this._vertIndex++] = uvy1; // 1;
    // radius
    this._vertices[this._vertIndex++] = borderRadius / width;
    // opacity
    this._vertices[this._vertIndex++] = opacity;
    // color
    this._vertices[this._vertIndex++] = color.r / 255;
    this._vertices[this._vertIndex++] = color.g / 255;
    this._vertices[this._vertIndex++] = color.b / 255;
    this._vertices[this._vertIndex++] = color.a;
    // stroke color
    this._vertices[this._vertIndex++] = stroke.r / 255;
    this._vertices[this._vertIndex++] = stroke.g / 255;
    this._vertices[this._vertIndex++] = stroke.b / 255;
    this._vertices[this._vertIndex++] = stroke.a;
    // stroke thickness
    this._vertices[this._vertIndex++] = strokeThickness / (width);
  }
  render(): void {
    const gl = this._gl;

    gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);

    // Switch to current shader
    this.shader.use();

    // Ship geometry to graphics hardware
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._vertices);

    // Draw all the quads
    gl.drawArrays(gl.TRIANGLES, 0, this._vertIndex / this.shader.vertexAttributeSize);

    // Diags
    GraphicsDiagnostics.DrawRenderer.push(this.constructor.name);
    GraphicsDiagnostics.DrawCallCount++;
    GraphicsDiagnostics.DrawnImagesCount += this._vertIndex / this.shader.vertexAttributeSize;

    // Reset
    this._vertIndex = 0;
    this._rectangleCount = 0;
  }

}