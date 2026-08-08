import { PhysicsState, SimulationParams, SurfaceMaterial, SurfaceProperties } from '../types';

// Physical constants
export const C_ICE = 2.09; // J/(g·°C) - Specific heat capacity of ice
export const C_WATER = 4.184; // J/(g·°C) - Specific heat capacity of water
export const LATENT_HEAT_FUSION = 334; // J/g - Latent heat of fusion of ice
export const DENSITY_ICE = 0.917; // g/cm³
export const DENSITY_WATER = 1.0; // g/cm³

export const SURFACES: Record<SurfaceMaterial, SurfaceProperties> = {
  copper: {
    id: 'copper',
    name: 'Copper Plate',
    nameVi: 'Đĩa Đồng (Dẫn nhiệt cực cao)',
    thermalConductivity: 401, // W/(m·K)
    color: '#b87333',
    roughness: 0.25,
    metalness: 0.85,
  },
  aluminum: {
    id: 'aluminum',
    name: 'Aluminum Plate',
    nameVi: 'Đĩa Nhôm (Dẫn nhiệt cao)',
    thermalConductivity: 205, // W/(m·K)
    color: '#d1d5db',
    roughness: 0.3,
    metalness: 0.8,
  },
  granite: {
    id: 'granite',
    name: 'Granite Stone',
    nameVi: 'Đá Hoa Cương (Dẫn nhiệt trung bình)',
    thermalConductivity: 3.0, // W/(m·K)
    color: '#374151',
    roughness: 0.6,
    metalness: 0.1,
  },
  glass: {
    id: 'glass',
    name: 'Tempered Glass',
    nameVi: 'Kính Cường Lực (Dẫn nhiệt thấp)',
    thermalConductivity: 1.05, // W/(m·K)
    color: '#93c5fd',
    roughness: 0.1,
    metalness: 0.05,
  },
  wood: {
    id: 'wood',
    name: 'Mahogany Wood',
    nameVi: 'Gỗ Cẩm Lai (Cách nhiệt / Dẫn nhiệt rất kém)',
    thermalConductivity: 0.13, // W/(m·K)
    color: '#78350f',
    roughness: 0.7,
    metalness: 0.0,
  },
};

export function getEffectiveMeltingPoint(saltGrams: number): number {
  // Freezing point depression: ~0.55°C per gram of salt per 100g ice approx (up to -21.1°C max limit)
  if (saltGrams <= 0) return 0.0;
  const depression = Math.min(21.1, saltGrams * 1.2);
  return -depression;
}

export function computeInitialState(params: SimulationParams): PhysicsState {
  return {
    timeElapsed: 0,
    currentIceMass: params.initialIceMass,
    iceTemp: params.initialIceTemp,
    waterVolume: 0,
    waterTemp: 0,
    totalHeatAbsorbed: 0,
    meltRate: 0,
    phase: params.initialIceTemp < getEffectiveMeltingPoint(params.saltAmount) ? 'solid_heating' : 'melting_phase',
    dripRate: 0,
    blowtorchPosition: [0, 0, 0],
  };
}

export function updatePhysics(
  state: PhysicsState,
  params: SimulationParams,
  dt: number // delta time in seconds
): PhysicsState {
  if (params.isPaused || dt <= 0) return state;

  const actualDt = dt * params.simSpeed;
  const newTime = state.timeElapsed + actualDt;

  let iceMass = state.currentIceMass;
  let iceTemp = state.iceTemp;
  let waterVol = state.waterVolume;
  let waterTemp = state.waterTemp;
  let totalHeat = state.totalHeatAbsorbed;

  if (iceMass <= 0.01) {
    // Fully melted
    const qEnvironmentToWater = 15 * 0.02 * (params.ambientTemp - waterTemp) * actualDt;
    waterTemp += qEnvironmentToWater / ((params.initialIceMass * C_WATER) || 1);
    waterTemp = Math.min(waterTemp, params.ambientTemp);
    
    return {
      ...state,
      timeElapsed: newTime,
      currentIceMass: 0,
      iceTemp: params.ambientTemp,
      waterVolume: params.initialIceMass,
      waterTemp: Math.max(0, waterTemp),
      meltRate: 0,
      phase: 'fully_melted',
      dripRate: 0,
    };
  }

  const meltingPoint = getEffectiveMeltingPoint(params.saltAmount);

  // Surface area calculation based on remaining mass (approx cube/sphere scaling)
  // V = mass / density_ice (cm³). Radius or side L ~ V^(1/3)
  const volumeCm3 = iceMass / DENSITY_ICE;
  const sideLengthCm = Math.pow(volumeCm3, 1/3);
  const surfaceAreaM2 = Math.max(0.001, (6 * Math.pow(sideLengthCm / 100, 2))); // m²
  const bottomAreaM2 = Math.max(0.0005, Math.pow(sideLengthCm / 100, 2)); // m²

  // 1. Convection heat transfer from air (W = J/s)
  const hConvection = 15; // W/(m²·K)
  const deltaTAir = params.ambientTemp - iceTemp;
  const qAir = hConvection * surfaceAreaM2 * deltaTAir; // Joules per sec

  // 2. Conduction from plate substrate (W)
  const surfaceProps = SURFACES[params.surfaceMaterial];
  const dPlateThickness = 0.01; // 1 cm plate
  // Conduction depends on temperature differential with plate (ambient) and conductivity k
  const qConduction = (surfaceProps.thermalConductivity / dPlateThickness) * bottomAreaM2 * (params.ambientTemp - iceTemp) * 0.08;

  // 3. Heat Lamp radiation (W)
  const qLamp = params.heatLampActive ? params.heatLampPower * 0.45 : 0;

  // 4. Blowtorch localized heat (W)
  const qTorch = params.blowtorchActive ? params.blowtorchPower * 0.8 : 0;

  // 5. Salt exothermic reaction / melting boost
  const qSalt = params.saltAmount > 0 ? (params.saltAmount * 1.5) : 0;

  // Total heat rate into ice block (Joules/sec)
  const qRate = Math.max(-50, qAir + qConduction + qLamp + qTorch + qSalt); // J/s
  const qEnergyInStep = qRate * actualDt; // Joules

  let meltRate = 0;
  let phase = state.phase;

  if (iceTemp < meltingPoint) {
    // Solid heating phase: Q = m * c * deltaT
    phase = 'solid_heating';
    const energyToReachMeltingPoint = (meltingPoint - iceTemp) * iceMass * C_ICE;

    if (qEnergyInStep < energyToReachMeltingPoint) {
      iceTemp += qEnergyInStep / (iceMass * C_ICE);
      totalHeat += Math.max(0, qEnergyInStep);
    } else {
      // Reached melting point, use remaining energy to melt ice
      const excessEnergy = qEnergyInStep - energyToReachMeltingPoint;
      iceTemp = meltingPoint;
      totalHeat += Math.max(0, energyToReachMeltingPoint);

      // Melt portion
      const massMelted = excessEnergy / LATENT_HEAT_FUSION;
      const actualMelted = Math.min(iceMass, massMelted);
      iceMass -= actualMelted;
      waterVol += actualMelted;
      meltRate = actualMelted / actualDt;
      totalHeat += Math.max(0, actualMelted * LATENT_HEAT_FUSION);
      phase = 'melting_phase';
    }
  } else {
    // At or above melting point -> Phase change (Latent heat phase)
    phase = 'melting_phase';
    iceTemp = meltingPoint; // Temperature remains pinned at melting point during phase change!

    if (qEnergyInStep > 0) {
      const massMelted = qEnergyInStep / LATENT_HEAT_FUSION;
      const actualMelted = Math.min(iceMass, massMelted);
      iceMass -= actualMelted;
      waterVol += actualMelted;
      meltRate = actualMelted / actualDt;
      totalHeat += actualMelted * LATENT_HEAT_FUSION;
    }
  }

  // Water puddle temperature balancing (freshly melted water is ~0°C, then warms towards ambient)
  if (waterVol > 0) {
    const freshWater = waterVol;
    const qWaterGain = 20 * (surfaceAreaM2 * 2) * (params.ambientTemp - waterTemp) * actualDt;
    waterTemp += qWaterGain / (freshWater * C_WATER || 1);
    waterTemp = Math.max(0, Math.min(params.ambientTemp, waterTemp));
  }

  // Drip rate (droplets per second)
  const dripRate = meltRate > 0 ? Math.min(15, Math.max(0.5, meltRate * 2.5)) : 0;

  return {
    timeElapsed: newTime,
    currentIceMass: Math.max(0, iceMass),
    iceTemp: Math.min(params.ambientTemp, iceTemp),
    waterVolume: waterVol,
    waterTemp: Math.min(params.ambientTemp, waterTemp),
    totalHeatAbsorbed: totalHeat,
    meltRate,
    phase: iceMass <= 0.01 ? 'fully_melted' : phase,
    dripRate,
    blowtorchPosition: state.blowtorchPosition,
  };
}
