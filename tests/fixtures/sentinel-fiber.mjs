let asset;
let frames = [];
export function prepare(value) { asset = value; frames = []; }
export function useLoader() { return asset; }
export function useFrame(callback) { frames.push(callback); }
export function renderFrame(delta = 1 / 60) { for (const callback of frames) callback({}, delta); }
