import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { BarChart3, ShieldCheck, Newspaper, History, Upload, Sparkles } from "lucide-react";

const TAGLINE = "Intelligent financial analysis, reimagined.";

const FEATURES = [
    {
        icon: <Upload className="w-5 h-5" />,
        label: "INGEST",
        title: "Smart document ingestion",
        desc: "Upload financial statements in any format. AI extracts and structures every figure automatically.",
    },
    {
        icon: <BarChart3 className="w-5 h-5" />,
        label: "MATRIX",
        title: "Comparative analysis",
        desc: "Visualise and benchmark multiple companies side-by-side across every key financial metric.",
    },
    {
        icon: <ShieldCheck className="w-5 h-5" />,
        label: "FINCORE",
        title: "Deep financial scoring",
        desc: "Proprietary scoring engine evaluates liquidity, solvency, profitability and efficiency at a glance.",
    },
    {
        icon: <Newspaper className="w-5 h-5" />,
        label: "NEWS",
        title: "Market intelligence",
        desc: "Live financial news surfaced in context — stay informed without leaving your workflow.",
    },
    {
        icon: <History className="w-5 h-5" />,
        label: "ARCHIVE",
        title: "Historical records",
        desc: "Every report stored, versioned and searchable. Your full audit trail, always accessible.",
    },
    {
        icon: <Sparkles className="w-5 h-5" />,
        label: "AI",
        title: "AI-powered insights",
        desc: "Generate narrative summaries and sector comparisons with a single click — powered by frontier models.",
    },
];

interface LetterProps {
    char: string;
    index: number;
    total: number;
}

function MagneticLetter({ char, index, total }: LetterProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [hovered, setHovered] = useState(false);
    const animFrameRef = useRef<number>();
    const currentOffset = useRef({ x: 0, y: 0 });
    const targetOffset = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const animate = () => {
            const lerpFactor = hovered ? 0.18 : 0.1;
            const tx = targetOffset.current.x;
            const ty = targetOffset.current.y;
            const cx = currentOffset.current.x;
            const cy = currentOffset.current.y;
            const nx = cx + (tx - cx) * lerpFactor;
            const ny = cy + (ty - cy) * lerpFactor;
            currentOffset.current = { x: nx, y: ny };
            if (Math.abs(nx - tx) > 0.05 || Math.abs(ny - ty) > 0.05) {
                setOffset({ x: nx, y: ny });
            }
            animFrameRef.current = requestAnimationFrame(animate);
        };
        animFrameRef.current = requestAnimationFrame(animate);
        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [hovered]);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 80;
        const force = Math.max(0, 1 - dist / maxDist);
        targetOffset.current = {
            x: -dx * force * 0.55,
            y: -dy * force * 0.45,
        };
    };

    const handleMouseLeave = () => {
        setHovered(false);
        targetOffset.current = { x: 0, y: 0 };
    };

    return (
        <motion.span
            ref={ref}
            initial={{ opacity: 0, y: 60, rotateX: -90 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{
                duration: 0.7,
                delay: index * 0.06,
                ease: [0.22, 1, 0.36, 1],
            }}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={handleMouseLeave}
            style={{
                display: "inline-block",
                transform: `translate(${offset.x}px, ${offset.y}px)`,
                cursor: "default",
                transformStyle: "preserve-3d",
            }}
            className="select-none transition-colors duration-200 hover:text-sage-green"
        >
            {char === " " ? "\u00A0" : char}
        </motion.span>
    );
}

export function InfoView() {
    const letters = "FinCore".split("");
    const [showTagline, setShowTagline] = useState(false);
    const [showFeatures, setShowFeatures] = useState(false);

    useEffect(() => {
        const t1 = setTimeout(() => setShowTagline(true), letters.length * 60 + 400);
        const t2 = setTimeout(() => setShowFeatures(true), letters.length * 60 + 800);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, []);

    return (
        <motion.div
            key="info"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen flex flex-col"
        >
            {/* Hero */}
            <div className="flex flex-col items-center justify-center pt-24 pb-16 px-8 text-center">
                {/* Eyebrow */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="mb-6 flex items-center gap-2"
                >
                    <span className="w-6 h-[1px] bg-hacker-green-bright opacity-60" />
                    <span className="text-[10px] font-bold tracking-[0.35em] text-hacker-green-bright uppercase opacity-80">
                        Financial Intelligence Platform
                    </span>
                    <span className="w-6 h-[1px] bg-hacker-green-bright opacity-60" />
                </motion.div>

                {/* Logo letters */}
                <div
                    className="text-[88px] md:text-[120px] font-bold tracking-[-0.03em] text-hunter-green leading-none mb-6"
                    style={{ perspective: "600px", perspectiveOrigin: "50% 50%" }}
                >
                    {letters.map((char, i) => (
                        <MagneticLetter key={i} char={char} index={i} total={letters.length} />
                    ))}
                </div>

                {/* Tagline */}
                <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={showTagline ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="text-lg md:text-xl text-hunter-green-600 font-normal max-w-lg leading-relaxed mb-3"
                >
                    {TAGLINE}
                </motion.p>

                {/* Subtle divider */}
                <motion.div
                    initial={{ scaleX: 0 }}
                    animate={showTagline ? { scaleX: 1 } : {}}
                    transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="w-16 h-[2px] bg-hacker-green-bright rounded-full mt-4 mb-2 origin-left"
                />
            </div>

            {/* Feature grid */}
            <div className="max-w-5xl mx-auto w-full px-8 pb-24">
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={showFeatures ? { opacity: 1 } : {}}
                    transition={{ duration: 0.5 }}
                    className="text-[10px] font-bold tracking-[0.3em] text-hacker-green-bright uppercase text-center mb-10 opacity-70"
                >
                    Everything you need
                </motion.p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {FEATURES.map((f, i) => (
                        <motion.div
                            key={f.label}
                            initial={{ opacity: 0, y: 24 }}
                            animate={showFeatures ? { opacity: 1, y: 0 } : {}}
                            transition={{
                                duration: 0.55,
                                delay: i * 0.07,
                                ease: [0.22, 1, 0.36, 1],
                            }}
                            whileHover={{ y: -3, transition: { duration: 0.2 } }}
                            className="group relative bg-white/70 backdrop-blur-sm border border-hacker-border rounded-xl p-5 cursor-default overflow-hidden"
                        >
                            {/* Hover tint */}
                            <div className="absolute inset-0 bg-sage-green-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />

                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 rounded-lg bg-sage-green-900 border border-hacker-border flex items-center justify-center text-hacker-green">
                                        {f.icon}
                                    </div>
                                    <span className="text-[9px] font-extrabold tracking-[0.3em] text-hacker-green-bright uppercase">
                                        {f.label}
                                    </span>
                                </div>
                                <h3 className="text-sm font-semibold text-hunter-green mb-1.5">{f.title}</h3>
                                <p className="text-xs text-hunter-green-600 leading-relaxed">{f.desc}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}