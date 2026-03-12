"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { toPng } from "html-to-image";

// Brand colors
const C = {
  cream: "#FFFDF7",
  text: "#1A1A2E",
  white: "#FFFFFF",
  primary: "#FF6B4A",
  muted: "#8B8697",
  border: "#E8E3D9",
  glow: "rgba(255,107,74,0.35)",
  glowSoft: "rgba(255,107,74,0.12)",
  dark2: "#2D1B69",
};

// Logo sizes
const LOGO_SIZES = [400, 800, 1600];

// Banner sizes
const BANNER_SIZES = [
  { label: "Twitter (1500×500)", w: 1500, h: 500 },
  { label: "YouTube (2560×1440)", w: 2560, h: 1440 },
  { label: "LinkedIn (1584×396)", w: 1584, h: 396 },
  { label: "Wide (1920×640)", w: 1920, h: 640 },
];

// Logo base render width for previews
const LOGO_BASE_W = 400;

// Banner base render width for previews
const BANNER_BASE_W = 600;

interface LogoVariant {
  id: string;
  name: string;
  oneColor: string;
  wordColor: string;
  bg: string | null; // null = transparent
  tagline?: boolean;
  taglineColor?: string;
  taglineOpacity?: number;
  filenameBase: string;
}

const LOGO_VARIANTS: LogoVariant[] = [
  {
    id: "dark-transparent",
    name: "Dark on Transparent",
    oneColor: C.text,
    wordColor: C.primary,
    bg: null,
    filenameBase: "oneword-logo-dark-transparent",
  },
  {
    id: "white-transparent",
    name: "White on Transparent",
    oneColor: C.white,
    wordColor: C.primary,
    bg: null,
    filenameBase: "oneword-logo-white-transparent",
  },
  {
    id: "cream",
    name: "On Cream",
    oneColor: C.text,
    wordColor: C.primary,
    bg: C.cream,
    filenameBase: "oneword-logo-cream",
  },
  {
    id: "dark-bg",
    name: "On Dark",
    oneColor: C.white,
    wordColor: C.primary,
    bg: C.text,
    filenameBase: "oneword-logo-dark-bg",
  },
  {
    id: "tagline-dark",
    name: "Tagline on Dark",
    oneColor: C.white,
    wordColor: C.primary,
    bg: C.text,
    tagline: true,
    taglineColor: C.primary,
    taglineOpacity: 0.7,
    filenameBase: "oneword-logo-tagline-dark",
  },
  {
    id: "tagline-cream",
    name: "Tagline on Cream",
    oneColor: C.text,
    wordColor: C.primary,
    bg: C.cream,
    tagline: true,
    taglineColor: C.primary,
    taglineOpacity: 0.8,
    filenameBase: "oneword-logo-tagline-cream",
  },
];

interface BannerVariant {
  id: string;
  name: string;
  filenameBase: string;
}

const BANNER_VARIANTS: BannerVariant[] = [
  { id: "cream-clean", name: "Cream Clean", filenameBase: "oneword-banner-cream-clean" },
  { id: "dark-cinematic", name: "Dark Cinematic", filenameBase: "oneword-banner-dark-cinematic" },
  { id: "dark-left", name: "Dark Left Aligned", filenameBase: "oneword-banner-dark-left" },
  { id: "coral-bold", name: "Coral Bold", filenameBase: "oneword-banner-coral-bold" },
];

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Logo component
function LogoRender({
  variant,
  width,
  fontSize,
}: {
  variant: LogoVariant;
  width: number;
  fontSize: number;
}) {
  const scale = width / 800;
  const padY = Math.round(40 * scale);
  const padX = Math.round(60 * scale);
  const tagFontSize = Math.round(16 * scale);
  const gap = Math.round(6 * scale);

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: `${padY}px ${padX}px`,
        backgroundColor: variant.bg ?? "transparent",
      }}
    >
      <div
        style={{
          fontFamily: "'Playfair Display', serif",
          fontWeight: 900,
          fontSize: `${fontSize}px`,
          letterSpacing: "-2px",
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ color: variant.oneColor }}>one</span>
        <span style={{ color: variant.wordColor }}>word</span>
      </div>
      {variant.tagline && (
        <div
          style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: "italic",
            fontSize: `${tagFontSize}px`,
            color: variant.taglineColor,
            opacity: variant.taglineOpacity,
            marginTop: `${gap}px`,
            lineHeight: 1,
          }}
        >
          Say it in five.
        </div>
      )}
    </div>
  );
}

// Banner components
function BannerCreamClean({ width, height }: { width: number; height: number }) {
  const scale = Math.min(width / 1920, height / 640);
  const logoSize = Math.round(72 * scale);
  const subSize = Math.round(11 * scale);
  const lineW = Math.round(24 * scale);

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: C.cream,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle coral glow top-right */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          right: "-10%",
          width: "50%",
          height: "60%",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.glowSoft} 0%, transparent 70%)`,
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1 }}>
        <div
          style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 900,
            fontSize: `${logoSize}px`,
            letterSpacing: "-2px",
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ color: C.text }}>one</span>
          <span style={{ color: C.primary }}>word</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: `${Math.round(8 * scale)}px`,
            marginTop: `${Math.round(12 * scale)}px`,
          }}
        >
          <div style={{ width: `${lineW}px`, height: "1.5px", backgroundColor: C.primary }} />
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: `${subSize}px`,
              color: C.muted,
              letterSpacing: "3px",
              textTransform: "uppercase",
            }}
          >
            say it in five
          </span>
          <div style={{ width: `${lineW}px`, height: "1.5px", backgroundColor: C.primary }} />
        </div>
      </div>
    </div>
  );
}

function BannerDarkCinematic({ width, height }: { width: number; height: number }) {
  const scale = Math.min(width / 1920, height / 640);
  const logoSize = Math.round(72 * scale);
  const subSize = Math.round(14 * scale);

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        background: `linear-gradient(135deg, ${C.text} 0%, ${C.dark2} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Coral glow center */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.glow} 0%, transparent 70%)`,
          filter: "blur(60px)",
          opacity: 0.3,
          pointerEvents: "none",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1 }}>
        <div
          style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 900,
            fontSize: `${logoSize}px`,
            letterSpacing: "-2px",
            lineHeight: 1,
            whiteSpace: "nowrap",
            textShadow: `0 0 30px ${C.glow}`,
          }}
        >
          <span style={{ color: C.white }}>one</span>
          <span style={{ color: C.primary }}>word</span>
        </div>
        <div
          style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: "italic",
            fontSize: `${subSize}px`,
            color: C.primary,
            opacity: 0.7,
            marginTop: `${Math.round(8 * scale)}px`,
          }}
        >
          Say it in five.
        </div>
      </div>
    </div>
  );
}

function BannerDarkLeft({ width, height }: { width: number; height: number }) {
  const scale = Math.min(width / 1920, height / 640);
  const logoSize = Math.round(72 * scale);
  const tagSize = Math.round(16 * scale);
  const subSize = Math.round(10 * scale);
  const pad = Math.round(40 * scale);

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: C.text,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: `0 ${pad}px`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle coral glow bottom-left */}
      <div
        style={{
          position: "absolute",
          bottom: "-30%",
          left: "-10%",
          width: "40%",
          height: "60%",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,107,74,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          fontFamily: "'Playfair Display', serif",
          fontWeight: 900,
          fontSize: `${logoSize}px`,
          letterSpacing: "-2px",
          lineHeight: 1,
          whiteSpace: "nowrap",
          zIndex: 1,
        }}
      >
        <span style={{ color: C.white }}>one</span>
        <span style={{ color: C.primary }}>word</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", zIndex: 1 }}>
        <div
          style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: "italic",
            fontSize: `${tagSize}px`,
            color: "rgba(255,255,255,0.4)",
          }}
        >
          Say it in five.
        </div>
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: `${subSize}px`,
            color: "rgba(255,255,255,0.2)",
            letterSpacing: "2px",
            textTransform: "uppercase",
            marginTop: `${Math.round(4 * scale)}px`,
          }}
        >
          the daily game for creative minds
        </div>
      </div>
    </div>
  );
}

function BannerCoralBold({ width, height }: { width: number; height: number }) {
  const scale = Math.min(width / 1920, height / 640);
  const logoSize = Math.round(72 * scale);
  const subSize = Math.round(12 * scale);

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: C.primary,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Diagonal line texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.3) 20px, rgba(255,255,255,0.3) 21px)",
          opacity: 0.06,
          pointerEvents: "none",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1 }}>
        <div
          style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 900,
            fontSize: `${logoSize}px`,
            letterSpacing: "-2px",
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ color: C.white }}>one</span>
          <span style={{ color: C.text }}>word</span>
        </div>
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: `${subSize}px`,
            color: "rgba(255,255,255,0.7)",
            letterSpacing: "3px",
            textTransform: "uppercase",
            marginTop: `${Math.round(10 * scale)}px`,
          }}
        >
          say it in five
        </div>
      </div>
    </div>
  );
}

function renderBanner(id: string, width: number, height: number) {
  switch (id) {
    case "cream-clean":
      return <BannerCreamClean width={width} height={height} />;
    case "dark-cinematic":
      return <BannerDarkCinematic width={width} height={height} />;
    case "dark-left":
      return <BannerDarkLeft width={width} height={height} />;
    case "coral-bold":
      return <BannerCoralBold width={width} height={height} />;
    default:
      return null;
  }
}

// Download helper
function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function BrandPage() {
  const [fontsReady, setFontsReady] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const logoRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bannerRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Wait for fonts to load
  useEffect(() => {
    const checkFonts = async () => {
      try {
        await document.fonts.ready;
        // Extra wait to be safe
        await delay(1000);
        setFontsReady(true);
      } catch {
        // Fallback: just wait 2 seconds
        await delay(2000);
        setFontsReady(true);
      }
    };
    checkFonts();
  }, []);

  const exportLogo = useCallback(
    async (variantIdx: number, targetWidth: number) => {
      const el = logoRefs.current[variantIdx];
      if (!el) return;
      const variant = LOGO_VARIANTS[variantIdx];
      const filename = `${variant.filenameBase}-${targetWidth}w.png`;

      setExporting(filename);
      try {
        const rect = el.getBoundingClientRect();
        const pixelRatio = targetWidth / rect.width;
        const opts: Parameters<typeof toPng>[1] = {
          pixelRatio,
          cacheBust: true,
        };
        // For transparent variants, don't set backgroundColor
        if (variant.bg) {
          opts.backgroundColor = variant.bg;
        }

        const dataUrl = await toPng(el, opts);
        downloadDataUrl(dataUrl, filename);
      } catch (err) {
        console.error("Export failed:", err);
      } finally {
        setExporting(null);
      }
    },
    []
  );

  const exportBanner = useCallback(
    async (variantIdx: number, sizeIdx: number) => {
      const el = bannerRefs.current[variantIdx];
      if (!el) return;
      const variant = BANNER_VARIANTS[variantIdx];
      const size = BANNER_SIZES[sizeIdx];
      const filename = `${variant.filenameBase}-${size.w}x${size.h}.png`;

      setExporting(filename);
      try {
        // The banner is rendered at the actual target size inside a hidden container
        // We need to use the hidden render refs
        const dataUrl = await toPng(el, {
          width: size.w,
          height: size.h,
          pixelRatio: 1,
          cacheBust: true,
        });
        downloadDataUrl(dataUrl, filename);
      } catch (err) {
        console.error("Export failed:", err);
      } finally {
        setExporting(null);
      }
    },
    []
  );

  // We need per-size banner renders. Use hidden off-screen containers.
  const bannerExportRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const exportBannerAtSize = useCallback(
    async (variantIdx: number, sizeIdx: number) => {
      const size = BANNER_SIZES[sizeIdx];
      const variant = BANNER_VARIANTS[variantIdx];
      const key = `${variant.id}-${size.w}x${size.h}`;
      const el = bannerExportRefs.current.get(key);
      if (!el) return;
      const filename = `${variant.filenameBase}-${size.w}x${size.h}.png`;

      setExporting(filename);
      try {
        const dataUrl = await toPng(el, {
          width: size.w,
          height: size.h,
          pixelRatio: 1,
          cacheBust: true,
        });
        downloadDataUrl(dataUrl, filename);
      } catch (err) {
        console.error("Export failed:", err);
      } finally {
        setExporting(null);
      }
    },
    []
  );

  const exportAllLogos = useCallback(async () => {
    setExporting("all logos");
    for (let i = 0; i < LOGO_VARIANTS.length; i++) {
      for (const size of LOGO_SIZES) {
        await exportLogo(i, size);
        await delay(300);
      }
    }
    setExporting(null);
  }, [exportLogo]);

  const exportAllBanners = useCallback(async () => {
    setExporting("all banners");
    for (let i = 0; i < BANNER_VARIANTS.length; i++) {
      for (let j = 0; j < BANNER_SIZES.length; j++) {
        await exportBannerAtSize(i, j);
        await delay(300);
      }
    }
    setExporting(null);
  }, [exportBannerAtSize]);

  // Preview scale for banners
  const bannerPreviewWidth = 560;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#F5F3EE",
        padding: "40px",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "40px" }}>
          <div>
            <h1
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "32px",
                fontWeight: 900,
                color: C.text,
                margin: 0,
                letterSpacing: "-1px",
              }}
            >
              <span style={{ color: C.text }}>one</span>
              <span style={{ color: C.primary }}>word</span>
              <span style={{ fontWeight: 400, color: C.muted, fontSize: "20px", marginLeft: "12px" }}>
                Brand Assets
              </span>
            </h1>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={exportAllLogos}
              disabled={!fontsReady || !!exporting}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: `1.5px solid ${C.border}`,
                backgroundColor: C.white,
                color: C.text,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13px",
                fontWeight: 600,
                cursor: fontsReady && !exporting ? "pointer" : "not-allowed",
                opacity: fontsReady && !exporting ? 1 : 0.5,
              }}
            >
              Export All Logos
            </button>
            <button
              onClick={exportAllBanners}
              disabled={!fontsReady || !!exporting}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: C.primary,
                color: C.white,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13px",
                fontWeight: 600,
                cursor: fontsReady && !exporting ? "pointer" : "not-allowed",
                opacity: fontsReady && !exporting ? 1 : 0.5,
              }}
            >
              Export All Banners
            </button>
          </div>
        </div>

        {/* Status bar */}
        {exporting && (
          <div
            style={{
              padding: "10px 16px",
              backgroundColor: `${C.primary}15`,
              borderRadius: "8px",
              marginBottom: "24px",
              fontSize: "13px",
              color: C.primary,
              fontWeight: 500,
            }}
          >
            Exporting: {exporting}...
          </div>
        )}

        {!fontsReady && (
          <div
            style={{
              padding: "10px 16px",
              backgroundColor: "#FFF3CD",
              borderRadius: "8px",
              marginBottom: "24px",
              fontSize: "13px",
              color: "#856404",
              fontWeight: 500,
            }}
          >
            Loading fonts... Export buttons will be enabled shortly.
          </div>
        )}

        {/* LOGOS SECTION */}
        <div style={{ marginBottom: "48px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            <div style={{ width: "24px", height: "1.5px", backgroundColor: C.primary }} />
            <h2
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13px",
                fontWeight: 700,
                color: C.muted,
                letterSpacing: "3px",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              Logos
            </h2>
            <div style={{ flex: 1, height: "1px", backgroundColor: C.border }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {LOGO_VARIANTS.map((variant, idx) => (
              <div
                key={variant.id}
                style={{
                  backgroundColor: C.white,
                  borderRadius: "12px",
                  border: `1px solid ${C.border}`,
                  padding: "24px",
                  display: "flex",
                  alignItems: "center",
                  gap: "24px",
                }}
              >
                {/* Preview */}
                <div
                  style={{
                    flex: "0 0 auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: "260px",
                    backgroundColor:
                      variant.bg === null
                        ? "#E8E3D9"
                        : variant.bg === C.text
                          ? C.text
                          : "#F5F3EE",
                    borderRadius: "8px",
                    padding: "12px",
                    // Checkerboard for transparent variants
                    ...(variant.bg === null
                      ? {
                          backgroundImage:
                            "linear-gradient(45deg, #ddd 25%, transparent 25%), linear-gradient(-45deg, #ddd 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ddd 75%), linear-gradient(-45deg, transparent 75%, #ddd 75%)",
                          backgroundSize: "16px 16px",
                          backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
                        }
                      : {}),
                  }}
                >
                  <div ref={(el) => { logoRefs.current[idx] = el; }}>
                    <LogoRender variant={variant} width={LOGO_BASE_W} fontSize={64} />
                  </div>
                </div>

                {/* Info & buttons */}
                <div style={{ flex: 1 }}>
                  <h3
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "15px",
                      fontWeight: 700,
                      color: C.text,
                      margin: "0 0 4px",
                    }}
                  >
                    Logo {idx + 1}: {variant.name}
                  </h3>
                  <p style={{ fontSize: "12px", color: C.muted, margin: "0 0 12px" }}>
                    {variant.filenameBase}-&#123;width&#125;w.png
                  </p>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {LOGO_SIZES.map((size) => (
                      <button
                        key={size}
                        onClick={() => exportLogo(idx, size)}
                        disabled={!fontsReady || !!exporting}
                        style={{
                          padding: "6px 14px",
                          borderRadius: "6px",
                          border: `1px solid ${C.border}`,
                          backgroundColor: "transparent",
                          color: C.text,
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "12px",
                          fontWeight: 500,
                          cursor: fontsReady && !exporting ? "pointer" : "not-allowed",
                          opacity: fontsReady && !exporting ? 1 : 0.4,
                        }}
                      >
                        {size}w
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BANNERS SECTION */}
        <div style={{ marginBottom: "48px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            <div style={{ width: "24px", height: "1.5px", backgroundColor: C.primary }} />
            <h2
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13px",
                fontWeight: 700,
                color: C.muted,
                letterSpacing: "3px",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              Banners
            </h2>
            <div style={{ flex: 1, height: "1px", backgroundColor: C.border }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {BANNER_VARIANTS.map((variant, idx) => {
              // Use the Twitter size for preview aspect ratio
              const previewAspect = 500 / 1500;
              const previewHeight = Math.round(bannerPreviewWidth * previewAspect);

              return (
                <div
                  key={variant.id}
                  style={{
                    backgroundColor: C.white,
                    borderRadius: "12px",
                    border: `1px solid ${C.border}`,
                    padding: "24px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                    <div>
                      <h3
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "15px",
                          fontWeight: 700,
                          color: C.text,
                          margin: "0 0 4px",
                        }}
                      >
                        Banner {idx + 1}: {variant.name}
                      </h3>
                      <p style={{ fontSize: "12px", color: C.muted, margin: 0 }}>
                        {variant.filenameBase}-&#123;w&#125;x&#123;h&#125;.png
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {BANNER_SIZES.map((size, sIdx) => (
                        <button
                          key={size.label}
                          onClick={() => exportBannerAtSize(idx, sIdx)}
                          disabled={!fontsReady || !!exporting}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: `1px solid ${C.border}`,
                            backgroundColor: "transparent",
                            color: C.text,
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "11px",
                            fontWeight: 500,
                            cursor: fontsReady && !exporting ? "pointer" : "not-allowed",
                            opacity: fontsReady && !exporting ? 1 : 0.4,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {size.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preview at Twitter size scaled down */}
                  <div
                    ref={(el) => { bannerRefs.current[idx] = el; }}
                    style={{
                      width: `${bannerPreviewWidth}px`,
                      height: `${previewHeight}px`,
                      borderRadius: "8px",
                      overflow: "hidden",
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    <div
                      style={{
                        transform: `scale(${bannerPreviewWidth / 1500})`,
                        transformOrigin: "top left",
                        width: "1500px",
                        height: "500px",
                      }}
                    >
                      {renderBanner(variant.id, 1500, 500)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hidden off-screen banner renders at actual export sizes */}
      <div
        style={{
          position: "fixed",
          left: "-99999px",
          top: 0,
          pointerEvents: "none",
          opacity: 0,
        }}
      >
        {BANNER_VARIANTS.map((variant) =>
          BANNER_SIZES.map((size) => {
            const key = `${variant.id}-${size.w}x${size.h}`;
            return (
              <div
                key={key}
                ref={(el) => {
                  bannerExportRefs.current.set(key, el);
                }}
                style={{ width: `${size.w}px`, height: `${size.h}px` }}
              >
                {renderBanner(variant.id, size.w, size.h)}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
