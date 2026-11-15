/* Each composition is deterministic, so preview and exported frames match. */
const canvas=document.getElementById('film'),ctx=canvas.getContext('2d');
const W=1920,H=1080,DUR=60,C={black:'#100e09',cream:'#faf6ee',gold:'#d8ad50',muted:'#a39881',line:'#e8dfcd',white:'#ffffff'};
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)),ease=x=>1-Math.pow(1-clamp(x),4),mix=(a,b,t)=>a+(b-a)*t;
const cuts=[0,4,9,15,20,26,32,37,42,47,52,56,60];
const images={};
function rect(x,y,w,h,c,r=0){ctx.fillStyle=c;ctx.beginPath();ctx.roundRect(x,y,Math.max(0,w),Math.max(0,h),r);ctx.fill()}
function text(s,x,y,size=32,color=C.cream,align='left',font='Display'){ctx.fillStyle=color;ctx.font=`${font==='Display'?800:400} ${size}px ${font}, Arial, sans-serif`;ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.fillText(s,x,y)}
function label(s,x,y,color=C.gold,size=19){text(s,x,y,size,color,'left','Mono')}
function line(x,y,x2,y2,c=C.gold,w=2){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke()}
function circle(x,y,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
function scope(x,y,scale,rotation,fn){ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.scale(scale,scale);fn();ctx.restore()}
function reveal(s,x,y,size,color,t,delay=0){const p=ease((t-delay)/.7);ctx.save();ctx.beginPath();ctx.rect(x-10,y-size-25,W,size+40);ctx.clip();text(s,x,y+(1-p)*(size+50),size,color);ctx.restore()}
function arrow(x,y,size=50,c=C.gold){line(x,y,x+size,y-size,c,5);line(x+size,y-size,x+size,y-size*.25,c,5);line(x+size,y-size,x+size*.25,y-size,c,5)}
function frame(t,n,light=false){const ink=light?'#776b53':C.muted;label('VMJAM SALES / WEB DASHBOARD',76,61,light?C.black:C.gold,18);label('WEB EDITION',1690,61,ink,17);line(76,89,1844,89,light?C.line:'#3b3424',1);label('VMJAM SALES',76,1020,ink,17);label('DEMO DATA',1390,1020,ink,14);label(`${String(n).padStart(2,'0')} / 12`,1740,1020,ink,17);rect(76,1048,1768,2,light?C.line:'#3b3424');rect(76,1048,1768*t/DUR,2,C.gold)}
function browser(name,x,y,w,h,t,options={}){const im=images[name];scope(x+w/2,y+h/2,1,options.rotate||0,()=>{ctx.shadowColor='#00000030';ctx.shadowBlur=30;rect(-w/2,-h/2,w,h,C.cream,14);ctx.shadowBlur=0;ctx.save();ctx.beginPath();ctx.roundRect(-w/2,-h/2,w,h,14);ctx.clip();rect(-w/2,-h/2,w,38,C.black);[0,1,2].forEach(i=>circle(-w/2+22+i*18,-h/2+19,4,i===0?C.gold:'#786746'));label('VMJAM SALES / WEB DASHBOARD',-w/2+99,-h/2+24,C.muted,11);const sx=options.sx||0,sy=options.sy||0,sw=options.sw||im.width,sh=options.sh||im.height;ctx.drawImage(im,sx,sy,Math.min(sw,sh*w/(h-38)),Math.min(sh,sw*(h-38)/w),-w/2,-h/2+38,w,h-38);ctx.restore()})}
function screen(name,x,y,w,h,t,zoom=1){const im=images[name],p=ease(t/.9);scope(x+w/2,y+h/2+(1-p)*100,zoom,Math.sin(t*.45)*.006,()=>{browser(name,-w/2,-h/2,w,h,t)})}
function crop(name,sx,sy,sw,sh,x,y,w,h,r=14){ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.clip();ctx.drawImage(images[name],sx,sy,sw,sh,x,y,w,h);ctx.restore()}
function trace(points,p,color=C.gold,width=5){ctx.save();ctx.beginPath();ctx.rect(0,0,W*clamp(p),H);ctx.clip();ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.lineWidth=width;ctx.strokeStyle=color;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();ctx.restore()}
function number(v,p){return Math.round(v*ease(p)).toLocaleString('en-US')}
function mark(x,y,s,t){scope(x,y,s,-.06+Math.sin(t*.35)*.035,()=>{for(let i=3;i>=0;i--){ctx.strokeStyle=i===0?C.gold:'#514022';ctx.lineWidth=i===0?3:1;ctx.strokeRect(-190-i*28,-190-i*28,380+i*56,380+i*56)}trace([[x-1,0]],0);line(-125,40,-65,40,C.gold,6);line(-65,40,-25,-85,C.gold,6);line(-25,-85,38,104,C.gold,6);line(38,104,84,-22,C.gold,6);line(84,-22,139,-22,C.gold,6)})}
function intro(t,g){frame(g,1);mark(1505,534,1.13,t);label('YOUR BUSINESS. CLEARLY REPORTED.',82,233,C.muted,21);reveal('VMJAM',68,492,220,C.cream,t);reveal('Sales',79,660,160,C.gold,t,.15);reveal('Web Dashboard',82,800,90,C.gold,t,.3);label('THE VIEW BEYOND THE COUNTER.',85,923,C.cream,20)}
function sync(t,g){frame(g,2);reveal('From counter',80,239,101,C.cream,t);reveal('to browser.',80,353,116,C.gold,t,.15);label('YOUR LATEST SYNCHRONIZED POS SNAPSHOT.',84,436,C.muted,20);
 const p=ease((t-.5)/1.8);rect(115,579,388,255,'#211d14',16);rect(138,602,342,189,C.cream,6);label('POS DESKTOP',163,638,C.black,18);[.74,.45,.9].forEach((v,i)=>rect(164,675+i*30,264*v,10,i===0?C.gold:'#d0c4ad',2));line(309,835,309,875,C.gold,5);line(233,875,385,875,C.gold,5);
 line(542,715,940,715,'#4a3b20',2);for(let i=0;i<4;i++){let k=(t*.43+i/4)%1;circle(554+k*360,715,5,C.gold)}
 scope(752,715,1,Math.PI/4,()=>{rect(-33,-33,66,66,C.black);ctx.strokeStyle=C.gold;ctx.lineWidth=2;ctx.strokeRect(-33,-33,66,66)});label('SYNC',724,722,C.gold,17);
 screen('overview',1000,487,749,488,t);label('READ-ONLY OWNER REPORTS',1030,955,C.muted,18);rect(114,939,710*p,2,C.gold);
}
function overview(t,g){rect(0,0,W,H,C.cream);frame(g,3,true);reveal('The day, in perspective.',79,202,80,C.black,t);let k=ease(t/.9);screen('overview',385,255,1150,720,t,1+.012*Math.sin(t*.6));
 const a=ease((t-1.4)/.6);ctx.save();ctx.globalAlpha=a;scope(85,357+(1-a)*50,1,0,()=>{rect(0,0,365,166,C.black,12);label('GROSS SALES',24,39,C.muted,16);text('PHP '+number(212480,(t-1.4)/1.3),24,100,39,C.gold);label('286 TRANSACTIONS',24,139,C.cream,14)});ctx.restore();
 if(t>3){const p=ease((t-3)/.55);ctx.save();ctx.globalAlpha=p;rect(1435,676+(1-p)*60,380,141,C.gold,12);label('SELECT YOUR PERIOD',1462,716+(1-p)*60,C.black,16);text('Daily. Weekly.',1462,756+(1-p)*60,29,C.black);text('Monthly.',1462,794+(1-p)*60,29,C.black);ctx.restore()}
}
function sales(t,g){frame(g,4);label('01 / SALES RECORDS',82,179);reveal('Every sale.',79,324,113,C.cream,t);reveal('Every detail.',79,449,112,C.gold,t,.15);label('SEARCH. FILTER. INSPECT. EXPORT.',84,544,C.muted,19);
 const p=ease(t/.8);scope(1395,641+(1-p)*90,1+.004*t,-.012,()=>{browser('sales',-435,-310,870,620,t,{sx:248,sy:70,sw:1192,sh:870})});
 rect(84,692,444,152,C.black,8);label('OWNER ACCESS',108,731,C.gold,17);text('Read-only records.',108,777,30,C.cream);label('FROM YOUR POS SNAPSHOT',108,815,C.muted,16);
}
function profit(t,g){frame(g,5);label('02 / PROFITABILITY',82,179);reveal('Look beyond',79,324,110,C.cream,t);reveal('revenue.',79,447,127,C.gold,t,.13);label('RECORDED PROFIT. VISIBLE COST COVERAGE.',84,541,C.muted,18);
 let e=ease((t-.4)/1.6);text('PHP '+number(73260,(t-.4)/1.6),84,711,83,C.cream);label('RECORDED GROSS PROFIT / DEMO',88,757,C.muted,17);line(86,804,819,804,'#433720',1);label('COST COVERAGE',86,850,C.muted,17);text((98.3*e).toFixed(1)+'%',822,859,42,C.gold,'right');label('5 SALE LINES MISSING COST',86,907,C.gold,17);
 scope(1410,570,1+.004*t,.025-Math.sin(t)*.006,()=>{browser('profitability',-420,-279,840,558,t,{sx:270,sy:209,sw:1150,sh:710})});
}
function inventory(t,g){rect(0,0,W,H,C.gold);frame(g,6,true);label('03 / INVENTORY & REORDER PLANNING',82,180,C.black);reveal('Know your stock.',78,318,107,C.black,t);label('FULL. EMPTY. STORE. WAREHOUSE.',84,390,'#604817',20);
 const name=t<3?'inventory':'reorder';const local=t<3?t:t-3;screen(name,110,445,1150,526,local,1);rect(1310,494,496,420,C.black,14);label(t<3?'STOCK VISIBILITY':'REORDER PLANNING',1344,542,C.gold,20);
 const labels=t<3?['FULL CYLINDERS','EMPTY CYLINDERS','STOCK ALERTS']:['RECORDED DEMAND','DAYS OF COVER','REORDER SIGNALS'];labels.forEach((s,i)=>{let p=ease((local-.25-i*.16)/1.2);label(s,1344,615+i*96,C.cream,17);rect(1344,637+i*96,424,9,'#4c3c1d',3);rect(1344,637+i*96,424*[.84,.58,.34][i]*p,9,C.gold,3)});
}
function customers(t,g){rect(0,0,W,H,C.cream);frame(g,7,true);label('04 / CUSTOMER INSIGHTS',82,181,'#776b53');reveal('Know who',78,325,114,C.black,t);reveal('comes back.',78,452,117,C.black,t,.15);label('SPEND / VISITS / RECENCY / BALANCES',84,541,'#776b53',18);
 scope(1390,645,1+.004*t,-.012,()=>{browser('customers',-435,-310,870,620,t,{sx:250,sy:80,sw:1190,sh:850})});
 rect(85,666,434,204,C.black,12);label('CUSTOMER HISTORY',112,712,C.gold,18);text('See the relationship',112,762,28,C.cream);text('behind the sale.',112,803,31,C.cream);arrow(435,847,35);
}
function cash(t,g){frame(g,8);label('05 / CASH FLOW',82,180);reveal('Follow the money.',78,313,111,C.cream,t);label('PAYMENTS. MOVEMENTS. BALANCES.',84,387,C.muted,20);screen('cashflow',645,438,1163,538,t,1+.008*t);
 let e=ease((t-.4)/1.5);const entries=[['CASH IN',.91],['CASH OUT',.54],['NET MOVEMENT',.37]];entries.forEach(([s,v],i)=>{let y=549+i*147;label(s,87,y,C.muted,19);rect(87,y+24,413,28,'#302719',4);rect(87,y+24,413*v*e,28,i===1?'#91794b':C.gold,4)});label('ILLUSTRATIVE FLOW',87,948,C.muted,14);
}
function targets(t,g){frame(g,9);label('06 / SALES TARGETS',82,180);reveal('A goal.',78,316,119,C.cream,t);reveal('A daily pace.',78,447,117,C.gold,t,.14);label('PROGRESS. REMAINING VALUE. PROJECTION.',84,539,C.muted,18);
 const p=ease((t-.3)/2);ctx.save();ctx.translate(351,773);ctx.lineWidth=18;ctx.strokeStyle='#392f1b';ctx.beginPath();ctx.arc(0,0,136,-Math.PI*.9,Math.PI*.9);ctx.stroke();ctx.strokeStyle=C.gold;ctx.beginPath();ctx.arc(0,0,136,-Math.PI*.9,-Math.PI*.9+Math.PI*1.8*.91*p);ctx.stroke();text(Math.round(91*p)+'%',0,18,68,C.cream,'center');label('DEMO PROGRESS',-85,57,C.muted,14);ctx.restore();
 scope(1400,637,1+.004*t,.012,()=>{browser('targets',-420,-325,840,650,t,{sx:260,sy:80,sw:1160,sh:850})});
}
function reports(t,g){rect(0,0,W,H,C.cream);frame(g,10,true);label('07 / REPORTING',82,180,'#776b53');reveal('Make review',78,316,111,C.black,t);reveal('a routine.',78,442,126,C.black,t,.13);label('SAVED VIEWS / CSV EXPORTS / REPORT SCHEDULES',84,533,'#776b53',17);
 scope(1400,651,1+.004*t,-.012,()=>browser('scheduled',-430,-310,860,620,t,{sx:250,sy:70,sw:1190,sh:850}));
 rect(85,658,430,211,C.black,12);label('YOUR REPORTING RHYTHM',112,706,C.gold,17);['Choose a view.','Review the numbers.','Plan what comes next.'].forEach((s,i)=>text(s,112,754+i*39,26,C.cream));
}
function montage(t,g){let i=Math.min(3,Math.floor(t)),local=t-i,light=i%2===0;rect(0,0,W,H,light?C.cream:C.black);frame(g,11,light);label('THE OWNER WORKSPACE',83,198,light?'#776b53':C.muted,20);scope(960,567,1+.04*(1-ease(local/.3)),0,()=>text(['REVIEW.','COMPARE.','PLAN.','DECIDE.'][i],0,62,i===1?231:273,light?C.black:C.cream,'center'));rect(84,836,1752,3,light?C.line:'#392f1b');rect(84,836,1752*t/4,3,C.gold);label(['SEE YOUR BUSINESS','UNDERSTAND THE MOVEMENT','KNOW WHAT NEEDS ATTENTION','TAKE THE NEXT STEP'][i],84,907,light?C.black:C.gold,24);arrow(1750,922,64)}
function ending(t,g){frame(g,12);mark(1530,502,.99,t);label('YOUR BUSINESS. CLEARLY REPORTED.',82,235,C.muted,21);reveal('VMJAM',68,488,220,C.cream,t);reveal('Sales',81,659,160,C.gold,t,.12);reveal('Web Dashboard',81,801,90,C.gold,t,.24);label('FROM YOUR COUNTER. TO YOUR NEXT DECISION.',85,924,C.cream,19)}
const scenes=[intro,sync,overview,sales,profit,inventory,customers,cash,targets,reports,montage,ending];
window.renderFrame=function(t){t=clamp(t,0,59.999);ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.shadowBlur=0;rect(0,0,W,H,C.black);const i=cuts.findIndex((c,j)=>t>=c&&t<cuts[j+1]);scenes[i](t-cuts[i],t);if(i>0&&t-cuts[i]<.26){const p=ease((t-cuts[i])/.26);rect(W*p,0,W*(1-p),H,C.gold)}};
let playing=false,position=0;const soundtrack=new Audio('soundtrack.wav'),play=document.getElementById('play'),seek=document.getElementById('seek'),time=document.getElementById('time');
const stamp=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
function tick(){if(playing){position=Math.min(DUR,soundtrack.currentTime);if(soundtrack.ended||position>=DUR){playing=false;position=DUR;play.textContent='Replay with sound'}}window.renderFrame(position);seek.value=position;time.textContent=`${stamp(position)} / 01:00`;if(!document.body.classList.contains('render'))requestAnimationFrame(tick)}
play.onclick=async()=>{if(playing){playing=false;soundtrack.pause();play.textContent='Play with sound'}else{if(position>=DUR)position=0;soundtrack.currentTime=position;try{await soundtrack.play();playing=true;play.textContent='Pause'}catch{play.textContent='Retry playback'}}};
seek.oninput=()=>{position=Number(seek.value);soundtrack.currentTime=position;window.renderFrame(position)};
window.ready=Promise.all([document.fonts.load('800 100px Display'),document.fonts.load('400 20px Mono'),...['overview','sales','profitability','inventory','reorder','customers','cashflow','targets','scheduled'].map(name=>new Promise((res,rej)=>{const img=new Image();img.onload=()=>{images[name]=img;res()};img.onerror=()=>rej(Error('Missing screenshot '+name));img.src=`assets/${name}.png`}))]).then(()=>{if(new URLSearchParams(location.search).has('render'))document.body.classList.add('render');window.renderFrame(0);if(!document.body.classList.contains('render'))requestAnimationFrame(tick)});
