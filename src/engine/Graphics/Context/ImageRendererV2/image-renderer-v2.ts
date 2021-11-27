import { WebGLGraphicsContextInfo } from "../ExcaliburGraphicsContextWebGL";
import { Renderer } from "../renderer";
import { Shader } from "../shader";

import imageVertexSource from './image-vertex-v2.glsl';
import imageFragmentSource from './image-fragment-v2.glsl';
import { TextureLoader } from "../texture-loader";
import { ExcaliburGraphicsContextState, HTMLImageSource } from "../..";
import { ensurePowerOfTwo } from "../webgl-util";
import { GraphicsDiagnostics } from "../../GraphicsDiagnostics";
import { range } from '../../../Util/Util';
import { Matrix } from '../../..';

export class ImageRendererV2 implements Renderer {
  public readonly type = 'image';
  public priority = 0;
  private _MAX_TEXTURES: number = 0;
  private _textures: WebGLTexture[] = [];
  private _MAX_IMAGES_PER_DRAW: number = 2000;
  private _imageCount: number = 0;

  public shader!: Shader;

  private _gl!: WebGLRenderingContext;

  private _vertices!: Float32Array;
  private _buffer!: WebGLBuffer;
  private _vertIndex = 0; // starts at 0

  /**
   * Initialize render, builds shader and initialized webgl buffers
   */
  initialize(gl: WebGLRenderingContext, info: WebGLGraphicsContextInfo) {
    this._gl = gl;
    this.shader = this._buildShader(gl, info);
    // Quads have 6 verts
    const verticesPerCommand = 6;
    // Initialize VBO
    // https://groups.google.com/forum/#!topic/webgl-dev-list/vMNXSNRAg8M
    this._vertices = new Float32Array(this.shader.vertexAttributeSize * verticesPerCommand * this._MAX_IMAGES_PER_DRAW);
    this._buffer = gl.createBuffer() ?? new Error("WebGL - Could not create vertex buffer for ImageRenderer");
    gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this._vertices, gl.DYNAMIC_DRAW);
    TextureLoader.registerContext(gl);
  }

  private _buildShader(gl: WebGLRenderingContext, info: WebGLGraphicsContextInfo) {
    // Initialilze default batch rendering shader
    this._MAX_TEXTURES = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
    const shader = new Shader(
      imageVertexSource,
      this._transformFragmentSource(imageFragmentSource, this._MAX_TEXTURES)
    );
    shader.compile(gl);
    shader.setVertexAttributeLayout([
      'a_position',
      'a_texcoord',
      'a_textureIndex',
      'a_opacity'
    ]);
    shader.addUniformMatrix('u_matrix', info.matrix.data);
    // Initialize texture slots to [0, 1, 2, 3, 4, .... this._MAX_TEXTURES]
    shader.addUniformIntegerArray(
      'u_textures', range(0, this._MAX_TEXTURES - 1)
    );
    return shader;
  }

  private _transformFragmentSource(source: string, maxTextures: number): string {
    let newSource = source.replace('%%count%%', maxTextures.toString());
    let texturePickerBuilder = '';
    for (let i = 0; i < maxTextures; i++) {
      if (i === 0) {
        texturePickerBuilder += `if (v_textureIndex <= ${i}.5) {\n`;
      } else {
        texturePickerBuilder += `   else if (v_textureIndex <= ${i}.5) {\n`;
      }
      texturePickerBuilder += `      color = texture2D(u_textures[${i}], v_texcoord);\n`;
      texturePickerBuilder += `   }\n`;
    }
    newSource = newSource.replace('%%texture_picker%%', texturePickerBuilder);
    return newSource;
  }

  private _addImageAsTexture(image: HTMLImageSource) {
    const texture = TextureLoader.load(image);
    if (this._textures.indexOf(texture) === -1) {
      this._textures.push(texture);
    }
  }

  private _bindTextures(gl: WebGLRenderingContext) {
    // Bind textures in the correct order
    for (let i = 0; i < this._MAX_TEXTURES; i++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, this._textures[i] || this._textures[0]);
    }
  }

  private _getTextureIdForImage(image: HTMLImageSource) {
    if (image) {
      return this._textures.indexOf(TextureLoader.get(image));
    }
    return -1;
  }

  private _isFull() {
    if (this._imageCount >= this._MAX_IMAGES_PER_DRAW) {
      return true;
    }
    if (this._textures.length >= this._MAX_TEXTURES) {
      return true;
    }
    return false;
  }

  private _transform: Matrix;
  setTransform(transform: Matrix) {
    this._transform = transform;
  }

  private _state: ExcaliburGraphicsContextState
  setState(state: ExcaliburGraphicsContextState) {
    this._state = state;
  }

  draw(image: HTMLImageSource,
    sx: number,
    sy: number,
    swidth?: number,
    sheight?: number,
    dx?: number,
    dy?: number,
    dwidth?: number,
    dheight?: number) {

    // Force a render if the batch is full
    if (this._isFull()) {
      this.flush();
    }

    this._imageCount++;
    this._addImageAsTexture(image);

    // TODO do this based on arguments
    // Build all geometry and ship to GPU
    // interleave VBOs https://goharsha.com/lwjgl-tutorial-series/interleaving-buffer-objects/
    let width = image?.width || swidth || 0;
    let height = image?.height || sheight || 0;
    let view = [0, 0, swidth ?? image?.width ?? 0, sheight ?? image?.height ?? 0];
    let dest = [sx ?? 1, sy ?? 1];
    // If destination is specified, update view and dest
    if (dx !== undefined && dy !== undefined && dwidth !== undefined && dheight !== undefined) {
      view = [sx ?? 1, sy ?? 1, swidth ?? image?.width ?? 0, sheight ?? image?.height ?? 0];
      dest = [dx, dy];
      width = dwidth;
      height = dheight;
    }

    const currentTransform = this._transform;
    let index = 0;
    let quad = [];
    quad[index++] = currentTransform.multv([dest[0], dest[1]]);
    quad[index++] = currentTransform.multv([dest[0], dest[1] + height]);
    quad[index++] = currentTransform.multv([dest[0] + width, dest[1]]);
    quad[index++] = currentTransform.multv([dest[0] + width, dest[1]]);
    quad[index++] = currentTransform.multv([dest[0], dest[1] + height]);
    quad[index++] = currentTransform.multv([dest[0] + width, dest[1] + height]);

    const opacity = this._state.opacity;
    // if (this.snapToPixel) {
    //   for (const point of this._geom) {
    //     point[0] = ~~point[0];
    //     point[1] = ~~point[1];
    //   }
    // }

    sx = view[0];
    sy = view[1];
    let sw = view[2];
    let sh = view[3];

    // Do we actually need to do POT stuff here?
    const textureId = this._getTextureIdForImage(image);
    const potWidth = ensurePowerOfTwo(image.width || width);
    const potHeight = ensurePowerOfTwo(image.height || height);

    // potential optimization when divding by 2 (bitshift)
    // Modifying the images to poweroftwo images warp the UV coordinates
    let uvx0 = sx / potWidth;
    let uvy0 = sy / potHeight;
    let uvx1 = (sx + sw) / potWidth;
    let uvy1 = (sy + sh) / potHeight;

    // Quad update
    // (0, 0, z) z-index doesn't work in batch rendering between batches
    this._vertices[this._vertIndex++] = quad[0][0]; // x + 0 * width;
    this._vertices[this._vertIndex++] = quad[0][1]; //y + 0 * height;
    // this._vertices[this._vertIndex++] = 0;

    // UV coords
    this._vertices[this._vertIndex++] = uvx0; // 0;
    this._vertices[this._vertIndex++] = uvy0; // 0;
    // texture id
    this._vertices[this._vertIndex++] = textureId;
    // opacity
    this._vertices[this._vertIndex++] = opacity;

    // (0, 1)
    this._vertices[this._vertIndex++] = quad[1][0]; // x + 0 * width;
    this._vertices[this._vertIndex++] = quad[1][1]; // y + 1 * height;
    // this._vertices[this._vertIndex++] = 0;

    // UV coords
    this._vertices[this._vertIndex++] = uvx0; // 0;
    this._vertices[this._vertIndex++] = uvy1; // 1;
    // texture id
    this._vertices[this._vertIndex++] = textureId;
    // opacity
    this._vertices[this._vertIndex++] = opacity;

    // (1, 0)
    this._vertices[this._vertIndex++] = quad[2][0]; // x + 1 * width;
    this._vertices[this._vertIndex++] = quad[2][1]; // y + 0 * height;
    // this._vertices[this._vertIndex++] = 0;

    // UV coords
    this._vertices[this._vertIndex++] = uvx1; //1;
    this._vertices[this._vertIndex++] = uvy0; //0;
    // texture id
    this._vertices[this._vertIndex++] = textureId;
    // opacity
    this._vertices[this._vertIndex++] = opacity;

    // (1, 0)
    this._vertices[this._vertIndex++] = quad[3][0]; // x + 1 * width;
    this._vertices[this._vertIndex++] = quad[3][1]; // y + 0 * height;
    // this._vertices[this._vertIndex++] = 0;

    // UV coords
    this._vertices[this._vertIndex++] = uvx1; //1;
    this._vertices[this._vertIndex++] = uvy0; //0;
    // texture id
    this._vertices[this._vertIndex++] = textureId;
    // opacity
    this._vertices[this._vertIndex++] = opacity;

    // (0, 1)
    this._vertices[this._vertIndex++] = quad[4][0]; // x + 0 * width;
    this._vertices[this._vertIndex++] = quad[4][1]; // y + 1 * height
    // this._vertices[this._vertIndex++] = 0;

    // UV coords
    this._vertices[this._vertIndex++] = uvx0; // 0;
    this._vertices[this._vertIndex++] = uvy1; // 1;
    // texture id
    this._vertices[this._vertIndex++] = textureId;
    // opacity
    this._vertices[this._vertIndex++] = opacity;

    // (1, 1)
    this._vertices[this._vertIndex++] = quad[5][0]; // x + 1 * width;
    this._vertices[this._vertIndex++] = quad[5][1]; // y + 1 * height;
    // this._vertices[this._vertIndex++] = 0;

    // UV coords
    this._vertices[this._vertIndex++] = uvx1; // 1;
    this._vertices[this._vertIndex++] = uvy1; // 1;
    // texture id
    this._vertices[this._vertIndex++] = textureId;
    // opacity
    this._vertices[this._vertIndex++] = opacity;
  }

  flush(): void {
    const gl = this._gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
    
    // Switch to current renderer shader
    this.shader.use();
    
    // Ship geometry to graphics hardware
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._vertices);

    // Bind textures to
    this._bindTextures(gl);

    // Draw all the quads
    gl.drawArrays(gl.TRIANGLES, 0, this._vertIndex / this.shader.vertexAttributeSize);

    // Diags
    GraphicsDiagnostics.DrawRenderer.push(this.constructor.name);
    GraphicsDiagnostics.DrawCallCount++;
    GraphicsDiagnostics.DrawnImagesCount += this._imageCount;

    // Reset
    this._vertIndex = 0;
    this._imageCount = 0;
    this._textures.length = 0;
  }
}