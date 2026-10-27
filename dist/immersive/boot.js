(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector),
    started = performance.now();
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let completed = 0,
    closed = false,
    pending = null,
    timer = null,
    resolveReady = null;
  function finish() {
    clearTimeout(timer);
    closed = true;
    $("#loading").hidden = true;
    $("#loading").setAttribute("aria-busy", "false");
    document.body.classList.remove("booting");
    if (resolveReady) {
      resolveReady();
      resolveReady = null;
    }
  }
  window.officeBoot = {
    step(label) {
      if (closed || pending) return;
      completed = Math.min(completed + 1, 9);
      const line = document.createElement("li"),
        check = document.createElement("span");
      check.className = "boot-check";
      check.textContent = "[ OK ]";
      line.append(check, document.createTextNode(label));
      $("#boot-log").append(line);
      $("#boot-progress").value = completed;
      $("#boot-count").textContent = completed + " / 9";
      $("#loading-copy").textContent =
        completed === 9 ? "Ready. Opening office…" : "Loading the office…";
    },
    ready() {
      if (closed) return Promise.resolve();
      if (pending) return pending;
      pending = new Promise((resolve) => {
        resolveReady = resolve;

        const delay = motion.matches
          ? 0
          : Math.max(0, 1400 - (performance.now() - started));
        timer = setTimeout(() => {
          if (closed) return;
          $("#loading").classList.add("boot-complete");
          timer = setTimeout(finish, motion.matches ? 0 : 220);
        }, delay);
      });
      return pending;
    },
    fail: finish,
  };
})();
