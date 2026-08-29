import type { ComponentKind } from "@/domain/types";

interface CircuitPartIconProps {
  kind: ComponentKind;
  className?: string;
  positionPercent?: number;
}

export function CircuitPartIcon({ kind, className, positionPercent = 50 }: CircuitPartIconProps) {
  if (kind === "esp32-devkitc-v4") {
    return (
      <svg className={className} viewBox="0 0 92 72" role="img" aria-label="ESP32 DevKit board illustration">
        <rect x="20" y="5" width="52" height="62" rx="4" fill="#176b62" stroke="#42c6b5" strokeWidth="1.5" />
        <rect x="30" y="11" width="32" height="27" rx="2" fill="#9ca8ad" stroke="#d4dadd" />
        <path d="M34 17h24M34 22h24M34 27h24" stroke="#7e8b91" strokeWidth="1" opacity=".65" />
        <rect x="36" y="52" width="20" height="13" rx="2" fill="#c4ccd1" stroke="#f0f3f5" />
        <rect x="25" y="42" width="8" height="6" rx="1" fill="#15252a" />
        <rect x="59" y="42" width="8" height="6" rx="1" fill="#15252a" />
        {Array.from({ length: 10 }, (_, index) => (
          <g key={index}>
            <circle cx="17" cy={10 + index * 5.7} r="1.8" fill="#d8b75c" />
            <circle cx="75" cy={10 + index * 5.7} r="1.8" fill="#d8b75c" />
            <path d={`M18.8 ${10 + index * 5.7}H22M70 ${10 + index * 5.7}h3.2`} stroke="#d8b75c" />
          </g>
        ))}
        <text x="46" y="47" fill="#d5fff8" fontSize="5.5" textAnchor="middle" fontFamily="monospace">ESP32</text>
      </svg>
    );
  }

  if (kind === "led") {
    return (
      <svg className={className} viewBox="0 0 92 72" role="img" aria-label="Red LED illustration">
        <path d="M34 63V45M56 63V45" stroke="#b8c3cb" strokeWidth="3" strokeLinecap="round" />
        <path d="M30 42V30c0-12 7-21 16-21s16 9 16 21v12Z" fill="#d72f43" stroke="#ff7b8a" strokeWidth="2" />
        <path d="M36 31V27c0-7 4-12 10-12" stroke="#ffb5bd" strokeWidth="3" strokeLinecap="round" opacity=".8" />
        <rect x="29" y="39" width="34" height="8" rx="3" fill="#aa2031" stroke="#ff6c7c" />
        <circle cx="46" cy="29" r="23" fill="#ef4056" opacity=".08" />
        <text x="46" y="70" fill="#78899c" fontSize="5" textAnchor="middle" fontFamily="monospace">ANODE  CATHODE</text>
      </svg>
    );
  }

  if (kind === "resistor") {
    return (
      <svg className={className} viewBox="0 0 92 72" role="img" aria-label="220 ohm resistor illustration">
        <path d="M4 36h20M68 36h20" stroke="#aab5bd" strokeWidth="3" strokeLinecap="round" />
        <rect x="21" y="25" width="50" height="22" rx="10" fill="#d8ba87" stroke="#f0d9af" strokeWidth="1.5" />
        <path d="M32 26v20M42 26v20M54 26v20M62 27v18" strokeWidth="4" />
        <path d="M32 26v20" stroke="#c53030" strokeWidth="4" />
        <path d="M42 26v20" stroke="#c53030" strokeWidth="4" />
        <path d="M54 26v20" stroke="#7c3f18" strokeWidth="4" />
        <path d="M62 27v18" stroke="#d4af37" strokeWidth="3" />
        <text x="46" y="62" fill="#9aabbb" fontSize="8" textAnchor="middle" fontFamily="monospace">220 Ω</text>
      </svg>
    );
  }

  if (kind === "push-button") return (
    <svg className={className} viewBox="0 0 92 72" role="img" aria-label="Tactile push button illustration">
      <path d="M24 50v12M68 50v12M24 10v12M68 10v12" stroke="#adb8c1" strokeWidth="3" strokeLinecap="round" />
      <rect x="18" y="18" width="56" height="38" rx="7" fill="#26313e" stroke="#738195" strokeWidth="2" />
      <rect x="25" y="24" width="42" height="26" rx="5" fill="#3c4858" stroke="#1a222d" />
      <circle cx="46" cy="35" r="13" fill="#d3d8dc" stroke="#f3f5f6" strokeWidth="2" />
      <circle cx="42" cy="31" r="4" fill="#f7f8f8" opacity=".65" />
      <path d="M19 29h8M65 29h8M19 45h8M65 45h8" stroke="#9aa7b3" strokeWidth="2" />
      <text x="46" y="69" fill="#78899c" fontSize="6" textAnchor="middle" fontFamily="monospace">PUSH</text>
    </svg>
  );

  if (kind === "capacitor") return (
    <svg className={className} viewBox="0 0 92 72" role="img" aria-label="Electrolytic capacitor illustration">
      <path d="M38 54v14M54 54v14" stroke="#9ba9b8" strokeWidth="3" />
      <ellipse cx="46" cy="17" rx="18" ry="8" fill="#bfd5ed" stroke="#5379a5" strokeWidth="2" />
      <path d="M28 17v32c0 5 8 9 18 9s18-4 18-9V17" fill="#3977b9" stroke="#285f9b" strokeWidth="2" />
      <ellipse cx="46" cy="17" rx="18" ry="8" fill="#d9e7f5" stroke="#5379a5" strokeWidth="2" />
      <path d="M55 18v31" stroke="#f5f8fc" strokeWidth="5" opacity=".75" />
      <text x="46" y="42" fill="white" fontSize="8" textAnchor="middle" fontFamily="monospace">100µF</text>
      <text x="35" y="12" fill="#245b96" fontSize="9" fontWeight="700">+</text>
    </svg>
  );

  if (kind === "diode") return (
    <svg className={className} viewBox="0 0 92 72" role="img" aria-label="Rectifier diode illustration">
      <path d="M5 36h23M64 36h23" stroke="#9ba9b8" strokeWidth="3" strokeLinecap="round" />
      <rect x="26" y="28" width="40" height="16" rx="7" fill="#222d3b" stroke="#4f6074" strokeWidth="2" />
      <path d="M55 29v14" stroke="#d9e5ef" strokeWidth="5" />
      <path d="m37 26 15 10-15 10Z" fill="#5f83ad" opacity=".55" />
      <text x="46" y="60" fill="#71849a" fontSize="7" textAnchor="middle" fontFamily="monospace">1N4007</text>
    </svg>
  );

  if (kind === "potentiometer") return (
    <svg className={className} viewBox="0 0 92 72" role="img" aria-label="Potentiometer illustration">
      <path d="M25 55v12M46 55v12M67 55v12" stroke="#9ba9b8" strokeWidth="3" />
      <rect x="18" y="25" width="56" height="32" rx="7" fill="#2f6ead" stroke="#83b4e8" strokeWidth="2" />
      <circle cx="46" cy="29" r="18" fill="#dce6ef" stroke="#8094a8" strokeWidth="2" />
      <circle cx="46" cy="29" r="8" fill="#92a3b3" />
      <path d="M46 29V16" stroke="#526474" strokeWidth="3" strokeLinecap="round" transform={`rotate(${(positionPercent / 100 - 0.5) * 78} 46 29)`} />
      <text x="46" y="51" fill="white" fontSize="7" textAnchor="middle" fontFamily="monospace">10K</text>
    </svg>
  );

  if (kind === "buzzer") return (
    <svg className={className} viewBox="0 0 92 72" role="img" aria-label="Active buzzer illustration">
      <path d="M35 56v12M57 56v12" stroke="#9ba9b8" strokeWidth="3" />
      <ellipse cx="46" cy="23" rx="25" ry="11" fill="#344357" />
      <path d="M21 23v26c0 7 11 12 25 12s25-5 25-12V23" fill="#202d3d" stroke="#52657a" strokeWidth="2" />
      <ellipse cx="46" cy="23" rx="25" ry="11" fill="#344357" stroke="#61758a" strokeWidth="2" />
      <circle cx="46" cy="23" r="5" fill="#101923" />
      <text x="30" y="19" fill="#dbe7f2" fontSize="10" fontWeight="700">+</text>
    </svg>
  );

  if (kind === "servo") return (
    <svg className={className} viewBox="0 0 92 72" role="img" aria-label="Micro servo illustration">
      <rect x="18" y="23" width="56" height="39" rx="5" fill="#2f72ba" stroke="#77ade4" strokeWidth="2" />
      <rect x="12" y="31" width="68" height="8" rx="3" fill="#24609f" />
      <circle cx="46" cy="23" r="12" fill="#d8e0e8" stroke="#8da0b2" strokeWidth="2" />
      <path d="M46 23h30" stroke="#f1f5f9" strokeWidth="5" strokeLinecap="round" />
      <path d="M27 62v8M34 62v8M41 62v8" strokeWidth="3" strokeLinecap="round" stroke="#bf2e3a" />
      <path d="M34 62v8" stroke="#7b4b24" strokeWidth="3" /><path d="M41 62v8" stroke="#d99c22" strokeWidth="3" />
      <text x="46" y="53" fill="white" fontSize="7" textAnchor="middle" fontFamily="monospace">SERVO</text>
    </svg>
  );

  if (kind === "photoresistor") return (
    <svg className={className} viewBox="0 0 92 72" role="img" aria-label="Photoresistor illustration">
      <path d="M35 54v15M57 54v15" stroke="#9ba9b8" strokeWidth="3" />
      <circle cx="46" cy="32" r="24" fill="#e1b85b" stroke="#b18325" strokeWidth="3" />
      <path d="M31 18c16 5 7 10 23 14s7 10 9 16M28 27c15 4 7 9 21 13s8 9 11 13" fill="none" stroke="#8e6720" strokeWidth="2.5" />
      <path d="m72 10-10 10m13 1-10 10" stroke="#4a8bd0" strokeWidth="2" />
      <path d="m61 20 2-6 4 4m-2 13 2-6 4 4" fill="none" stroke="#4a8bd0" strokeWidth="2" />
    </svg>
  );

  if (kind === "npn-transistor") return (
    <svg className={className} viewBox="0 0 92 72" role="img" aria-label="NPN transistor illustration">
      <path d="M33 50 27 68M46 52v16M59 50l6 18" stroke="#9ba9b8" strokeWidth="3" />
      <path d="M26 39c0-17 9-28 20-28s20 11 20 28v14H26Z" fill="#27364a" stroke="#60748a" strokeWidth="2" />
      <path d="M37 25h18M37 32h18M46 25v22" stroke="#a6b8ca" strokeWidth="2" />
      <path d="m54 40 6 7-9 2" fill="none" stroke="#5ca2e8" strokeWidth="2" />
      <text x="46" y="20" fill="#e5edf5" fontSize="7" textAnchor="middle" fontFamily="monospace">NPN</text>
    </svg>
  );

  if (kind === "power-3v3" || kind === "power-5v") {
    const voltage = kind === "power-3v3" ? "3.3V" : "5V";
    return (
    <svg className={className} viewBox="0 0 92 72" role="img" aria-label={`${voltage} power symbol`}>
      <path d="M46 63V26M31 30l15-18 15 18Z" fill="#e7f0ff" stroke="#2563eb" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="46" cy="63" r="4" fill="white" stroke="#2563eb" strokeWidth="2" />
      <text x="46" y="47" fill="#1d4f9d" fontSize="10" fontWeight="700" textAnchor="middle">{voltage}</text>
    </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 92 72" role="img" aria-label="Ground symbol">
      <path d="M46 10v30M25 40h42M32 49h28M39 58h14" stroke="#355d88" strokeWidth="4" strokeLinecap="round" />
      <circle cx="46" cy="10" r="4" fill="white" stroke="#2563eb" strokeWidth="2" />
      <text x="46" y="69" fill="#526b85" fontSize="7" textAnchor="middle" fontFamily="monospace">GND</text>
    </svg>
  );
}
