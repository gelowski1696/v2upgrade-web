import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const rate=48000,seconds=60,n=rate*seconds,left=new Float32Array(n),right=new Float32Array(n);
let seed=823741;const noise=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/2147483648-1};
function add(start,duration,fn,pan=0){let offset=Math.round(start*rate),length=Math.round(duration*rate);for(let j=0;j<length&&offset+j<n;j++){if(offset+j<0)continue;let sample=fn(j/rate,j/duration/rate);left[offset+j]+=sample*(1-pan*.35);right[offset+j]+=sample*(1+pan*.35)}}
const beat=.5,notes=[55,55,65.406,49],arp=[220,261.626,329.628,440,329.628,261.626,196,293.665];
for(let b=0;b<120;b++){
 const time=b*beat,active=time>=4&&time<56&&!(time>=26&&time<28),energy=active?.85:.45;
 add(time,.34,(t)=>energy*.65*Math.sin(2*Math.PI*(47*t+7*(1-Math.exp(-t*35))))*Math.exp(-t*15));
 if(b%2===1&&active)add(time,.19,t=>noise()*.24*Math.exp(-t*28)+Math.sin(t*2*Math.PI*185)*.1*Math.exp(-t*30));
 for(let h=0;h<2;h++)if(time<58)add(time+h*.25,.065,t=>noise()*.065*Math.exp(-t*75),h?.6:-.6);
 let f=notes[Math.floor(b/8)%notes.length];add(time,.43,t=>{let env=Math.min(t/.015,1)*Math.exp(-t*5);return (Math.sin(2*Math.PI*f*t)+.23*Math.sin(2*Math.PI*f*2*t))*.18*env*energy});
 if(time>=4&&time<59)for(let a=0;a<2;a++){let f=arp[(b*2+a)%arp.length];add(time+a*.25,.7,t=>{let env=Math.min(t/.008,1)*Math.exp(-t*8);return (Math.sin(2*Math.PI*f*t)+.2*Math.sin(2*Math.PI*f*3*t))*.08*env},a?.7:-.7)}
}
for(let bar=0;bar<15;bar++){let start=bar*4;[110,164.814,220,261.626].forEach((f,i)=>add(start,4.5,t=>{let envelope=Math.min(t/.7,1)*Math.min((4.5-t)/1.2,1);return Math.sin(2*Math.PI*f*t+Math.sin(t*.9)*.04)*.026*envelope},(i-1.5)/2))}
for(const cut of [4,9,15,20,26,32,37,42,47,52,53,54,55,56]){let prev=0;add(cut-.38,.6,(t,p)=>{prev=prev*.8+noise()*.2;return prev*.37*Math.pow(Math.sin(Math.PI*p),2)},-.2);add(cut,.8,t=>Math.sin(2*Math.PI*(37*t+3*(1-Math.exp(-t*13))))*.23*Math.exp(-t*8));}
add(56,3.6,t=>(Math.sin(t*2*Math.PI*440)+Math.sin(t*2*Math.PI*659.255))*.055*Math.exp(-t*1.4));
const bytes=Buffer.alloc(44+n*4);bytes.write('RIFF');bytes.writeUInt32LE(36+n*4,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(2,22);bytes.writeUInt32LE(rate,24);bytes.writeUInt32LE(rate*4,28);bytes.writeUInt16LE(4,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(n*4,40);
let peak=0;for(let i=0;i<n;i++)peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));
for(let i=0;i<n;i++){let fade=Math.min(i/(rate*.02),1)*Math.min((n-i)/(rate*.7),1),gain=.78/peak*fade;bytes.writeInt16LE(Math.round(left[i]*gain*32767),44+i*4);bytes.writeInt16LE(Math.round(right[i]*gain*32767),46+i*4)}
writeFileSync(fileURLToPath(new URL('soundtrack.wav',import.meta.url)),bytes);console.log('Original stereo soundtrack: 60 seconds, 48 kHz.');
