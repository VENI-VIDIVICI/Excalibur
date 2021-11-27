export class SparsePool<Type> {
  public objects: Type[] = [];
  public free: number[] = [];
  public objectToIndex = new Map<Type, number>();
  constructor(
    public builder: () => Type
  ) {}

  get(): Type {
      const freeId = this.free.pop();
      if (freeId) {
          return this.objects[freeId];
      } else {
          const object = this.builder();
          this.objectToIndex.set(object, this.objects.length);
          this.objects.push(object);
          return object;
      }
  }

  return(object: Type) {
      const index = this.objectToIndex.get(object);
      this.free.push(index);
  }
}