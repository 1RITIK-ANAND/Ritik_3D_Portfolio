import * as THREE from '../js/vendor/three.module.min.js';
import { createNurseGreeting } from '../js/nurse.js';

// Browser-side deterministic tests; use the portfolio's existing import map.
export function runNurseGreetingChecks() {
  const checks = [];
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
    checks.push(message);
  };
  const scene = new THREE.Scene();
  const radius = 9;
  const greeting = createNurseGreeting(scene, { reducedMotion: false, modelRadius: radius });
  const arm = scene.getObjectByName('Nurse right arm and hand');
  const hand = scene.getObjectByName('Nurse right gloved hand');
  const headParent = new THREE.Group();
  headParent.rotation.x = Math.PI / 2;
  const head = new THREE.Bone();
  headParent.add(head);
  scene.add(headParent);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  scene.add(torso);
  greeting.attachHead(head, torso);
  const camera = new THREE.PerspectiveCamera();
  const setDistance = (distance) => camera.position.copy(arm.position).add(new THREE.Vector3(0, 0, distance * radius));
  let time = 0;
  const advance = (seconds, onFrame = () => {}) => {
    for (let i = 0; i < Math.round(seconds * 60); i++) {
      time += 1 / 60;
      greeting.update(time, 1 / 60, camera);
      scene.updateMatrixWorld(true);
      onFrame();
    }
  };

  const roots = hand.children.filter(child => child.name.endsWith('base joint'));
  assert(roots.length === 5 && hand.userData.digitCount === 5, 'Exactly five fingers including one thumb');
  let joints = 0;
  hand.traverse(object => { if (/Nurse .* (base|middle|tip) joint/.test(object.name)) joints++; });
  assert(joints === 15, 'Five independent three-joint digit chains');
  setDistance(2.8);
  advance(0.5);
  assert(!arm.userData.greeting.near && arm.userData.greeting.lift === 0, 'No greeting while camera is far');

  const torsoMatrix = torso.matrixWorld.clone();
  let minimumEye = 1, maximumHeadAngle = 0, maximumLift = 0;
  const firstFinger = roots[0].rotation.x;
  let fingerMoved = false;
  setDistance(1.8);
  advance(4.5, () => {
    minimumEye = Math.min(minimumEye, arm.userData.greeting.eyeOpen);
    maximumLift = Math.max(maximumLift, arm.userData.greeting.lift);
    maximumHeadAngle = Math.max(maximumHeadAngle, head.quaternion.angleTo(new THREE.Quaternion()));
    fingerMoved ||= Math.abs(roots[0].rotation.x - firstFinger) > 0.05;
  });
  assert(maximumLift > 0.95 && maximumHeadAngle > 0.1, 'Near camera raises the arm and turns the head');
  assert(minimumEye < 0.05, 'Procedural blink closes and reopens original eyes');
  assert(fingerMoved, 'Finger joints articulate during greeting');
  assert(arm.userData.greeting.cyclesCompleted === 3, 'Greeting completes exactly three wave cycles');
  assert(torso.matrixWorld.equals(torsoMatrix), 'Torso transform stays fixed');

  advance(2);
  assert(arm.userData.greeting.lift < 0.001, 'Arm settles after three waves without looping');
  setDistance(2.3);
  advance(0.5);
  assert(arm.userData.greeting.near && arm.userData.greeting.cyclesCompleted === 3, 'Hysteresis prevents threshold jitter from restarting greeting');

  setDistance(2.8);
  advance(4);
  assert(!arm.userData.greeting.near && head.quaternion.angleTo(new THREE.Quaternion()) < 0.001, 'Moving away blends the head back to idle');
  assert(arm.quaternion.angleTo(new THREE.Quaternion()) < 0.001, 'Moving away restores the shoulder pose');
  setDistance(1.8);
  advance(1);
  assert(arm.userData.greeting.near && arm.userData.greeting.lift > 0.95 && arm.userData.greeting.cyclesCompleted === 0, 'A new approach retriggers one greeting');

  setDistance(2.8);
  advance(0.1);
  const before = arm.quaternion.clone();
  setDistance(1.8);
  advance(1 / 60);
  assert(before.angleTo(arm.quaternion) < 0.1, 'Quick camera reversals do not snap the shoulder');

  const quietScene = new THREE.Scene();
  const quiet = createNurseGreeting(quietScene, { reducedMotion: true, modelRadius: radius });
  const quietArm = quietScene.getObjectByName('Nurse right arm and hand');
  const quietHand = quietScene.getObjectByName('Nurse right gloved hand');
  const rest = quietHand.quaternion.clone();
  camera.position.copy(quietArm.position).add(new THREE.Vector3(0, 0, 10));
  quiet.update(100, 1 / 60, camera);
  assert(!quietArm.userData.greeting.near && quietArm.userData.greeting.eyeOpen === 1 && rest.angleTo(quietHand.quaternion) < 0.001, 'Reduced motion disables waving, tracking, and blinking');
  return { passed: checks.length, checks };
}