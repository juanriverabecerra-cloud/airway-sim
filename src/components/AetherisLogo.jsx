import React, { useRef, useEffect } from 'react';

export function AetherisLogo({ className = "w-16 h-16", glow = true, onClick }) {
  const canvasRef = useRef(null);
  const excitationRef = useRef(0);
  const requestRef = useRef(null);
  
  // Track size using ref to avoid layout thrashing in the animation loop
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  
  // Accumulators for smooth, continuous wave phase integration (prevents jitter/phase jumps)
  const phaseAccumulatorRef = useRef(0);
  const lastTimeRef = useRef(0);
  const dtRef = useRef(0.016);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Updates canvas buffer size and caches bounds
    const updateDimensions = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      sizeRef.current = {
        width: rect.width,
        height: rect.height,
        dpr: dpr
      };
    };

    updateDimensions();

    // Use ResizeObserver to dynamically update buffer size during css transitions and screen adjustments
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    resizeObserver.observe(canvas);

    // Initial setup timestamp
    lastTimeRef.current = performance.now();

    const animate = (currentTime) => {
      // Calculate time delta dt in seconds (independent of frame rates)
      const rawDt = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      // Filter out browser scheduler micro-jitter using an exponential low-pass filter
      if (rawDt > 0.001 && rawDt < 0.1) {
        dtRef.current = dtRef.current * 0.95 + rawDt * 0.05;
      }

      // Decay the excitation ripple back to baseline
      if (excitationRef.current > 0.01) {
        excitationRef.current *= 0.96;
      } else {
        excitationRef.current = 0;
      }

      // Integrate velocity using the filtered dt to get the phase (eliminates speed-change skips)
      const speed = 2.8 * (1 + excitationRef.current * 1.5);
      phaseAccumulatorRef.current += dtRef.current * speed;

      const { width, height, dpr } = sizeRef.current;
      if (width === 0 || height === 0) {
        requestRef.current = requestAnimationFrame(animate);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.save();
      ctx.scale(dpr, dpr);

      // Determine square draw area
      const size = Math.min(width, height);
      const scale = size / 100;
      
      // Center the viewport
      const offsetX = (width - size) / 2;
      const offsetY = (height - size) / 2;
      ctx.translate(offsetX, offsetY);

      // Apply dynamic bounce and wobble on click/excitation
      if (excitationRef.current > 0) {
        // wobbleVal squishes and stretches the coordinate space to create a jelly-like physical response (subtle, low-frequency)
        const wobbleVal = 0.015 * excitationRef.current * Math.sin(phaseAccumulatorRef.current * 2.2);
        // scaleBounce swells and scales the logo outwards, then bounces back (subtle, low-frequency)
        const scaleBounce = 1 + 0.012 * excitationRef.current * Math.cos(phaseAccumulatorRef.current * 1.5);
        
        ctx.translate(size / 2, size / 2);
        ctx.scale(scaleBounce + wobbleVal, scaleBounce - wobbleVal);
        ctx.translate(-size / 2, -size / 2);
      }

      // Gradient for path rendering
      const gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, '#22d3ee'); // Cyan
      gradient.addColorStop(1, '#6366f1'); // Indigo

      // Mathematical wave offset generator - Plots a smooth wave envelope
      const getAnimatedY = (x, yBase, curveType) => {
        // Tapers the offset to exactly 0 at circle intersections (x=6 and x=94)
        const u = (x - 6) / 88;
        const env = Math.sin(Math.PI * u);
        const excitationMult = 1 + excitationRef.current * 1.5;
        
        if (curveType === 'A') {
          const amp = 18;
          const freq = 1.65 * Math.PI;
          const phaseA = phaseAccumulatorRef.current;
          
          // Primary wave + subtle secondary harmonic
          const dy = env * amp * excitationMult * 
            (Math.sin(freq * u - phaseA) + 0.3 * Math.sin(2 * freq * u - phaseA * 1.8));
          
          return (yBase + dy) * scale;
        } else if (curveType === 'B') {
          // Curve B has different spatial frequency, amplitude, and phase progression (speed factor)
          const amp = 13;
          const freq = 1.42 * Math.PI;
          const phaseB = phaseAccumulatorRef.current * 0.84 + 1.25; 
          
          const dy = env * amp * excitationMult * 
            (Math.sin(freq * u - phaseB) + 0.25 * Math.sin(2.2 * freq * u - phaseB * 2.0));
          
          return (yBase + dy) * scale;
        } else {
          // Curve C is the thin, high-frequency, modern background wave (creates tech depth)
          const amp = 8;
          const freq = 2.2 * Math.PI;
          const phaseC = phaseAccumulatorRef.current * 1.15 + 2.5;
          
          const dy = env * amp * excitationMult * 
            (Math.sin(freq * u - phaseC) + 0.2 * Math.sin(2.5 * freq * u - phaseC * 1.6));
          
          return (yBase + dy) * scale;
        }
      };

      // Draw waves inside a clipped area to ensure no bleeding outside the circle
      ctx.save();
      
      ctx.beginPath();
      ctx.arc(50 * scale, 50 * scale, 44 * scale, 0, 2 * Math.PI);
      ctx.clip();

      // Configure stroke style for compliance wave paths
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = gradient;

      if (glow) {
        ctx.shadowColor = 'rgba(34, 211, 238, 0.3)';
        ctx.shadowBlur = 8 * scale;
      } else {
        ctx.shadowBlur = 0;
      }

      // Draw Curve C (Thin background wave) - 3rd wave
      ctx.lineWidth = 0.8 * scale;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      for (let x = 6; x <= 94; x += 0.5) {
        const px = x * scale;
        const py = getAnimatedY(x, 50, 'C');
        if (x === 6) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();

      // Reset alpha for main waves
      ctx.globalAlpha = 1.0;

      // Draw Curve B (Secondary wave)
      ctx.lineWidth = 1.4 * scale;
      ctx.beginPath();
      for (let x = 6; x <= 94; x += 0.5) {
        const px = x * scale;
        const py = getAnimatedY(x, 50, 'B');
        if (x === 6) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();

      // Draw Curve A (Primary wave)
      ctx.lineWidth = 2.0 * scale;
      ctx.beginPath();
      for (let x = 6; x <= 94; x += 0.5) {
        const px = x * scale;
        const py = getAnimatedY(x, 50, 'A');
        if (x === 6) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();

      ctx.restore();

      // Draw outer circle on top of the waves to hide any cut endpoints perfectly
      ctx.beginPath();
      ctx.arc(50 * scale, 50 * scale, 44 * scale, 0, 2 * Math.PI);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1.5 * scale;
      
      if (glow) {
        ctx.shadowColor = 'rgba(34, 211, 238, 0.4)';
        ctx.shadowBlur = 12 * scale;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.stroke();

      ctx.restore();

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [glow]);

  const handleClick = (e) => {
    // Excite the waves instantly on click
    excitationRef.current = 1.5;
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <div className={`relative ${className} transition-all duration-700 ease-in-out`}>
      {/* Ambient background glow */}
      {glow && (
        <div className="absolute inset-0 bg-cyan-500/5 rounded-full blur-[25px] scale-150 animate-pulse pointer-events-none z-0"></div>
      )}
      
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="w-full h-full relative z-10 select-none block cursor-pointer"
      />
    </div>
  );
}
