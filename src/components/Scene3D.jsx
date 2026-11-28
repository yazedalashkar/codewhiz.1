import { useEffect, useMemo, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";

/* ---------- helpers ---------- */

function useMedia(query) {
  const get = () => (typeof window !== "undefined" ? window.matchMedia(query).matches : false);
  const [match, setMatch] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query, setMatch]);
  return match;
}

const SHADE = [
  "rgba(0,0,0,0)", // front
  "rgba(0,0,0,.34)", // back
  "rgba(0,0,0,.22)", // right
  "rgba(0,0,0,.42)", // left
  "rgba(255,255,255,.22)", // top
  "rgba(0,0,0,.55)", // bottom
];

/* A box with real depth: six faces, baked light, code glyph on the visible faces. */
function Box({ w, h, d, color, ink, glyphs }) {
  const faces = [
    { t: `translateZ(${d / 2}px)`, w, h },
    { t: `rotateY(180deg) translateZ(${d / 2}px)`, w, h },
    { t: `rotateY(90deg) translateZ(${w / 2}px)`, w: d, h },
    { t: `rotateY(-90deg) translateZ(${w / 2}px)`, w: d, h },
    { t: `rotateX(90deg) translateZ(${h / 2}px)`, w, h: d },
    { t: `rotateX(-90deg) translateZ(${h / 2}px)`, w, h: d },
  ];
  return (
    <div className="preserve-3d absolute inset-0" style={{ width: w, height: h }}>
      {faces.map((f, i) => (
        <div
          key={i}
          className="absolute flex items-center justify-center font-mono font-bold select-none"
          style={{
            width: f.w,
            height: f.h,
            left: "50%",
            top: "50%",
            marginLeft: -f.w / 2,
            marginTop: -f.h / 2,
            transform: f.t,
            backgroundColor: color,
            backgroundImage: `linear-gradient(${SHADE[i]},${SHADE[i]})`,
            color: ink,
            fontSize: Math.min(f.w, f.h) * 0.3,
            border: `2px solid ${ink}33`,
            borderRadius: 6,
          }}
        >
          {glyphs[i % glyphs.length]}
        </div>
      ))}
    </div>
  );
}

/* A wire sphere: slices of a globe, no fills, so it reads as a light object next to the solid boxes. */
function Orb({ size, color }) {
  const slices = 7;
  return (
    <div className="preserve-3d absolute inset-0" style={{ width: size, height: size }}>
      {Array.from({ length: slices }).map((_, i) => (
        <div
          key={i}
          className="absolute inset-0 rounded-full"
          style={{
            border: `2px solid ${color}`,
            transform: `rotateY(${(i * 180) / slices}deg)`,
            opacity: 0.9,
          }}
        />
      ))}
      <div
        className="absolute inset-0 rounded-full"
        style={{ border: `2px solid ${color}`, transform: "rotateX(90deg)", opacity: 0.9 }}
      />
    </div>
  );
}

/* ---------- one animated object ---------- */

function Shape({ cfg, progress, mx, my, scale }) {
  const { x, y, rot, depth, spin, fade } = cfg;

  const bx = useTransform(progress, [0, 1], x);
  const by = useTransform(progress, [0, 1], y);
  // mouse parallax is added on top of the scroll path (calc keeps vw + px together)
  const px = useTransform([bx, mx], ([a, m]) => `calc(${a} + ${m * -60 * depth}px)`);
  const py = useTransform([by, my], ([a, m]) => `calc(${a} + ${m * -40 * depth}px)`);
  const opacity = useTransform(progress, [0, 0.12, 0.35, 1], fade);
  const s = useTransform(progress, [0, 0.5, 1], cfg.scaleKeys.map((k) => k * scale));

  // scroll spins the object, mouse adds a parallax tilt on top of it.
  const rx = useTransform([progress, my], ([p, m]) => rot[0] + p * spin[0] + m * 38 * depth);
  const ry = useTransform([progress, mx], ([p, m]) => rot[1] + p * spin[1] + m * 52 * depth);
  const rz = useTransform(progress, [0, 1], [rot[2], rot[2] + spin[2]]);

  const size = cfg.w || cfg.size;
  return (
    <motion.div
      className="absolute left-1/2 top-1/2 preserve-3d"
      style={{
        width: size,
        height: cfg.h || cfg.size,
        marginLeft: -size / 2,
        marginTop: -(cfg.h || cfg.size) / 2,
        x: px,
        y: py,
        opacity,
        scale: s,
      }}
    >
      <motion.div
        className="preserve-3d relative"
        style={{ width: size, height: cfg.h || cfg.size, rotateX: rx, rotateY: ry, rotateZ: rz }}
      >
        {cfg.kind === "orb" ? (
          <Orb size={cfg.size} color={cfg.color} />
        ) : (
          <Box w={cfg.w} h={cfg.h} d={cfg.d} color={cfg.color} ink={cfg.ink} glyphs={cfg.glyphs} />
        )}
      </motion.div>
    </motion.div>
  );
}

/* ---------- the scene ---------- */

const COLORS = { flare: "#FF5C8A", iris: "#7B61FF", sun: "#FFC857", plum: "#2C2560", ink: "#120E24" };

const SHAPES = [
  // Hero object: a ZIP crate that swings from the hero to the side as the page scrolls.
  { id: "crate", kind: "box", w: 190, h: 190, d: 190, color: COLORS.flare, ink: COLORS.ink,
    glyphs: ["</>", ".zip", "{ }", "01", "#!", "()"],
    x: ["-26vw", "34vw"], y: ["-4vh", "22vh"], rot: [-24, 32, 0], spin: [300, 540, 40],
    depth: 1, fade: [1, 1, 0.55, 0.28], scaleKeys: [1, 0.78, 0.6] },
  { id: "slab", kind: "box", w: 250, h: 74, d: 150, color: COLORS.sun, ink: COLORS.ink,
    glyphs: ["ZIP", "▤", "src", "v1"],
    x: ["-8vw", "-34vw"], y: ["24vh", "-12vh"], rot: [58, -28, 8], spin: [-220, 400, -60],
    depth: 0.7, fade: [1, 0.9, 0.5, 0.25], scaleKeys: [1, 0.85, 0.7] },
  { id: "cube2", kind: "box", w: 96, h: 96, d: 96, color: COLORS.iris, ink: "#F3EEFF",
    glyphs: ["01", "10", "&&", "=>", "[]", "//"],
    x: ["-36vw", "-4vw"], y: ["-26vh", "-30vh"], rot: [30, 10, 20], spin: [-480, 360, 90],
    depth: 1.5, fade: [1, 1, 0.6, 0.3], scaleKeys: [1, 1.15, 0.8] },
  { id: "orb", kind: "orb", size: 230, color: COLORS.sun,
    x: ["-14vw", "30vw"], y: ["-20vh", "-8vh"], rot: [70, 0, 0], spin: [360, 220, 0],
    depth: 0.5, fade: [0.9, 0.8, 0.45, 0.22], scaleKeys: [1, 1.2, 0.9] },
  { id: "cube3", kind: "box", w: 64, h: 64, d: 64, color: COLORS.plum, ink: COLORS.flare,
    glyphs: ["{ }", "</>", "$_", "fn"],
    x: ["-2vw", "26vw"], y: ["30vh", "-26vh"], rot: [10, 40, 0], spin: [520, -320, 0],
    depth: 2, fade: [1, 1, 0.7, 0.35], scaleKeys: [1, 1.1, 0.9] },
];

const COMPACT_IDS = ["crate", "cube2", "orb"];

export default function Scene3D({ flip = false }) {
  const reduce = useReducedMotion();
  const compact = useMedia("(max-width: 767px)");
  const coarse = useMedia("(pointer: coarse)");

  const { scrollYProgress } = useScroll();
  // spring = the "smooth" feel: raw scroll is noisy, this glides.
  const smooth = useSpring(scrollYProgress, { stiffness: 70, damping: 22, mass: 0.6 });
  const still = useMotionValue(0);
  const progress = reduce ? still : smooth;

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const mx = useSpring(rawX, { stiffness: 60, damping: 18 });
  const my = useSpring(rawY, { stiffness: 60, damping: 18 });

  useEffect(() => {
    if (reduce || coarse) return;
    const move = (e) => {
      rawX.set(e.clientX / window.innerWidth - 0.5);
      rawY.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [reduce, coarse, rawX, rawY]);

  const shapes = useMemo(
    () => (compact ? SHAPES.filter((s) => COMPACT_IDS.includes(s.id)) : SHAPES),
    [compact]
  );

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      style={{ perspective: compact ? 700 : 1100, perspectiveOrigin: "50% 45%" }}
    >
      {shapes.map((cfg) => (
        <Shape
          key={cfg.id}
          cfg={{ ...cfg, x: cfg.x.map((v) => mapX(v, compact, flip)) }}
          progress={progress}
          mx={mx}
          my={my}
          scale={compact ? 0.55 : 1}
        />
      ))}
    </div>
  );
}

// On a phone the same vw offsets would push objects off-screen, so pull them toward the middle.
// `flip` mirrors the scene for LTR so the objects stay on the side opposite the headline.
function mapX(v, compact, flip) {
  let n = parseFloat(v);
  if (compact) n = Math.max(-30, Math.min(30, n * 0.7));
  return `${flip ? -n : n}vw`;
}
