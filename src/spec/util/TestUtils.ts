import * as ex from '@excalibur';

export namespace TestUtils {
  /**
   * Builds an engine with testing switches on
   * @param options
   */
  export function engine(options: ex.EngineOptions = {}, flags: string[] = [
    'use-legacy-drawing',
    'use-canvas-context',
    'suppress-obsolete-message']): ex.Engine {
    options = {
      width: 500,
      height: 500,
      suppressConsoleBootMessage: true,
      enableCanvasTransparency: true,
      suppressMinimumBrowserFeatureDetection: true,
      suppressHiDPIScaling: true,
      suppressPlayButton: true,
      displayMode: ex.DisplayMode.Position,
      position: 'top',
      ...options
    };
    ex.Flags._reset();
    ex.Flags.enable('suppress-obsolete-message');
    flags.forEach(f => ex.Flags.enable(f));
    const game = new ex.Engine(options);

    // Make all the clocks test clocks in the test utils
    game.clock.stop();
    game.clock = game.clock.toTestClock();

    (ex.WebAudio as any)._UNLOCKED = true;

    return game;
  }

  /**
   *
   */
  export async function runToReady(engine: ex.Engine, loader?: ex.Loader) {
    const clock = engine.clock as ex.TestClock;
    const start = engine.start(loader);
    // If loader
    if (loader) {
      await loader.areResourcesLoaded();
      clock.step(200);
      queueMicrotask(() => {
        clock.step(500);
      });
      await engine.isReady();
    }
  }
}
