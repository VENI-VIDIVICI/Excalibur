import { Matrix } from '../../Math/matrix';
import { SimplePool } from '../../Util/SimplePool';

export class TransformStack {
  private _pool = new SimplePool<Matrix>(
    () => Matrix.identity()
  )
  private _transforms: Matrix[] = [];
  private _currentTransform: Matrix = this._pool.get();

  public save(): void {
    this._transforms.push(this._currentTransform);
    this._currentTransform = this._currentTransform.clone(this._pool.get());
  }

  public restore(): void {
    this._currentTransform = this._transforms.pop();
  }

  public done(): void {
    this._pool.done();
  }

  public translate(x: number, y: number): Matrix {
    return this._currentTransform.translate(x, y);
  }

  public rotate(angle: number): Matrix {
    return this._currentTransform.rotate(angle);
  }

  public scale(x: number, y: number): Matrix {
    return this._currentTransform.scale(x, y);
  }

  public set current(matrix: Matrix) {
    this._currentTransform = matrix;
  }

  public get current(): Matrix {
    return this._currentTransform;
  }
}
