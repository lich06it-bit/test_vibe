import React, { useEffect, useRef, useState } from 'react';
import { Box, Activity, Atom, BookOpen, RotateCcw, Play, Pause, Sparkles } from 'lucide-react';
import { ControlHUD } from './components/ControlHUD';
import { IceSimulation3D } from './components/IceSimulation3D';
import { MicroscopicViewer } from './components/MicroscopicViewer';
import { PhysicsTheory } from './components/PhysicsTheory';
import { PresetBar } from './components/PresetBar';
import { TelemetryPanel } from './components/TelemetryPanel';
import { PRESETS } from './data/presets';
import { PhysicsState, PresetScenario, SimulationParams, TelemetryPoint } from './types';
import { computeInitialState, updatePhysics } from './utils/physics';
import { soundEngine } from './utils/audio';

export default function App() {
  const [params, setParams] = useState<SimulationParams>({
    iceShape: 'cube',
    surfaceMaterial: 'aluminum',
    initialIceMass: 300,
    ambientTemp: 25,
    heatLampActive: false,
    heatLampPower: 150,
    saltAmount: 0,
    blowtorchActive: false,
    blowtorchPower: 1500,
    simSpeed: 1,
    isPaused: false,
    thermalView: false,
    soundEnabled: true,
    initialIceTemp: -10,
  });

  const [physics, setPhysics] = useState<PhysicsState>(() => computeInitialState(params));
  const [history, setHistory] = useState<TelemetryPoint[]>([]);
  const [activePresetId, setActivePresetId] = useState<string>('room_temp');
  const [activeTab, setActiveTab] = useState<'3d' | 'split' | 'theory'>('split');

  const physicsRef = useRef(physics);
  physicsRef.current = physics;
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const lastHistoryRecordTimeRef = useRef<number>(0);

  // Sound muted state sync
  useEffect(() => {
    soundEngine.setMuted(!params.soundEnabled);
  }, [params.soundEnabled]);

  // Sync torch audio effect with blowtorchActive state
  useEffect(() => {
    soundEngine.updateTorchSound(params.blowtorchActive, params.blowtorchPower / 2000);
  }, [params.blowtorchActive, params.blowtorchPower, params.soundEnabled]);

  // Main Physics Ticker Loop
  useEffect(() => {
    let lastTime = performance.now();
    let animId: number;

    const tick = (now: number) => {
      animId = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - lastTime) / 1000); // delta in seconds
      lastTime = now;

      if (dt <= 0) return;

      const currentParams = paramsRef.current;
      const currentPhys = physicsRef.current;

      const nextPhys = updatePhysics(currentPhys, currentParams, dt);
      setPhysics(nextPhys);

      // Record telemetry every 0.5 seconds of simulation time
      if (nextPhys.timeElapsed - lastHistoryRecordTimeRef.current >= 0.5) {
        lastHistoryRecordTimeRef.current = nextPhys.timeElapsed;
        setHistory((prev) => {
          const point: TelemetryPoint = {
            time: nextPhys.timeElapsed,
            iceTemp: nextPhys.iceTemp,
            waterTemp: nextPhys.waterTemp,
            iceMass: nextPhys.currentIceMass,
            waterVolume: nextPhys.waterVolume,
            meltRate: nextPhys.meltRate,
            heatAbsorbed: nextPhys.totalHeatAbsorbed,
            phase: nextPhys.phase,
          };
          const newHist = [...prev, point];
          // Keep max 200 history points for smooth graphing performance
          return newHist.length > 200 ? newHist.slice(newHist.length - 200) : newHist;
        });
      }
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Handle Preset Select
  const handleSelectPreset = (preset: PresetScenario) => {
    setActivePresetId(preset.id);
    const updatedParams: SimulationParams = {
      ...params,
      ...preset.params,
    };
    setParams(updatedParams);

    // Reset physics state for new preset
    const freshState = computeInitialState(updatedParams);
    setPhysics(freshState);
    setHistory([]);
    lastHistoryRecordTimeRef.current = 0;
  };

  // Handle Manual Parameter Change
  const handleChangeParams = (updated: Partial<SimulationParams>) => {
    setParams((prev) => {
      const next = { ...prev, ...updated };
      // If mass or shape or initial ice temp changes significantly, re-initialize
      if (
        (updated.initialIceMass !== undefined && updated.initialIceMass !== prev.initialIceMass) ||
        (updated.initialIceTemp !== undefined && updated.initialIceTemp !== prev.initialIceTemp)
      ) {
        const freshState = computeInitialState(next);
        setPhysics(freshState);
        setHistory([]);
        lastHistoryRecordTimeRef.current = 0;
      }
      return next;
    });
  };

  // Reset Physics Simulation
  const handleReset = () => {
    const freshState = computeInitialState(params);
    setPhysics(freshState);
    setHistory([]);
    lastHistoryRecordTimeRef.current = 0;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseBadge = () => {
    switch (physics.phase) {
      case 'solid_heating':
        return <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-blue-950/80 text-blue-300 border border-blue-500/30 shadow-[0_0_8px_rgba(59,130,246,0.3)]">❄️ Đang Tăng Nhiệt (Đá Rắn)</span>;
      case 'melting_phase':
        return <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-orange-950/80 text-orange-300 border border-orange-400/50 animate-pulse shadow-[0_0_12px_rgba(249,115,22,0.5)]">💧 Đang Chuyển Pha Nóng Chảy (0°C)</span>;
      case 'liquid_heating':
      case 'fully_melted':
        return <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.3)]">🌊 Đã Tan Thành Nước Lỏng</span>;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#020617] text-slate-100 font-sans antialiased selection:bg-orange-500 selection:text-black relative overflow-x-hidden">
      {/* Immersive UI Radial Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#f9731622,transparent_60%)] pointer-events-none" />

      {/* Top Header */}
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between px-6 py-3 bg-slate-900/40 border-b border-white/10 backdrop-blur-md gap-3">
        <div className="flex items-center gap-3">
          <div className="w-3.5 h-3.5 rounded-full bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.9)] animate-pulse" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-widest uppercase text-slate-100 flex items-center gap-2">
                ICE PHASE SIMULATOR 3D
              </h1>
              <span className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded border border-orange-500/30 font-mono tracking-widest">
                RT-3D ENGINE
              </span>
              <span className="text-[11px] font-mono font-semibold text-orange-400 bg-orange-950/80 px-2.5 py-0.5 rounded-full border border-orange-500/40 shadow-[0_0_8px_rgba(249,115,22,0.2)]">
                Tác giả: LịchTT
              </span>
            </div>
            <p className="text-xs text-slate-400">Mô phỏng nhiệt động học & chuyển pha H₂O thời gian thực</p>
          </div>
        </div>

        {/* Header Telemetry Status */}
        <div className="hidden lg:flex items-center gap-4">
          {getPhaseBadge()}

          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-black/40 border border-white/10 font-mono text-xs">
            <span className="text-slate-400 text-[10px] uppercase tracking-wider">Thời gian:</span>
            <span className="text-orange-400 font-bold">{formatTime(physics.timeElapsed)}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-black/40 border border-white/10 font-mono text-xs">
            <span className="text-slate-400 text-[10px] uppercase tracking-wider">Băng còn:</span>
            <span className="text-amber-400 font-bold">{physics.currentIceMass.toFixed(1)}g / {params.initialIceMass}g</span>
          </div>
        </div>

        {/* View Mode Navigation Tabs */}
        <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10 backdrop-blur-xl">
          <button
            onClick={() => setActiveTab('3d')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === '3d'
                ? 'bg-orange-500/30 border border-orange-500/60 text-orange-200 shadow-[0_0_10px_rgba(249,115,22,0.3)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Box className="w-4 h-4 text-orange-400" />
            <span className="hidden sm:inline">Toàn Cảnh 3D</span>
          </button>

          <button
            onClick={() => setActiveTab('split')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'split'
                ? 'bg-orange-500/30 border border-orange-500/60 text-orange-200 shadow-[0_0_10px_rgba(249,115,22,0.3)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4 text-orange-400" />
            <span className="hidden sm:inline">3D + Đồ Thị & Phân Tử</span>
          </button>

          <button
            onClick={() => setActiveTab('theory')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'theory'
                ? 'bg-orange-500/30 border border-orange-500/60 text-orange-200 shadow-[0_0_10px_rgba(249,115,22,0.3)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4 text-orange-400" />
            <span className="hidden sm:inline">Lý Thuyết Vật Lý</span>
          </button>
        </div>
      </header>

      {/* Preset Toolbar */}
      <div className="px-6 pt-3 bg-black/20 border-b border-white/10 z-10">
        <PresetBar activePresetId={activePresetId} onSelectPreset={handleSelectPreset} />
      </div>

      {/* Main Content Layout */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        {/* Left Column: 3D Canvas */}
        <div className={`flex flex-col gap-3 ${activeTab === '3d' ? 'lg:col-span-8' : activeTab === 'split' ? 'lg:col-span-7' : 'hidden'}`}>
          <div className="relative w-full h-[540px] rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden">
            <IceSimulation3D
              params={params}
              physics={physics}
              onUpdateBlowtorchPos={(pos) => setPhysics((p) => ({ ...p, blowtorchPosition: pos }))}
            />

            {/* Floating Quick Action Overlay inside 3D View */}
            <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between p-3 rounded-xl bg-black/50 border border-white/10 backdrop-blur-xl shadow-lg">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleChangeParams({ isPaused: !params.isPaused })}
                  className="p-2.5 rounded-lg bg-orange-600/30 hover:bg-orange-600/50 border border-orange-500/50 text-orange-200 transition-all shadow-[0_0_12px_rgba(249,115,22,0.3)]"
                >
                  {params.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleReset}
                  className="p-2.5 rounded-lg bg-black/40 hover:bg-white/10 text-slate-200 transition-all border border-white/10"
                  title="Đặt lại mô phỏng"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-100">
                    Khối Lượng Còn: {physics.currentIceMass.toFixed(1)}g ({( (physics.currentIceMass / params.initialIceMass) * 100 ).toFixed(0)}%)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Nhiệt độ đá: {physics.iceTemp.toFixed(1)}°C | Nước tan: {physics.waterVolume.toFixed(1)} mL
                  </span>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Tốc độ:</span>
                <span className="text-xs font-bold text-orange-400 font-mono">{params.simSpeed}x</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column / Sidebar: Control HUD, Telemetry & Atomic Viewer */}
        <div className={`${activeTab === '3d' ? 'lg:col-span-4' : activeTab === 'split' ? 'lg:col-span-5' : 'lg:col-span-12'} flex flex-col gap-5`}>
          {activeTab === 'theory' ? (
            <PhysicsTheory />
          ) : (
            <>
              {/* Telemetry Charts & Atomic Viewer */}
              <MicroscopicViewer physics={physics} ambientTemp={params.ambientTemp} />
              <TelemetryPanel physics={physics} history={history} />
              <ControlHUD params={params} onChangeParams={handleChangeParams} onReset={handleReset} />
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 px-6 bg-slate-900/40 border-t border-white/10 text-center text-xs text-slate-400 font-mono uppercase tracking-widest relative z-10 backdrop-blur-md flex flex-wrap items-center justify-between gap-2">
        <span>Mô Phỏng 3D Nước Đá Tan Chảy • RT-3D Physics Engine</span>
        <span className="text-orange-400 font-bold tracking-wider">Tác giả: LịchTT</span>
        <span>H₂O Phase Transformation</span>
      </footer>
    </div>
  );
}
