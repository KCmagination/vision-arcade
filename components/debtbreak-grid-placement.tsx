"use client";
import {useState} from 'react';
import {GRID_ASSETS,GRID_LABELS,capitalCovers,canPlace,creditSupports} from '@/lib/debtbreak-command-grid.js';
import type {CommandState} from '@/lib/debtbreak-command.js';
export function GridPlacement({command,selected,onSelect,onPlace,onPreset}:{command:CommandState;selected:string;onSelect:(id:string)=>void;onPlace:(id:string,col:number,row:number)=>void;onPreset:()=>void}){
 const [col,setCol]=useState(3),[row,setRow]=useState(3),editable=['setup','build'].includes(command.stage);
 return <section className="grid-placement" aria-label="Asset tray and snap grid">
  <h3>Build your defense</h3><p>One weapon, three support roles, seven needs. Move pieces freely between waves.</p>
  <div className="grid-asset-tray">{GRID_ASSETS.map((id:string,i:number)=>{const cell=command.layout?.[id];return <button key={id} draggable={editable} aria-pressed={selected===id} onClick={()=>onSelect(id)} onDragStart={e=>{onSelect(id);e.dataTransfer.setData('text/plain',id);e.dataTransfer.effectAllowed='move';}}><b>{i<4?['CF','SH','HP','R'][i]:i-3}</b><span>{GRID_LABELS[i]}<small>{cell?`Column ${cell.col-1}, row ${cell.row-1}`:'In tray'}{i>=4&&cell?(capitalCovers(command,id)?' · covered':' · outside shield'):''}</small></span></button>;})}</div>
  {editable&&<><button onClick={onPreset}>Use recommended layout</button><p>Drag from the tray or select a piece and tap a cell. On the map, arrow keys choose a cell; Enter places; Escape cancels. Roads stay clear.</p>
   <div className="grid-place-controls"><label>Column<input aria-label="Build column" type="number" min="1" max="6" value={col} onChange={e=>setCol(Number(e.target.value))}/></label><label>Row<input aria-label="Build row" type="number" min="1" max="6" value={row} onChange={e=>setRow(Number(e.target.value))}/></label><button disabled={!canPlace(command,selected,col+1,row+1)} onClick={()=>onPlace(selected,col+1,row+1)}>Place selected asset</button></div></>}
  <p>Green dots: inside Capital’s savings-backup area. Orange dots: outside. An uncovered bill can use authorized cash, but cannot draw savings.</p>
  <p>Credit range link: <b>{creditSupports(command)?'active, +20%':'inactive'}</b>. Only one bonus applies. Ground attackers follow the road, then attack Collateral from the exit. Air attackers fly directly to a need. All structures share one base condition.</p>
 </section>;
}
