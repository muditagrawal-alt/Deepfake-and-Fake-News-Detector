"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export interface ShaderCardProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: string;
  highlightColor?: string;
  speed?: number;
  intensity?: number;
  scale?: number;
  flameHeight?: number;
  interactive?: boolean;
  containerClassName?: string;
  children?: React.ReactNode;
}

const VERTEX_SHADER_SOURCE = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  precision highp float;

  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec3 u_color;
  uniform vec3 u_highlight;
  uniform vec2 u_mouse;
  uniform vec2 u_mouseVel;
  uniform float u_intensity;
  uniform float u_flameHeight;
  uniform float u_hover;

  // Hash & continuous 2D noise
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.877, 0.479, -0.479, 0.877);
    for (int i = 0; i < 4; ++i) {
      v += a * noise(p);
      p = rot * p * 2.02 + vec2(10.0);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float aspect = u_resolution.x / u_resolution.y;

    // Normalized mouse position (y inverted: 0 is bottom, 1 is top)
    vec2 mouseUV = vec2(u_mouse.x, 1.0 - u_mouse.y);
    vec2 mDiff = uv - mouseUV;
    mDiff.x *= aspect;
    float mDist = length(mDiff);

    // Hover-influenced flow speed
    float flowSpeed = 0.65 + u_hover * 0.45;
    float t = u_time * flowSpeed;

    // 1. Fluid swirl vortex around pointer
    float swirl = exp(-mDist * 4.2) * u_hover;
    float angle = swirl * 2.4;
    mat2 swirlRot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));

    vec2 p = uv;
    p.x *= aspect;
    p = mouseUV + swirlRot * (p - mouseUV);

    // 2. Wind push from cursor movement
    float wind = u_mouseVel.x * exp(-mDist * 3.5) * 0.35;

    // 3. Multi-frequency harmonic wave foundation
    float w1 = sin(p.x * 3.8 + t * 0.45 + wind) * 0.055;
    float w2 = sin(p.x * 7.5 - t * 0.65) * 0.028;
    float w3 = cos(p.x * 12.0 + t * 0.95) * 0.014;

    // 4. Multi-octave organic rolling turbulence
    vec2 nCoord1 = vec2(p.x * 2.4 - t * 0.18, uv.y * 2.0 - t * 0.4);
    float n1 = fbm(nCoord1);

    vec2 nCoord2 = vec2(p.x * 4.6 + n1 * 0.6 + t * 0.14, uv.y * 3.2 - t * 0.55);
    float n2 = fbm(nCoord2);

    // 5. Suction & pointer attraction: flame billows dynamically towards cursor
    float pointerLift = exp(-pow(mDist * 3.2, 2.0)) * 0.08 * u_hover;

    // 6. Interactive harmonic ripple wave radiating from pointer
    float pointerRipple = sin(mDist * 24.0 - t * 4.5) * exp(-mDist * 6.0) * 0.025 * u_hover;

    // Dynamic crest height
    float targetCrest = u_flameHeight * 0.25;
    float waveCrest = targetCrest + w1 + w2 + w3 + (n1 - 0.5) * 0.08 + (n2 - 0.5) * 0.03 + pointerLift + pointerRipple;
    // Strictly cap crest below the feature bullet items
    waveCrest = min(waveCrest, 0.34);

    float dist = waveCrest - uv.y;

    // Solid billowing cloud body below crest
    float body = smoothstep(-0.03, 0.05, dist);

    // Soft luminous rim along the crest
    float rim = exp(-abs(dist) * 26.0) * 0.65;

    // Volumetric diffuse glow extending slightly above the crest
    float glowAbove = exp(-max(uv.y - waveCrest, 0.0) * 22.0) * 0.5;

    // Luminous saturated base in the lower area
    float baseGlow = pow(clamp((0.32 - uv.y) / 0.32, 0.0, 1.0), 1.5) * 0.95;

    // Interactive cursor plasma heat bloom
    float cursorHeat = exp(-pow(mDist * 5.0, 2.0)) * 0.65 * u_hover;

    // Organic density modulation for billowing cloud look
    float internalTurbulence = 0.88 + (n1 * 0.12 + n2 * 0.08);

    // Rich saturated color:
    vec3 col = u_color * (0.85 + 0.22 * internalTurbulence);

    // Crest rim receives the luminous highlight accent
    col = mix(col, u_highlight, rim * 0.8);

    // Cursor heat flare adds brilliant radiant highlight
    col = mix(col, u_highlight, cursorHeat * 0.85);

    // Subtle warm center accent in the heart of the flame
    col += u_highlight * (baseGlow * 0.18);

    // Total intensity with hover boost
    float totalFlame = (body * 0.85 + glowAbove * 0.45 + baseGlow * 0.4 + cursorHeat * 0.5) * u_intensity;

    // Alpha with smooth volumetric falloff
    float alpha = smoothstep(0.01, 0.28, totalFlame) * 0.98;
    // Guaranteed pristine dark void above the flame so headlines and bullets stay 100% crisp
    alpha *= smoothstep(0.38, 0.32, uv.y);

    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

function parseColorToRgb(color: string): [number, number, number] {
  if (color.startsWith("#")) {
    const hex = color.replace("#", "");
    const fullHex = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
    const num = parseInt(fullHex, 16);
    return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
  }
  return [0.55, 0.36, 0.96]; // Default purple
}

export function ShaderCard({
  color = "#8b5cf6",
  highlightColor = "#d8b4fe",
  speed = 1.0,
  intensity = 1.0,
  scale = 1.0,
  flameHeight = 1.0,
  interactive = true,
  containerClassName,
  className,
  children,
  ...props
}: ShaderCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();
  const shouldReduceMotion = Boolean(reduceMotion);

  // Mouse / Pointer kinetic tracking
  const mouseStateRef = useRef({ x: 0.5, y: 0.5, vx: 0, vy: 0, hover: 0 });
  const isHoveredRef = useRef(false);
  const [tilt, setTilt] = useState<{ rotateX: number; rotateY: number }>({ rotateX: 0, rotateY: 0 });

  const rgbColor = parseColorToRgb(color);
  const rgbHighlight = parseColorToRgb(highlightColor);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive || !cardRef.current || shouldReduceMotion) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      const prevX = mouseStateRef.current.x;
      const prevY = mouseStateRef.current.y;
      mouseStateRef.current.vx = (x - prevX) * 10;
      mouseStateRef.current.vy = (y - prevY) * 10;
      mouseStateRef.current.x = x;
      mouseStateRef.current.y = y;
      mouseStateRef.current.hover = 1.0;

      const tiltX = (0.5 - y) * 8.5;
      const tiltY = (x - 0.5) * 8.5;
      setTilt({ rotateX: tiltX, rotateY: tiltY });
    },
    [interactive, shouldReduceMotion]
  );

  const handleMouseEnter = () => {
    isHoveredRef.current = true;
  };

  const handleMouseLeave = () => {
    isHoveredRef.current = false;
    setTilt({ rotateX: 0, rotateY: 0 });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });

    if (!gl) {
      console.warn("WebGL not supported for ShaderCard");
      return;
    }

    const createShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertShader = createShader(gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fragShader = createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);

    if (!vertShader || !fragShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const positionLocation = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, "u_resolution");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uColor = gl.getUniformLocation(program, "u_color");
    const uHighlight = gl.getUniformLocation(program, "u_highlight");
    const uMouse = gl.getUniformLocation(program, "u_mouse");
    const uMouseVel = gl.getUniformLocation(program, "u_mouseVel");
    const uIntensity = gl.getUniformLocation(program, "u_intensity");
    const uFlameHeight = gl.getUniformLocation(program, "u_flameHeight");
    const uHover = gl.getUniformLocation(program, "u_hover");

    let animationFrameId: number;
    const startTime = performance.now();

    const resize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const displayWidth = Math.floor(width * dpr);
      const displayHeight = Math.floor(height * dpr);

      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, displayWidth, displayHeight);
      }
    };

    resize();
    window.addEventListener("resize", resize);

    const render = (time: number) => {
      resize();

      const elapsed = (time - startTime) * 0.001 * speed;

      // Smooth decay of kinetic velocity and hover factor
      const m = mouseStateRef.current;
      m.vx *= 0.91;
      m.vy *= 0.91;
      const targetHover = isHoveredRef.current ? 1.0 : 0.0;
      m.hover += (targetHover - m.hover) * 0.08;

      gl.useProgram(program);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, shouldReduceMotion ? 0.5 : elapsed);
      gl.uniform3f(uColor, rgbColor[0], rgbColor[1], rgbColor[2]);
      gl.uniform3f(uHighlight, rgbHighlight[0], rgbHighlight[1], rgbHighlight[2]);
      gl.uniform2f(uMouse, m.x, m.y);
      gl.uniform2f(uMouseVel, m.vx, m.vy);
      gl.uniform1f(uIntensity, (1.0 + m.hover * 0.25) * intensity);
      gl.uniform1f(uFlameHeight, flameHeight * scale);
      gl.uniform1f(uHover, m.hover);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      if (!shouldReduceMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    if (shouldReduceMotion) {
      render(startTime);
    } else {
      animationFrameId = requestAnimationFrame(render);
    }

    return () => {
      window.removeEventListener("resize", resize);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (positionBuffer) gl.deleteBuffer(positionBuffer);
      if (program) gl.deleteProgram(program);
      if (vertShader) gl.deleteShader(vertShader);
      if (fragShader) gl.deleteShader(fragShader);
    };
  }, [
    rgbColor,
    rgbHighlight,
    speed,
    intensity,
    scale,
    flameHeight,
    shouldReduceMotion,
  ]);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "group/shader-card relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0c0d12] transition-all duration-300 hover:border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col justify-between",
        containerClassName,
        className
      )}
      style={
        interactive && !shouldReduceMotion
          ? {
              transform: `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
              transformStyle: "preserve-3d",
              transition: "transform 140ms ease-out, border-color 250ms ease, box-shadow 250ms ease",
            }
          : undefined
      }
      {...props}
    >
      {/* 
        Inside-the-Card Volumetric Flame Shader 
        Mounted inside the card container with overflow-hidden
      */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-full w-full z-0 opacity-90 transition-opacity duration-300 group-hover/shader-card:opacity-100 select-none"
      />

      {/* Ambient soft glow cushion inside the bottom */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[28%] opacity-15 blur-2xl transition-opacity duration-300 group-hover/shader-card:opacity-25"
        style={{
          background: `radial-gradient(ellipse at bottom, ${color} 0%, transparent 80%)`,
        }}
      />

      {/* Top subtle vignette so top text stays razor-sharp */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#0c0d12] via-[#0c0d12]/80 to-transparent z-[1]"
      />

      {/* Card Content Layer */}
      <div className="relative z-10 flex flex-col justify-between h-full p-6 sm:p-8">
        {children}
      </div>
    </div>
  );
}

export default ShaderCard;
