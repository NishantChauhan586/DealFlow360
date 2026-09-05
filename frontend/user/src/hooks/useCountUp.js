import { useState, useEffect, useRef } from 'react';

/**
 * useCountUp — Animates a number from 0 to the target value.
 * Respects prefers-reduced-motion.
 *
 * @param {number} target - The final value to count to
 * @param {number} duration - Animation duration in ms (default 1200)
 * @param {boolean} start - Whether to start the animation
 * @returns {number} current animated value
 */
export function useCountUp(target, duration = 1200, start = true) {
  const [value, setValue] = useState(0);
  const frameRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!start) return;

    if (prefersReduced) {
      setValue(target);
      return;
    }

    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      startTimeRef.current = null;
    };
  }, [target, duration, start]);

  return value;
}
