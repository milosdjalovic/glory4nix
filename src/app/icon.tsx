import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A0A0A",
          borderRadius: 96,
        }}
      >
        <div
          style={{
            fontSize: 180,
            fontWeight: 800,
            color: "#C4A265",
            fontFamily: "system-ui",
          }}
        >
          G4
        </div>
      </div>
    ),
    { ...size }
  );
}
