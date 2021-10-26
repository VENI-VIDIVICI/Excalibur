import { ExcaliburGraphicsContext, ImageSource /*, SpriteFont, SpriteSheet*/ } from '..';
import { Vector } from '../..';
import debugFont from './debug-font.png';
import consolasSDF from './TextRenderer/consolas-sdf.png';
import consolasJSON from './TextRenderer/consolas-sdf.json';
import { TextRenderer } from './TextRenderer/text-renderer';

/**
 * Internal debugtext helper
 */
export class DebugText {
  constructor() {
    this.load();
  }

  /**
   * base64 font
   */
  public readonly fontSheet = debugFont;
  public size: number = 16;
  // private _imageSource: ImageSource;
  private _imageSource2: ImageSource;
  // private _spriteSheet: SpriteSheet;
  // private _spriteFont: SpriteFont;
  public load() {
    // this._imageSource = new ImageSource(this.fontSheet);
    this._imageSource2 = new ImageSource(consolasSDF);
    return this._imageSource2.load();
    // return this._imageSource.load().then(() => {
    //   this._spriteSheet = SpriteSheet.fromImageSource({
    //     image: this._imageSource,
    //     grid: {
    //       rows: 3,
    //       columns: 16,
    //       spriteWidth: 16,
    //       spriteHeight: 16
    //     }
    //   });
    //   this._spriteFont = new SpriteFont({
    //     alphabet: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ,!\'&."?-()+ ',
    //     caseInsensitive: true,
    //     spriteSheet: this._spriteSheet,
    //     spacing: -6
    //   });
    // });
  }

  /**
   * Writes debug text using the built in sprint font
   * @param ctx
   * @param text
   * @param pos
   */
  public write(ctx: ExcaliburGraphicsContext, text: string, pos: Vector) {
    if (this._imageSource2.isLoaded()) {
      ctx.draw<TextRenderer>('text', this._imageSource2.image, consolasJSON, pos, text);
      // this._spriteFont.render(ctx, text, pos.x, pos.y);
    }
  }
}
