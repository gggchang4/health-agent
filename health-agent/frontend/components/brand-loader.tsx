"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function BrandLoader() {
  const [isExiting, setIsExiting] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const exitTimer = window.setTimeout(() => setIsExiting(true), 1350);
    const hideTimer = window.setTimeout(() => setIsHidden(true), 1850);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (isHidden) {
    return null;
  }

  return (
    <div className={`brand-loader ${isExiting ? "is-exiting" : ""}`} aria-hidden="true">
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
