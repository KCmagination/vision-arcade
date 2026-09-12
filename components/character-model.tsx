"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { AvatarKind, CornerStrengths } from "./avatar-stage";

export type CharacterMotion = { moving: number; firing: boolean; shield: boolean; dash: boolean };
const IDLE: CharacterMotion = { moving: 0, firing: false, shield: false, dash: false };
const COLORS = { credit: "#b3a0ff", collateral: "#ffbc62", cashFlow: "#5de4ff", capital: "#62edb9" };
const EMISSIVE_COLORS = Object.fromEntries(Object.entries(COLORS).map(([key, value]) => [key, new THREE.Color(value)]));
type LitMaterial = THREE.MeshStandardMaterial | THREE.MeshToonMaterial;
const NODES = {
  mech: { credit: "credit_antenna", collateral: "equity_battery", cashFlow: "cash_emitter", capital: "reserve_shield" },
  tree: { credit: "credit_canopy", collateral: "equity_roots", cashFlow: "cash_leaves", capital: "reserve_trunk" },
};

export function CharacterModel({ avatar, strengths, selected, motion, reducedMotion = false, onReady }: {
  avatar: AvatarKind; strengths: CornerStrengths; selected?: keyof CornerStrengths | null;
  motion?: MutableRefObject<CharacterMotion>; reducedMotion?: boolean; onReady?: () => void;
}) {
  const asset = useLoader(GLTFLoader, avatar === "mech" ? "/models/sentinel.glb" : "/models/verdant.glb");
  const state = useRef({ credit: .5, collateral: .5, cashFlow: .5, capital: .5, clock: 0, stride: 0 });
  const { scene, nodes, materials, rests, partMaterials, gradient } = useMemo(() => {
    const scene = asset.scene.clone(true);
    const mats: THREE.Material[] = [];
    const gradient = avatar === "mech" ? new THREE.DataTexture(new Uint8Array([58, 109, 172, 226, 255]), 5, 1, THREE.RedFormat) : null;
    if (gradient) { gradient.minFilter = gradient.magFilter = THREE.NearestFilter; gradient.generateMipmaps = false; gradient.needsUpdate = true; }
    const outlined: THREE.Mesh[] = [];
    const nodes = new Map<string, THREE.Object3D>();
    const rests = new Map<string, { position: THREE.Vector3; rotation: THREE.Euler; scale: THREE.Vector3 }>();
    scene.traverse(node => {
      if (node.name) { nodes.set(node.name, node); rests.set(node.name, { position: node.position.clone(), rotation: node.rotation.clone(), scale: node.scale.clone() }); }
      if (node instanceof THREE.Mesh) {
        const clone = (mat: THREE.Material) => {
          // The Mech uses stepped illustration shading; translucent energy keeps its original material.
          const copy = avatar === "mech" && mat instanceof THREE.MeshStandardMaterial && !mat.transparent
            ? new THREE.MeshToonMaterial({ color: mat.color, emissive: mat.emissive, emissiveIntensity: mat.emissiveIntensity, map: mat.map, normalMap: mat.normalMap, gradientMap: gradient, side: mat.side })
            : mat.clone();
          copy.name = mat.name;
          if (copy.transparent) copy.depthWrite = false;
          mats.push(copy); return copy;
        };
        node.material = Array.isArray(node.material) ? node.material.map(clone) : clone(node.material);
        node.castShadow = !Array.isArray(node.material) && !node.material.transparent;
        node.receiveShadow = true;
        if (avatar === "mech" && node.material instanceof THREE.MeshToonMaterial && node.material.emissiveIntensity < 1.2) outlined.push(node);
      }
    });
    if (outlined.length) {
      const ink = new THREE.MeshBasicMaterial({ color: "#050b14", side: THREE.BackSide, depthWrite: false });
      ink.name = "Illustrated contour";
      ink.onBeforeCompile = shader => { shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed += normal * 0.009;"); };
      ink.customProgramCacheKey = () => "vision-contour-1";
      mats.push(ink);
      for (const parent of outlined) { const contour = new THREE.Mesh(parent.geometry, ink); contour.name = "illustrated_contour"; parent.add(contour); }
    }
    const partMaterials: Record<string, Array<{ mat: LitMaterial; color: THREE.Color; intensity: number }>> = {};
    Object.entries(NODES[avatar]).forEach(([key, name]) => {
      partMaterials[key] = [];
      nodes.get(name)?.traverse(node => {
        if (!(node instanceof THREE.Mesh)) return;
        (Array.isArray(node.material) ? node.material : [node.material]).forEach(mat => {
          if ((mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshToonMaterial) && !partMaterials[key].some(m => m.mat === mat)) partMaterials[key].push({ mat, color: mat.emissive.clone(), intensity: mat.emissiveIntensity });
        });
      });
    });
    return { scene, nodes, rests, materials: mats, partMaterials, gradient };
  }, [asset, avatar]);
  useEffect(() => () => { materials.forEach(m => m.dispose()); gradient?.dispose(); }, [materials, gradient]);
  useEffect(() => { onReady?.(); }, [asset, onReady]);
  useFrame((_, delta) => {
    const dt = Math.min(delta, .05), s = state.current, movement = motion?.current ?? IDLE;
    s.clock += dt; s.stride += dt * (movement.moving > .1 ? 8 : 1.2);
    const animate = !reducedMotion;
    const rotate = (name: string, x = 0, y = 0, z = 0) => { const node = nodes.get(name), rest = rests.get(name); if (node && rest) node.rotation.set(rest.rotation.x + x, rest.rotation.y + y, rest.rotation.z + z); };
    const gait = animate ? Math.sin(s.stride) * movement.moving * (avatar === "tree" ? .45 : 1) : 0;
    rotate("torso", movement.dash ? .18 : 0, animate ? Math.sin(s.clock * .65) * .025 : 0, -gait * .022);
    rotate("head", animate ? Math.sin(s.clock * .9) * .018 : 0, animate ? Math.sin(s.clock * .5) * .09 : 0);
    rotate("leg_l", gait * .5); rotate("leg_r", -gait * .5);
    rotate("shin_l", Math.max(0, -gait) * .45); rotate("shin_r", Math.max(0, gait) * .45);
    rotate("arm_l", -gait * .25, 0, movement.shield ? -.18 : 0);
    rotate("arm_r", movement.firing ? -1.05 + Math.sin(s.clock * 45) * .025 : gait * .25);
    rotate("forearm_r", movement.firing ? -.16 : -.07);
    rotate("hand_r", 0, 0, avatar === "mech" && movement.firing ? -.96 : 0);
    scene.position.y = animate ? Math.sin(s.clock * 1.8) * .014 + Math.abs(gait) * .035 : 0;
    for (const key of Object.keys(COLORS) as Array<keyof CornerStrengths>) {
      s[key] = reducedMotion ? strengths[key] ?? .5 : THREE.MathUtils.damp(s[key], strengths[key] ?? .5, 5, dt);
      const node = nodes.get(NODES[avatar][key]), rest = rests.get(NODES[avatar][key]);
      if (node && rest) {
        node.scale.copy(rest.scale);
        if (avatar === "mech") {
          if (key === "credit") node.scale.y *= .65 + s[key] * .7;
          if (key === "collateral") node.scale.y *= .55 + s[key] * .63;
          if (key === "capital") node.scale.multiplyScalar(.72 + s[key] * .55 + (movement.shield ? .12 : 0));
        } else {
          if (key === "credit") node.scale.y *= .92 + s[key] * .2;
          if (key === "collateral") { node.scale.x *= .9 + s[key] * .28; node.scale.z *= .9 + s[key] * .28; }
          if (key === "cashFlow") node.scale.multiplyScalar(.72 + s[key] * .44);
          if (key === "capital") { node.scale.x *= .93 + s[key] * .17; node.scale.z *= .93 + s[key] * .17; }
        }
      }
    }
    if (avatar === "mech") {
      const blade = nodes.get("cash_blade"), rest = rests.get("cash_blade");
      if (blade && rest) { blade.scale.copy(rest.scale); blade.scale.y *= .78 + s.cashFlow * .4; }
    }
    const seen = new Set<LitMaterial>();
    for (const key of Object.keys(COLORS) as Array<keyof CornerStrengths>) {
      partMaterials[key]?.forEach(({ mat, color, intensity }) => {
        if (seen.has(mat)) return; seen.add(mat);
        const lit = selected && partMaterials[selected]?.some(p => p.mat === mat);
        const isCash = partMaterials.cashFlow?.some(p => p.mat === mat);
        const highlight = lit ? .22 + (animate ? Math.sin(s.clock * 2.5) * .06 : 0) : 0;
        mat.emissive.copy(color).lerp(EMISSIVE_COLORS[selected ?? key], lit ? .65 : 0);
        mat.emissiveIntensity = intensity + highlight + (isCash ? s.cashFlow * .35 + (movement.firing ? .7 : 0) : 0);
      });
    }
  });
  return <primitive object={scene} dispose={null} />;
}
