import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js';

// Design space matches the supplied 1920×1080 train artwork.
const DESIGN_W = 1920;
const DESIGN_H = 1080;
const HORIZON_Y = 640;
// Eastbound artwork: the supplied train mirrored to face right, with its lettering kept readable.
const TRAIN_SRC = '/scene/train-east.webp';
// Points in the train artwork's own pixel coordinates.
const STACK = { x: 1353, y: 212 };
const HEADLAMP = { x: 1567, y: 252 };
// Wheel-on-rail contact points, following the rail line in the artwork.
const WHEEL_CONTACTS = [440, 650, 870, 990, 1110, 1230, 1560, 1700].map((x) => ({ x: 1919 - x, y: 905 - (x - 440) * 0.105 }));
// The artwork's rail: centre line drops RAIL_SLOPE px per px to the right, and the band widens
// with perspective from RAIL_THICKNESS.tail (at the tender) to RAIL_THICKNESS.nose.
const RAIL_SLOPE = 0.109;
const RAIL_CENTER = { x: 9, y: 761 };
const RAIL_THICKNESS = { tail: 34, nose: 68 };
// Artwork x-range the train body occupies (tender rear to cowcatcher).
const BODY = { tail: 24, nose: 1800 };
const TRAIN_SCALE = 0.62;
// The train runs along a fixed scene line: ty = TRACK_C + RAIL_SLOPE * tx keeps its own rail on the
// static track below, so it travels "down" the rail as it crosses from left to right.
const TRACK_C = 264;

const CRUISE_SPEED = 600; // design px / second the scenery pans at

export interface TrainSceneOptions {
  reducedMotion: boolean;
  /** Seconds the train takes to cross from off-screen left to off-screen right (progress 0 → 100%). */
  arrivalSeconds: number;
  onProgress?: (progress: number) => void;
}

export interface TrainSceneHandle {
  destroy: () => void;
}

function canvasTexture(width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) paint(ctx);
  return Texture.from(canvas);
}

function skyTexture() {
  return canvasTexture(8, 512, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#060607');
    g.addColorStop(0.38, '#120d0b');
    g.addColorStop(0.58, '#2e1c10');
    g.addColorStop(0.6, '#402714');
    g.addColorStop(0.64, '#160f0b');
    g.addColorStop(1, '#070606');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 8, 512);
  });
}

function glowTexture(color: string) {
  return canvasTexture(256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  });
}

/** Cone of light fading out to the left; anchored at its right-hand tip. */
function beamTexture() {
  return canvasTexture(512, 256, (ctx) => {
    const along = ctx.createLinearGradient(512, 0, 0, 0);
    along.addColorStop(0, 'rgba(255,220,150,0.55)');
    along.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = along;
    ctx.beginPath();
    ctx.moveTo(512, 118);
    ctx.lineTo(0, 0);
    ctx.lineTo(0, 256);
    ctx.lineTo(512, 138);
    ctx.closePath();
    ctx.fill();
  });
}

/** Horizontal streak used for wind / speed lines. */
function streakTexture() {
  return canvasTexture(256, 4, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 256, 0);
    g.addColorStop(0, 'rgba(255,236,200,0)');
    g.addColorStop(0.7, 'rgba(255,236,200,0.9)');
    g.addColorStop(1, 'rgba(255,236,200,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 4);
  });
}

/** Deterministic pseudo-random so the skyline is identical on every visit. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** A tileable ridge silhouette two design-widths wide, so it can scroll seamlessly. */
function ridge(color: number, alpha: number, baseY: number, amplitude: number, seed: number, mesas: boolean) {
  const rand = seeded(seed);
  const g = new Graphics();
  const step = 48;
  const points: number[] = [];
  const heights: number[] = [];
  for (let x = 0; x <= DESIGN_W; x += step) {
    let h = amplitude * (0.35 + rand() * 0.65);
    if (mesas && rand() > 0.72) h = amplitude * 1.6; // flat-topped mesa shoulders
    heights.push(h);
  }
  heights[heights.length - 1] = heights[0];
  for (let copy = 0; copy < 2; copy++) {
    heights.forEach((h, i) => points.push(copy * DESIGN_W + i * step, baseY - h));
  }
  g.poly([0, DESIGN_H, ...points, DESIGN_W * 2, DESIGN_H]).fill({ color, alpha });
  return g;
}

function telegraphPoles(count: number, color: number) {
  const layer = new Container();
  for (let i = 0; i < count; i++) {
    const pole = new Graphics()
      .rect(-4, -190, 8, 190)
      .fill({ color })
      .rect(-32, -180, 64, 5)
      .fill({ color })
      .rect(-24, -160, 48, 4)
      .fill({ color });
    pole.position.set((i * DESIGN_W * 2) / count, HORIZON_Y + 40);
    layer.addChild(pole);
  }
  return layer;
}

/**
 * The static track the train runs on, drawn to match the artwork's rail at the train's mid-crossing
 * pose: a dark far rail and a worn steel near rail, widening towards the camera on the right.
 */
function track() {
  const midX = DESIGN_W / 2 - (TRAIN_SCALE * DESIGN_W) / 2;
  const centerY = (x: number) =>
    TRACK_C + TRAIN_SCALE * (RAIL_CENTER.y - RAIL_SLOPE * RAIL_CENTER.x) + RAIL_SLOPE * x;
  const thickness = (x: number) => {
    const artX = (x - midX) / TRAIN_SCALE;
    const t = (artX - RAIL_CENTER.x) / (DESIGN_W - 2 * RAIL_CENTER.x);
    return TRAIN_SCALE * Math.max(10, RAIL_THICKNESS.tail + (RAIL_THICKNESS.nose - RAIL_THICKNESS.tail) * t);
  };
  const band = (from: number, to: number) => {
    const xs = [-200, DESIGN_W + 200];
    const top = xs.map((x) => [x, centerY(x) + thickness(x) * (from - 0.5)]);
    const bottom = xs.map((x) => [x, centerY(x) + thickness(x) * (to - 0.5)]).reverse();
    return [...top, ...bottom].flat();
  };
  return new Graphics()
    .poly(band(-0.1, 1.08))
    .fill({ color: 0x0a0806, alpha: 0.85 })
    .poly(band(0, 0.16))
    .fill({ color: 0x3a3229 })
    .poly(band(0.5, 1))
    .fill({ color: 0x6f6556 })
    .poly(band(0.5, 0.6))
    .fill({ color: 0x9a8d78 });
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface Particle {
  sprite: Sprite;
  age: number;
  life: number;
  vx: number;
  vy: number;
  gravity: number;
  grow: number;
  baseScale: number;
  peakAlpha: number;
}

export async function createTrainScene(host: HTMLElement, options: TrainSceneOptions): Promise<TrainSceneHandle> {
  const app = new Application();
  await app.init({
    resizeTo: host,
    backgroundColor: 0x070606,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    preference: 'webgl',
  });
  host.appendChild(app.canvas);
  app.canvas.setAttribute('aria-hidden', 'true');

  // Each scene owns its texture, so a remount (e.g. React Strict Mode) never destroys one still in use.
  const trainImage = new Image();
  trainImage.src = TRAIN_SRC;
  await trainImage.decode();
  const trainTexture = Texture.from(trainImage);
  const generated: Texture[] = [trainTexture];
  const make = (t: Texture) => {
    generated.push(t);
    return t;
  };

  // `camera` takes shake; `world` holds the cover-fit transform.
  const world = new Container();
  const camera = new Container();
  world.addChild(camera);
  app.stage.addChild(world);

  const sky = new Sprite(make(skyTexture()));
  sky.width = DESIGN_W + 200;
  sky.height = DESIGN_H + 120;
  sky.position.set(-100, -60);
  camera.addChild(sky);

  const sunGlow = new Sprite(make(glowTexture('rgba(240,163,68,0.6)')));
  sunGlow.anchor.set(0.5);
  sunGlow.position.set(1500, HORIZON_Y - 10);
  sunGlow.scale.set(5.5, 2.4);
  sunGlow.alpha = 0.6;
  camera.addChild(sunGlow);

  // Depth layers, far to near. `depth` scales both scroll speed and pointer parallax.
  const farRidge = ridge(0x1c130d, 0.95, HORIZON_Y + 4, 110, 7, true);
  const midRidge = ridge(0x140e0a, 1, HORIZON_Y + 24, 70, 13, true);
  const poles = telegraphPoles(7, 0x0c0907);
  const nearRidge = ridge(0x0a0807, 1, HORIZON_Y + 62, 46, 23, false);
  const layers = [
    { node: farRidge, speed: 0.07, depth: 8, x: 0 },
    { node: midRidge, speed: 0.2, depth: 16, x: 0 },
    { node: poles, speed: 1.35, depth: 30, x: 0 },
    { node: nearRidge, speed: 0.55, depth: 40, x: 0 },
  ];
  camera.addChild(farRidge, midRidge, poles, nearRidge);

  // Wind streaks rushing past along the ground and sky.
  const streakTex = make(streakTexture());
  const streaks = Array.from({ length: 26 }, (_, i) => {
    const rand = seeded(300 + i);
    const s = new Sprite(streakTex);
    const low = i % 3 !== 0;
    s.position.set(rand() * DESIGN_W, low ? 700 + rand() * 340 : 140 + rand() * 360);
    s.scale.set(0.8 + rand() * 1.6, 0.5 + rand() * 0.5);
    s.blendMode = 'add';
    camera.addChild(s);
    return { sprite: s, rate: 1.6 + rand() * 1.4, alpha: (low ? 0.12 : 0.06) + rand() * 0.1 };
  });

  // Steam and smoke sit behind the train so they never cover the locomotive's silhouette.
  const smokeLayer = new Container();
  camera.addChild(smokeLayer);

  // Track and train share one pointer-parallax layer, so the train never slips off its rails.
  const trackLayer = new Container();
  trackLayer.addChild(track());

  const trainLayer = new Container();
  trainLayer.scale.set(TRAIN_SCALE);
  trainLayer.addChild(new Sprite(trainTexture));

  // The beam texture points left from its tip; flipped, it throws light ahead of the train.
  const beam = new Sprite(make(beamTexture()));
  beam.anchor.set(1, 0.5);
  beam.position.set(HEADLAMP.x, HEADLAMP.y + 6);
  beam.scale.set(-2.4, 1.6);
  beam.rotation = 0.06;
  beam.blendMode = 'add';
  trainLayer.addChild(beam);

  const headlamp = new Sprite(make(glowTexture('rgba(255,214,140,0.95)')));
  headlamp.anchor.set(0.5);
  headlamp.position.set(HEADLAMP.x, HEADLAMP.y);
  headlamp.scale.set(1.1);
  headlamp.blendMode = 'add';
  trainLayer.addChild(headlamp);
  trackLayer.addChild(trainLayer);
  camera.addChild(trackLayer);

  // Enters with the cowcatcher just off-screen left, ends with the tender just off-screen right.
  const startX = -TRAIN_SCALE * BODY.nose - 120;
  const endX = DESIGN_W + 120 - TRAIN_SCALE * BODY.tail;

  // Sparks and track dust fly in front of the wheels.
  const fxLayer = new Container();
  camera.addChild(fxLayer);

  // Dust motes catching the low sun, nearest plane.
  const moteTexture = make(glowTexture('rgba(255,228,180,0.9)'));
  const motes = Array.from({ length: 40 }, (_, i) => {
    const rand = seeded(100 + i);
    const mote = new Sprite(moteTexture);
    mote.anchor.set(0.5);
    mote.scale.set(0.02 + rand() * 0.04);
    mote.alpha = 0.15 + rand() * 0.35;
    mote.position.set(rand() * DESIGN_W, 120 + rand() * 860);
    camera.addChild(mote);
    return { sprite: mote, drift: 0.25 + rand() * 0.5, phase: rand() * Math.PI * 2 };
  });

  const vignette = new Sprite(
    make(
      canvasTexture(512, 288, (ctx) => {
        const g = ctx.createRadialGradient(256, 150, 60, 256, 150, 300);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,0.8)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 512, 288);
      }),
    ),
  );
  vignette.width = DESIGN_W;
  vignette.height = DESIGN_H;
  world.addChild(vignette);

  const steamTexture = make(glowTexture('rgba(226,216,202,0.6)'));
  const smokeTexture = make(glowTexture('rgba(70,60,52,0.75)'));
  const sparkTexture = make(glowTexture('rgba(255,170,60,1)'));
  const dustTexture = make(glowTexture('rgba(150,112,76,0.55)'));
  const particles: Particle[] = [];

  const toScene = (p: { x: number; y: number }) => ({
    x: trackLayer.x + trainLayer.x + p.x * trainLayer.scale.x,
    y: trackLayer.y + trainLayer.y + p.y * trainLayer.scale.y,
  });

  const spawn = (layer: Container, texture: Texture, at: { x: number; y: number }, p: Omit<Particle, 'sprite' | 'age'>) => {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.position.set(at.x, at.y);
    sprite.scale.set(p.baseScale);
    sprite.alpha = 0;
    if (texture === sparkTexture) sprite.blendMode = 'add';
    layer.addChild(sprite);
    particles.push({ sprite, age: 0, ...p });
  };

  const layout = () => {
    const { width, height } = app.screen;
    // Slight overscan so camera shake and parallax never reveal an edge.
    const scale = Math.max(width / DESIGN_W, height / DESIGN_H) * 1.04;
    world.scale.set(scale);
    world.position.set((width - DESIGN_W * scale) / 2, (height - DESIGN_H * scale) / 2);
  };
  layout();
  app.renderer.on('resize', layout);

  // Pointer parallax: near layers swing further than far ones.
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (event: PointerEvent) => {
    pointer.tx = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (event.clientY / window.innerHeight) * 2 - 1;
  };
  if (!options.reducedMotion) window.addEventListener('pointermove', onPointer, { passive: true });

  const startedAt = performance.now();
  let smokeClock = 0;
  let sparkClock = 0;
  let dustClock = 0;

  const tick = () => {
    // Motion uses a clamped frame delta; the arrival itself follows the wall clock,
    // so a throttled background tab cannot stall the onboarding.
    const dt = Math.min(app.ticker.deltaMS / 1000, 0.05);
    const elapsed = (performance.now() - startedAt) / 1000;
    const progress = options.reducedMotion ? 1 : Math.min(1, elapsed / options.arrivalSeconds);
    // Reduced motion shows a single still with the train mid-crossing.
    const travel = options.reducedMotion ? 0.5 : progress;
    const speed = CRUISE_SPEED;

    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;

    // Eastbound: the camera pans with the train, so the land slides away to the left.
    for (const layer of layers) {
      layer.x = (((layer.x - speed * layer.speed * dt) % DESIGN_W) + DESIGN_W) % DESIGN_W;
      layer.node.x = layer.x - DESIGN_W - pointer.x * layer.depth;
      layer.node.y = -pointer.y * layer.depth * 0.4;
    }
    sunGlow.x = 1500 - pointer.x * 4;
    sky.x = -100 - pointer.x * 3;

    for (const streak of streaks) {
      streak.sprite.x -= speed * streak.rate * dt;
      if (streak.sprite.x < -720) streak.sprite.x = DESIGN_W + 200 + Math.random() * 400;
      streak.sprite.alpha = streak.alpha;
    }

    // The train crosses the frame along the track; chatter and rocking ride on top of that path.
    const chatter = Math.sin(elapsed * 31) * 1.6 + Math.sin(elapsed * 53) * 0.9 + (Math.random() - 0.5) * 1.4;
    const tx = lerp(startX, endX, travel);
    trackLayer.position.set(pointer.x * 18, pointer.y * 10);
    trainLayer.x = tx + Math.sin(elapsed * 7.3) * 1.5;
    trainLayer.y = TRACK_C + RAIL_SLOPE * tx + chatter;
    trainLayer.rotation = Math.sin(elapsed * 4.1) * 0.0022 + Math.sin(elapsed * 11) * 0.0012;

    headlamp.alpha = 0.8 + Math.sin(elapsed * 13) * 0.08 + (Math.random() - 0.5) * 0.12;
    beam.alpha = 0.55 + Math.sin(elapsed * 9) * 0.08;

    // Camera shake from the running train.
    camera.position.set((Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 2);

    for (const mote of motes) {
      mote.sprite.x -= speed * mote.drift * dt;
      if (mote.sprite.x < -20) mote.sprite.x = DESIGN_W + 20;
      mote.sprite.y += Math.sin(elapsed * 1.6 + mote.phase) * 10 * dt;
    }

    if (!options.reducedMotion) {
      const stack = toScene(STACK);
      smokeClock += dt * 22;
      while (smokeClock >= 1) {
        smokeClock -= 1;
        const dark = Math.random() < 0.45;
        spawn(smokeLayer, dark ? smokeTexture : steamTexture, { x: stack.x + Math.random() * 8, y: stack.y }, {
          life: 1.6 + Math.random() * 1.2,
          vx: -60 - speed * 0.25 - Math.random() * 120,
          vy: -150 - Math.random() * 90,
          gravity: 70,
          grow: 1.6 + Math.random() * 1.2,
          baseScale: 0.22,
          peakAlpha: dark ? 0.6 : 0.5,
        });
      }

      sparkClock += dt * 26;
      while (sparkClock >= 1) {
        sparkClock -= 1;
        const contact = toScene(WHEEL_CONTACTS[Math.floor(Math.random() * WHEEL_CONTACTS.length)]);
        spawn(fxLayer, sparkTexture, contact, {
          life: 0.35 + Math.random() * 0.35,
          vx: -(200 + Math.random() * 420),
          vy: -120 - Math.random() * 260,
          gravity: 1400,
          grow: -0.2,
          baseScale: 0.07 + Math.random() * 0.06,
          peakAlpha: 1,
        });
      }

      dustClock += dt * 14;
      while (dustClock >= 1) {
        dustClock -= 1;
        const contact = toScene(WHEEL_CONTACTS[Math.floor(Math.random() * WHEEL_CONTACTS.length)]);
        spawn(fxLayer, dustTexture, { x: contact.x, y: contact.y + 10 }, {
          life: 0.9 + Math.random() * 0.8,
          vx: -(120 + speed * 0.2),
          vy: -40 - Math.random() * 40,
          gravity: 0,
          grow: 1.4,
          baseScale: 0.18,
          peakAlpha: 0.4,
        });
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      const t = p.age / p.life;
      if (t >= 1) {
        p.sprite.destroy();
        particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;
      p.sprite.scale.set(Math.max(0.01, p.baseScale * (1 + t * p.grow * 4)));
      p.sprite.alpha = (t < 0.12 ? t / 0.12 : 1 - (t - 0.12) / 0.88) * p.peakAlpha;
    }

    options.onProgress?.(progress);
  };

  if (options.reducedMotion) {
    // Render one composed still frame; no continuous motion.
    tick();
    camera.position.set(0, 0);
    app.render();
    app.ticker.stop();
  } else {
    app.ticker.add(tick);
  }

  let destroyed = false;
  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      window.removeEventListener('pointermove', onPointer);
      app.renderer.off('resize', layout);
      app.ticker.remove(tick);
      app.destroy({ removeView: true }, { children: true, texture: false });
      generated.forEach((t) => t.destroy(true));
    },
  };
}
