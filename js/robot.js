import * as THREE from 'three';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import { createNurseGreeting } from './nurse.js';

(() => {
  'use strict';

  const canvas = document.querySelector('#bg');
  if (!canvas) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x071016, 18, 48);

  const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 150);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1 : 1.35));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;

  scene.add(new THREE.HemisphereLight(0xe4f6ff, 0x26373d, 2.8));
  const keyLight = new THREE.DirectionalLight(0xf2f8ff, 4.2);
  keyLight.position.set(-4, 10, 7);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x48cde0, 2.4);
  fillLight.position.set(6, 4, -6);
  scene.add(fillLight);
  const warmLight = new THREE.PointLight(0xffc777, 95, 34, 2);
  warmLight.position.set(-10, 8, 8);
  scene.add(warmLight);
  const cyanLight = new THREE.PointLight(0x43dff5, 120, 38, 2);
  cyanLight.position.set(10, 6, 4);
  scene.add(cyanLight);

  const modelFrame = new THREE.Group();
  const model = new THREE.Group();
  modelFrame.add(model);
  scene.add(modelFrame);

  let modelRadius = 7;
  let progress = 0;
  let cameraProgress = 0;
  let fade = 1;
  let pointerX = 0;
  let pointerY = 0;
  let targetX = 0;
  let targetY = 0;
  let mixer = null;
  let originalRig = null;
  let nurseHand = null;
  let nameDisplay = null;
  let animationTime = 0;
  let liveDisplays = [];
  let lastDisplayUpdate = -1;
  const clock = new THREE.Clock();

  const makeLiveDisplay = (title, accent, position, rotationY) => {
    const displayCanvas = document.createElement('canvas');
    displayCanvas.width = 512;
    displayCanvas.height = 320;
    const context = displayCanvas.getContext('2d');
    const texture = new THREE.CanvasTexture(displayCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x15252b, metalness: 0.72, roughness: 0.28, emissive: 0x071419 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(3.35, 2.2, 0.16), frameMaterial);
    frame.position.set(...position);
    frame.rotation.y = rotationY;
    scene.add(frame);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.12, 1.96), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
    screen.position.set(position[0] + Math.sin(rotationY) * 0.09, position[1], position[2] + Math.cos(rotationY) * 0.09);
    screen.rotation.y = rotationY;
    scene.add(screen);
    const statusLight = new THREE.PointLight(accent, 7, 9, 2);
    statusLight.position.set(position[0], position[1] - 1.5, position[2] + 0.8);
    scene.add(statusLight);
    const display = { context, texture, title, accent, statusLight, position };
    liveDisplays.push(display);
    return display;
  };

  function addNameDisplay() {
    const surface = document.createElement('canvas');
    surface.width = 1024;
    surface.height = 384;
    const texture = new THREE.CanvasTexture(surface);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const monitor = new THREE.Group();
    monitor.name = 'Ritik Anand name monitor';
    // Dedicated space outside the room's right edge, below the telemetry screen.
    // Keep the display in the background plane rather than in front of OT lamps.
    monitor.position.set(modelRadius * 1.32, -modelRadius * 0.12, -modelRadius * 0.28);
    monitor.rotation.y = -0.10;
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(7.9, 3.05, 0.20),
      new THREE.MeshStandardMaterial({ color: 0x12242d, metalness: 0.65, roughness: 0.30 })
    );
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(7.6, 2.85),
      new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })
    );
    screen.position.z = 0.11;
    monitor.add(frame, screen);
    scene.add(monitor);
    nameDisplay = { context: surface.getContext('2d'), texture };
    drawNameDisplay(0);
  }

  function drawNameDisplay(time) {
    if (!nameDisplay) return;
    const { context: ctx, texture } = nameDisplay;
    ctx.fillStyle = '#03131d';
    ctx.fillRect(0, 0, 1024, 384);
    ctx.strokeStyle = '#174653';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, 992, 352);
    ctx.fillStyle = '#72a9b5';
    ctx.textAlign = 'center';
    ctx.font = '500 22px system-ui, sans-serif';
    ctx.fillText('MANUFACTURING  /  AUTOMATION  /  INDUSTRIAL AI', 512, 76);
    // Slow, soft blinking, never a rapid full-screen flash; static if requested.
    const brightness = reducedMotion ? 1 : 0.30 + 0.70 * (0.5 + 0.5 * Math.cos(time * Math.PI));
    ctx.save();
    ctx.globalAlpha = brightness;
    ctx.shadowColor = '#40e8ff';
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#baf7ff';
    ctx.font = '800 116px system-ui, sans-serif';
    ctx.fillText('RITIK ANAND', 512, 235, 920);
    ctx.restore();
    ctx.fillStyle = '#46dfba';
    ctx.font = '500 23px system-ui, sans-serif';
    ctx.fillText('ENGINEERING THE NEXT GENERATION', 512, 315);
    texture.needsUpdate = true;
  }

  const drawLiveDisplay = (display, elapsed, phase, index) => {
    const { context: ctx, texture, title, accent } = display;
    ctx.fillStyle = '#07141a';
    ctx.fillRect(0, 0, 512, 320);
    ctx.strokeStyle = 'rgba(86,190,204,.14)';
    ctx.lineWidth = 1;
    for (let x = 16; x < 512; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 320); ctx.stroke(); }
    for (let y = 16; y < 320; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke(); }
    ctx.fillStyle = '#d9edf1';
    ctx.font = '600 19px system-ui, sans-serif';
    ctx.fillText(title, 22, 32);
    ctx.fillStyle = accent;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(index ? 'OPTICAL TRACKING  /  LIVE' : 'SURGICAL GUIDANCE  /  LIVE', 22, 54);
    ctx.fillStyle = '#43e5b5';
    ctx.beginPath();
    ctx.arc(478, 28, 5 + Math.sin(elapsed * 4) * 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    for (let x = 22; x <= 490; x += 3) {
      const t = x * 0.045 + elapsed * 2.5;
      const pulse = Math.exp(-Math.pow(((x + elapsed * 42) % 158) - 42, 2) / 110) * 22;
      const y = 126 + Math.sin(t) * 13 + Math.sin(t * 0.28) * 7 - pulse;
      if (x === 22) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    const metrics = index
      ? [`TRACK  ${Math.round(96 + Math.sin(elapsed) * 2)}%`, `POSE  ${phase > 0.25 ? 'LOCKED' : 'READY'}`, `LATENCY  ${Math.round(12 + Math.sin(elapsed * 0.8) * 2)} ms`]
      : [`DEPTH  ${(38.2 + phase * 4.6).toFixed(1)} mm`, `ALIGN  ±${(0.4 + Math.sin(elapsed * 0.8) * 0.06).toFixed(2)}°`, `RPM  ${Math.round(480 + phase * 720)}`];
    metrics.forEach((value, i) => {
      const x = 18 + i * 160;
      ctx.fillStyle = 'rgba(20,45,52,.9)';
      ctx.fillRect(x, 213, 150, 52);
      ctx.strokeStyle = 'rgba(99,183,194,.3)';
      ctx.strokeRect(x, 213, 150, 52);
      ctx.fillStyle = i === 1 ? accent : '#c5e3e9';
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.fillText(value, x + 9, 236);
      ctx.fillStyle = '#79969d';
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(index ? 'NAVIGATION' : 'OPERATING ROOM', x + 9, 254);
    });
    ctx.fillStyle = '#43e5b5';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(phase > 0.2 ? 'PROCEDURE ACTIVE  •  TELEMETRY SIMULATION' : 'SYSTEM READY  •  TELEMETRY SIMULATION', 22, 296);
    texture.needsUpdate = true;
  };

  const ceilingBars = [];
  const ceilingLights = [];
  for (let i = -1; i <= 1; i++) {
    const barMaterial = new THREE.MeshBasicMaterial({ color: i === 0 ? 0xdffaff : 0x8beeff, toneMapped: false });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.08, 0.22), barMaterial);
    bar.position.set(i * 4.5, 8, -5);
    scene.add(bar);
    ceilingBars.push(bar);
    // A visible light surface alone does not illuminate standard GLTF materials.
    const light = new THREE.PointLight(0xe4f6ff, 180, 32, 2);
    light.position.copy(bar.position);
    light.position.y -= 0.25;
    scene.add(light);
    ceilingLights.push(light);
  }

  const surgicalLights = [-1, 1].map((side) => {
    const light = new THREE.SpotLight(0xf4faff, 420, 32, Math.PI / 5, 0.65, 2);
    light.userData.side = side;
    scene.add(light, light.target);
    return light;
  });

  function rigOriginalModel(root) {
    root.updateWorldMatrix(true, true);
    let source = null;
    root.traverse((object) => {
      if (object.isMesh && !object.isSkinnedMesh &&
          (!source || object.geometry.attributes.position.count > source.geometry.attributes.position.count)) source = object;
    });
    if (!source || reducedMotion) return;

    // Landmarks verified on Ot.glb after its 13-unit normalization. The asset
    // is merged, so feathered skin weights isolate limbs without hard cuts.
    const shoulderPoint = new THREE.Vector3(-2.52, 1.03, -1.50);
    const elbowPoint = new THREE.Vector3(-0.46, 0.22, -1.18);
    const tipPoint = new THREE.Vector3(0.38, -0.72, -0.95);
    const leftElbowPoint = new THREE.Vector3(0.92, -0.25, -1.60);
    const leftWristPoint = new THREE.Vector3(0.98, -0.60, -0.76);
    const leftHandPoint = new THREE.Vector3(1.06, -0.84, -0.64);
    const rightElbowPoint = new THREE.Vector3(2.68, -0.37, -1.23);
    const rightWristPoint = new THREE.Vector3(2.06, -0.70, -0.63);
    const rightHandPoint = new THREE.Vector3(1.48, -0.80, -0.40);
    const localMatrix = source.matrixWorld.clone().invert();
    const bones = [];
    const makeBone = (name, worldPoint, parent = null, parentPoint = null) => {
      const bone = new THREE.Bone();
      bone.name = name;
      if (worldPoint) bone.position.copy(worldPoint).applyMatrix4(localMatrix);
      if (parentPoint) bone.position.sub(parentPoint.clone().applyMatrix4(localMatrix));
      if (parent) parent.add(bone);
      bones.push(bone);
      return bone;
    };
    const fixed = makeBone('OT fixed geometry');
    const shoulder = makeBone('Original robot shoulder', shoulderPoint, fixed);
    const elbow = makeBone('Original robot elbow', elbowPoint, shoulder, shoulderPoint);
    const leftForearm = makeBone('Surgeon left forearm', leftElbowPoint, fixed);
    const leftWrist = makeBone('Surgeon left wrist', leftWristPoint, leftForearm, leftElbowPoint);
    const rightForearm = makeBone('Surgeon right forearm', rightElbowPoint, fixed);
    const rightWrist = makeBone('Surgeon right wrist', rightWristPoint, rightForearm, rightElbowPoint);
    const nurseHead = makeBone('Nurse original head', new THREE.Vector3(5.03, 0.55, -1.92), fixed);

    const capsule = (start, end, radius) => {
      const direction = end.clone().sub(start);
      return { start, direction, lengthSq: direction.lengthSq(), radius };
    };
    const upperRegion = capsule(shoulderPoint, elbowPoint, 0.43);
    const lowerRegion = capsule(elbowPoint, tipPoint, 0.32);
    const leftRegion = capsule(leftElbowPoint, leftHandPoint, 0.32);
    const rightRegion = capsule(rightElbowPoint, rightHandPoint, 0.38);
    const offset = new THREE.Vector3();
    const distance = new THREE.Vector3();
    const influence = (point, region) => {
      offset.subVectors(point, region.start);
      const along = THREE.MathUtils.clamp(offset.dot(region.direction) / region.lengthSq, 0, 1);
      distance.copy(offset).addScaledVector(region.direction, -along);
      return 1 - THREE.MathUtils.smoothstep(distance.length(), region.radius * 0.60, region.radius);
    };
    const positions = source.geometry.attributes.position;
    const indices = new Uint16Array(positions.count * 4);
    const weights = new Float32Array(positions.count * 4);
    const point = new THREE.Vector3();
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i).applyMatrix4(source.matrixWorld);
      const upper = influence(point, upperRegion);
      const lower = influence(point, lowerRegion);
      const robot = Math.max(upper, lower) * THREE.MathUtils.smoothstep(point.x, -2.72, -2.30);
      const left = influence(point, leftRegion) * THREE.MathUtils.smoothstep(point.distanceTo(leftElbowPoint), 0.04, 0.38);
      const right = influence(point, rightRegion) * THREE.MathUtils.smoothstep(point.distanceTo(rightElbowPoint), 0.04, 0.38);
      const head = THREE.MathUtils.smoothstep(point.y, 0.56, 0.78)
        * (1 - THREE.MathUtils.smoothstep(Math.hypot(point.x - 5.03, point.z + 1.92), 0.75, 0.85))
        * (point.y < 1.85 ? 1 : 0);
      let strength = 0, first = 0, second = 0, distal = 0;
      if (head > 0) {
        strength = head; first = 7; second = 7;
      } else if (robot > 0 && robot >= left && robot >= right) {
        strength = robot; first = 1; second = 2;
        distal = lower * THREE.MathUtils.smoothstep(point.x, elbowPoint.x - 0.18, elbowPoint.x + 0.16);
      } else if (left > 0 && left >= right) {
        strength = left; first = 3; second = 4;
        distal = THREE.MathUtils.smoothstep(point.distanceTo(leftElbowPoint), 0.76, 1.02);
      } else if (right > 0) {
        strength = right; first = 5; second = 6;
        distal = THREE.MathUtils.smoothstep(point.distanceTo(rightElbowPoint), 0.78, 1.12);
      }
      const at = i * 4;
      // Bone zero is stationary: all unselected room/patient vertices stay fixed.
      indices[at + 1] = first;
      indices[at + 2] = second;
      weights[at] = 1 - strength;
      weights[at + 1] = strength * (1 - distal);
      weights[at + 2] = strength * distal;
    }
    source.geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
    source.geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
    const skinned = new THREE.SkinnedMesh(source.geometry, source.material);
    skinned.name = 'Original OT animated model';
    skinned.position.copy(source.position);
    skinned.quaternion.copy(source.quaternion);
    skinned.scale.copy(source.scale);
    skinned.frustumCulled = false;
    source.parent.add(skinned);
    skinned.add(fixed);
    skinned.updateWorldMatrix(true, true);
    skinned.bind(new THREE.Skeleton(bones));
    source.removeFromParent();
    originalRig = { shoulder, elbow, leftForearm, leftWrist, rightForearm, rightWrist };
    nurseHand.attachHead(nurseHead, skinned);
  }

  function animateOriginalModel(time, phase) {
    if (!originalRig) return;
    const { shoulder, elbow, leftForearm, leftWrist, rightForearm, rightWrist } = originalRig;
    const strength = 0.75 + phase * 0.25;
    // Visible 4-second positioning cycle, independent of scrolling. The source
    // is X-rotated, so local Y rotates the arm in the room's vertical plane.
    const cycle = Math.sin(time * 1.56);
    const settle = Math.sin(time * 1.56 + 0.45);
    shoulder.rotation.y = cycle * 0.12 * strength;
    // Counter-rotate the elbow so the tip stays close to the working area.
    elbow.rotation.y = -settle * 0.17 * strength;
    // Visible forearm strokes, not just small wrist twists. Keep the elbow
    // anchors fixed while the working hand traces a short oval over the patient.
    const workCycle = time * 2.4;
    const stroke = Math.sin(workCycle);
    const returnStroke = Math.sin(workCycle - 0.35);
    const reposition = Math.sin(time * 0.55);
    leftForearm.rotation.y = (-0.018 + stroke * 0.15) * strength;
    leftForearm.rotation.x = 0.22 + Math.cos(workCycle) * 0.055 * strength;
    leftWrist.rotation.y = -leftForearm.rotation.y * 0.30;
    leftWrist.rotation.z = (stroke * 0.12 + reposition * 0.02) * strength;
    rightForearm.rotation.y = (0.012 - returnStroke * 0.085) * strength;
    rightForearm.rotation.x = 0.18 + Math.cos(workCycle - 0.35) * 0.035 * strength;
    rightWrist.rotation.y = -rightForearm.rotation.y * 0.30;
    rightWrist.rotation.z = (-returnStroke * 0.075 + reposition * 0.018) * strength;
  }

  let equipment = null;
  const lampRigs = [];
  const lampAim = new THREE.Vector3();
  const lampUp = new THREE.Vector3(0, 1, 0);

  function addAnimatedEquipment(floorY) {
    const shell = new THREE.MeshStandardMaterial({ color: 0xdde8ec, metalness: 0.35, roughness: 0.32 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x7d969f, metalness: 0.82, roughness: 0.24 });
    const jointMaterial = new THREE.MeshStandardMaterial({ color: 0x183039, metalness: 0.55, roughness: 0.4 });
    const lensMaterial = new THREE.MeshStandardMaterial({ color: 0xf1fbff, emissive: 0xcbefff, emissiveIntensity: 2, roughness: 0.2 });
    const segment = (parent, length, radius, material) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.12, length, 16), material);
      mesh.position.y = length / 2;
      parent.add(mesh);
      return mesh;
    };
    const joint = (parent, y, radius) => {
      const pivot = new THREE.Group();
      pivot.position.y = y;
      pivot.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12), jointMaterial));
      parent.add(pivot);
      return pivot;
    };

    // Independent joints: never deform or sway the merged room mesh.
    const base = new THREE.Group();
    base.name = 'Animated surgical robot';
    // The original asset is now rigged; the extra demonstration arm obscures it.
    base.visible = false;
    base.scale.setScalar(modelRadius);
    base.position.set(modelRadius * 0.38, floorY, modelRadius * 0.12);
    scene.add(base);
    segment(base, 0.22, 0.055, shell);
    const shoulder = joint(base, 0.22, 0.055);
    segment(shoulder, 0.29, 0.032, shell);
    const elbow = joint(shoulder, 0.29, 0.043);
    segment(elbow, 0.25, 0.026, shell);
    const wrist = joint(elbow, 0.25, 0.034);
    const tool = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.006, 0.16, 12), metal);
    tool.position.y = -0.10;
    wrist.add(tool);
    const indicator = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.006, 6, 24), lensMaterial);
    indicator.rotation.x = Math.PI / 2;
    wrist.add(indicator);
    equipment = { base, shoulder, elbow, wrist, tool };

    surgicalLights.forEach((light) => {
      const side = light.userData.side;
      const mount = new THREE.Group();
      mount.name = 'Articulated OT lamp';
      mount.position.set(side * modelRadius * 0.46, modelRadius * 0.78, modelRadius * 0.12);
      const arm = new THREE.Group();
      mount.add(arm);
      // Horizontal support rotates about its ceiling attachment.
      const boom = new THREE.Mesh(new THREE.BoxGeometry(modelRadius * 0.22, modelRadius * 0.018, modelRadius * 0.025), shell);
      boom.position.x = -side * modelRadius * 0.11;
      arm.add(boom);
      const dropArm = new THREE.Mesh(new THREE.CylinderGeometry(modelRadius * 0.012, modelRadius * 0.012, modelRadius * 0.12, 12), metal);
      dropArm.position.set(-side * modelRadius * 0.22, -modelRadius * 0.06, 0);
      arm.add(dropArm);
      const head = new THREE.Group();
      head.position.set(-side * modelRadius * 0.22, -modelRadius * 0.12, 0);
      arm.add(head);
      const housing = new THREE.Mesh(new THREE.CylinderGeometry(modelRadius * 0.085, modelRadius * 0.095, modelRadius * 0.025, 32), shell);
      head.add(housing);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(modelRadius * 0.078, modelRadius * 0.078, modelRadius * 0.004, 32), lensMaterial);
      lens.position.y = modelRadius * 0.015;
      head.add(lens);
      scene.add(mount);
      lampRigs.push({ arm, head, light, side });
    });
  }

  function illuminateOriginalLamps() {
    // Measured on the two original GLB lamp faces, not the added fixtures.
    const fixtures = [
      { center: [-1.9819, 2.8887, -1.0260], normal: [0.5821, -0.7891, 0.1961], radius: 0.86 },
      { center: [3.3074, 2.6357, -1.2556], normal: [-0.2350, -0.7803, 0.5795], radius: 0.86 }
    ];
    const diffuserMaterial = new THREE.MeshBasicMaterial({ color: 0xb9f3ff, toneMapped: false, side: THREE.DoubleSide });
    const ledMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, side: THREE.DoubleSide });
    const forward = new THREE.Vector3(0, 0, 1);
    fixtures.forEach((fixture, index) => {
      const normal = new THREE.Vector3(...fixture.normal).normalize();
      const face = new THREE.Group();
      face.name = `Original OT lamp ${index + 1} illuminated face`;
      face.position.set(...fixture.center).addScaledVector(normal, 0.012);
      face.quaternion.setFromUnitVectors(forward, normal);
      // Annular diffuser leaves the original central handle unobstructed.
      face.add(new THREE.Mesh(new THREE.RingGeometry(0.30, fixture.radius, 64), diffuserMaterial));
      for (let led = 0; led < 16; led++) {
        const angle = led / 16 * Math.PI * 2;
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.065, 12), ledMaterial);
        lens.position.set(Math.cos(angle) * 0.64, Math.sin(angle) * 0.64, 0.004);
        face.add(lens);
      }
      scene.add(face);
      const light = surgicalLights[index];
      light.name = `Original OT lamp ${index + 1} patient spotlight`;
      light.userData.originalFixture = true;
      light.position.copy(face.position).addScaledVector(normal, 0.08);
      light.color.setHex(0xf0faff);
      light.intensity = 1400;
      light.angle = 0.36;
      light.penumbra = 0.5;
      light.distance = 18;
      light.target.position.set(index === 0 ? 0.65 : 1.15, -1.40, -0.35);
    });
    // Remove the duplicate visual lamp heads; the original ones now provide light.
    scene.children.filter((object) => object.name === 'Articulated OT lamp').forEach((object) => { object.visible = false; });
  }

  function animateEquipment(time, phase) {
    if (!equipment) return;
    const { base, shoulder, elbow, wrist, tool } = equipment;
    // Slow coordinated positioning, with only millimetre-scale tool travel.
    base.rotation.y = -0.12 + Math.sin(time * 0.22) * 0.045;
    shoulder.rotation.z = 0.36 + phase * 0.12 + Math.sin(time * 0.38) * 0.035;
    elbow.rotation.z = 0.72 - phase * 0.18 + Math.sin(time * 0.38 + 0.8) * 0.045;
    wrist.rotation.z = -shoulder.rotation.z - elbow.rotation.z + 0.08;
    tool.position.y = -0.10 - (1 - Math.cos(time * 0.65)) * 0.0025 * phase;
    lampRigs.forEach(({ arm, head, light, side }) => {
      if (light.userData.originalFixture) return;
      arm.rotation.y = side * (0.12 + phase * 0.08 + Math.sin(time * 0.16) * 0.025);
      head.getWorldPosition(light.position);
      light.target.position.set(modelRadius * (0.04 + Math.sin(time * 0.22) * 0.008), -modelRadius * 0.15, modelRadius * 0.05);
      lampAim.subVectors(light.target.position, light.position).normalize();
      // Lens faces along local +Y; account for the rotating support's yaw.
      lampAim.applyAxisAngle(lampUp, -arm.rotation.y);
      head.quaternion.setFromUnitVectors(lampUp, lampAim);
    });
  }

  function addNurseHand() {
    nurseHand = createNurseGreeting(scene, { reducedMotion, modelRadius });
  }

  function resize() {
    const width = innerWidth;
    const height = innerHeight;
    camera.aspect = width / height;
    camera.fov = width < 700 ? 50 : 42;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, width < 700 ? 1 : 1.35));
    renderer.setSize(width, height, false);
  }

  function frameModel(root) {
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const longestSide = Math.max(size.x, size.y, size.z) || 1;
    const scale = 13 / longestSide;

    modelFrame.scale.setScalar(scale);
    modelFrame.position.copy(center).multiplyScalar(-scale);
    modelRadius = Math.max(1, size.length() * scale * 0.5);

    // Place real OT lighting in the normalized model's world-space frame.
    ceilingBars.forEach((bar, index) => {
      bar.position.set((index - 1) * modelRadius * 0.55, modelRadius * 0.88, -modelRadius * 0.45);
      ceilingLights[index].position.copy(bar.position);
      ceilingLights[index].position.y -= 0.25;
      ceilingLights[index].distance = modelRadius * 4;
    });
    surgicalLights.forEach((light) => {
      light.position.set(light.userData.side * modelRadius * 0.28, modelRadius * 0.65, modelRadius * 0.22);
      light.target.position.set(0, -modelRadius * 0.15, modelRadius * 0.05);
      light.distance = modelRadius * 3;
    });

    addAnimatedEquipment((bounds.min.y - center.y) * scale);
    illuminateOriginalLamps();
    addNurseHand();
    addNameDisplay();

    makeLiveDisplay('ROBOT CONTROL', '#49e1ef', [-modelRadius * 0.83, modelRadius * 0.28, -modelRadius * 0.12], 0.1);
    makeLiveDisplay('SURGICAL VIEW', '#ffbd69', [modelRadius * 0.83, modelRadius * 0.28, -modelRadius * 0.12], -0.1);

    const distance = modelRadius / Math.sin(THREE.MathUtils.degToRad(camera.fov * 0.5)) * 1.18;
    camera.near = Math.max(0.1, distance / 120);
    camera.far = Math.max(150, distance * 5);
    camera.updateProjectionMatrix();
    camera.position.set(0, modelRadius * 0.12, distance);
    camera.lookAt(-modelRadius * (innerWidth < 700 ? 0.02 : 0.22), modelRadius * 0.08, 0);
  }

 new GLTFLoader().load(
    'assessts/Ot.glb',
    (gltf) => {
      model.add(gltf.scene);
      frameModel(gltf.scene);
      rigOriginalModel(gltf.scene);
      if (gltf.animations.length) {
        mixer = new THREE.AnimationMixer(gltf.scene);
        gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
      }

      // Model successfully load hone ke baad loader ko hata dein
      const loaderWrapper = document.getElementById('loader-wrapper');
      if (loaderWrapper) {
        loaderWrapper.style.opacity = '0';
        setTimeout(() => {
          loaderWrapper.style.display = 'none';
        }, 500);
      }
    },
    (xhr) => {
      // Live progress percentage dikhane ke liye
      const progressText = document.getElementById('progress-text');
      if (xhr.lengthComputable && progressText) {
        const percentComplete = Math.min(100, Math.round((xhr.loaded / xhr.total) * 100));
        progressText.innerText = `Stealing extra RAM from the matrix...... ${percentComplete}% completed`;
      }
    },
    (error) => {
      console.error('Could not load the OT background model:', error);
      const progressText = document.getElementById('progress-text');
      if (progressText) {
        progressText.innerText = 'Error loading 3D model.';
      }
    }
  );

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', (event) => {
    targetX = (event.clientX / innerWidth - 0.5) * 2;
    targetY = (event.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });
  resize();

  function animate() {
    requestAnimationFrame(animate);
    const frameDelta = clock.getDelta();
    const dt = Math.min(frameDelta, 0.05);
    const elapsed = clock.elapsedTime;
    const pointerEase = 1 - Math.exp(-1.5 * dt);
    pointerX += ((reducedMotion ? 0 : targetX) - pointerX) * pointerEase;
    pointerY += ((reducedMotion ? 0 : targetY) - pointerY) * pointerEase;
    cameraProgress += (progress - cameraProgress) * (1 - Math.exp(-3 * dt));

    if (mixer && !reducedMotion) mixer.update(dt);
    // Use real elapsed seconds for procedural motion: clamped mixer/physics dt
    // otherwise makes this million-vertex scene animate in slow motion.
    if (!reducedMotion) animationTime = elapsed;

    const distance = modelRadius / Math.sin(THREE.MathUtils.degToRad(camera.fov * 0.5)) * 1.18;
    const approach = reducedMotion ? 0 : THREE.MathUtils.smootherstep(cameraProgress, 0, 1);
    animateOriginalModel(animationTime, approach);
    animateEquipment(animationTime, approach);
    const mobile = innerWidth < 700;
    // Push into a tighter shot while trucking right and panning with the subject.
    const dollyDistance = distance * THREE.MathUtils.lerp(mobile ? 0.84 : 0.74, mobile ? 0.60 : 0.46, approach);
    const orbit = approach * (mobile ? 0.14 : 0.30);
    const rightGlide = modelRadius * approach * (mobile ? 0.20 : 0.55);
    const focusX = modelRadius * THREE.MathUtils.lerp(mobile ? -0.015 : -0.24, mobile ? 0.04 : 0.10, approach);
    const focusY = modelRadius * (0.08 + approach * 0.12);
    camera.position.set(
      focusX + rightGlide + Math.sin(orbit) * dollyDistance + pointerX * modelRadius * 0.025,
      focusY + modelRadius * THREE.MathUtils.lerp(0.12, 0.05, approach) - pointerY * modelRadius * 0.018,
      Math.cos(orbit) * dollyDistance
    );
    camera.lookAt(focusX, focusY, 0);
    if (nurseHand) nurseHand.update(animationTime, frameDelta, camera);
    if (elapsed - lastDisplayUpdate > 0.1) {
      lastDisplayUpdate = elapsed;
      liveDisplays.forEach((display, index) => drawLiveDisplay(display, reducedMotion ? 0 : elapsed, approach, index));
      drawNameDisplay(animationTime);
    }
    renderer.setClearColor(0x071016, 0);
    renderer.domElement.style.opacity = String(fade);
    renderer.render(scene, camera);
  }

  animate();
  window.Robot = {
    setProgress(value) { progress = THREE.MathUtils.clamp(Number(value) || 0, 0, 1); },
    setFade(value) { fade = THREE.MathUtils.clamp(Number(value) || 0, 0, 1); }
  };
  window.dispatchEvent(new Event('scroll'));
})();
