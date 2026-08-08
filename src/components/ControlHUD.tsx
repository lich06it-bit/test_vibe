import React from 'react';
import {
  Flame,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Sun,
  Thermometer,
  Volume2,
  VolumeX,
  Eye,
  Box,
} from 'lucide-react';
import { IceShape, SimulationParams, SurfaceMaterial } from '../types';
import { SURFACES } from '../utils/physics';

interface Props {
  params: SimulationParams;
  onChangeParams: (updated: Partial<SimulationParams>) => void;
  onReset: () => void;
}

export const ControlHUD: React.FC<Props> = ({ params, onChangeParams, onReset }) => {
  return (
    <div className="flex flex-col gap-4 p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl shadow-xl overflow-y-auto max-h-[calc(100vh-120px)]">
      {/* Simulation Playback Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChangeParams({ isPaused: !params.isPaused })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              params.isPaused
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : 'bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
            }`}
          >
            {params.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {params.isPaused ? 'Tiếp tục' : 'Tạm dừng'}
          </button>

          <button
            onClick={onReset}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 transition-all border border-white/10"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Đặt lại
          </button>
        </div>

        {/* Speed multiplier */}
        <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10">
          {[0.5, 1, 2, 5, 10].map((speed) => (
            <button
              key={speed}
              onClick={() => onChangeParams({ simSpeed: speed })}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-medium transition-colors ${
                params.simSpeed === speed
                  ? 'bg-orange-500/30 text-orange-200 font-bold border border-orange-500/40 shadow-[0_0_8px_rgba(249,115,22,0.4)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* Visual Toggles: Thermal Infrared & Sound */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onChangeParams({ thermalView: !params.thermalView })}
          className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-semibold border transition-all ${
            params.thermalView
              ? 'bg-orange-500/20 border-orange-500/50 text-orange-300 shadow-[0_0_12px_rgba(249,115,22,0.3)]'
              : 'bg-black/30 border-white/10 text-slate-300 hover:bg-white/5'
          }`}
        >
          <Eye className="w-4 h-4 text-orange-400" />
          Camera Hồng Ngoại
        </button>

        <button
          onClick={() => onChangeParams({ soundEnabled: !params.soundEnabled })}
          className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-semibold border transition-all ${
            params.soundEnabled
              ? 'bg-orange-500/20 border-orange-500/50 text-orange-300 shadow-[0_0_12px_rgba(249,115,22,0.3)]'
              : 'bg-black/30 border-white/10 text-slate-400 hover:bg-white/5'
          }`}
        >
          {params.soundEnabled ? <Volume2 className="w-4 h-4 text-orange-400" /> : <VolumeX className="w-4 h-4" />}
          Âm Thanh Giọt Nước
        </button>
      </div>

      {/* Group 1: Environment & Physics Settings */}
      <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-black/30 border border-white/10">
        <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2 font-mono">
          <Thermometer className="w-4 h-4 text-orange-400" />
          Môi Trường & Vật Lý
        </h3>

        {/* Ambient Temperature */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-medium">Nhiệt độ Môi trường (T_ambient)</span>
            <span className="font-mono text-orange-400 font-bold">{params.ambientTemp}°C</span>
          </div>
          <input
            type="range"
            min="-20"
            max="80"
            value={params.ambientTemp}
            onChange={(e) => onChangeParams({ ambientTemp: Number(e.target.value) })}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-400"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>-20°C (Đông)</span>
            <span>0°C</span>
            <span>25°C (Phòng)</span>
            <span>80°C (Nóng)</span>
          </div>
        </div>

        {/* Substrate Material */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            Đế Tiếp Xúc (Dẫn Nhiệt k)
          </label>
          <select
            value={params.surfaceMaterial}
            onChange={(e) => onChangeParams({ surfaceMaterial: e.target.value as SurfaceMaterial })}
            className="w-full px-3 py-1.5 bg-slate-900/90 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-orange-500/50"
          >
            {Object.values(SURFACES).map((surf) => (
              <option key={surf.id} value={surf.id}>
                {surf.nameVi} (k = {surf.thermalConductivity} W/mK)
              </option>
            ))}
          </select>
        </div>

        {/* Ice Shape */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
            <Box className="w-3.5 h-3.5 text-orange-400" />
            Hình Dạng Khối Đá
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'cube', label: 'Lập Phương' },
              { id: 'sphere', label: 'Khối Cầu' },
              { id: 'iceberg', label: 'Sông Băng' },
              { id: 'crystal', label: 'Đa Diện Crystal' },
              { id: 'sculpture', label: 'Tác Phẩm Sculpt' },
            ].map((shape) => (
              <button
                key={shape.id}
                onClick={() => onChangeParams({ iceShape: shape.id as IceShape })}
                className={`py-1.5 px-2 rounded-xl text-[11px] font-medium transition-all text-center border ${
                  params.iceShape === shape.id
                    ? 'bg-orange-500/20 border-orange-500/60 text-orange-200 font-bold shadow-[0_0_8px_rgba(249,115,22,0.3)]'
                    : 'bg-slate-900/40 border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                {shape.label}
              </button>
            ))}
          </div>
        </div>

        {/* Initial Mass */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-medium">Khối lượng Đá Ban Đầu</span>
            <span className="font-mono text-amber-400 font-bold">{params.initialIceMass}g</span>
          </div>
          <input
            type="range"
            min="100"
            max="1000"
            step="50"
            value={params.initialIceMass}
            onChange={(e) => onChangeParams({ initialIceMass: Number(e.target.value) })}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>
      </div>

      {/* Group 2: Heat Sources & Chemical Effects */}
      <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-black/30 border border-white/10">
        <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2 font-mono">
          <Sun className="w-4 h-4 text-amber-400" />
          Nguồn Nhiệt & Thí Nghiệm
        </h3>

        {/* Heat Lamp Toggle & Power */}
        <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-slate-900/60 border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              Đèn Hồng Ngoại (Bức xạ)
            </span>
            <input
              type="checkbox"
              checked={params.heatLampActive}
              onChange={(e) => onChangeParams({ heatLampActive: e.target.checked })}
              className="w-4 h-4 accent-amber-500 cursor-pointer"
            />
          </div>
          {params.heatLampActive && (
            <div className="flex flex-col gap-1 mt-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>Công suất:</span>
                <span className="text-amber-400 font-bold">{params.heatLampPower}W</span>
              </div>
              <input
                type="range"
                min="50"
                max="500"
                step="25"
                value={params.heatLampPower}
                onChange={(e) => onChangeParams({ heatLampPower: Number(e.target.value) })}
                className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-400"
              />
            </div>
          )}
        </div>

        {/* Blowtorch Toggle & Power */}
        <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-slate-900/60 border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-rose-500" />
              Đèn Khò Siêu Nhiệt (Kéo 3D)
            </span>
            <input
              type="checkbox"
              checked={params.blowtorchActive}
              onChange={(e) => onChangeParams({ blowtorchActive: e.target.checked })}
              className="w-4 h-4 accent-rose-500 cursor-pointer"
            />
          </div>
          {params.blowtorchActive && (
            <div className="flex flex-col gap-1 mt-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>Cường độ khò:</span>
                <span className="text-rose-400 font-bold">{params.blowtorchPower}W</span>
              </div>
              <input
                type="range"
                min="500"
                max="3000"
                step="100"
                value={params.blowtorchPower}
                onChange={(e) => onChangeParams({ blowtorchPower: Number(e.target.value) })}
                className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-rose-500"
              />
            </div>
          )}
        </div>

        {/* Salt Sprinkle Slider */}
        <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-slate-900/60 border border-white/10">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-200 font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-300" />
              Rắc Muối NaCl
            </span>
            <span className="font-mono text-orange-300 font-bold">{params.saltAmount}g</span>
          </div>
          <input
            type="range"
            min="0"
            max="30"
            value={params.saltAmount}
            onChange={(e) => onChangeParams({ saltAmount: Number(e.target.value) })}
            className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-orange-300"
          />
          <p className="text-[10px] text-slate-400 italic">
            {params.saltAmount > 0
              ? `Điểm nóng chảy giảm xuống ~-${(params.saltAmount * 0.7).toFixed(1)}°C!`
              : 'Chưa rắc muối.'}
          </p>
        </div>
      </div>
    </div>
  );
};
