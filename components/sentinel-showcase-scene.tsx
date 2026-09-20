"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CharacterModel } from "./character-model";

// A presentation setting, independent of the calculator and a visitor's finances.
const HALF_POWER = { cashFlow: .5, capital: .5, collateral: .5, credit: .5 };

function Turntable({ animated, onReady, onError }: { animated: boolean; onReady: () => void; onError: () => void }) {
  const group = useRef<THREE.Group>(null);
  const { camera, gl, size, invalidate } = useThree();
  const asset = useLoader(GLTFLoader, "/models/sentinel.glb");
  const bounds = useMemo(() => new THREE.Box3().setFromObject(asset.scene), [asset]);

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    // Fit the entire turn, including the wings, rather than just the front pose.
    const radius = Math.hypot(Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x)), Math.max(Math.abs(bounds.min.z), Math.abs(bounds.max.z))) + .12;
    const halfHeight = (bounds.max.y - bounds.min.y) / 2 + .12;
    const tanVertical = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const aspect = size.width / Math.max(1, size.height);
    const distance = Math.max(halfHeight / tanVertical, radius / (tanVertical * aspect)) * 1.08 + radius;
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
    if (animated && group.current) group.current.rotation.y += Math.min(delta, .05) * .18;
  });

  return <group ref={group} rotation={[0, -.3, 0]}>
    <CharacterModel avatar="mech" strengths={HALF_POWER} selected={null} reducedMotion={!animated} onReady={onReady} />
  </group>;
}

export default function SentinelScene({ active, animated, compact, onReady, onError }: {
  active: boolean; animated: boolean; compact: boolean; onReady: () => void; onError: () => void;
}) {
  return <Canvas frameloop={!active ? "never" : animated ? "always" : "demand"} camera={{ position: [0, 2.6, 12], fov: 32, near: .1, far: 60 }} dpr={compact ? 1 : [1, 1.5]} gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}>
    <hemisphereLight args={["#d9f3ff", "#25333d", 1.6]} />
    <directionalLight position={[4, 7, 6]} intensity={3.5} color="#fff1dd" />
    <directionalLight position={[-4, 3, 3]} intensity={2} color="#92dfff" />
    <directionalLight position={[1, 4, -5]} intensity={2.5} color="#b3a0ff" />
    <Suspense fallback={null}><Turntable animated={animated} onReady={onReady} onError={onError} /></Suspense>
  </Canvas>;
}
