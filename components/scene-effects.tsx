"use client";
import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector2 } from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export function SceneEffects({ strength = .45 }: { strength?: number }) {
  const { gl, scene, camera, size } = useThree();
  const effects = useMemo(() => {
    const composer = new EffectComposer(gl);
    const render = new RenderPass(scene, camera);
    const bloom = new UnrealBloomPass(new Vector2(512, 512), strength, .35, .95);
    const output = new OutputPass();
    composer.addPass(render); composer.addPass(bloom); composer.addPass(output);
    return { composer, render, bloom, output };
  }, [gl, scene, camera, strength]);
  useEffect(() => { effects.composer.setPixelRatio(Math.min(gl.getPixelRatio(), 1.25)); effects.composer.setSize(size.width, size.height); }, [effects, gl, size]);
  useEffect(() => () => { effects.bloom.dispose(); effects.output.dispose(); effects.render.dispose(); effects.composer.dispose(); }, [effects]);
  useFrame((_, dt) => effects.composer.render(dt), 1);
  return null;
}
