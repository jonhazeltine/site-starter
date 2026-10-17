import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { dockContext, proposalMatchesPage } from '../src/lib/studio/dock-context';

test('actual dock submits the current route and rejects publishing after a route change', async () => {
 const source=readFileSync(new URL('../src/components/StudioDock.astro',import.meta.url),'utf8').split('<script>')[1].split('</script>')[0].replace(/import .*?;\n/,'');
 const nodes=new Map<string,any>();
 const element=()=>({dataset:{runtime:'worker'},textContent:'',innerHTML:'',value:'',hidden:false,disabled:false,scrollHeight:0,scrollTop:0,handlers:{} as any,addEventListener(event:string,fn:any){this.handlers[event]=fn;},appendChild(){},remove(){},focus(){},classList:{add(){},remove(){}}});
 const get=(id:string)=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);};
 const location={pathname:'/watch',search:'?edit=1',hash:'',reload(){}};
 const heading={textContent:'Watch'};
 const requests:{url:string,body:any}[]=[];
 const store=new Map<string,string>();
 const context={dockContext,proposalMatchesPage,location,document:{title:'Watch | My Site',getElementById:get,querySelector:(s:string)=>s.includes('h1')?heading:null,createElement:element,body:{appendChild(){}}},sessionStorage:{getItem:(k:string)=>store.get(k)||null,setItem:(k:string,v:string)=>store.set(k,v),removeItem:(k:string)=>store.delete(k)},setTimeout(){},fetch:async(url:string,opts:any)=>{const body=opts?.body?JSON.parse(opts.body):null;requests.push({url,body});return {json:async()=>url.endsWith('/session')?{authed:true}:url.endsWith('/chat')?{reply:'Review it',edits:[{path:'site.name',from:'A',to:'B'}],version:'v1'}:{version:'v1'}};}};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText,context);
 await new Promise(resolve=>setImmediate(resolve));
 location.pathname='/spiritual-formation';heading.textContent='Spiritual Formation';
 get('sd-msg').value='Update the heading';
 await get('sd-composer').handlers.submit({preventDefault(){}});
 const request=requests.find(r=>r.url.endsWith('/chat'));
 assert.deepEqual(request?.body,{message:'Update the heading',path:'/spiritual-formation',page:'Spiritual Formation'});
 location.pathname='/watch';
 await get('sd-pub').onclick();
 assert.equal(requests.some(r=>r.url.endsWith('/apply')||r.url.endsWith('/page-apply')),false);
 assert.match(get('sd-log').innerHTML,/The page changed/);
});
