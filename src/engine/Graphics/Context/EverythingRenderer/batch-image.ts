import { BatchCommand } from '../batch';
import { DrawCommandType, DrawImageCommand } from './draw-image-command';
import { Graphic } from '../../Graphic';
import { TextureLoader } from '../texture-loader';


export class BatchImage extends BatchCommand<DrawImageCommand> {
  public textures: WebGLTexture[] = [];
  public commands: DrawImageCommand[] = [];
  private _graphicMap: { [id: string]: Graphic; } = {};

  constructor(public maxDraws: number, public maxTextures: number) {
    super(maxDraws);
  }

  isFull() {
    if (this.commands.length >= this.maxDraws) {
      return true;
    }
    if (this.textures.length >= this.maxTextures) {
      return true;
    }
    return false;
  }

  canAdd() {
    if (this.commands.length >= this.maxDraws) {
      return false;
    }

    if (this.textures.length < this.maxTextures) {
      return true;
    }

    return false;
  }

  private _isCommandFull() {
    return this.commands.length >= this.maxDraws;
  }

  private _isTextureFull() {
    return this.textures.length >= this.maxTextures;
  }

  private _wouldAddTexture(command: DrawImageCommand) {
    return !this._graphicMap[command.image.id];
  }

  maybeAdd(command: DrawImageCommand): boolean {
    if ((this._isCommandFull() || this._isTextureFull()) && this._wouldAddTexture(command)) {
      return false;
    }

    this.add(command);
    return true;
  }

  add(command: DrawImageCommand) {
    if (command.type === DrawCommandType.Image) {
      const texture = TextureLoader.load(command.image);
      if (this.textures.indexOf(texture) === -1) {
        this.textures.push(texture);
      }
    }

    this.commands.push(command);
  }

  bindTextures(gl: WebGLRenderingContext) {
    // Bind textures in the correct order
    for (let i = 0; i < this.maxTextures; i++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, this.textures[i] || this.textures[0]);
    }
  }

  getBatchTextureId(command: DrawImageCommand) {
    if (command.image) {
      return this.textures.indexOf(TextureLoader.get(command.image));
    }
    return -1;
  }

  dispose() {
    this.clear();
    return this;
  }

  clear() {
    this.commands.length = 0;
    this.textures.length = 0;
    this._graphicMap = {};
  }
}
