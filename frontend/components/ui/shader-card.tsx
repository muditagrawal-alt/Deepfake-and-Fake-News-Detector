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
  uniform float u_intensity;
  uniform float u_scale;

  // High-performance hash and noise
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
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 4; ++i) {
      v += a * noise(p);
      p = rot * p * 2.02 + vec2(10.0);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;

    // Responsive coordinate adjustment with scale
    p *= (1.8 / max(u_scale, 0.2));

    // Mouse interactive tilt bias
    float mouseInfluence = (u_mouse.x - 0.5) * 0.25 * (1.0 - uv.y);
    p.x += mouseInfluence;

    // Upward flame travel
    float t = u_time * 1.5;
    vec2 flameCoord = p;
    flameCoord.y += t;

    // Multi-octave turbulent domain warping
    float q = fbm(flameCoord * 1.5);
    vec2 r = vec2(
      fbm(flameCoord + q + vec2(1.7, 9.2) + 0.15 * t),
      fbm(flameCoord + q + vec2(8.3, 2.8) + 0.126 * t)
    );
    float f = fbm(flameCoord + r * 1.2);

    // Volumetric flame teardrop / column envelope
    // Tapering width from bottom to top
    float width = mix(0.72, 0.18, smoothstep(0.0, 1.0, uv.y));
    float dist = abs(p.x) / max(width, 0.01);
    float flameMask = 1.0 - smoothstep(0.0, 1.15, dist);

    // Vertical top dissipation
    float verticalFade = smoothstep(0.98, 0.15, uv.y);
    float flameDensity = flameMask * verticalFade * (f * 2.0 + 0.15);

    // Tone curve
    float flamePower = pow(max(flameDensity, 0.0), 1.5) * u_intensity;

    // Color gradient mixing: dark foundation -> saturated flame color -> luminous white-hot core
    vec3 col = mix(vec3(0.01, 0.01, 0.02), u_color, smoothstep(0.06, 0.42, flamePower));
    col = mix(col, u_highlight, smoothstep(0.42, 0.82, flamePower));
    col = mix(col, vec3(1.0, 1.0, 1.0), smoothstep(0.82, 1.35, flamePower));

    // Alpha mask with soft outer atmospheric falloff
    float alpha = smoothstep(0.03, 0.32, flamePower) * 0.95;
    alpha = clamp(alpha, 0.0, 1.0);

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
  // Default electric cyan if unrecognized
  return [0.02, 0.71, 0.83];
}

export function ShaderCard({
  color = "#06b6d4",
  highlightColor = "#67e8f9",
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();
  const shouldReduceMotion = Boolean(reduceMotion);

  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const [isHovered, setIsHovered] = useState(false);
  const [tilt, setTilt] = useState<{ rotateX: number; rotateY: number }>({ rotateX: 0, rotateY: 0 });

  const rgbColor = parseColorToRgb(color);
  const rgbHighlight = parseColorToRgb(highlightColor);

  // Mouse coordinate tracker for 3D card tilt & shader flame deflection
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive || !containerRef.current || shouldReduceMotion) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setMousePos({ x, y });

      const tiltX = (0.5 - y) * 10;
      const tiltY = (x - 0.5) * 10;
      setTilt({ rotateX: tiltX, rotateY: tiltY });
    },
    [interactive, shouldReduceMotion]
  );

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ rotateX: 0, rotateY: 0 });
    setMousePos({ x: 0.5, y: 0.5 });
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

    // Compile shaders
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

    // Full screen quad buffer
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

    // Uniform locations
    const uResolution = gl.getUniformLocation(program, "u_resolution");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uColor = gl.getUniformLocation(program, "u_color");
    const uHighlight = gl.getUniformLocation(program, "u_highlight");
    const uMouse = gl.getUniformLocation(program, "u_mouse");
    const uIntensity = gl.getUniformLocation(program, "u_intensity");
    const uScale = gl.getUniformLocation(program, "u_scale");

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

      gl.useProgram(program);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, shouldReduceMotion ? 0.5 : elapsed);
      gl.uniform3f(uColor, rgbColor[0], rgbColor[1], rgbColor[2]);
      gl.uniform3f(uHighlight, rgbHighlight[0], rgbHighlight[1], rgbHighlight[2]);
      gl.uniform2f(uMouse, mousePos.x, mousePos.y);
      gl.uniform1f(uIntensity, (isHovered ? 1.35 : 1.0) * intensity);
      gl.uniform1f(uScale, scale * flameHeight);

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
    isHovered,
    mousePos,
    shouldReduceMotion,
  ]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative rounded-2xl group/shader-card transition-transform duration-200 [perspective:1000px]",
        containerClassName
      )}
      style={
        interactive && !shouldReduceMotion
          ? {
              transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
              transformStyle: "preserve-3d",
            }
          : undefined
      }
      {...props}
    >
      {/* Background Volumetric Luminous Flame Canvas */}
      <div
        className="pointer-events-none absolute -inset-x-8 -top-24 -bottom-8 overflow-visible z-0 select-none"
        aria-hidden="true"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full opacity-90 transition-opacity duration-300 group-hover/shader-card:opacity-100"
        />

        {/* Ambient Specular Halo behind card that picks up the flame color */}
        <div
          className="pointer-events-none absolute inset-x-8 top-0 h-40 rounded-full blur-3xl opacity-35 transition-all duration-300 group-hover/shader-card:opacity-60"
          style={{
            background: `radial-gradient(ellipse at top, ${color} 0%, transparent 75%)`,
          }}
        />
      </div>

      {/* Main Glass Surface Content Container */}
      <div
        className={cn(
          "relative z-10 h-full w-full rounded-2xl border border-white/10 bg-[#07080b]/90 backdrop-blur-2xl p-6 sm:p-7 shadow-[0_16px_40px_rgba(0,0,0,0.85)] transition-all duration-300 group-hover/shader-card:border-white/20 group-hover/shader-card:shadow-[0_20px_60px_rgba(0,0,0,0.95)] flex flex-col justify-between overflow-hidden",
          className
        )}
      >
        {/* Specular Inner Rim Light */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/30 to-transparent transition-opacity duration-300 group-hover/shader-card:via-white/60"
        />

        {children}
      </div>
    </div>
  );
}

export default ShaderCard;
