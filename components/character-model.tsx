"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { AvatarKind, AvatarVisualState, CornerStrengths } from "./avatar-stage";

export type CharacterMotion = { moving: number; firing: boolean; shield: boolean; dash: boolean };
const IDLE: CharacterMotion = { moving: 0, firing: false, shield: false, dash: false };
const COLORS = { credit: "#b3a0ff", collateral: "#ffbc62", cashFlow: "#5de4ff", capital: "#62edb9" };
const EMISSIVE_COLORS = Object.fromEntries(Object.entries(COLORS).map(([key, value]) => [key, new THREE.Color(value)]));
type LitMaterial = THREE.MeshStandardMaterial | THREE.MeshToonMaterial;
const NODES = {
  mech: { credit: "credit_antenna", collateral: "equity_battery", cashFlow: "cash_emitter", capital: "reserve_shield" },
  tree: { credit: "credit_canopy", collateral: "equity_roots", cashFlow: "cash_leaves", capital: "reserve_trunk" },
};

export function CharacterModel({ avatar, strengths, visualState, selected, motion, reducedMotion = false, mounted = false, onReady }: {
  avatar: AvatarKind; strengths: CornerStrengths; selected?: keyof CornerStrengths | null;
  visualState?: AvatarVisualState; motion?: MutableRefObject<CharacterMotion>; reducedMotion?: boolean; mounted?: boolean; onReady?: () => void;
}) {
  const asset = useLoader(GLTFLoader, avatar === "mech" ? "/models/sentinel.glb" : "/models/verdant.glb");
  const state = useRef({ credit: .5, collateral: .5, cashFlow: .5, capital: .5, clock: 0, stride: 0, creditBurst: 0, cashBurst: 0, lastGrade: visualState?.creditGrade, lastDtiBand: visualState?.dti == null ? null : Math.floor(visualState.dti * 10) });
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
    const partMaterials: Record<string, Array<{ mat: LitMaterial; color: THREE.Color; intensity: number }>> = {};
    if (avatar === "mech") {
      const battery = nodes.get("equity_battery");
      if (battery) battery.visible = false;
      const torso = nodes.get("torso");
      if (torso) {
        const armor = new THREE.Group(); armor.name = "equity_armor"; torso.add(armor); nodes.set(armor.name, armor);
        const armorMaterial = new THREE.MeshStandardMaterial({ name: "equity armor", color: "#7f8994", metalness: .88, roughness: .25, emissive: "#ff9e3d", emissiveIntensity: .08 });
        const energyMaterial = new THREE.MeshBasicMaterial({ name: "equity armor energy", color: "#ffc16e", transparent: true, opacity: .7 });
        mats.push(armorMaterial, energyMaterial);
        const addPlate = (name: string, position: [number, number, number], scale: [number, number, number], tier: number) => {
          const plate = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), armorMaterial); plate.name = name; plate.position.set(...position); plate.scale.set(...scale); plate.rotation.x = -.08; plate.userData.equityTier = tier; plate.userData.baseScale = [...scale]; armor.add(plate); nodes.set(name, plate);
          const seam = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), energyMaterial); seam.name = `${name}_energy`; seam.position.copy(plate.position); seam.position.z += scale[2] + .008; seam.scale.set(scale[0] * .72, .018, .012); seam.userData.equityTier = tier; seam.userData.baseScale = [scale[0] * .72, .018, .012]; armor.add(seam); nodes.set(seam.name, seam);
        };
        addPlate("equity_armor_core", [0, .60, .43], [.28, .24, .055], 0);
        addPlate("equity_armor_l", [-.39, .78, .35], [.18, .28, .06], 1); addPlate("equity_armor_r", [.39, .78, .35], [.18, .28, .06], 1);
        addPlate("equity_armor_collar", [0, 1.08, .35], [.38, .12, .06], 2);
        addPlate("equity_armor_lattice", [0, .34, .43], [.22, .09, .065], 3);
        partMaterials.collateral = [{ mat: armorMaterial, color: armorMaterial.emissive.clone(), intensity: armorMaterial.emissiveIntensity }];
      }
    }
    if (outlined.length) {
      const ink = new THREE.MeshBasicMaterial({ color: "#050b14", side: THREE.BackSide, depthWrite: false });
      ink.name = "Illustrated contour";
      ink.onBeforeCompile = shader => { shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed += normal * 0.009;"); };
      ink.customProgramCacheKey = () => "vision-contour-1";
      mats.push(ink);
      for (const parent of outlined) { const contour = new THREE.Mesh(parent.geometry, ink); contour.name = "illustrated_contour"; parent.add(contour); }
    }
    Object.entries(NODES[avatar]).forEach(([key, name]) => {
      partMaterials[key] ??= [];
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
  useEffect(() => {
    // Only this model instance puts its hand-held equipment away at the controls.
    for (const name of ["cash_blade", "reserve_shield"]) { const node=nodes.get(name);if(node)node.visible=!mounted; }
  }, [nodes, mounted]);
  useFrame((_, delta) => {
    const dt = Math.min(delta, .05), s = state.current, movement = motion?.current ?? IDLE;
    s.clock += dt; s.stride += dt * (movement.moving > .1 ? 8 : 1.2);
    const nextBand = visualState?.dti == null ? null : Math.floor(visualState.dti * 10);
    if (s.lastGrade !== undefined && s.lastGrade !== visualState?.creditGrade) s.creditBurst = 1;
    if (s.lastDtiBand !== null && nextBand !== null && s.lastDtiBand !== nextBand) s.cashBurst = 1;
    s.lastGrade = visualState?.creditGrade; s.lastDtiBand = nextBand;
    s.creditBurst = Math.max(0, s.creditBurst - dt * 1.35); s.cashBurst = Math.max(0, s.cashBurst - dt * 1.55);
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
    if(mounted){
      const kick=movement.firing&&animate?.035:0;
      rotate("torso", .09+kick);rotate("head",-.08);
      rotate("arm_l",-.95+kick,0,-.12);rotate("arm_r",-.95+kick,0,.12);
      rotate("forearm_l",-.3);rotate("forearm_r",-.3);rotate("hand_r");
      rotate("leg_l",-.07);rotate("leg_r",.07);
    }
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
      if (blade && rest) {
        const dti = visualState?.dti ?? (1 - s.cashFlow * .9);
        const quality = THREE.MathUtils.clamp((.70 - dti) / .55, 0, 1);
        blade.scale.copy(rest.scale); blade.scale.y *= .42 + quality * 1.45; blade.scale.x *= .52 + quality * .85; blade.scale.z *= .65 + quality * .48;
      }
      for (const name of ["shoulder_wing_l", "shoulder_wing_r"]) {
        const wing = nodes.get(name), rest = rests.get(name); if (!wing || !rest) continue;
        const elite = THREE.MathUtils.clamp(((visualState?.creditScore ?? 720) - 720) / 40, 0, 1);
        wing.scale.copy(rest.scale).multiplyScalar(1 + elite * .28);
      }
      const armor = nodes.get("equity_armor");
      armor?.traverse(node => {
        if (!(node instanceof THREE.Mesh)) return;
        const tier = Number(node.userData.equityTier ?? 0), threshold = [0, .2, .48, .76][tier] ?? 0;
        node.visible = s.collateral >= threshold;
        const grow = .88 + s.collateral * .28, base = node.userData.baseScale as [number, number, number];
        node.scale.set(base[0] * grow, base[1] * grow, base[2]);
      });
    }
    const seen = new Set<LitMaterial>();
    for (const key of Object.keys(COLORS) as Array<keyof CornerStrengths>) {
      partMaterials[key]?.forEach(({ mat, color, intensity }) => {
        if (seen.has(mat)) return; seen.add(mat);
        const lit = selected && partMaterials[selected]?.some(p => p.mat === mat);
        const isCash = partMaterials.cashFlow?.some(p => p.mat === mat);
        const highlight = lit ? .22 + (animate ? Math.sin(s.clock * 2.5) * .06 : 0) : 0;
        mat.emissive.copy(color).lerp(EMISSIVE_COLORS[selected ?? key], lit ? .65 : 0);
        const burst = key === "credit" ? s.creditBurst * 2.3 : key === "cashFlow" ? s.cashBurst * 2.5 : 0;
        mat.emissiveIntensity = intensity + highlight + burst + (isCash ? s.cashFlow * .35 + (movement.firing ? .7 : 0) : 0);
      });
    }
  });
  return <primitive object={scene} dispose={null} />;
}
