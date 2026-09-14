/*
 * Mother's Hug Hospital — hero 3D scene.
 * Traces the actual logo artwork (images/logo.png) from its alpha
 * channel into 2D silhouettes, extrudes them into real 3D geometry
 * (instead of a generic sphere/blob), and renders it as a gently
 * rotating 3D emblem with floating brand-colored particles and mouse
 * parallax. Falls back to a procedural blob if the logo can't be
 * traced for any reason, and to the static CSS background if WebGL
 * is unavailable or the visitor prefers reduced motion.
 */
(function () {
  const container = document.getElementById("hero-canvas");
  if (!container || typeof THREE === "undefined") return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) {
    return; // no WebGL — CSS fallback background stays visible
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 6.4);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.9));

  const group = new THREE.Group(); // rotated every frame
  scene.add(group);

  /* ---------- Gradient "brand material" (shared look for every piece) ---------- */
  function makeBrandMaterial(colorA, colorB, colorC, yMin, yMax) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColorA: { value: new THREE.Color(colorA) },
        uColorB: { value: new THREE.Color(colorB) },
        uColorC: { value: new THREE.Color(colorC) },
        uYMin: { value: yMin },
        uYMax: { value: yMax },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPos;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform vec3 uColorC;
        uniform float uYMin;
        uniform float uYMax;
        void main() {
          float grad = clamp((vPos.y - uYMin) / max(0.0001, (uYMax - uYMin)), 0.0, 1.0);
          vec3 base = mix(uColorA, uColorB, grad);
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.2);
          vec3 color = mix(base, uColorC, fresnel * 0.5);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
  }

  /* ---------- Floating particles (unchanged brand accents) ---------- */
  const particleGroup = new THREE.Group();
  const particleColors = [0xc7509d, 0x8452b0, 0xf3b978];
  const particles = [];
  for (let i = 0; i < 16; i++) {
    const size = 0.04 + Math.random() * 0.07;
    const geo = new THREE.SphereGeometry(size, 12, 12);
    const mat = new THREE.MeshBasicMaterial({
      color: particleColors[i % particleColors.length],
      transparent: true,
      opacity: 0.75,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const angle = Math.random() * Math.PI * 2;
    const radius = 2.5 + Math.random() * 1.3;
    const height = (Math.random() - 0.5) * 3.2;
    mesh.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
    particles.push({ mesh, angle, radius, height, speed: 0.15 + Math.random() * 0.25 });
    particleGroup.add(mesh);
  }
  scene.add(particleGroup);

  /* ---------- Halo ring behind the emblem ---------- */
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.15, 0.012, 8, 96),
    new THREE.MeshBasicMaterial({ color: 0xdd7cb9, transparent: true, opacity: 0.45 })
  );
  scene.add(ring);

  /* ---------- Mouse parallax ---------- */
  let targetX = 0, targetY = 0, currentX = 0, currentY = 0;
  container.addEventListener("mousemove", (e) => {
    const rect = container.getBoundingClientRect();
    targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  });
  container.addEventListener("mouseleave", () => { targetX = 0; targetY = 0; });

  /* ---------- Resize ---------- */
  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  /* ---------- Animation loop ---------- */
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    if (!prefersReducedMotion) {
      group.rotation.y = t * 0.35;
      group.rotation.x = Math.sin(t * 0.4) * 0.16;
      group.position.y = Math.sin(t * 0.8) * 0.12;
      ring.rotation.x = 1.2 + Math.sin(t * 0.25) * 0.1;
      ring.rotation.z = t * 0.12;

      particles.forEach((p) => {
        const a = p.angle + t * p.speed * 0.3;
        p.mesh.position.x = Math.cos(a) * p.radius;
        p.mesh.position.z = Math.sin(a) * p.radius;
        p.mesh.position.y = p.height + Math.sin(t * p.speed + p.angle) * 0.4;
      });

      currentX += (targetX - currentX) * 0.05;
      currentY += (targetY - currentY) * 0.05;
      camera.position.x = currentX * 0.6;
      camera.position.y = -currentY * 0.5;
      camera.lookAt(0, 0, 0);
    }

    renderer.render(scene, camera);
  }

  /* =========================================================
   * Trace the real logo artwork into 3D geometry
   * ========================================================= */

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  // 4-connected flood fill to find separate silhouette pieces
  // (the hug/embrace shape, the large heart, the small heart, ...)
  function findComponents(mask, w, h) {
    const visited = new Uint8Array(w * h);
    const comps = [];
    const stack = new Int32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (mask[idx] !== 1 || visited[idx]) continue;
        let sp = 0;
        stack[sp++] = idx;
        visited[idx] = 1;
        let area = 0;
        while (sp > 0) {
          const cur = stack[--sp];
          area++;
          const cx = cur % w, cy = (cur - cx) / w;
          if (cx + 1 < w && mask[cur + 1] === 1 && !visited[cur + 1]) { visited[cur + 1] = 1; stack[sp++] = cur + 1; }
          if (cx - 1 >= 0 && mask[cur - 1] === 1 && !visited[cur - 1]) { visited[cur - 1] = 1; stack[sp++] = cur - 1; }
          if (cy + 1 < h && mask[cur + w] === 1 && !visited[cur + w]) { visited[cur + w] = 1; stack[sp++] = cur + w; }
          if (cy - 1 >= 0 && mask[cur - w] === 1 && !visited[cur - w]) { visited[cur - w] = 1; stack[sp++] = cur - w; }
        }
        comps.push({ startX: x, startY: y, area });
      }
    }
    return comps;
  }

  // Moore-neighbor boundary tracing — walks the outer edge of one
  // silhouette piece and returns it as an ordered list of points.
  function traceBoundary(mask, w, h, startX, startY) {
    const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
    const isFg = (x, y) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;
    const boundary = [{ x: startX, y: startY }];
    let cx = startX, cy = startY;
    let backtrack = 4; // start pixel's west neighbor is guaranteed background
    let guard = 0;
    const maxSteps = w * h * 2;
    while (guard++ < maxSteps) {
      let moved = false;
      for (let i = 1; i <= 8; i++) {
        const dIdx = (backtrack + i) % 8;
        const d = dirs[dIdx];
        const nx = cx + d[0], ny = cy + d[1];
        if (isFg(nx, ny)) {
          backtrack = (dIdx + 4) % 8;
          cx = nx; cy = ny;
          boundary.push({ x: cx, y: cy });
          moved = true;
          break;
        }
      }
      if (!moved) break;
      if (cx === startX && cy === startY && boundary.length > 3) break;
    }
    return boundary;
  }

  function simplify(points, epsilon) {
    if (points.length < 3) return points;
    function perpDist(pt, a, b) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len === 0) return Math.hypot(pt.x - a.x, pt.y - a.y);
      const u = ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / (len * len);
      const cx = a.x + u * dx, cy = a.y + u * dy;
      return Math.hypot(pt.x - cx, pt.y - cy);
    }
    function dp(pts) {
      if (pts.length < 3) return pts;
      let maxD = 0, idx = 0;
      for (let i = 1; i < pts.length - 1; i++) {
        const d = perpDist(pts[i], pts[0], pts[pts.length - 1]);
        if (d > maxD) { maxD = d; idx = i; }
      }
      if (maxD > epsilon) {
        const left = dp(pts.slice(0, idx + 1));
        const right = dp(pts.slice(idx));
        return left.slice(0, -1).concat(right);
      }
      return [pts[0], pts[pts.length - 1]];
    }
    return dp(points);
  }

  async function buildLogoEmblem() {
    const img = await loadImage("images/logo.png");
    const SCALE = 4;
    const w = img.naturalWidth * SCALE, h = img.naturalHeight * SCALE;
    const cvs = document.createElement("canvas");
    cvs.width = w; cvs.height = h;
    const ctx = cvs.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;

    const mask = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) mask[i] = data[i * 4 + 3] > 120 ? 1 : 0;

    let comps = findComponents(mask, w, h).filter((c) => c.area > (w * h) * 0.002);
    if (!comps.length) throw new Error("No logo silhouette found");
    comps.sort((a, b) => b.area - a.area);
    comps = comps.slice(0, 4);

    const maxDim = Math.max(w, h);
    const targetSize = 3.4;
    const meshes = [];

    comps.forEach((comp, idx) => {
      const raw = traceBoundary(mask, w, h, comp.startX, comp.startY);
      const pts = simplify(raw, 1.4);
      if (pts.length < 8) return;

      const shape = new THREE.Shape();
      pts.forEach((p, i) => {
        const x = ((p.x - w / 2) / maxDim) * targetSize;
        const y = -((p.y - h / 2) / maxDim) * targetSize;
        if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
      });
      shape.closePath();

      const isMain = idx === 0;
      const depth = isMain ? 0.42 : 0.3;
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelThickness: 0.035,
        bevelSize: 0.035,
        bevelSegments: 3,
        curveSegments: 3,
      });
      geo.translate(0, 0, -depth / 2);
      geo.computeVertexNormals();
      geo.computeBoundingBox();

      const bb = geo.boundingBox;
      const mat = isMain
        ? makeBrandMaterial(0x5c2c8a, 0xc7509d, 0xf3b978, bb.min.y, bb.max.y)
        : makeBrandMaterial(0xc7509d, 0xf3b978, 0xffffff, bb.min.y, bb.max.y);

      meshes.push(new THREE.Mesh(geo, mat));
    });

    if (!meshes.length) throw new Error("Logo tracing produced no usable geometry");

    const inner = new THREE.Group();
    meshes.forEach((m) => inner.add(m));

    const box = new THREE.Box3().setFromObject(inner);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    inner.position.sub(center);

    const scale = targetSize / Math.max(size.x, size.y, 0.001);
    const wrapper = new THREE.Group();
    wrapper.add(inner);
    wrapper.scale.setScalar(scale);

    group.add(wrapper);
    animate();
  }

  /* ---------- Fallback: procedural blob (if tracing fails) ---------- */
  function buildFallbackBlob() {
    const geometry = new THREE.IcosahedronGeometry(1.7, 5);
    const material = makeBrandMaterial(0x5c2c8a, 0xc7509d, 0xf3b978, -1.7, 1.7);
    group.add(new THREE.Mesh(geometry, material));
    animate();
  }

  buildLogoEmblem().catch(() => {
    while (group.children.length) group.remove(group.children[0]);
    buildFallbackBlob();
  });
})();
