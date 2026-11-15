import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {chromium} from 'playwright-core';
import ffmpeg from 'ffmpeg-static';
const root=dirname(fileURLToPath(import.meta.url));
const mime={'.html':'text/html','.js':'text/javascript','.png':'image/png','.woff2':'font/woff2','.wav':'audio/wav','.mp4':'video/mp4'};
const server=createServer(async(req,res)=>{try{const p=resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));if(!p.startsWith(root+sep)){res.writeHead(403).end();return}res.setHeader('Content-Type',mime[extname(p)]||'application/octet-stream');res.end(await readFile(p))}catch{res.writeHead(404).end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-gpu','--font-render-hinting=none']});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(`http://127.0.0.1:${server.address().port}/?render`);await page.evaluate(()=>window.ready);await mkdir(resolve(root,'stills'),{recursive:true});
 const times=[2,7,12,18,23,29,35,40,45,50,54,58];
 for(let i=0;i<times.length;i++){await page.evaluate(t=>window.renderFrame(t),times[i]);await page.screenshot({path:resolve(root,`stills/${String(i+1).padStart(2,'0')}.png`)});}
 await page.evaluate(()=>{const original=document.getElementById('film'),sheet=document.createElement('canvas');sheet.width=1920;sheet.height=1440;const c=sheet.getContext('2d');[2,7,12,18,23,29,35,40,45,50,54,58].forEach((t,i)=>{window.renderFrame(t);c.drawImage(original,(i%3)*640,Math.floor(i/3)*360,640,360)});window.contactSheet=sheet.toDataURL('image/jpeg',.94).split(',')[1]});
 await writeFile(resolve(root,'storyboard.jpg'),Buffer.from(await page.evaluate(()=>window.contactSheet),'base64'));
 if(errors.length)throw Error(errors.join('\n'));
 if(process.argv.includes('--stills')){console.log('Twelve stills and storyboard exported.');}
 else{
 const fps=60,total=60*fps,out=resolve(root,'vmjam-sales-web-dashboard-60s.mp4');
 const encoder=spawn(ffmpeg,['-y','-f','image2pipe','-vcodec','mjpeg','-framerate',String(fps),'-i','pipe:0','-i',resolve(root,'soundtrack.wav'),'-map','0:v','-map','1:a','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','256k','-t','60','-movflags','+faststart',out],{stdio:['pipe','ignore','pipe'],windowsHide:true});
 let log='';encoder.stderr.on('data',d=>log+=d);const completion=once(encoder,'close');
 encoder.stdin.on('error',()=>{});
 for(let f=0;f<total;f++){let jpeg=await page.evaluate(t=>{window.renderFrame(t);return document.getElementById('film').toDataURL('image/jpeg',.97).split(',')[1]},f/fps);if(!encoder.stdin.write(Buffer.from(jpeg,'base64')))await once(encoder.stdin,'drain');if(f%180===0)console.log(`Rendered ${f}/${total} frames (${Math.round(f/total*100)}%).`)}
 encoder.stdin.end();const [code]=await completion;await writeFile(resolve(root,'render.log'),log);if(code!==0)throw Error(log.slice(-3000));console.log(`Exported ${out}`);
 }
}finally{await browser.close();server.close()}

