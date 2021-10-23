export class GraphicsDiagnostics {
  public static DrawRenderer: string[] = [];
  public static DrawCallCount: number = 0;
  public static DrawnImagesCount: number = 0;
  public static clear(): void {
    GraphicsDiagnostics.DrawRenderer.length = 0;
    GraphicsDiagnostics.DrawCallCount = 0;
    GraphicsDiagnostics.DrawnImagesCount = 0;
  }
}
