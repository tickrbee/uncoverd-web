"use client";

export function AppStoreLinks() {
  return (
    <div className="hero__app-stores">
      <a
        href="#"
        className="app-store-badge app-store-badge--apple"
        aria-label="Download on the App Store"
        onClick={(e) => e.preventDefault()}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
        </svg>
        <div className="app-store-badge__text">
          <span className="app-store-badge__label">Download on the</span>
          <span className="app-store-badge__name">App Store</span>
        </div>
      </a>
      <a
        href="#"
        className="app-store-badge app-store-badge--google"
        aria-label="Get it on Google Play"
        onClick={(e) => e.preventDefault()}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.24-.84-.76-.84-1.35zm13.81-5.38L6.05 21.34l8.49-8.49 2.27 2.27zm-1.36-3.24L5.7 2.66l8.49 8.49-2.27 2.27zm1.35-3.24L18.3 2.66c.5.24.84.76.84 1.35v17c0-.59-.34-1.11-.84-1.35l-8.49-8.49 2.27-2.27z"/>
        </svg>
        <div className="app-store-badge__text">
          <span className="app-store-badge__label">GET IT ON</span>
          <span className="app-store-badge__name">Google Play</span>
        </div>
      </a>
    </div>
  );
}

