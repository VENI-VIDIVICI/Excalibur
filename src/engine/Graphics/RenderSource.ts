import { TextureLoader } from "./Context/texture-loader";
import { ImageSource } from "./ImageSource";

export class RenderSource {
  private _gl: WebGLRenderingContext;
  private _texture: WebGLTexture;
  constructor(public image: ImageSource | WebGLTexture) {}

  public initialize(gl: WebGLRenderingContext) {
    this._gl = gl;
    if (this.image instanceof ImageSource) {
      this._texture = TextureLoader.load(this.image.image);
    } else {
      this._texture = this.image;
    }
  }

  public use() {
    const gl = this._gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._texture)
  }

  public disable() {
    const gl = this._gl;
    gl.bindTexture(gl.TEXTURE_2D, null);
  }
}