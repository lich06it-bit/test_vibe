import React from 'react';
import { PRESETS } from '../data/presets';
import { PresetScenario, SimulationParams } from '../types';
import { ThermometerSun, Sparkles, Layers, Sun, Flame, Mountain } from 'lucide-react';

interface Props {
  activePresetId: string;
  onSelectPreset: (preset: PresetScenario) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  ThermometerSun: <ThermometerSun className="w-4 h-4 text-amber-400" />,
  Sparkles: <Sparkles className="w-4 h-4 text-cyan-300" />,
  Layers: <Layers className="w-4 h-4 text-orange-400" />,
  Sun: <Sun className="w-4 h-4 text-yellow-400" />,
  Flame: <Flame className="w-4 h-4 text-rose-500" />,
  Mountain: <Mountain className="w-4 h-4 text-blue-400" />,
};

export const PresetBar: React.FC<Props> = ({ activePresetId, onSelectPreset }) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
      {PRESETS.map((preset) => {
        const isActive = activePresetId === preset.id;
        return (
          <button
            key={preset.id}
            onClick={() => onSelectPreset(preset)}
            className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl text-left whitespace-nowrap transition-all border shrink-0 ${
              isActive
                ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                : 'bg-black/40 border-white/10 text-slate-300 hover:bg-white/5'
            }`}
          >
            <div className="p-1.5 rounded-xl bg-black/50 border border-white/10">
              {ICON_MAP[preset.icon] || <ThermometerSun className="w-4 h-4" />}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold leading-tight">{preset.title}</span>
              <span className="text-[10px] text-slate-400 font-medium leading-tight">{preset.subtitle}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
