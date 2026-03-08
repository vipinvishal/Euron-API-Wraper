"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  stagger,
} from "framer-motion";
import {
  Eye,
  EyeOff,
  Key,
  ArrowRight,
  MessageSquare,
  ImageIcon,
  AudioLines,
  Layers,
  Brain,
  Code2,
  Sparkles,
  Shield,
  Zap,
  Globe,
  Star,
  CreditCard,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";

type PricingFilter = "all" | "free" | "paid";

/* ─── static data ─── */
const CATEGORY_PREVIEWS = [
  { icon: MessageSquare, label: "Chat & Text",      color: "text-blue-400",   count: "100+" },
  { icon: ImageIcon,     label: "Image Generation", color: "text-pink-400",   count: "20+"  },
  { icon: Brain,         label: "Reasoning",         color: "text-yellow-400", count: "15+"  },
  { icon: AudioLines,    label: "Audio",             color: "text-orange-400", count: "10+"  },
  { icon: Layers,        label: "Embeddings",        color: "text-green-400",  count: "15+"  },
  { icon: Code2,         label: "Code",              color: "text-cyan-400",   count: "20+"  },
];

const FEATURES = [
  { icon: Zap,      title: "Instant Discovery", desc: "See every model your key unlocks, organized in seconds."              },
  { icon: Shield,   title: "Key Stays Local",   desc: "Your API key is never stored on any server. Browser-only."           },
  { icon: Globe,    title: "200+ Models",        desc: "GPT-4, Claude, Gemini, Llama, Mistral and hundreds more."            },
  { icon: Sparkles, title: "Code Snippets",      desc: "One-click Python and JavaScript starters for every model."           },
];

/* ─── pre-computed particle data (stable, no hydration mismatch) ─── */
const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left: ((i * 37 + 11) % 97),
  top:  ((i * 53 + 7)  % 95),
  size: (i % 3) + 1,
  delay: (i * 0.4) % 6,
  duration: 4 + (i % 5),
}));

/* ─── orb drift variants ─── */
const orbVariants = {
  orb1: { x: [0, 60, -40, 0], y: [0, -50, 30, 0],  transition: { duration: 18, repeat: Infinity, repeatType: "loop" as const } },
  orb2: { x: [0, -70, 50, 0], y: [0,  40, -60, 0], transition: { duration: 22, repeat: Infinity, repeatType: "loop" as const, delay: 3 } },
  orb3: { x: [0,  50, -30, 0], y: [0, -30,  50, 0], transition: { duration: 16, repeat: Infinity, repeatType: "loop" as const, delay: 6 } },
};

/* ─── word-split heading ─── */
function AnimatedHeading() {
  const line1 = "Explore every model".split(" ");
  const line2 = "your API unlocks".split(" ");

  const container = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.07, delayChildren: 0.25 } },
  };
  const word = {
    hidden:  { opacity: 0, y: 24, filter: "blur(4px)" },
    visible: { opacity: 1, y: 0,  filter: "blur(0px)", transition: { duration: 0.5, ease: "easeOut" as const } },
  };

  return (
    <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
      <motion.span className="flex flex-wrap justify-center gap-x-3" variants={container} initial="hidden" animate="visible">
        {line1.map((w, i) => (
          <motion.span key={i} variants={word}>{w}</motion.span>
        ))}
      </motion.span>
      <motion.span
        className="flex flex-wrap justify-center gap-x-3 bg-gradient-to-r from-purple-400 via-blue-400 to-pink-400 bg-clip-text text-transparent"
        variants={container} initial="hidden" animate="visible"
        style={{ transition: "none" }}
      >
        {line2.map((w, i) => (
          <motion.span key={i} variants={word}>{w}</motion.span>
        ))}
      </motion.span>
    </h1>
  );
}

/* ─── animated counter ─── */
function CounterBadge({ target }: { target: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const num = parseInt(target, 10);

  useEffect(() => {
    const controls = animate(0, num, {
      duration: 1.4,
      delay: 0.3,
      ease: "easeOut",
      onUpdate(v) {
        if (ref.current) ref.current.textContent = Math.floor(v) + "+";
      },
    });
    return controls.stop;
  }, [num]);

  return <span ref={ref} className="text-xs font-mono text-muted-foreground/60">{target}</span>;
}

/* ─── tilt card ─── */
function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const rotX = useMotionValue(0);
  const rotY = useMotionValue(0);
  const gX   = useMotionValue(50);
  const gY   = useMotionValue(50);

  const rx = useTransform(rotX, v => `${v}deg`);
  const ry = useTransform(rotY, v => `${v}deg`);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top)  / r.height;
    rotX.set((ny - 0.5) * -10);
    rotY.set((nx - 0.5) *  10);
    gX.set(nx * 100);
    gY.set(ny * 100);
  }

  function onLeave() {
    animate(rotX, 0, { duration: 0.5, ease: "easeOut" });
    animate(rotY, 0, { duration: 0.5, ease: "easeOut" });
    animate(gX,  50, { duration: 0.5 });
    animate(gY,  50, { duration: 0.5 });
  }

  return (
    <motion.div
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d", transformPerspective: 800 }}
      className={className}
    >
      {/* Moving shine overlay */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: useTransform(
            [gX, gY],
            ([x, y]) => `radial-gradient(circle at ${x}% ${y}%, rgba(168,85,247,0.12) 0%, transparent 60%)`
          ),
        }}
      />
      {children}
    </motion.div>
  );
}

/* ─── main page ─── */
export default function LandingPage() {
  const router = useRouter();
  const [apiKey, setApiKey]         = useState("");
  const [showKey, setShowKey]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [focused, setFocused]       = useState(false);
  const [pricing, setPricing]       = useState<PricingFilter>("all");

  const isValidKey = apiKey.trim().length > 10;

  useEffect(() => {
    const saved = localStorage.getItem("euri_api_key");
    if (saved) router.replace("/dashboard");
  }, [router]);

  function handleExplore(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidKey) return;
    setLoading(true);
    localStorage.setItem("euri_api_key", apiKey.trim());
    localStorage.setItem("euri_pricing_filter", pricing);
    router.push("/dashboard");
  }

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Drifting gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div animate={orbVariants.orb1} className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-purple-600/20 blur-[120px]" />
        <motion.div animate={orbVariants.orb2} className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[120px]" />
        <motion.div animate={orbVariants.orb3} className="absolute -bottom-20 left-1/3 w-[400px] h-[400px] rounded-full bg-pink-600/15 blur-[100px]" />
      </div>

      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {PARTICLES.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-white/20"
            style={{ left: `${p.left}%`, top: `${p.top}%`, width: p.size, height: p.size }}
            animate={{ y: [0, -20, 0], opacity: [0.15, 0.6, 0.15] }}
            transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* Grid overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:40px_40px]" />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2"
        >
          <motion.div
            whileHover={{ rotate: 20, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 400 }}
            className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center"
          >
            <Sparkles className="w-4 h-4 text-white" />
          </motion.div>
          <span className="font-bold text-xl tracking-tight">Euri API Explorer</span>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <ThemeToggle />
        </motion.div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-16">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">

          {/* Badge with shimmer */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
            className="mb-6"
          >
            <Badge
              variant="outline"
              className="relative overflow-hidden px-4 py-1.5 text-sm border-purple-500/30 bg-purple-500/10 text-purple-300 gap-2"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full"
                animate={{ translateX: ["−100%", "200%"] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
              />
              <Sparkles className="w-3.5 h-3.5" />
              200+ AI Models. One API Key.
            </Badge>
          </motion.div>

          {/* Animated heading */}
          <AnimatedHeading />

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mb-12"
          >
            Enter your Euri API key and instantly see all accessible models organized
            by category — Chat, Image, Vision, Audio, Embeddings, Code, and Reasoning.
          </motion.p>

          {/* Input card with tilt + animated border */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-lg"
          >
            {/* Animated glow border */}
            <div className="relative group">
              <motion.div
                className="absolute -inset-[1px] rounded-2xl opacity-0 transition-opacity duration-500 group-focus-within:opacity-100"
                style={{
                  background: "linear-gradient(135deg, #a855f7, #3b82f6, #ec4899, #a855f7)",
                  backgroundSize: "300% 300%",
                }}
                animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              />
              <TiltCard className="relative group rounded-2xl border border-white/10 bg-card/60 backdrop-blur-xl p-6 shadow-2xl shadow-black/20">
                <div className="flex items-center gap-2 mb-4">
                  <motion.div
                    animate={focused ? { rotate: [0, -15, 15, 0], scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.4 }}
                  >
                    <Key className="w-4 h-4 text-purple-400" />
                  </motion.div>
                  <span className="text-sm font-medium">Enter your Euri API Key</span>
                </div>

                <form onSubmit={handleExplore} className="space-y-4">
                  <div className="relative">
                    <Input
                      type={showKey ? "text" : "password"}
                      placeholder="euri-xxxxxxxxxxxxxxxxxxxxxxxx"
                      value={apiKey}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="pr-10 font-mono text-sm h-11 bg-background/50 border-white/10 focus:border-purple-500/50 focus:ring-purple-500/20"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Pricing filter toggle */}
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground font-medium">Show models</p>
                    <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-background/50 border border-white/10">
                      {([
                        { value: "all",  label: "All Models", icon: LayoutGrid, color: "text-purple-400" },
                        { value: "free", label: "Free Only",  icon: Star,        color: "text-green-400"  },
                        { value: "paid", label: "Paid Only",  icon: CreditCard,  color: "text-amber-400"  },
                      ] as { value: PricingFilter; label: string; icon: React.ElementType; color: string }[]).map(({ value, label, icon: Icon, color }) => (
                        <motion.button
                          key={value}
                          type="button"
                          onClick={() => setPricing(value)}
                          whileTap={{ scale: 0.96 }}
                          className={`relative flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                            pricing === value
                              ? "bg-card shadow-sm border border-white/15 text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 ${pricing === value ? color : ""}`} />
                          <span>{label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <motion.div whileHover={{ scale: isValidKey ? 1.02 : 1 }} whileTap={{ scale: 0.97 }}>
                    <Button
                      type="submit"
                      disabled={!isValidKey || loading}
                      className="w-full h-11 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium gap-2 transition-all relative overflow-hidden"
                    >
                      {/* Button shimmer */}
                      {isValidKey && !loading && (
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
                          animate={{ translateX: ["-100%", "200%"] }}
                          transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1 }}
                        />
                      )}
                      {loading ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                          />
                          Loading dashboard…
                        </>
                      ) : (
                        <>
                          Explore Models
                          <motion.span animate={isValidKey ? { x: [0, 4, 0] } : {}} transition={{ repeat: Infinity, duration: 1.2 }}>
                            <ArrowRight className="w-4 h-4" />
                          </motion.span>
                        </>
                      )}
                    </Button>
                  </motion.div>
                </form>

                <p className="text-xs text-muted-foreground mt-4 text-center">
                  Your API key will be stored in your browser only — never sent to any server.{" "}
                  <a
                    href="https://euron.one/euri"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:underline whitespace-nowrap"
                  >
                    Get a key →
                  </a>
                </p>
              </TiltCard>
            </div>
          </motion.div>

          {/* Category pills — staggered */}
          <div className="flex flex-wrap justify-center gap-2 mt-10">
            {CATEGORY_PREVIEWS.map(({ icon: Icon, label, color, count }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 12, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 1.0 + i * 0.07, type: "spring", stiffness: 300 }}
                whileHover={{ scale: 1.06, y: -2 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-sm cursor-default"
              >
                <Icon className={`w-3.5 h-3.5 ${color}`} />
                <span className="text-muted-foreground">{label}</span>
                <CounterBadge target={count} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Feature cards — staggered with hover tilt */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-4 mt-20 max-w-4xl w-full px-4">
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 + i * 0.1, duration: 0.5, ease: "easeOut" }}
              whileHover={{ y: -4, scale: 1.02 }}
              className="rounded-xl border border-white/8 bg-card/40 backdrop-blur-sm p-4 space-y-2 cursor-default group"
            >
              <motion.div
                whileHover={{ rotate: 10, scale: 1.15 }}
                transition={{ type: "spring", stiffness: 400 }}
                className="w-8 h-8 rounded-lg bg-purple-500/15 group-hover:bg-purple-500/25 transition-colors flex items-center justify-center"
              >
                <Icon className="w-4 h-4 text-purple-400" />
              </motion.div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
