'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../dist'),origin='https://tejax-kart-apex.greenlarch1024.chatgpt.site';
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)])}
const files=walk(root),titles=new Set();let links=0;
for(const file of files){const source=fs.readFileSync(file,'utf8');if(file.endsWith('.js'))new vm.Script(source,{filename:file});if(!file.endsWith('.html'))continue;
 const title=source.match(/<title>(.*?)<\/title>/)?.[1];assert.ok(title&&!titles.has(title),'Unique page title: '+file);titles.add(title);
 assert.match(source,/<html lang="en"/);assert.match(source,/<meta name="description" content="[^"]{40,}"/);assert.match(source,/<link rel="canonical" href="https:\/\//);assert.match(source,/<meta property="og:image"/);assert.match(source,/<h1>/);
 const ids=[...source.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'Duplicate HTML ids: '+file);
 for(const block of source.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs))assert.equal(JSON.parse(block[1])['@context'],'https://schema.org');
 for(const match of source.matchAll(/(?:src|href)="([^"]+)"/g)){const link=match[1];if(/^(https?:|data:|mailto:|#)/.test(link))continue;const [pathname,fragment]=link.split('#'),target=path.resolve(path.dirname(file),pathname.split('?')[0]);assert.ok(target.startsWith(root+path.sep)&&fs.existsSync(target),'Missing local link '+link+' in '+file);if(fragment&&target.endsWith('.html'))assert.ok(fs.readFileSync(target,'utf8').includes('id="'+fragment+'"'),'Missing anchor '+link);links++}
}
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest')));for(const icon of manifest.icons)assert.ok(fs.existsSync(path.join(root,icon.src)));assert.equal(manifest.display,'standalone');
const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8'),locations=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);assert.equal(locations.length,titles.size);for(const loc of locations){assert.ok(loc.startsWith(origin+'/'));assert.ok(fs.existsSync(path.join(root,loc===origin+'/'?'index.html':loc.slice(origin.length+1))))}
assert.ok(fs.readFileSync(path.join(root,'robots.txt'),'utf8').includes(origin+'/sitemap.xml'));
assert.ok(!fs.existsSync(path.join(root,'downloads')),'Obsolete download packages must not ship');
const scope={self:{addEventListener(){}}};vm.createContext(scope);vm.runInContext(fs.readFileSync(path.join(root,'sw.js'),'utf8')+';globalThis.cachedFiles=FILES;',scope);for(const file of files){const relative=path.relative(root,file).replaceAll('\\','/');if(relative!=='sw.js')assert.ok(scope.cachedFiles.includes(relative),'Uncached asset '+relative)}
console.log(`Validated ${titles.size} pages, ${links} local links, structured data, sitemap, manifest, scripts and offline assets.`);
