"use client";
import { useState, useRef } from "react";
import { toPng } from "html-to-image";

const C = {
  bg1: "#0F0E17", bg2: "#1A1A2E", cream: "#FFFDF7", text: "#1A1A2E",
  white: "#FFFFFF", primary: "#FF6B4A", glow: "rgba(255,107,74,0.15)",
  muted: "#8B8697", border: "#E8E3D9", dark1: "#1A1A2E", dark2: "#2D1B69",
};

const SIZES = [
  { label: '6.9"', w: 1320, h: 2868 },
  { label: '6.5"', w: 1284, h: 2778 },
  { label: '6.3"', w: 1206, h: 2622 },
  { label: '6.1"', w: 1125, h: 2436 },
];

const BASE_W = 320;
const BASE_H = 694;

type Lang = "en" | "es";

const TAB_LABELS: Record<Lang, { today: string; vote: string; results: string; friends: string }> = {
  en: { today: "Today", vote: "Vote", results: "Results", friends: "Friends" },
  es: { today: "Hoy", vote: "Votar", results: "Resultados", friends: "Amigos" },
};

const TabBar = ({ active = "today", lang = "en" as Lang }: { active?: string; lang?: Lang }) => {
  const labels = TAB_LABELS[lang];
  return (
    <div style={{
      display: "flex", justifyContent: "space-around", alignItems: "center",
      padding: "6px 4px 8px", borderTop: `1px solid ${C.border}`,
      backgroundColor: C.cream,
    }}>
      {[
        { id: "today", icon: "🌍", label: labels.today },
        { id: "vote", icon: "📥", label: labels.vote },
        { id: "results", icon: "🏆", label: labels.results },
        { id: "friends", icon: "👥", label: labels.friends },
      ].map(t => (
        <div key={t.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1px" }}>
          <span style={{ fontSize: "14px" }}>{t.icon}</span>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "6px", fontWeight: 600, color: active === t.id ? C.primary : C.muted }}>{t.label}</span>
        </div>
      ))}
    </div>
  );
};

const Phone = ({ children, dark = false, tabs = null, lang = "en" as Lang }: { children: React.ReactNode; dark?: boolean; tabs?: string | null; lang?: Lang }) => (
  <div style={{
    width: "248px", height: "510px", margin: "0 auto", borderRadius: "30px",
    border: "3px solid #3a3a44", backgroundColor: dark ? "#111118" : C.cream,
    overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
    position: "relative", display: "flex", flexDirection: "column",
  }}>
    <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "72px", height: "20px", backgroundColor: "#3a3a44", borderRadius: "0 0 12px 12px", zIndex: 10 }} />
    <div style={{ padding: "28px 14px 14px", flex: 1, display: "flex", flexDirection: "column" }}>{children}</div>
    {tabs && <TabBar active={tabs} lang={lang} />}
  </div>
);

const Shot = ({ label, headline, children, shotRef }: { label: string; headline: string; children: React.ReactNode; shotRef?: React.Ref<HTMLDivElement> }) => (
  <div ref={shotRef} style={{
    width: `${BASE_W}px`, height: `${BASE_H}px`, flexShrink: 0,
    background: `linear-gradient(180deg, ${C.bg1} 0%, ${C.bg2} 100%)`,
    overflow: "hidden", position: "relative", display: "flex", flexDirection: "column", alignItems: "center",
  }}>
    <div style={{ position: "absolute", top: "45%", left: "50%", width: "260px", height: "260px", borderRadius: "50%", background: `radial-gradient(circle, ${C.glow} 0%, transparent 70%)`, transform: "translate(-50%,-50%)", filter: "blur(35px)", pointerEvents: "none" }} />
    <div style={{ padding: "20px 20px 10px", textAlign: "center", zIndex: 1, flexShrink: 0 }}>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: "10px", fontWeight: 600, color: C.primary, letterSpacing: "3.5px", textTransform: "uppercase", margin: "0 0 4px" }}>{label}</p>
      <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: "30px", fontWeight: 900, color: C.white, margin: "0", lineHeight: 1.08, letterSpacing: "-0.8px" }} dangerouslySetInnerHTML={{ __html: headline }} />
    </div>
    <div style={{ zIndex: 1, padding: "6px 0 12px" }}>{children}</div>
  </div>
);

// ===== ENGLISH SCREENS =====

const EN_S1 = () => (
  <Phone tabs="today" lang="en">
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: `${C.primary}15`, border: `2px solid ${C.primary}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", marginBottom: "3px" }}>🐙</div>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: "9px", color: C.text, fontWeight: 500 }}>Hi, wordnerd</span>
        <div style={{ display: "flex", alignItems: "center", gap: "3px", marginTop: "1px" }}>
          <span style={{ fontSize: "8px" }}>🔥</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "7px", fontWeight: 600, color: C.primary }}>7 day streak</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, justifyContent: "center" }}>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: "8px", color: C.text, letterSpacing: "2.5px", textTransform: "uppercase", fontWeight: 600, opacity: 0.5 }}>today&apos;s word</span>
        <span style={{ fontFamily: "var(--font-playfair)", fontSize: "38px", fontWeight: 700, color: C.text, margin: "2px 0 1px", letterSpacing: "-1.5px" }}>OCEAN</span>
        <div style={{ width: "22px", height: "1.5px", backgroundColor: C.primary, margin: "1px 0 2px" }} />
        <span style={{ fontFamily: "var(--font-sans)", fontSize: "8px", color: C.primary, fontWeight: 600 }}>NATURE</span>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: "7px", color: C.text, letterSpacing: "1.5px", textTransform: "uppercase", margin: "10px 0 6px", opacity: 0.4 }}>describe it in 5 words</span>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "4px", margin: "0 0 4px" }}>
          {["Where", "fish", "pay", "no", "rent"].map(w => (
            <span key={w} style={{ padding: "4px 9px", borderRadius: "10px", border: `1.5px solid ${C.primary}`, backgroundColor: `${C.primary}10`, color: C.primary, fontFamily: "var(--font-sans)", fontSize: "10px", fontWeight: 600 }}>{w}</span>
          ))}
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px", color: C.primary, fontWeight: 600 }}>✓ 5/5</span>
        <div style={{ marginTop: "8px", padding: "8px 0", borderRadius: "10px", backgroundColor: C.text, width: "100%", textAlign: "center" }}>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "10px", fontWeight: 700, color: "#FFF" }}>SUBMIT</span>
        </div>
      </div>
    </div>
  </Phone>
);

const EN_S2 = () => (
  <Phone tabs="vote" lang="en">
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, justifyContent: "center" }}>
      <span style={{ fontFamily: "var(--font-playfair)", fontSize: "28px", fontWeight: 700, color: C.text }}>OCEAN</span>
      <div style={{ width: "20px", height: "1.5px", backgroundColor: C.primary, margin: "3px 0" }} />
      <span style={{ fontFamily: "var(--font-sans)", fontSize: "8px", color: C.text, letterSpacing: "1.5px", textTransform: "uppercase", margin: "0 0 8px", opacity: 0.4 }}>which is better?</span>
      <div style={{ padding: "14px 10px", borderRadius: "12px", width: "100%", backgroundColor: `${C.primary}08`, border: `2px solid ${C.primary}`, position: "relative", marginBottom: "5px" }}>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: "12px", fontWeight: 500, color: C.text, margin: 0, textAlign: "center", fontStyle: "italic" }}>&quot;where fish pay no rent&quot;</p>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: "8px", color: C.muted, display: "block", textAlign: "center", marginTop: "2px" }}>@wordnerd</span>
        <div style={{ position: "absolute", top: "-6px", right: "6px", backgroundColor: C.primary, color: "#FFF", borderRadius: "5px", padding: "1.5px 6px", fontSize: "6.5px", fontWeight: 700, fontFamily: "var(--font-sans)" }}>YOUR PICK ✓</div>
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: C.muted, fontWeight: 600, margin: "2px 0 5px" }}>VS</span>
      <div style={{ padding: "14px 10px", borderRadius: "12px", width: "100%", backgroundColor: "#FFF", border: `1.5px solid ${C.border}`, opacity: 0.35 }}>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: "12px", fontWeight: 500, color: C.text, margin: 0, textAlign: "center", fontStyle: "italic" }}>&quot;earth&apos;s biggest swimming pool&quot;</p>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: "8px", color: C.muted, display: "block", textAlign: "center", marginTop: "2px" }}>@seabreeze</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "8px" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px", color: C.muted }}>8/15</span>
        <div style={{ width: "50px", height: "2.5px", borderRadius: "2px", backgroundColor: C.border, overflow: "hidden" }}>
          <div style={{ width: "53%", height: "100%", backgroundColor: C.primary, borderRadius: "2px" }} />
        </div>
      </div>
    </div>
  </Phone>
);

const EN_S3 = () => {
  const rows = [
    { r: "🥇", d: "where fish pay no rent", u: "@wordnerd", v: 412 },
    { r: "🥈", d: "earth's biggest swimming pool", u: "@seabreeze", v: 367 },
    { r: "🥉", d: "salt water horizon to horizon", u: "@deepblue", v: 298 },
    { r: "4", d: "waves never stop talking back", u: "@coastline", v: 245 },
    { r: "5", d: "blue infinity calling your name", u: "@wanderer", v: 201 },
    { r: "6", d: "where the sky gets wet", u: "@poeticjay", v: 178 },
  ];
  return (
    <Phone lang="en">
      <div style={{ flex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: "5px" }}>
          <span style={{ fontFamily: "var(--font-playfair)", fontSize: "16px", fontWeight: 700, color: C.text }}>OCEAN</span>
          <div style={{ display: "flex", justifyContent: "center", gap: "0", marginTop: "4px" }}>
            <div style={{ padding: "3px 10px", borderRadius: "6px 0 0 6px", backgroundColor: C.primary, fontSize: "8px", fontWeight: 600, color: "#FFF", fontFamily: "var(--font-sans)" }}>🌐 Global</div>
            <div style={{ padding: "3px 10px", borderRadius: "0 6px 6px 0", backgroundColor: "#F0EDE5", fontSize: "8px", fontWeight: 600, color: C.muted, fontFamily: "var(--font-sans)" }}>👥 Friends</div>
          </div>
        </div>
        {rows.map((x, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 7px", borderRadius: "8px", marginBottom: "2.5px", backgroundColor: i === 0 ? "#FFFBEB" : "#FFF", border: `1px solid ${i === 0 ? "#FFE082" : C.border}` }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, width: "18px", textAlign: "center", color: i < 3 ? "inherit" : C.muted, flexShrink: 0 }}>{x.r}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: "10px", fontWeight: 500, color: C.text, margin: 0, fontStyle: "italic", lineHeight: 1.3 }}>{x.d}</p>
              <span style={{ fontFamily: "var(--font-sans)", fontSize: "7px", color: C.muted }}>{x.u}</span>
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 700, color: C.primary, flexShrink: 0 }}>{x.v}</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 7px", borderRadius: "8px", border: `1.5px solid ${C.primary}`, backgroundColor: `${C.primary}06`, marginTop: "1px" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, width: "18px", textAlign: "center", color: C.primary, flexShrink: 0 }}>7</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "10px", fontWeight: 600, color: C.text, margin: 0, fontStyle: "italic", lineHeight: 1.3 }}>the sound of being small</p>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: "7px", color: C.primary, fontWeight: 600 }}>@you — that&apos;s you!</span>
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 700, color: C.primary, flexShrink: 0 }}>156</span>
        </div>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: C.primary, textAlign: "center", fontWeight: 600, margin: "5px 0 0" }}>#7 of 4,218 players</p>
      </div>
    </Phone>
  );
};

const EN_S4 = () => (
  <Phone lang="en">
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, justifyContent: "center" }}>
      <span style={{ fontFamily: "var(--font-sans)", fontSize: "7px", color: C.muted, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "6px" }}>your result</span>
      <div style={{ width: "100%", padding: "16px 12px", borderRadius: "14px", background: `linear-gradient(145deg, ${C.dark1}, ${C.dark2})`, textAlign: "center", boxShadow: "0 10px 35px rgba(0,0,0,0.25)" }}>
        <div><span style={{ fontFamily: "var(--font-playfair)", fontSize: "9px", color: "rgba(255,255,255,0.4)" }}>one</span><span style={{ fontFamily: "var(--font-playfair)", fontSize: "9px", color: C.primary }}>word</span></div>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: "6px", color: "rgba(255,255,255,0.2)", letterSpacing: "1.5px", textTransform: "uppercase" }}>today&apos;s word</span>
        <h3 style={{ fontFamily: "var(--font-playfair)", fontSize: "24px", fontWeight: 700, color: "#FFF", margin: "2px 0 8px" }}>OCEAN</h3>
        <div style={{ padding: "6px", borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", marginBottom: "10px" }}>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "10px", color: "#FFF", margin: 0, fontStyle: "italic" }}>&quot;where fish pay no rent&quot;</p>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
          {[{ e: "🏆", v: "#7", l: "RANK" }, { e: "❤️", v: "156", l: "VOTES" }, { e: "🔥", v: "7", l: "STREAK" }].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <span style={{ fontSize: "10px" }}>{s.e}</span>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 700, color: "#FFF" }}>{s.v}</div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: "5px", color: "rgba(255,255,255,0.2)", letterSpacing: "1px" }}>{s.l}</div>
            </div>
          ))}
        </div>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: "6px", color: "rgba(255,255,255,0.12)", margin: "6px 0 0" }}>playoneword.app</p>
      </div>
      <div style={{ marginTop: "10px", padding: "11px 0", borderRadius: "11px", backgroundColor: C.primary, width: "100%", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
        <span style={{ fontSize: "11px" }}>📤</span>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: "11px", fontWeight: 700, color: "#FFF" }}>Share Results</span>
      </div>
    </div>
  </Phone>
);

const EN_S5 = () => (
  <Phone tabs="friends" lang="en">
    <div style={{ flex: 1 }}>
      <h3 style={{ fontFamily: "var(--font-playfair)", fontSize: "14px", fontWeight: 700, color: C.text, textAlign: "center", margin: "0 0 6px" }}>FRIENDS</h3>
      <div style={{ padding: "7px 8px", borderRadius: "9px", backgroundColor: `${C.primary}06`, border: `1.5px solid ${C.primary}20`, marginBottom: "8px" }}>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: "8px", fontWeight: 600, color: C.text, margin: "0 0 3px" }}>👋 @maria wants to be your friend</p>
        <div style={{ display: "flex", gap: "4px" }}>
          <div style={{ padding: "2px 8px", borderRadius: "5px", backgroundColor: C.primary, fontSize: "7px", fontWeight: 700, color: "#FFF", fontFamily: "var(--font-sans)" }}>Accept</div>
          <div style={{ padding: "2px 8px", borderRadius: "5px", backgroundColor: "#F0EDE5", fontSize: "7px", fontWeight: 600, color: C.muted, fontFamily: "var(--font-sans)" }}>Decline</div>
        </div>
      </div>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: "6.5px", color: C.muted, letterSpacing: "1.5px", textTransform: "uppercase", margin: "0 0 4px" }}>today&apos;s descriptions</p>
      {[
        { u: "@sara", b: "💎", d: "where fish pay no rent", r: "#1" },
        { u: "@luna", b: "🔥", d: "salt water horizon to horizon", r: "#3" },
        { u: "@pedro", b: "✨", d: "blue infinity calling your name", r: "#5" },
        { u: "@alex", b: "👑", d: "waves never stop talking back", r: "#4" },
        { u: "@mia", b: "⚡", d: "the sound of being small", r: "#7" },
      ].map((f, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 6px", borderRadius: "8px", marginBottom: "2.5px", backgroundColor: "#FFF", border: `1px solid ${C.border}` }}>
          <span style={{ fontSize: "10px" }}>{f.b}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: "8px", fontWeight: 600, color: C.text }}>{f.u}</span>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "7px", color: C.muted, margin: "0", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>&quot;{f.d}&quot;</p>
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", fontWeight: 700, color: C.primary }}>{f.r}</span>
        </div>
      ))}
      <div style={{ marginTop: "4px", padding: "6px 8px", borderRadius: "8px", backgroundColor: "#F5F0E8", display: "flex", alignItems: "center", gap: "4px" }}>
        <span style={{ fontSize: "8px", color: C.muted }}>🔍</span>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: "8px", color: C.muted }}>Find friends...</span>
      </div>
    </div>
  </Phone>
);

const EN_S6 = () => (
  <Phone lang="en">
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, justifyContent: "center", textAlign: "center" }}>
      <span style={{ fontSize: "40px", filter: "drop-shadow(0 0 10px rgba(255,107,74,0.3))" }}>🔥</span>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "34px", fontWeight: 700, color: C.primary, margin: "2px 0" }}>7</div>
      <span style={{ fontFamily: "var(--font-sans)", fontSize: "7px", color: C.muted, letterSpacing: "2.5px", textTransform: "uppercase" }}>day streak</span>
      <h3 style={{ fontFamily: "var(--font-playfair)", fontSize: "20px", fontWeight: 900, color: C.primary, margin: "4px 0 1px" }}>On Fire</h3>
      <p style={{ fontFamily: "var(--font-playfair)", fontSize: "10px", fontStyle: "italic", color: C.muted, margin: "0 0 14px" }}>A whole week. Unstoppable.</p>
      <div style={{ display: "flex", gap: "14px", marginBottom: "12px" }}>
        {[{ e: "🔥", v: "7", l: "PLAYED" }, { e: "🏆", v: "#2", l: "BEST RANK" }, { e: "💬", v: "456", l: "VOTES" }].map((s, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <span style={{ fontSize: "8px" }}>{s.e}</span>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, color: C.text }}>{s.v}</div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: "5px", color: C.muted, letterSpacing: "0.8px" }}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: "6px 10px", borderRadius: "8px", backgroundColor: `${C.primary}08`, border: `1px solid ${C.primary}20`, width: "90%" }}>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: "5.5px", color: C.muted, letterSpacing: "1px", textTransform: "uppercase" }}>NEXT MILESTONE</span>
        <div style={{ display: "flex", alignItems: "center", gap: "3px", marginTop: "2px" }}>
          <span style={{ fontSize: "8px" }}>⚡</span>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "8px", color: C.text, fontWeight: 600 }}>Unstoppable — 7 days</span>
        </div>
        <div style={{ marginTop: "3px", width: "100%", height: "2.5px", borderRadius: "2px", backgroundColor: C.border, overflow: "hidden" }}>
          <div style={{ width: "50%", height: "100%", backgroundColor: C.primary, borderRadius: "2px" }} />
        </div>
      </div>
    </div>
  </Phone>
);

// ===== SPANISH SCREENS =====

const ES_S1 = () => (
  <Phone tabs="today" lang="es">
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: `${C.primary}15`, border: `2px solid ${C.primary}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", marginBottom: "3px" }}>🐙</div>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: "9px", color: C.text, fontWeight: 500 }}>Hola, wordnerd</span>
        <div style={{ display: "flex", alignItems: "center", gap: "3px", marginTop: "1px" }}>
          <span style={{ fontSize: "8px" }}>🔥</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "7px", fontWeight: 600, color: C.primary }}>racha de 7 días</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, justifyContent: "center" }}>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: "8px", color: C.text, letterSpacing: "2.5px", textTransform: "uppercase", fontWeight: 600, opacity: 0.5 }}>PALABRA DEL DÍA</span>
        <span style={{ fontFamily: "var(--font-playfair)", fontSize: "38px", fontWeight: 700, color: C.text, margin: "2px 0 1px", letterSpacing: "-1.5px" }}>WIFI</span>
        <div style={{ width: "22px", height: "1.5px", backgroundColor: C.primary, margin: "1px 0 2px" }} />
        <span style={{ fontFamily: "var(--font-sans)", fontSize: "8px", color: C.primary, fontWeight: 600 }}>MODERNO</span>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: "7px", color: C.text, letterSpacing: "1.5px", textTransform: "uppercase", margin: "10px 0 6px", opacity: 0.4 }}>DESCRÍBELO EN 5 PALABRAS</span>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "4px", margin: "0 0 4px" }}>
          {["Aire", "moderno", "que", "no", "respiramos"].map(w => (
            <span key={w} style={{ padding: "4px 9px", borderRadius: "10px", border: `1.5px solid ${C.primary}`, backgroundColor: `${C.primary}10`, color: C.primary, fontFamily: "var(--font-sans)", fontSize: "10px", fontWeight: 600 }}>{w}</span>
          ))}
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px", color: C.primary, fontWeight: 600 }}>✓ 5/5</span>
        <div style={{ marginTop: "8px", padding: "8px 0", borderRadius: "10px", backgroundColor: C.text, width: "100%", textAlign: "center" }}>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "10px", fontWeight: 700, color: "#FFF" }}>ENVIAR</span>
        </div>
      </div>
    </div>
  </Phone>
);

const ES_S2 = () => (
  <Phone tabs="vote" lang="es">
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, justifyContent: "center" }}>
      <span style={{ fontFamily: "var(--font-playfair)", fontSize: "28px", fontWeight: 700, color: C.text }}>WIFI</span>
      <div style={{ width: "20px", height: "1.5px", backgroundColor: C.primary, margin: "3px 0" }} />
      <span style={{ fontFamily: "var(--font-sans)", fontSize: "8px", color: C.text, letterSpacing: "1.5px", textTransform: "uppercase", margin: "0 0 8px", opacity: 0.4 }}>¿CUÁL ES MEJOR?</span>
      <div style={{ padding: "14px 10px", borderRadius: "12px", width: "100%", backgroundColor: `${C.primary}08`, border: `2px solid ${C.primary}`, position: "relative", marginBottom: "5px" }}>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: "12px", fontWeight: 500, color: C.text, margin: 0, textAlign: "center", fontStyle: "italic" }}>&quot;Aire moderno que no respiramos&quot;</p>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: "8px", color: C.muted, display: "block", textAlign: "center", marginTop: "2px" }}>@miguel.r</span>
        <div style={{ position: "absolute", top: "-6px", right: "6px", backgroundColor: C.primary, color: "#FFF", borderRadius: "5px", padding: "1.5px 6px", fontSize: "6.5px", fontWeight: 700, fontFamily: "var(--font-sans)" }}>TU VOTO ✓</div>
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: C.muted, fontWeight: 600, margin: "2px 0 5px" }}>VS</span>
      <div style={{ padding: "14px 10px", borderRadius: "12px", width: "100%", backgroundColor: "#FFF", border: `1.5px solid ${C.border}`, opacity: 0.35 }}>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: "12px", fontWeight: 500, color: C.text, margin: 0, textAlign: "center", fontStyle: "italic" }}>&quot;Barras de señal controlan humor&quot;</p>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: "8px", color: C.muted, display: "block", textAlign: "center", marginTop: "2px" }}>@santii.07</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "8px" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px", color: C.muted }}>8/15</span>
        <div style={{ width: "50px", height: "2.5px", borderRadius: "2px", backgroundColor: C.border, overflow: "hidden" }}>
          <div style={{ width: "53%", height: "100%", backgroundColor: C.primary, borderRadius: "2px" }} />
        </div>
      </div>
    </div>
  </Phone>
);

const ES_S3 = () => {
  const rows = [
    { r: "🥇", d: "Aire moderno que no respiramos", u: "@miguel.r", v: "13 votos" },
    { r: "🥈", d: "Barras de señal controlan humor", u: "@santii.07", v: "12 votos" },
    { r: "🥉", d: "Moneda real de las cafeterías", u: "@camila.writes", v: "11 votos" },
    { r: "4", d: "Cadenas inalámbricas que usamos gustosos", u: "@pablitoo", v: "11 votos" },
    { r: "5", d: "Oxígeno invisible para nuestras almas", u: "@juanp_33", v: "9 votos" },
    { r: "6", d: "Hoguera moderna donde nos reunimos", u: "@ale_moreno", v: "8 votos" },
  ];
  return (
    <Phone lang="es">
      <div style={{ flex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: "5px" }}>
          <span style={{ fontFamily: "var(--font-playfair)", fontSize: "16px", fontWeight: 700, color: C.text }}>WIFI</span>
          <div style={{ display: "flex", justifyContent: "center", gap: "0", marginTop: "4px" }}>
            <div style={{ padding: "3px 10px", borderRadius: "6px 0 0 6px", backgroundColor: C.primary, fontSize: "8px", fontWeight: 600, color: "#FFF", fontFamily: "var(--font-sans)" }}>🌐 Global</div>
            <div style={{ padding: "3px 10px", borderRadius: "0 6px 6px 0", backgroundColor: "#F0EDE5", fontSize: "8px", fontWeight: 600, color: C.muted, fontFamily: "var(--font-sans)" }}>👥 Amigos</div>
          </div>
        </div>
        {rows.map((x, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 7px", borderRadius: "8px", marginBottom: "2.5px", backgroundColor: i === 0 ? "#FFFBEB" : "#FFF", border: `1px solid ${i === 0 ? "#FFE082" : C.border}` }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, width: "18px", textAlign: "center", color: i < 3 ? "inherit" : C.muted, flexShrink: 0 }}>{x.r}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: "9px", fontWeight: 500, color: C.text, margin: 0, fontStyle: "italic", lineHeight: 1.3 }}>{x.d}</p>
              <span style={{ fontFamily: "var(--font-sans)", fontSize: "7px", color: C.muted }}>{x.u}</span>
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px", fontWeight: 700, color: C.primary, flexShrink: 0, whiteSpace: "nowrap" }}>{x.v}</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 7px", borderRadius: "8px", border: `1.5px solid ${C.primary}`, backgroundColor: `${C.primary}06`, marginTop: "1px" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, width: "18px", textAlign: "center", color: C.primary, flexShrink: 0 }}>7</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "9px", fontWeight: 600, color: C.text, margin: 0, fontStyle: "italic", lineHeight: 1.3 }}>Ondas mágicas cargando vídeos gatos</p>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: "7px", color: C.primary, fontWeight: 600 }}>@tú — ¡eres tú!</span>
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px", fontWeight: 700, color: C.primary, flexShrink: 0, whiteSpace: "nowrap" }}>8 votos</span>
        </div>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: C.primary, textAlign: "center", fontWeight: 600, margin: "5px 0 0" }}>#7 de 16 jugadores</p>
      </div>
    </Phone>
  );
};

const ES_S4 = () => (
  <Phone lang="es">
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, justifyContent: "center" }}>
      <span style={{ fontFamily: "var(--font-sans)", fontSize: "7px", color: C.muted, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "6px" }}>TU RESULTADO</span>
      <div style={{ width: "100%", padding: "16px 12px", borderRadius: "14px", background: `linear-gradient(145deg, ${C.dark1}, ${C.dark2})`, textAlign: "center", boxShadow: "0 10px 35px rgba(0,0,0,0.25)" }}>
        <div><span style={{ fontFamily: "var(--font-playfair)", fontSize: "9px", color: "rgba(255,255,255,0.4)" }}>one</span><span style={{ fontFamily: "var(--font-playfair)", fontSize: "9px", color: C.primary }}>word</span></div>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: "6px", color: "rgba(255,255,255,0.2)", letterSpacing: "1.5px", textTransform: "uppercase" }}>PALABRA DEL DÍA</span>
        <h3 style={{ fontFamily: "var(--font-playfair)", fontSize: "24px", fontWeight: 700, color: "#FFF", margin: "2px 0 8px" }}>WIFI</h3>
        <div style={{ padding: "6px", borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", marginBottom: "10px" }}>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "10px", color: "#FFF", margin: 0, fontStyle: "italic" }}>&quot;Aire moderno que no respiramos&quot;</p>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
          {[{ e: "🏆", v: "#1", l: "PUESTO" }, { e: "❤️", v: "13", l: "VOTOS" }, { e: "🔥", v: "7", l: "RACHA" }].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <span style={{ fontSize: "10px" }}>{s.e}</span>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 700, color: "#FFF" }}>{s.v}</div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: "5px", color: "rgba(255,255,255,0.2)", letterSpacing: "1px" }}>{s.l}</div>
            </div>
          ))}
        </div>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: "6px", color: "rgba(255,255,255,0.12)", margin: "6px 0 0" }}>playoneword.app</p>
      </div>
      <div style={{ marginTop: "10px", padding: "11px 0", borderRadius: "11px", backgroundColor: C.primary, width: "100%", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
        <span style={{ fontSize: "11px" }}>📤</span>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: "11px", fontWeight: 700, color: "#FFF" }}>Compartir Resultado</span>
      </div>
    </div>
  </Phone>
);

const ES_S5 = () => (
  <Phone tabs="friends" lang="es">
    <div style={{ flex: 1 }}>
      <h3 style={{ fontFamily: "var(--font-playfair)", fontSize: "14px", fontWeight: 700, color: C.text, textAlign: "center", margin: "0 0 6px" }}>AMIGOS</h3>
      <div style={{ padding: "7px 8px", borderRadius: "9px", backgroundColor: `${C.primary}06`, border: `1.5px solid ${C.primary}20`, marginBottom: "8px" }}>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: "8px", fontWeight: 600, color: C.text, margin: "0 0 3px" }}>👋 @maria quiere ser tu amiga</p>
        <div style={{ display: "flex", gap: "4px" }}>
          <div style={{ padding: "2px 8px", borderRadius: "5px", backgroundColor: C.primary, fontSize: "7px", fontWeight: 700, color: "#FFF", fontFamily: "var(--font-sans)" }}>Aceptar</div>
          <div style={{ padding: "2px 8px", borderRadius: "5px", backgroundColor: "#F0EDE5", fontSize: "7px", fontWeight: 600, color: C.muted, fontFamily: "var(--font-sans)" }}>Rechazar</div>
        </div>
      </div>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: "6.5px", color: C.muted, letterSpacing: "1.5px", textTransform: "uppercase", margin: "0 0 4px" }}>DESCRIPCIONES DE HOY</p>
      {[
        { u: "@sara", b: "💎", d: "Aire moderno que no respiramos", r: "#1" },
        { u: "@luna", b: "🔥", d: "Barras de señal controlan humor", r: "#2" },
        { u: "@pedro", b: "✨", d: "Lo más importante del hotel", r: "#5" },
        { u: "@alex", b: "👑", d: "Tres barras de felicidad digital", r: "#9" },
        { u: "@mia", b: "⚡", d: "Ondas mágicas cargando vídeos gatos", r: "#7" },
      ].map((f, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 6px", borderRadius: "8px", marginBottom: "2.5px", backgroundColor: "#FFF", border: `1px solid ${C.border}` }}>
          <span style={{ fontSize: "10px" }}>{f.b}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: "8px", fontWeight: 600, color: C.text }}>{f.u}</span>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "7px", color: C.muted, margin: "0", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>&quot;{f.d}&quot;</p>
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", fontWeight: 700, color: C.primary }}>{f.r}</span>
        </div>
      ))}
    </div>
  </Phone>
);

const ES_S6 = () => (
  <Phone lang="es">
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, justifyContent: "center", textAlign: "center" }}>
      <span style={{ fontSize: "40px", filter: "drop-shadow(0 0 10px rgba(255,107,74,0.3))" }}>🔥</span>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "34px", fontWeight: 700, color: C.primary, margin: "2px 0" }}>7</div>
      <span style={{ fontFamily: "var(--font-sans)", fontSize: "7px", color: C.muted, letterSpacing: "2.5px", textTransform: "uppercase" }}>RACHA DE DÍAS</span>
      <h3 style={{ fontFamily: "var(--font-playfair)", fontSize: "20px", fontWeight: 900, color: C.primary, margin: "4px 0 1px" }}>En Llamas</h3>
      <p style={{ fontFamily: "var(--font-playfair)", fontSize: "10px", fontStyle: "italic", color: C.muted, margin: "0 0 14px" }}>Una semana entera. Imparable.</p>
      <div style={{ display: "flex", gap: "14px", marginBottom: "12px" }}>
        {[{ e: "🔥", v: "7", l: "JUGADOS" }, { e: "🏆", v: "#2", l: "MEJOR" }, { e: "💬", v: "456", l: "VOTOS" }].map((s, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <span style={{ fontSize: "8px" }}>{s.e}</span>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, color: C.text }}>{s.v}</div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: "5px", color: C.muted, letterSpacing: "0.8px" }}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: "6px 10px", borderRadius: "8px", backgroundColor: `${C.primary}08`, border: `1px solid ${C.primary}20`, width: "90%" }}>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: "5.5px", color: C.muted, letterSpacing: "1px", textTransform: "uppercase" }}>SIGUIENTE HITO</span>
        <div style={{ display: "flex", alignItems: "center", gap: "3px", marginTop: "2px" }}>
          <span style={{ fontSize: "8px" }}>⚡</span>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "8px", color: C.text, fontWeight: 600 }}>Imparable — 7 días</span>
        </div>
        <div style={{ marginTop: "3px", width: "100%", height: "2.5px", borderRadius: "2px", backgroundColor: C.border, overflow: "hidden" }}>
          <div style={{ width: "50%", height: "100%", backgroundColor: C.primary, borderRadius: "2px" }} />
        </div>
      </div>
    </div>
  </Phone>
);

// ===== SCREENSHOT DATA =====

const enScreenshots = [
  { l: "DAILY WORD GAME", h: "One <span style='color:#FF6B4A'>word.</span><br/>Say it in five.", c: <EN_S1 /> },
  { l: "COMMUNITY VOTING", h: "The whole world<br/>votes.", c: <EN_S2 /> },
  { l: "LEADERBOARD", h: "See where<br/>you ranked.", c: <EN_S3 /> },
  { l: "SHARE CARD", h: "Share your<br/>creativity.", c: <EN_S4 /> },
  { l: "SOCIAL", h: "Play with<br/>friends.", c: <EN_S5 /> },
  { l: "DAILY STREAKS", h: "Build your<br/>streak.", c: <EN_S6 /> },
];

const esScreenshots = [
  { l: "JUEGO DIARIO", h: "Una <span style='color:#FF6B4A'>palabra.</span><br/>Dilo en cinco.", c: <ES_S1 /> },
  { l: "VOTACIÓN COMUNITARIA", h: "El mundo entero<br/>vota.", c: <ES_S2 /> },
  { l: "CLASIFICACIÓN", h: "Mira dónde<br/>quedaste.", c: <ES_S3 /> },
  { l: "COMPARTIR", h: "Comparte tu<br/>creatividad.", c: <ES_S4 /> },
  { l: "SOCIAL", h: "Juega con<br/>amigos.", c: <ES_S5 /> },
  { l: "RACHAS DIARIAS", h: "Construye tu<br/>racha.", c: <ES_S6 /> },
];

export default function ScreenshotPage() {
  const [sizeIdx, setSizeIdx] = useState(0);
  const [exporting, setExporting] = useState(false);
  const esRefs = useRef<(HTMLDivElement | null)[]>([]);

  const selectedSize = SIZES[sizeIdx];
  const scale = selectedSize.w / BASE_W;

  const exportOne = async (index: number) => {
    const el = esRefs.current[index];
    if (!el) return;

    const png = await toPng(el, {
      width: selectedSize.w,
      height: selectedSize.h,
      pixelRatio: 1,
      style: {
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        width: `${BASE_W}px`,
        height: `${BASE_H}px`,
      },
    });

    const link = document.createElement('a');
    link.download = `${String(index + 1).padStart(2, '0')}-oneword-es-${selectedSize.w}x${selectedSize.h}.png`;
    link.href = png;
    link.click();
  };

  const exportAll = async () => {
    setExporting(true);
    for (let i = 0; i < esScreenshots.length; i++) {
      await exportOne(i);
      await new Promise(r => setTimeout(r, 500));
    }
    setExporting(false);
  };

  return (
    <div style={{ backgroundColor: "#070710", minHeight: "100vh", padding: "20px" }}>
      {/* Controls */}
      <div style={{ display: "flex", justifyContent: "center", gap: "12px", alignItems: "center", marginBottom: "12px", flexWrap: "wrap" }}>
        {/* Size selector */}
        <div style={{ display: "flex", gap: "4px" }}>
          {SIZES.map((s, i) => (
            <button key={s.label} onClick={() => setSizeIdx(i)} style={{
              padding: "6px 14px", borderRadius: "8px", border: "none", cursor: "pointer",
              backgroundColor: sizeIdx === i ? C.primary : "#1a1a2e",
              color: sizeIdx === i ? "#FFF" : "#666",
              fontSize: "13px", fontWeight: 600,
            }}>{s.label}</button>
          ))}
        </div>

        {/* Export button */}
        <button onClick={exportAll} disabled={exporting} style={{
          padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer",
          backgroundColor: C.primary, color: "#FFF", fontSize: "13px", fontWeight: 700,
          opacity: exporting ? 0.5 : 1,
        }}>{exporting ? "Exporting..." : "Export All"}</button>
      </div>

      {/* Size info */}
      <p style={{ textAlign: "center", color: "#666", fontSize: "12px", marginBottom: "20px" }}>
        Spanish — Exporting at {selectedSize.w} × {selectedSize.h} — Click any screenshot to export individually
      </p>

      {/* Screenshots grid */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", justifyContent: "center" }}>
        {esScreenshots.map((s, i) => (
          <div key={`es-${i}`} onClick={() => exportOne(i)} style={{ cursor: "pointer" }}>
            <Shot
              shotRef={(el: HTMLDivElement | null) => { esRefs.current[i] = el; }}
              label={s.l}
              headline={s.h}
            >
              {s.c}
            </Shot>
            <p style={{ textAlign: "center", color: "#555", fontSize: "11px", marginTop: "6px" }}>
              {i + 1}. Click to export
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
