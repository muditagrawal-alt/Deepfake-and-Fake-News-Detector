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

  // 4-octave Fractional Brownian Motion with rotational mixing
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
    for (int i = 0; i < 4; ++i) {
      v += a * noise(p);
      p = rot * p * 2.04 + vec2(11.23, 7.89);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float aspect = u_resolution.x / u_resolution.y;

    // Mouse coordinates in WebGL space: (0,0) bottom-left, (1,1) top-right
    vec2 mouseUV = vec2(u_mouse.x, 1.0 - u_mouse.y);
    vec2 vel = vec2(u_mouseVel.x, -u_mouseVel.y);
    float velMag = length(vel);

    // Vector from mouse to current fragment
    vec2 mDiff = uv - mouseUV;
    mDiff.x *= aspect;
    float mDist = length(mDiff);

    // Time scaling: dynamic acceleration when interacting or moving cursor
    float flowSpeed = 1.15 + u_hover * 0.45 + min(velMag * 0.80, 1.6);
    float t = u_time * flowSpeed;

    // 1. Organic aerodynamic eddy around cursor (natural flame curl, avoiding rigid concentric circles)
    float eddyDist = mDist * 3.0;
    float eddyCurl = exp(-eddyDist * 1.4) * (0.85 + min(velMag * 1.4, 1.2)) * u_hover;
    float curlAngle = clamp(eddyCurl * (vel.x >= 0.0 ? 1.0 : -1.0) * 0.75, -0.85, 0.85);
    mat2 curlMat = mat2(cos(curlAngle), -sin(curlAngle), sin(curlAngle), cos(curlAngle));

    // Curl transformed coordinates around pointer
    vec2 pRot = mouseUV + curlMat * (uv - mouseUV);
    pRot.x *= aspect;

    // 2. Velocity wind displacement
    vec2 windPush = vel * exp(-mDist * 2.4) * 0.35 * u_hover;
    vec2 p = pRot - windPush;

    // 3. Upward Buoyant Convection: hot flames naturally rise and surge towards the cursor
    float chimneyDist = abs(uv.x - mouseUV.x) * aspect;
    float upwardDraft = exp(-chimneyDist * 3.4) * smoothstep(0.0, mouseUV.y + 0.30, uv.y) * u_hover;

    // Smooth flame growth on hover:
    // In ambient resting state (u_hover = 0), flames burn at base reach (0.42).
    // As u_hover smoothly grows to 1.0, flames grow gracefully up towards cursor position (up to 1.22).
    float baseReach = 0.42;
    float cursorLift = max(mouseUV.y * 1.15, 0.45);
    float activeReach = mix(0.72, 1.22, cursorLift);
    float targetHeight = mix(baseReach, activeReach, u_hover) * u_flameHeight;

    // 4. Multi-octave domain-warped flame simulation (buoyant licking fire tongues)
    float buoyTime = t * 1.35;
    float verticalDrag = -vel.y * exp(-mDist * 2.2) * 0.35 * u_hover;

    vec2 fireP = vec2(
      p.x * 2.7 + sin(uv.y * 4.2 + t * 0.8) * 0.12,
      uv.y * 2.1 - buoyTime + verticalDrag
    );

    // Domain warp stage 1: turbulent rising plumes
    vec2 q = vec2(
      fbm(fireP + vec2(0.0, -buoyTime * 0.55)),
      fbm(fireP + vec2(5.2, 1.3) - vec2(0.0, buoyTime * 0.45))
    );

    // Domain warp stage 2: fine licking fire tendrils
    vec2 r = vec2(
      fbm(fireP + 3.2 * q + vec2(1.7, 9.2) - vec2(0.0, buoyTime * 0.85)),
      fbm(fireP + 3.2 * q + vec2(8.3, 2.8) - vec2(0.0, buoyTime * 0.75))
    );

    // Ridge noise synthesis: transforms smooth fbm into crisp, curling licking tongues of fire!
    float fRaw = fbm(fireP + 3.8 * r - vec2(0.0, buoyTime * 1.15));
    float fireTongues = pow(1.0 - abs(fRaw - 0.48) * 1.95, 2.8);

    // 5. Cursor fire flare & trailing combustion wake
    vec2 cursorFireCoord = vec2((uv.x - mouseUV.x) * aspect * 4.2, (uv.y - mouseUV.y) * 4.2 - buoyTime * 1.6);
    float cursorTongues = pow(1.0 - abs(fbm(cursorFireCoord + 2.4 * r) - 0.5) * 2.0, 2.4);
    float cursorGlow = exp(-pow(mDist * 3.4, 1.7)) * (0.75 + min(velMag * 0.9, 1.2)) * u_hover;
    float cursorCombustion = cursorTongues * cursorGlow * 1.5;

    // Aerodynamic fire wake trailing behind cursor motion direction
    vec2 normVel = normalize(vel + 1e-4);
    vec2 normDiff = normalize(mDiff + 1e-4);
    float trailAlignment = max(dot(-normVel, normDiff), 0.0);
    float cursorTrail = trailAlignment * exp(-mDist * 2.5) * min(velMag * 1.3, 1.5) * u_hover * (0.6 + 0.6 * fireTongues);

    // 6. Synthesizing full-card flame body with negative space
    float verticalShape = smoothstep(targetHeight + 0.12, 0.02, uv.y);
    float baseBed = pow(clamp((0.42 - uv.y) / 0.42, 0.0, 1.0), 1.5) * 0.60;

    // Total structured flame energy
    float flame = (fireTongues * 1.45 + baseBed) * verticalShape;
    flame += cursorCombustion + cursorTrail + upwardDraft * fireTongues * 0.75;

    // 7. Drifting sparks & incandescent embers flowing across the whole card
    vec2 emberCoord = vec2(p.x * 10.0 + sin(uv.y * 7.0 + t * 2.2) * 0.7, uv.y * 13.0 - t * 3.4);
    float emberNoise = hash(floor(emberCoord));
    vec2 emberFract = fract(emberCoord) - 0.5;
    float ember = smoothstep(0.14, 0.03, length(emberFract)) * step(0.91, emberNoise);
    ember *= (0.35 + 0.65 * smoothstep(0.0, 0.95, uv.y)) * (1.0 + min(velMag * 2.2, 3.2) * u_hover);

    // 8. Multi-temperature color gradation:
    // Rich saturated flame body
    vec3 col = u_color * 0.90;

    // Luminous high-temperature tongues & highlights
    col = mix(col, u_highlight, smoothstep(0.28, 0.75, flame));

    // White-hot incandescent plasma core (at cursor and hottest flame centers)
    col = mix(col, vec3(1.0, 0.99, 0.96), smoothstep(0.75, 1.25, flame));

    // Floating embers glow with radiant white-gold energy
    col += mix(u_highlight, vec3(1.0, 1.0, 0.95), 0.8) * ember * 2.4;

    // Total intensity scaling
    float totalIntensity = flame * u_intensity;

    // Crisp volumetric alpha with preserved negative space for supreme text contrast
    float alpha = smoothstep(0.12, 0.65, totalIntensity) * 0.64;

    // Soft feathered fade at the very top edge to prevent harsh clipping
    alpha *= smoothstep(1.04, 0.96, uv.y);

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

  // Mouse / Pointer kinetic tracking with critically damped fluid physics
  const mouseStateRef = useRef({ x: 0.5, y: 0.5, vx: 0, vy: 0, hover: 0 });
  const targetMouseRef = useRef({ x: 0.5, y: 0.5 });
  const isHoveredRef = useRef(false);
  const lastTimeRef = useRef<number>(0);
  const [tilt, setTilt] = useState<{ rotateX: number; rotateY: number }>({ rotateX: 0, rotateY: 0 });

  const rgbColor = parseColorToRgb(color);
  const rgbHighlight = parseColorToRgb(highlightColor);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive || !cardRef.current || shouldReduceMotion) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

      targetMouseRef.current.x = x;
      targetMouseRef.current.y = y;

      const tiltX = (0.5 - y) * 7.5;
      const tiltY = (x - 0.5) * 7.5;
      setTilt({ rotateX: tiltX, rotateY: tiltY });
    },
    [interactive, shouldReduceMotion]
  );

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    isHoveredRef.current = true;
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      targetMouseRef.current.x = x;
      targetMouseRef.current.y = y;
      if (mouseStateRef.current.hover < 0.05) {
        mouseStateRef.current.x = x;
        mouseStateRef.current.y = y;
      }
    }
  };

  const handleMouseLeave = () => {
    isHoveredRef.current = false;
    targetMouseRef.current.x = 0.5;
    targetMouseRef.current.y = 0.5;
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
    let isVisible = true;
    const startTime = performance.now();

    const resize = () => {
      if (!canvas) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) return;
      // Cap DPR to 1.25 for procedural shader cards to eliminate GPU fill rate bottlenecks
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      const displayWidth = Math.floor(width * dpr);
      const displayHeight = Math.floor(height * dpr);

      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, displayWidth, displayHeight);
      }
    };

    resize();

    // Use ResizeObserver instead of polling canvas dimensions in every RAF frame
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        resize();
      });
      resizeObserver.observe(canvas);
    } else {
      window.addEventListener("resize", resize);
    }

    const render = (time: number) => {
      if (!isVisible) return;

      const nowSec = time * 0.001;
      const lastSec = lastTimeRef.current > 0 ? lastTimeRef.current : nowSec - 0.016;
      lastTimeRef.current = nowSec;
      const dt = Math.max(0.001, Math.min(nowSec - lastSec, 0.06));

      const elapsed = (time - startTime) * 0.001 * speed;

      // Smooth exponential growth on hover (gentle ~450ms physical swelling)
      const m = mouseStateRef.current;
      const targetHover = isHoveredRef.current ? 1.0 : 0.0;
      m.hover += (targetHover - m.hover) * (1.0 - Math.exp(-dt * 4.5));

      // Critically damped spring tracking for smooth cursor motion without sudden jumps
      const targetX = targetMouseRef.current.x;
      const targetY = targetMouseRef.current.y;
      const posLerp = 1.0 - Math.exp(-dt * 8.0);
      const prevX = m.x;
      const prevY = m.y;
      m.x += (targetX - m.x) * posLerp;
      m.y += (targetY - m.y) * posLerp;

      // Organic fluid velocity tracking
      const rawVx = (m.x - prevX) / dt * 0.14;
      const rawVy = (m.y - prevY) / dt * 0.14;
      const velLerp = 1.0 - Math.exp(-dt * 7.5);
      m.vx += (rawVx - m.vx) * velLerp;
      m.vy += (rawVy - m.vy) * velLerp;

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

      if (!shouldReduceMotion && isVisible) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    // IntersectionObserver to completely sleep shader execution when out of viewport
    let intersectionObserver: IntersectionObserver | null = null;
    const targetEl = cardRef.current ?? canvas;
    if (typeof IntersectionObserver !== "undefined" && targetEl) {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          const visible = entry?.isIntersecting ?? false;
          if (visible !== isVisible) {
            isVisible = visible;
            if (isVisible && !shouldReduceMotion) {
              lastTimeRef.current = performance.now() * 0.001;
              cancelAnimationFrame(animationFrameId);
              animationFrameId = requestAnimationFrame(render);
            } else if (!isVisible) {
              cancelAnimationFrame(animationFrameId);
            }
          }
        },
        { rootMargin: "150px" }
      );
      intersectionObserver.observe(targetEl);
    }

    if (shouldReduceMotion) {
      render(startTime);
    } else {
      animationFrameId = requestAnimationFrame(render);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener("resize", resize);
      }
      if (intersectionObserver) {
        intersectionObserver.disconnect();
      }
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
        "group/shader-card relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0c0d12] transition-[border-color,box-shadow] duration-200 hover:border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col justify-between transform-gpu will-change-transform [backface-visibility:hidden]",
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
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[40%] opacity-20 blur-3xl transition-opacity duration-300 group-hover/shader-card:opacity-35"
        style={{
          background: `radial-gradient(ellipse at bottom, ${color} 0%, transparent 80%)`,
        }}
      />

      {/* Gentle translucent atmospheric scrim - transparent so flames flow across full card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/30 z-[1]"
      />

      {/* Card Content Layer */}
      <div className="relative z-10 flex flex-col justify-between h-full p-6 sm:p-8">
        {children}
      </div>
    </div>
  );
}

export default ShaderCard;
