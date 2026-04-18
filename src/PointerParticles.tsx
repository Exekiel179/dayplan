import React, { useEffect, useRef } from 'react';

type Particle = {
  x: number;
  y: number;
  mx: number;
  my: number;
  size: number;
  decay: number;
  speed: number;
  spread: number;
  spreadX: number;
  spreadY: number;
  color: string;
};

const SAKURA_COLORS = [
  'hsla(334, 88%, 82%, 0.92)',
  'hsla(342, 92%, 76%, 0.9)',
  'hsla(324, 82%, 88%, 0.88)',
  'hsla(350, 84%, 80%, 0.9)',
];

function createParticle(
  pointer: { x: number; y: number; mx: number; my: number },
  spread: number,
  speed: number
): Particle {
  const normalizedSpeed = speed * 0.08;
  const spreadValue = spread * normalizedSpeed;
  return {
    x: pointer.x,
    y: pointer.y,
    mx: pointer.mx * 0.1,
    my: pointer.my * 0.1,
    size: Math.random() * 1.4 + 0.8,
    decay: 0.015 + Math.random() * 0.01,
    speed: normalizedSpeed,
    spread: spreadValue,
    spreadX: (Math.random() - 0.5) * spreadValue - pointer.mx * 0.1,
    spreadY: (Math.random() - 0.5) * spreadValue - pointer.my * 0.1,
    color: SAKURA_COLORS[Math.floor(Math.random() * SAKURA_COLORS.length)],
  };
}

export default function PointerParticles() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const pointerRef = useRef({ x: 0, y: 0, mx: 0, my: 0 });
  const enabledRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === 'undefined') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const media = window.matchMedia('(pointer: fine)');

    const syncEnabled = () => {
      enabledRef.current = media.matches;
    };

    const setCanvasDimensions = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const createParticles = (
      event: MouseEvent,
      { count, speed, spread }: { count: number; speed: number; spread: number }
    ) => {
      pointerRef.current = {
        x: event.clientX,
        y: event.clientY,
        mx: event.movementX,
        my: event.movementY,
      };

      for (let index = 0; index < count; index += 1) {
        particlesRef.current.push(createParticle(pointerRef.current, spread, speed));
      }
    };

    const getPointerVelocity = (event: MouseEvent) =>
      Math.max(1, Math.floor(Math.hypot(event.movementX, event.movementY)));

    const handlePointerMove = (event: MouseEvent) => {
      if (!enabledRef.current) return;
      createParticles(event, {
        count: 8,
        speed: Math.min(16, getPointerVelocity(event)),
        spread: 1.6,
      });
    };

    const handleClick = (event: MouseEvent) => {
      if (!enabledRef.current) return;
      createParticles(event, {
        count: 56,
        speed: 8 + Math.random() * 3,
        spread: 22 + Math.random() * 18,
      });
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;
      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.ellipse(particle.x, particle.y, particle.size * 1.2, particle.size * 0.82, Math.PI / 5, 0, Math.PI * 2);
        ctx.fill();

        particle.x += particle.spreadX * particle.size;
        particle.y += particle.spreadY * particle.size + particle.speed * 0.12;
        particle.size -= particle.decay;

        if (particle.size <= 0.12) {
          particles.splice(index, 1);
          index -= 1;
        }
      }

      frameRef.current = window.requestAnimationFrame(animate);
    };

    syncEnabled();
    setCanvasDimensions();
    media.addEventListener?.('change', syncEnabled);
    window.addEventListener('resize', setCanvasDimensions);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('click', handleClick);
    frameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      media.removeEventListener?.('change', syncEnabled);
      window.removeEventListener('resize', setCanvasDimensions);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('click', handleClick);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-particles-layer" aria-hidden="true" />;
}
