import React from 'react';
import { BookOpen, Flame, Atom, Sparkles } from 'lucide-react';

export const PhysicsTheory: React.FC = () => {
  return (
    <div className="flex flex-col gap-4 p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl shadow-xl text-slate-200">
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <BookOpen className="w-5 h-5 text-cyan-400" />
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-100 font-mono">Cơ Sở Vật Lý & Công Thức Nhiệt Động Học</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Card 1: Ẩn Nhiệt Nóng Chảy */}
        <div className="p-3.5 rounded-xl bg-black/30 border border-white/10 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-cyan-400 font-mono text-[11px] uppercase tracking-wider">
            <Atom className="w-4 h-4" />
            Ẩn Nhiệt Nóng Chảy (Lf = 334 J/g)
          </div>
          <p className="text-slate-300 leading-relaxed">
            Khi khối đá đạt <span className="text-cyan-300 font-semibold font-mono">0°C</span>, toàn bộ nhiệt lượng hấp thụ được sử dụng để phá vỡ các liên kết Hydro giữa các phân tử H₂O mà <span className="text-amber-400 font-semibold">KHÔNG làm tăng nhiệt độ</span>.
          </p>
          <div className="p-2 rounded-lg bg-black/60 font-mono text-[11px] text-cyan-200 border border-white/10">
            Q = m · Lf + m · c · ΔT
          </div>
        </div>

        {/* Card 2: Các Cơ Chế Truyền Nhiệt */}
        <div className="p-3.5 rounded-xl bg-black/30 border border-white/10 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-amber-400 font-mono text-[11px] uppercase tracking-wider">
            <Flame className="w-4 h-4" />
            3 Cơ Chế Truyền Nhiệt
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li>
              <strong className="text-amber-300">Dẫn nhiệt (k):</strong> Qua bề mặt đĩa tiếp xúc. Đồng (401 W/mK) dẫn nhiệt gấp 3000 lần Gỗ (0.13 W/mK).
            </li>
            <li>
              <strong className="text-amber-300">Đối lưu (h):</strong> Không khí xung quanh di chuyển cuốn nhiệt vào khối băng.
            </li>
            <li>
              <strong className="text-amber-300">Bức xạ (ε):</strong> Đèn hồng ngoại truyền photon trực tiếp.
            </li>
          </ul>
        </div>

        {/* Card 3: Thí Nghiệm Hạ Điểm Đóng Băng Của Muối */}
        <div className="p-3.5 rounded-xl bg-black/30 border border-white/10 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-400 font-mono text-[11px] uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            Hạ Điểm Đóng Băng Của Muối (ΔTf)
          </div>
          <p className="text-slate-300 leading-relaxed">
            Các ion Na⁺ và Cl⁻ chen vào giữa các phân tử H₂O, ngăn cản sự hình thành tinh thể băng. Nhờ đó điểm nóng chảy giảm xuống dưới <span className="text-cyan-300 font-mono font-semibold">0°C</span> (xuống tận <span className="text-cyan-300 font-mono font-semibold">-21°C</span>), giúp đá tan chảy ngay cả trong môi trường lạnh rét.
          </p>
        </div>

        {/* Card 4: Tại Sao Băng Băng Nổi Trên Nước? */}
        <div className="p-3.5 rounded-xl bg-black/30 border border-white/10 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-rose-400 font-mono text-[11px] uppercase tracking-wider">
            <BookOpen className="w-4 h-4" />
            Mật Độ Khối Lượng Tinh Thể
          </div>
          <p className="text-slate-300 leading-relaxed">
            Do cấu trúc tinh thể lục giác rỗng, thể tích của băng tăng lên khi đóng băng. Vì thế khối lượng riêng của băng (<span className="font-mono text-cyan-300 font-semibold">0.917 g/cm³</span>) nhỏ hơn nước lỏng (<span className="font-mono text-cyan-300 font-semibold">1.000 g/cm³</span>), làm băng luôn nổi trên mặt nước!
          </p>
        </div>
      </div>
    </div>
  );
};

