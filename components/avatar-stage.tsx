"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { CharacterModel, type CharacterMotion } from "./character-model";
import { SceneEffects } from "./scene-effects";
import { useRenderProfile } from "@/hooks/use-render-profile";

export type AvatarKind = "mech" | "tree";
export type CornerStrengths = { cashFlow: number | null; capital: number | null; collateral: number | null; credit: number | null };
export type AvatarStageProps = { avatar: AvatarKind; strengths: CornerStrengths; selected?: keyof CornerStrengths; action?: "idle" | "fire" | "shield"; spin?: boolean; cameraView?: "full" | "detail"; tint?: string; paused?: boolean };

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

function Hangar({ avatar, strengths, selected, action, spin, cameraView, tint, paused, compact, controlsEnabled, onReady }: Required<AvatarStageProps> & { compact: boolean; controlsEnabled: boolean; onReady: () => void }) {
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
    <CharacterModel avatar={avatar} strengths={strengths} selected={selected} motion={motion} reducedMotion={paused} onReady={onReady} />
    <EnergyField color={tint} active={action === "shield"} power={strengths.capital ?? .5} reduced={paused} />
    <mesh ref={beam} visible={false}><cylinderGeometry args={[.045 + (strengths.cashFlow ?? .5) * .06, .08, 4, 8]} /><meshBasicMaterial color={tint} transparent opacity={.85} depthWrite={false} /></mesh>
    <mesh position={[0, -.13, 0]} receiveShadow><cylinderGeometry args={[3.25, 3.35, .24, 80]} /><meshStandardMaterial color="#15242c" roughness={.35} metalness={.75} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.006, 0]} receiveShadow><circleGeometry args={[3.15, 80]} /><meshStandardMaterial color="#0d1e27" metalness={.72} roughness={.4} /></mesh>
    <group ref={floorRing}>{[2.84, 3.12].map(r => <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, .005, 0]}><torusGeometry args={[r, .018, 8, 100]} /><meshBasicMaterial color={tint} /></mesh>)}{Array.from({ length: 36 }, (_, i) => <mesh key={i} position={[Math.cos(i * Math.PI / 18) * 3, .012, Math.sin(i * Math.PI / 18) * 3]} rotation={[-Math.PI / 2, 0, -i * Math.PI / 18]}><planeGeometry args={[.09, i % 3 === 0 ? .15 : .06]} /><meshBasicMaterial color={i % 3 === 0 ? tint : "#497782"} /></mesh>)}</group>
    <gridHelper args={[70, 70, "#24404c", "#142933"]} position={[0, -.27, 0]} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.28, 0]} receiveShadow><planeGeometry args={[100, 100]} /><meshStandardMaterial color="#071018" roughness={.55} metalness={.5} /></mesh>
    {[-6, 6].map(x => <group key={x} position={[x, 0, -6]}><mesh position={[0, 4, 0]}><boxGeometry args={[.55, 8, .65]} /><meshStandardMaterial color="#122937" metalness={.7} roughness={.3} /></mesh><mesh position={[.02, 4, .35]}><boxGeometry args={[.04, 6.6, .03]} /><meshBasicMaterial color={tint} /></mesh></group>)}
  </>;
}

export class RenderBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { failed: boolean }> {
  state = { failed: false }; static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback ?? <div className="avatar-fallback">The 3D view couldn’t load. Your financial picture remains available.</div> : this.props.children; }
}
export function AvatarStage({ avatar, strengths, selected = "cashFlow", action = "idle", spin = true, cameraView = "full", tint = "#6ee6d0", paused = false }: AvatarStageProps) {
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
  return <div ref={host} className="avatar-stage-surface" data-touch-interactive={!touch || interactive}><RenderBoundary key={avatar}><Canvas frameloop={!active ? "never" : reduced ? "demand" : "always"} camera={{ position: [6, 3.5, 10], fov: 36, near: .1, far: 100 }} dpr={compact ? 1 : [1, 1.5]} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} shadows={!compact}><Suspense fallback={null}><Hangar avatar={avatar} strengths={strengths} selected={selected} action={action} spin={spin} cameraView={cameraView} tint={tint} paused={paused || reduced} compact={compact} controlsEnabled={!touch || interactive} onReady={ready} /></Suspense></Canvas>{loadedAvatar !== avatar && <div className="model-loading" role="status"><span />ASSEMBLING YOUR AVATAR</div>}</RenderBoundary>{touch && <button type="button" className="avatar-touch-toggle" aria-pressed={interactive} onClick={() => setInteractive(v => !v)}>{interactive ? "Done moving" : "Move avatar"}</button>}</div>;
}
