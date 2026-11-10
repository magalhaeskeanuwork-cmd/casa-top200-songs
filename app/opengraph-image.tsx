import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "CASA — Classificação Angolana de Sons e Audiências";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 76px",
          background: "#111111",
          color: "#EEEAE1",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 12, height: 12, borderRadius: 99, background: "#F0522B" }} />
          <div style={{ fontSize: 22, letterSpacing: 5, color: "#EEEAE1" }}>MÚSICA · CULTURA · DADOS</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 176, lineHeight: 0.9, fontWeight: 800, letterSpacing: -12 }}>CASA</div>
          <div style={{ fontSize: 30, color: "#B7B2A9", letterSpacing: 1 }}>CLASSIFICAÇÃO ANGOLANA DE SONS E AUDIÊNCIAS</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #4A4844", paddingTop: 20, fontSize: 20, color: "#B7B2A9" }}>
          <div>CHARTS · ARTISTAS · CULTURA</div>
          <div>CASACHARTS.DIGITAL</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
