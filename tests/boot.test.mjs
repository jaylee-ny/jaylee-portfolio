import fs from "node:fs/promises";
import vm from "node:vm";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import test from "node:test";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../dist", import.meta.url));
const html = await fs.readFile(root + "/index.html", "utf8"),
  source = await fs.readFile(root + "/immersive/boot.js", "utf8");
function boot(reduced = false) {
  const { document } = parseHTML(html),
    tasks = new Map();
  let now = 0,
    next = 0;
  const context = {
    document,
    window: null,
    performance: { now: () => now },
    matchMedia: () => ({ matches: reduced }),
    setTimeout(fn, delay) {
      tasks.set(++next, { fn, at: now + delay });
      return next;
    },
    clearTimeout(id) {
      tasks.delete(id);
    },
  };
  context.window = context;
  vm.runInNewContext(source, context);
  const advance = (ms) => {
    const target = now + ms;
    while (true) {
      const next = [...tasks.entries()]
        .filter(([, task]) => task.at <= target)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      tasks.delete(next[0]);
      now = next[1].at;
      next[1].fn();
    }
    now = target;
  };
  return { document, api: context.officeBoot, advance, tasks, context };
}
test("terminal progress, timing, reduced motion and failure recovery", async () => {
  const a = boot(),
    q = (s) => a.document.querySelector(s);
  assert(!q("#loading").hidden);
  assert(!q("#start-hint").hidden);
  assert(q("#desk").hasAttribute("inert"));
  assert.equal(q("#boot-log").children.length, 0);
  a.advance(300);
  assert.equal(
    q("#boot-log").children.length,
    0,
    "Progress must not invent loaded components",
  );
  for (const label of [
    "Desk",
    "Chair",
    "Coffee mug",
    "Workstations",
    "Background desks",
    "Cubicles",
    "Office room",
    "Macintosh display",
    "Office ready",
  ])
    a.api.step(label);
  assert.equal(q("#boot-log").children.length, 9);
  assert.equal(q("#boot-progress").value, 9);
  assert.equal(q("#boot-count").textContent, "9 / 9");
  let done = false;
  const ready = a.api.ready().then(() => (done = true));
  a.advance(1099);
  assert(!q("#loading").hidden);
  assert(!q("#loading").classList.contains("boot-complete"));
  a.advance(1);
  assert(q("#loading").classList.contains("boot-complete"));
  a.advance(220);
  await ready;
  assert(done);
  assert(q("#loading").hidden);
  assert.equal(q("#loading").getAttribute("aria-busy"), "false");
  assert(!a.document.body.classList.contains("booting"));
  assert(!q("#start-hint").hidden);
  await a.api.ready();
  a.api.step("Late arrival");
  assert.equal(
    q("#boot-log").children.length,
    9,
    "Boot never replays on return",
  );
  assert.equal(a.tasks.size, 0);
  const slow = boot();
  slow.advance(5000);
  const slowReady = slow.api.ready();
  slow.advance(0);
  assert(
    slow.document.querySelector("#loading").classList.contains("boot-complete"),
  );
  slow.advance(220);
  await slowReady;
  assert(slow.document.querySelector("#loading").hidden);
  const reduced = boot(true);
  const reducedReady = reduced.api.ready();
  reduced.advance(0);
  await reducedReady;
  assert(reduced.document.querySelector("#loading").hidden);
  assert.equal(reduced.tasks.size, 0);
  const failed = boot();
  const interrupted = failed.api.ready();
  failed.api.fail();
  await interrupted;
  assert(failed.document.querySelector("#loading").hidden);
  assert.equal(failed.tasks.size, 0);
  failed.api.step("Late asset");
  assert.equal(failed.document.querySelector("#boot-log").children.length, 0);
  const noModule = boot();
  const watchdog = [...noModule.document.querySelectorAll("script")].find((s) =>
    /window\.deskModuleReady\s*=\s*false/.test(s.textContent),
  );
  vm.runInNewContext(watchdog.textContent, noModule.context);
  noModule.advance(45000);
  assert(noModule.document.querySelector("#loading").hidden);
  assert(!noModule.document.querySelector("#skip").hidden);
  assert.equal(noModule.document.querySelector("#desk").inert, false);
  assert(!noModule.document.querySelector("#fallback-directions").hidden);
  const css = await fs.readFile(root + "/immersive/desk.css", "utf8");
  assert(/prefers-reduced-motion:\s*reduce/.test(css));
  assert(!html.includes('start-hint" hidden'));
  assert(
    /#start-hint\s*\{[^}]*position:\s*fixed;[^}]*z-index:\s*50;/s.test(css),
  );
});
