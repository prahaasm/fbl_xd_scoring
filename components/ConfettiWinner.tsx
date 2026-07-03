'use client';

import { useEffect, useRef } from 'react';

interface Props {
  teamName: string;
  scoreA: number;
  scoreB: number;
  onDone: () => void;
}

const COLORS = ['#22c55e', '#facc15', '#3b82f6', '#ef4444', '#a855f7'];

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
  color: string;
  rotation: number;
}

export default function ConfettiWinner({ teamName, scoreA, scoreB, onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Particle[] = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.5,
      size: 4 + Math.random() * 6,
      speed: 2 + Math.random() * 3,
      drift: -2 + Math.random() * 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * 360,
    }));

    let frame: number;
    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.y += p.speed;
        p.x += p.drift;
        p.rotation += 5;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
      frame = requestAnimationFrame(draw);
    }
    draw();

    const timeout = setTimeout(onDone, 3000);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timeout);
    };
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70">
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" />
      <div className="relative z-10 text-center px-6">
        <div className="text-6xl mb-4">🏆</div>
        <div className="text-white text-lg font-medium mb-1">Winner</div>
        <div className="text-white text-3xl font-bold mb-3">{teamName}</div>
        <div className="text-green-400 text-4xl font-black">
          {scoreA} - {scoreB}
        </div>
      </div>
    </div>
  );
}
