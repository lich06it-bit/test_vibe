import React from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PhysicsState, TelemetryPoint } from '../types';

interface Props {
  physics: PhysicsState;
  history: TelemetryPoint[];
}

export const TelemetryPanel: React.FC<Props> = ({ physics, history }) => {
  const formattedHistory = history.map((item) => ({
    time: Math.round(item.time),
    iceTemp: Number(item.iceTemp.toFixed(1)),
    waterTemp: Number(item.waterTemp.toFixed(1)),
    iceMass: Number(item.iceMass.toFixed(1)),
    waterVolume: Number(item.waterVolume.toFixed(1)),
  }));

  const totalEnergyKj = (physics.totalHeatAbsorbed / 1000).toFixed(2);

  return (
    <div className="flex flex-col gap-4 p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl shadow-xl">
      {/* Header telemetry cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex flex-col">
          <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-400">Nhiệt Độ Đá</span>
          <span className="text-xl font-bold font-mono text-cyan-400">
            {physics.iceTemp.toFixed(1)}°C
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Trạng thái: {physics.phase === 'melting_phase' ? 'Chuyển Pha (0°C)' : 'Thể Rắn'}</span>
        </div>

        <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex flex-col">
          <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-400">Khối Lượng Còn</span>
          <span className="text-xl font-bold font-mono text-amber-400">
            {physics.currentIceMass.toFixed(1)}g
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Nước tan: {physics.waterVolume.toFixed(1)} mL</span>
        </div>

        <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex flex-col">
          <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-400">Năng Lượng (Q)</span>
          <span className="text-xl font-bold font-mono text-emerald-400">
            {totalEnergyKj} kJ
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Q = m·Lf + m·c·ΔT</span>
        </div>

        <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex flex-col">
          <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-400">Tốc Độ Tan</span>
          <span className="text-xl font-bold font-mono text-rose-400">
            {physics.meltRate.toFixed(2)} g/s
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Dòng chảy giọt</span>
        </div>
      </div>

      {/* Chart 1: Temperature vs Time */}
      <div className="p-3.5 rounded-xl bg-black/30 border border-white/10">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-slate-300">Đồ Thị Nhiệt Độ T(t) - Quan Sát Đoạn Bằng 0°C (Ẩn Nhiệt)</h4>
          <span className="text-[10px] font-mono text-cyan-400">0°C = Điểm nóng chảy</span>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} label={{ value: 'Thời gian (s)', position: 'insideBottomRight', offset: -5, fill: '#64748b', fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
              <ReferenceLine y={0} stroke="#22d3ee" strokeDasharray="3 3" label={{ value: '0°C Điểm Nóng Chảy', fill: '#22d3ee', fontSize: 10 }} />
              <Line type="monotone" dataKey="iceTemp" name="Nhiệt độ Đá (°C)" stroke="#22d3ee" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="waterTemp" name="Nhiệt độ Nước (°C)" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Mass & Water Volume vs Time */}
      <div className="p-3.5 rounded-xl bg-black/30 border border-white/10">
        <h4 className="text-xs font-semibold text-slate-300 mb-2">Biến Thiên Khối Lượng Băng M(t) & Thể Tích Nước (mL)</h4>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
              <Line type="monotone" dataKey="iceMass" name="Khối lượng Băng (g)" stroke="#f43f5e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="waterVolume" name="Thể tích Nước (mL)" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
