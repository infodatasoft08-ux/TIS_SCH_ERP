import React, { useRef, useState, useEffect } from "react";

export default function CustomPullToRefresh({ onRefresh, children }) {
  const [pulling, setPulling] = useState(false);
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const scrollRef = useRef(null);

  const maxPull = 100;

  const handleTouchStart = (e) => {
    // Only engage if at the top of the container
    if (scrollRef.current && scrollRef.current.scrollTop === 0) {
      setStartY(e.touches[0].clientY);
    } else {
      setStartY(0);
    }
  };

  const handleTouchMove = (e) => {
    if (!startY) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY;

    if (distance > 0 && scrollRef.current && scrollRef.current.scrollTop === 0) {
      // Pulling down
      setPulling(true);
      setPullDistance(Math.min(distance * 0.4, maxPull));
      // Stop the regular scroll when pulling to refresh so layout doesn't bounce
      if (e.cancelable) e.preventDefault();
    } else {
      // Scrolling up or moving back
      setPulling(false);
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!startY) return;

    if (pullDistance >= maxPull * 0.8 && pulling) {
      setPullDistance(50); // Keep loading state
      try {
        await onRefresh();
      } catch (err) {}
    }

    // Reset
    setPulling(false);
    setPullDistance(0);
    setStartY(0);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Use non-passive listener to prevent default touch action when pulling
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [startY, pulling, pullDistance]);

  return (
    <div
      ref={scrollRef}
      className={`w-full flex-1 overflow-y-auto max-h-[92vh] md:max-h-[91vh] pb-24 md:pb-4 overscroll-contain overflow-x-hidden relative transition-transform`}
    >
      <div
        className="absolute top-0 left-0 right-0 flex justify-center items-center overflow-hidden transition-all duration-300 pointer-events-none z-50 text-muted-foreground"
        style={{ height: `${pullDistance}px`, opacity: pullDistance / maxPull }}
      >
        {pullDistance >= maxPull * 0.8 ? (
          <i className="ri-loader-4-line text-2xl animate-spin text-primary" />
        ) : (
          <i
            className="ri-arrow-down-line text-2xl transition-transform"
            style={{ transform: `rotate(${pullDistance > 20 ? 180 : 0}deg)` }}
          />
        )}
      </div>

      <div
        style={{
          transform: `translateY(${pulling ? pullDistance : 0}px)`,
          transition: pulling ? "none" : "transform 0.3s ease-out",
        }}
        className="min-h-full flex flex-col"
      >
        {children}
      </div>
    </div>
  );
}
