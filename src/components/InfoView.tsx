import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";  
import { BarChart3, ShieldCheck, Newspaper, History, Upload, Sparkles, ArrowDown } from "lucide-react";

const TAGLINE = "Intelligent financial analysis, reimagined.";

const FEATURES = [
  {
    icon: <Upload className="w-5 h-5" />,
    label: "INGEST",
    title: "Smart document ingestion",
    desc: "Upload financial statements in any format. AI extracts and structures every figure automatically.",
    accent: "#386641",
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    label: "MATRIX",
    title: "Comparative analysis",
    desc: "Visualise and benchmark multiple companies side-by-side across every key financial metric.",
    accent: "#6a994e",
  },
  {
    icon: <ShieldCheck className="w-5 h-5" />,
    label: "FINCORE",
    title: "Deep financial scoring",
    desc: "Proprietary scoring engine evaluates liquidity, solvency, profitability and efficiency at a glance.",
    accent: "#386641",
  },
  {
    icon: <Newspaper className="w-5 h-5" />,
    label: "NEWS",
    title: "Market intelligence",
    desc: "Live financial news surfaced in context — stay informed without leaving your workflow.",
    accent: "#6a994e",
  },
  {
    icon: <History className="w-5 h-5" />,
    label: "ARCHIVE",
    title: "Historical records",
    desc: "Every report stored, versioned and searchable. Your full audit trail, always accessible.",
    accent: "#386641",
  },
  {
    icon: <Sparkles className="w-5 h-5" />,
    label: "AI",
    title: "AI-powered insights",
    desc: "Generate narrative summaries and sector comparisons with a single click — powered by frontier models.",
    accent: "#6a994e",
  },
];

interface LetterProps {
  char: string;
  index: number;
}

function MagneticLetter({ char, index }: LetterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isNear, setIsNear] = useState(false);
  const animFrameRef = useRef<number>();
  const currentOffset = useRef({ x: 0, y: 0 });
  const targetOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const loop = () => {
      const lerpFactor = isNear ? 0.16 : 0.08;
      const nx = currentOffset.current.x + (targetOffset.current.x - currentOffset.current.x) * lerpFactor;
      const ny = currentOffset.current.y + (targetOffset.current.y - currentOffset.current.y) * lerpFactor;
      currentOffset.current = { x: nx, y: ny };
      if (Math.abs(nx - targetOffset.current.x) > 0.02 || Math.abs(ny - targetOffset.current.y) > 0.02) {
        setOffset({ x: nx, y: ny });
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [isNear]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = 90;
    const force = Math.max(0, 1 - dist / maxDist);
    setIsNear(force > 0);
    targetOffset.current = { x: -dx * force * 0.5, y: -dy * force * 0.4 };
  };

  const handleMouseLeave = () => {
    setIsNear(false);
    targetOffset.current = { x: 0, y: 0 };
  };

  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0, y: 80, rotateX: -90, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.75, delay: index * 0.065, ease: [0.22, 1, 0.36, 1] }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        display: "inline-block",
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        cursor: "default",
        transformStyle: "preserve-3d",
        color: isNear ? "#6a994e" : "#0b140d",
        transition: "color 0.2s ease",
      }}
      className="select-none"
    >
      {char === " " ? "\u00A0" : char}
    </motion.span>
  );
}

function FeatureCard({ f, i, show }: { f: typeof FEATURES[0]; i: number; show: boolean }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={show ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.92)",
        borderColor: hovered ? "#6a994e" : "#c2d9b5",
        transform: hovered ? "translateY(-4px)" : "translateY(0px)",
        transition: "all 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
        boxShadow: hovered
          ? "0 12px 32px -8px rgba(56,102,65,0.18), 0 0 0 1px rgba(106,153,78,0.15)"
          : "0 2px 8px -2px rgba(56,102,65,0.06)",
      }}
      className="relative border rounded-xl p-6 cursor-default overflow-hidden"
      role="article"
      aria-label={f.title}
    >
      {/* Top accent bar */}
      <motion.div
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: "2px",
          background: f.accent,
          scaleX: hovered ? 1 : 0,
          transformOrigin: "left",
          transition: "transform 0.3s ease",
        }}
      />

      <div className="flex items-start gap-4">
        <div
          style={{
            background: hovered ? "#386641" : "#f2e8cf",
            transition: "background 0.25s ease",
            flexShrink: 0,
          }}
          className="w-9 h-9 rounded-lg flex items-center justify-center"
        >
          <span style={{ color: hovered ? "#fcfaf5" : "#386641", transition: "color 0.25s ease" }}>
            {f.icon}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              style={{ color: "#6a994e" }}
              className="text-[9px] font-extrabold tracking-[0.3em] uppercase"
            >
              {f.label}
            </span>
          </div>
          <h3 style={{ color: "#0b140d" }} className="text-sm font-semibold mb-1.5 leading-snug">
            {f.title}
          </h3>
          <p style={{ color: "#386641" }} className="text-xs leading-relaxed opacity-80">
            {f.desc}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function InfoView() {
const letters = "FinCore".split("");
  const [showTagline, setShowTagline] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [showScroll, setShowScroll] = useState(false);
  
  // Remove the container argument here so Framer Motion tracks the viewport
  const { scrollYProgress } = useScroll(); 
  
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, -40]);

  useEffect(() => {
    const base = letters.length * 65;
    const t1 = setTimeout(() => setShowTagline(true), base + 300);
    const t2 = setTimeout(() => setShowFeatures(true), base + 650);
    const t3 = setTimeout(() => setShowScroll(true), base + 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <motion.div
      key="info"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen flex flex-col overflow-x-hidden"
      style={{ background: "#F5FAF7" }}
    >
      {/* ── Hero ── */}
      <motion.section
        style={{ opacity: heroOpacity, y: heroY }}
        className="flex flex-col items-center justify-center pt-16 sm:pt-20 md:pt-24 pb-12 px-6 sm:px-10 text-center"
        aria-label="FinCore hero"
      >
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="mb-6 flex items-center gap-3"
          role="text"
          aria-label="Financial Intelligence Platform"
        >
          <span style={{ background: "#6a994e" }} className="w-8 h-px opacity-70" />
          <span
            style={{ color: "#6a994e" }}
            className="text-[10px] font-bold tracking-[0.35em] uppercase"
          >
            Financial Intelligence Platform
          </span>
          <span style={{ background: "#6a994e" }} className="w-8 h-px opacity-70" />
        </motion.div>

        {/* Logo */}
        <h1
          className="font-bold leading-none mb-6 sm:mb-8"
          style={{
            fontSize: "clamp(56px, 12vw, 128px)",
            letterSpacing: "-0.03em",
            perspective: "700px",
            perspectiveOrigin: "50% 50%",
            color: "#0b140d",
          }}
          aria-label="FinCore"
        >
          {letters.map((char, i) => (
            <MagneticLetter key={i} char={char} index={i} />
          ))}
        </h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={showTagline ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          style={{ color: "#386641" }}
          className="text-base sm:text-lg md:text-xl font-normal max-w-md sm:max-w-lg leading-relaxed mb-6"
        >
          {TAGLINE}
        </motion.p>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={showTagline ? { scaleX: 1, opacity: 1 } : {}}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          style={{ background: "#6a994e", transformOrigin: "center" }}
          className="w-12 h-0.5 rounded-full mb-2"
        />

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={showScroll ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mt-10 flex flex-col items-center gap-1.5"
          aria-hidden="true"
        >
          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          >
            <ArrowDown style={{ color: "#6a994e" }} className="w-4 h-4 opacity-60" />
          </motion.div>
          <span style={{ color: "#6a994e" }} className="text-[9px] tracking-[0.25em] uppercase opacity-50">
            Explore
          </span>
        </motion.div>
      </motion.section>

      {/* ── Stats strip ── */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={showFeatures ? { opacity: 1 } : {}}
        transition={{ duration: 0.6 }}
        style={{ borderColor: "#c2d9b5" }}
        className="border-y mx-6 sm:mx-10 lg:mx-16 mb-14"
        aria-label="Key statistics"
      >
        <div className="grid grid-cols-3 divide-x divide-[#c2d9b5]">
          {[
            { value: "10+", label: "Document formats" },
            { value: "AI", label: "Powered extraction" },
            { value: "∞", label: "Companies tracked" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={showFeatures ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex flex-col items-center py-5 sm:py-6 px-4 text-center"
            >
              <span
                style={{ color: "#386641" }}
                className="text-2xl sm:text-3xl font-bold tracking-tight mb-1"
              >
                {stat.value}
              </span>
              <span
                style={{ color: "#6a994e" }}
                className="text-[10px] tracking-[0.2em] uppercase opacity-70"
              >
                {stat.label}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── Feature grid ── */}
      <section
        className="max-w-5xl mx-auto w-full px-6 sm:px-10 pb-24"
        aria-label="Platform features"
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={showFeatures ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-4 mb-10"
        >
          <span style={{ background: "#c2d9b5" }} className="flex-1 h-px" />
          <span
            style={{ color: "#6a994e" }}
            className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-80"
          >
            Everything you need
          </span>
          <span style={{ background: "#c2d9b5" }} className="flex-1 h-px" />
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.label} f={f} i={i} show={showFeatures} />
          ))}
        </div>

        {/* Bottom caption */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={showFeatures ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          style={{ color: "#6a994e" }}
          className="text-center text-xs mt-12 opacity-50 tracking-wide"
        >
          Built for analysts, investors, and finance teams.
        </motion.p>
      </section>
    </motion.div>
  );
}