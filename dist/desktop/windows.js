import { applications as definitions } from "./applications.js";
import { select, selectAll } from "./dom.js";

export function createWindowManager(root, host) {
  const $ = (selector, scope = root) => select(selector, scope),
    $$ = (selector, scope = root) => selectAll(selector, scope);
  const desktop = $("#desktop");
  const applications = Object.fromEntries(
    Object.entries(definitions).map(([id, app]) => [id, { ...app }]),
  );
  let activeApp = null,
    zIndex = 10,
    drag = null;
  function bounds() {
    return {
      width: desktop.clientWidth || host.innerWidth,
      height: desktop.clientHeight || host.innerHeight,
    };
  }
  function fitWindow(id) {
    const app = applications[id],
      el = $("#" + id),
      { width, height } = bounds(),
      mobile = width <= 700;
    const left = mobile ? 8 : 118,
      top = mobile ? 79 : 12;
    const w = Math.max(0, Math.min(app.width, width - left - 12)),
      h = Math.max(0, Math.min(app.height, height - top - 12));
    const index = Object.keys(applications).indexOf(id);
    app.x = mobile
      ? 8
      : Math.max(
          8,
          Math.min(
            app.x ?? Math.round(left + (width - left - w) / 2) + index * 17,
            width - w - 8,
          ),
        );
    app.y = mobile
      ? top
      : Math.max(
          8,
          Math.min(
            app.y ?? Math.round((height - h) / 2) + index * 17,
            height - h - 8,
          ),
        );
    Object.assign(el.style, {
      width: w + "px",
      height: h + "px",
      left: app.x + "px",
      top: app.y + "px",
    });
  }
  function activate(id) {
    if (activeApp !== id) {
      activeApp = id;
      $("#" + id).style.zIndex = ++zIndex;
    }
    $$(".app-window").forEach((el) =>
      el.classList.toggle("active", el.id === id),
    );
  }
  function openApp(id) {
    if (!applications[id]) return;
    const el = $("#" + id);
    el.hidden = false;
    $("#" + id + "-icon").setAttribute("aria-expanded", "true");
    fitWindow(id);
    activate(id);
    if (id === "notepad") $("#note-text").focus({ preventScroll: true });
    else el.focus({ preventScroll: true });
    $("#desktop-status").textContent = applications[id].name + " opened.";
  }
  function closeApp(id) {
    $("#" + id).hidden = true;
    $("#" + id + "-icon").setAttribute("aria-expanded", "false");
    const next = $$(".app-window")
      .filter((el) => !el.hidden)
      .sort((a, b) => Number(b.style.zIndex) - Number(a.style.zIndex))[0];
    activeApp = null;
    if (next) {
      activate(next.id);
      next.focus({ preventScroll: true });
    } else $("#" + id + "-icon").focus({ preventScroll: true });
  }
  $("#applications").innerHTML = Object.entries(applications)
    .map(
      ([id, app]) =>
        `<button type="button" id="${id}-icon" class="desktop-icon" aria-label="Open ${app.name}" aria-controls="${id}" aria-expanded="false">${app.icon}<span>${app.name}</span></button>`,
    )
    .join("");
  for (const [id] of Object.entries(applications)) {
    const el = $("#" + id),
      titlebar = $(".titlebar", el);
    $("#" + id + "-icon").onclick = () => openApp(id);
    $(".close-window", el).onclick = () => closeApp(id);
    el.addEventListener("pointerdown", () => activate(id));
    el.addEventListener("focusin", () => activate(id));
    titlebar.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.target.closest("button") || bounds().width <= 700)
        return;
      e.preventDefault();
      activate(id);
      titlebar.setPointerCapture(e.pointerId);
      drag = {
        app: id,
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        left: applications[id].x,
        top: applications[id].y,
      };
    });
    titlebar.addEventListener("pointermove", (e) => {
      if (!drag || drag.app !== id || drag.id !== e.pointerId) return;
      const { width, height } = bounds(),
        app = applications[id];
      app.x = Math.max(
        8,
        Math.min(
          width - parseFloat(el.style.width) - 8,
          drag.left + e.clientX - drag.x,
        ),
      );
      app.y = Math.max(
        8,
        Math.min(
          height - parseFloat(el.style.height) - 8,
          drag.top + e.clientY - drag.y,
        ),
      );
      el.style.left = app.x + "px";
      el.style.top = app.y + "px";
    });
    const stop = (e) => {
      if (!drag || drag.app !== id || drag.id !== e.pointerId) return;
      drag = null;
      if (titlebar.hasPointerCapture(e.pointerId))
        titlebar.releasePointerCapture(e.pointerId);
    };
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
      titlebar.addEventListener(event, stop);
  }

  host.addEventListener("resize", () =>
    Object.keys(applications).forEach(fitWindow),
  );
  return {
    open: openApp,
    close: closeApp,
    get activeApp() {
      return activeApp;
    },
  };
}
