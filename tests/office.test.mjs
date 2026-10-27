import fs from "node:fs/promises";
import vm from "node:vm";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { parseHTML } from "linkedom";
import test from "node:test";
import { fileURLToPath } from "node:url";
test("office assets, navigation, loading, directions, reduced motion and fallback", async () => {
  const project = fileURLToPath(new URL("..", import.meta.url));
  const root = path.join(project, "dist");
  await fs.mkdir(path.join(project, ".test-runtime"), { recursive: true });
  const tmp = await fs.mkdtemp(path.join(project, ".test-runtime/office-"));
  try {
    const threeURL = pathToFileURL(
        root + "/immersive/vendor/three.module.js",
      ).href,
      THREE = await import(threeURL);
    await fs.writeFile(
      tmp + "/utils.mjs",
      (
        await fs.readFile(
          root + "/immersive/vendor/BufferGeometryUtils.js",
          "utf8",
        )
      ).replaceAll("from 'three'", `from '${threeURL}'`),
    );
    await fs.writeFile(
      tmp + "/loader.mjs",
      (await fs.readFile(root + "/immersive/vendor/GLTFLoader.js", "utf8"))
        .replaceAll("from 'three'", `from '${threeURL}'`)
        .replace("./BufferGeometryUtils.js", "./utils.mjs"),
    );
    let sceneCode = await fs.readFile(root + "/immersive/scene.js", "utf8");
    sceneCode = sceneCode
      .replace(
        /import \* as THREE from ['"]three['"];?/,
        `import * as Native from '${threeURL}'; const THREE={...Native,PMREMGenerator:globalThis.TestPMREM};`,
      )
      .replace(/from ['"]three['"]/g, `from '${threeURL}'`)
      .replace("./vendor/BufferGeometryUtils.js", "./utils.mjs");
    await fs.writeFile(tmp + "/scene.mjs", sceneCode);
    const { window: dom, document } = parseHTML(
      await fs.readFile(root + "/index.html", "utf8"),
    );
    const events = new EventTarget();
    let clock = 0;
    Object.defineProperty(globalThis, "performance", {
      value: { now: () => clock },
      configurable: true,
    });
    Object.assign(globalThis, {
      window: globalThis,
      self: globalThis,
      document,
      location: { origin: "https://office.test" },
      innerWidth: 1440,
      innerHeight: 900,
      devicePixelRatio: 1,
      addEventListener: events.addEventListener.bind(events),
      matchMedia: () => ({
        matches: false,
        addEventListener(t, f) {
          globalThis.changeMotion = f;
        },
      }),
      ProgressEvent: class {
        constructor(t, p) {
          this.type = t;
          Object.assign(this, p);
        }
      },
    });
    Object.defineProperty(document, "hidden", { value: false });
    vm.runInThisContext(await fs.readFile(root + "/immersive/boot.js", "utf8"));
    const nativeFetch = globalThis.fetch,
      NativeRequest = globalThis.Request;
    globalThis.Request = class extends NativeRequest {
      constructor(url, options) {
        super(new URL(url, "https://office.test/"), options);
      }
    };
    globalThis.fetch = async (url) => {
      const value = typeof url === "string" ? url : url.url;
      if (value.startsWith("blob:") || value.startsWith("data:"))
        return nativeFetch(url);
      const b = await fs.readFile(
        path.join(root, value.replace("https://office.test/", "")),
      );
      return new Response(b, {
        headers: { "Content-Length": String(b.length) },
      });
    };
    globalThis.createImageBitmap = async (blob) => {
      const b = new DataView(await blob.arrayBuffer());
      return { width: b.getUint32(16), height: b.getUint32(20), close() {} };
    };
    globalThis.loop = null;
    class Renderer {
      constructor() {
        this.capabilities = { getMaxAnisotropy: () => 8 };
        this.shadowMap = {};
      }
      setSize() {}
      setPixelRatio() {}
      setAnimationLoop(f) {
        globalThis.loop = f;
      }
      render(scene, camera) {
        scene.updateMatrixWorld(true);
        camera.updateMatrixWorld(true);
      }
    }
    class TextureLoader {
      async loadAsync(url) {
        assert((await fs.readFile(path.join(root, url))).length > 10);
        return new THREE.Texture({ width: 960, height: 744 });
      }
    }
    globalThis.TestRenderer = Renderer;
    globalThis.TestTextureLoader = TextureLoader;
    globalThis.TestPMREM = class {
      fromScene() {
        return { texture: new THREE.Texture() };
      }
      dispose() {}
    };
    const canvas = document.querySelector("#scene"),
      captures = new Set();
    canvas.setPointerCapture = (id) => captures.add(id);
    canvas.hasPointerCapture = (id) => captures.has(id);
    canvas.releasePointerCapture = (id) => captures.delete(id);
    canvas.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: innerWidth,
      height: innerHeight,
    });
    let code = await fs.readFile(root + "/immersive/desk.js", "utf8");
    code = code
      .replace("./scene.js", "./scene.mjs")
      .replace(
        /import \* as THREE from ['\"]three['\"];?/,
        `import * as Native from '${threeURL}'; const THREE={...Native,WebGLRenderer:globalThis.TestRenderer,TextureLoader:globalThis.TestTextureLoader,PMREMGenerator:globalThis.TestPMREM};`,
      )
      .replace(/['\"]\.\/vendor\/GLTFLoader\.js['\"]/g, "'./loader.mjs'")
      .replace(
        /['\"]\.\/vendor\/BufferGeometryUtils\.js['\"]/g,
        "'./utils.mjs'",
      );
    code +=
      "\nexport {resetView,openComputer,exitComputer,screenAt,setMotion,refreshRoomDetail,orbitPosition,updateDirections}; export const test=()=>({state,loaded,failed,transition,scene,camera,chair,steam,screenMesh,models,orbit,desired,motionEnabled,mainOffset,target,podCenters,roomDetail});";
    await fs.writeFile(tmp + "/room.mjs", code);
    const api = await import(pathToFileURL(tmp + "/room.mjs").href);
    for (let i = 0; i < 200 && !api.test().loaded && !api.test().failed; i++)
      await new Promise((r) => setTimeout(r, 25));
    const s = api.test();
    assert.equal(s.failed, false);
    assert.equal(s.loaded, true);
    assert(document.querySelector("#loading").hidden);
    assert.equal(document.querySelector("#boot-count").textContent, "9 / 9");
    assert.equal(document.querySelector("#boot-log").children.length, 9);
    assert(!document.querySelector("#start-hint").hidden);
    assert(!document.querySelector("#office-directions").hidden);
    assert.equal(document.querySelector("#desk").inert, false);
    const tapeVisible = () =>
      !document.body.classList.contains("computer-open");
    assert(tapeVisible());
    assert.equal(document.querySelector(".tape-rec"), null);
    assert.equal(document.querySelector("#tape-time"), null);
    const shader = {
      uniforms: {},
      fragmentShader: THREE.ShaderLib.standard.fragmentShader,
    };
    s.screenMesh.material.onBeforeCompile(shader);
    assert.equal(Object.keys(shader.uniforms).length, 0);
    assert(!shader.fragmentShader.includes("crtRainbow"));
    assert.equal(s.screenMesh.material.emissiveIntensity, 0.65);
    const nearby = [],
      distant = [],
      dividers = [],
      screens = [],
      carpets = [];
    s.models.traverse((o) => {
      if (o.name === "Nearby cubicle workstations") nearby.push(o);
      if (o.name === "Distant cubicle workstations") distant.push(o);
      if (o.name === "Four-seat cubicle dividers") dividers.push(o);
      if (o.userData.action) screens.push(o);
      if (o.material?.name === "Loop-pile green carpet") carpets.push(o);
    });
    assert(nearby.length > 20 && distant.length > 20);
    assert.equal(nearby[0].count + distant[0].count, 99);
    assert(nearby.every((o) => o.count <= 24));
    assert(dividers.length === 3 && dividers.every((o) => o.count === 25));
    assert.equal(screens.length, 1);
    assert(
      ![...nearby, ...distant].some((o) =>
        /Archive|Manila|calendar|coffee|tray/i.test(o.material.name),
      ),
      "Background desks have no documents or extras",
    );
    assert.equal(carpets.length, 1);
    assert(
      carpets[0].material.map &&
        carpets[0].material.normalMap &&
        carpets[0].material.roughnessMap,
      "Carpet has color, normal and roughness maps",
    );
    assert(
      s.chair.position.distanceTo(new THREE.Vector3(0.665, 0, 1.42)) < 1e-8,
    );
    assert(Math.abs(s.chair.rotation.y - (Math.PI + 0.14)) < 1e-8);
    assert.equal(s.podCenters.length, 25);
    assert.equal(s.roomDetail.stations.length, 99);
    assert(Math.abs(s.podCenters.reduce((sum, p) => sum + p[0], 0)) < 1e-10);
    assert(Math.abs(s.podCenters.reduce((sum, p) => sum + p[1], 0)) < 1e-10);
    assert(s.podCenters.some((p) => p[0] === 0 && p[1] === 0));
    assert.equal(
      new Set(
        s.roomDetail.stations.map((x) =>
          x.matrix.elements.map((v) => v.toFixed(3)).join(","),
        ),
      ).size,
      99,
    );
    const triangleBudget = () => {
      let n = 0;
      s.scene.traverse((o) => {
        if (o.isMesh && o.geometry)
          n +=
            ((o.geometry.index?.count || o.geometry.attributes.position.count) /
              3) *
            (o.isInstancedMesh ? o.count : 1);
      });
      return n;
    };
    assert(triangleBudget() < 3100000, "Visible geometry has a bounded budget");
    const oldKey = s.roomDetail.key;
    s.camera.position.set(-14, 2, -14);
    api.refreshRoomDetail(true);
    assert.notEqual(s.roomDetail.key, oldKey);
    assert.equal(nearby[0].count + distant[0].count, 99);
    assert(nearby[0].count <= 24);
    assert(triangleBudget() < 3100000);
    for (const theta of [-Math.PI, 0, Math.PI / 2, Math.PI])
      for (const phi of [0.3, 1.48])
        for (const radius of [3.2, 17]) {
          const p = api.orbitPosition({ theta, phi, radius });
          assert(p.y >= 1.48 && p.y <= 3.25);
          assert(Math.abs(p.x) < 18 && Math.abs(p.z) < 18);
        }
    assert.equal(s.steam.children.length, 3);
    assert.equal(document.querySelector("a[download]"), null);
    const tick = (sec = 0.05) => {
      clock += sec * 1000;
      loop(clock);
    };
    const settle = () => {
      for (let i = 0; i < 35; i++) tick();
    };
    const ev = (type, x, y, id = 1, extra = {}) => {
      const e = new dom.Event(type, { bubbles: true, cancelable: true });
      Object.assign(e, {
        clientX: x,
        clientY: y,
        pointerId: id,
        pointerType: "mouse",
        button: 0,
        ...extra,
      });
      canvas.dispatchEvent(e);
    };
    const start = s.camera.position.clone();
    for (let i = 0; i < 50; i++) tick();
    assert(start.distanceTo(s.camera.position) > 0.01, "Idle motion runs");
    const angle = s.orbit.theta;
    ev("pointerdown", 1200, 400);
    ev("pointermove", -600, 450);
    ev("pointerup", -600, 450);
    settle();
    assert(s.orbit.theta - angle > Math.PI * 2);
    assert.equal(api.test().state, "scene");
    assert.equal(api.test().motionEnabled, false);
    assert.equal(captures.size, 0);
    assert(!document.querySelector("#start-hint").hidden);
    assert(!document.querySelector("#office-directions").hidden);
    const radius = s.orbit.radius;
    ev("wheel", 700, 400, 1, { deltaY: -120, deltaMode: 0 });
    settle();
    assert(s.orbit.radius < radius);
    ev("pointerdown", 400, 350, 1, { pointerType: "touch" });
    ev("pointerdown", 600, 350, 2, { pointerType: "touch" });
    const pinch = s.desired.radius;
    ev("pointermove", 700, 350, 2, { pointerType: "touch" });
    ev("pointerup", 700, 350, 2, { pointerType: "touch" });
    ev("pointerup", 400, 350, 1, { pointerType: "touch" });
    settle();
    assert(s.orbit.radius < pinch);
    assert.equal(api.test().state, "scene");
    ev("pointerdown", 300, 300);
    ev("pointercancel", 300, 300);
    assert.equal(captures.size, 0);
    api.resetView();
    tick(1.1);
    api.setMotion(false);
    tick();
    const center = new THREE.Box3()
      .setFromObject(s.screenMesh)
      .getCenter(new THREE.Vector3());
    const pixel = () => {
      const p = center.clone().project(s.camera);
      return [((p.x + 1) * innerWidth) / 2, ((1 - p.y) * innerHeight) / 2];
    };
    let [x, y] = pixel();
    assert(
      api.screenAt(x, y),
      "Main screen is visible and clickable from overview",
    );
    const saved = { ...s.orbit };
    ev("pointerdown", x, y);
    ev("pointerup", x, y);
    assert.equal(api.test().state, "entering");
    assert(tapeVisible(), "Tape remains through camera approach");
    tick(0.8);
    assert(tapeVisible(), "Tape remains midway to the Mac");
    const transition = api.test().transition;
    api.openComputer();
    assert.equal(api.test().transition, transition);
    tick(1.9);
    assert.equal(api.test().state, "computer");
    assert(!tapeVisible(), "Tape clears only when desktop opens");
    assert(!document.querySelector("#start-hint").hidden);
    assert(!document.querySelector("#desktop-directions").hidden);
    assert(document.querySelector("#office-directions").hidden);
    assert.equal(
      document.querySelector("#portfolio").getAttribute("src"),
      "desktop.html?embedded=1",
    );
    api.exitComputer();
    assert(tapeVisible(), "Tape returns with office");
    assert(!document.querySelector("#office-directions").hidden);
    assert(document.querySelector("#desktop-directions").hidden);
    assert(document.querySelector("#loading").hidden);
    tick(1.3);
    assert.equal(api.test().state, "scene");
    assert.deepEqual({ ...s.orbit }, saved);
    s.desired.theta += Math.PI;
    Object.assign(s.orbit, s.desired);
    tick();
    [x, y] = pixel();
    assert.equal(
      api.screenAt(x, y),
      false,
      "Case and dividers occlude monitor from behind",
    );
    globalThis.innerWidth = 390;
    globalThis.innerHeight = 844;
    events.dispatchEvent(new Event("resize"));
    tick();
    assert.equal(s.camera.aspect, 390 / 844);
    assert(s.camera.position.y >= 1.48 && s.camera.position.y <= 3.25);
    assert(
      Math.abs(s.camera.position.x) < 18 && Math.abs(s.camera.position.z) < 18,
    );
    assert.equal(s.camera.fov, 52);
    globalThis.changeMotion({ matches: true });
    api.resetView();
    assert.equal(api.test().transition, null);
    assert.equal(api.test().motionEnabled, false);
    const still = s.camera.position.clone();
    for (let i = 0; i < 20; i++) tick();
    assert(still.distanceTo(s.camera.position) < 1e-6);
    assert.equal(s.steam.children[0].material.uniforms.time.value, 4);
    assert.equal(
      s.screenMesh.material.emissiveIntensity,
      0.65,
      "Monitor illumination stays constant",
    );
    api.openComputer();
    assert.equal(api.test().state, "computer");
    assert(!tapeVisible(), "Tape clears only when desktop opens");
    assert(!document.querySelector("#start-hint").hidden);
    assert(!document.querySelector("#desktop-directions").hidden);
    assert(document.querySelector("#office-directions").hidden);
    api.exitComputer();
    assert.equal(api.test().state, "scene");
    canvas.dispatchEvent(
      new dom.Event("webglcontextlost", { cancelable: true }),
    );
    assert.equal(api.test().failed, true);
    assert.equal(document.querySelector("#skip").hidden, false);
    assert(document.querySelector("#loading").hidden);
    assert(!document.querySelector("#fallback-directions").hidden);
    api.openComputer();
    assert.equal(api.test().state, "computer");
    assert(!tapeVisible(), "Tape clears only when desktop opens");
    assert(!document.querySelector("#start-hint").hidden);
    assert(!document.querySelector("#desktop-directions").hidden);
    assert(document.querySelector("#office-directions").hidden);
    assert(!document.querySelector("#desktop-directions").hidden);
    globalThis.matchMedia = (query) => ({
      matches: query.includes("pointer:coarse"),
      addEventListener() {},
    });
    api.exitComputer();
    api.updateDirections();
    assert.equal(
      document.querySelector("#navigation-hint").textContent,
      "Drag to rotate · Pinch to zoom",
    );
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
