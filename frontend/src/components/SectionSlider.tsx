"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export function SectionSlider({
  children,
  label,
  prevLabel,
  nextLabel,
}: {
  children: ReactNode;
  label: string;
  prevLabel: string;
  nextLabel: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const element = track.current;
    if (!element) return;
    const max = element.scrollWidth - element.clientWidth;
    setCanPrev(element.scrollLeft > 8);
    setCanNext(element.scrollLeft < max - 8);
  }, []);

  useEffect(() => {
    update();
    const element = track.current;
    if (!element) return;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [update]);

  const scroll = (direction: 1 | -1) => {
    const element = track.current;
    if (!element) return;
    const amount = Math.max(240, element.clientWidth * 0.82);
    element.scrollBy({ left: amount * direction, behavior: "smooth" });
  };

  return (
    <div className="group/slider relative">
      <div
        ref={track}
        className="slider-track"
        onScroll={update}
        role="group"
        aria-label={label}
        tabIndex={0}
      >
        {children}
      </div>

      {canPrev ? (
        <button
          type="button"
          onClick={() => scroll(-1)}
          aria-label={prevLabel}
          className="absolute -left-2 top-[36%] z-10 hidden size-10 -translate-y-1/2 items-center justify-center border border-white/20 bg-[#1a0638]/92 text-white shadow-[0_8px_24px_rgba(0,0,0,0.4)] backdrop-blur-sm transition-colors hover:border-eneba-yellow hover:text-eneba-yellow sm:flex"
        >
          <ChevronLeft size={21} aria-hidden="true" />
        </button>
      ) : null}
      {canNext ? (
        <button
          type="button"
          onClick={() => scroll(1)}
          aria-label={nextLabel}
          className="absolute -right-2 top-[36%] z-10 hidden size-10 -translate-y-1/2 items-center justify-center border border-white/20 bg-[#1a0638]/92 text-white shadow-[0_8px_24px_rgba(0,0,0,0.4)] backdrop-blur-sm transition-colors hover:border-eneba-yellow hover:text-eneba-yellow sm:flex"
        >
          <ChevronRight size={21} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
