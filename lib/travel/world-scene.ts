import {
  type GeoPermissibleObjects,
  type GeoProjection,
  geoContains,
  geoDistance,
  geoEqualEarth,
  geoEqualEarthRaw,
  geoGraticule10,
  geoOrthographic,
  geoOrthographicRaw,
  geoPath,
  geoProjectionMutator,
} from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { COUNTRIES } from "./countries";

export type WorldMode = "globe" | "map";

export type WorldPalette = {
  ocean: string;
  land: string;
  border: string;
  visited: string;
  visitedBorder: string;
  hover: string;
  grid: string;
  glow: string;
  shade: string;
  ink: string;
};

export type WorldCallbacks = {
  onToggle: (code: string) => void;
  onHover: (code: string | null, x: number, y: number) => void;
  onZoom: (zoom: number) => void;
};

export type WorldScene = {
  resize: (width: number, height: number) => void;
  setPalette: (palette: WorldPalette) => void;
  setVisited: (codes: ReadonlySet<string>, reveal: boolean) => void;
  setMode: (mode: WorldMode) => void;
  setZoom: (zoom: number) => void;
  focus: (code: string) => void;
  destroy: () => void;
};

type Shape = { code: string; point: [number, number]; feature: Feature<Geometry> };
type Dot = { code: string; point: [number, number] };
type Mark = { value: number; target: number; startAt: number };
type Ripple = { point: [number, number]; born: number };
type Flight = { from: [number, number]; to: [number, number]; fromPan: number; toPan: number; born: number };

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

const SPHERE: GeoPermissibleObjects = { type: "Sphere" };
const GRATICULE = geoGraticule10();
const HOME: [number, number] = [115, 5];
const FLAT_HALF_WIDTH = 2.7067;
const FLAT_HALF_HEIGHT = 1.3174;
const INTRO_MS = 1600;
const MORPH_MS = 1100;
const MARK_MS = 320;
const RIPPLE_MS = 650;
const PULSE_MS = 1100;
const FLIGHT_MS = 900;
const REVEAL_DELAY_MS = 700;
const REVEAL_SPAN_MS = 1400;
const IDLE_BEFORE_SPIN_MS = 2500;
const SPIN_DEG_PER_MS = 0.004;
const MAX_TILT = 78;
const TAP_SLOP = 6;
const DOT_RADIUS = 3.5;
const DOT_HIT = 10;
const FADE_BAND = 0.3;
const TO_DEGREES = 180 / Math.PI;
const FLAT_FILL = 0.86;
const PAN_KEY_STEP = 0.2;

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high);
const easeOut = (progress: number) => 1 - (1 - progress) ** 3;
const easeInOut = (progress: number) =>
  progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;

function wrapLongitude(longitude: number): number {
  return ((((longitude + 180) % 360) + 360) % 360) - 180;
}

function shortestTurn(from: number, to: number): number {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

function asPoint(point: number[]): [number, number] {
  return [point[0], point[1]];
}

function readWorld(topology: Topology): { shapes: Shape[]; land: FeatureCollection; dots: Dot[] } {
  const collection = feature(topology, topology.objects.countries as GeometryCollection) as FeatureCollection;
  const byId = new Map(collection.features.map((entry) => [String(entry.id), entry]));
  const shapes: Shape[] = [];
  const dots: Dot[] = [];
  for (const country of COUNTRIES) {
    const shape = byId.get(country.id);
    if (country.dot || !shape) dots.push({ code: country.code, point: asPoint(country.point) });
    else shapes.push({ code: country.code, point: asPoint(country.point), feature: shape });
  }
  return { shapes, land: collection, dots };
}

export function createWorldScene(
  canvas: HTMLCanvasElement,
  topology: Topology,
  callbacks: WorldCallbacks,
  reduceMotion: boolean,
): WorldScene {
  const found = canvas.getContext("2d");
  if (!found) throw new Error("Canvas 2D is not available");
  const context: CanvasRenderingContext2D = found;

  const { shapes, land, dots } = readWorld(topology);
  const shapeByCode = new Map(shapes.map((shape) => [shape.code, shape]));
  const pointByCode = new Map([...shapes, ...dots].map((entry) => [entry.code, entry.point]));

  const globe = geoOrthographic().clipAngle(90).precision(0.3);
  const flat = geoEqualEarth().precision(0.3);
  const mutate = geoProjectionMutator((alpha: number) => (lambda: number, phi: number) => {
    const round = geoOrthographicRaw(lambda, phi);
    const spread = geoEqualEarthRaw(lambda, phi);
    return [mix(round[0], spread[0], alpha), mix(round[1], spread[1], alpha)];
  }) as (alpha: number) => GeoProjection;
  const blend = mutate(0).precision(0.3);

  let width = 1;
  let height = 1;
  let palette: WorldPalette | null = null;
  let centerLon = HOME[0];
  let centerLat = HOME[1];
  let viewLon = HOME[0];
  let lastMoveAt = 0;
  let zoom = 1;
  let zoomTarget = 1;
  let morph = 0;
  let morphTarget = 0;
  let hover: string | null = null;
  let pulse: { code: string; born: number } | null = null;
  let flight: Flight | null = null;
  let velocityLon = 0;
  let velocityLat = 0;
  let panRaw = 0;
  let keyboardFocus = false;
  let lastInteraction = 0;
  let lastFrame = performance.now();
  let frame = 0;
  let destroyed = false;
  let pointerInside = false;
  const born = performance.now();
  const marks = new Map<string, Mark>();
  const ripples: Ripple[] = [];
  const pointers = new Map<number, { x: number; y: number }>();
  let dragStart: { x: number; y: number; moved: number; at: number } | null = null;
  let pinch: { distance: number; zoom: number } | null = null;

  const introProgress = (now: number) => (reduceMotion ? 1 : clamp((now - born) / INTRO_MS, 0, 1));
  const globeRadius = (now: number) =>
    Math.min(width, height) * 0.42 * zoom * mix(0.86, 1, easeOut(introProgress(now)));
  const flatScale = () =>
    Math.min((width * FLAT_FILL) / (2 * FLAT_HALF_WIDTH), (height * FLAT_FILL) / (2 * FLAT_HALF_HEIGHT)) * zoom;
  const panLimit = () => Math.max(0, FLAT_HALF_HEIGHT - (height * FLAT_FILL) / 2 / flatScale());
  const atRest = () => morph === 0 || morph === 1;

  function projectionFor(now: number): GeoProjection {
    const centre: [number, number] = [width / 2, height / 2];
    viewLon = centerLon + (1 - easeOut(introProgress(now))) * -150;
    if (morph === 0) return globe.scale(globeRadius(now)).translate(centre).rotate([-viewLon, -centerLat]);
    const shift = panRaw * flatScale();
    if (morph === 1) {
      return flat.scale(flatScale()).translate([centre[0], centre[1] + shift]).rotate([-centerLon, 0]);
    }
    const eased = easeInOut(morph);
    mutate(eased);
    return blend
      .scale(mix(globeRadius(now), flatScale(), eased))
      .translate([centre[0], centre[1] + shift * eased])
      .rotate([-centerLon, -centerLat * (1 - eased)]);
  }

  function visibility(point: [number, number]): number {
    if (morph === 1) return 1;
    if (morph === 0) return geoDistance([viewLon, centerLat], point) < Math.PI / 2 - 0.03 ? 1 : 0;
    const eased = easeInOut(morph);
    const allowed = (Math.PI / 2) * (1 + eased);
    const distance = geoDistance([centerLon, centerLat * (1 - eased)], point);
    return clamp((allowed + FADE_BAND - distance) / FADE_BAND, 0, 1);
  }

  function markValue(code: string): number {
    return marks.get(code)?.value ?? 0;
  }

  function drawShading(now: number, colors: WorldPalette, globeWeight: number) {
    if (globeWeight <= 0) return;
    const radius = globeRadius(now);
    const light = context.createRadialGradient(
      width / 2 - radius * 0.4,
      height / 2 - radius * 0.45,
      radius * 0.05,
      width / 2,
      height / 2,
      radius,
    );
    light.addColorStop(0, "rgb(255 255 255 / 0.2)");
    light.addColorStop(0.55, "rgb(255 255 255 / 0)");
    light.addColorStop(1, colors.shade);
    context.globalAlpha = globeWeight;
    context.fillStyle = light;
    context.beginPath();
    context.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
  }

  function draw(now: number) {
    const colors = palette;
    if (!colors) return;
    const projection = projectionFor(now);
    const path = geoPath(projection, context);
    const eased = atRest() ? morph : easeInOut(morph);
    const globeWeight = 1 - eased;
    const fadeIn = reduceMotion ? 1 : clamp(introProgress(now) * 3, 0, 1);

    context.clearRect(0, 0, width, height);
    context.globalAlpha = fadeIn;
    context.beginPath();
    path(SPHERE);
    context.shadowColor = colors.glow;
    context.shadowBlur = Math.min(width, height) * 0.06 * globeWeight;
    context.fillStyle = colors.ocean;
    context.fill();
    context.shadowBlur = 0;

    context.beginPath();
    path(GRATICULE);
    context.lineWidth = 0.5;
    context.strokeStyle = colors.grid;
    context.stroke();

    context.lineJoin = "round";
    context.lineWidth = 0.6;
    if (atRest()) {
      context.beginPath();
      path(land);
      context.fillStyle = colors.land;
      context.fill();
      context.strokeStyle = colors.border;
      context.stroke();
    } else {
      for (const shape of shapes) {
        const seen = visibility(shape.point);
        if (seen <= 0) continue;
        context.globalAlpha = fadeIn * seen;
        context.beginPath();
        path(shape.feature);
        context.fillStyle = colors.land;
        context.fill();
        context.strokeStyle = colors.border;
        context.stroke();
      }
      context.globalAlpha = fadeIn;
    }

    for (const [code, mark] of marks) {
      const shape = shapeByCode.get(code);
      if (!shape || mark.value <= 0) continue;
      const seen = atRest() ? 1 : visibility(shape.point);
      if (seen <= 0) continue;
      context.globalAlpha = fadeIn * seen * mark.value;
      context.beginPath();
      path(shape.feature);
      context.fillStyle = colors.visited;
      context.fill();
      context.lineWidth = 1;
      context.strokeStyle = colors.visitedBorder;
      context.stroke();
    }
    context.globalAlpha = fadeIn;

    const hovered = hover ? shapeByCode.get(hover) : undefined;
    if (hovered) {
      context.beginPath();
      path(hovered.feature);
      context.fillStyle = colors.hover;
      context.fill();
      context.lineWidth = 1.5;
      context.strokeStyle = colors.visitedBorder;
      context.stroke();
    }

    if (pulse) {
      const progress = (now - pulse.born) / PULSE_MS;
      const target = shapeByCode.get(pulse.code);
      if (progress >= 1) pulse = null;
      else if (target && progress >= 0) {
        context.globalAlpha = fadeIn * (1 - progress);
        context.beginPath();
        path(target.feature);
        context.lineWidth = 1.5 + 4 * progress;
        context.strokeStyle = colors.visited;
        context.stroke();
        context.globalAlpha = fadeIn;
      }
    }

    for (const dot of dots) {
      const seen = visibility(dot.point);
      if (seen <= 0) continue;
      const spot = projection(dot.point);
      if (!spot) continue;
      const value = markValue(dot.code);
      const radius = dot.code === hover ? DOT_RADIUS + 2 : DOT_RADIUS;
      context.globalAlpha = fadeIn * seen;
      context.beginPath();
      context.arc(spot[0], spot[1], radius, 0, Math.PI * 2);
      context.fillStyle = colors.land;
      context.fill();
      context.lineWidth = 1;
      context.strokeStyle = colors.border;
      context.stroke();
      if (value > 0) {
        context.globalAlpha = fadeIn * seen * value;
        context.fillStyle = colors.visited;
        context.fill();
      }
    }
    context.globalAlpha = fadeIn;

    drawShading(now, colors, globeWeight * fadeIn);

    for (let index = ripples.length - 1; index >= 0; index -= 1) {
      const ripple = ripples[index];
      const progress = (now - ripple.born) / RIPPLE_MS;
      if (progress >= 1) {
        ripples.splice(index, 1);
        continue;
      }
      const spot = projection(ripple.point);
      if (!spot || progress < 0 || visibility(ripple.point) <= 0) continue;
      context.globalAlpha = (1 - progress) * 0.9;
      context.beginPath();
      context.arc(spot[0], spot[1], 6 + 36 * easeOut(progress), 0, Math.PI * 2);
      context.lineWidth = 2;
      context.strokeStyle = colors.visited;
      context.stroke();
    }

    context.globalAlpha = fadeIn;
    context.beginPath();
    path(SPHERE);
    context.lineWidth = 1;
    context.strokeStyle = colors.border;
    context.stroke();

    if (keyboardFocus) {
      context.beginPath();
      context.arc(width / 2, height / 2, 10, 0, Math.PI * 2);
      context.moveTo(width / 2 - 18, height / 2);
      context.lineTo(width / 2 - 13, height / 2);
      context.moveTo(width / 2 + 13, height / 2);
      context.lineTo(width / 2 + 18, height / 2);
      context.moveTo(width / 2, height / 2 - 18);
      context.lineTo(width / 2, height / 2 - 13);
      context.moveTo(width / 2, height / 2 + 13);
      context.lineTo(width / 2, height / 2 + 18);
      context.lineWidth = 2;
      context.strokeStyle = colors.ink;
      context.stroke();
    }
    context.globalAlpha = 1;
  }

  function step(now: number) {
    const elapsed = Math.min(now - lastFrame, 64);
    lastFrame = now;

    if (morph !== morphTarget) {
      const direction = morphTarget > morph ? 1 : -1;
      morph = reduceMotion ? morphTarget : clamp(morph + (direction * elapsed) / MORPH_MS, 0, 1);
    }
    if (zoom !== zoomTarget) {
      const next = mix(zoom, zoomTarget, reduceMotion ? 1 : 1 - Math.exp(-elapsed / 90));
      zoom = Math.abs(next - zoomTarget) < 0.002 ? zoomTarget : next;
    }
    for (const [code, mark] of marks) {
      if (now < mark.startAt || mark.value === mark.target) continue;
      const direction = mark.target > mark.value ? 1 : -1;
      mark.value = reduceMotion ? mark.target : clamp(mark.value + (direction * elapsed) / MARK_MS, 0, 1);
      if (mark.value === 0 && mark.target === 0) marks.delete(code);
    }

    if (flight) {
      const progress = clamp((now - flight.born) / FLIGHT_MS, 0, 1);
      const eased = easeInOut(progress);
      centerLon = wrapLongitude(flight.from[0] + shortestTurn(flight.from[0], flight.to[0]) * eased);
      centerLat = mix(flight.from[1], flight.to[1], eased);
      panRaw = mix(flight.fromPan, flight.toPan, eased);
      if (progress === 1) flight = null;
    } else if (!dragStart && (velocityLon !== 0 || velocityLat !== 0)) {
      centerLon = wrapLongitude(centerLon + velocityLon * elapsed);
      if (morph === 1) panRaw += velocityLat * elapsed;
      else centerLat = clamp(centerLat + velocityLat * elapsed, -MAX_TILT, MAX_TILT);
      const decay = Math.exp(-elapsed / 280);
      velocityLon = Math.abs(velocityLon) < 0.0004 ? 0 : velocityLon * decay;
      velocityLat = Math.abs(velocityLat) < 0.0004 ? 0 : velocityLat * decay;
    } else if (
      !reduceMotion &&
      !dragStart &&
      !pointerInside &&
      morph === 0 &&
      introProgress(now) === 1 &&
      now - lastInteraction > IDLE_BEFORE_SPIN_MS
    ) {
      centerLon = wrapLongitude(centerLon + SPIN_DEG_PER_MS * elapsed);
    }
    panRaw = clamp(panRaw, -panLimit(), panLimit());
  }

  function loop(now: number) {
    if (destroyed) return;
    step(now);
    draw(now);
    frame = requestAnimationFrame(loop);
  }

  function pick(x: number, y: number): string | null {
    if (!atRest()) return null;
    const now = performance.now();
    const projection = projectionFor(now);
    for (const dot of dots) {
      if (visibility(dot.point) < 1) continue;
      const spot = projection(dot.point);
      if (spot && Math.hypot(spot[0] - x, spot[1] - y) <= DOT_HIT) return dot.code;
    }
    if (morph === 0 && Math.hypot(x - width / 2, y - height / 2) > globeRadius(now)) return null;
    const located = projection.invert?.([x, y]);
    if (!located || !Number.isFinite(located[0]) || !Number.isFinite(located[1])) return null;
    const back = projection(located);
    if (!back || Math.hypot(back[0] - x, back[1] - y) > 2) return null;
    return shapes.find((shape) => geoContains(shape.feature, located))?.code ?? null;
  }

  function local(event: PointerEvent | WheelEvent): { x: number; y: number } {
    const box = canvas.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }

  function setHover(code: string | null, x: number, y: number) {
    hover = code;
    canvas.style.cursor = code ? "pointer" : "grab";
    callbacks.onHover(code, x, y);
  }

  function toggleAt(x: number, y: number) {
    const code = pick(x, y);
    if (!code) return;
    const point = pointByCode.get(code);
    if (point) ripples.push({ point, born: performance.now() });
    callbacks.onToggle(code);
  }

  function applyZoom(next: number, immediate: boolean) {
    zoomTarget = clamp(next, MIN_ZOOM, MAX_ZOOM);
    if (immediate) zoom = zoomTarget;
    callbacks.onZoom(zoomTarget);
  }

  function handleDown(event: PointerEvent) {
    canvas.setPointerCapture(event.pointerId);
    keyboardFocus = false;
    const spot = local(event);
    pointers.set(event.pointerId, spot);
    lastInteraction = performance.now();
    flight = null;
    velocityLon = 0;
    velocityLat = 0;
    if (pointers.size === 2) {
      const [first, second] = [...pointers.values()];
      pinch = { distance: Math.hypot(first.x - second.x, first.y - second.y), zoom };
      dragStart = null;
      return;
    }
    dragStart = { x: spot.x, y: spot.y, moved: 0, at: lastInteraction };
    canvas.style.cursor = "grabbing";
  }

  function handleMove(event: PointerEvent) {
    const spot = local(event);
    const previous = pointers.get(event.pointerId);
    if (!previous) {
      if (event.pointerType === "mouse") setHover(pick(spot.x, spot.y), spot.x, spot.y);
      return;
    }
    pointers.set(event.pointerId, spot);
    lastInteraction = performance.now();

    if (pinch && pointers.size === 2) {
      const [first, second] = [...pointers.values()];
      const distance = Math.hypot(first.x - second.x, first.y - second.y);
      applyZoom((pinch.zoom * distance) / pinch.distance, true);
      return;
    }
    if (!dragStart) return;

    const moveX = spot.x - previous.x;
    const moveY = spot.y - previous.y;
    dragStart.moved += Math.hypot(moveX, moveY);
    if (dragStart.moved < TAP_SLOP) return;
    if (hover) setHover(null, spot.x, spot.y);
    canvas.style.cursor = "grabbing";

    const now = performance.now();
    const degreesPerPixel =
      morph === 1 ? 360 / (2 * FLAT_HALF_WIDTH * flatScale()) : TO_DEGREES / globeRadius(now);
    const turnLon = -moveX * degreesPerPixel;
    const turnLat = morph === 1 ? moveY / flatScale() : moveY * degreesPerPixel;
    centerLon = wrapLongitude(centerLon + turnLon);
    if (morph === 1) panRaw = clamp(panRaw + turnLat, -panLimit(), panLimit());
    else centerLat = clamp(centerLat + turnLat, -MAX_TILT, MAX_TILT);
    velocityLon = turnLon / 16;
    velocityLat = turnLat / 16;
    lastMoveAt = now;
  }

  function handleUp(event: PointerEvent) {
    const spot = local(event);
    pointers.delete(event.pointerId);
    if (pinch) {
      pinch = null;
      dragStart = null;
      return;
    }
    const drag = dragStart;
    dragStart = null;
    canvas.style.cursor = hover ? "pointer" : "grab";
    if (!drag) return;
    const now = performance.now();
    lastInteraction = now;
    if (drag.moved < TAP_SLOP && now - drag.at < 600) {
      velocityLon = 0;
      velocityLat = 0;
      toggleAt(spot.x, spot.y);
    } else if (reduceMotion || now - lastMoveAt > 80) {
      velocityLon = 0;
      velocityLat = 0;
    }
  }

  function handleCancel(event: PointerEvent) {
    pointers.delete(event.pointerId);
    pinch = null;
    dragStart = null;
  }

  function handleEnter() {
    pointerInside = true;
  }

  function handleLeave() {
    pointerInside = false;
    if (hover) setHover(null, 0, 0);
  }

  function handleWheel(event: WheelEvent) {
    if (!event.ctrlKey) return;
    event.preventDefault();
    lastInteraction = performance.now();
    applyZoom(zoomTarget * Math.exp(-event.deltaY * 0.01), false);
  }

  function handleKey(event: KeyboardEvent) {
    const turns: Record<string, [number, number]> = {
      ArrowLeft: [-10, 0],
      ArrowRight: [10, 0],
      ArrowUp: [0, 10],
      ArrowDown: [0, -10],
    };
    const turn = turns[event.key];
    lastInteraction = performance.now();
    if (turn) {
      event.preventDefault();
      keyboardFocus = true;
      flight = null;
      centerLon = wrapLongitude(centerLon + turn[0]);
      if (morph === 1) panRaw = clamp(panRaw + Math.sign(turn[1]) * PAN_KEY_STEP, -panLimit(), panLimit());
      else centerLat = clamp(centerLat + turn[1], -MAX_TILT, MAX_TILT);
      return;
    }
    if (event.key === "+" || event.key === "=") applyZoom(zoomTarget * 1.5, false);
    if (event.key === "-") applyZoom(zoomTarget / 1.5, false);
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleAt(width / 2, height / 2);
    }
  }

  function handleFocus() {
    keyboardFocus = canvas.matches(":focus-visible");
  }

  function handleBlur() {
    keyboardFocus = false;
  }

  canvas.style.cursor = "grab";
  canvas.addEventListener("focus", handleFocus);
  canvas.addEventListener("blur", handleBlur);
  canvas.addEventListener("pointerdown", handleDown);
  canvas.addEventListener("pointermove", handleMove);
  canvas.addEventListener("pointerup", handleUp);
  canvas.addEventListener("pointercancel", handleCancel);
  canvas.addEventListener("pointerenter", handleEnter);
  canvas.addEventListener("pointerleave", handleLeave);
  canvas.addEventListener("wheel", handleWheel, { passive: false });
  canvas.addEventListener("keydown", handleKey);
  frame = requestAnimationFrame(loop);

  return {
    resize(nextWidth, nextHeight) {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(nextWidth, 1);
      height = Math.max(nextHeight, 1);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw(performance.now());
    },
    setPalette(next) {
      palette = next;
    },
    setVisited(codes, reveal) {
      const now = performance.now();
      const fresh = [...codes].filter((code) => !marks.has(code) || marks.get(code)?.target === 0);
      const gap = fresh.length > 0 ? Math.min(70, REVEAL_SPAN_MS / fresh.length) : 0;
      const wait = reveal && !reduceMotion ? Math.max(born + REVEAL_DELAY_MS - now, 0) : 0;
      fresh.forEach((code, index) => {
        const startAt = reveal && !reduceMotion ? now + wait + index * gap : now;
        marks.set(code, { value: marks.get(code)?.value ?? 0, target: 1, startAt });
      });
      for (const [code, mark] of marks) {
        if (!codes.has(code)) marks.set(code, { value: mark.value, target: 0, startAt: now });
      }
    },
    setMode(mode) {
      morphTarget = mode === "map" ? 1 : 0;
      velocityLon = 0;
      velocityLat = 0;
      flight = null;
      lastInteraction = performance.now();
      if (hover) setHover(null, 0, 0);
    },
    setZoom(next) {
      zoomTarget = clamp(next, MIN_ZOOM, MAX_ZOOM);
    },
    focus(code) {
      const point = pointByCode.get(code);
      if (!point) return;
      const now = performance.now();
      lastInteraction = now;
      velocityLon = 0;
      velocityLat = 0;
      pulse = { code, born: now + (reduceMotion ? 0 : FLIGHT_MS * 0.6) };
      ripples.push({ point, born: now + (reduceMotion ? 0 : FLIGHT_MS * 0.8) });
      const target: [number, number] = [point[0], morph === 1 ? centerLat : clamp(point[1], -MAX_TILT, MAX_TILT)];
      const rise = geoEqualEarthRaw(0, point[1] / TO_DEGREES)[1];
      const toPan = morph === 1 ? clamp(rise, -panLimit(), panLimit()) : panRaw;
      if (reduceMotion) {
        centerLon = target[0];
        centerLat = target[1];
        panRaw = toPan;
        return;
      }
      flight = { from: [centerLon, centerLat], to: target, fromPan: panRaw, toPan, born: now };
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      canvas.removeEventListener("focus", handleFocus);
      canvas.removeEventListener("blur", handleBlur);
      canvas.removeEventListener("pointerdown", handleDown);
      canvas.removeEventListener("pointermove", handleMove);
      canvas.removeEventListener("pointerup", handleUp);
      canvas.removeEventListener("pointercancel", handleCancel);
      canvas.removeEventListener("pointerenter", handleEnter);
      canvas.removeEventListener("pointerleave", handleLeave);
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("keydown", handleKey);
    },
  };
}
