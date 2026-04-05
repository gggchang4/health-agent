"use client";

export type ExerciseEquipmentKey =
  | "ab_wheel"
  | "accessory"
  | "axle_bar"
  | "balance_board"
  | "barbell"
  | "battle_rope"
  | "bench"
  | "bodyweight"
  | "cable"
  | "climbing_rope"
  | "dip_bar"
  | "dumbbell"
  | "exercise_ball"
  | "ez_bar"
  | "foam_roller"
  | "heavy_bag"
  | "jump_rope"
  | "kettlebell"
  | "machine"
  | "medicine_ball"
  | "plyo_box"
  | "pullup_bar"
  | "resistance_band"
  | "rings"
  | "sandbag"
  | "sled"
  | "strongman"
  | "suspension_trainer"
  | "tire"
  | "trap_bar"
  | "weight_plate"
  | "weighted_vest";

export function ExerciseEquipmentIcon({
  equipmentKey,
  className
}: {
  equipmentKey: string;
  className?: string;
}) {
  return (
    <span className={`exercise-equipment-icon ${className ?? ""}`.trim()} aria-hidden="true">
      {renderIcon(equipmentKey)}
    </span>
  );
}

function renderIcon(key: string) {
  switch (key) {
    case "dumbbell":
      return (
        <svg viewBox="0 0 48 48">
          <path d="M7 19h4v10H7zM12 15h4v18h-4zM18 22h12v4H18zM32 15h4v18h-4zM37 19h4v10h-4z" />
        </svg>
      );
    case "kettlebell":
      return (
        <svg viewBox="0 0 48 48">
          <path d="M16 17a8 8 0 1 1 16 0h-4a4 4 0 1 0-8 0z" />
          <path d="M12 20h24l4 18a5 5 0 0 1-5 6H13a5 5 0 0 1-5-6z" />
        </svg>
      );
    case "barbell":
      return (
        <svg viewBox="0 0 48 48">
          <path d="M5 13h4v22H5zM10 9h4v30h-4zM15 17h4v14h-4zM29 17h4v14h-4zM34 9h4v30h-4zM39 13h4v22h-4zM19 22h10v4H19z" />
        </svg>
      );
    case "axle_bar":
      return (
        <svg viewBox="0 0 48 48">
          <path d="M6 17h4v14H6zM38 17h4v14h-4zM10 21h28v6H10z" />
        </svg>
      );
    case "trap_bar":
      return (
        <svg viewBox="0 0 48 48">
          <path
            d="M15 10h18l8 14-8 14H15L7 24z"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path d="M20 18h8v12h-8z" />
        </svg>
      );
    case "ez_bar":
      return (
        <svg viewBox="0 0 48 48">
          <path d="M6 18h4v12H6zM38 18h4v12h-4zM10 22h7l4-4 6 6 4-4h7v4h-7l-4 4-6-6-4 4h-7z" />
        </svg>
      );
    case "weight_plate":
      return (
        <svg viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="14" fill="none" stroke="currentColor" strokeWidth="4" />
          <circle cx="24" cy="24" r="4" />
        </svg>
      );
    case "cable":
      return (
        <svg viewBox="0 0 48 48">
          <path d="M10 6h4v36h-4zM14 8h18v4H14zM32 10h6v4h-6zM34 14h4v18h-4zM16 30h18v4H16zM20 34l-5 8h4l4-6zM28 34l5 8h-4l-4-6z" />
        </svg>
      );
    case "machine":
      return (
        <svg viewBox="0 0 48 48">
          <path d="M10 8h4v32h-4zM34 8h4v32h-4zM14 12h20v4H14zM18 20h12v4H18zM18 28h12v4H18zM20 32h8v8h-8z" />
        </svg>
      );
    case "bench":
      return (
        <svg viewBox="0 0 48 48">
          <path d="M10 19h20v6H10zM30 21h8l4 8h-4l-2-4h-6zM13 25h4v10h-4zM25 25h4v10h-4z" />
        </svg>
      );
    case "pullup_bar":
      return (
        <svg viewBox="0 0 48 48">
          <path d="M8 10h32v4H8zM11 14h4v8h-4zM33 14h4v8h-4zM18 14h4v16h-4zM26 14h4v16h-4zM16 30h16v4H16z" />
        </svg>
      );
    case "dip_bar":
      return (
        <svg viewBox="0 0 48 48">
          <path d="M12 10h4v28h-4zM32 10h4v28h-4zM16 16h16v4H16zM16 30h16v4H16z" />
        </svg>
      );
    case "rings":
      return (
        <svg viewBox="0 0 48 48">
          <path d="M16 8h4v10h-4zM28 8h4v10h-4z" />
          <circle cx="18" cy="26" r="7" fill="none" stroke="currentColor" strokeWidth="4" />
          <circle cx="30" cy="26" r="7" fill="none" stroke="currentColor" strokeWidth="4" />
        </svg>
      );
    case "resistance_band":
      return (
        <svg viewBox="0 0 48 48">
          <path
            d="M16 12c-4 0-7 3-7 7 0 9 12 10 12 18 0 4 3 7 7 7s7-3 7-7c0-9-12-10-12-18 0-4-3-7-7-7z"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
      );
    case "suspension_trainer":
      return (
        <svg viewBox="0 0 48 48">
          <path d="M22 8h4v10h-4zM14 18l10 18 10-18h-5l-5 10-5-10z" />
          <path d="M12 18h6M30 18h6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "battle_rope":
      return (
        <svg viewBox="0 0 48 48">
          <path
            d="M8 32c5-10 9-10 14 0s9 10 14 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path d="M8 16c5-10 9-10 14 0s9 10 14 0" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case "jump_rope":
      return (
        <svg viewBox="0 0 48 48">
          <path d="M12 14h4v10h-4zM32 14h4v10h-4z" />
          <path
            d="M14 24c0 10 4 16 10 16s10-6 10-16"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
      );
    case "climbing_rope":
      return (
        <svg viewBox="0 0 48 48">
          <path
            d="M24 6v36M18 12l12 6-12 6 12 6-12 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "sled":
      return (
        <svg viewBox="0 0 48 48">
          <path d="M12 18h20l4 12H16zM10 34h30" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path d="M30 14l6-6" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case "plyo_box":
      return (
        <svg viewBox="0 0 48 48">
          <path d="M12 14h24v20H12z" fill="none" stroke="currentColor" strokeWidth="4" />
          <path d="M18 20h12M18 28h12" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case "sandbag":
      return (
        <svg viewBox="0 0 48 48">
          <path d="M17 12h14l3 5-3 3H17l-3-3z" />
          <path d="M11 20h26l3 16H8z" />
        </svg>
      );
    case "heavy_bag":
      return (
        <svg viewBox="0 0 48 48">
          <path d="M20 8h8v6h-8zM16 14h16l2 24a4 4 0 0 1-4 5H18a4 4 0 0 1-4-5z" />
        </svg>
      );
    case "exercise_ball":
      return (
        <svg viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="14" fill="none" stroke="currentColor" strokeWidth="4" />
          <path d="M14 24h20M24 10c4 4 6 9 6 14s-2 10-6 14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "medicine_ball":
      return (
        <svg viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="14" fill="none" stroke="currentColor" strokeWidth="4" />
          <path d="M24 10c-4 4-6 9-6 14s2 10 6 14M10 24h28" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "foam_roller":
      return (
        <svg viewBox="0 0 48 48">
          <rect x="10" y="16" width="28" height="16" rx="8" fill="none" stroke="currentColor" strokeWidth="4" />
          <path d="M18 16v16M24 16v16M30 16v16" stroke="currentColor" strokeWidth="3" />
        </svg>
      );
    case "ab_wheel":
      return (
        <svg viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="8" fill="none" stroke="currentColor" strokeWidth="4" />
          <path d="M8 24h8M32 24h8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case "balance_board":
      return (
        <svg viewBox="0 0 48 48">
          <path d="M10 24h28l-4 6H14z" />
          <path d="M19 30c0-3 2-6 5-6s5 3 5 6" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case "weighted_vest":
      return (
        <svg viewBox="0 0 48 48">
          <path d="M16 10h16l4 8v22H12V18z" />
          <path d="M20 18h8v12h-8z" fill="#dfdfdf" />
        </svg>
      );
    case "tire":
      return (
        <svg viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="14" fill="none" stroke="currentColor" strokeWidth="4" />
          <circle cx="24" cy="24" r="7" fill="none" stroke="currentColor" strokeWidth="4" />
          <path d="M24 10v7M24 31v7M10 24h7M31 24h7" stroke="currentColor" strokeWidth="3" />
        </svg>
      );
    case "strongman":
      return (
        <svg viewBox="0 0 48 48">
          <path d="M10 18h8v14h-8zM30 18h8v14h-8zM18 14h12v22H18z" />
          <path d="M20 10h8v4h-8z" />
        </svg>
      );
    case "bodyweight":
      return (
        <svg viewBox="0 0 48 48">
          <circle cx="24" cy="10" r="4" />
          <path d="M18 18l6-4 6 4-2 4-4-2-4 2zM22 22h4v14h-4zM16 38l6-10 2 2-4 10zM32 38l-4-10 2-2 6 10zM12 26l8-6 2 3-8 6zM36 26l-8-6-2 3 8 6z" />
        </svg>
      );
    case "accessory":
    default:
      return (
        <svg viewBox="0 0 48 48">
          <rect x="10" y="14" width="28" height="20" rx="6" />
          <path d="M18 24h12" stroke="#dfdfdf" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
  }
}
