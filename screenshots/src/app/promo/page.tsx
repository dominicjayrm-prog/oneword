"use client";
import { useState, useEffect, useMemo } from "react";

/* ── colours & fonts ─────────────────────────────── */
const C = {
  bg: "#0A0A12",
  cream: "#FFFDF7",
  text: "#1A1A2E",
  primary: "#FF6B4A",
  muted: "#8B8697",
  white: "#FFFFFF",
  dark2: "#2D1B69",
  border: "#E8E3D9",
};
const F = {
  playfair: "'Playfair Display', serif",
  sans: "'DM Sans', sans-serif",
  mono: "'DM Mono', monospace",
};

/* ── controlled time hook (driven by Puppeteer) ──── */
const useT = () => {
  const [ms, setMs] = useState(0);

  useEffect(() => {
    (window as any).setFrame = (t: number) => setMs(t);
    return () => { delete (window as any).setFrame; };
  }, []);

  return {
    ms,
    at: (t: number) => ms >= t,
    bw: (a: number, b: number) => ms >= a && ms < b,
    p: (a: number, b: number) => Math.min(1, Math.max(0, (ms - a) / (b - a))),
    on: true,
    setOn: () => {},
  };
};

/* ── helpers ──────────────────────────────────────── */
const ease = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

/* ── confetti (JS-calculated positions) ──────────── */
interface Confetto {
  x: number;
  delay: number;
  color: string;
  size: number;
  rotation: number;
  speed: number;
  wobble: number;
}

const CONFETTI_COLORS = [
  "#FF6B4A", "#FFD93D", "#6BCB77", "#4D96FF", "#FF6B8A",
  "#C084FC", "#34D399", "#F472B6", "#FBBF24", "#60A5FA",
];

function makeConfetti(count: number, seed: number): Confetto[] {
  const items: Confetto[] = [];
  // Simple seeded random
  let s = seed;
  const rand = () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
  for (let i = 0; i < count; i++) {
    items.push({
      x: rand() * 100,
      delay: rand() * 2000,
      color: CONFETTI_COLORS[Math.floor(rand() * CONFETTI_COLORS.length)],
      size: 6 + rand() * 8,
      rotation: rand() * 360,
      speed: 0.08 + rand() * 0.12, // px per ms
      wobble: rand() * 30,
    });
  }
  return items;
}

function ConfettiOverlay({ ms, startMs }: { ms: number; startMs: number }) {
  const confetti = useMemo(() => makeConfetti(50, 42), []);
  const elapsed = ms - startMs;
  if (elapsed < 0) return null;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 50 }}>
      {confetti.map((c, i) => {
        const t = Math.max(0, elapsed - c.delay);
        if (t <= 0) return null;
        const y = -20 + t * c.speed;
        const wobbleX = Math.sin(t / 300) * c.wobble;
        const rot = c.rotation + t * 0.2;
        const opacity = y > 800 ? 0 : 1;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${c.x}%`,
              top: y,
              width: c.size,
              height: c.size * 1.4,
              backgroundColor: c.color,
              borderRadius: 2,
              transform: `translateX(${wobbleX}px) rotate(${rot}deg)`,
              opacity,
            }}
          />
        );
      })}
    </div>
  );
}

/* ── ghost words data ─────────────────────────────── */
const GHOST_WORDS = [
  "moon", "echo", "drift", "glow", "haze",
  "bloom", "wave", "spark", "mist", "calm",
  "pulse", "rain", "dust", "silk", "fern",
  "dusk", "tide", "grit", "nest", "void",
];

/* ── main component ───────────────────────────────── */
export default function PromoVideo() {
  const { ms, at, bw, p } = useT();

  /* ── Scene 1: Title (0–5s) ──────────────────────── */
  const renderScene1 = () => {
    if (!bw(0, 5500)) return null;
    const fadeIn = ease(p(200, 1200));
    const fadeOut = ease(p(4500, 5500));
    const opacity = fadeIn * (1 - fadeOut);
    const lineY1 = lerp(30, 0, ease(p(200, 1000)));
    const lineY2 = lerp(30, 0, ease(p(600, 1400)));

    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity, zIndex: 10 }}>
        <div style={{ fontFamily: F.playfair, fontWeight: 900, fontSize: 42, color: C.cream, textAlign: "center", lineHeight: 1.2, transform: `translateY(${lineY1}px)` }}>
          The whole world.
        </div>
        <div style={{ fontFamily: F.playfair, fontWeight: 900, fontSize: 42, color: C.primary, textAlign: "center", lineHeight: 1.2, marginTop: 8, transform: `translateY(${lineY2}px)` }}>
          Gets one word.
        </div>
        <div style={{ fontFamily: F.sans, fontSize: 16, color: C.muted, marginTop: 24, opacity: ease(p(1500, 2500)) }}>
          Every day. Everyone. One word.
        </div>
      </div>
    );
  };

  /* ── Scene 2: WIFI word reveal (5–10s) ──────────── */
  const renderScene2 = () => {
    if (!bw(4500, 10500)) return null;
    const fadeIn = ease(p(5000, 5800));
    const fadeOut = ease(p(9500, 10500));
    const opacity = fadeIn * (1 - fadeOut);

    const letters = "WIFI".split("");
    const ghostOp = ease(p(5500, 7000)) * 0.15;

    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity, zIndex: 10 }}>
        {/* Ghost words floating in background */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", opacity: ghostOp }}>
          {GHOST_WORDS.map((w, i) => {
            const row = Math.floor(i / 5);
            const col = i % 5;
            return (
              <div key={w} style={{
                position: "absolute",
                left: `${10 + col * 18}%`,
                top: `${15 + row * 18}%`,
                fontFamily: F.sans,
                fontSize: 18,
                color: C.cream,
                opacity: 0.5 + Math.sin(ms / 1000 + i) * 0.3,
                transform: `translateY(${Math.sin(ms / 2000 + i * 0.7) * 10}px)`,
              }}>
                {w}
              </div>
            );
          })}
        </div>

        <div style={{ fontFamily: F.sans, fontSize: 14, color: C.muted, marginBottom: 16, textTransform: "uppercase", letterSpacing: 4 }}>
          Today&apos;s word
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {letters.map((l, i) => {
            const lp = ease(clamp((ms - 6000 - i * 200) / 400));
            return (
              <div key={i} style={{
                width: 64,
                height: 72,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${C.primary}, #FF8A6A)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: F.playfair,
                fontWeight: 900,
                fontSize: 36,
                color: C.cream,
                transform: `scale(${lp}) rotateY(${(1 - lp) * 90}deg)`,
                opacity: lp,
                boxShadow: `0 4px 20px rgba(255,107,74,${0.3 * lp})`,
              }}>
                {l}
              </div>
            );
          })}
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 12, color: C.muted, marginTop: 20, opacity: ease(p(7500, 8500)) }}>
          2,847 responses so far
        </div>
      </div>
    );
  };

  /* ── Scene 3: Phone drone zoom-in (10–17s) ──────── */
  const renderScene3 = () => {
    if (!bw(10000, 17500)) return null;
    const fadeIn = ease(p(10000, 11000));
    const fadeOut = ease(p(16500, 17500));
    const opacity = fadeIn * (1 - fadeOut);
    const scale = lerp(0.8, 1, ease(p(10000, 13000)));

    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity, zIndex: 10, transform: `scale(${scale})` }}>
        {/* Phone mockup */}
        <div style={{
          width: 260,
          height: 520,
          borderRadius: 36,
          border: `3px solid rgba(255,255,255,0.15)`,
          background: "linear-gradient(180deg, #141420 0%, #0A0A12 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "60px 20px 20px",
          position: "relative",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}>
          {/* Notch */}
          <div style={{ position: "absolute", top: 12, width: 100, height: 24, borderRadius: 12, background: "#000" }} />

          {/* Word display */}
          <div style={{ fontFamily: F.sans, fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 3, marginTop: 20 }}>Today&apos;s word</div>
          <div style={{ fontFamily: F.playfair, fontWeight: 900, fontSize: 44, color: C.primary, marginTop: 8, opacity: ease(p(11500, 12500)) }}>WIFI</div>

          {/* Streak badge */}
          <div style={{
            marginTop: 24,
            display: "flex",
            alignItems: "center",
            gap: 8,
            opacity: ease(p(13000, 14000)),
            transform: `translateY(${lerp(20, 0, ease(p(13000, 14000)))}px)`,
          }}>
            <div style={{
              padding: "6px 14px",
              borderRadius: 20,
              background: "rgba(255,107,74,0.15)",
              fontFamily: F.sans,
              fontSize: 13,
              color: C.primary,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}>
              🔥 7 day streak
            </div>
          </div>

          {/* Response count */}
          <div style={{
            marginTop: "auto",
            fontFamily: F.mono,
            fontSize: 11,
            color: C.muted,
            opacity: ease(p(14000, 15000)),
          }}>
            responding with 2,847 others
          </div>
        </div>
      </div>
    );
  };

  /* ── Scene 4: Typing close-up (17–27s) ─────────── */
  const renderScene4 = () => {
    if (!bw(17000, 27500)) return null;
    const fadeIn = ease(p(17000, 18000));
    const fadeOut = ease(p(26500, 27500));
    const opacity = fadeIn * (1 - fadeOut);

    const words = ["Signal", "bars", "control", "our", "mood"];
    const typed: string[] = [];
    const typeStart = 19000;
    const msPerChar = 80;

    // Calculate what's typed at current ms
    const totalCharsElapsed = Math.floor(Math.max(0, ms - typeStart) / msPerChar);
    let remaining = totalCharsElapsed;
    for (const w of words) {
      if (remaining >= w.length + 1) { // +1 for space
        typed.push(w);
        remaining -= w.length + 1;
      } else if (remaining > 0) {
        typed.push(w.slice(0, remaining));
        remaining = 0;
      }
    }

    const fullText = typed.join(" ");
    const pills = words.filter((word, i) => {
      const charsBeforeWord = words.slice(0, i).reduce((a, ww) => a + ww.length + 1, 0);
      const pillStart = typeStart + (charsBeforeWord + word.length) * msPerChar + 200;
      return ms >= pillStart;
    });

    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity, zIndex: 10, padding: 30 }}>
        <div style={{ fontFamily: F.sans, fontSize: 14, color: C.muted, textTransform: "uppercase", letterSpacing: 3, marginBottom: 20 }}>
          Your response
        </div>

        {/* Text input area */}
        <div style={{
          width: "100%",
          minHeight: 120,
          borderRadius: 16,
          border: `2px solid rgba(255,107,74,0.3)`,
          background: "rgba(255,255,255,0.05)",
          padding: 20,
          fontFamily: F.sans,
          fontSize: 28,
          color: C.cream,
          lineHeight: 1.4,
          position: "relative",
        }}>
          {fullText}
          <span style={{
            display: "inline-block",
            width: 2,
            height: 28,
            background: C.primary,
            marginLeft: 2,
            opacity: Math.sin(ms / 500) > 0 ? 1 : 0,
          }} />
        </div>

        {/* Word count */}
        <div style={{
          alignSelf: "flex-end",
          fontFamily: F.mono,
          fontSize: 13,
          color: typed.length >= 5 ? C.primary : C.muted,
          marginTop: 8,
        }}>
          {Math.min(typed.filter(w => w.length > 0).length, 5)} / 5 words
        </div>

        {/* Pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 24, justifyContent: "center" }}>
          {pills.map((pillWord, i) => {
            const wordIdx = words.indexOf(pillWord);
            const charsBeforePill = words.slice(0, wordIdx).reduce((a, ww) => a + ww.length + 1, 0);
            const pillStart2 = typeStart + (charsBeforePill + pillWord.length) * msPerChar + 200;
            const pillP = ease(clamp((ms - pillStart2) / 300));
            return (
              <div key={i} style={{
                padding: "8px 16px",
                borderRadius: 20,
                background: `rgba(255,107,74,${0.12 * pillP})`,
                border: `1px solid rgba(255,107,74,${0.3 * pillP})`,
                fontFamily: F.sans,
                fontSize: 15,
                color: C.primary,
                opacity: pillP,
                transform: `scale(${pillP})`,
              }}>
                {pillWord}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ── Scene 5: Voting (27–34s) ───────────────────── */
  const renderScene5 = () => {
    if (!bw(27000, 34500)) return null;
    const fadeIn = ease(p(27000, 28000));
    const fadeOut = ease(p(33500, 34500));
    const opacity = fadeIn * (1 - fadeOut);

    const responses = [
      { text: "Signal bars control our mood", votes: 847, rank: 7 },
      { text: "Freedom that requires a password", votes: 1203, rank: 3 },
    ];

    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity, zIndex: 10, padding: 30 }}>
        <div style={{ fontFamily: F.sans, fontSize: 14, color: C.muted, textTransform: "uppercase", letterSpacing: 3, marginBottom: 8 }}>
          Vote for your favourite
        </div>
        <div style={{ fontFamily: F.playfair, fontWeight: 900, fontSize: 28, color: C.primary, marginBottom: 30 }}>
          WIFI
        </div>

        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
          {responses.map((r, i) => {
            const cardIn = ease(clamp((ms - 28500 - i * 500) / 600));
            const selected = i === 0 && ms >= 30000;
            const selectP = ease(clamp((ms - 30000) / 400));

            return (
              <div key={i} style={{
                width: "100%",
                padding: 20,
                borderRadius: 16,
                background: selected ? `rgba(255,107,74,${0.12 * selectP})` : "rgba(255,255,255,0.05)",
                border: `2px solid ${selected ? `rgba(255,107,74,${0.5 * selectP})` : "rgba(255,255,255,0.08)"}`,
                opacity: cardIn,
                transform: `translateX(${lerp(-40, 0, cardIn)}px)`,
              }}>
                <div style={{ fontFamily: F.sans, fontSize: 18, color: C.cream, lineHeight: 1.4 }}>
                  &ldquo;{r.text}&rdquo;
                </div>
                <div style={{ fontFamily: F.mono, fontSize: 12, color: C.muted, marginTop: 8, display: "flex", justifyContent: "space-between" }}>
                  <span>{r.votes} votes</span>
                  <span>#{r.rank}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Vote confirmation */}
        {ms >= 30500 && (
          <div style={{
            marginTop: 24,
            padding: "10px 24px",
            borderRadius: 24,
            background: C.primary,
            fontFamily: F.sans,
            fontWeight: 600,
            fontSize: 14,
            color: C.cream,
            opacity: ease(clamp((ms - 30500) / 400)),
            transform: `scale(${ease(clamp((ms - 30500) / 400))})`,
          }}>
            ✓ Vote cast!
          </div>
        )}
      </div>
    );
  };

  /* ── Scene 6: Results (34–40s) ──────────────────── */
  const renderScene6 = () => {
    if (!bw(34000, 40500)) return null;
    const fadeIn = ease(p(34000, 35000));
    const fadeOut = ease(p(39500, 40500));
    const opacity = fadeIn * (1 - fadeOut);

    const leaderboard = [
      { rank: 1, text: "A web no spider built", votes: 2134 },
      { rank: 2, text: "Invisible string between strangers", votes: 1891 },
      { rank: 3, text: "Freedom that requires a password", votes: 1203 },
      { rank: 4, text: "The modern campfire", votes: 1089 },
      { rank: 5, text: "Silence with a signal", votes: 978 },
      { rank: 6, text: "Where thoughts find wings", votes: 892 },
      { rank: 7, text: "Signal bars control our mood", votes: 847, isYou: true },
    ];

    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", opacity, zIndex: 10, padding: "60px 24px 30px" }}>
        <div style={{ fontFamily: F.sans, fontSize: 14, color: C.muted, textTransform: "uppercase", letterSpacing: 3 }}>
          Results
        </div>
        <div style={{ fontFamily: F.playfair, fontWeight: 900, fontSize: 48, color: C.primary, margin: "4px 0" }}>
          #7
        </div>
        <div style={{ fontFamily: F.sans, fontSize: 14, color: C.muted, marginBottom: 20 }}>
          out of 2,847 responses
        </div>

        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
          {leaderboard.map((item, i) => {
            const rowIn = ease(clamp((ms - 35500 - i * 150) / 400));
            return (
              <div key={i} style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 12,
                background: item.isYou ? "rgba(255,107,74,0.12)" : "rgba(255,255,255,0.03)",
                border: item.isYou ? "1px solid rgba(255,107,74,0.3)" : "1px solid transparent",
                opacity: rowIn,
                transform: `translateY(${lerp(20, 0, rowIn)}px)`,
              }}>
                <div style={{ fontFamily: F.mono, fontSize: 14, color: item.rank <= 3 ? C.primary : C.muted, fontWeight: 500, width: 24 }}>
                  {item.rank}
                </div>
                <div style={{ flex: 1, fontFamily: F.sans, fontSize: 13, color: C.cream, lineHeight: 1.3 }}>
                  {item.text}
                </div>
                <div style={{ fontFamily: F.mono, fontSize: 11, color: C.muted }}>
                  {item.votes}
                </div>
                {item.isYou && (
                  <div style={{ fontFamily: F.sans, fontSize: 10, color: C.primary, fontWeight: 600, textTransform: "uppercase" }}>
                    YOU
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ── Scene 7: Streak celebration (40–46s) ───────── */
  const renderScene7 = () => {
    if (!bw(40000, 46500)) return null;
    const fadeIn = ease(p(40000, 41000));
    const fadeOut = ease(p(45500, 46500));
    const opacity = fadeIn * (1 - fadeOut);

    const streakDays = [
      { day: "Mon", active: true },
      { day: "Tue", active: true },
      { day: "Wed", active: true },
      { day: "Thu", active: true },
      { day: "Fri", active: true },
      { day: "Sat", active: true },
      { day: "Sun", active: true },
    ];

    const badges = [
      { emoji: "🌱", label: "First Word", earned: true },
      { emoji: "🔥", label: "Week Streak", earned: true },
      { emoji: "⭐", label: "Top 10", earned: true },
      { emoji: "💎", label: "Month Streak", earned: false },
    ];

    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity, zIndex: 10, padding: 30 }}>
        {/* Confetti */}
        <ConfettiOverlay ms={ms} startMs={41000} />

        {/* Streak fire */}
        <div style={{
          fontSize: 64,
          opacity: ease(p(41000, 42000)),
          transform: `scale(${ease(p(41000, 42000))})`,
        }}>
          🔥
        </div>
        <div style={{
          fontFamily: F.playfair,
          fontWeight: 900,
          fontSize: 48,
          color: C.primary,
          opacity: ease(p(41500, 42500)),
        }}>
          7 days!
        </div>
        <div style={{
          fontFamily: F.sans,
          fontSize: 16,
          color: C.muted,
          marginTop: 4,
          opacity: ease(p(42000, 43000)),
        }}>
          You&apos;re on fire! Keep it going.
        </div>

        {/* Streak days */}
        <div style={{
          display: "flex",
          gap: 8,
          marginTop: 24,
          opacity: ease(p(42500, 43500)),
        }}>
          {streakDays.map((d, i) => {
            const dayP = ease(clamp((ms - 42500 - i * 100) / 300));
            return (
              <div key={i} style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  background: d.active ? C.primary : "rgba(255,255,255,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  transform: `scale(${dayP})`,
                }}>
                  {d.active ? "✓" : ""}
                </div>
                <div style={{ fontFamily: F.mono, fontSize: 9, color: C.muted }}>
                  {d.day}
                </div>
              </div>
            );
          })}
        </div>

        {/* Badges */}
        <div style={{
          display: "flex",
          gap: 12,
          marginTop: 28,
          opacity: ease(p(43500, 44500)),
        }}>
          {badges.map((b, i) => {
            const badgeP = ease(clamp((ms - 43500 - i * 200) / 400));
            return (
              <div key={i} style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                opacity: b.earned ? badgeP : 0.3 * badgeP,
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  background: b.earned ? "rgba(255,107,74,0.15)" : "rgba(255,255,255,0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  transform: `scale(${badgeP})`,
                }}>
                  {b.emoji}
                </div>
                <div style={{ fontFamily: F.sans, fontSize: 9, color: b.earned ? C.cream : C.muted, textAlign: "center", maxWidth: 56 }}>
                  {b.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ── Scene 8: Weekly recap (46–51s) ─────────────── */
  const renderScene8 = () => {
    if (!bw(46000, 51500)) return null;
    const fadeIn = ease(p(46000, 47000));
    const fadeOut = ease(p(50500, 51500));
    const opacity = fadeIn * (1 - fadeOut);

    const stats = [
      { label: "Words played", value: "7", icon: "📝" },
      { label: "Votes cast", value: "23", icon: "🗳️" },
      { label: "Best rank", value: "#3", icon: "🏆" },
      { label: "Streak", value: "7 days", icon: "🔥" },
    ];

    const topWords = [
      { word: "RAIN", rank: 3 },
      { word: "WIFI", rank: 7 },
      { word: "TIME", rank: 12 },
    ];

    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity, zIndex: 10, padding: 24 }}>
        {/* Card */}
        <div style={{
          width: "100%",
          borderRadius: 24,
          background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
          border: "1px solid rgba(255,255,255,0.1)",
          padding: 28,
          backdropFilter: "blur(20px)",
        }}>
          <div style={{ fontFamily: F.sans, fontSize: 13, color: C.muted, textTransform: "uppercase", letterSpacing: 3 }}>
            Weekly Recap
          </div>
          <div style={{ fontFamily: F.playfair, fontWeight: 900, fontSize: 28, color: C.cream, marginTop: 4 }}>
            Your Week in Words
          </div>

          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 20 }}>
            {stats.map((s, i) => {
              const statP = ease(clamp((ms - 47500 - i * 200) / 400));
              return (
                <div key={i} style={{
                  padding: 14,
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.05)",
                  opacity: statP,
                  transform: `translateY(${lerp(15, 0, statP)}px)`,
                }}>
                  <div style={{ fontSize: 20 }}>{s.icon}</div>
                  <div style={{ fontFamily: F.playfair, fontWeight: 900, fontSize: 24, color: C.cream, marginTop: 4 }}>
                    {s.value}
                  </div>
                  <div style={{ fontFamily: F.sans, fontSize: 11, color: C.muted }}>
                    {s.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top words */}
          <div style={{ marginTop: 20, opacity: ease(p(48500, 49500)) }}>
            <div style={{ fontFamily: F.sans, fontSize: 12, color: C.muted, marginBottom: 8 }}>
              Top words this week
            </div>
            {topWords.map((tw, i) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 0",
                borderBottom: i < topWords.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
              }}>
                <div style={{ fontFamily: F.playfair, fontWeight: 900, fontSize: 16, color: C.cream }}>
                  {tw.word}
                </div>
                <div style={{ fontFamily: F.mono, fontSize: 12, color: C.primary }}>
                  #{tw.rank}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  /* ── Scene 9: CTA (51–60s) ──────────────────────── */
  const renderScene9 = () => {
    if (!bw(51000, 60500)) return null;
    const fadeIn = ease(p(51000, 52000));
    const opacity = fadeIn;

    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity, zIndex: 10 }}>
        {/* Logo */}
        <div style={{
          opacity: ease(p(51500, 52500)),
          transform: `scale(${ease(p(51500, 52500))})`,
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
            <span style={{ fontFamily: F.playfair, fontWeight: 900, fontSize: 52, color: C.cream }}>one</span>
            <span style={{ fontFamily: F.playfair, fontWeight: 900, fontSize: 52, color: C.primary }}>word</span>
          </div>
        </div>

        {/* Tagline */}
        <div style={{
          fontFamily: F.sans,
          fontSize: 18,
          color: C.muted,
          marginTop: 12,
          opacity: ease(p(53000, 54000)),
        }}>
          Say it in five.
        </div>

        {/* Divider */}
        <div style={{
          width: 60,
          height: 2,
          background: C.primary,
          marginTop: 28,
          opacity: ease(p(54000, 55000)),
          transform: `scaleX(${ease(p(54000, 55000))})`,
        }} />

        {/* Download button */}
        <div style={{
          marginTop: 28,
          padding: "16px 40px",
          borderRadius: 28,
          background: `linear-gradient(135deg, ${C.primary}, #FF8A6A)`,
          fontFamily: F.sans,
          fontWeight: 700,
          fontSize: 18,
          color: C.cream,
          opacity: ease(p(55000, 56000)),
          transform: `translateY(${lerp(20, 0, ease(p(55000, 56000)))}px)`,
          boxShadow: `0 8px 30px rgba(255,107,74,0.4)`,
        }}>
          Download Now
        </div>

        {/* Subtitle */}
        <div style={{
          fontFamily: F.sans,
          fontSize: 13,
          color: C.muted,
          marginTop: 16,
          opacity: ease(p(56000, 57000)),
        }}>
          Free on iOS & Android
        </div>

        {/* Floating words in background */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", opacity: 0.06, zIndex: -1 }}>
          {["dream", "hope", "love", "play", "grow", "shine", "bold", "free"].map((w, i) => (
            <div key={w} style={{
              position: "absolute",
              left: `${10 + (i % 4) * 22}%`,
              top: `${10 + Math.floor(i / 4) * 60}%`,
              fontFamily: F.playfair,
              fontWeight: 900,
              fontSize: 32,
              color: C.cream,
              transform: `rotate(${-15 + i * 8}deg)`,
            }}>
              {w}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      width: 390,
      height: 844,
      background: C.bg,
      position: "relative",
      overflow: "hidden",
      fontFamily: F.sans,
    }}>
      {renderScene1()}
      {renderScene2()}
      {renderScene3()}
      {renderScene4()}
      {renderScene5()}
      {renderScene6()}
      {renderScene7()}
      {renderScene8()}
      {renderScene9()}
    </div>
  );
}
