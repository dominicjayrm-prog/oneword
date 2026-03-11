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
const DARK_BG = "#141218";
const DARK_SURFACE = "#1E1C24";
const MUTED = "#8B8697";

/* ─── Phone Mockup ─── */
const MK_W = 1022;
const MK_H = 2082;
const SC_L = (52 / MK_W) * 100;
const SC_T = (46 / MK_H) * 100;
const SC_W = (918 / MK_W) * 100;
const SC_H = (1990 / MK_H) * 100;
const SC_RX = (126 / 918) * 100;
const SC_RY = (126 / 1990) * 100;

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

/* ─── Caption ─── */
function Caption({
  label,
  headline,
  canvasW = IPHONE_W,
  light = true,
}: {
  label: string;
  headline: React.ReactNode;
  canvasW?: number;
  light?: boolean;
}) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontFamily: "var(--font-dm-sans), sans-serif",
          fontSize: canvasW * 0.028,
          fontWeight: 600,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: CORAL,
          marginBottom: canvasW * 0.015,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-playfair), serif",
          fontSize: canvasW * 0.09,
          fontWeight: 700,
          lineHeight: 1.0,
          color: light ? CREAM : INK,
        }}
      >
        {headline}
      </div>
    </div>
  );
}

/* ─── Decorative Blob ─── */
function Blob({
  color,
  size,
  top,
  left,
  blur = 120,
  opacity = 0.35,
}: {
  color: string;
  size: number;
  top: string;
  left: string;
  blur?: number;
  opacity?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        filter: `blur(${blur}px)`,
        opacity,
        pointerEvents: "none",
      }}
    />
  );
}

/* ═══════════════════════════════════════════
   SLIDE 1: Hero — "One word. Say it in five."
   ═══════════════════════════════════════════ */
function Slide1() {
  return (
    <div
      style={{
        width: IPHONE_W,
        height: IPHONE_H,
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(165deg, ${DARK_BG} 0%, #1A1028 40%, #2E1510 100%)`,
      }}
    >
      <Blob color={CORAL} size={600} top="-10%" left="-15%" blur={180} opacity={0.15} />
      <Blob color="#4A5BFF" size={400} top="60%" left="70%" blur={160} opacity={0.1} />

      {/* Top: App icon + name */}
      <div
        style={{
          position: "absolute",
          top: 120,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
        }}
      >
        <img
          src="/app-icon.png"
          alt="OneWord"
          style={{ width: 140, height: 140, borderRadius: 32 }}
        />
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span
            style={{
              fontFamily: "var(--font-playfair), serif",
              fontSize: 52,
              fontWeight: 700,
              color: CREAM,
            }}
          >
            one
          </span>
          <span
            style={{
              fontFamily: "var(--font-playfair), serif",
              fontSize: 52,
              fontWeight: 700,
              color: CORAL,
            }}
          >
            word
          </span>
        </div>
      </div>

      {/* Caption */}
      <div style={{ position: "absolute", top: 440, left: 0, right: 0 }}>
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

      {/* Phone */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%) translateY(12%)",
          width: "84%",
        }}
      >
        <Phone>
          {/* Simulated Today screen */}
          <div
            style={{
              width: "100%",
              height: "100%",
              background: CREAM,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              paddingTop: "18%",
              fontFamily: "var(--font-dm-sans), sans-serif",
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: "0.2em",
                color: MUTED,
                marginBottom: 16,
              }}
            >
              TODAY&apos;S WORD
            </div>
            <div
              style={{
                fontFamily: "var(--font-playfair), serif",
                fontSize: 56,
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
                marginBottom: 10,
              }}
            />
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.25em",
                color: CORAL,
              }}
            >
              NOUN
            </div>

            {/* Input pills */}
            <div
              style={{
                marginTop: 48,
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: "0.1em",
                color: MUTED,
              }}
            >
              DESCRIBE IT IN 5 WORDS
            </div>
            <div
              style={{
                marginTop: 24,
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 8,
                padding: "0 24px",
              }}
            >
              {["the", "absence", "of", "all", "sound"].map((word) => (
                <div
                  key={word}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 20,
                    border: `2px solid ${CORAL}`,
                    background: "rgba(255,107,74,0.08)",
                    fontFamily: "var(--font-dm-sans), sans-serif",
                    fontSize: 18,
                    fontWeight: 700,
                    color: INK,
                  }}
                >
                  {word}
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 20,
                fontFamily: "var(--font-dm-mono), monospace",
                fontSize: 16,
                fontWeight: 500,
                color: "#2ECC71",
              }}
            >
              5/5
            </div>

            {/* Submit button */}
            <div
              style={{
                marginTop: 24,
                width: "75%",
                padding: "16px 0",
                borderRadius: 12,
                background: CORAL,
                textAlign: "center",
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: "#fff",
              }}
            >
              SUBMIT
            </div>
          </div>
        </Phone>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SLIDE 2: "The whole world votes."
   ═══════════════════════════════════════════ */
function Slide2() {
  return (
    <div
      style={{
        width: IPHONE_W,
        height: IPHONE_H,
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(180deg, #0D0B14 0%, #1A1028 50%, ${DARK_BG} 100%)`,
      }}
    >
      <Blob color="#4A5BFF" size={500} top="-5%" left="60%" blur={200} opacity={0.12} />
      <Blob color={CORAL} size={450} top="65%" left="-10%" blur={160} opacity={0.1} />

      {/* Caption at top */}
      <div style={{ position: "absolute", top: 160, left: 0, right: 0 }}>
        <Caption
          label="COMMUNITY VOTING"
          headline={
            <>
              The whole
              <br />
              world votes.
            </>
          }
        />
      </div>

      {/* Phone offset right */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          right: "-4%",
          width: "82%",
          transform: "translateY(10%)",
        }}
      >
        <Phone>
          {/* Simulated Vote screen */}
          <div
            style={{
              width: "100%",
              height: "100%",
              background: CREAM,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              paddingTop: "14%",
              fontFamily: "var(--font-dm-sans), sans-serif",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-playfair), serif",
                fontSize: 44,
                fontWeight: 700,
                color: INK,
                marginBottom: 6,
              }}
            >
              SILENCE
            </div>
            <div
              style={{
                width: 100,
                height: 3,
                borderRadius: 2,
                background: CORAL,
                marginBottom: 20,
              }}
            />
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 6 }}>
              Voted on: 12/50
            </div>
            <div
              style={{
                fontSize: 13,
                color: MUTED,
                marginBottom: 32,
                letterSpacing: "0.05em",
              }}
            >
              TAP TO PREFER ONE
            </div>

            {/* Vote Card 1 - Selected */}
            <div
              style={{
                width: "82%",
                minHeight: 110,
                padding: "20px 16px",
                borderRadius: 16,
                border: `2px solid ${CORAL}`,
                background: "rgba(255,107,74,0.06)",
                textAlign: "center",
                position: "relative",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  fontSize: 20,
                  fontWeight: 500,
                  lineHeight: 1.5,
                  color: INK,
                  fontStyle: "italic",
                }}
              >
                &ldquo;the absence of all sound&rdquo;
              </div>
              <div
                style={{ fontSize: 12, color: MUTED, marginTop: 8 }}
              >
                @wordsmith_42
              </div>
              {/* YOUR PICK badge */}
              <div
                style={{
                  position: "absolute",
                  top: -12,
                  right: 16,
                  background: CORAL,
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "4px 12px",
                  borderRadius: 10,
                  letterSpacing: "0.05em",
                }}
              >
                ✓ YOUR PICK
              </div>
            </div>

            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: MUTED,
                margin: "12px 0",
              }}
            >
              VS
            </div>

            {/* Vote Card 2 */}
            <div
              style={{
                width: "82%",
                minHeight: 110,
                padding: "20px 16px",
                borderRadius: 16,
                border: `1px solid #E8E3D9`,
                background: "#F5F0E8",
                textAlign: "center",
                opacity: 0.7,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  fontSize: 20,
                  fontWeight: 500,
                  lineHeight: 1.5,
                  color: INK,
                  fontStyle: "italic",
                }}
              >
                &ldquo;nothing makes a single noise&rdquo;
              </div>
              <div
                style={{ fontSize: 12, color: MUTED, marginTop: 8 }}
              >
                @quietone
              </div>
            </div>
          </div>
        </Phone>
      </div>

      {/* Faded back phone */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "-8%",
          width: "65%",
          transform: "translateY(18%) rotate(-4deg)",
          opacity: 0.45,
          filter: "blur(2px)",
        }}
      >
        <Phone>
          <div
            style={{
              width: "100%",
              height: "100%",
              background: CREAM,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              paddingTop: "20%",
              fontFamily: "var(--font-dm-sans), sans-serif",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-playfair), serif",
                fontSize: 36,
                fontWeight: 700,
                color: INK,
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
                margin: "10px 0 30px",
              }}
            />
            <div
              style={{
                width: "80%",
                padding: 16,
                borderRadius: 14,
                border: `1px solid #E8E3D9`,
                background: "#F5F0E8",
                textAlign: "center",
                fontSize: 17,
                fontStyle: "italic",
                color: INK,
                marginBottom: 20,
              }}
            >
              &ldquo;peace when words stop talking&rdquo;
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: MUTED }}>
              VS
            </div>
            <div
              style={{
                width: "80%",
                padding: 16,
                borderRadius: 14,
                border: `1px solid #E8E3D9`,
                background: "#F5F0E8",
                textAlign: "center",
                fontSize: 17,
                fontStyle: "italic",
                color: INK,
                marginTop: 20,
              }}
            >
              &ldquo;a room without any noise&rdquo;
            </div>
          </div>
        </Phone>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SLIDE 3: "See where you ranked."
   ═══════════════════════════════════════════ */
function Slide3() {
  const leaderboard = [
    { rank: 1, desc: "a void filled with calm", user: "@luna_writes", votes: 312, medal: "🥇", color: GOLD },
    { rank: 2, desc: "what remains after screaming", user: "@poeticjay", votes: 287, medal: "🥈", color: "#C0C0C0" },
    { rank: 3, desc: "golden quiet before sunrise", user: "@morningbird", votes: 245, medal: "🥉", color: "#CD7F32" },
    { rank: 4, desc: "empty rooms speak so loud", user: "@thinkerx", votes: 201, medal: "", color: "" },
    { rank: 5, desc: "no noise anywhere at all", user: "@simple_sam", votes: 189, medal: "", color: "" },
    { rank: 6, desc: "when the music stops playing", user: "@dj_thoughts", votes: 164, medal: "", color: "" },
    { rank: 7, desc: "the absence of all sound", user: "@you", votes: 142, medal: "", color: "", isYou: true },
  ];

  return (
    <div
      style={{
        width: IPHONE_W,
        height: IPHONE_H,
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(170deg, ${DARK_BG} 0%, #10182E 50%, #1A1028 100%)`,
      }}
    >
      <Blob color={GOLD} size={500} top="5%" left="65%" blur={200} opacity={0.08} />
      <Blob color={CORAL} size={400} top="70%" left="-10%" blur={180} opacity={0.1} />

      {/* Caption */}
      <div style={{ position: "absolute", top: 140, left: 0, right: 0 }}>
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

      {/* Centered phone */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%) translateY(8%)",
          width: "86%",
        }}
      >
        <Phone>
          <div
            style={{
              width: "100%",
              height: "100%",
              background: CREAM,
              fontFamily: "var(--font-dm-sans), sans-serif",
              paddingTop: "10%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-playfair), serif",
                fontSize: 38,
                fontWeight: 700,
                color: INK,
                marginBottom: 4,
              }}
            >
              SILENCE
            </div>
            <div
              style={{
                width: 90,
                height: 3,
                borderRadius: 2,
                background: CORAL,
                marginBottom: 16,
              }}
            />

            {/* Segmented control */}
            <div
              style={{
                display: "flex",
                borderRadius: 9999,
                border: "1px solid #E8E3D9",
                background: "#F5F0E8",
                padding: 3,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  padding: "8px 22px",
                  borderRadius: 9999,
                  background: CORAL,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                🌍 Global
              </div>
              <div
                style={{
                  padding: "8px 22px",
                  borderRadius: 9999,
                  color: MUTED,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                👥 Friends
              </div>
            </div>

            {/* Leaderboard rows */}
            <div
              style={{
                width: "90%",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {leaderboard.map((entry) => (
                <div
                  key={entry.rank}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: entry.isYou
                      ? `2px solid ${CORAL}`
                      : `1px solid #E8E3D9`,
                    background: entry.isYou
                      ? "rgba(255,107,74,0.06)"
                      : "#fff",
                  }}
                >
                  {/* Rank */}
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: entry.color || "#F5F0E8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: entry.medal ? 18 : 14,
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
                        fontSize: 14,
                        fontWeight: entry.isYou ? 700 : 500,
                        color: INK,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {entry.desc}
                    </div>
                    <div style={{ fontSize: 11, color: MUTED }}>
                      {entry.user}
                      {entry.isYou && (
                        <span style={{ color: CORAL, fontWeight: 700 }}>
                          {" "}
                          — that&apos;s you!
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Votes */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-dm-mono), monospace",
                        fontSize: 18,
                        fontWeight: 700,
                        color: INK,
                      }}
                    >
                      {entry.votes}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
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
                marginTop: 16,
                fontFamily: "var(--font-dm-mono), monospace",
                fontSize: 14,
                color: CORAL,
                fontWeight: 600,
              }}
            >
              #7 of 3,847 players
            </div>
          </div>
        </Phone>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SLIDE 4: "Share your creativity."
   ═══════════════════════════════════════════ */
function Slide4() {
  return (
    <div
      style={{
        width: IPHONE_W,
        height: IPHONE_H,
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(150deg, #2D1B69 0%, ${DARK_BG} 50%, #1A0E2E 100%)`,
      }}
    >
      <Blob color="#6B4AFF" size={600} top="-10%" left="50%" blur={200} opacity={0.15} />
      <Blob color={CORAL} size={400} top="75%" left="-5%" blur={160} opacity={0.12} />

      {/* Caption at top */}
      <div style={{ position: "absolute", top: 160, left: 0, right: 0 }}>
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

      {/* Share card (centered, large) */}
      <div
        style={{
          position: "absolute",
          top: "33%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 900,
          height: 1125,
          borderRadius: 48,
          overflow: "hidden",
          background: `linear-gradient(165deg, #1A1A2E 0%, #2D1B69 55%, ${DARK_BG} 100%)`,
          boxShadow: "0 40px 120px rgba(0,0,0,0.6), 0 0 60px rgba(255,107,74,0.1)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "60px 50px 50px",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", gap: 8, marginBottom: 50 }}>
          <span
            style={{
              fontFamily: "var(--font-playfair), serif",
              fontSize: 32,
              fontWeight: 700,
              color: "#fff",
            }}
          >
            one
          </span>
          <span
            style={{
              fontFamily: "var(--font-playfair), serif",
              fontSize: 32,
              fontWeight: 700,
              color: CORAL,
            }}
          >
            word
          </span>
        </div>

        {/* Today's word label */}
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "0.2em",
            color: "rgba(255,255,255,0.4)",
            marginBottom: 16,
          }}
        >
          TODAY&apos;S WORD
        </div>

        {/* Hero word */}
        <div
          style={{
            fontFamily: "var(--font-playfair), serif",
            fontSize: 72,
            fontWeight: 700,
            color: "#fff",
            marginBottom: 10,
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
            marginBottom: 50,
          }}
        />

        {/* Description box */}
        <div
          style={{
            width: "85%",
            padding: "36px 32px",
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            textAlign: "center",
            marginBottom: 50,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-dm-sans), sans-serif",
              fontSize: 28,
              fontStyle: "italic",
              color: "#fff",
              lineHeight: 1.5,
            }}
          >
            &ldquo;the absence of all sound&rdquo;
          </div>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: 0,
            width: "80%",
            justifyContent: "center",
          }}
        >
          {[
            { emoji: "🥇", value: "#7", label: "RANK" },
            { emoji: "🗳️", value: "142", label: "VOTES" },
            { emoji: "🔥", value: "7", label: "STREAK" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              style={{
                flex: 1,
                textAlign: "center",
                borderLeft:
                  i > 0 ? "1px solid rgba(255,255,255,0.1)" : "none",
                padding: "0 16px",
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
                  fontSize: 11,
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
            marginTop: "auto",
            fontSize: 16,
            color: "rgba(255,255,255,0.3)",
          }}
        >
          Play daily on OneWord
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SLIDE 5: "Build your streak."
   ═══════════════════════════════════════════ */
function Slide5() {
  return (
    <div
      style={{
        width: IPHONE_W,
        height: IPHONE_H,
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(175deg, ${DARK_BG} 0%, #2E1510 50%, #1A0A0A 100%)`,
      }}
    >
      <Blob color={CORAL} size={700} top="20%" left="50%" blur={250} opacity={0.18} />
      <Blob color={GOLD} size={350} top="55%" left="-5%" blur={180} opacity={0.1} />

      {/* Caption at top */}
      <div style={{ position: "absolute", top: 160, left: 0, right: 0 }}>
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

      {/* Streak celebration card (centered) */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 1000,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Fire glow */}
        <div
          style={{
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(255,107,74,0.35) 0%, transparent 70%)`,
            position: "absolute",
            top: -40,
            left: "50%",
            transform: "translateX(-50%)",
            pointerEvents: "none",
          }}
        />

        {/* Emoji */}
        <div style={{ fontSize: 120, marginBottom: 24, position: "relative" }}>
          🔥
        </div>

        {/* Streak number */}
        <div
          style={{
            fontFamily: "var(--font-dm-mono), monospace",
            fontSize: 100,
            fontWeight: 700,
            color: "#fff",
            lineHeight: 1,
          }}
        >
          7
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: "0.25em",
            color: "rgba(255,255,255,0.5)",
            marginBottom: 24,
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
          }}
        >
          On Fire
        </div>
        <div
          style={{
            fontFamily: "var(--font-dm-sans), sans-serif",
            fontSize: 22,
            fontStyle: "italic",
            color: "rgba(255,255,255,0.5)",
            marginBottom: 48,
          }}
        >
          A whole week. Unstoppable.
        </div>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            gap: 0,
            width: "80%",
            justifyContent: "center",
          }}
        >
          {[
            { emoji: "🔥", value: "7", label: "PLAYED" },
            { emoji: "🏆", value: "#2", label: "BEST RANK" },
            { emoji: "📬", value: "456", label: "VOTES" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              style={{
                flex: 1,
                textAlign: "center",
                borderLeft:
                  i > 0 ? "1px solid rgba(255,255,255,0.1)" : "none",
                padding: "0 20px",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 6 }}>{stat.emoji}</div>
              <div
                style={{
                  fontFamily: "var(--font-dm-mono), monospace",
                  fontSize: 30,
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: 12,
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
            marginTop: 48,
            width: "75%",
            padding: "28px 32px",
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.05)",
          }}
        >
          <div
            style={{
              fontSize: 11,
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
            <span style={{ fontSize: 24 }}>⚡</span>
            <span
              style={{
                fontFamily: "var(--font-dm-sans), sans-serif",
                fontSize: 20,
                fontWeight: 600,
                color: "#fff",
              }}
            >
              Unstoppable — 7 more days
            </span>
          </div>
          {/* Progress bar */}
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
    </div>
  );
}

/* ═══════════════════════════════════════════
   SLIDE 6: "Play in English and Spanish."
   ═══════════════════════════════════════════ */
function Slide6() {
  return (
    <div
      style={{
        width: IPHONE_W,
        height: IPHONE_H,
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(160deg, ${DARK_BG} 0%, #1A1028 40%, #0D1A2E 100%)`,
      }}
    >
      <Blob color="#4A5BFF" size={500} top="10%" left="-15%" blur={200} opacity={0.12} />
      <Blob color={CORAL} size={450} top="50%" left="80%" blur={180} opacity={0.1} />

      {/* Caption at top */}
      <div style={{ position: "absolute", top: 140, left: 0, right: 0 }}>
        <Caption
          label="MULTILINGUAL"
          headline={
            <>
              Play in English
              <br />
              and Spanish.
            </>
          }
        />
      </div>

      {/* Language pills */}
      <div
        style={{
          position: "absolute",
          top: 450,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 20,
        }}
      >
        <div
          style={{
            padding: "12px 32px",
            borderRadius: 9999,
            border: `2px solid ${CORAL}`,
            background: CORAL,
            color: "#fff",
            fontSize: 22,
            fontWeight: 700,
            fontFamily: "var(--font-dm-sans), sans-serif",
          }}
        >
          English
        </div>
        <div
          style={{
            padding: "12px 32px",
            borderRadius: 9999,
            border: `2px solid ${CORAL}`,
            background: "transparent",
            color: CORAL,
            fontSize: 22,
            fontWeight: 700,
            fontFamily: "var(--font-dm-sans), sans-serif",
          }}
        >
          Español
        </div>
      </div>

      {/* Two phones side by side */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          display: "flex",
          justifyContent: "center",
          gap: "-2%",
        }}
      >
        {/* English phone */}
        <div
          style={{
            width: "52%",
            transform: "translateY(14%) rotate(-3deg)",
          }}
        >
          <Phone>
            <div
              style={{
                width: "100%",
                height: "100%",
                background: CREAM,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                paddingTop: "18%",
                fontFamily: "var(--font-dm-sans), sans-serif",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.2em",
                  color: MUTED,
                  marginBottom: 14,
                }}
              >
                TODAY&apos;S WORD
              </div>
              <div
                style={{
                  fontFamily: "var(--font-playfair), serif",
                  fontSize: 46,
                  fontWeight: 700,
                  color: INK,
                  marginBottom: 6,
                }}
              >
                SILENCE
              </div>
              <div
                style={{
                  width: 100,
                  height: 3,
                  borderRadius: 2,
                  background: CORAL,
                  marginBottom: 8,
                }}
              />
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.2em",
                  color: CORAL,
                  marginBottom: 30,
                }}
              >
                NOUN
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  color: MUTED,
                  marginBottom: 16,
                }}
              >
                DESCRIBE IT IN 5 WORDS
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: 6,
                  padding: "0 16px",
                }}
              >
                {["the", "absence", "of", "all", "sound"].map((w) => (
                  <div
                    key={w}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 16,
                      border: `2px solid ${CORAL}`,
                      background: "rgba(255,107,74,0.08)",
                      fontSize: 15,
                      fontWeight: 700,
                      color: INK,
                    }}
                  >
                    {w}
                  </div>
                ))}
              </div>
            </div>
          </Phone>
        </div>

        {/* Spanish phone */}
        <div
          style={{
            width: "52%",
            transform: "translateY(14%) rotate(3deg)",
            marginLeft: "-4%",
          }}
        >
          <Phone>
            <div
              style={{
                width: "100%",
                height: "100%",
                background: CREAM,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                paddingTop: "18%",
                fontFamily: "var(--font-dm-sans), sans-serif",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.2em",
                  color: MUTED,
                  marginBottom: 14,
                }}
              >
                PALABRA DEL DÍA
              </div>
              <div
                style={{
                  fontFamily: "var(--font-playfair), serif",
                  fontSize: 46,
                  fontWeight: 700,
                  color: INK,
                  marginBottom: 6,
                }}
              >
                SILENCIO
              </div>
              <div
                style={{
                  width: 100,
                  height: 3,
                  borderRadius: 2,
                  background: CORAL,
                  marginBottom: 8,
                }}
              />
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.2em",
                  color: CORAL,
                  marginBottom: 30,
                }}
              >
                SUSTANTIVO
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  color: MUTED,
                  marginBottom: 16,
                }}
              >
                DESCRÍBELO EN 5 PALABRAS
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: 6,
                  padding: "0 16px",
                }}
              >
                {["la", "ausencia", "de", "todo", "ruido"].map((w) => (
                  <div
                    key={w}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 16,
                      border: `2px solid ${CORAL}`,
                      background: "rgba(255,107,74,0.08)",
                      fontSize: 15,
                      fontWeight: 700,
                      color: INK,
                    }}
                  >
                    {w}
                  </div>
                ))}
              </div>
            </div>
          </Phone>
        </div>
      </div>
    </div>
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
  { id: "hero", label: "1. Hero — Say it in five", component: Slide1 },
  { id: "voting", label: "2. Voting — The world votes", component: Slide2 },
  { id: "leaderboard", label: "3. Leaderboard — See your rank", component: Slide3 },
  { id: "share", label: "4. Share — Share your creativity", component: Slide4 },
  { id: "streak", label: "5. Streak — Build your streak", component: Slide5 },
  { id: "languages", label: "6. Languages — English & Spanish", component: Slide6 },
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

      // Move on-screen for capture
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
        // Double-call trick
        await toPng(el, opts);
        const dataUrl = await toPng(el, opts);

        // Scale if needed
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
          {/* Size dropdown */}
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

          {/* Export all */}
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
