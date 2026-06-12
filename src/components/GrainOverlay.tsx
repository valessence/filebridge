import { useEffect, useRef } from 'react';

export default function GrainOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const noiseIntensity = 0.1;
    const grainStrength = 0.05;

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function render() {
      if (!ctx || !canvas) return;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      const imageData = ctx.createImageData(w, h);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const val = Math.random() * 255;
        let a = val / 255;
        a = a * noiseIntensity * grainStrength;
        a += (Math.random() * 2 - 1) * 0.02;
        a = Math.max(0, Math.min(1, a));

        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = Math.round(a * 255);
      }

      ctx.putImageData(imageData, 0, 0);
      animId = requestAnimationFrame(render);
    }

    resize();
    window.addEventListener('resize', resize);
    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 20,
        pointerEvents: 'none',
        width: '100%',
        height: '100%',
      }}
    />
  );
}
