"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CharacterModel } from "./character-model";
import { SceneEffects } from "./scene-effects";
import { createEquipmentGlow, createShieldEffects } from "@/lib/sentinel-showcase-effects";
import type { AvatarVisualState, CornerStrengths } from "./avatar-stage";

type DemonstrationProps = {
  animated: boolean; strengths: CornerStrengths; visualState: AvatarVisualState;
  advance: (delta: number) => void; onReady: () => void; onError: () => void;
};

function FrontView({ animated, strengths, visualState, advance, onReady, onError }: DemonstrationProps) {
  const { camera, gl, size, invalidate } = useThree();
  const asset = useLoader(GLTFLoader, "/models/sentinel.glb");
  const bounds = useMemo(() => new THREE.Box3().setFromObject(asset.scene), [asset]);
  const model = useRef<THREE.Group>(null);
  const glow = useRef<ReturnType<typeof createEquipmentGlow> | null>(null);
  const shield = useMemo(createShieldEffects, []);
  useEffect(() => () => shield.dispose(), [shield]);

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    // Keep one fixed front camera, with room for the strongest equipment.
    const radius = Math.max(2.3, Math.hypot(Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x)), Math.max(Math.abs(bounds.min.z), Math.abs(bounds.max.z))) + .12);
    const halfHeight = Math.max(3.05, (bounds.max.y - bounds.min.y) / 2 + .12);
    const tanVertical = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const aspect = size.width / Math.max(1, size.height);
    const distance = Math.max(halfHeight / tanVertical, radius / (tanVertical * aspect)) * 1.2 + radius;
    const centerY = (bounds.min.y + bounds.max.y) / 2;
    camera.position.set(0, centerY, distance);
    camera.lookAt(0, centerY, 0);
    camera.updateProjectionMatrix();
    invalidate();
  }, [bounds, camera, size.width, size.height, invalidate]);

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener("webglcontextlost", onError);
    return () => canvas.removeEventListener("webglcontextlost", onError);
  }, [gl, onError]);

  useFrame((_, delta) => {
    if (animated) advance(delta);
  }, -1); // Update the demo before CharacterModel reads its strengths this frame.

  useFrame((_, delta) => {
    if (model.current) {
      glow.current ??= createEquipmentGlow(model.current);
      glow.current(strengths);
    }
    shield.update(strengths.capital ?? 0, delta, animated);
  }, .5); // Apply glow after the model update, before the bloom compositor.

  useEffect(() => { invalidate(); }, [animated, invalidate]);

  return <>
    <group ref={model} rotation={[0, 0, 0]}>
      <CharacterModel avatar="mech" strengths={strengths} visualState={visualState} selected={null} reducedMotion onReady={onReady} />
    </group>
    <primitive object={shield.group} />
  </>;
}

export default function SentinelScene({ active, animated, compact, strengths, visualState, advance, onReady, onError }: DemonstrationProps & { active: boolean; compact: boolean }) {
  return <Canvas frameloop={!active ? "never" : animated ? "always" : "demand"} camera={{ position: [0, 2.6, 12], fov: 32, near: .1, far: 60 }} dpr={compact ? 1 : [1, 1.5]} gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}>
    <color attach="background" args={["#070d12"]} />
    <hemisphereLight args={["#d9f3ff", "#25333d", 1.6]} />
    <directionalLight position={[4, 7, 6]} intensity={3.5} color="#fff1dd" />
    <directionalLight position={[-4, 3, 3]} intensity={2} color="#92dfff" />
    <directionalLight position={[1, 4, -5]} intensity={2.5} color="#b3a0ff" />
    <Suspense fallback={null}><FrontView animated={animated} strengths={strengths} visualState={visualState} advance={advance} onReady={onReady} onError={onError} /></Suspense>
    <SceneEffects strength={compact ? .4 : .6} />
  </Canvas>;
}
