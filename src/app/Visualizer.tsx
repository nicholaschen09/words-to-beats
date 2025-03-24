"use client";

import { useEffect, useRef, useState } from "react";
import * as Tone from "tone";

interface VisualizerProps {
  isPlaying: boolean;
  beatType: string;
}

export const Visualizer = ({ isPlaying, beatType }: VisualizerProps) => {
  const [isRecording, setIsRecording] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<Tone.Analyser | null>(null);
  const animationRef = useRef<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize the analyzer
  useEffect(() => {
    // Create a static placeholder visualization for when audio isn't playing
    const drawStaticVisualization = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Ensure canvas is properly sized
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;

      // Get colors for current beat type
      const colorMap: Record<string, { primary: string; secondary: string }> = {
        drums: { primary: "#f43f5e", secondary: "#fb7185" },
        synth: { primary: "#8b5cf6", secondary: "#a78bfa" },
        piano: { primary: "#10b981", secondary: "#34d399" },
        bass: { primary: "#f97316", secondary: "#fb923c" },
      };
      const colors = colorMap[beatType] || colorMap.synth;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw static placeholder waveform
      ctx.beginPath();

      // Draw a simple sine wave as placeholder
      const centerY = canvas.height / 2;
      const amplitude = canvas.height / 6;
      const frequency = 10; // Adjust for more/fewer waves

      ctx.moveTo(0, centerY);

      for (let x = 0; x < canvas.width; x++) {
        const y = centerY + Math.sin(x / frequency) * amplitude;
        ctx.lineTo(x, y);
      }

      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Add hint text
      ctx.font = "12px Arial";
      ctx.fillStyle = "#777";
      ctx.textAlign = "center";
      ctx.fillText(
        "Click Play to start audio",
        canvas.width / 2,
        canvas.height - 15
      );
    };

    // Try to initialize the analyser
    try {
      if (!analyserRef.current) {
        analyserRef.current = new Tone.Analyser("fft", 1024);
        // Connect the analyser to the main output
        Tone.getDestination().connect(analyserRef.current);
        setIsInitialized(true);
      }
    } catch (error) {
      console.warn("Audio analyser initialization deferred:", error);
      // Will try again later when audio context is ready
    }

    // Draw the static visualization initially
    drawStaticVisualization();

    return () => {
      // Clean up
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (analyserRef.current) {
        try {
          analyserRef.current.dispose();
        } catch (error) {
          console.warn("Error disposing analyser:", error);
        }
      }
    };
  }, [beatType]);

  // Handle visualization updates
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Ensure canvas is properly sized
    const resizeCanvas = () => {
      if (canvas) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Get color theme based on beat type
    const getColors = () => {
      const colorMap: Record<string, { primary: string; secondary: string }> = {
        drums: { primary: "#f43f5e", secondary: "#fb7185" },
        synth: { primary: "#8b5cf6", secondary: "#a78bfa" },
        piano: { primary: "#10b981", secondary: "#34d399" },
        bass: { primary: "#f97316", secondary: "#fb923c" },
      };

      return colorMap[beatType] || colorMap.synth;
    };

    const colors = getColors();

    // Animation function
    const draw = () => {
      if (!canvas || !ctx) return;

      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Only try to get frequency data if playing and analyzer is initialized
      if (isPlaying && analyserRef.current) {
        try {
          // Get frequency data from the analyser
          const frequencyData = analyserRef.current.getValue() as Float32Array;

          if (frequencyData && frequencyData.length > 0) {
            const barWidth = (canvas.width / frequencyData.length) * 2.5;
            const barSpacing = 1;

            // Draw frequency bars
            for (let i = 0; i < frequencyData.length; i++) {
              const value = frequencyData[i] as number;
              // Convert from dB to a height value (dB values are typically negative)
              const dbValue = (value + 140) / 140; // Normalize to 0-1 range
              const barHeight = dbValue * canvas.height * 0.8;

              const x = i * (barWidth + barSpacing);
              const y = canvas.height - barHeight;

              // Create gradient
              const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
              gradient.addColorStop(0, colors.primary);
              gradient.addColorStop(1, colors.secondary);

              ctx.fillStyle = gradient;
              ctx.fillRect(x, y, barWidth, barHeight);
            }
          } else {
            // Fallback if frequencyData is empty
            drawIdleState();
          }
        } catch (error) {
          console.warn("Error getting frequency data:", error);
          drawIdleState();
        }
      } else {
        drawIdleState();
      }

      // Continue animation
      animationRef.current = requestAnimationFrame(draw);
    };

    // Draw idle state with a simple line
    const drawIdleState = () => {
      if (!ctx || !canvas) return;

      // Draw different idle states based on whether audio is playing or not
      if (isPlaying) {
        // Draw a more active idle state when audio is playing but no data
        ctx.beginPath();

        const centerY = canvas.height / 2;
        const amplitude = canvas.height / 8;

        for (let x = 0; x < canvas.width; x += 5) {
          // Create a more randomized pattern
          const y = centerY + Math.random() * amplitude * 2 - amplitude;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // Draw a simple waveform for idle state
        ctx.beginPath();

        const centerY = canvas.height / 2;
        const amplitude = canvas.height / 10;
        const frequency = 15; // Adjust for more/fewer waves

        ctx.moveTo(0, centerY);

        for (let x = 0; x < canvas.width; x++) {
          const y = centerY + Math.sin(x / frequency) * amplitude;
          ctx.lineTo(x, y);
        }

        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };

    // Start animation
    animationRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, beatType, isInitialized]);

  useEffect(() => {
    // Ensure the visualizer updates when the beat type changes
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resize canvas to match its container
    const resizeCanvas = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Initialize or reconnect the analyser
    if (!analyserRef.current) {
      analyserRef.current = new Tone.Analyser("fft", 1024);
      Tone.getDestination().connect(analyserRef.current);
      setIsInitialized(true);
    }

    // Get colors for the current beat type
    const getColors = () => {
      const colorMap: Record<string, { primary: string; secondary: string }> = {
        drums: { primary: "#f43f5e", secondary: "#fb7185" },
        synth: { primary: "#8b5cf6", secondary: "#a78bfa" },
        piano: { primary: "#10b981", secondary: "#34d399" },
        bass: { primary: "#f97316", secondary: "#fb923c" },
      };
      return colorMap[beatType] || colorMap.synth;
    };

    const colors = getColors();

    // Draw the visualizer
    const draw = () => {
      if (!canvas || !ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isPlaying && analyserRef.current) {
        const frequencyData = analyserRef.current.getValue() as Float32Array;

        if (frequencyData.length > 0) {
          const barWidth = (canvas.width / frequencyData.length) * 2.5;
          const barSpacing = 1;

          for (let i = 0; i < frequencyData.length; i++) {
            const value = frequencyData[i];
            const normalizedValue = (value + 140) / 140; // Normalize dB values
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
        // Draw idle state
        ctx.beginPath();
        const centerY = canvas.height / 2;
        const amplitude = canvas.height / 10;
        const frequency = 15;

        ctx.moveTo(0, centerY);
        for (let x = 0; x < canvas.width; x++) {
          const y = centerY + Math.sin(x / frequency) * amplitude;
          ctx.lineTo(x, y);
        }

        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (analyserRef.current) {
        analyserRef.current.dispose();
        analyserRef.current = null;
      }
    };
  }, [isPlaying, beatType]); // Ensure beatType changes trigger updates

  return (
    <div className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};
