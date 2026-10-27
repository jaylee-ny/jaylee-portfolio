import * as THREE from "three";
import { GLTFLoader } from "./vendor/GLTFLoader.js";
import {
  setupLighting,
  createSteam,
  addCubicles,
  refreshRoomDetail as updateRoomDetail,
} from "./scene.js";

window.deskModuleReady = true;
const $ = (s) => document.querySelector(s),
  canvas = $("#scene");
const motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
let reduced = motionQuery.matches,
  motionEnabled = !reduced,
  state = "loading",
  loaded = false,
  failed = false;
let renderer,
  scene,
  camera,
  chair,
  steam,
  screenMesh,
  transition = null,
  roomDetail = null;
const models = new THREE.Group(),
  raycaster = new THREE.Raycaster();
const target = new THREE.Vector3(0.3, 0.75, 0.1);
const mainOffset = new THREE.Vector3(0.825, 0, 0.78);
const initialOffset = new THREE.Vector3(3.5, 1.75, 5.6);
const overviewFov = 44,
  minRadius = 3.2,
  maxRadius = 17;
const roomHalfWidth = 18,
  ceilingHeight = 3.6,
  nearClusterCount = 6;
const podCenters = [];
for (let row = -2; row <= 2; row++)
  for (let column = -2; column <= 2; column++)
    podCenters.push([column * 6.6, row * 6.6]);
const initial = new THREE.Spherical().setFromVector3(initialOffset);
const desired = {
  theta: initial.theta,
  phi: initial.phi,
  radius: initial.radius,
};
const orbit = { ...desired },
  pointer = new THREE.Vector2(),
  smoothPointer = new THREE.Vector2();
let savedView = null,
  gesture = null,
  pinchDistance = 0,
  elapsed = 0,
  lastFrame = 0,
  idleOrigin = 0;
const pointers = new Map();
const timeout = setTimeout(() => fail(), 60000);
const clamp = THREE.MathUtils.clamp;
const status = (text) => {
  $("#scene-status").textContent = text;
};
function updateDirections() {
  const onDesktop = state === "computer",
    touch = matchMedia("(pointer:coarse)").matches;
  $("#office-directions").hidden = onDesktop || failed;
  $("#desktop-directions").hidden = !onDesktop;
  $("#fallback-directions").hidden = onDesktop || !failed;
  $("#navigation-hint").textContent = touch
    ? "Drag to rotate · Pinch to zoom"
    : "Drag to rotate · Scroll to zoom";
  $("#screen-hint").textContent = touch
    ? "Tap the lit screen to open the Mac"
    : "Click the lit screen to open the Mac";
}
updateDirections();
function motionUI() {
  $("#motion").setAttribute("aria-pressed", String(motionEnabled));
  $("#motion").setAttribute(
    "aria-label",
    motionEnabled ? "Pause idle animation" : "Play idle animation",
  );
  $("#motion").title = motionEnabled
    ? "Pause idle animation"
    : "Play idle animation";
  $("#motion-icon").setAttribute(
    "d",
    motionEnabled ? "M8 6v12M16 6v12" : "M8 5l11 7-11 7z",
  );
}
function setMotion(value) {
  motionEnabled = value && !reduced;
  idleOrigin = elapsed;
  motionUI();
}
function interact() {
  setMotion(false);
  pointer.set(0, 0);
  smoothPointer.set(0, 0);
}
function aspectScale() {
  return Math.max(1, Math.min(1.8, 1.35 / (innerWidth / innerHeight)));
}
function sceneFov() {
  return innerWidth < 700 ? 52 : overviewFov;
}
function orbitPosition(view = orbit, idle = 0) {
  const radius = Math.min(view.radius * aspectScale(), roomHalfWidth - 1.6);
  const position = new THREE.Vector3()
    .setFromSpherical(new THREE.Spherical(radius, view.phi, view.theta + idle))
    .add(target);
  position.y = clamp(position.y, 1.48, ceilingHeight - 0.35);
  position.x = clamp(position.x, -roomHalfWidth + 0.6, roomHalfWidth - 0.6);
  position.z = clamp(position.z, -roomHalfWidth + 0.6, roomHalfWidth - 0.6);
  return position;
}
function applyOrbit() {
  const idle =
    motionEnabled && !reduced
      ? 0.065 * Math.sin((elapsed - idleOrigin) * 0.19)
      : 0;
  camera.position.copy(orbitPosition(orbit, idle));
  const look = target.clone();
  if (motionEnabled && !reduced) {
    look.x += smoothPointer.x * 0.025;
    look.y -= smoothPointer.y * 0.018;
  }
  camera.lookAt(look);
  camera.fov = sceneFov();
  camera.updateProjectionMatrix();
}
function animateCamera(position, look, fov, done, duration = 1200) {
  const currentLook = new THREE.Vector3();
  camera.getWorldDirection(currentLook);
  currentLook
    .multiplyScalar(camera.position.distanceTo(target))
    .add(camera.position);
  if (reduced) {
    camera.position.copy(position);
    camera.lookAt(look);
    camera.fov = fov;
    camera.updateProjectionMatrix();
    done();
    return;
  }
  transition = {
    position: camera.position.clone(),
    look: currentLook,
    fov: camera.fov,
    to: position,
    focus: look,
    toFov: fov,
    done,
    start: performance.now(),
    duration,
  };
  document.body.classList.add("moving");
}
function resetView() {
  if (!loaded || state !== "scene" || transition) return;
  Object.assign(desired, {
    theta: initial.theta,
    phi: initial.phi,
    radius: initial.radius,
  });
  Object.assign(orbit, desired);
  setMotion(!reduced);
  animateCamera(
    orbitPosition(),
    target.clone(),
    sceneFov(),
    () => {
      state = "scene";
    },
    1000,
  );
}
function showComputer() {
  const iframe = $("#portfolio");
  if (!iframe.getAttribute("src")) iframe.src = "desktop.html?embedded=1";
  else
    iframe.contentWindow?.postMessage(
      { type: "portfolio-resume" },
      location.origin,
    );
  state = "computer";
  transition = null;
  document.body.classList.add("computer-open");
  document.body.classList.remove("moving");
  $("#desk").inert = true;
  $("#computer-view").hidden = false;
  $("#exit-computer").focus();
  updateDirections();
  status("Portfolio desktop opened.");
}
function openComputer() {
  if (state === "computer" || transition) return;
  if (!loaded || failed) {
    showComputer();
    return;
  }
  savedView = { ...orbit, motion: motionEnabled };
  state = "entering";
  setMotion(false);
  animateCamera(
    new THREE.Vector3(-0.16, 1.03, 0.14).add(mainOffset),
    new THREE.Vector3(-0.16, 0.985, -0.273).add(mainOffset),
    38,
    showComputer,
    1800,
  );
}
function exitComputer() {
  if (state !== "computer") return;
  $("#portfolio").contentWindow?.postMessage(
    { type: "portfolio-pause" },
    location.origin,
  );
  $("#computer-view").hidden = true;
  document.body.classList.remove("computer-open");
  $("#desk").inert = false;
  canvas.focus({ preventScroll: true });
  if (failed) {
    state = "scene";
    updateDirections();
    return;
  }
  if (!loaded) {
    state = "loading";
    updateDirections();
    return;
  }
  const view = savedView || { ...desired, motion: !reduced };
  Object.assign(orbit, {
    theta: view.theta,
    phi: view.phi,
    radius: view.radius,
  });
  Object.assign(desired, orbit);
  state = "returning";
  updateDirections();
  animateCamera(
    orbitPosition(),
    target.clone(),
    sceneFov(),
    () => {
      state = "scene";
      setMotion(view.motion);
      status("Back in the office. Drag to rotate.");
    },
    1200,
  );
}
$("#open-computer").addEventListener("click", openComputer);
$("#exit-computer").addEventListener("click", exitComputer);
$("#reset").addEventListener("click", resetView);
$("#motion").addEventListener("click", () => setMotion(!motionEnabled));
$("#skip").addEventListener("click", (e) => {
  e.preventDefault();
  openComputer();
});
window.addEventListener("message", (e) => {
  if (
    e.origin === location.origin &&
    e.source === $("#portfolio").contentWindow &&
    e.data?.type === "portfolio-close"
  )
    exitComputer();
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (state === "computer") exitComputer();
    else resetView();
    return;
  }
  if (document.activeElement !== canvas || state !== "scene" || transition)
    return;
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    openComputer();
    return;
  }
  if (e.key === "Home") {
    e.preventDefault();
    resetView();
    return;
  }
  if (
    ![
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "+",
      "=",
      "-",
    ].includes(e.key)
  )
    return;
  e.preventDefault();
  interact();
  if (e.key === "ArrowLeft") desired.theta -= 0.14;
  if (e.key === "ArrowRight") desired.theta += 0.14;
  if (e.key === "ArrowUp") desired.phi = clamp(desired.phi - 0.09, 0.3, 1.48);
  if (e.key === "ArrowDown") desired.phi = clamp(desired.phi + 0.09, 0.3, 1.48);
  if (e.key === "+" || e.key === "=")
    desired.radius = clamp(desired.radius * 0.9, minRadius, maxRadius);
  if (e.key === "-")
    desired.radius = clamp(desired.radius * 1.1, minRadius, maxRadius);
  if (reduced) Object.assign(orbit, desired);
});
motionQuery.addEventListener("change", (e) => {
  reduced = e.matches;
  setMotion(!reduced);
  pointer.set(0, 0);
  smoothPointer.set(0, 0);
  if (reduced) {
    Object.assign(orbit, desired);
    if (transition) {
      const active = transition;
      transition = null;
      camera.position.copy(active.to);
      camera.lookAt(active.focus);
      camera.fov = active.toFov;
      camera.updateProjectionMatrix();
      document.body.classList.remove("moving");
      active.done();
    }
  }
});

function screenAt(x, y) {
  if (!loaded || failed || state !== "scene" || transition) return false;
  const rect = canvas.getBoundingClientRect();
  raycaster.setFromCamera(
    new THREE.Vector2(
      ((x - rect.left) / rect.width) * 2 - 1,
      (-(y - rect.top) / rect.height) * 2 + 1,
    ),
    camera,
  );

  const candidate =
    screenMesh && raycaster.intersectObject(screenMesh, false)[0];
  if (!candidate) return false;

  raycaster.far = candidate.distance + 0.002;
  const hit = raycaster.intersectObjects(models.children, true)[0];
  raycaster.far = Infinity;
  return hit?.object === screenMesh;
}
function pinch() {
  const p = [...pointers.values()];
  return p.length < 2 ? 0 : Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
}
canvas.addEventListener("pointerdown", (e) => {
  if (
    state !== "scene" ||
    transition ||
    (e.pointerType === "mouse" && e.button !== 0)
  )
    return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  canvas.setPointerCapture(e.pointerId);
  if (pointers.size === 1)
    gesture = {
      x: e.clientX,
      y: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      dragged: false,
    };
  else {
    gesture.dragged = true;
    pinchDistance = pinch();
    interact();
  }
});
canvas.addEventListener("pointermove", (e) => {
  if (!pointers.has(e.pointerId)) {
    if (state === "scene" && !transition) {
      pointer.set(
        (e.clientX / innerWidth - 0.5) * 2,
        (e.clientY / innerHeight - 0.5) * 2,
      );
      canvas.style.cursor = screenAt(e.clientX, e.clientY) ? "pointer" : "grab";
    }
    return;
  }
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!gesture) return;
  if (pointers.size > 1) {
    const next = pinch();
    if (pinchDistance > 0 && next > 0)
      desired.radius = clamp(
        (desired.radius * pinchDistance) / next,
        minRadius,
        maxRadius,
      );
    pinchDistance = next;
    gesture.dragged = true;
  } else {
    const dx = e.clientX - gesture.lastX,
      dy = e.clientY - gesture.lastY;
    if (Math.hypot(e.clientX - gesture.x, e.clientY - gesture.y) > 6) {
      if (!gesture.dragged) interact();
      gesture.dragged = true;
    }
    if (gesture.dragged) {
      desired.theta -= (dx / Math.max(450, innerWidth)) * Math.PI * 2;
      desired.phi = clamp(
        desired.phi - (dy / Math.max(450, innerHeight)) * Math.PI,
        0.3,
        1.48,
      );
    }
  }
  gesture.lastX = e.clientX;
  gesture.lastY = e.clientY;
  if (reduced) Object.assign(orbit, desired);
  document.body.classList.toggle("dragging", gesture.dragged);
});
function release(e, cancelled = false) {
  if (!pointers.has(e.pointerId)) return;
  const clicked =
    !cancelled && gesture && !gesture.dragged && pointers.size === 1;
  pointers.delete(e.pointerId);
  if (canvas.hasPointerCapture(e.pointerId))
    canvas.releasePointerCapture(e.pointerId);
  if (pointers.size) {
    const p = [...pointers.values()][0];
    gesture.lastX = p.x;
    gesture.lastY = p.y;
    gesture.dragged = true;
    pinchDistance = 0;
  } else {
    gesture = null;
    pinchDistance = 0;
    document.body.classList.remove("dragging");
    if (clicked && screenAt(e.clientX, e.clientY)) openComputer();
  }
}
canvas.addEventListener("pointerup", (e) => release(e));
canvas.addEventListener("pointercancel", (e) => release(e, true));
canvas.addEventListener("lostpointercapture", (e) => release(e, true));
canvas.addEventListener("pointerleave", () => {
  if (!pointers.size) pointer.set(0, 0);
});
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
canvas.addEventListener(
  "wheel",
  (e) => {
    if (state !== "scene" || transition) return;
    e.preventDefault();
    interact();
    const delta =
      e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
    desired.radius = clamp(
      desired.radius * Math.exp(clamp(delta, -500, 500) * 0.001),
      minRadius,
      maxRadius,
    );
    if (reduced) Object.assign(orbit, desired);
  },
  { passive: false },
);

function refreshRoomDetail(force = false) {
  updateRoomDetail(
    roomDetail,
    camera,
    podCenters,
    nearClusterCount,
    renderer,
    force,
  );
}

function resize() {
  if (!renderer || !camera) return;
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(
    Math.min(devicePixelRatio, innerWidth < 700 ? 1.5 : 1.75),
  );
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  if (state === "scene" && !transition) applyOrbit();
}
window.addEventListener("resize", resize);
document.addEventListener("visibilitychange", () => {
  document.body.classList.toggle("page-hidden", document.hidden);
});
function fail() {
  if (failed) return;
  failed = true;
  clearTimeout(timeout);
  $("#scene-status").textContent =
    "3D unavailable. You can still open the portfolio.";
  transition = null;
  renderer?.setAnimationLoop(null);
  document.body.classList.remove("ready", "moving", "dragging");
  document.body.classList.add("fallback");
  window.officeBoot?.fail();
  $("#loading").hidden = true;
  document.body.classList.remove("booting");
  $("#fallback-copy").hidden = false;
  $("#skip").hidden = false;
  $(".view-controls").hidden = true;
  $("#open-computer").disabled = false;
  if (state !== "computer") {
    state = "scene";
    $("#desk").inert = false;
    document.body.classList.remove("computer-open");
  }
  updateDirections();
}
async function init() {
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    scene = new THREE.Scene();
    scene.background = new THREE.Color("#d4ded4");
    scene.fog = new THREE.Fog("#d4ded4", 30, 72);
    scene.add(models);
    camera = new THREE.PerspectiveCamera(
      overviewFov,
      innerWidth / innerHeight,
      0.025,
      120,
    );
    applyOrbit();
    resize();
    setupLighting(scene, renderer, innerWidth);
    const loader = new GLTFLoader();
    const labels = {
      "desk-only.glb": "Desk",
      "chair.glb": "Chair",
      "coffee-mug.glb": "Coffee mug",
      "bare-workstation.glb": "Workstations",
      "bare-workstation-far.glb": "Background desks",
      "cubicle-cluster.glb": "Cubicles",
      "office-room.glb": "Office room",
    };
    const load = async (file) => {
      const data = await loader.loadAsync("immersive/models/" + file);
      if (!failed) window.officeBoot?.step(labels[file]);
      return data.scene;
    };
    const [work, seat, mug, bare, distant, partitions, room] =
      await Promise.all([
        load("desk-only.glb"),
        load("chair.glb"),
        load("coffee-mug.glb"),
        load("bare-workstation.glb"),
        load("bare-workstation-far.glb"),
        load("cubicle-cluster.glb"),
        load("office-room.glb"),
      ]);
    if (failed) return;
    const screen = await new THREE.TextureLoader().loadAsync(
      "immersive/textures/showcase-screen.png",
    );
    screen.colorSpace = THREE.SRGBColorSpace;
    screen.flipY = false;
    screen.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    if (failed) return;
    window.officeBoot?.step("Macintosh display");
    for (const root of [work, seat, mug, bare, distant, partitions, room])
      root.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = root !== room;
        o.receiveShadow = true;
        const m = o.material;
        if (/Walnut laminate|wool upholstery/.test(m.name)) {
          m.normalMap = null;
          m.needsUpdate = true;
        }
        if (m.map)
          m.map.anisotropy = Math.min(
            8,
            renderer.capabilities.getMaxAnisotropy(),
          );
        if (root === work && m.name === "Unpowered CRT glass") {
          const screenMaterial = new THREE.MeshStandardMaterial({
            map: screen,
            emissiveMap: screen,
            emissive: "#f2f0e5",
            emissiveIntensity: 0.65,
            roughness: 0.24,
            metalness: 0,
          });
          o.material = screenMaterial;
          o.userData.action = "computer";
          o.name = "Clickable Macintosh screen";
          screenMesh = o;
        }
      });
    work.position.copy(mainOffset);
    chair = seat;
    chair.position.set(-0.16, 0, 0.64).add(mainOffset);
    chair.rotation.y = Math.PI + 0.14;
    mug.position.set(0.3, 0.748, -0.045).add(mainOffset);
    models.add(work, chair, mug, room);
    roomDetail = addCubicles(
      models,
      bare,
      distant,
      partitions,
      mainOffset,
      podCenters,
    );
    refreshRoomDetail(true);
    steam = createSteam(scene, mainOffset);
    renderer.shadowMap.needsUpdate = true;
    renderer.render(scene, camera);
    if (failed) return;
    window.officeBoot?.step("Office ready");
    clearTimeout(timeout);
    document.body.classList.add("ready");
    await window.officeBoot?.ready();
    if (failed) return;
    loaded = true;
    $("#desk").inert = false;
    $("#loading").hidden = true;
    document.body.classList.remove("booting");
    $("#open-computer").disabled = false;
    $(".view-controls").hidden = false;
    motionUI();
    if (state !== "computer") state = "scene";
    updateDirections();
    status(
      "Office ready. Your workstation is in the middle cluster. Drag to rotate, or click its illuminated screen to open the portfolio.",
    );
    renderer.setAnimationLoop(frame);
  } catch {
    fail();
  }
}
function frame(now) {
  if (document.hidden || state === "computer") {
    lastFrame = now;
    return;
  }
  const delta = Math.min(Math.max((now - lastFrame) / 1000, 0), 0.05);
  lastFrame = now;
  elapsed += delta;
  if (transition) {
    const a = transition,
      t = clamp((now - a.start) / a.duration, 0, 1),
      s = t * t * t * (t * (6 * t - 15) + 10);
    camera.position.lerpVectors(a.position, a.to, s);
    camera.lookAt(new THREE.Vector3().lerpVectors(a.look, a.focus, s));
    camera.fov = THREE.MathUtils.lerp(a.fov, a.toFov, s);
    camera.updateProjectionMatrix();
    if (t === 1) {
      transition = null;
      document.body.classList.remove("moving");
      a.done();
    }
  } else if (state === "scene") {
    const damping = reduced ? 1 : 1 - Math.exp(-delta * 12);
    for (const key of ["theta", "phi", "radius"])
      orbit[key] += (desired[key] - orbit[key]) * damping;
    smoothPointer.lerp(pointer, 1 - Math.exp(-delta * 3));
    applyOrbit();
  }
  if (chair)
    chair.rotation.y =
      Math.PI +
      0.14 +
      (motionEnabled && !reduced
        ? 0.012 * Math.sin((elapsed - idleOrigin) * 0.34)
        : 0);
  if (steam)
    for (const ribbon of steam.children) {
      ribbon.quaternion.copy(camera.quaternion);
      ribbon.material.uniforms.time.value = reduced ? 4 : elapsed;
    }
  refreshRoomDetail();
  renderer.render(scene, camera);
}
canvas.addEventListener("webglcontextlost", (e) => {
  e.preventDefault();
  fail();
});
init();
