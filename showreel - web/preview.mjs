import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {dirname,resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.woff2':'font/woff2','.wav':'audio/wav','.mp4':'video/mp4'};
createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!path.startsWith(root+sep)){res.writeHead(403).end();return}const info=await stat(path);if(!info.isFile()){res.writeHead(404).end();return}res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');res.setHeader('Accept-Ranges','bytes');const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');if(range){const start=Number(range[1]),end=Math.min(Number(range[2]||info.size-1),info.size-1);if(start>end){res.writeHead(416,{'Content-Range':`bytes */${info.size}`}).end();return}res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${info.size}`,'Content-Length':end-start+1});createReadStream(path,{start,end}).pipe(res)}else{res.setHeader('Content-Length',info.size);createReadStream(path).pipe(res)}}catch{res.writeHead(404).end()}}).listen(4177,'127.0.0.1',()=>console.log('Showreel preview: http://127.0.0.1:4177'));
