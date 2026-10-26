import React, { useEffect, useMemo, useRef, useState } from 'react';
import { WALL_FEET, getTierByKey, HitTier } from '../lib/scoring';

// Top-down ballpark. Home plate sits at the bottom, the outfield wall is 400 ft out,
// and the stands wrap around behind it. A guess is "hit" from home plate and flies
// as far as it earned.

export interface StadiumHit {
  feet: number;
  angle: number; // degrees, 0 = dead centre, negative = left field
  tier: HitTier;
  label?: string; // shown on the spray chart dots
  color?: string; // overrides the tier colour (easy mode)
}

interface StadiumProps {
  hits: StadiumHit[];
  /** 'flight' animates the last hit flying out. 'spray' shows all hits as landing spots. */
  variant: 'flight' | 'spray';
  onLanded?: () => void;
  className?: string;
  /** Where the average player's guess landed, drawn as a faint ghost ball after yours lands */
  ghost?: { feet: number; angle: number; label: string } | null;
}

const W = 400;
const H = 300;
const HOME = { x: 200, y: 288 };
const PX_PER_FOOT = 0.6;
const WALL_R = WALL_FEET * PX_PER_FOOT; // 240
const STANDS_R = 286;
const FOUL = 45;

function polar(feet: number, angleDeg: number) {
  const r = feet * PX_PER_FOOT;
  const a = (angleDeg * Math.PI) / 180;
  return { x: HOME.x + r * Math.sin(a), y: HOME.y - r * Math.cos(a) };
}

function sector(rOuter: number, fromDeg: number, toDeg: number, rInner = 0): string {
  const p = (r: number, d: number) => {
    const a = (d * Math.PI) / 180;
    return `${(HOME.x + r * Math.sin(a)).toFixed(2)} ${(HOME.y - r * Math.cos(a)).toFixed(2)}`;
  };
  if (rInner <= 0) {
    return `M ${HOME.x} ${HOME.y} L ${p(rOuter, fromDeg)} A ${rOuter} ${rOuter} 0 0 1 ${p(rOuter, toDeg)} Z`;
  }
  return `M ${p(rInner, fromDeg)} L ${p(rOuter, fromDeg)} A ${rOuter} ${rOuter} 0 0 1 ${p(rOuter, toDeg)} L ${p(rInner, toDeg)} A ${rInner} ${rInner} 0 0 0 ${p(rInner, fromDeg)} Z`;
}

function arc(r: number, fromDeg: number, toDeg: number): string {
  const a1 = (fromDeg * Math.PI) / 180;
  const a2 = (toDeg * Math.PI) / 180;
  return `M ${HOME.x + r * Math.sin(a1)} ${HOME.y - r * Math.cos(a1)} A ${r} ${r} 0 0 1 ${HOME.x + r * Math.sin(a2)} ${HOME.y - r * Math.cos(a2)}`;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// The field itself never changes, so it is drawn once and reused.
const Field: React.FC<{ flashWall: boolean }> = React.memo(({ flashWall }) => {
  // Real proportions: bases are 90 ft apart, so second base sits 127 ft from home
  const first = polar(90, FOUL);
  const second = polar(127.3, 0);
  const third = polar(90, -FOUL);
  const infieldGrass = [polar(10, 0), polar(80, 41), polar(116, 0), polar(80, -41)];

  return (
    <g>
      <defs>
        <pattern id="crowd" width="9" height="9" patternUnits="userSpaceOnUse">
          <rect width="9" height="9" fill="var(--stadium-stands)" />
          <circle cx="2.5" cy="2.5" r="1.6" fill="var(--stadium-crowd-a)" />
          <circle cx="7" cy="6.5" r="1.6" fill="var(--stadium-crowd-b)" />
          <circle cx="6.5" cy="2" r="1.1" fill="var(--stadium-crowd-c)" />
        </pattern>
        <radialGradient id="lights" cx="50%" cy="100%" r="100%">
          <stop offset="0%" stopColor="var(--stadium-grass)" />
          <stop offset="100%" stopColor="var(--stadium-grass-edge)" />
        </radialGradient>
      </defs>

      {/* Stands */}
      <path d={sector(STANDS_R, -52, 52, WALL_R + 4)} fill="url(#crowd)" />
      {/* Outfield grass with mowing stripes */}
      <path d={sector(WALL_R, -FOUL, FOUL)} fill="url(#lights)" />
      {[60, 100, 140, 180, 220].map((r) => (
        <path key={r} d={arc(r, -FOUL, FOUL)} stroke="var(--stadium-stripe)" strokeWidth="18" fill="none" />
      ))}
      {/* Distance rings */}
      {[100, 200, 300].map((ft) => (
        <g key={ft}>
          <path d={arc(ft * PX_PER_FOOT, -FOUL, FOUL)} stroke="var(--stadium-ring)" strokeWidth="1" strokeDasharray="3 5" fill="none" />
          <text
            x={polar(ft, -FOUL + 4).x}
            y={polar(ft, -FOUL + 4).y + 3}
            className="stadium-ring-label"
          >
            {ft}
          </text>
        </g>
      ))}
      {/* Infield dirt and grass */}
      <path d={sector(150 * PX_PER_FOOT, -FOUL, FOUL)} fill="var(--stadium-dirt)" />
      <path
        d={`M ${infieldGrass.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')} Z`}
        fill="var(--stadium-grass)"
      />
      <circle cx={HOME.x} cy={HOME.y - 60.5 * PX_PER_FOOT} r="5" fill="var(--stadium-dirt)" />
      {/* Foul lines */}
      <line x1={HOME.x} y1={HOME.y} x2={polar(WALL_FEET, -FOUL).x} y2={polar(WALL_FEET, -FOUL).y} stroke="var(--stadium-chalk)" strokeWidth="1.5" />
      <line x1={HOME.x} y1={HOME.y} x2={polar(WALL_FEET, FOUL).x} y2={polar(WALL_FEET, FOUL).y} stroke="var(--stadium-chalk)" strokeWidth="1.5" />
      {/* Bases */}
      {[first, second, third].map((b, i) => (
        <rect key={i} x={b.x - 3} y={b.y - 3} width="6" height="6" fill="var(--stadium-chalk)" transform={`rotate(45 ${b.x} ${b.y})`} />
      ))}
      <path d={`M ${HOME.x - 4} ${HOME.y - 5} h 8 v 4 l -4 4 l -4 -4 Z`} fill="var(--stadium-chalk)" />
      {/* Outfield wall */}
      <path
        d={arc(WALL_R, -FOUL, FOUL)}
        stroke="var(--color-accent)"
        strokeWidth={flashWall ? 6 : 3}
        fill="none"
        className={flashWall ? 'stadium-wall flash' : 'stadium-wall'}
      />
      <text x={HOME.x} y={HOME.y - WALL_R + 16} className="stadium-wall-label">
        400
      </text>
    </g>
  );
});
Field.displayName = 'Field';

export const Stadium: React.FC<StadiumProps> = ({ hits, variant, onLanded, className, ghost }) => {
  const rawLast = hits[hits.length - 1];
  // Parents pass a fresh array every render, so key the animation on the values, not the object
  const lastFeet = rawLast?.feet;
  const lastAngle = rawLast?.angle;
  const lastTierKey = rawLast?.tier;
  const lastColor = rawLast?.color;
  const last = useMemo(
    () => (lastFeet === undefined ? undefined : { feet: lastFeet, angle: lastAngle ?? 0, tier: lastTierKey as HitTier }),
    [lastFeet, lastAngle, lastTierKey]
  );
  const [t, setT] = useState<number>(variant === 'flight' ? 0 : 1);
  const [landed, setLanded] = useState<boolean>(variant !== 'flight');
  const landedCb = useRef(onLanded);
  landedCb.current = onLanded;

  const isMiss = last ? last.feet <= 0 : true;
  const target = useMemo(() => (last ? polar(Math.max(last.feet, 0), last.angle) : HOME), [last]);

  useEffect(() => {
    if (variant !== 'flight' || !last) return;
    setT(0);
    setLanded(false);

    if (prefersReducedMotion()) {
      setT(1);
      setLanded(true);
      landedCb.current?.();
      return;
    }

    const duration = isMiss ? 700 : 900 + Math.min(last.feet, 450) * 1.6;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setT(p);
      if (p < 1) {
        raf = requestAnimationFrame(step);
      } else {
        setLanded(true);
        landedCb.current?.();
      }
    };
    // Small pause so the player sees the empty field before the ball leaves
    const delay = window.setTimeout(() => {
      raf = requestAnimationFrame(step);
    }, 250);
    return () => {
      window.clearTimeout(delay);
      cancelAnimationFrame(raf);
    };
  }, [variant, last, isMiss]);

  // Ball flight: straight path on the ground, with a fake height arc for the ball itself
  const ease = 1 - Math.pow(1 - t, 2);
  let ballX = HOME.x;
  let ballY = HOME.y;
  let height = 0;
  if (variant === 'flight' && last) {
    if (isMiss) {
      // The pitch comes in from the mound and sails past an empty swing
      const mound = polar(60.5, 0);
      ballX = mound.x;
      ballY = mound.y + (HOME.y + 14 - mound.y) * t;
    } else {
      ballX = HOME.x + (target.x - HOME.x) * ease;
      ballY = HOME.y + (target.y - HOME.y) * ease;
      const peak = 16 + (Math.min(last.feet, 450) / 450) * 52;
      height = Math.sin(Math.PI * t) * peak;
    }
  }

  const trail = useMemo(() => {
    if (variant !== 'flight' || !last || isMiss) return '';
    const pts: string[] = [];
    const steps = 24;
    const peak = 16 + (Math.min(last.feet, 450) / 450) * 52;
    for (let i = 0; i <= steps; i++) {
      const tt = (i / steps) * t;
      const e = 1 - Math.pow(1 - tt, 2);
      const x = HOME.x + (target.x - HOME.x) * e;
      const y = HOME.y + (target.y - HOME.y) * e - Math.sin(Math.PI * tt) * peak;
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return pts.join(' ');
  }, [variant, last, isMiss, target, t]);

  const lastTier = last ? getTierByKey(last.tier) : null;
  const landColor = lastColor ?? lastTier?.color;
  const overWall = !!last && last.feet > WALL_FEET;

  return (
    <div className={`stadium ${className ?? ''}`}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={variant === 'spray' ? 'Where your five hits landed' : last ? `${last.feet} feet` : 'Ballpark field'}>
        <Field flashWall={variant === 'flight' && landed && overWall} />

        {variant === 'flight' && last && (
          <g>
            {trail && <polyline points={trail} fill="none" stroke="var(--stadium-trail)" strokeWidth="2" strokeLinecap="round" />}
            {/* shadow on the ground */}
            {!isMiss && <ellipse cx={ballX} cy={ballY} rx={3 + height / 20} ry={1.6 + height / 40} fill="rgba(0,0,0,0.45)" />}
            {landed && !isMiss && (
              <circle cx={target.x} cy={target.y} r="6" fill="none" stroke={landColor} strokeWidth="2" className="stadium-landing-ring" />
            )}
            {!(isMiss && landed) && (
              <circle
                cx={ballX}
                cy={ballY - height}
                r={4.5 + height / 16}
                fill="#FFFFFF"
                stroke="#d0d0c8"
                strokeWidth="0.8"
              />
            )}
            {isMiss && landed && (
              <text x={HOME.x} y={HOME.y - 26} className="stadium-whiff">
                whiff
              </text>
            )}
          </g>
        )}

        {variant === 'flight' && landed && ghost && (() => {
          const gp = polar(Math.max(ghost.feet, 0), ghost.angle);
          const labelLeft = gp.x > HOME.x + 60;
          return (
            <g className="stadium-ghost">
              {ghost.feet > 0 && (
                <line x1={HOME.x} y1={HOME.y} x2={gp.x} y2={gp.y} stroke="var(--stadium-chalk)" strokeOpacity="0.25" strokeWidth="1.2" strokeDasharray="2 4" />
              )}
              <circle cx={gp.x} cy={gp.y} r="6" fill="var(--stadium-chalk)" fillOpacity="0.3" stroke="var(--stadium-chalk)" strokeOpacity="0.8" strokeWidth="1.2" strokeDasharray="2 2" />
              <text x={labelLeft ? gp.x - 10 : gp.x + 10} y={gp.y + 4} className={`stadium-ghost-label ${labelLeft ? 'left' : ''}`}>
                {ghost.label}
              </text>
            </g>
          );
        })()}

        {variant === 'spray' &&
          hits.map((h, i) => {
            const p = polar(Math.max(h.feet, 0), h.angle);
            const tier = getTierByKey(h.tier);
            const dotColor = h.color ?? tier.color;
            return (
              <g key={i} className="spray-dot" style={{ animationDelay: `${150 + i * 160}ms` }}>
                {h.feet > 0 && (
                  <line x1={HOME.x} y1={HOME.y} x2={p.x} y2={p.y} stroke={dotColor} strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="2 4" />
                )}
                <circle cx={h.feet > 0 ? p.x : HOME.x + (i - 2) * 16} cy={h.feet > 0 ? p.y : HOME.y - 14} r="9" fill={dotColor} />
                <text x={h.feet > 0 ? p.x : HOME.x + (i - 2) * 16} y={(h.feet > 0 ? p.y : HOME.y - 14) + 3.5} className="spray-dot-label">
                  {h.label ?? i + 1}
                </text>
              </g>
            );
          })}
      </svg>
    </div>
  );
};
