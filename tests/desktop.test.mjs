import fs from "node:fs/promises";
import test from "node:test";
import { initializeDesktop } from "../dist/desktop/index.js";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
const root = fileURLToPath(new URL("../dist", import.meta.url));
const html = await fs.readFile(root + "/desktop.html", "utf8");

function boot(
  width,
  height,
  {
    embedded = true,
    storage = new Map(),
    blocked = false,
    noCanvas = false,
    throwCanvas = false,
  } = {},
) {
  const { window: dom, document } = parseHTML(html),
    listeners = new Map(),
    messages = [],
    downloads = [],
    draws = [];
  const paint = document.querySelector("#paint-canvas");
  paint.width = 800;
  paint.height = 480;
  let pixels = 0;
  const ctx = {
    fillRect() {
      pixels++;
      draws.push(["clear"]);
    },
    getImageData() {
      return { pixels };
    },
    putImageData(state) {
      pixels = state.pixels;
    },
    beginPath() {},
    arc(...p) {
      draws.push(["dot", ...p]);
    },
    fill() {
      pixels++;
    },
    moveTo(...p) {
      draws.push(["from", ...p]);
    },
    lineTo(...p) {
      draws.push(["to", ...p]);
    },
    stroke() {
      pixels++;
    },
  };
  paint.getContext = () => {
    if (throwCanvas) throw Error("Canvas unavailable");
    return noCanvas ? null : ctx;
  };
  paint.getBoundingClientRect = () => ({
    left: 50,
    top: 100,
    width: 400,
    height: 240,
  });
  paint.toBlob = (f) => f(new Blob(["png"], { type: "image/png" }));
  for (const e of document.querySelectorAll(".titlebar,canvas")) {
    const caps = new Set();
    e.setPointerCapture = (id) => caps.add(id);
    e.hasPointerCapture = (id) => caps.has(id);
    e.releasePointerCapture = (id) => caps.delete(id);
    e.captures = caps;
  }

  Object.defineProperty(document.querySelector("#brush-size"), "value", {
    value: "8",
    writable: true,
  });
  const parent = {
    postMessage: (data, origin) => messages.push({ data, origin }),
  };
  const sandbox = {
    document,
    window: null,
    parent,
    location: {
      origin: "https://office.test",
      search: embedded ? "?embedded=1" : "",
    },
    innerWidth: width,
    innerHeight: height,
    URLSearchParams,
    Blob,
    URL: {
      createObjectURL(blob) {
        downloads.push(blob);
        return "blob:test";
      },
      revokeObjectURL() {},
    },
    setTimeout(fn) {
      fn();
    },
    localStorage: {
      getItem(key) {
        if (blocked) throw Error("blocked");
        return storage.get(key);
      },
      setItem(key, val) {
        if (blocked) throw Error("blocked");
        storage.set(key, val);
      },
    },
    console,
    addEventListener: (name, fn) => {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(fn);
    },
  };
  sandbox.window = sandbox;
  const api = initializeDesktop(document, sandbox);
  return {
    document,
    api,
    apiParent: parent,
    messages,
    listeners,
    dom,
    storage,
    downloads,
    draws,
    ctx,
    pixels: () => pixels,
    emit: (name, event) => listeners.get(name)?.forEach((fn) => fn(event)),
    click: (selector) => {
      const el = document.querySelector(selector);
      assert(el, selector);
      el.click();
    },
    pointer: (selector, type, x, y, id = 1) => {
      const e = new dom.Event(type, { bubbles: true, cancelable: true });
      Object.assign(e, { clientX: x, clientY: y, pointerId: id, button: 0 });
      document.querySelector(selector).dispatchEvent(e);
    },
  };
}
test("desktop apps, window state, keyboard, storage, drawing and responsive bounds", async () => {
  const a = boot(1440, 900),
    q = (s) => a.document.querySelector(s);
  assert.equal(a.document.querySelectorAll(".desktop-icon").length, 4);
  assert.equal(a.document.querySelectorAll(".app-window").length, 4);
  assert(!q("#showcase").hidden);
  assert.equal(a.api.windows.activeApp, "showcase");
  for (const page of ["experience", "projects", "contact", "resume", "about"]) {
    a.click(`[data-section="${page}"]`);
    assert.equal(a.api.showcase.currentSection, page);
    assert.equal(q('[aria-current="page"]').dataset.section, page);
    assert(
      !/A little introduction|Tools of the trade|Building, researching|Thanks for stopping by|The full picture|Internet Explorer/.test(
        q("#showcase-content").textContent,
      ),
    );
    assert(!q(".portrait-pixel") && !q(".project-art"));
  }
  a.click('[data-section="projects"]');
  a.click('[data-page="experience"]');
  assert.equal(a.api.showcase.currentSection, "experience");
  for (const id of ["calculator", "paint", "notepad"]) {
    a.click("#" + id + "-icon");
    assert(!q("#" + id).hidden);
    assert.equal(a.api.windows.activeApp, id);
    a.click("#" + id + " .close-window");
    assert(q("#" + id).hidden);
  }
  assert.equal(a.api.windows.activeApp, "showcase");
  a.click("#showcase .close-window");
  a.click("#showcase-icon");
  assert.equal(a.api.showcase.currentSection, "experience");

  const calc = (keys) => {
    a.click('[data-key="C"]');
    for (const key of keys) a.click('[data-key="' + key + '"]');
    return q("#calculator-display").textContent;
  };
  assert.equal(calc(["0", ".", "1", "+", "0", ".", "2", "="]), "0.3");
  assert.equal(calc(["9", "÷", "0", "="]), "Error");
  a.click('[data-key="4"]');
  assert.equal(q("#calculator-display").textContent, "4");
  assert.equal(calc(["9", "−", "1", "2", "="]), "-3");
  assert.equal(calc(["2", "+", "3", "×", "4", "="]), "20");
  assert.equal(calc(["8", "+", "−", "3", "="]), "5");
  assert.equal(calc(["1", "0", "0", "%"]), "1");
  assert.equal(calc(["2", "±", "×", "3", "="]), "-6");
  assert.equal(calc(["2", "+", "3", "=", "=", "="]), "11");
  assert.equal(calc(["1", "2", "⌫", ".", ".", "5"]), "1.5");
  a.click("#calculator-icon");
  a.click('[data-key="C"]');
  for (const key of ["6", "*", "7", "Enter"])
    a.emit("keydown", { key, target: q("#calculator"), preventDefault() {} });
  assert.equal(q("#calculator-display").textContent, "42");

  a.click("#notepad-icon");
  const note = q("#note-text");
  note.value = "Meeting notes\n2 + 2 = 4";
  note.dispatchEvent(new a.dom.Event("input"));
  assert.equal(a.storage.get("james-lee-desktop-note-v1"), note.value);
  a.emit("keydown", {
    key: "9",
    target: note,
    preventDefault() {
      throw Error("text hijacked");
    },
  });
  assert.equal(q("#calculator-display").textContent, "42");
  a.click("#note-save");
  assert.equal(await a.downloads.at(-1).text(), note.value);
  a.click("#notepad .close-window");
  a.click("#notepad-icon");
  assert.equal(note.value, "Meeting notes\n2 + 2 = 4");
  const reload = boot(390, 844, { storage: a.storage });
  assert.equal(reload.document.querySelector("#note-text").value, note.value);
  const denied = boot(390, 844, { blocked: true });
  assert(
    denied.document
      .querySelector("#note-status")
      .textContent.includes("unavailable"),
  );
  denied.document
    .querySelector("#note-text")
    .dispatchEvent(new denied.dom.Event("input"));
  assert(
    denied.document
      .querySelector("#note-status")
      .textContent.includes("Could not save"),
  );
  denied.click("#note-save");
  assert.equal(denied.downloads.length, 1);

  a.click("#paint-icon");
  a.pointer("#paint-canvas", "pointerdown", 100, 150);
  a.pointer("#paint-canvas", "pointermove", 150, 200);
  a.pointer("#paint-canvas", "pointerup", 150, 200);
  assert.deepEqual(a.draws.find((d) => d[0] === "dot").slice(1, 3), [100, 100]);
  assert.deepEqual(a.draws.find((d) => d[0] === "to").slice(1), [200, 200]);
  assert.equal(q("#paint-canvas").captures.size, 0);
  assert.equal(a.pixels(), 3);
  a.click("#paint-clear");
  assert.equal(a.pixels(), 4);
  a.click("#paint-undo");
  assert.equal(a.pixels(), 3);
  a.click("#paint-undo");
  assert.equal(a.pixels(), 1);
  assert(q("#paint-undo").disabled);
  a.click('[data-color-name="Blue"]');
  assert.equal(q("#paint-status").textContent, "Brush · Blue");
  a.click("#paint-eraser");
  a.pointer("#paint-canvas", "pointerdown", 80, 110);
  assert.equal(a.ctx.strokeStyle, "#ffffff");
  assert.equal(a.ctx.lineWidth, 24);
  a.pointer("#paint-canvas", "pointercancel", 90, 120);
  assert.equal(q("#paint-canvas").captures.size, 0);
  a.click("#paint-save");
  assert.equal(a.downloads.at(-1).type, "image/png");
  const savedPixels = a.pixels();
  a.click("#paint .close-window");
  a.click("#paint-icon");
  a.emit("resize", {});
  assert.equal(a.pixels(), savedPixels);
  for (let i = 0; i < 20; i++) a.click("#paint-clear");
  let undoCount = 0;
  while (!q("#paint-undo").disabled) {
    a.click("#paint-undo");
    undoCount++;
  }
  assert.equal(undoCount, 12);
  const unavailable = boot(390, 844, { noCanvas: true });
  assert(!unavailable.document.querySelector("#showcase").hidden);
  assert.match(
    unavailable.document.querySelector("#paint-status").textContent,
    /unavailable/,
  );

  a.click("#showcase-icon");
  a.pointer("#showcase .titlebar", "pointerdown", 500, 140);
  a.pointer("#showcase .titlebar", "pointermove", -2000, -1000);
  assert.equal(parseFloat(q("#showcase").style.left), 8);
  assert.equal(parseFloat(q("#showcase").style.top), 8);
  a.pointer("#showcase .titlebar", "pointermove", 4000, 4000);
  assert(
    parseFloat(q("#showcase").style.left) +
      parseFloat(q("#showcase").style.width) <=
      1432,
  );
  assert(
    parseFloat(q("#showcase").style.top) +
      parseFloat(q("#showcase").style.height) <=
      892,
  );
  a.pointer("#showcase .titlebar", "pointercancel", 4000, 4000);
  assert.equal(q("#showcase .titlebar").captures.size, 0);
  a.click("#calculator-icon");
  a.emit("keydown", { key: "Escape", preventDefault() {} });
  assert(q("#calculator").hidden);
  assert.equal(a.messages.length, 0);
  a.click("#showcase-icon");
  a.emit("keydown", { key: "Escape", preventDefault() {} });
  assert.equal(a.messages.at(-1).data.type, "portfolio-close");
  assert(q("#back-to-office").hidden);
  for (const [width, height] of [
    [390, 844],
    [320, 568],
    [844, 390],
    [700, 400],
  ]) {
    const b = boot(width, height);
    for (const id of ["showcase", "calculator", "paint", "notepad"]) {
      b.click("#" + id + "-icon");
      const w = b.document.querySelector("#" + id);
      assert(parseFloat(w.style.width) <= width - 16);
      assert(parseFloat(w.style.height) <= height - 16);
      assert(parseFloat(w.style.left) >= 8);
      assert(parseFloat(w.style.top) >= (width <= 700 ? 79 : 8));
    }
    b.click('[data-section="resume"]');
    assert.equal(b.api.showcase.currentSection, "resume");
  }
  assert(
    !boot(1440, 900, { embedded: false }).document.querySelector(
      "#back-to-office",
    ).hidden,
  );

  assert(!q(".crt-overlay") && !q(".taskbar") && !q(".browser-address"));
  const desk = await fs.readFile(root + "/immersive/desk.js", "utf8");
  assert(
    !desk.includes("crtTime") &&
      !desk.includes("crtRainbow") &&
      !desk.includes("onBeforeCompile"),
  );
  const css = await fs.readFile(root + "/style.css", "utf8");
  for (const match of css.matchAll(/url\(['"]?([^)'"\s]+)/g))
    await fs.access(root + "/" + match[1]);
  for (const doc of [
    a.document,
    parseHTML(await fs.readFile(root + "/index.html", "utf8")).document,
  ])
    for (const el of doc.querySelectorAll("[src],[href]")) {
      const asset = el.getAttribute("src") || el.getAttribute("href");
      if (!asset || /^(https?:|mailto:|tel:|#|blob:)/.test(asset)) continue;
      await fs.access(root + "/" + asset.split("?")[0]);
    }
  const throws = boot(390, 844, { throwCanvas: true });
  assert(!throws.document.querySelector("#showcase").hidden);
  assert.match(
    throws.document.querySelector("#paint-status").textContent,
    /unavailable/,
  );
  a.click("#paint-icon");
  a.pointer("#paint-canvas", "pointerdown", 100, 150);
  a.emit("blur", {});
  assert.equal(q("#paint-canvas").captures.size, 0);
  a.pointer("#paint-canvas", "pointerdown", 100, 150);
  assert.equal(q("#paint-canvas").captures.size, 1);
  a.emit("message", {
    origin: "https://wrong.test",
    source: {},
    data: { type: "portfolio-pause" },
  });
  assert.equal(q("#paint-canvas").captures.size, 1);
  a.emit("message", {
    origin: "https://office.test",
    source: a.apiParent,
    data: { type: "portfolio-pause" },
  });
  assert.equal(q("#paint-canvas").captures.size, 0);
});
