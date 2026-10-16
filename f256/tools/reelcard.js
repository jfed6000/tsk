const T=window.TSK, v=document.getElementById("view"), W=320, H=240;
const cv=document.createElement("canvas"); cv.width=W; cv.height=H; const c=cv.getContext("2d");
const bg=()=>{ const g=c.createLinearGradient(0,0,0,H); g.addColorStop(0,"#0a0918"); g.addColorStop(1,"#2c1a3a"); c.fillStyle=g; c.fillRect(0,0,W,H);
  let s=7; const r=()=>(s=(s*16807)%2147483647)/2147483647; c.fillStyle="#cfc8e8"; for(let i=0;i<60;i++) c.fillRect(Math.floor(r()*W),Math.floor(r()*H*0.85),1,1);
  c.fillStyle="#f4ecc8"; c.beginPath(); c.arc(286,30,13,0,7); c.fill(); c.fillStyle="#d8ceb0"; c.fillRect(281,25,3,3); c.fillRect(290,33,3,2);
  c.fillStyle="#140c18"; c.beginPath(); c.moveTo(0,H); c.lineTo(0,226); c.quadraticCurveTo(160,212,W,226); c.lineTo(W,H); c.fill();
  for(const x of [24,50,268,296]){ c.fillRect(x,214,2,10); c.fillRect(x-3,217,8,2); } };
const t=(s,y,col,k,o)=>{ for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[1,1],[-1,1],[1,-1],[-1,-1]]) T.drawText(c,s,W/2+dx*o,y+dy*o,"#1f0f07",k,null,"center"); T.drawText(c,s,W/2,y,col,k,null,"center"); };
const steps=[
 ()=>{},
 ()=>t("F256",50,"#ffd34a",11,3),
 ()=>t("6809",122,"#ff9d3c",11,3),
];
bg(); window.__shots=[];
for(const f of steps){ f(); window.__shots.push(cv.toDataURL()); }
