import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * CountUp — GSAP number count-up animation.
 * Ported verbatim from dealflow360.html.
 */
export function CountUp({ value, prefix = '', decimals = 0 }) {
  const ref = useRef(null);

  useEffect(() => {
    const obj = { v: 0 };
    gsap.to(obj, {
      v: value,
      duration: 0.9,
      ease: 'power2.out',
      onUpdate: () => {
        if (ref.current) {
          ref.current.textContent =
            prefix + obj.v.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }
      },
    });
  }, [value, prefix, decimals]);

  return <span ref={ref} className="tnum">{prefix}0</span>;
}

/**
 * useEnter — GSAP staggered fade-in for .fade-target elements.
 * Ported verbatim from dealflow360.html.
 */
export function useEnter(deps) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const targets = ref.current.querySelectorAll('.fade-target');
    gsap.fromTo(
      targets,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out', stagger: 0.06 }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
