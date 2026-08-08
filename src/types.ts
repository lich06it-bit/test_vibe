export type IceShape = 'cube' | 'sphere' | 'iceberg' | 'crystal' | 'sculpture';

export type SurfaceMaterial = 'copper' | 'aluminum' | 'granite' | 'glass' | 'wood';

export type SimPhase = 'solid_heating' | 'melting_phase' | 'liquid_heating' | 'fully_melted';

export interface SurfaceProperties {
  id: SurfaceMaterial;
  name: string;
  nameVi: string;
  thermalConductivity: number; // W/(m·K)
  color: string;
  roughness: number;
  metalness: number;
}

export interface SimulationParams {
  iceShape: IceShape;
  surfaceMaterial: SurfaceMaterial;
  initialIceMass: number; // grams (e.g. 100 to 1000g)
  ambientTemp: number; // °C (-20 to 80°C)
  heatLampActive: boolean;
  heatLampPower: number; // Watts (0 to 500W)
  saltAmount: number; // grams (0 to 30g)
  blowtorchActive: boolean;
  blowtorchPower: number; // Watts (500W - 3000W)
  simSpeed: number; // 0.25x to 10x
  isPaused: boolean;
  thermalView: boolean; // Infrared FLIR mode
  soundEnabled: boolean;
  initialIceTemp: number; // °C (e.g., -15°C)
}

export interface TelemetryPoint {
  time: number; // seconds
  iceTemp: number; // °C
  waterTemp: number; // °C
  iceMass: number; // grams
  waterVolume: number; // mL
  meltRate: number; // g/s
  heatAbsorbed: number; // Joules
  phase: SimPhase;
}

export interface PhysicsState {
  timeElapsed: number;
  currentIceMass: number;
  iceTemp: number;
  waterVolume: number;
  waterTemp: number;
  totalHeatAbsorbed: number;
  meltRate: number;
  phase: SimPhase;
  dripRate: number; // droplets per second
  blowtorchPosition: [number, number, number]; // 3D coordinates on ice
}

export interface PresetScenario {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  params: Partial<SimulationParams>;
}
