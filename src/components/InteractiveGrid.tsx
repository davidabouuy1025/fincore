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
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      style={
        {
          // Pass mouse coordinates as CSS variables for maximum performance
          backgroundColor: "var(--color-grid-bg)",
          "--x": `${mousePos.x}px`,
          "--y": `${mousePos.y}px`,
        } as React.CSSProperties
      }
    >
      {/* The base faint grid */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--color-grid-line) 1px, transparent 1px),
            linear-gradient(to bottom, var(--color-grid-line) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      {/* The "Attracted" highlighted grid that reveals itself near the cursor */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--color-grid-highlight) 1.5px, transparent 1.5px),
            linear-gradient(to bottom, var(--color-grid-highlight) 1.5px, transparent 1.5px)
          `,
          backgroundSize: "40px 40px",
          maskImage: `radial-gradient(300px circle at var(--x) var(--y), black 0%, transparent 100%)`,
          WebkitMaskImage: `radial-gradient(300px circle at var(--x) var(--y), black 0%, transparent 100%)`,
        }}
      />
    </div>
  );
}