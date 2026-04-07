"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type LoaderPhase = "visible" | "exiting" | "hidden";

export function BrandLoader() {
  const [phase, setPhase] = useState<LoaderPhase>("visible");

  useEffect(() => {
    const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (reduceMotionQuery.matches) {
      setPhase("hidden");
      return;
    }

    const exitTimer = window.setTimeout(() => setPhase("exiting"), 1350);
    const hideTimer = window.setTimeout(() => setPhase("hidden"), 1850);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (phase === "hidden") {
    return null;
  }

  return (
    <div className={`brand-loader ${phase === "exiting" ? "is-exiting" : ""}`} aria-hidden="true">
      <div className="brand-loader-mark">
        <Image
          src="/brand/gympal-logo-mark.png"
          alt=""
          width={116}
          height={116}
          className="brand-loader-image"
          priority
        />
        <span className="brand-loader-wordmark">GymPal</span>
      </div>
    </div>
  );
}
