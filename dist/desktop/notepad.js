import { select } from "./dom.js";

const storageKey = "james-lee-desktop-note-v1";

export function initializeNotepad(root, host, download) {
  const note = select("#note-text", root);
  const status = select("#note-status", root);
  try {
    note.value = host.localStorage.getItem(storageKey) || "";
  } catch {
    status.textContent = "Storage unavailable. Use Save TXT to keep a copy.";
  }
  note.addEventListener("input", () => {
    try {
      host.localStorage.setItem(storageKey, note.value);
      status.textContent = "Saved on this device.";
    } catch {
      status.textContent = "Could not save on this device. Use Save TXT.";
    }
  });
  select("#note-save", root).addEventListener("click", () => {
    try {
      download(
        new host.Blob([note.value], { type: "text/plain;charset=utf-8" }),
        "note.txt",
      );
    } catch {
      status.textContent =
        "Could not download the note. Your text is still here.";
    }
  });
}
