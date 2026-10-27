import * as THREE from "three";
import { mergeGeometries } from "./vendor/BufferGeometryUtils.js";

export function setupLighting(scene, renderer, viewportWidth) {
  scene.add(new THREE.HemisphereLight("#f1f6f4", "#7b9279", 1.55));
  const key = new THREE.DirectionalLight("#fffaf0", 1.7);
  key.position.set(-8, 20, 12);
  key.target.position.set(0, 0.5, 0);
  key.castShadow = true;
  const shadowSize = viewportWidth < 700 ? 2048 : 4096;
  key.shadow.mapSize.set(shadowSize, shadowSize);
  key.shadow.camera.left = -24;
  key.shadow.camera.right = 24;
  key.shadow.camera.top = 24;
  key.shadow.camera.bottom = -24;
  key.shadow.camera.near = 0.1;
  key.shadow.camera.far = 75;
  key.shadow.bias = -0.0001;
  key.shadow.normalBias = 0.004;
  key.shadow.radius = 4;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight("#e1eceb", 0.55);
  fill.position.set(8, 8, 3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight("#f2fff5", 0.8);
  rim.position.set(0, 10, -14);
  scene.add(rim);
  const glow = new THREE.PointLight("#c8e1d7", 0.09, 0.65, 2);
  glow.position.set(0.665, 0.99, 0.58);
  scene.add(glow);

  const room = new THREE.Scene();
  room.background = new THREE.Color("#b4b6bd");
  for (const [p, size, power] of [
    [[0, 4, 0], [4, 4], 3],
    [[-3, 2, 1], [3, 3], 2],
    [[3, 2, -2], [2, 3], 1.5],
  ]) {
    const card = new THREE.Mesh(
      new THREE.PlaneGeometry(...size),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color().setScalar(power),
        side: THREE.DoubleSide,
      }),
    );
    card.position.set(...p);
    card.lookAt(0, 0.7, 0);
    room.add(card);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentTarget = pmrem.fromScene(room, 0.12);
  scene.environment = environmentTarget.texture;
  scene.environmentIntensity = 0.35;
  pmrem.dispose();
  room.traverse((o) => {
    o.geometry?.dispose();
    o.material?.dispose();
  });
}
export function createSteam(scene, mainOffset) {
  const group = new THREE.Group();
  group.position.set(0.3, 0.825, -0.045).add(mainOffset);
  scene.add(group);
  const vertex = `varying vec2 vUv;uniform float time;uniform float phase;void main(){vUv=uv;vec3 p=position;float y=uv.y;p.x+=sin(y*9.0-time*.8+phase)*.010*y+sin(y*17.0-time*.45)*.004*y;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`;
  const fragment = `varying vec2 vUv;uniform float time;uniform float phase;void main(){float y=vUv.y;float sway=sin(y*11.0-time*.7+phase)*.12*y;float x=(vUv.x-.5-sway)/(0.08+y*.23);float strand=exp(-x*x*5.0);float fade=smoothstep(0.0,.12,y)*(1.0-smoothstep(.35,1.0,y));float a=strand*(.65+.35*sin(y*30.0-time*1.6+phase))*fade*.14;gl_FragColor=vec4(.88,.89,.88,a);}`;
  for (let i = 0; i < 3; i++) {
    const material = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, phase: { value: i * 2.1 } },
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const ribbon = new THREE.Mesh(
      new THREE.PlaneGeometry(0.13, 0.28, 8, 24),
      material,
    );
    ribbon.position.set((i - 1) * 0.008, 0.14, i * 0.004);
    group.add(ribbon);
  }
  return group;
}
function materialBatches(group) {
  group.updateMatrixWorld(true);
  const buckets = new Map();
  group.traverse((o) => {
    if (!o.isMesh) return;
    const key = o.material.uuid;
    let geometry = o.geometry.clone().applyMatrix4(o.matrixWorld);
    if (geometry.index) {
      const flat = geometry.toNonIndexed();
      geometry.dispose();
      geometry = flat;
    }
    for (const attribute of Object.keys(geometry.attributes))
      if (!["position", "normal", "uv"].includes(attribute))
        geometry.deleteAttribute(attribute);
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    if (!geometry.attributes.uv)
      geometry.setAttribute(
        "uv",
        new THREE.BufferAttribute(
          new Float32Array(geometry.attributes.position.count * 2),
          2,
        ),
      );
    if (!buckets.has(key))
      buckets.set(key, { material: o.material, geometries: [] });
    buckets.get(key).geometries.push(geometry);
  });
  return [...buckets.values()].map(({ material, geometries }) => {
    const geometry = mergeGeometries(geometries, false);
    geometries.forEach((g) => g.dispose());
    if (!geometry)
      throw new Error("Unable to assemble the existing workstation.");
    return { geometry, material };
  });
}
export function addCubicles(
  models,
  bare,
  distant,
  partitions,
  mainOffset,
  podCenters,
) {
  const stations = [],
    clusters = [];
  const rotation = new THREE.Matrix4(),
    translation = new THREE.Matrix4();
  for (const [index, [x, z]] of podCenters.entries()) {
    const cluster = new THREE.Matrix4().makeTranslation(x, 0, z);
    clusters.push(cluster);
    for (let quarter = 0; quarter < 4; quarter++) {
      if (x === 0 && z === 0 && quarter === 0) continue;
      rotation.makeRotationY((quarter * Math.PI) / 2);
      translation.makeTranslation(...mainOffset.toArray());
      stations.push({
        pod: index,
        matrix: cluster.clone().multiply(rotation).multiply(translation),
      });
    }
  }
  const groups = { near: [], far: [] };
  for (const [root, kind] of [
    [bare, "near"],
    [distant, "far"],
  ]) {
    for (const { geometry, material } of materialBatches(root)) {
      const mesh = new THREE.InstancedMesh(geometry, material, stations.length);
      mesh.name =
        kind === "near"
          ? "Nearby cubicle workstations"
          : "Distant cubicle workstations";
      stations.forEach((station, i) => mesh.setMatrixAt(i, station.matrix));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      models.add(mesh);
      groups[kind].push(mesh);
    }
  }
  for (const { geometry, material } of materialBatches(partitions)) {
    const mesh = new THREE.InstancedMesh(geometry, material, clusters.length);
    mesh.name = "Four-seat cubicle dividers";
    clusters.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    models.add(mesh);
  }
  return {
    stations,
    groups,
    lastPosition: new THREE.Vector3(Infinity, Infinity, Infinity),
    key: "",
  };
}
export function refreshRoomDetail(
  roomDetail,
  camera,
  podCenters,
  nearClusterCount,
  renderer,
  force = false,
) {
  if (!roomDetail) return;
  const detail = roomDetail;
  if (!force && detail.lastPosition.distanceTo(camera.position) < 1) return;
  detail.lastPosition.copy(camera.position);
  const closest = podCenters
    .map(([x, z], index) => ({
      index,
      distance: (camera.position.x - x) ** 2 + (camera.position.z - z) ** 2,
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, nearClusterCount)
    .map((x) => x.index)
    .sort((a, b) => a - b);
  const key = closest.join(",");
  if (!force && key === detail.key) return;
  detail.key = key;
  const near = new Set(closest);
  for (const kind of ["near", "far"]) {
    const placements = detail.stations.filter(
      (station) => near.has(station.pod) === (kind === "near"),
    );
    for (const mesh of detail.groups[kind]) {
      mesh.count = placements.length;
      placements.forEach((station, index) =>
        mesh.setMatrixAt(index, station.matrix),
      );
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
  renderer.shadowMap.needsUpdate = true;
}
