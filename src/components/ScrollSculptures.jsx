import { useEffect } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";

/**
 * Architectural 3D Sculptures & Scroll-Driven Parallax Layer.
 * Uses GPU-composited transforms (rotateX/Y/Z, translate3d) with spring physics
 * so scrolling with the mouse wheel feels fluid and tactile at 60fps.
 */
export default function ScrollSculptures() {
  const prefersReduced = useReducedMotion();
  const { scrollY, scrollYProgress } = useScroll();

  // Smooth spring-damped scroll progress for ultra-fluid motion
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    mass: 0.4,
  });

  const smoothY = useSpring(scrollY, {
    stiffness: 85,
    damping: 24,
    mass: 0.45,
  });

  // Subtle desktop pointer parallax
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springMouseX = useSpring(mouseX, { stiffness: 70, damping: 20 });
  const springMouseY = useSpring(mouseY, { stiffness: 70, damping: 20 });

  useEffect(() => {
    if (prefersReduced) return;
    const handleMove = (e) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 24;
      const ny = (e.clientY / window.innerHeight - 0.5) * 24;
      mouseX.set(nx);
      mouseY.set(ny);
    };
    window.addEventListener("pointermove", handleMove, { passive: true });
    return () => window.removeEventListener("pointermove", handleMove);
  }, [mouseX, mouseY, prefersReduced]);

  // 1) 3D Wireframe Cube transforms driven by scroll
  const cubeRotateX = useTransform(smoothY, [0, 1400], [22, 210]);
  const cubeRotateY = useTransform(smoothY, [0, 1400], [-28, 250]);
  const cubeY = useTransform(smoothY, [0, 1400], [0, -140]);

  // 2) Orbital Drafting Astrolabe transforms
  const ringRotate = useTransform(smoothY, [0, 1400], [0, 180]);
  const innerRingRotate = useTransform(smoothY, [0, 1400], [0, -240]);
  const ringY = useTransform(smoothY, [0, 1400], [0, 110]);

  // 3) Isometric Architectural Prism transforms
  const prismY = useTransform(smoothY, [0, 1400], [40, -190]);
  const prismRotate = useTransform(smoothY, [0, 1400], [-14, 78]);
  const prismScale = useTransform(smoothProgress, [0, 0.5, 1], [0.94, 1.06, 0.96]);

  // 4) Floating Monolith Slate transforms
  const slateY = useTransform(smoothY, [0, 1400], [-20, 140]);
  const slateRotate = useTransform(smoothY, [0, 1400], [8, -28]);

  return (
    <>
      {/* Top Scroll Progress Precision Hairline */}
      <motion.div
        style={{ scaleX: smoothProgress, transformOrigin: "0% 50%" }}
        className="fixed top-0 inset-x-0 h-[2px] bg-gradient-to-r from-[#E85D2A] via-[#F59E6C] to-[#E85D2A] z-[60] pointer-events-none"
      />

      {/* Ambient Architectural 3D Sculpture Canvas */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none"
      >
        {/* Soft warm studio rim light (restrained, editorial, never neon) */}
        <div
          className="absolute -top-40 start-1/4 w-[520px] h-[520px] rounded-full opacity-[0.06] blur-[120px]"
          style={{
            background: "radial-gradient(circle, #E85D2A 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-[-180px] end-1/4 w-[460px] h-[460px] rounded-full opacity-[0.045] blur-[130px]"
          style={{
            background: "radial-gradient(circle, #F5F3EE 0%, transparent 70%)",
          }}
        />

        {/* Sculpture 1: True CSS 3D Isometric Cube (Top-End) */}
        <motion.div
          style={
            prefersReduced
              ? {}
              : {
                  y: cubeY,
                  x: springMouseX,
                }
          }
          className="scene-3d absolute top-24 end-6 md:end-16 lg:end-24 w-24 h-24 md:w-32 md:h-32 opacity-45 md:opacity-75"
        >
          <motion.div
            style={
              prefersReduced
                ? { rotateX: 24, rotateY: -28 }
                : {
                    rotateX: cubeRotateX,
                    rotateY: cubeRotateY,
                  }
            }
            className="cube-3d w-full h-full"
          >
            {/* 6 faces of the 3D cube */}
            <div
              className="cube-face rounded-md flex items-center justify-center"
              style={{ transform: "translateZ(48px)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#E85D2A]/80" />
            </div>
            <div
              className="cube-face rounded-md"
              style={{ transform: "rotateY(180deg) translateZ(48px)" }}
            />
            <div
              className="cube-face rounded-md"
              style={{ transform: "rotateY(90deg) translateZ(48px)" }}
            />
            <div
              className="cube-face rounded-md"
              style={{ transform: "rotateY(-90deg) translateZ(48px)" }}
            />
            <div
              className="cube-face rounded-md"
              style={{ transform: "rotateX(90deg) translateZ(48px)" }}
            />
            <div
              className="cube-face rounded-md"
              style={{ transform: "rotateX(-90deg) translateZ(48px)" }}
            />
          </motion.div>
        </motion.div>

        {/* Sculpture 2: Precision Orbital Drafting Astrolabe (Mid-Start) */}
        <motion.div
          style={
            prefersReduced
              ? {}
              : {
                  y: ringY,
                  x: springMouseY,
                }
          }
          className="absolute top-[38%] -start-14 md:start-6 w-44 h-44 md:w-64 md:h-64 opacity-30 md:opacity-55"
        >
          <motion.svg
            viewBox="0 0 240 240"
            className="w-full h-full overflow-visible"
            style={prefersReduced ? {} : { rotate: ringRotate }}
          >
            <circle
              cx="120"
              cy="120"
              r="102"
              fill="none"
              stroke="rgba(245,243,238,0.14)"
              strokeWidth="1"
              strokeDasharray="4 7"
            />
            <circle
              cx="120"
              cy="120"
              r="76"
              fill="none"
              stroke="rgba(245,243,238,0.08)"
              strokeWidth="1"
            />
            {/* Cardinal drafting ticks */}
            <line x1="120" y1="8" x2="120" y2="24" stroke="#E85D2A" strokeWidth="1.5" />
            <line x1="120" y1="216" x2="120" y2="232" stroke="rgba(245,243,238,0.25)" strokeWidth="1" />
            <line x1="8" y1="120" x2="24" y2="120" stroke="rgba(245,243,238,0.25)" strokeWidth="1" />
            <line x1="216" y1="120" x2="232" y2="120" stroke="rgba(245,243,238,0.25)" strokeWidth="1" />
            <circle cx="120" cy="18" r="3.5" fill="#E85D2A" />
          </motion.svg>

          <motion.svg
            viewBox="0 0 240 240"
            className="absolute inset-0 w-full h-full overflow-visible"
            style={prefersReduced ? {} : { rotate: innerRingRotate }}
          >
            <ellipse
              cx="120"
              cy="120"
              rx="62"
              ry="28"
              fill="none"
              stroke="rgba(232,93,42,0.32)"
              strokeWidth="1"
            />
            <polygon
              points="120,76 158,120 120,164 82,120"
              fill="rgba(245,243,238,0.02)"
              stroke="rgba(245,243,238,0.16)"
              strokeWidth="1"
            />
          </motion.svg>
        </motion.div>

        {/* Sculpture 3: Faceted Geometric Octahedron Prism (Bottom-End) */}
        <motion.div
          style={
            prefersReduced
              ? {}
              : {
                  y: prismY,
                  rotate: prismRotate,
                  scale: prismScale,
                }
          }
          className="hidden sm:block absolute bottom-20 end-10 lg:end-20 w-36 h-36 md:w-44 md:h-44 opacity-45 md:opacity-65"
        >
          <svg viewBox="0 0 180 180" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="prismFaceA" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(245,243,238,0.12)" />
                <stop offset="100%" stopColor="rgba(245,243,238,0.01)" />
              </linearGradient>
              <linearGradient id="prismFaceB" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(232,93,42,0.22)" />
                <stop offset="100%" stopColor="rgba(232,93,42,0.02)" />
              </linearGradient>
            </defs>
            {/* Upper pyramid */}
            <polygon
              points="90,14 156,88 90,104"
              fill="url(#prismFaceB)"
              stroke="rgba(232,93,42,0.35)"
              strokeWidth="1"
            />
            <polygon
              points="90,14 24,88 90,104"
              fill="url(#prismFaceA)"
              stroke="rgba(245,243,238,0.18)"
              strokeWidth="1"
            />
            {/* Lower pyramid */}
            <polygon
              points="90,166 156,88 90,104"
              fill="rgba(245,243,238,0.03)"
              stroke="rgba(245,243,238,0.12)"
              strokeWidth="1"
            />
            <polygon
              points="90,166 24,88 90,104"
              fill="rgba(245,243,238,0.015)"
              stroke="rgba(245,243,238,0.14)"
              strokeWidth="1"
            />
            {/* Vertex dots */}
            <circle cx="90" cy="14" r="2.5" fill="#E85D2A" />
            <circle cx="90" cy="104" r="2" fill="#F5F3EE" fillOpacity="0.6" />
          </svg>
        </motion.div>

        {/* Sculpture 4: Floating Isometric Grid Slate (Mid-End, subtle) */}
        <motion.div
          style={
            prefersReduced
              ? {}
              : {
                  y: slateY,
                  rotate: slateRotate,
                }
          }
          className="hidden lg:block absolute top-[58%] end-[28%] w-28 h-28 opacity-25"
        >
          <svg viewBox="0 0 120 120" className="w-full h-full">
            <rect
              x="16"
              y="16"
              width="88"
              height="88"
              rx="14"
              fill="none"
              stroke="rgba(245,243,238,0.18)"
              strokeWidth="1"
            />
            <line x1="16" y1="45" x2="104" y2="45" stroke="rgba(245,243,238,0.1)" strokeWidth="1" />
            <line x1="16" y1="75" x2="104" y2="75" stroke="rgba(245,243,238,0.1)" strokeWidth="1" />
            <line x1="45" y1="16" x2="45" y2="104" stroke="rgba(245,243,238,0.1)" strokeWidth="1" />
            <line x1="75" y1="16" x2="75" y2="104" stroke="rgba(245,243,238,0.1)" strokeWidth="1" />
          </svg>
        </motion.div>
      </div>
    </>
  );
}
