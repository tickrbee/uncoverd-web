"use client";

import { useState } from "react";

// Helper component for optional images
export function AppScreenshot({ src, alt }: { src: string; alt: string }) {
  const [imageError, setImageError] = useState(false);

  // Don't render anything if image fails to load
  if (imageError) {
    return null;
  }

  return (
    <div className="story-section__image">
      <img
        src={src}
        alt={alt}
        className="app-screenshot"
        onError={() => {
          setImageError(true);
        }}
      />
    </div>
  );
}

