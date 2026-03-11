"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { toPng } from "html-to-image";

/* ─── Constants ─── */
const IPHONE_W = 1320;
const IPHONE_H = 2868;

const IPHONE_SIZES: { label: string; w: number; h: number }[] = [
  { label: '6.9"', w: 1320, h: 2868 },
  { label: '6.5"', w: 1284, h: 2778 },
  { label: '6.3"', w: 1206, h: 2622 },
  { label: '6.1"', w: 1125, h: 2436 },
];

/* ─── Brand Tokens ─── */
const CORAL = "#FF6B4A";
const CREAM = "#FFFDF7";
const INK = "#1A1A2E";
const GOLD = "#FFD700";
const DARK_SURFACE = "#1E1C24";
const MUTED = "#8B8697";

/* ─── Consistent dark gradient background for ALL slides ─── */
const SLIDE_BG = "linear-gradient(180deg, #0F0E17 0%, #1A1A2E 100%)";

/* ─── Phone Mockup ─── */
const MK_W = 1022;
const MK_H = 2082;
const SC_L = (52 / MK_W) * 100;
const SC_T = (46 / MK_H) * 100;
const SC_W = (918 / MK_W) * 100;
const SC_H = (1990 / MK_H) * 100;
const SC_RX = (126 / 918) * 100;
const SC_RY = (126 / 1990) * 100;

/* ─── Phone size: takes up ~65-70% of vertical, cut off at bottom ─── */
const PHONE_WIDTH_PCT = "88%";
const PHONE_TOP_START = "38%"; // headline above, phone starts here

function Phone({
  children,
  style,
  className = "",
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={`relative ${className}`}
      style={{ aspectRatio: `${MK_W}/${MK_H}`, ...style }}
    >
      <img
        src="/mockup.png"
        alt=""
        className="block w-full h-full"
        draggable={false}
      />
      <div
        className="absolute z-10 overflow-hidden"
        style={{
          left: `${SC_L}%`,
          top: `${SC_T}%`,
          width: `${SC_W}%`,
          height: `${SC_H}%`,
          borderRadius: `${SC_RX}% / ${SC_RY}%`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ─── Caption: category label + headline, always at top ─── */
function Caption({
  label,
  headline,
}: {
  label: string;
  headline: React.ReactNode;
}) {
  return (
    <div style={{ textAlign: "center", padding: "0 60px" }}>
      <div
        style={{
          fontFamily: "var(--font-dm-sans), sans-serif",
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: CORAL,
          marginBottom: 20,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-playfair), serif",
          fontSize: 108,
          fontWeight: 700,
          lineHeight: 1.05,
          color: "#fff",
        }}
      >
        {headline}
      </div>
    </div>
  );
}

/* ─── Coral glow behind phone ─── */
function PhoneGlow() {
  return (
    <div
      style={{
        position: "absolute",
        top: "40%",
        left: "50%",
        transform: "translate(-50%, -20%)",
        width: "80%",
        aspectRatio: "1",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,107,74,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }}
    />
  );
}

/* ─── Slide wrapper with consistent background ─── */
function SlideWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: IPHONE_W,
        height: IPHONE_H,
        position: "relative",
        overflow: "hidden",
        background: SLIDE_BG,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Phone container: big, centered, cut off at bottom ─── */
function PhoneContainer({
  children,
  offsetX = 0,
  topStart = PHONE_TOP_START,
  widthPct = PHONE_WIDTH_PCT,
}: {
  children: React.ReactNode;
  offsetX?: number;
  topStart?: string;
  widthPct?: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: topStart,
        left: `calc(50% + ${offsetX}px)`,
        transform: "translateX(-50%)",
        width: widthPct,
      }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════
   SLIDE 1: Hero — "One word. Say it in five."
   ═══════════════════════════════════════════ */
function Slide1() {
  return (
    <SlideWrapper>
      <PhoneGlow />

      {/* Caption at top */}
      <div style={{ position: "absolute", top: 100, left: 0, right: 0 }}>
        <Caption
          label="DAILY WORD GAME"
          headline={
            <>
              One word.
              <br />
              Say it in five.
            </>
          }
        />
      </div>

      {/* Phone — big, cut off at bottom */}
      <PhoneContainer topStart="36%">
        <Phone>
          <div
            style={{
              width: "100%",
              height: "100%",
              background: CREAM,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              paddingTop: "16%",
              fontFamily: "var(--font-dm-sans), sans-serif",
            }}
          >
            <div
              style={{
                fontSize: 26,
                fontWeight: 600,
                letterSpacing: "0.2em",
                color: MUTED,
                marginBottom: 24,
              }}
            >
              TODAY&apos;S WORD
            </div>
            <div
              style={{
                fontFamily: "var(--font-playfair), serif",
                fontSize: 96,
                fontWeight: 700,
                color: INK,
                marginBottom: 10,
              }}
            >
              SILENCE
            </div>
            <div
              style={{
                width: 160,
                height: 5,
                borderRadius: 3,
                background: CORAL,
                marginBottom: 14,
              }}
            />
            <div
              style={{
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: "0.25em",
                color: CORAL,
              }}
            >
              NOUN
            </div>

            {/* Instruction */}
            <div
              style={{
                marginTop: 64,
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: "0.1em",
                color: MUTED,
              }}
            >
              DESCRIBE IT IN 5 WORDS
            </div>

            {/* Word pills */}
            <div
              style={{
                marginTop: 32,
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 14,
                padding: "0 40px",
              }}
            >
              {["the", "absence", "of", "all", "sound"].map((word) => (
                <div
                  key={word}
                  style={{
                    padding: "16px 32px",
                    borderRadius: 28,
                    border: `3px solid ${CORAL}`,
                    background: "rgba(255,107,74,0.08)",
                    fontFamily: "var(--font-dm-sans), sans-serif",
                    fontSize: 30,
                    fontWeight: 700,
                    color: INK,
                  }}
                >
                  {word}
                </div>
              ))}
            </div>

            {/* 5/5 counter */}
            <div
              style={{
                marginTop: 28,
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontFamily: "var(--font-dm-mono), monospace",
                fontSize: 28,
                fontWeight: 500,
                color: "#2ECC71",
              }}
            >
              <span style={{ color: CORAL, fontSize: 28 }}>✓</span> 5/5
            </div>

            {/* Submit button */}
            <div
              style={{
                marginTop: 32,
                width: "70%",
                padding: "24px 0",
                borderRadius: 18,
                background: INK,
                textAlign: "center",
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: "#fff",
              }}
            >
              SUBMIT
            </div>
          </div>
        </Phone>
      </PhoneContainer>
    </SlideWrapper>
  );
}

/* ═══════════════════════════════════════════
   SLIDE 2: Voting — "The whole world votes."
   ═══════════════════════════════════════════ */
function Slide2() {
  return (
    <SlideWrapper>
      <PhoneGlow />

      <div style={{ position: "absolute", top: 100, left: 0, right: 0 }}>
        <Caption
          label="COMMUNITY VOTING"
          headline={
            <>
              The whole world
              <br />
              votes.
            </>
          }
        />
      </div>

      {/* Single phone, slightly offset right */}
      <PhoneContainer offsetX={20} topStart="36%">
        <Phone>
          <div
            style={{
              width: "100%",
              height: "100%",
              background: CREAM,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              paddingTop: "12%",
              fontFamily: "var(--font-dm-sans), sans-serif",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-playfair), serif",
                fontSize: 72,
                fontWeight: 700,
                color: INK,
                marginBottom: 8,
              }}
            >
              SILENCE
            </div>
            <div
              style={{
                width: 130,
                height: 4,
                borderRadius: 2,
                background: CORAL,
                marginBottom: 28,
              }}
            />
            <div
              style={{
                fontSize: 26,
                fontWeight: 600,
                letterSpacing: "0.08em",
                color: MUTED,
                marginBottom: 36,
              }}
            >
              WHICH IS BETTER?
            </div>

            {/* Vote Card 1 — Selected */}
            <div
              style={{
                width: "84%",
                padding: "28px 24px",
                borderRadius: 20,
                border: `3px solid ${CORAL}`,
                background: "rgba(255,107,74,0.06)",
                textAlign: "center",
                position: "relative",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -16,
                  right: 20,
                  background: CORAL,
                  color: "#fff",
                  fontSize: 18,
                  fontWeight: 700,
                  padding: "6px 16px",
                  borderRadius: 12,
                  letterSpacing: "0.05em",
                }}
              >
                YOUR PICK ✓
              </div>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 500,
                  lineHeight: 1.5,
                  color: INK,
                  fontStyle: "italic",
                }}
              >
                &ldquo;the absence of all sound&rdquo;
              </div>
              <div style={{ fontSize: 20, color: MUTED, marginTop: 10 }}>
                @wordsmith_42
              </div>
            </div>

            {/* VS */}
            <div
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: MUTED,
                margin: "16px 0",
              }}
            >
              VS
            </div>

            {/* Vote Card 2 — Unselected */}
            <div
              style={{
                width: "84%",
                padding: "28px 24px",
                borderRadius: 20,
                border: "2px solid #E8E3D9",
                background: "#F5F0E8",
                textAlign: "center",
                opacity: 0.6,
              }}
            >
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 500,
                  lineHeight: 1.5,
                  color: INK,
                  fontStyle: "italic",
                }}
              >
                &ldquo;nothing makes a single noise&rdquo;
              </div>
              <div style={{ fontSize: 20, color: MUTED, marginTop: 10 }}>
                @quietone
              </div>
            </div>

            {/* Vote progress */}
            <div
              style={{
                marginTop: 32,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                width: "70%",
              }}
            >
              <div style={{ fontSize: 20, color: MUTED, fontWeight: 600 }}>
                vote 12/50
              </div>
              <div
                style={{
                  width: "100%",
                  height: 8,
                  borderRadius: 4,
                  background: "#E8E3D9",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: "24%",
                    height: "100%",
                    borderRadius: 4,
                    background: CORAL,
                  }}
                />
              </div>
            </div>
          </div>
        </Phone>
      </PhoneContainer>
    </SlideWrapper>
  );
}

/* ═══════════════════════════════════════════
   SLIDE 3: Leaderboard — "See where you ranked."
   ═══════════════════════════════════════════ */
function Slide3() {
  const leaderboard = [
    { rank: 1, desc: "a void filled with calm", user: "@luna_writes", votes: 312, medal: "🥇", color: GOLD },
    { rank: 2, desc: "what remains after screaming", user: "@poeticjay", votes: 287, medal: "🥈", color: "#C0C0C0" },
    { rank: 3, desc: "golden quiet before sunrise", user: "@morningbird", votes: 245, medal: "🥉", color: "#CD7F32" },
    { rank: 4, desc: "empty rooms speak so loud", user: "@thinkers", votes: 201, medal: "", color: "" },
    { rank: 5, desc: "no noise anywhere at all", user: "@simple_sam", votes: 189, medal: "", color: "" },
    { rank: 6, desc: "when the music stops playing", user: "@dj_thoughts", votes: 164, medal: "", color: "" },
    { rank: 7, desc: "the absence of all sound", user: "@you", votes: 142, medal: "", color: "", isYou: true as const },
  ];

  return (
    <SlideWrapper>
      <PhoneGlow />

      <div style={{ position: "absolute", top: 100, left: 0, right: 0 }}>
        <Caption
          label="LEADERBOARD"
          headline={
            <>
              See where
              <br />
              you ranked.
            </>
          }
        />
      </div>

      <PhoneContainer topStart="36%" widthPct="90%">
        <Phone>
          <div
            style={{
              width: "100%",
              height: "100%",
              background: CREAM,
              fontFamily: "var(--font-dm-sans), sans-serif",
              paddingTop: "8%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-playfair), serif",
                fontSize: 64,
                fontWeight: 700,
                color: INK,
                marginBottom: 6,
              }}
            >
              SILENCE
            </div>
            <div
              style={{
                width: 120,
                height: 4,
                borderRadius: 2,
                background: CORAL,
                marginBottom: 20,
              }}
            />

            {/* Segmented control */}
            <div
              style={{
                display: "flex",
                borderRadius: 9999,
                border: "1px solid #E8E3D9",
                background: "#F5F0E8",
                padding: 4,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  padding: "12px 30px",
                  borderRadius: 9999,
                  background: CORAL,
                  color: "#fff",
                  fontSize: 22,
                  fontWeight: 700,
                }}
              >
                🌍 Global
              </div>
              <div
                style={{
                  padding: "12px 30px",
                  borderRadius: 9999,
                  color: MUTED,
                  fontSize: 22,
                  fontWeight: 600,
                }}
              >
                👥 Friends
              </div>
            </div>

            {/* Leaderboard rows */}
            <div
              style={{
                width: "92%",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {leaderboard.map((entry) => (
                <div
                  key={entry.rank}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "16px 18px",
                    borderRadius: 16,
                    border: ("isYou" in entry && entry.isYou)
                      ? `3px solid ${CORAL}`
                      : "1px solid #E8E3D9",
                    background: ("isYou" in entry && entry.isYou)
                      ? "rgba(255,107,74,0.06)"
                      : "#fff",
                  }}
                >
                  {/* Rank circle */}
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: entry.color || "#F5F0E8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: entry.medal ? 24 : 20,
                      fontWeight: 700,
                      color: entry.color ? "#1A1A2E" : MUTED,
                      flexShrink: 0,
                    }}
                  >
                    {entry.medal || entry.rank}
                  </div>
                  {/* Description + user */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: ("isYou" in entry && entry.isYou) ? 700 : 500,
                        color: INK,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {entry.desc}
                    </div>
                    <div style={{ fontSize: 16, color: MUTED }}>
                      {entry.user}
                      {("isYou" in entry && entry.isYou) && (
                        <span style={{ color: CORAL, fontWeight: 700 }}>
                          {" "}— that&apos;s you!
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Votes */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-dm-mono), monospace",
                        fontSize: 26,
                        fontWeight: 700,
                        color: INK,
                      }}
                    >
                      {entry.votes}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: "0.1em",
                        color: MUTED,
                      }}
                    >
                      VOTES
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Rank callout */}
            <div
              style={{
                marginTop: 20,
                fontFamily: "var(--font-dm-mono), monospace",
                fontSize: 22,
                color: CORAL,
                fontWeight: 600,
              }}
            >
              #7 of 3,847 players
            </div>
          </div>
        </Phone>
      </PhoneContainer>
    </SlideWrapper>
  );
}

/* ═══════════════════════════════════════════
   SLIDE 4: Share — "Share your creativity."
   ═══════════════════════════════════════════ */
function Slide4() {
  return (
    <SlideWrapper>
      <PhoneGlow />

      <div style={{ position: "absolute", top: 100, left: 0, right: 0 }}>
        <Caption
          label="SHARE CARD"
          headline={
            <>
              Share your
              <br />
              creativity.
            </>
          }
        />
      </div>

      {/* Share card INSIDE a phone */}
      <PhoneContainer topStart="36%">
        <Phone>
          <div
            style={{
              width: "100%",
              height: "100%",
              background: CREAM,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-start",
              paddingTop: "8%",
              fontFamily: "var(--font-dm-sans), sans-serif",
              position: "relative",
            }}
          >
            {/* Dimmed results background */}
            <div
              style={{
                fontFamily: "var(--font-playfair), serif",
                fontSize: 48,
                fontWeight: 700,
                color: INK,
                opacity: 0.2,
                marginBottom: 10,
              }}
            >
              SILENCE
            </div>
            <div
              style={{
                width: 80,
                height: 3,
                borderRadius: 2,
                background: CORAL,
                opacity: 0.2,
                marginBottom: 20,
              }}
            />

            {/* Semi-transparent overlay */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0,0,0,0.5)",
                zIndex: 5,
              }}
            />

            {/* Share card modal */}
            <div
              style={{
                position: "absolute",
                top: "12%",
                left: "6%",
                right: "6%",
                zIndex: 10,
                borderRadius: 32,
                overflow: "hidden",
                background: "linear-gradient(165deg, #1A1A2E 0%, #2D1B69 55%, #0F0E17 100%)",
                boxShadow: "0 20px 80px rgba(0,0,0,0.6)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "48px 36px 40px",
              }}
            >
              {/* oneword logo */}
              <div style={{ display: "flex", gap: 8, marginBottom: 40 }}>
                <span
                  style={{
                    fontFamily: "var(--font-playfair), serif",
                    fontSize: 36,
                    fontWeight: 700,
                    color: "#fff",
                  }}
                >
                  one
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-playfair), serif",
                    fontSize: 36,
                    fontWeight: 700,
                    color: CORAL,
                  }}
                >
                  word
                </span>
              </div>

              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  letterSpacing: "0.2em",
                  color: "rgba(255,255,255,0.4)",
                  marginBottom: 16,
                }}
              >
                TODAY&apos;S WORD
              </div>

              <div
                style={{
                  fontFamily: "var(--font-playfair), serif",
                  fontSize: 72,
                  fontWeight: 700,
                  color: "#fff",
                  marginBottom: 12,
                }}
              >
                SILENCE
              </div>
              <div
                style={{
                  width: 80,
                  height: 4,
                  borderRadius: 2,
                  background: CORAL,
                  marginBottom: 36,
                }}
              />

              {/* Description */}
              <div
                style={{
                  fontSize: 32,
                  fontStyle: "italic",
                  color: "#fff",
                  lineHeight: 1.5,
                  textAlign: "center",
                  marginBottom: 40,
                }}
              >
                &ldquo;the absence of all sound&rdquo;
              </div>

              {/* Stats row */}
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  justifyContent: "center",
                  marginBottom: 36,
                }}
              >
                {[
                  { emoji: "🏆", value: "#7", label: "RANK" },
                  { emoji: "❤️", value: "142", label: "VOTES" },
                  { emoji: "🔥", value: "7", label: "STREAK" },
                ].map((stat, i) => (
                  <div
                    key={stat.label}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.1)" : "none",
                      padding: "0 12px",
                    }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 4 }}>{stat.emoji}</div>
                    <div
                      style={{
                        fontFamily: "var(--font-dm-mono), monospace",
                        fontSize: 28,
                        fontWeight: 700,
                        color: "#fff",
                      }}
                    >
                      {stat.value}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        letterSpacing: "0.15em",
                        color: "rgba(255,255,255,0.4)",
                        marginTop: 4,
                      }}
                    >
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div
                style={{
                  fontSize: 18,
                  color: "rgba(255,255,255,0.3)",
                }}
              >
                playoneword.app
              </div>
            </div>
          </div>
        </Phone>
      </PhoneContainer>
    </SlideWrapper>
  );
}

/* ═══════════════════════════════════════════
   SLIDE 5: Friends — "Play with friends."
   ═══════════════════════════════════════════ */
function Slide5() {
  const friends = [
    { name: "@sara", badge: "💎", desc: "peace wearing invisible costume", rank: 2 },
    { name: "@luna", badge: "🔥", desc: "what guilty people fear most", rank: 5 },
    { name: "@pedro", badge: "✨", desc: "nothing makes a single noise", rank: 12 },
  ];

  return (
    <SlideWrapper>
      <PhoneGlow />

      <div style={{ position: "absolute", top: 100, left: 0, right: 0 }}>
        <Caption
          label="SOCIAL"
          headline={
            <>
              Play with
              <br />
              friends.
            </>
          }
        />
      </div>

      <PhoneContainer topStart="36%">
        <Phone>
          <div
            style={{
              width: "100%",
              height: "100%",
              background: CREAM,
              display: "flex",
              flexDirection: "column",
              paddingTop: "10%",
              fontFamily: "var(--font-dm-sans), sans-serif",
            }}
          >
            {/* Header */}
            <div
              style={{
                textAlign: "center",
                fontFamily: "var(--font-playfair), serif",
                fontSize: 48,
                fontWeight: 700,
                color: INK,
                marginBottom: 28,
              }}
            >
              FRIENDS
            </div>

            {/* Friend request notification */}
            <div
              style={{
                margin: "0 24px 28px",
                padding: "20px 24px",
                borderRadius: 18,
                background: "rgba(255,107,74,0.08)",
                border: `2px solid ${CORAL}`,
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${CORAL}, #FF8066)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                👋
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: INK }}>
                  @maria wants to be your friend
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                  <div
                    style={{
                      padding: "8px 22px",
                      borderRadius: 10,
                      background: CORAL,
                      color: "#fff",
                      fontSize: 16,
                      fontWeight: 700,
                    }}
                  >
                    Accept
                  </div>
                  <div
                    style={{
                      padding: "8px 22px",
                      borderRadius: 10,
                      background: "#E8E3D9",
                      color: MUTED,
                      fontSize: 16,
                      fontWeight: 600,
                    }}
                  >
                    Decline
                  </div>
                </div>
              </div>
            </div>

            {/* Section header */}
            <div
              style={{
                padding: "0 28px",
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: "0.15em",
                color: MUTED,
                marginBottom: 16,
              }}
            >
              TODAY&apos;S DESCRIPTIONS
            </div>

            {/* Friend entries */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                padding: "0 24px",
              }}
            >
              {friends.map((friend) => (
                <div
                  key={friend.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "18px 20px",
                    borderRadius: 16,
                    border: "1px solid #E8E3D9",
                    background: "#fff",
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: "#F5F0E8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      flexShrink: 0,
                    }}
                  >
                    {friend.badge}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: INK }}>
                      {friend.name} {friend.badge}
                    </div>
                    <div
                      style={{
                        fontSize: 18,
                        fontStyle: "italic",
                        color: INK,
                        opacity: 0.7,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      &ldquo;{friend.desc}&rdquo;
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-dm-mono), monospace",
                      fontSize: 22,
                      fontWeight: 700,
                      color: CORAL,
                      flexShrink: 0,
                    }}
                  >
                    #{friend.rank}
                  </div>
                </div>
              ))}
            </div>

            {/* Search bar */}
            <div
              style={{
                margin: "24px 24px 0",
                padding: "16px 24px",
                borderRadius: 14,
                background: "#F5F0E8",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 22, color: MUTED }}>🔍</span>
              <span style={{ fontSize: 20, color: MUTED }}>
                Find friends...
              </span>
            </div>
          </div>
        </Phone>
      </PhoneContainer>
    </SlideWrapper>
  );
}

/* ═══════════════════════════════════════════
   SLIDE 6: Streak — "Build your streak."
   ═══════════════════════════════════════════ */
function Slide6() {
  return (
    <SlideWrapper>
      <PhoneGlow />

      <div style={{ position: "absolute", top: 100, left: 0, right: 0 }}>
        <Caption
          label="DAILY STREAKS"
          headline={
            <>
              Build your
              <br />
              streak.
            </>
          }
        />
      </div>

      {/* Streak celebration INSIDE a phone */}
      <PhoneContainer topStart="36%">
        <Phone>
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "linear-gradient(180deg, #0F0E17 0%, #1A1A2E 60%, #2E1510 100%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              paddingTop: "14%",
              fontFamily: "var(--font-dm-sans), sans-serif",
              position: "relative",
            }}
          >
            {/* Fire glow */}
            <div
              style={{
                position: "absolute",
                top: "5%",
                left: "50%",
                transform: "translateX(-50%)",
                width: 400,
                height: 400,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(255,107,74,0.35) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />

            {/* Fire emoji */}
            <div style={{ fontSize: 130, marginBottom: 16, position: "relative", zIndex: 1 }}>
              🔥
            </div>

            {/* Streak number */}
            <div
              style={{
                fontFamily: "var(--font-dm-mono), monospace",
                fontSize: 120,
                fontWeight: 700,
                color: "#fff",
                lineHeight: 1,
                position: "relative",
                zIndex: 1,
              }}
            >
              7
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: "0.25em",
                color: "rgba(255,255,255,0.5)",
                marginBottom: 28,
                position: "relative",
                zIndex: 1,
              }}
            >
              DAY STREAK
            </div>

            {/* Badge name */}
            <div
              style={{
                fontFamily: "var(--font-playfair), serif",
                fontSize: 56,
                fontWeight: 700,
                color: CORAL,
                marginBottom: 8,
                position: "relative",
                zIndex: 1,
              }}
            >
              On Fire
            </div>
            <div
              style={{
                fontSize: 24,
                fontStyle: "italic",
                color: "rgba(255,255,255,0.5)",
                marginBottom: 40,
                position: "relative",
                zIndex: 1,
              }}
            >
              A whole week. Unstoppable.
            </div>

            {/* Stats row */}
            <div
              style={{
                display: "flex",
                width: "85%",
                justifyContent: "center",
                marginBottom: 36,
                position: "relative",
                zIndex: 1,
              }}
            >
              {[
                { value: "7", label: "PLAYED" },
                { value: "#2", label: "BEST RANK" },
                { value: "456", label: "VOTES" },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.1)" : "none",
                    padding: "0 12px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-dm-mono), monospace",
                      fontSize: 32,
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    {stat.value}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      letterSpacing: "0.12em",
                      color: "rgba(255,255,255,0.4)",
                      marginTop: 4,
                    }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Next milestone */}
            <div
              style={{
                width: "80%",
                padding: "24px 28px",
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.05)",
                position: "relative",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: "0.2em",
                  color: "rgba(255,255,255,0.35)",
                  marginBottom: 12,
                }}
              >
                NEXT MILESTONE
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <span style={{ fontSize: 26 }}>⚡</span>
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 600,
                    color: "#fff",
                  }}
                >
                  Unstoppable — 7 more days
                </span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: 8,
                  borderRadius: 4,
                  background: "rgba(255,255,255,0.1)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: "50%",
                    height: "100%",
                    borderRadius: 4,
                    background: `linear-gradient(90deg, ${CORAL}, #FF8066)`,
                  }}
                />
              </div>
            </div>
          </div>
        </Phone>
      </PhoneContainer>
    </SlideWrapper>
  );
}

/* ═══════════════════════════════════════════
   SCREENSHOT REGISTRY & EXPORT PAGE
   ═══════════════════════════════════════════ */

interface SlideEntry {
  id: string;
  label: string;
  component: React.FC;
}

const IPHONE_SCREENSHOTS: SlideEntry[] = [
  { id: "hero", label: "1. Hero — One word. Say it in five.", component: Slide1 },
  { id: "voting", label: "2. Voting — The whole world votes.", component: Slide2 },
  { id: "leaderboard", label: "3. Leaderboard — See where you ranked.", component: Slide3 },
  { id: "share", label: "4. Share — Share your creativity.", component: Slide4 },
  { id: "friends", label: "5. Friends — Play with friends.", component: Slide5 },
  { id: "streak", label: "6. Streak — Build your streak.", component: Slide6 },
];

/* ─── Preview with ResizeObserver scaling ─── */
function ScreenshotPreview({
  slide,
  onExport,
}: {
  slide: SlideEntry;
  onExport: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cw = entry.contentRect.width;
        setScale(cw / IPHONE_W);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const Comp = slide.component;

  return (
    <div
      style={{
        borderRadius: 16,
        overflow: "hidden",
        background: "#000",
        cursor: "pointer",
        border: "1px solid #333",
      }}
      onClick={() => onExport(slide.id)}
    >
      <div
        ref={containerRef}
        style={{
          width: "100%",
          aspectRatio: `${IPHONE_W}/${IPHONE_H}`,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: IPHONE_W,
            height: IPHONE_H,
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          <Comp />
        </div>
      </div>
      <div
        style={{
          padding: "12px 16px",
          background: "#111",
          color: "#ccc",
          fontSize: 13,
          fontFamily: "var(--font-dm-sans), sans-serif",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{slide.label}</span>
        <span style={{ color: "#666", fontSize: 11 }}>Click to export</span>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function ScreenshotsPage() {
  const offscreenRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportAll, setExportAll] = useState(false);
  const [size, setSize] = useState(IPHONE_SIZES[0]);

  const doExport = useCallback(
    async (id: string, index: number, targetW: number, targetH: number) => {
      const el = offscreenRefs.current[id];
      if (!el) return;

      el.style.left = "0px";
      el.style.opacity = "1";
      el.style.zIndex = "-1";

      const opts = {
        width: IPHONE_W,
        height: IPHONE_H,
        pixelRatio: 1,
        cacheBust: true,
      };

      try {
        await toPng(el, opts);
        const dataUrl = await toPng(el, opts);

        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d")!;
        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve) => (img.onload = resolve));
        ctx.drawImage(img, 0, 0, targetW, targetH);

        const finalUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = `${String(index + 1).padStart(2, "0")}-${id}-${targetW}x${targetH}.png`;
        link.href = finalUrl;
        link.click();
      } finally {
        el.style.left = "-9999px";
        el.style.opacity = "";
        el.style.zIndex = "";
      }
    },
    []
  );

  const handleExportOne = useCallback(
    async (id: string) => {
      setExporting(id);
      const index = IPHONE_SCREENSHOTS.findIndex((s) => s.id === id);
      await doExport(id, index, size.w, size.h);
      setExporting(null);
    },
    [doExport, size]
  );

  const handleExportAll = useCallback(async () => {
    setExportAll(true);
    for (let i = 0; i < IPHONE_SCREENSHOTS.length; i++) {
      const slide = IPHONE_SCREENSHOTS[i];
      setExporting(slide.id);
      await doExport(slide.id, i, size.w, size.h);
      await new Promise((r) => setTimeout(r, 300));
    }
    setExporting(null);
    setExportAll(false);
  }, [doExport, size]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0A0A0A",
        color: "#fff",
        fontFamily: "var(--font-dm-sans), sans-serif",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(10,10,10,0.9)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #222",
          padding: "16px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span
            style={{
              fontFamily: "var(--font-playfair), serif",
              fontSize: 24,
              fontWeight: 700,
              color: CREAM,
            }}
          >
            one
          </span>
          <span
            style={{
              fontFamily: "var(--font-playfair), serif",
              fontSize: 24,
              fontWeight: 700,
              color: CORAL,
            }}
          >
            word
          </span>
          <span style={{ color: "#666", fontSize: 14, marginLeft: 8 }}>
            App Store Screenshots
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <select
            value={size.label}
            onChange={(e) => {
              const s = IPHONE_SIZES.find((s) => s.label === e.target.value);
              if (s) setSize(s);
            }}
            style={{
              background: "#1a1a1a",
              color: "#ccc",
              border: "1px solid #333",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            {IPHONE_SIZES.map((s) => (
              <option key={s.label} value={s.label}>
                iPhone {s.label} — {s.w}×{s.h}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportAll}
            disabled={exportAll}
            style={{
              background: CORAL,
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 700,
              cursor: exportAll ? "wait" : "pointer",
              opacity: exportAll ? 0.6 : 1,
              letterSpacing: "0.05em",
            }}
          >
            {exportAll ? "Exporting..." : "Export All"}
          </button>
        </div>
      </div>

      {/* Preview Grid */}
      <div
        style={{
          padding: "32px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 24,
          maxWidth: 1800,
          margin: "0 auto",
        }}
      >
        {IPHONE_SCREENSHOTS.map((slide) => (
          <ScreenshotPreview
            key={slide.id}
            slide={slide}
            onExport={handleExportOne}
          />
        ))}
      </div>

      {/* Status bar */}
      {exporting && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: 12,
            padding: "12px 24px",
            fontSize: 14,
            color: CORAL,
            fontWeight: 600,
            zIndex: 100,
          }}
        >
          Exporting: {exporting}...
        </div>
      )}

      {/* Offscreen containers for export */}
      {IPHONE_SCREENSHOTS.map((slide) => {
        const Comp = slide.component;
        return (
          <div
            key={`offscreen-${slide.id}`}
            ref={(el) => {
              offscreenRefs.current[slide.id] = el;
            }}
            style={{
              position: "absolute",
              left: "-9999px",
              top: 0,
              width: IPHONE_W,
              height: IPHONE_H,
              fontFamily: "var(--font-dm-sans), sans-serif",
            }}
          >
            <Comp />
          </div>
        );
      })}
    </div>
  );
}
