"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CharacterModel, type CharacterMotion } from "./character-model";
import { SceneEffects } from "./scene-effects";
import { useRenderProfile } from "@/hooks/use-render-profile";

export type AvatarKind = "mech" | "tree";
export type CornerStrengths = { cashFlow: number | null; capital: number | null; collateral: number | null; credit: number | null };
export type AvatarVisualState = { creditGrade: string | null; creditScore: number | null; dti: number | null; reserveMonths: number | null };
export type AvatarStageProps = { avatar: AvatarKind; strengths: CornerStrengths; visualState?: AvatarVisualState; selected?: keyof CornerStrengths; action?: "idle" | "fire" | "shield"; spin?: boolean; cameraView?: "full" | "detail"; tint?: string; paused?: boolean };

export function StudioEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const generator = new THREE.PMREMGenerator(gl), room = new RoomEnvironment();
    const env = generator.fromScene(room, .04);
    const old = scene.environment; scene.environment = env.texture; scene.environmentIntensity = .65;
    room.dispose(); generator.dispose();
    return () => { scene.environment = old; env.dispose(); };
  }, [gl, scene]);
  return null;
}

function StageControls({ spin, cameraView, avatar, enabled }: { spin: boolean; cameraView: "full" | "detail"; avatar: AvatarKind; enabled: boolean }) {
  const { camera, gl, size, invalidate } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement); c.target.set(0, 2.5, 0);
    c.enableDamping = true; c.dampingFactor = .07; c.enablePan = false; c.minDistance = 5; c.maxDistance = 24;
    c.minPolarAngle = .65; c.maxPolarAngle = Math.PI / 2.03; c.autoRotateSpeed = .65;
    const changed = () => invalidate();
    c.addEventListener("change", changed);
    controls.current = c; c.update(); return () => { c.removeEventListener("change", changed); c.dispose(); controls.current = null; };
  }, [camera, gl, invalidate]);
  useEffect(() => {
    if (controls.current) controls.current.enabled = enabled;
    gl.domElement.style.touchAction = enabled ? "none" : "pan-y pinch-zoom";
  }, [enabled, gl]);
  useEffect(() => {
    if (!controls.current) return;
    const aspect = Math.max(.25, size.width / Math.max(1, size.height));
    const targetY = cameraView === "detail" ? 3.5 : avatar === "mech" ? 2.8 : 2.6;
    // Fit the wider fin silhouette on narrow panels without cropping the tips.
    const fit = Math.max(10.1, (avatar === "mech" ? 8.6 : 6.8) / aspect);
    const distance = cameraView === "detail" ? Math.max(6.1, 3.9 / aspect) : fit;
    camera.position.set(distance * .37, targetY + distance * .09, distance * .925);
    controls.current.target.set(0, targetY, 0); controls.current.update();
  }, [camera, cameraView, avatar, size.width, size.height]);
  useFrame(() => { if (controls.current) { controls.current.autoRotate = spin; controls.current.update(); } });
  return null;
}

function EnergyField({ color, active, power, reduced }: { color: string; active: boolean; power: number; reduced: boolean }) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0 } },
    vertexShader: `varying vec3 vNormal; varying vec3 vView; varying vec3 vPosition; void main(){ vec4 p=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vView=normalize(-p.xyz);vPosition=position;gl_Position=projectionMatrix*p; }`,
    fragmentShader: `uniform float uTime;uniform vec3 uColor;uniform float uOpacity;varying vec3 vNormal;varying vec3 vView;varying vec3 vPosition;void main(){float edge=pow(1.-abs(dot(normalize(vNormal),normalize(vView))),2.4);float scan=.35+.65*smoothstep(.84,1.,sin(vPosition.y*44.-uTime*4.));gl_FragColor=vec4(uColor,(edge*.7+scan*.08)*uOpacity);}`,
  }), [color]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame((_, dt) => { if (!reduced) material.uniforms.uTime.value += dt; material.uniforms.uOpacity.value = reduced ? Number(active) : THREE.MathUtils.damp(material.uniforms.uOpacity.value, active ? 1 : 0, 6, dt); });
  return <mesh position={[0, 2.25, 0]} scale={[1.65 + power * .5, 2.75, 1.35 + power * .5]} material={material}><sphereGeometry args={[1, 40, 28]} /></mesh>;
}

function FullChargeShield({ active, reduced }: { active: boolean; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame((state, dt) => {
    if (!group.current) return;
    group.current.visible = active;
    if (!active || reduced) return;
    group.current.rotation.y += dt * .7;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 3.8) * .055;
    group.current.scale.setScalar(pulse);
  });
  return <group ref={group} visible={active} position={[0, 2.28, 0]}>
    <mesh scale={[1.78, 2.78, 1.48]}><sphereGeometry args={[1, 30, 22]} /><meshBasicMaterial color="#72ffd0" wireframe transparent opacity={.2} depthWrite={false} /></mesh>
    {[0, 1, 2].map(i => <mesh key={i} rotation={[Math.PI / 2, 0, i * Math.PI / 3]} scale={1 + i * .035}><torusGeometry args={[1.73, .022, 7, 70]} /><meshBasicMaterial color={i === 1 ? "#e7fff8" : "#62edb9"} transparent opacity={.78 - i * .13} depthWrite={false} /></mesh>)}
    <pointLight intensity={15} distance={7} color="#62edb9" />
  </group>;
}

const PILLARS = [
  { key: "cashFlow", label: "CASH FLOW", node: "cash_emitter", color: "#5de4ff", position: [-4.85, 0, -4.35] },
  { key: "capital", label: "CAPITAL", node: "reserve_shield", color: "#62edb9", position: [4.85, 0, -4.35] },
  { key: "credit", label: "CREDIT", node: "head", color: "#b3a0ff", position: [-4.85, 0, 3.15] },
  { key: "collateral", label: "COLLATERAL", node: "torso", color: "#ffbc62", position: [4.85, 0, 3.15] },
] as const;

export function PillarLabel({ label, color }: { label: string; color: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 180; canvas.height = 1024;
    const context = canvas.getContext("2d");
    if (context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.textAlign = "center"; context.textBaseline = "middle";
      context.font = "800 86px ui-monospace, SFMono-Regular, Menlo, monospace";
      context.shadowColor = color; context.shadowBlur = 22; context.fillStyle = color;
      const letters = label.replace(/\s/g, "").split("");
      const step = 780 / Math.max(letters.length - 1, 1);
      letters.forEach((letter, index) => context.fillText(letter, 90, 122 + index * step));
    }
    const result = new THREE.CanvasTexture(canvas);
    result.colorSpace = THREE.SRGBColorSpace; result.minFilter = THREE.LinearFilter;
    return result;
  }, [color, label]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={[0, 2.62, .53]} renderOrder={3}>
    <planeGeometry args={[.72, 4.1]} />
    <meshBasicMaterial map={texture} transparent depthWrite={false} depthTest={false} toneMapped={false} />
  </mesh>;
}

export function PillarRelic({ nodeName, strength, color, reduced }: { nodeName: string; strength: number; color: string; reduced: boolean }) {
  const asset = useLoader(GLTFLoader, "/models/sentinel.glb");
  const group = useRef<THREE.Group>(null);
  const { relic, materials } = useMemo(() => {
    const source = asset.scene.getObjectByName(nodeName);
    const relic = source?.clone(true) ?? new THREE.Group();
    relic.position.set(0, 0, 0); relic.rotation.set(0, 0, 0);
    if (nodeName === "torso") {
      ["head", "arm_l", "arm_r", "shoulder_wing_l", "shoulder_wing_r"].forEach(name => {
        const part = relic.getObjectByName(name);
        part?.parent?.remove(part);
      });
      relic.position.y = -.72;
    }
    const materials: Array<THREE.MeshStandardMaterial | THREE.MeshToonMaterial> = [];
    relic.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      const cloneMaterial = (material: THREE.Material) => {
        const copy = material.clone();
        if (copy instanceof THREE.MeshStandardMaterial || copy instanceof THREE.MeshToonMaterial) materials.push(copy);
        return copy;
      };
      object.material = Array.isArray(object.material) ? object.material.map(cloneMaterial) : cloneMaterial(object.material);
      object.castShadow = true;
    });
    return { relic, materials };
  }, [asset, nodeName]);
  useEffect(() => () => materials.forEach(material => material.dispose()), [materials]);
  useFrame((state, dt) => {
    if (!group.current) return;
    const power = .68 + strength * .48;
    group.current.scale.setScalar(THREE.MathUtils.damp(group.current.scale.x, power, 5, dt));
    group.current.position.y = 5.72 + (reduced ? 0 : Math.sin(state.clock.elapsedTime * 1.55 + strength * 3) * .07);
    if (!reduced) group.current.rotation.y += dt * (.22 + strength * .22);
    materials.forEach(material => {
      material.emissive.lerp(new THREE.Color(color), .08);
      material.emissiveIntensity = .08 + strength * .72;
    });
  });
  return <group ref={group} position={[0, 5.72, 0]} scale={.68}>
    <primitive object={relic} />
    <pointLight color={color} intensity={3 + strength * 10} distance={3.2} />
  </group>;
}

function SentinelPillars({ strengths, reduced }: { strengths: CornerStrengths; reduced: boolean }) {
  return <>{PILLARS.map(pillar => {
    const strength = strengths[pillar.key] ?? .5;
    const inwardFace = pillar.position[0] < 0 ? .306 : -.306;
    return <group key={pillar.key} position={pillar.position as unknown as [number, number, number]}>
      <mesh position={[0, 2.55, 0]} castShadow><boxGeometry args={[.58, 5.1, .7]} /><meshStandardMaterial color="#112936" metalness={.78} roughness={.27} /></mesh>
      <mesh position={[0, 5.14, 0]} castShadow><boxGeometry args={[.82, .18, .94]} /><meshStandardMaterial color="#243d49" metalness={.85} roughness={.22} emissive={pillar.color} emissiveIntensity={.08 + strength * .22} /></mesh>
      <mesh position={[inwardFace, 2.55, 0]}><boxGeometry args={[.03, 4.65, .13]} /><meshBasicMaterial color={pillar.color} transparent opacity={.32 + strength * .68} /></mesh>
      <PillarLabel label={pillar.label} color={pillar.color} />
      <PillarRelic nodeName={pillar.node} strength={strength} color={pillar.color} reduced={reduced} />
    </group>;
  })}</>;
}

function Hangar({ avatar, strengths, visualState, selected, action, spin, cameraView, tint, paused, compact, controlsEnabled, onReady }: Omit<Required<AvatarStageProps>, "visualState"> & { visualState: AvatarVisualState; compact: boolean; controlsEnabled: boolean; onReady: () => void }) {
  const floorRing = useRef<THREE.Group>(null), beam = useRef<THREE.Mesh>(null);
  const beamPose = useMemo(() => ({ position: new THREE.Vector3(), rotation: new THREE.Quaternion(), direction: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) }), []);
  const motion = useRef<CharacterMotion>({ moving: 0, firing: false, shield: false, dash: false });
  const { scene } = useThree();
  useEffect(() => { scene.fog = new THREE.FogExp2("#07131b", avatar === "mech" ? .024 : .055); return () => { scene.fog = null; }; }, [scene, avatar]);
  useFrame((state, dt) => {
    motion.current.firing = action === "fire"; motion.current.shield = action === "shield";
    if (floorRing.current && !paused) floorRing.current.rotation.y += dt * .065;
    if (beam.current) {
      const muzzle = scene.getObjectByName("cash_muzzle");
      beam.current.visible = action === "fire" && avatar === "mech" && !!muzzle;
      if (muzzle && beam.current.visible) {
        muzzle.getWorldPosition(beamPose.position); muzzle.getWorldQuaternion(beamPose.rotation);
        beamPose.direction.set(0, -1, 0).applyQuaternion(beamPose.rotation);
        const length = 3.4 + Math.sin(state.clock.elapsedTime * 35) * .5;
        beam.current.position.copy(beamPose.position).addScaledVector(beamPose.direction, length / 2);
        beam.current.quaternion.setFromUnitVectors(beamPose.up, beamPose.direction); beam.current.scale.y = length / 4;
      }
    }
  });
  return <>
    <StudioEnvironment />
    {!compact && <SceneEffects strength={.35} />}
    <hemisphereLight args={["#c6e9f1", "#071019", 1.2]} />
    <spotLight position={[4, 9, 5]} intensity={190} angle={.55} penumbra={.7} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-.001} color="#f8e8d6" />
    <pointLight position={[-5, 3, 1]} intensity={32} color={tint} />
    <pointLight position={[3, 5, -4]} intensity={55} color={avatar === "mech" ? "#7988ff" : "#7cee92"} />
    <StageControls spin={spin && !paused} cameraView={cameraView} avatar={avatar} enabled={controlsEnabled} />
    <CharacterModel avatar={avatar} strengths={strengths} visualState={visualState} selected={selected} motion={motion} reducedMotion={paused} onReady={onReady} />
    <EnergyField color={tint} active={action === "shield"} power={strengths.capital ?? .5} reduced={paused} />
    <FullChargeShield active={avatar === "mech" && visualState.reserveMonths !== null && visualState.reserveMonths >= 12} reduced={paused} />
    <mesh ref={beam} visible={false}><cylinderGeometry args={[.045 + (strengths.cashFlow ?? .5) * .06, .08, 4, 8]} /><meshBasicMaterial color={tint} transparent opacity={.85} depthWrite={false} /></mesh>
    <mesh position={[0, -.13, 0]} receiveShadow><cylinderGeometry args={[3.25, 3.35, .24, 80]} /><meshStandardMaterial color="#15242c" roughness={.35} metalness={.75} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.006, 0]} receiveShadow><circleGeometry args={[3.15, 80]} /><meshStandardMaterial color="#0d1e27" metalness={.72} roughness={.4} /></mesh>
    <group ref={floorRing}>{[2.84, 3.12].map(r => <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, .005, 0]}><torusGeometry args={[r, .018, 8, 100]} /><meshBasicMaterial color={tint} /></mesh>)}{Array.from({ length: 36 }, (_, i) => <mesh key={i} position={[Math.cos(i * Math.PI / 18) * 3, .012, Math.sin(i * Math.PI / 18) * 3]} rotation={[-Math.PI / 2, 0, -i * Math.PI / 18]}><planeGeometry args={[.09, i % 3 === 0 ? .15 : .06]} /><meshBasicMaterial color={i % 3 === 0 ? tint : "#497782"} /></mesh>)}</group>
    <gridHelper args={[70, 70, "#24404c", "#142933"]} position={[0, -.27, 0]} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.28, 0]} receiveShadow><planeGeometry args={[100, 100]} /><meshStandardMaterial color="#071018" roughness={.55} metalness={.5} /></mesh>
    {avatar === "mech" && <SentinelPillars strengths={strengths} reduced={paused} />}
  </>;
}

export class RenderBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { failed: boolean }> {
  state = { failed: false }; static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback ?? <div className="avatar-fallback">The 3D view couldn’t load. Your financial picture remains available.</div> : this.props.children; }
}
export function AvatarStage({ avatar, strengths, visualState = { creditGrade: null, creditScore: null, dti: null, reserveMonths: null }, selected = "cashFlow", action = "idle", spin = true, cameraView = "full", tint = "#6ee6d0", paused = false }: AvatarStageProps) {
  const { compact, reduced, touch } = useRenderProfile();
  const host = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true), [visible, setVisible] = useState(true), [interactive, setInteractive] = useState(false);
  const [loadedAvatar, setLoadedAvatar] = useState<AvatarKind | null>(null);
  const ready = useCallback(() => setLoadedAvatar(avatar), [avatar]);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: "80px", threshold: .01 });
    if (host.current) observer.observe(host.current);
    const visibility = () => setVisible(!document.hidden);
    visibility(); document.addEventListener("visibilitychange", visibility);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  const active = inView && visible && !paused;
  return <div ref={host} className="avatar-stage-surface" data-touch-interactive={!touch || interactive}><RenderBoundary key={avatar}><Canvas frameloop={!active ? "never" : reduced ? "demand" : "always"} camera={{ position: [6, 3.5, 10], fov: 36, near: .1, far: 100 }} dpr={compact ? 1 : [1, 1.5]} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} shadows={!compact}><Suspense fallback={null}><Hangar avatar={avatar} strengths={strengths} visualState={visualState} selected={selected} action={action} spin={spin} cameraView={cameraView} tint={tint} paused={paused || reduced} compact={compact} controlsEnabled={!touch || interactive} onReady={ready} /></Suspense></Canvas>{loadedAvatar !== avatar && <div className="model-loading" role="status"><span />ASSEMBLING YOUR AVATAR</div>}</RenderBoundary>{touch && <button type="button" className="avatar-touch-toggle" aria-pressed={interactive} onClick={() => setInteractive(v => !v)}>{interactive ? "Done moving" : "Move avatar"}</button>}</div>;
}
