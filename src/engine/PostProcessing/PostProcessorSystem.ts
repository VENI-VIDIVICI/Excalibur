import { Entity } from "../EntityComponentSystem";
import { System, SystemType } from "../EntityComponentSystem/System";


export class PostProcessorSystem extends System {
  types: readonly string[];
  systemType = SystemType.Draw;
  update(_entities: Entity[], _delta: number): void {
    // post processors are entities?
  
  }
}