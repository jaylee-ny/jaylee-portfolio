import { createWindowManager } from "./windows.js";
import { initializeShowcase } from "./showcase.js";
import { initializeCalculator } from "./calculator.js";
import { initializeNotepad } from "./notepad.js";
import { initializePaint } from "./paint.js";
import { select, downloadFile } from "./dom.js";

export function initializeDesktop(root = document, host = window) {
  const embedded = new URLSearchParams(host.location.search).has("embedded");
  const windows = createWindowManager(root, host);
  const download = (blob, name) => downloadFile(blob, name, root, host);
  const showcase = initializeShowcase(root);
  initializeCalculator(root, host, () => windows.activeApp === "calculator");
  initializeNotepad(root, host, download);
  const paint = initializePaint(root, host, download);
  select("#back-to-office", root).hidden = embedded;
  host.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    if (windows.activeApp && windows.activeApp !== "showcase") {
      paint.cancelStroke();
      windows.close(windows.activeApp);
    } else if (embedded && host.parent !== host) {
      host.parent.postMessage(
        { type: "portfolio-close" },
        host.location.origin,
      );
    } else host.location.href = "./";
  });
  host.addEventListener("message", (event) => {
    if (event.origin !== host.location.origin || event.source !== host.parent)
      return;
    if (event.data?.type === "portfolio-pause") paint.cancelStroke();
    if (event.data?.type === "portfolio-resume" && windows.activeApp) {
      select("#" + windows.activeApp, root).focus({ preventScroll: true });
    }
  });
  windows.open("showcase");
  return { windows, showcase };
}
