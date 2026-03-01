"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useRef, useEffect } from "react";

const PULL_THRESHOLD = 56;
const MAX_PULL = 80;
const RESISTANCE = 0.5;

export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pullDistanceRef = useRef(0);
  pullDistanceRef.current = pullDistance;

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    router.refresh();
    const t = setTimeout(() => {
      setIsRefreshing(false);
    }, 1200);
    return () => clearTimeout(t);
  }, [router]);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (typeof window === "undefined" || window.scrollY > 8) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    },
    []
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || typeof window === "undefined") return;
      if (window.scrollY > 8) {
        pulling.current = false;
        setPullDistance(0);
        return;
      }
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0) {
        e.preventDefault();
        const distance = Math.min(delta * RESISTANCE, MAX_PULL);
        pullDistanceRef.current = distance;
        setPullDistance(distance);
      }
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!pulling.current) return;
    const distance = pullDistanceRef.current;
    if (distance >= PULL_THRESHOLD) {
      handleRefresh();
    }
    pulling.current = false;
    setPullDistance(0);
  }, [handleRefresh]);

  const onTouchCancel = useCallback(() => {
    pulling.current = false;
    setPullDistance(0);
  }, []);

  const showIndicator = pullDistance > 0 || isRefreshing;
  const contentOffset = Math.min(pullDistance, 56);

  return (
    <div
      ref={containerRef}
      className="min-h-full"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
      style={{ touchAction: "pan-y" }}
    >
      {/* Fixed indicator at top; visible when pulling or refreshing */}
      <div
        aria-hidden
        className="pointer-events-none fixed left-0 right-0 top-0 z-30 flex h-14 items-center justify-center bg-gray-50 text-gray-500 transition-opacity duration-150"
        style={{
          opacity: showIndicator ? 1 : 0,
          visibility: showIndicator ? "visible" : "hidden",
        }}
      >
        {isRefreshing ? (
          <span className="text-sm">Refreshing…</span>
        ) : pullDistance >= PULL_THRESHOLD ? (
          <span className="text-sm">Release to refresh</span>
        ) : (
          <svg
            className="h-6 w-6 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden
            style={{ transform: `rotate(${Math.min(pullDistance * 4, 360)}deg)` }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        )}
      </div>

      {/* Content moves down when pulling */}
      <div
        style={{
          transform: contentOffset > 0 ? `translateY(${contentOffset}px)` : undefined,
          transition:
            pullDistance === 0 && !isRefreshing ? "transform 0.2s ease-out" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
