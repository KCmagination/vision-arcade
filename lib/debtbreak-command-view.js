// Reversible presentation coordinates. Simulation, range and calendar stay canonical.
const bend=z=>38*Math.sin(z/800*Math.PI*2);
export function commandPoint(x,z){return {x:70+x*.86+bend(z),z:65+z*.84};}
export function commandUnproject(x,z){const worldZ=(z-65)/.84;return {x:(x-70-bend(worldZ))/.86,z:worldZ};}

// Search a bounded two-dimensional neighborhood, then a coarse safe-area grid.
// The anchor remains canonical; only the caption moves and receives a leader.
export function placeCommandLabel(x,y,width,height,labelWidth,occupied){
 const fit=(xx,yy)=>({x:Math.max(labelWidth/2+3,Math.min(width-labelWidth/2-3,xx)),y:Math.max(12,Math.min(height-12,yy)),w:labelWidth});
 const clear=b=>!occupied.some(o=>Math.abs(b.x-o.x)<(b.w+o.w)/2+3&&Math.abs(b.y-o.y)<20);
 const candidates=[];
 for(const dy of [0,20,-20,40,-40,60,-60,80,-80])for(const dx of [0,labelWidth+8,-labelWidth-8])candidates.push({b:fit(x+dx,y+dy),cost:dx*dx+dy*dy});
 candidates.sort((a,b)=>a.cost-b.cost);
 for(const {b} of candidates)if(clear(b))return b;
 for(let yy=12;yy<height-10;yy+=20)for(let xx=labelWidth/2+3;xx<width-labelWidth/2;xx+=labelWidth+8){const b=fit(xx,yy);if(clear(b))return b;}
 return fit(x,y);
}
