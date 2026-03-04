import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface RetroQRCodeProps {
  value: string;
  size?: number;
  eventTitle?: string;
  seatCode?: string;
}

export function RetroQRCode({
  value,
  size = 200,
  eventTitle,
  seatCode,
}: RetroQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 2,
      color: {
        dark: '#39FF14',
        light: '#0A0A0A',
      },
    });
  }, [value, size]);

  return (
    <div
      className="inline-flex flex-col items-center gap-3 p-5 rounded-2xl"
      style={{
        background: '#0A0A0A',
        border: '1px solid #39FF1440',
        boxShadow: '0 0 24px rgba(57,255,20,0.15)',
      }}
    >
      {/* Retro header */}
      <div className="w-full text-center">
        <p
          className="text-[10px] tracking-[0.3em] uppercase"
          style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#39FF14' }}
        >
          ▸ BLR SWIPE ◂
        </p>
      </div>

      {/* Skewed container */}
      <div
        style={{
          transform: 'skewX(-1deg)',
          padding: '4px',
          border: '1px solid rgba(57,255,20,0.3)',
          borderRadius: '8px',
        }}
      >
        <canvas ref={canvasRef} style={{ display: 'block', borderRadius: '4px' }} />
      </div>

      {/* Seat code */}
      {seatCode && (
        <div className="w-full text-center space-y-1">
          <p
            className="text-[8px] tracking-[0.4em] uppercase"
            style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#39FF1480' }}
          >
            SEAT CODE
          </p>
          <p
            className="text-xl font-bold tracking-[0.3em]"
            style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#39FF14' }}
          >
            {seatCode}
          </p>
        </div>
      )}

      {/* Event title */}
      {eventTitle && (
        <p
          className="text-[9px] tracking-widest uppercase text-center max-w-[180px] truncate"
          style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#39FF1466' }}
        >
          {eventTitle}
        </p>
      )}

      {/* Scanline overlay for retro feel */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(57,255,20,0.015) 2px, rgba(57,255,20,0.015) 4px)',
        }}
      />
    </div>
  );
}
