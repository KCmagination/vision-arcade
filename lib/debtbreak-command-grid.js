// Pure arcade geometry. This module never moves money or changes shared condition.
export const GRID_SIZE=10,CELL_SIZE=100;
export const GRID_ASSETS=['cashFlow','capital','collateral','credit',...Array.from({length:7},(_,i)=>`need${i}`)];
export const GRID_LABELS=['Cash Flow','Capital','Collateral','Credit','Air · water · food','Shelter · safety','Sleep','Clothing','Health care','Socializing','Purpose'];
export const CAPITAL_RADIUS=280,CREDIT_RADIUS=320,CREDIT_RANGE_BONUS=.2;
export const GRID_ROUTES=[[[500,950],[500,850],[150,850],[150,150],[500,150]],[[500,950],[500,850],[850,850],[850,150],[500,150]]];
export const isGrid=command=>command?.version===2;
export const emptyLayout=()=>Object.fromEntries(GRID_ASSETS.map(id=>[id,null]));
export function gridCell(col,row){return Number.isInteger(col)&&Number.isInteger(row)&&col>=2&&col<=7&&row>=2&&row<=7;}
export function gridPoint(cell){return cell?{x:(cell.col+.5)*CELL_SIZE,z:(cell.row+.5)*CELL_SIZE}:null;}
export function assetPoint(command,id){return gridPoint(command?.layout?.[id]);}
export function canPlace(command,id,col,row){return GRID_ASSETS.includes(id)&&gridCell(col,row)&&!GRID_ASSETS.some(other=>other!==id&&command.layout?.[other]?.col===col&&command.layout?.[other]?.row===row);}
export function validLayout(command,complete=false){
 if(!command.layout||Object.keys(command.layout).length!==GRID_ASSETS.length)return false;
 const used=new Set();
 return GRID_ASSETS.every(id=>{const cell=command.layout[id];if(cell===null)return !complete;if(!cell||!gridCell(cell.col,cell.row))return false;const key=`${cell.col}:${cell.row}`;if(used.has(key))return false;used.add(key);return true;});
}
export function recommendedLayout(){const cells=[[4,4],[5,4],[4,5],[5,5],[3,3],[4,3],[5,3],[6,3],[3,5],[5,6],[6,5]];return Object.fromEntries(GRID_ASSETS.map((id,i)=>[id,{col:cells[i][0],row:cells[i][1]}]));}
export function capitalCovers(command,id){const center=assetPoint(command,'capital'),target=GRID_ASSETS.includes(id)?assetPoint(command,id):null;return !!center&&!!target&&Math.hypot(center.x-target.x,center.z-target.z)<=CAPITAL_RADIUS;}
export function creditSupports(command){const source=assetPoint(command,'credit'),gun=assetPoint(command,'cashFlow');return !!source&&!!gun&&Math.hypot(source.x-gun.x,source.z-gun.z)<=CREDIT_RADIUS;}
export function routePoint(branch,progress){
 const points=GRID_ROUTES[branch%2],lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));
 let distance=Math.max(0,Math.min(1,progress))*lengths.reduce((a,b)=>a+b,0);
 for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]||i===lengths.length-1){const a=points[i],b=points[i+1],fraction=distance/lengths[i];return {x:a[0]+(b[0]-a[0])*fraction,z:a[1]+(b[1]-a[1])*fraction,angle:Math.atan2(b[1]-a[1],b[0]-a[0])-Math.PI/2};}distance-=lengths[i];}
}
export function packetTarget(packet){return `need${Math.abs(packet.slot??0)%7}`;}
export function migrateGrid(command){
 if(isGrid(command))return command;
 // Retain every financial field, upgrade and permission; only replace geometry.
 command.version=2;command.layout=recommendedLayout();
 command.towers.forEach(t=>{t.pad=null;});return command;
}

export function selectGridAsset(world,id){if(GRID_ASSETS.includes(id))world.selectedAsset=id;}
export function setGridCursor(world,cell){world.gridCursor=cell;}
