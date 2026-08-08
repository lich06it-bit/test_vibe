import React, { useEffect, useRef } from 'react';
import { PhysicsState, SimPhase } from '../types';

interface Props {
  physics: PhysicsState;
  ambientTemp: number;
}

interface Molecule {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  targetX: number;
  targetY: number;
}

export const MicroscopicViewer: React.FC<Props> = ({ physics, ambientTemp }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const moleculesRef = useRef<Molecule[]>([]);

  // Initialize molecular grid (hexagonal lattice positions)
  useEffect(() => {
    const cols = 6;
    const rows = 5;
    const spacingX = 42;
    const spacingY = 36;
    const startX = 50;
    const startY = 40;

    const initialMols: Molecule[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const offset = (r % 2 === 0) ? 0 : spacingX / 2;
        const targetX = startX + c * spacingX + offset;
        const targetY = startY + r * spacingY;
        initialMols.push({
          x: targetX,
          y: targetY,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          angle: Math.random() * Math.PI * 2,
          targetX,
          targetY,
        });
      }
    }
    moleculesRef.current = initialMols;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      animId = requestAnimationFrame(render);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isSolid = physics.phase === 'solid_heating';
      const isMelting = physics.phase === 'melting_phase';
      const isLiquid = physics.phase === 'liquid_heating' || physics.phase === 'fully_melted';

      // Kinetic vibration scale based on temperature
      const thermalEnergy = Math.max(0.1, (physics.iceTemp + 30) / 10);
      const molecules = moleculesRef.current;

      // Draw Hydrogen Bonds in Solid/Melting State
      if (!isLiquid) {
        ctx.strokeStyle = isMelting ? 'rgba(56, 189, 248, 0.35)' : 'rgba(56, 189, 248, 0.7)';
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1.5;

        for (let i = 0; i < molecules.length; i++) {
          for (let j = i + 1; j < molecules.length; j++) {
            const dx = molecules[i].x - molecules[j].x;
            const dy = molecules[i].y - molecules[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Connect nearest hexagonal neighbors
            if (dist < 48) {
              ctx.beginPath();
              ctx.moveTo(molecules[i].x, molecules[i].y);
              ctx.lineTo(molecules[j].x, molecules[j].y);
              ctx.stroke();
            }
          }
        }
        ctx.setLineDash([]);
      }

      // Update & Draw H2O Molecules
      molecules.forEach((mol) => {
        if (isSolid) {
          // Vibrating around rigid lattice position
          const vibration = thermalEnergy * 0.8;
          mol.x = mol.targetX + (Math.random() - 0.5) * vibration;
          mol.y = mol.targetY + (Math.random() - 0.5) * vibration;
        } else if (isMelting) {
          // Transition: lattice breakdown, starting fluid drift
          mol.vx += (Math.random() - 0.5) * 0.3;
          mol.vy += (Math.random() - 0.5) * 0.3;
          mol.x += mol.vx;
          mol.y += mol.vy;

          // Boundary bounce inside canvas
          if (mol.x < 20 || mol.x > canvas.width - 20) mol.vx *= -1;
          if (mol.y < 20 || mol.y > canvas.height - 20) mol.vy *= -1;
        } else {
          // Liquid State: Free movement sliding past each other
          mol.vx += (Math.random() - 0.5) * 0.5;
          mol.vy += (Math.random() - 0.5) * 0.5;

          // Cap max fluid velocity proportional to waterTemp
          const maxSpeed = 1.5 + (physics.waterTemp / 20);
          const speed = Math.sqrt(mol.vx * mol.vx + mol.vy * mol.vy);
          if (speed > maxSpeed) {
            mol.vx = (mol.vx / speed) * maxSpeed;
            mol.vy = (mol.vy / speed) * maxSpeed;
          }

          mol.x += mol.vx;
          mol.y += mol.vy;

          if (mol.x < 25 || mol.x > canvas.width - 25) mol.vx *= -1;
          if (mol.y < 25 || mol.y > canvas.height - 25) mol.vy *= -1;
        }

        // Render H2O molecule (1 Oxygen red sphere + 2 Hydrogen white spheres at 104.5° angle!)
        ctx.save();
        ctx.translate(mol.x, mol.y);
        ctx.rotate(mol.angle);

        // Hydrogens (White)
        const hDistance = 11;
        const angleDeg = (104.5 * Math.PI) / 360;

        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(-Math.sin(angleDeg) * hDistance, -Math.cos(angleDeg) * hDistance, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(Math.sin(angleDeg) * hDistance, -Math.cos(angleDeg) * hDistance, 4, 0, Math.PI * 2);
        ctx.fill();

        // Oxygen (Red/Cyan)
        ctx.fillStyle = isSolid ? '#ef4444' : isMelting ? '#f97316' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [physics.phase, physics.iceTemp, physics.waterTemp]);

  const getPhaseDescription = (phase: SimPhase) => {
    switch (phase) {
      case 'solid_heating':
        return 'Băng Thể Rắn: Các phân tử H₂O liên kết chặt chẽ trong cấu trúc tinh thể lục giác nhờ liên kết Hydrogen.';
      case 'melting_phase':
        return 'Giai Đoạn Quá Độ (0°C): Hấp thụ ẩn nhiệt nóng chảy (334 J/g). Năng lượng bẻ gãy liên kết Hydrogen mà KHÔNG làm tăng nhiệt độ.';
      case 'liquid_heating':
      case 'fully_melted':
        return 'Nước Thể Lỏng: Các liên kết Hydrogen bị phá vỡ liên tục. Cấu trúc mạng tinh thể sụp đổ, phân tử trượt tự do.';
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-200 font-mono">Cấu Trúc Vi Mô Phân Tử H₂O</h3>
        </div>
        <span className="text-[10px] font-mono text-cyan-300 font-medium px-2 py-0.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40">
          Góc Liên Kết: 104.5°
        </span>
      </div>

      <div className="relative w-full h-48 bg-black/60 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center">
        <canvas ref={canvasRef} width={340} height={190} className="w-full h-full" />

        {/* Legend */}
        <div className="absolute bottom-2 left-2 flex items-center gap-3 px-2.5 py-1 rounded-lg bg-black/80 text-[10px] text-slate-300 font-mono border border-white/10 backdrop-blur-md">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> O (Oxy)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-100" /> H (Hydro)</span>
          <span className="flex items-center gap-1 text-cyan-400">--- Liên kết H</span>
        </div>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed font-sans bg-black/30 p-2.5 rounded-xl border border-white/10">
        {getPhaseDescription(physics.phase)}
      </p>
    </div>
  );
};
