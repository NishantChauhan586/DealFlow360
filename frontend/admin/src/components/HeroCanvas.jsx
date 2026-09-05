import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * HeroCanvas — Three.js animated particle field + flow lines.
 * Ported verbatim from dealflow360.html.
 */
export function HeroCanvas() {
  const mount = useRef(null);

  useEffect(() => {
    const el = mount.current;
    const width = el.clientWidth, height = el.clientHeight;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.z = 9;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    const COUNT = 260;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(COUNT * 3);
    const speeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 7;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
      speeds[i] = 0.15 + Math.random() * 0.35;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0x86B3A9, size: 0.055, transparent: true, opacity: 0.85 });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    // faint connecting lines to suggest "flow"
    const lineGeo = new THREE.BufferGeometry();
    const lineMat = new THREE.LineBasicMaterial({ color: 0x438A7E, transparent: true, opacity: 0.18 });
    const lineCount = 60;
    const linePos = new Float32Array(lineCount * 2 * 3);
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines);

    let raf;
    const clock = new THREE.Clock();
    const animate = () => {
      const t = clock.getElapsedTime();
      const pos = geo.attributes.position.array;
      for (let i = 0; i < COUNT; i++) {
        pos[i * 3] += speeds[i] * 0.015;
        if (pos[i * 3] > 8) pos[i * 3] = -8;
        pos[i * 3 + 1] += Math.sin(t * 0.6 + i) * 0.0009;
      }
      geo.attributes.position.needsUpdate = true;

      const lp = lineGeo.attributes.position.array;
      for (let i = 0; i < lineCount; i++) {
        const a = i, b = (i * 7 + 3) % COUNT;
        lp[i * 6]     = pos[a * 3];     lp[i * 6 + 1] = pos[a * 3 + 1]; lp[i * 6 + 2] = pos[a * 3 + 2];
        lp[i * 6 + 3] = pos[b * 3];     lp[i * 6 + 4] = pos[b * 3 + 1]; lp[i * 6 + 5] = pos[b * 3 + 2];
      }
      lineGeo.attributes.position.needsUpdate = true;

      points.rotation.y = t * 0.02;
      lines.rotation.y = t * 0.02;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mount} style={{ position: 'absolute', inset: 0 }} />;
}
