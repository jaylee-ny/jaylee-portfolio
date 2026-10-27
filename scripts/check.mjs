import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { parse } from "acorn";
import { parseHTML } from "linkedom";

const project = fileURLToPath(new URL("..", import.meta.url));
const output = path.join(project, "dist");

async function filesIn(directory) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesIn(file)));
    else files.push(file);
  }
  return files;
}

async function asset(reference, directory) {
  if (!reference || /^(https?:|data:|blob:|mailto:|tel:|#)/.test(reference))
    return;
  const clean = reference.split(/[?#]/)[0];
  if (!clean) return;
  assert(
    !clean.startsWith("/"),
    `Asset must support a GitHub project subdirectory: ${reference}`,
  );
  const file = path.resolve(directory, clean);
  assert(
    file.startsWith(output + path.sep) || file === output,
    `Asset escapes published folder: ${reference}`,
  );
  await fs.access(file);
}

const published = await filesIn(output);
let checked = 0;
for (const file of published) {
  if (!/\.(html|css|js)$/.test(file)) continue;
  const source = await fs.readFile(file, "utf8");
  const vendor = file.includes(path.join("immersive", "vendor"));
  if (!vendor) {
    assert(
      !/appgprj_|\/workspace\/scratch\/|siwc_bypass|gh[pousr]_[A-Za-z0-9]{20}/.test(
        source,
      ),
      `Deployment metadata or credentials in ${file}`,
    );
  }
  if (file.endsWith(".js")) {
    const comments = [];
    const tree = parse(source, {
      ecmaVersion: "latest",
      sourceType: "module",
      onComment: comments,
    });
    assert(
      comments.every(
        (comment) =>
          vendor &&
          /@license|Copyright|SPDX-License|@preserve/i.test(comment.value),
      ),
      `Unexpected code comment in ${file}`,
    );
    for (const node of tree.body) {
      if (
        ![
          "ImportDeclaration",
          "ExportNamedDeclaration",
          "ExportAllDeclaration",
        ].includes(node.type) ||
        !node.source
      )
        continue;
      const reference = node.source.value;
      if (reference === "three")
        await fs.access(path.join(output, "immersive/vendor/three.module.js"));
      else await asset(reference, path.dirname(file));
    }
    if (!vendor) {
      for (const match of source.matchAll(
        /['"](immersive\/(?:models|textures|renders)\/[^'"\s]+)['"]/g,
      ))
        await asset(match[1], output);
      for (const match of source.matchAll(/['"]([\w-]+\.glb)['"]/g))
        await asset("immersive/models/" + match[1], output);
    }
  }
  if (file.endsWith(".css")) {
    assert(!source.includes("/*"), `Unexpected CSS comment in ${file}`);
    for (const match of source.matchAll(/url\(['"]?([^)'"\s]+)/g))
      await asset(match[1], path.dirname(file));
  }
  if (file.endsWith(".html")) {
    assert(!source.includes("<!--"), `Unexpected HTML comment in ${file}`);
    const { document } = parseHTML(source);
    const ids = new Set();
    for (const element of document.querySelectorAll("[id]")) {
      assert(!ids.has(element.id), `Duplicate ID ${element.id} in ${file}`);
      ids.add(element.id);
    }
    for (const element of document.querySelectorAll("[src],[href]")) {
      await asset(
        element.getAttribute("src") || element.getAttribute("href"),
        path.dirname(file),
      );
    }
    for (const script of document.querySelectorAll("script:not([src])")) {
      if (script.type === "importmap") JSON.parse(script.textContent);
      else parse(script.textContent, { ecmaVersion: "latest" });
    }
  }
  checked++;
}
for (const folder of ["scripts", "tests"]) {
  for (const file of await filesIn(path.join(project, folder))) {
    if (!file.endsWith(".mjs")) continue;
    const comments = [];
    parse(await fs.readFile(file, "utf8"), {
      ecmaVersion: "latest",
      sourceType: "module",
      onComment: comments,
    });
    assert.equal(comments.length, 0, `Unexpected code comment in ${file}`);
  }
}
for (const file of published.filter((file) => file.endsWith(".glb"))) {
  const bytes = await fs.readFile(file);
  assert.equal(
    bytes.toString("ascii", 0, 4),
    "glTF",
    `Invalid model header: ${file}`,
  );
  assert.equal(
    bytes.readUInt32LE(8),
    bytes.length,
    `Invalid model length: ${file}`,
  );
  const json = JSON.parse(
    bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString(),
  );
  for (const item of [...(json.buffers || []), ...(json.images || [])]) {
    if (item.uri) await asset(item.uri, path.dirname(file));
  }
}
console.log(
  `Checked ${checked} source files, imports, local assets, model containers and comment policy.`,
);
