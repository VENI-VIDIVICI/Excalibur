export class SimplePool<Type> {
  public totalAllocations = 0;
  public index = 0;
  public objects: Type[] = [];

  constructor(
    public builder: () => Type,
    public maxObjects: number = 100
  ) {
    // TODO pre-load objects
  }

  /**
   * Use many instances out of the in the context and return all to the pool.
   *
   * By returning values out of the contex they will be un-hooked from the pool and are free to be passed to consumers
   * @param context
   */
  using(context: (pool: SimplePool<Type>) => Type[] | void) {
    const result = context(this);
    if (result) {
      return this.done(...result);
    }
    return this.done();
  }

  /**
   * Use a single instance out of th pool and immediately return it to the pool
   * @param context
   */
  borrow(context: (object: Type) => void) {
    const object = this.get();
    context(object);
    this.index--;
  }

  /**
   * Retrieve a value from the pool, will allocate a new instance if necessary or recycle from the pool
   * @param args
   */
  get(): Type {
    if (this.index === this.maxObjects) {
      this.maxObjects = this.maxObjects * 2;
      console.log('Pool expanding')
    }

    if (this.objects[this.index]) {
      // Pool has an available object already constructed
      return this.objects[this.index++]; /* this.recycler(this.objects[this.index++], ...args);*/
    } else {
      // New allocation
      this.totalAllocations++;
      const object = (this.objects[this.index++] = this.builder());
      return object;
    }
  }

  /**
   * Signals we are done with the pool objects for now, Reclaims all objects in the pool.
   *
   * If a list of pooled objects is passed to done they are un-hooked from the pool and are free
   * to be passed to consumers
   * @param objects A list of object to separate from the pool
   */
  done(...objects: Type[]): Type[];
  done(): void;
  done(...objects: Type[]): Type[] | void {
    // All objects in pool now considered "free"
    this.index = 0;
    for (const object of objects) {
      const poolIndex = this.objects.indexOf(object);
      // Build a new object to take the pool place
      this.objects[poolIndex] = this.builder();
      this.totalAllocations++;
      // Unhook object from the pool
    }
    return objects;
  }
}