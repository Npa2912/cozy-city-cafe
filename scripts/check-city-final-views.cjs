// Focused final-render regression, including an invariant that the color pass
// receives the original high-detail geometry after shadow-only proxy rendering.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let browser;
async function run(existingBrowser){
 browser=existingBrowser||await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=existingBrowser?browser.contexts()[0].pages()[0]:await browser.newPage({viewport:{width:800,height:500}});
 page.setDefaultTimeout(300000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{new MutationObserver(()=>{const c=document.querySelector('canvas');if(c)c.style.visibility='hidden'}).observe(document,{childList:true,subtree:true})});
 await page.goto(process.env.APP_URL||'http://127.0.0.1:5173/?test&view=street',{waitUntil:'networkidle',timeout:300000});
 await page.evaluate(()=>{if(document.querySelector('#motion').textContent==='Tạm dừng')document.querySelector('#motion').click()});
 await page.waitForFunction(()=>document.querySelector('canvas').dataset.ready==='true'&&!!window.__cafeTest?.shadow);
 await page.evaluate(()=>{const t=__cafeTest;t.renderer.setAnimationLoop(null);t.environment.clock.paused=true;const cancel=window.cancelAnimationFrame.bind(window);window.requestAnimationFrame=cb=>-setTimeout(()=>cb(performance.now()),16);window.cancelAnimationFrame=id=>id<0?clearTimeout(-id):cancel(id);t.camera.position.set(400,200,400);t.chunks.update(.3)});
 const out=process.env.FINAL_ARTIFACT_DIR||'/tmp/cozy-final-views';fs.mkdirSync(out,{recursive:true});
 const report={mode:'manual timer frames, hidden canvas, synchronized GL; not native interactive FPS',rows:[],errors};
 for(const view of ['street','city','coast','metropolis','roadBridge','gardenBridge']){
  const result=await page.evaluate(async view=>{
   const t=__cafeTest,{CAMERA_VIEWS}=await import('/src/camera-views.js'),v=CAMERA_VIEWS[view],c=t.camera,r=t.renderer;
   c.position.fromArray(v.position);c.fov=v.fov;c.updateProjectionMatrix();c.lookAt(...v.target);c.updateMatrixWorld();document.querySelector('#view').value=view;t.environment.clock.setHour(9);t.quality.update(c);t.environment.apply();t.chunks.update(.3);await t.chunks.settle();for(let i=0;i<15;i++)t.chunks.update(.05);
   const hooks=[];let colorDraws=0;t.scene.traverse(o=>{if(!o.isInstancedMesh||!o.userData.streamCell)return;const geometry=o.geometry,prior=o.onBeforeRender;hooks.push([o,prior]);o.onBeforeRender=function(...args){if(this.geometry!==geometry||args[3]!==geometry)throw Error('Color geometry changed by shadow proxy');colorDraws++;prior.apply(this,args)}});
   const frameMs=[];try{for(let i=0;i<3;i++){r.shadowMap.needsUpdate=i===0;const start=performance.now();r.render(t.scene,c);r.getContext().finish();frameMs.push(performance.now()-start)}}finally{for(const[o,hook]of hooks)o.onBeforeRender=hook}
   if(!colorDraws)throw Error('No color geometry checked');
   return{view,position:[...v.position],target:[...v.target],fov:v.fov,frameMs,meanFps:3000/frameMs.reduce((s,n)=>s+n,0),worstFps:1000/Math.max(...frameMs),calls:r.info.render.calls,triangles:r.info.render.triangles,geometries:r.info.memory.geometries,textures:r.info.memory.textures,heap:performance.memory?.usedJSHeapSize??null,shadow:{...t.shadow},colorGeometryDrawsVerified:colorDraws,chunks:{...t.chunks.stats},image:['metropolis','roadBridge','gardenBridge'].includes(view)?r.domElement.toDataURL('image/png'):null};
  },view);
  const{image,...row}=result;report.rows.push(row);if(image)fs.writeFileSync(path.join(out,view+'.png'),Buffer.from(image.split(',')[1],'base64'));fs.writeFileSync(path.join(out,'profile-final-views.json'),JSON.stringify(report,null,2));console.log('FINAL VIEW',JSON.stringify(row));
 }
 report.night=await page.evaluate(async()=>{const t=__cafeTest,{CAMERA_VIEWS}=await import('/src/camera-views.js'),v=CAMERA_VIEWS.metropolis;t.camera.position.fromArray(v.position);t.camera.fov=v.fov;t.camera.updateProjectionMatrix();t.camera.lookAt(...v.target);t.chunks.update(.3);await t.chunks.settle();for(let i=0;i<15;i++)t.chunks.update(.05);t.quality.update(t.camera);t.environment.clock.setHour(22);t.environment.apply();const prior=t.shadow.skippedDarkPasses;t.renderer.shadowMap.needsUpdate=true;t.renderer.render(t.scene,t.camera);t.renderer.getContext().finish();if(t.shadow.skippedDarkPasses<=prior)throw Error('Zero-intensity shadow work not skipped');return{shadow:{...t.shadow},image:t.renderer.domElement.toDataURL('image/png')}});
 fs.writeFileSync(path.join(out,'night.png'),Buffer.from(report.night.image.split(',')[1],'base64'));delete report.night.image;assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'profile-final-views.json'),JSON.stringify(report,null,2));console.log('FINAL COLOR/SHADOW/CAMERA PASSED');if(!existingBrowser)await browser.close();return report;
}
module.exports=run;
if(require.main===module)run().catch(async e=>{console.error(e);if(browser)await browser.close();process.exit(1)});
