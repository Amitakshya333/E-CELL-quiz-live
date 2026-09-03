import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface QrCodeProps {
  value: string;
  size?: number;
  className?: string;
  darkColor?: string;
  lightColor?: string;
}

export function QrCodeDisplay({
  value,
  size = 280,
  className = "",
  darkColor = "#000000",
  lightColor = "#ffffff",
}: QrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      width: size,
      margin: 1.5,
      color: {
        dark: darkColor,
        light: lightColor,
      },
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch((err) => {
        console.error("Failed to generate QR code", err);
      });

    return () => {
      active = false;
    };
  }, [value, size, darkColor, lightColor]);

  if (!dataUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-white/10 animate-pulse rounded-lg ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-muted-foreground font-mono">Generating QR...</span>
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt={`QR code for ${value}`}
      className={`rounded-lg shadow-md ${className}`}
      width={size}
      height={size}
    />
  );
}
