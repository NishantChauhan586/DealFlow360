import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * HeroCanvas — Three.js animated particle field + flow lines.
 * Renders 3D interactive floating node network in the hero banner.
 */
export function HeroCanvas() {
  const mount = useRef(null);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;

    const width = el.clientWidth || el.parentElement?.clientWidth || 800;
    const height = el.clientHeight || el.parentElement?.clientHeight || 230;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.z = 8.5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    renderer.domElement.style.pointerEvents = 'none';
    el.appendChild(renderer.domElement);

    const COUNT = 280;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(COUNT * 3);
    const speeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 18;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
      speeds[i] = 0.15 + Math.random() * 0.35;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x94D2BD,
      size: 0.075,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    // faint connecting lines for flow
    const lineGeo = new THREE.BufferGeometry();
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x52B788,
      transparent: true,
      opacity: 0.25
    });
    const lineCount = 70;
    const linePos = new Float32Array(lineCount * 2 * 3);
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines);

    let raf;
    const startTime = performance.now();
    const animate = (now) => {
      const t = (now - startTime) * 0.001;
      const pos = geo.attributes.position.array;

      for (let i = 0; i < COUNT; i++) {
        pos[i * 3] += speeds[i] * 0.012;
        if (pos[i * 3] > 9) pos[i * 3] = -9;
        pos[i * 3 + 1] += Math.sin(t * 0.6 + i) * 0.001;
      }
      geo.attributes.position.needsUpdate = true;

      const lp = lineGeo.attributes.position.array;
      for (let i = 0; i < lineCount; i++) {
        const a = i, b = (i * 7 + 3) % COUNT;
        lp[i * 6]     = pos[a * 3];     lp[i * 6 + 1] = pos[a * 3 + 1]; lp[i * 6 + 2] = pos[a * 3 + 2];
        lp[i * 6 + 3] = pos[b * 3];     lp[i * 6 + 4] = pos[b * 3 + 1]; lp[i * 6 + 5] = pos[b * 3 + 2];
      }
      lineGeo.attributes.position.needsUpdate = true;

      points.rotation.y = t * 0.025;
      lines.rotation.y = t * 0.025;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    // ResizeObserver for dynamic size updates
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width || el.clientWidth;
        const h = entry.contentRect.height || el.clientHeight;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      renderer.dispose();
      if (el && el.contains(renderer.domElement)) {
        el.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mount} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }} />;
}
