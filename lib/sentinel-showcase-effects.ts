import * as THREE from "three";
import type { CornerStrengths } from "@/components/avatar-stage";

const EQUIPMENT = {
  capital: { nodes: ["reserve_shield"], color: "#65e8ae" },
  cashFlow: { nodes: ["cash_emitter"], color: "#79d7ff" },
  credit: { nodes: ["credit_antenna", "accent_visor", "accent_eye_r", "shoulder_wing_l", "shoulder_wing_r"], color: "#c6abff" },
  collateral: { nodes: ["equity_armor"], color: "#ffc66d" },
} as const;

/** Materials belong to the landing-page model clone, never the shared GLB. */
export function createEquipmentGlow(model: THREE.Object3D) {
  const entries = Object.entries(EQUIPMENT).map(([corner, equipment]) => {
    const materials = new Set<THREE.MeshStandardMaterial | THREE.MeshToonMaterial>();
    for (const name of equipment.nodes) model.getObjectByName(name)?.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return;
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
        if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshToonMaterial) materials.add(material);
      }
    });
    const tint = new THREE.Color(equipment.color);
    return {
      corner: corner as keyof CornerStrengths,
      materials: [...materials].map(material => ({ material, color: material.emissive.clone().lerp(tint, .7), intensity: material.emissiveIntensity })),
    };
  });
  return (strengths: CornerStrengths) => {
    for (const entry of entries) {
      const power = THREE.MathUtils.clamp(strengths[entry.corner] ?? 0, 0, 1);
      for (const { material, color, intensity } of entry.materials) {
        material.emissive.copy(color);
        material.emissiveIntensity = intensity * .1 + power * (intensity + 1.8);
      }
    }
  };
}

/** The hangar's energy field, wireframe shell and orbiting rings, driven by demo power. */
export function createShieldEffects() {
  const group = new THREE.Group();
  group.name = "landing_shield_effects";
  const fieldMaterial = new THREE.ShaderMaterial({
    transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color("#65e8ae") }, uOpacity: { value: 0 } },
    vertexShader: `varying vec3 vNormal; varying vec3 vView; varying vec3 vPosition;
      void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz); vPosition = position; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uTime; uniform vec3 uColor; uniform float uOpacity;
      varying vec3 vNormal; varying vec3 vView; varying vec3 vPosition;
      void main() { float edge = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.4);
        float scan = .35 + .65 * smoothstep(.84, 1.0, sin(vPosition.y * 44.0 - uTime * 4.0));
        gl_FragColor = vec4(uColor, (edge * .7 + scan * .08) * uOpacity); }`,
  });
  const field = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), fieldMaterial);
  field.name = "shield_energy_field";
  field.position.set(0, 2.25, 0);
  group.add(field);

  const full = new THREE.Group();
  full.name = "full_charge_shield";
  full.position.set(0, 2.28, 0);
  const shellMaterial = new THREE.MeshBasicMaterial({ color: "#72ffd0", wireframe: true, transparent: true, opacity: 0, depthWrite: false });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 30, 22), shellMaterial);
  shell.name = "shield_wireframe_shell";
  shell.scale.set(1.78, 2.78, 1.48);
  full.add(shell);
  const rings = [0, 1, 2].map(i => {
    const material = new THREE.MeshBasicMaterial({ color: i === 1 ? "#e7fff8" : "#62edb9", transparent: true, opacity: 0, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.73, .022, 7, 70), material);
    ring.name = `shield_orbit_ring_${i}`;
    ring.rotation.set(Math.PI / 2, 0, i * Math.PI / 3);
    ring.scale.setScalar(1 + i * .035);
    full.add(ring);
    return material;
  });
  const light = new THREE.PointLight("#62edb9", 0, 7);
  full.add(light);
  group.add(full);
  let elapsed = 0;

  return {
    group,
    update(power: number, delta: number, animated: boolean) {
      const strength = THREE.MathUtils.clamp(power, 0, 1);
      if (animated) elapsed += Math.min(Math.max(delta, 0), .05);
      // Fade the full-charge effects in near the peak, without popping at a threshold.
      const charge = THREE.MathUtils.smoothstep(strength, .85, 1);
      field.visible = strength > 0;
      field.scale.set(1.65 + strength * .5, 2.75, 1.35 + strength * .5);
      fieldMaterial.uniforms.uTime.value = elapsed;
      fieldMaterial.uniforms.uOpacity.value = strength;
      full.visible = charge > 0;
      full.rotation.y = elapsed * .7;
      full.scale.setScalar(1 + Math.sin(elapsed * 3.8) * .055);
      shellMaterial.opacity = .2 * charge;
      rings.forEach((material, i) => { material.opacity = (.78 - i * .13) * charge; });
      light.intensity = 15 * charge;
    },
    dispose() {
      group.traverse(node => {
        if (!(node instanceof THREE.Mesh)) return;
        node.geometry.dispose();
        for (const material of Array.isArray(node.material) ? node.material : [node.material]) material.dispose();
      });
    },
  };
}
