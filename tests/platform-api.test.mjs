import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {handleApi,__test} from '../lib/platform-api.mjs';

const db=new DatabaseSync(':memory:');
db.exec(fs.readFileSync(new URL('../drizzle/0000_majestic_doctor_faustus.sql',import.meta.url),'utf8'));
class D1Statement {
  constructor(sql,args=[]){this.sql=sql;this.args=args;}
  bind(...args){return new D1Statement(this.sql,args);}
  async first(){return db.prepare(this.sql).get(...this.args)||null;}
  async all(){return {results:db.prepare(this.sql).all(...this.args)};}
  execute(){const prepared=db.prepare(this.sql);if(prepared.columns().length)return {success:true,results:prepared.all(...this.args),meta:{changes:0}};const r=prepared.run(...this.args);return {success:true,meta:{changes:Number(r.changes)}};}
  async run(){return this.execute();}
}
const DB={prepare:sql=>new D1Statement(sql),batch:async statements=>{db.exec('BEGIN');try{const out=statements.map(s=>s.execute());db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}};
const objects=new Map();
const BUCKET={fail:false,async put(key,bytes){if(this.fail)throw new Error('Simulated R2 failure');objects.set(key,new Uint8Array(bytes));return {};},async get(key){const b=objects.get(key);return b?{body:b,size:b.length}:null;},async delete(key){objects.delete(key);}};
const env={DB,BUCKET,ADMIN_EMAILS:'owner@example.test',ASSETS:{async fetch(req){const file=path.basename(new URL(req.url).pathname);return new Response(fs.readFileSync(new URL('../public/data/'+file,import.meta.url)));}}};
const origin='https://test.example';
const identities={owner:{'oai-authenticated-user-id':'test-owner','oai-authenticated-user-email':'owner@example.test'},alice:{'oai-authenticated-user-id':'test-alice','oai-authenticated-user-email':'alice@example.test'},bob:{'oai-authenticated-user-id':'test-bob','oai-authenticated-user-email':'bob@example.test'}};
const jars=new Map();let tests=0;
async function call(endpoint,{who='guest',method='GET',body,raw,headers={},omitOrigin=false,originOverride}={}){
  const h=new Headers({...identities[who],...headers});h.set('cf-connecting-ip','192.0.2.'+(who==='guest'?1:who==='guest2'?2:who==='owner'?3:who==='alice'?4:5));
  if(jars.get(who))h.set('cookie',jars.get(who));if(!['GET','HEAD'].includes(method)&&!omitOrigin)h.set('origin',originOverride||origin);
  let payload=raw;if(body!==undefined){h.set('content-type','application/json');payload=JSON.stringify(body);}else if(raw)h.set('content-type','application/octet-stream');
  const response=await handleApi(new Request(origin+endpoint,{method,headers:h,...(payload!==undefined?{body:payload}:{})}),env);
  for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0],name=pair.split('=')[0];jars.set(who,[...(jars.get(who)||'').split('; ').filter(p=>p&&!p.startsWith(name+'=')),pair].join('; '));}
  const type=response.headers.get('content-type')||'';const data=type.includes('application/json')?await response.json():await response.arrayBuffer();
  return {status:response.status,data,headers:response.headers};
}
function ok(condition,message){assert.ok(condition,message);tests++;}
function eq(a,b,message){assert.deepEqual(a,b,message);tests++;}
const session=await call('/api/session');eq(session.status,200);eq(session.data.user.credits,500);eq(session.data.user.kind,'guest');ok(session.headers.get('set-cookie').includes('HttpOnly; Secure; SameSite=Lax'),'Secure guest cookie');const guestId=session.data.user.id;
eq((await call('/api/session')).data.user.id,guestId,'Guest session stable');
eq((await call('/api/models')).data.models.length,3);eq((await call('/api/datasets')).data.datasets.length,9);
eq((await call('/api/synthesis',{method:'POST',omitOrigin:true,body:{}})).status,403,'CSRF origin mandatory');
eq((await call('/api/synthesis',{method:'POST',originOverride:'https://evil.example',body:{}})).status,403,'Cross-origin rejected');
for(const route of ['/api/datasets/import','/api/datasets/upload?name=x.nii','/api/admin/key','/api/red-room/unlock','/api/vault'])eq((await call(route,{method:'POST',body:{}})).status,401,route+' rejects guest');
const request={modelId:'pgan-t1-t2',datasetId:'demo-001-t1',requestKey:'test-synthesis-00001'};
const result=await call('/api/synthesis',{method:'POST',body:request});eq(result.status,201);eq(result.data.credits,490);eq(result.data.job.mode,'precomputed-demo');eq(result.data.job.viewerUrl,'/viewer.html?sample=demo-001&modality=T2');
const replay=await call('/api/synthesis',{method:'POST',body:request});eq(replay.data.credits,490,'No second charge');eq(replay.data.job.id,result.data.job.id);
eq((await call('/api/synthesis',{method:'POST',body:{...request,modelId:'pgan-t1-flair'}})).status,409);
eq((await call('/api/synthesis',{method:'POST',body:{...request,datasetId:'uploaded-private',requestKey:'test-no-inference-001'}})).status,409);
eq((await call('/api/synthesis',{method:'POST',body:{...request,datasetId:'demo-001-t2',requestKey:'test-wrong-input-001'}})).status,400);
eq((await call('/api/session')).data.user.credits,490);
eq((await call('/api/jobs',{who:'guest2'})).data.jobs.length,0,'Jobs isolated');
const parallel=await Promise.all(Array.from({length:5},()=>call('/api/synthesis',{method:'POST',body:{...request,requestKey:'test-concurrent-00001'}})));
ok(parallel.every(r=>r.status===201||r.status===200));eq((await call('/api/session')).data.user.credits,480,'Concurrent repeated request charged once');eq((await call('/api/jobs')).data.jobs.length,2);
const alice=await call('/api/session',{who:'alice'}),bob=await call('/api/session',{who:'bob'}),owner=await call('/api/session',{who:'owner'});
eq(alice.data.user.kind,'account');eq(alice.data.user.isOwner,false);eq(owner.data.user.isOwner,true);
eq((await call('/api/admin/projects',{who:'alice'})).status,403);eq((await call('/api/admin/projects',{who:'owner'})).status,403,'Owner still needs key');
eq((await call('/api/admin/key',{who:'owner',method:'POST',body:{password:'short'}})).status,400);
const adminPassword='Test-only-admin-password-2026';
const setup=await call('/api/admin/key',{who:'owner',method:'POST',body:{password:adminPassword}});eq(setup.status,200);eq(setup.data.adminUnlocked,true);
const savedHash=db.prepare("SELECT value FROM platform_settings WHERE key='admin_password'").get().value;ok(!savedHash.includes(adminPassword));eq(await __test.passwordMatches(adminPassword,savedHash),true);eq(await __test.passwordMatches('wrong',savedHash),false);
const projects=await call('/api/admin/projects',{who:'owner'});eq(projects.status,200);eq(projects.data.projects.length,3);ok(projects.data.projects.every(p=>p.private&&p.status==='draft'));eq(projects.data.projects.find(p=>p.kind==='opportunity').budgetUsd,2000);
const aliceJar=jars.get('alice');jars.set('alice',jars.get('owner'));eq((await call('/api/admin/projects',{who:'alice'})).status,403,'Owner cookie cannot authorize another account');jars.set('alice',aliceJar||'');
eq((await call('/api/admin/key',{who:'owner',method:'POST',body:{password:adminPassword}})).status,409,'Key cannot be overwritten');
eq((await call('/api/admin/projects/genetic-mutation',{who:'owner',method:'PATCH',body:{title:'Private MRI mutation plan'}})).status,200);
eq((await call('/api/red-room',{who:'alice'})).status,403);
eq((await call('/api/red-room/unlock',{who:'alice',method:'POST',body:{memberId:alice.data.user.memberId,password:'anything'}})).status,409);
const roomPassword='Test-only-room-password-2026';eq((await call('/api/admin/settings',{who:'owner',method:'POST',body:{redRoomPassword:roomPassword}})).status,200);
eq((await call('/api/red-room/unlock',{who:'alice',method:'POST',body:{memberId:bob.data.user.memberId,password:roomPassword}})).status,403,'Membership ID must match current account');
eq((await call('/api/red-room/unlock',{who:'alice',method:'POST',body:{memberId:alice.data.user.memberId,password:roomPassword}})).status,200);
eq((await call('/api/red-room',{who:'alice'})).status,200);jars.set('bob',jars.get('alice'));eq((await call('/api/red-room',{who:'bob'})).status,403,'Room session bound to identity');jars.delete('bob');
const previousRoomSession=db.prepare("SELECT * FROM platform_sessions WHERE user_id=? AND kind LIKE 'room:%'").get(alice.data.user.id);
eq((await call('/api/admin/settings',{who:'owner',method:'POST',body:{redRoomPassword:roomPassword+'-rotated'}})).status,200);eq((await call('/api/red-room',{who:'alice'})).status,403,'Room password rotation revokes sessions');
db.prepare('INSERT INTO platform_sessions (token_hash,user_id,kind,expires_at,created_at) VALUES (?,?,?,?,?)').run(previousRoomSession.token_hash,previousRoomSession.user_id,previousRoomSession.kind,previousRoomSession.expires_at,previousRoomSession.created_at);
eq((await call('/api/red-room',{who:'alice'})).status,403,'A delayed unlock with a retired password cannot restore room access');
const vault=await call('/api/vault',{who:'alice'});eq(vault.data.puzzle.choices,['Axial','Coronal','Sagittal']);
eq((await call('/api/vault',{who:'alice',method:'POST',body:{answer:'Axial'}})).status,400);
const prize=await call('/api/vault',{who:'alice',method:'POST',body:{answer:'Sagittal'}});eq(prize.data.awardedCredits,100);eq(prize.data.credits,600);
const repeatPrize=await call('/api/vault',{who:'alice',method:'POST',body:{answer:'Sagittal'}});eq(repeatPrize.data.awardedCredits,0);eq(repeatPrize.data.credits,600);
const file=fs.readFileSync(new URL('../public/data/demo-001-t1.nii.gz',import.meta.url));
const upload=await call('/api/datasets/upload?name=sample.nii.gz',{who:'alice',method:'POST',raw:file});eq(upload.status,201);ok(upload.data.dataset.private);const privateId=upload.data.dataset.id;
const downloaded=await call('/api/datasets/'+privateId+'/download',{who:'alice'});eq(downloaded.status,200);eq(downloaded.data.byteLength,file.length);eq(downloaded.headers.get('content-disposition'),'attachment; filename="sample.nii.gz"');
eq((await call('/api/datasets/'+privateId+'/download',{who:'bob'})).status,404,'Cross-user file fetch denied');ok(!(await call('/api/datasets',{who:'bob'})).data.datasets.some(d=>d.id===privateId));
eq((await call('/api/datasets/upload?name=bad.nii',{who:'bob',method:'POST',raw:new Uint8Array([1,2,3,4])})).status,400);
eq((await call('/api/datasets/upload?name=..%2Fbad.nii',{who:'bob',method:'POST',raw:file})).status,400);
eq((await call('/api/datasets/upload?name=large.nii',{who:'bob',method:'POST',raw:new Uint8Array(4),headers:{'content-length':String(33*1024*1024)}})).status,413,'32MB file cap checked');
const saved=await call('/api/datasets/import',{who:'bob',method:'POST',body:{sampleId:'demo-001-t1'}});eq(saved.status,201);
const before=(await call('/api/session',{who:'bob'})).data.storage.usedBytes;
eq((await call('/api/datasets/import',{who:'bob',method:'POST',body:{sampleId:'demo-001-t1'}})).data.alreadySaved,true);eq((await call('/api/session',{who:'bob'})).data.storage.usedBytes,before);
const config=await call('/api/federated/config',{who:'alice',method:'POST',body:{datasetIds:['demo-001-t1',privateId],aggregation:'FedAvg',clients:4,rounds:20,localEpochs:1}});eq(config.status,201);eq(config.data.config.mode,'configuration-only');ok(config.data.config.yaml.includes('No training or model inference'));
eq((await call('/api/federated/config',{who:'bob',method:'POST',body:{datasetIds:[privateId],aggregation:'FedAvg',clients:4,rounds:20,localEpochs:1}})).status,404,'Federated config cannot reference other account files');
eq((await call('/api/federated/config',{who:'alice',method:'POST',body:{datasetIds:['demo-001-t1'],aggregation:'x\nsecret: injected',clients:4,rounds:20,localEpochs:1}})).status,400);
eq((await call('/api/federated/config',{who:'bob'})).data.configs.length,0);
const priorUsage=db.prepare('SELECT storage_bytes FROM platform_users WHERE id=?').get(alice.data.user.id).storage_bytes;
db.prepare('UPDATE platform_users SET storage_bytes=? WHERE id=?').run(__test.USER_QUOTA,alice.data.user.id);
eq((await call('/api/datasets/upload?name=overquota.nii.gz',{who:'alice',method:'POST',raw:file})).status,413,'Account quota enforced');
db.prepare('UPDATE platform_users SET storage_bytes=? WHERE id=?').run(priorUsage,alice.data.user.id);
const globalBefore=db.prepare("SELECT used_bytes FROM platform_storage_usage WHERE key='total'").get().used_bytes;
db.prepare("UPDATE platform_storage_usage SET used_bytes=? WHERE key='total'").run(__test.GLOBAL_QUOTA);
eq((await call('/api/datasets/upload?name=globalquota.nii.gz',{who:'alice',method:'POST',raw:file})).status,413,'Global quota enforced');
db.prepare("UPDATE platform_storage_usage SET used_bytes=? WHERE key='total'").run(globalBefore);
BUCKET.fail=true;eq((await call('/api/datasets/upload?name=failed.nii.gz',{who:'alice',method:'POST',raw:file})).status,500);BUCKET.fail=false;
eq(db.prepare('SELECT storage_bytes FROM platform_users WHERE id=?').get(alice.data.user.id).storage_bytes,priorUsage,'Failed R2 write returns reserved quota');
eq(db.prepare("SELECT used_bytes FROM platform_storage_usage WHERE key='total'").get().used_bytes,globalBefore);
for(let i=0;i<5;i++)eq((await call('/api/admin/login',{who:'owner',method:'POST',body:{password:'bad-password'}})).status,403);
eq((await call('/api/admin/login',{who:'owner',method:'POST',body:{password:adminPassword}})).status,429,'Admin key attempts rate limited');
eq((await call('/api/session',{who:'alice'})).headers.get('cache-control'),'private, no-store');
eq((await call('/api/credits/mint',{method:'POST',omitOrigin:true})).status,403,'Credit refills require same origin');
const initialMintBalance=(await call('/api/session')).data.user.credits;
const minted=await call('/api/credits/mint',{method:'POST'});eq(minted.status,200);eq(minted.data.awardedCredits,100);eq(minted.data.credits,initialMintBalance+100);eq(minted.data.demo,true);
const mintedTogether=await Promise.all(Array.from({length:4},()=>call('/api/credits/mint',{method:'POST'})));
ok(mintedTogether.every(r=>r.status===200&&r.data.awardedCredits===100),'Concurrent grants each report their own award');
eq((await call('/api/session')).data.user.credits,initialMintBalance+500,'Concurrent credit grants do not lose increments');
eq((await call('/api/credits/mint',{method:'POST'})).status,429,'Only five credit refills per hour');
db.prepare('UPDATE platform_users SET credits=? WHERE id=?').run(__test.DEMO_CREDIT_CAP-40,bob.data.user.id);
const cappedMint=await call('/api/credits/mint',{who:'bob',method:'POST'});eq(cappedMint.data.awardedCredits,40);eq(cappedMint.data.credits,__test.DEMO_CREDIT_CAP);
const atCap=await call('/api/credits/mint',{who:'bob',method:'POST'});eq(atCap.data.awardedCredits,0);eq(atCap.data.credits,__test.DEMO_CREDIT_CAP,'Balance never exceeds refill cap');
db.prepare('UPDATE platform_users SET credits=5 WHERE id=?').run(bob.data.user.id);
eq((await call('/api/synthesis',{who:'bob',method:'POST',body:{...request,requestKey:'insufficient-credit-test'}})).status,402,'Insufficient credits do not create a job');
eq((await call('/api/session',{who:'bob'})).data.user.credits,5);eq((await call('/api/jobs',{who:'bob'})).data.jobs.length,0);
console.log(JSON.stringify({passed:tests,status:'All security and API integration checks passed',scope:['session isolation','CSRF','owner/key authorization','room membership and revocation','private R2 authorization','quota rollback','atomic/idempotent demo charges','atomic capped credit refills','one-time vault grants','configuration-only federated plans','rate limits']}));
