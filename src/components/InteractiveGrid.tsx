import { useState, useEffect, useRef } from "react";

export default function InteractiveGrid() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Calculate mouse position relative to the element
        setMousePos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-slate-50"
      style={
        {
          // Pass mouse coordinates as CSS variables for maximum performance
          "--x": `${mousePos.x}px`,
          "--y": `${mousePos.y}px`,
        } as React.CSSProperties
      }
    >
      {/* The base faint grid */}
      <div className="absolute inset-0 opacity-[0.15] bg-[linear-gradient(to_right,#94a3b8_1px,transparent_1px),linear-gradient(to_bottom,#94a3b8_1px,transparent_1px)] bg-[size:48px_48px]" />

      {/* The "Attracted" highlighted grid that reveals itself near the cursor */}
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,#c5c7c7_1.5px,transparent_1.5px),linear-gradient(to_bottom,#c5c7c7_1.5px,transparent_1.5px)] bg-[size:48px_48px] transition-opacity duration-300"
        style={{
          maskImage: `radial-gradient(300px circle at var(--x) var(--y), black 0%, transparent 100%)`,
          WebkitMaskImage: `radial-gradient(300px circle at var(--x) var(--y), black 0%, transparent 100%)`,
        }}
      />
    </div>
  );
}