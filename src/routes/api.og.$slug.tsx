import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "../db";
import fs from "node:fs";
import path from "node:path";

const SITE_URL = "https://tokolink.app";
const FALLBACK_OG = `${SITE_URL}/og-main.png`;

let cachedFont: ArrayBuffer | null = null;

async function getFont(): Promise<ArrayBuffer | null> {
  if (cachedFont) return cachedFont;

  try {
    const fontPath = path.join(process.cwd(), "public", "SpaceGrotesk-Bold.ttf");
    if (fs.existsSync(fontPath)) {
      const buffer = fs.readFileSync(fontPath);
      cachedFont = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      return cachedFont;
    }
  } catch (err) {
    console.warn("[OG] Failed to load local font, falling back to network fetch:", err);
  }

  try {
    const cssRes = await fetch("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
      },
    });
    if (!cssRes.ok) throw new Error(`CSS fetch status ${cssRes.status}`);
    const cssText = await cssRes.text();

    const match = cssText.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/);
    if (!match) throw new Error("Could not parse font URL from CSS");
    const fontUrl = match[1];

    const fontRes = await fetch(fontUrl);
    if (!fontRes.ok) throw new Error(`Font file fetch status ${fontRes.status}`);
    cachedFont = await fontRes.arrayBuffer();
    return cachedFont;
  } catch (err) {
    console.error("[OG] Failed to load Space Grotesk font:", err);
    return null;
  }
}

export function isSafeImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;

    const hostname = parsed.hostname;

    if (hostname.endsWith(".public.blob.vercel-storage.com")) return true;
    if (hostname === "api.dicebear.com") return true;
    if (hostname === "tokolink.app") return true;

    if (process.env.NODE_ENV !== "production") {
      if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.")) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

function isSupportedImage(url: string | null | undefined): boolean {
  if (!url) return false;
  if (!isSafeImageUrl(url)) return false;
  try {
    const cleanUrl = url.split("?")[0].toLowerCase();
    return cleanUrl.endsWith(".png") || cleanUrl.endsWith(".jpg") || cleanUrl.endsWith(".jpeg");
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/og/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const { ImageResponse } = await import("@vercel/og");
          const fontData = await getFont();

          const tenant = await prisma.tenant.findUnique({
            where: { slug: params.slug },
            include: {
              products: {
                take: 3,
                orderBy: { createdAt: "desc" },
              },
            },
          });

          if (!tenant) {
            return Response.redirect(FALLBACK_OG, 302);
          }

          const html = (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                background: "#0A0A0A",
                padding: "60px",
                fontFamily: fontData ? "Space Grotesk, sans-serif" : "sans-serif",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: "16px" }}>
                  {isSupportedImage(tenant.avatar) ? (
                    <img
                      src={tenant.avatar!}
                      style={{
                        width: "88px",
                        height: "88px",
                        borderRadius: "44px",
                        objectFit: "cover",
                        border: "3px solid #D4FF3A",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "88px",
                        height: "88px",
                        borderRadius: "44px",
                        background: "#D4FF3A",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "32px",
                        fontWeight: 700,
                        color: "#0A0A0A",
                      }}
                    >
                      {tenant.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div
                    style={{
                      fontSize: "48px",
                      fontWeight: 700,
                      color: "#FAFAF7",
                      letterSpacing: "-0.03em",
                      lineHeight: 1.1,
                      display: "flex",
                    }}
                  >
                    {tenant.name}
                  </div>

                  <div
                    style={{
                      fontSize: "20px",
                      color: "#A0A0A0",
                      display: "flex",
                      maxWidth: "420px",
                    }}
                  >
                    {tenant.tagline || "Toko online via WhatsApp"}
                  </div>
                </div>
                {tenant.products.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      gap: "16px",
                      alignItems: "center",
                    }}
                  >
                    {tenant.products.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          width: "140px",
                          height: "140px",
                          borderRadius: "16px",
                          overflow: "hidden",
                          background: "#1C1C1C",
                          border: "1px solid #2A2A2A",
                          display: "flex",
                        }}
                      >
                        {isSupportedImage(p.image) ? (
                          <img
                            src={p.image!}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "100%",
                              height: "100%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#A0A0A0",
                              fontSize: "12px",
                              padding: "10px",
                              textAlign: "center",
                            }}
                          >
                            {p.name}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderTop: "1px solid #2A2A2A",
                  paddingTop: "24px",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <span style={{ color: "#888", fontSize: "16px", display: "flex" }}>
                    Powered by tokolink.app
                  </span>
                </div>

                <div
                  style={{
                    background: "#D4FF3A",
                    color: "#0A0A0A",
                    padding: "8px 20px",
                    borderRadius: "999px",
                    fontSize: "14px",
                    fontWeight: 600,
                    display: "flex",
                  }}
                >
                  tokolink.app/{tenant.slug}
                </div>
              </div>
            </div>
          );

          const fontsConfig = fontData
            ? [
                {
                  name: "Space Grotesk",
                  data: fontData,
                  weight: 700 as const,
                  style: "normal" as const,
                },
              ]
            : undefined;

          return new ImageResponse(html, {
            width: 1200,
            height: 630,
            fonts: fontsConfig,
            headers: {
              "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
            },
          });
        } catch (err) {
          console.error("[OG] Failed to generate:", err);
          return Response.redirect(FALLBACK_OG, 302);
        }
      },
    },
  },
});
