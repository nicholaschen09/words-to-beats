"use client";

import { useEffect, useRef, useState } from "react";
import * as Tone from "tone";

interface VisualizerProps {
  isPlaying: boolean;
  beatType: string;
}

export const Visualizer = ({ isPlaying, beatType }: VisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<Tone.Analyser | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    if (!analyserRef.current) {
      analyserRef.current = new Tone.Analyser("fft", 1024);
      Tone.getDestination().connect(analyserRef.current);
    }

    const getColors = () => {
      return { primary: "#f43f5e", secondary: "#fb7185" }; // Always red
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isPlaying && analyserRef.current) {
        const frequencyData = analyserRef.current.getValue() as Float32Array;

        if (frequencyData.length > 0) {
          const barWidth = (canvas.width / frequencyData.length) * 2.5;
          const barSpacing = 1;
          const colors = getColors();

          for (let i = 0; i < frequencyData.length; i++) {
            const value = frequencyData[i];
            const normalizedValue = (value + 140) / 140;
            const barHeight = normalizedValue * canvas.height * 0.8;

            const x = i * (barWidth + barSpacing);
            const y = canvas.height - barHeight;

            const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
            gradient.addColorStop(0, colors.primary);
            gradient.addColorStop(1, colors.secondary);

            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barWidth, barHeight);
          }
        }
      } else {
        const centerY = canvas.height / 2;
        const amplitude = canvas.height / 10;
        const frequency = 15;

        ctx.beginPath();
        ctx.moveTo(0, centerY);
        for (let x = 0; x < canvas.width; x++) {
          const y = centerY + Math.sin(x / frequency) * amplitude;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = getColors().primary;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (analyserRef.current) {
        analyserRef.current.dispose();
        analyserRef.current = null;
      }
    };
  }, [isPlaying]);

  return (
    <div className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};
