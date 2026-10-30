import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const WAVE_PERIOD = 1.15;
const WAVE_CYCLES = 3;

export function createNurseGreeting(scene, { reducedMotion, modelRadius }) {
  const sleeve = new THREE.MeshStandardMaterial({ color: 0x318eaa, roughness: 0.88 });
  const glove = new THREE.MeshStandardMaterial({ color: 0xb7d2d6, roughness: 0.72 });
  const seam = new THREE.MeshStandardMaterial({ color: 0x8eafb7, roughness: 0.8 });
  const sphere = new THREE.SphereGeometry(1, 24, 16);
  const arm = new THREE.Group();
  arm.name = 'Nurse right arm and hand';
  arm.position.set(4.46, 0.12, -1.94);
  scene.add(arm);

  function rounded(parent, position, scale, material = glove) {
    const mesh = new THREE.Mesh(sphere, material);
    mesh.position.copy(position);
    mesh.scale.set(...scale);
    parent.add(mesh);
  }

  function link(parent, end, radius, material) {
    const length = end.length();
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, Math.max(0.001, length - 2 * radius), 6, 24), material);
    mesh.position.copy(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(UP, end.clone().normalize());
    parent.add(mesh);
  }

  const elbowOffset = new THREE.Vector3(-0.24, -0.95, 0.46);
  const wristOffset = new THREE.Vector3(0.55, 0.18, 0.54);
  rounded(arm, new THREE.Vector3(), [0.18, 0.19, 0.18], sleeve);
  link(arm, elbowOffset, 0.16, sleeve);
  const elbow = new THREE.Group();
  elbow.name = 'Nurse animated right elbow';
  elbow.position.copy(elbowOffset);
  arm.add(elbow);
  rounded(elbow, new THREE.Vector3(), [0.145, 0.15, 0.145], sleeve);
  link(elbow, wristOffset, 0.105, glove);
  link(elbow, wristOffset.clone().multiplyScalar(0.24), 0.137, sleeve);

  const hand = new THREE.Group();
  hand.name = 'Nurse right gloved hand';
  hand.position.copy(wristOffset);
  const idleWrist = new THREE.Quaternion().setFromUnitVectors(UP, new THREE.Vector3(0.96, 0.18, 0.20).normalize());
  hand.quaternion.copy(idleWrist);
  elbow.add(hand);
  rounded(hand, new THREE.Vector3(0, 0.105, 0), [0.10, 0.14, 0.052]);
  const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.077, 0.006, 8, 32), seam);
  cuff.rotation.x = Math.PI / 2;
  hand.add(cuff);

  // Exactly five digit chains, each with three independently rotating joints.
  // Capsule segments overlap at their joint spheres: flexion never opens gaps.
  const fingers = [];
  const definitions = [
    { name: 'Index', x: 0.072, y: 0.19, lengths: [0.080, 0.055, 0.040], radius: 0.022 },
    { name: 'Middle', x: 0.024, y: 0.205, lengths: [0.090, 0.060, 0.044], radius: 0.023 },
    { name: 'Ring', x: -0.024, y: 0.197, lengths: [0.083, 0.056, 0.040], radius: 0.021 },
    { name: 'Little', x: -0.072, y: 0.18, lengths: [0.064, 0.043, 0.033], radius: 0.018 },
    { name: 'Thumb', x: 0.088, y: 0.055, lengths: [0.055, 0.047, 0.038], radius: 0.025 }
  ];
  definitions.forEach((definition, digit) => {
    let parent = hand;
    const joints = [];
    definition.lengths.forEach((length, joint) => {
      const pivot = new THREE.Group();
      pivot.name = `Nurse ${definition.name} ${joint === 0 ? 'base' : joint === 1 ? 'middle' : 'tip'} joint`;
      pivot.position.set(joint === 0 ? definition.x : 0, joint === 0 ? definition.y : definition.lengths[joint - 1], 0);
      parent.add(pivot);
      const radius = definition.radius * (1 - joint * 0.13);
      rounded(pivot, new THREE.Vector3(), [radius, radius, radius]);
      link(pivot, new THREE.Vector3(0, length, 0), radius, glove);
      // Dorsal glove folds provide readable knuckle detail at close range.
      const crease = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.94, 0.0018, 6, 20, Math.PI), seam);
      crease.rotation.x = Math.PI / 2;
      pivot.add(crease);
      joints.push(pivot);
      parent = pivot;
    });
    fingers.push({ joints, digit, thumb: digit === 4 });
  });
  hand.userData.digitCount = fingers.length;

  const state = {
    near: false, blend: 0, startedAt: 0, waveBlend: 0,
    head: null, eyeOpen: { value: 1 },
    nextBlink: 2.4, blinkStarted: -Infinity
  };
  // Read-only diagnostic snapshot on the scene object, not a second animation API.
  arm.userData.greeting = {};
  const shoulderGreeting = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.05, 0, -1.05));
  const raisedDirection = new THREE.Vector3(0, 0.92, 0.35).normalize().applyQuaternion(shoulderGreeting.clone().invert());
  const elbowGreeting = new THREE.Quaternion().setFromUnitVectors(wristOffset.clone().normalize(), raisedDirection);
  const identity = new THREE.Quaternion();
  const q = new THREE.Quaternion();
  const q2 = new THREE.Quaternion();
  const parentQ = new THREE.Quaternion();
  const headQ = new THREE.Quaternion();
  const yawQ = new THREE.Quaternion();
  const pitchQ = new THREE.Quaternion();
  const headPosition = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const worldUp = new THREE.Vector3(0, 1, 0);
  const worldRight = new THREE.Vector3(1, 0, 0);

  function attachHead(bone, mesh) {
    state.head = bone;
    // Blink the existing cyan eye pixels in the original texture, rather than
    // adding floating eyelid planes that detach when the original head turns.
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      const previousCompile = material.onBeforeCompile;
      material.onBeforeCompile = function (shader, renderer) {
        previousCompile.call(this, shader, renderer);
        shader.uniforms.nurseEyeOpen = state.eyeOpen;
        shader.vertexShader = 'varying vec3 vNurseRestWorld;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvNurseRestWorld = (modelMatrix * vec4(position, 1.0)).xyz;');
        shader.fragmentShader = 'varying vec3 vNurseRestWorld;\nuniform float nurseEyeOpen;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
          float eyeArea = step(4.55, vNurseRestWorld.x) * step(vNurseRestWorld.x, 5.55)
            * step(0.86, vNurseRestWorld.y) * step(vNurseRestWorld.y, 1.20)
            * step(-1.90, vNurseRestWorld.z) * step(vNurseRestWorld.z, -1.20);
          float cyanEye = step(diffuseColor.r * 1.8, diffuseColor.b)
            * step(diffuseColor.r * 1.5, diffuseColor.g) * step(0.12, diffuseColor.g);
          float shutter = smoothstep(nurseEyeOpen * 0.07, nurseEyeOpen * 0.07 + 0.006, abs(vNurseRestWorld.y - 1.02));
          float blinking = 1.0 - step(0.999, nurseEyeOpen);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.004, 0.009, 0.014), eyeArea * cyanEye * shutter * blinking);
        `);
      };
      material.customProgramCacheKey = () => 'ot-nurse-procedural-eyes-v1';
      material.needsUpdate = true;
    }
  }

  function update(time, delta, camera) {
    const smoothing = 1 - Math.exp(-5 * Math.min(delta, 0.1));
    const proximity = camera.position.distanceTo(arm.position) / modelRadius;
    if (!reducedMotion) {
      if (!state.near && proximity < 2.15) {
        state.near = true;
        state.startedAt = time;
      } else if (state.near && proximity > 2.42) {
        state.near = false;
      }
    }
    state.blend = THREE.MathUtils.lerp(state.blend, state.near ? 1 : 0, smoothing);
    const age = Math.max(0, time - state.startedAt);
    const waveAge = Math.max(0, age - 0.9);
    const duration = WAVE_PERIOD * WAVE_CYCLES;
    const waving = state.near && age < duration + 1.45;
    state.waveBlend = THREE.MathUtils.lerp(state.waveBlend, waving ? 1 : 0, smoothing);
    const active = waveAge < duration;
    const wave = active ? Math.sin(waveAge / WAVE_PERIOD * Math.PI * 2) * Math.sin(Math.PI * Math.min(1, waveAge / duration)) : 0;
    const lift = state.waveBlend;
    const idle = reducedMotion ? 0 : Math.sin(time * 1.8);

    arm.quaternion.copy(identity).slerp(shoulderGreeting, lift);
    q.setFromEuler(new THREE.Euler(0, Math.sin(time * 0.9) * 0.035 * (reducedMotion ? 0 : 1), idle * 0.055));
    elbow.quaternion.copy(q).slerp(elbowGreeting, lift);
    // Palm faces the viewer; compute wrist orientation relative to both arm joints.
    direction.subVectors(camera.position, arm.position);
    const palmYaw = THREE.MathUtils.clamp(Math.atan2(direction.x, direction.z), -0.8, 0.8);
    q.setFromEuler(new THREE.Euler(-0.10, palmYaw, wave * 0.30));
    parentQ.copy(arm.quaternion).multiply(elbow.quaternion).invert();
    q.premultiply(parentQ);
    q2.setFromAxisAngle(UP, idle * 0.075).premultiply(idleWrist);
    hand.quaternion.copy(q2).slerp(q, lift);
    fingers.forEach(({ joints, digit, thumb }) => {
      const ripple = reducedMotion ? 0 : Math.sin(time * 5 + digit * 0.55) * 0.025;
      joints.forEach((joint, index) => {
        const idleCurl = thumb ? [0.15, 0.24, 0.20][index] : [0.20, 0.38, 0.24][index];
        const openCurl = thumb ? [0.12, 0.14, 0.09][index] : [0.06, 0.10, 0.06][index];
        joint.rotation.x = THREE.MathUtils.lerp(idleCurl, openCurl + ripple, lift);
        joint.rotation.z = index === 0 ? (thumb ? -0.85 : (1.5 - digit) * (0.025 + lift * 0.045)) : 0;
      });
    });

    if (!reducedMotion && time >= state.nextBlink) {
      state.blinkStarted = time;
      state.nextBlink = time + 3.2 + (0.5 + 0.5 * Math.sin(time * 1.37)) * 2.3;
    }
    const blinkAge = time - state.blinkStarted;
    state.eyeOpen.value = blinkAge < 0.22 ? 1 - Math.sin(Math.PI * blinkAge / 0.22) ** 2 : 1;
    if (state.head) {
      state.head.getWorldPosition(headPosition);
      direction.subVectors(camera.position, headPosition);
      // Nurse's authored forward direction is ~30 degrees left of world +Z.
      const yaw = THREE.MathUtils.clamp(Math.atan2(direction.x, direction.z) + 0.52, -0.8, 0.8);
      const pitch = -THREE.MathUtils.clamp(Math.atan2(direction.y, Math.hypot(direction.x, direction.z)), -0.22, 0.22);
      yawQ.setFromAxisAngle(worldUp, yaw);
      pitchQ.setFromAxisAngle(worldRight, pitch);
      state.head.parent.getWorldQuaternion(parentQ);
      headQ.copy(parentQ).invert().multiply(yawQ).multiply(pitchQ).multiply(parentQ);
      q.copy(identity).slerp(headQ, state.blend);
      state.head.quaternion.slerp(q, smoothing);
    }
    Object.assign(arm.userData.greeting, {
      near: state.near, blend: state.blend, lift, proximity,
      cyclesCompleted: Math.min(WAVE_CYCLES, Math.floor(waveAge / WAVE_PERIOD)),
      eyeOpen: state.eyeOpen.value, digitCount: fingers.length
    });
  }

  return { attachHead, update };
}