// “生产力粒子”：贯穿全站的 three.js 粒子系统
// 每个粒子有 aFrom / aTo 两组坐标，uProgress 驱动着色器内插值，实现形状变形
import * as THREE from 'three';
import gsap from 'gsap';
import { SHAPE_BUILDERS, glyph } from './shapes.js';

const VERT = /* glsl */ `
  attribute vec3 aFrom;
  attribute vec3 aTo;
  attribute float aRand;
  attribute vec3 aColor;
  uniform float uProgress;
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform vec2 uMouse;
  varying vec3 vColor;
  varying float vAlpha;

  float easeInOut(float t) { return t < .5 ? 4. * t * t * t : 1. - pow(-2. * t + 2., 3.) / 2.; }

  void main() {
    float p = easeInOut(clamp((uProgress - aRand * .35) / .65, 0., 1.));
    vec3 pos = mix(aFrom, aTo, p);

    // 变形途中的涡旋
    float mid = sin(p * 3.14159);
    pos.xy += mid * .28 * vec2(sin(aRand * 40. + uTime), cos(aRand * 30. + uTime));
    pos.z  += mid * .4 * sin(aRand * 23.);

    // 静止时的呼吸
    pos.x += sin(uTime * .6 + aRand * 20.) * .01;
    pos.y += cos(uTime * .5 + aRand * 17.) * .01;
    pos.z += sin(uTime * .4 + aRand * 11.) * .03;

    // 鼠标排斥
    vec2 d = pos.xy - uMouse;
    float dist = length(d);
    pos.xy += normalize(d + 1e-5) * smoothstep(.32, 0., dist) * .16;

    vec4 mv = modelViewMatrix * vec4(pos, 1.);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixelRatio * (.55 + aRand * .9) * (3. / -mv.z);
    vColor = aColor;
    vAlpha = .5 + .5 * fract(aRand * 7.31);
  }
`;

const FRAG = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - .5);
    if (d > .5) discard;
    gl_FragColor = vec4(vColor, smoothstep(.5, .28, d) * vAlpha * uOpacity);
  }
`;

const PALETTE = [
  ['#2F5573', 0.62],
  ['#5785AA', 0.18],
  ['#BF5A45', 0.14],
  ['#C99A4B', 0.06],
];

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class ParticleField {
  constructor(canvas, { count = 14000 } = {}) {
    this.canvas = canvas;
    this.count = count;
    this.shapes = {};
    this.extent = {};
    this.current = null;
    this.anchorEl = null;
    this.anchorFill = 0.8;
    this.visible = false;
    this.spin = 0;
    this.mouse = new THREE.Vector2(99, 99);
    this.pointerNdc = new THREE.Vector2(0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    this.camera.position.z = 4.2;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.#buildGeometry();
    this.resize();

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('pointermove', (e) => {
      this.pointerNdc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    });

    this.clock = new THREE.Clock();
    this._tick = () => this.#loop();
    requestAnimationFrame(this._tick);
  }

  #buildGeometry() {
    const n = this.count;
    const geo = new THREE.BufferGeometry();
    const from = new Float32Array(n * 3);
    const to = new Float32Array(n * 3);
    const rand = new Float32Array(n);
    const col = new Float32Array(n * 3);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      rand[i] = Math.random();
      let r = Math.random(), acc = 0;
      for (const [hex, w] of PALETTE) { acc += w; if (r <= acc) { c.set(hex); break; } }
      col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(to, 3)); // 仅用于包围盒
    geo.setAttribute('aFrom', new THREE.BufferAttribute(from, 3));
    geo.setAttribute('aTo', new THREE.BufferAttribute(to, 3));
    geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10);

    this.uniforms = {
      uProgress: { value: 1 },
      uTime: { value: 0 },
      uSize: { value: 3.4 },
      uPixelRatio: { value: this.renderer.getPixelRatio() },
      uMouse: { value: this.mouse },
      uOpacity: { value: 1 },
    };
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, uniforms: this.uniforms,
      transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    });
    this.geo = geo;
    this.points = new THREE.Points(geo, mat);
    this.group.add(this.points);
  }

  #shape(name) {
    if (!this.shapes[name]) {
      const arr = name.startsWith('glyph:') ? glyph(this.count, name.slice(6)) : SHAPE_BUILDERS[name](this.count);
      let mx = 0;
      for (let i = 0; i < arr.length; i += 3) mx = Math.max(mx, Math.abs(arr[i]));
      this.shapes[name] = arr;
      this.extent[name] = mx;
    }
    return this.shapes[name];
  }

  /** 当前（可能处于变形中途）的粒子坐标 */
  #currentPositions() {
    const from = this.geo.attributes.aFrom.array;
    const to = this.geo.attributes.aTo.array;
    const rand = this.geo.attributes.aRand.array;
    const P = this.uniforms.uProgress.value;
    if (P >= 1) return to.slice();
    const out = new Float32Array(to.length);
    for (let i = 0; i < this.count; i++) {
      const p = easeInOut(Math.min(1, Math.max(0, (P - rand[i] * 0.35) / 0.65)));
      for (let k = 0; k < 3; k++) out[i * 3 + k] = from[i * 3 + k] + (to[i * 3 + k] - from[i * 3 + k]) * p;
    }
    return out;
  }

  /** 首次设置形状（无动画） */
  set(name) {
    const s = this.#shape(name);
    this.geo.attributes.aFrom.array.set(s);
    this.geo.attributes.aTo.array.set(s);
    this.geo.attributes.aFrom.needsUpdate = this.geo.attributes.aTo.needsUpdate = true;
    this.uniforms.uProgress.value = 1;
    this.current = name;
  }

  morphTo(name, duration = 1.8) {
    if (this.current === name) return;
    if (!this.current) return this.set(name);
    const cur = this.#currentPositions();
    this.geo.attributes.aFrom.array.set(cur);
    this.geo.attributes.aTo.array.set(this.#shape(name));
    this.geo.attributes.aFrom.needsUpdate = this.geo.attributes.aTo.needsUpdate = true;
    this.current = name;
    gsap.killTweensOf(this.uniforms.uProgress);
    this.uniforms.uProgress.value = 0;
    gsap.to(this.uniforms.uProgress, { value: 1, duration, ease: 'none' });
    this.#applyAnchor(true);
  }

  /** 把粒子团对齐到某个 DOM 元素（null = 视口中心） */
  anchor(el, fill = 0.8, animate = true) {
    this.anchorEl = el;
    this.anchorFill = fill;
    this.#applyAnchor(animate);
  }

  #applyAnchor(animate) {
    const vw = window.innerWidth, vh = window.innerHeight;
    const halfH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.camera.position.z;
    const halfW = halfH * this.camera.aspect;
    let cx = vw / 2, cy = vh / 2, size = Math.min(vw, vh);
    if (this.anchorEl) {
      const r = this.anchorEl.getBoundingClientRect();
      cx = r.left + r.width / 2; cy = r.top + r.height / 2; size = Math.min(r.width, r.height);
    }
    const x = (cx / vw * 2 - 1) * halfW;
    const y = -(cy / vh * 2 - 1) * halfH;
    let s = (size / vh) * halfH * this.anchorFill;
    const ext = this.extent[this.current] ?? 1;
    s = Math.min(s, (halfW * 0.92) / ext);
    const target = { x, y, s };
    if (animate) {
      gsap.to(this.group.position, { x: target.x, y: target.y, duration: 1.4, ease: 'expo.out' });
      gsap.to(this.group.scale, { x: s, y: s, z: s, duration: 1.4, ease: 'expo.out' });
    } else {
      this.group.position.set(target.x, target.y, 0);
      this.group.scale.setScalar(s);
    }
  }

  /** 显隐：淡入淡出画布，隐藏时停止渲染 */
  show(on, duration = 1, level = 1, owner = null) {
    if (on) this.owner = owner;
    else if (owner && this.owner && this.owner !== owner) return;
    const target = on ? level : 0;
    if (this.level === target) return;
    this.level = target;
    this.visible = on;
    gsap.to(this.canvas, { opacity: target, duration, ease: 'power2.out', overwrite: true });
  }

  setSpin(v) {
    this.spin = v;
    if (v === 0) {
      const y = this.points.rotation.y;
      gsap.to(this.points.rotation, { y: Math.round(y / (Math.PI * 2)) * Math.PI * 2, duration: 1.2, ease: 'expo.out' });
    }
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.current) this.#applyAnchor(false);
  }

  #loop() {
    requestAnimationFrame(this._tick);
    const dt = this.clock.getDelta();
    if (parseFloat(this.canvas.style.opacity || 0) < 0.01) return;
    this.uniforms.uTime.value += dt;

    // 鼠标位置换算到粒子团的局部坐标
    const v = new THREE.Vector3(this.pointerNdc.x, this.pointerNdc.y, 0.5).unproject(this.camera);
    const dir = v.sub(this.camera.position).normalize();
    const hit = this.camera.position.clone().add(dir.multiplyScalar(-this.camera.position.z / dir.z));
    this.group.worldToLocal(hit);
    this.mouse.set(hit.x, hit.y);

    // 视差旋转 + 自转
    const targetY = this.pointerNdc.x * 0.22;
    const targetX = -this.pointerNdc.y * 0.12;
    this.points.rotation.y += this.spin * dt;
    this.group.rotation.y += (targetY - this.group.rotation.y) * 0.04;
    this.group.rotation.x += (targetX - this.group.rotation.x) * 0.04;
    this.renderer.render(this.scene, this.camera);
  }
}
