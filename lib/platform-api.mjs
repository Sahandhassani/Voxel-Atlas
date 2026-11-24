/** Voxel Atlas educational platform API. No medical inference or monetary credits. */
import { ChatError, routeChat } from './central-chat.mjs';
const MiB=1024*1024, MAX_FILE_BYTES=32*MiB, USER_QUOTA=64*MiB, GLOBAL_QUOTA=1024*MiB;
const DEMO_CREDIT_GRANT=100, DEMO_CREDIT_CAP=10000;
const COOKIE={guest:'__Host-va_guest',admin:'__Host-va_admin',room:'__Host-va_room'};
const enc=new TextEncoder();
const MODELS=[
  {id:'pgan-t1-t2',name:'pGAN · T1 → T2',title:'T1 to T2',source:'T1',target:'T2',description:'Illustrative paired-volume demonstration. No trained weights or inference service are connected.',costCredits:10,mode:'precomputed-demo',available:true},
  {id:'pgan-t1-flair',name:'pGAN · T1 → FLAIR',title:'T1 to FLAIR',source:'T1',target:'FLAIR',description:'Illustrative paired-volume demonstration. No trained weights or inference service are connected.',costCredits:10,mode:'precomputed-demo',available:true},
  {id:'pgan-t2-t1',name:'pGAN · T2 → T1',title:'T2 to T1',source:'T2',target:'T1',description:'Illustrative paired-volume demonstration. No trained weights or inference service are connected.',costCredits:10,mode:'precomputed-demo',available:true},
];
const BUILTINS=[{id:'mni152',name:'MNI152 anatomical reference',label:'MNI152 template',modality:'T1',studyId:'mni152',source:'Public anatomical atlas; not an individual patient',kind:'reference',url:'/data/mni152.nii.gz',downloadUrl:'/data/mni152.nii.gz',dimensions:[207,256,215],spacing:[.737463,.737463,.737463],viewerUrl:'/viewer.html',synthetic:false},...[1,2].flatMap(n=>['T1','T1ce','T2','FLAIR'].map(modality=>({id:`demo-00${n}-${modality.toLowerCase()}`,name:`Synthetic study 00${n} · ${modality}`,label:`Synthetic study 00${n} · ${modality}`,modality,studyId:`demo-00${n}`,source:'Invented geometric phantom; not real patient data',kind:'synthetic',url:`/data/demo-00${n}-${modality.toLowerCase()}.nii.gz`,downloadUrl:`/data/demo-00${n}-${modality.toLowerCase()}.nii.gz`,dimensions:[128,128,128],spacing:[1.5,1.5,1.5],viewerUrl:`/viewer.html?sample=demo-00${n}&modality=${encodeURIComponent(modality)}`,synthetic:true})))];
const PUZZLE={id:'planes-1',question:'Which anatomical plane separates the left and right sides?',choices:['Axial','Coronal','Sagittal']};
class ApiError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code;}}
const fail=(status,code,message)=>{throw new ApiError(status,code,message);};
const now=()=>Date.now();
const clean=(v,max=200)=>typeof v==='string'?v.trim().slice(0,max):'';
const uid=prefix=>`${prefix}_${crypto.randomUUID().replaceAll('-','')}`;
const b64=b=>btoa(String.fromCharCode(...b));
const from64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function hash(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(value))),x=>x.toString(16).padStart(2,'0')).join('');}
const randomToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
function json(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',...headers}});}
const stmt=(env,sql,args=[])=>env.DB.prepare(sql).bind(...args);
const first=(env,sql,args=[])=>stmt(env,sql,args).first();
async function rows(env,sql,args=[]){const r=await stmt(env,sql,args).all();return r.results||[];}
const run=(env,sql,args=[])=>stmt(env,sql,args).run();
function cookieValue(request,name){const parts=(request.headers.get('cookie')||'').split(';');for(const part of parts){const i=part.indexOf('=');if(part.slice(0,i).trim()===name)return part.slice(i+1).trim();}return null;}
function setCookie(ctx,name,value,seconds){ctx.cookies.push(`${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${seconds}`);}
function checkOrigin(request){if(!['GET','HEAD','OPTIONS'].includes(request.method)){const origin=request.headers.get('origin');if(origin!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')fail(403,'CSRF_REJECTED','This action must be sent from the same website.');}}
async function boundedBody(request,max){const declared=Number(request.headers.get('content-length')||0);if(declared>max)fail(413,'BODY_TOO_LARGE','The request exceeds the allowed size.');if(!request.body)return new Uint8Array();const reader=request.body.getReader(),chunks=[];let count=0;try{while(true){const r=await reader.read();if(r.done)break;count+=r.value.length;if(count>max){await reader.cancel();fail(413,'BODY_TOO_LARGE','The request exceeds the allowed size.');}chunks.push(r.value);}}finally{reader.releaseLock();}const out=new Uint8Array(count);let offset=0;for(const c of chunks){out.set(c,offset);offset+=c.length;}return out;}
async function bodyJson(request,max=16384){if(!(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))fail(415,'JSON_REQUIRED','Send a JSON request body.');try{const bytes=await boundedBody(request,max);const value=JSON.parse(new TextDecoder().decode(bytes));if(!value||typeof value!=='object'||Array.isArray(value))fail(400,'INVALID_JSON','Expected a JSON object.');return value;}catch(e){if(e instanceof ApiError)throw e;fail(400,'INVALID_JSON','The JSON body could not be read.');}}
function ipKey(request){return request.headers.get('cf-connecting-ip')||'local-preview';}
async function limit(env,scope,max,seconds){const key=await hash(scope),at=now(),until=at+seconds*1000;const row=await first(env,'INSERT INTO platform_rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<=? THEN 1 ELSE count+1 END, expires_at=CASE WHEN expires_at<=? THEN ? ELSE expires_at END RETURNING count,expires_at',[key,until,at,at,until]);if(row.count>max)fail(429,'RATE_LIMITED','Too many attempts. Please try again later.');}
async function setting(env,key){return (await first(env,'SELECT value FROM platform_settings WHERE key=?',[key]))?.value||null;}
async function saveSetting(env,key,value){await run(env,'INSERT INTO platform_settings (key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at',[key,value,now()]);}

async function createSession(ctx,userId,kind,seconds,credentialVersion=null){const token=randomToken(),sessionKind=credentialVersion?`${kind}:${await hash(credentialVersion)}`:kind;await run(ctx.env,'INSERT INTO platform_sessions (token_hash,user_id,kind,expires_at,created_at) VALUES (?,?,?,?,?)',[await hash(token),userId,sessionKind,now()+seconds*1000,now()]);setCookie(ctx,COOKIE[kind],token,seconds);return token;}
async function validSession(ctx,kind,userId){
  const token=cookieValue(ctx.request,COOKIE[kind]);if(!token||!/^[a-f0-9]{64}$/.test(token))return false;
  let sessionKind=kind;
  if(kind==='room'){
    const currentPassword=await setting(ctx.env,'red_room_password');if(!currentPassword)return false;
    // A room unlock started before password rotation must not recreate access
    // with the retired password after the owner has revoked room sessions.
    sessionKind=`room:${await hash(currentPassword)}`;
  }
  return !!await first(ctx.env,'SELECT token_hash FROM platform_sessions WHERE token_hash=? AND user_id=? AND kind=? AND expires_at>?',[await hash(token),userId,sessionKind,now()]);
}
async function identity(ctx){
  const {request,env}=ctx,platformId=request.headers.get('oai-authenticated-user-id'),email=(request.headers.get('oai-authenticated-user-email')||'').trim().toLowerCase();
  let user;
  if(platformId){
    const id='acct_'+(await hash(platformId)).slice(0,40);let name=request.headers.get('oai-authenticated-user-full-name')||'';
    if(request.headers.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8'){try{name=decodeURIComponent(name);}catch{name='';}}
    name=clean(name,100)||clean(email.split('@')[0],100)||'Member';
    const memberId='VX-'+(await hash('member:'+platformId)).slice(0,12).toUpperCase();
    await run(env,'INSERT OR IGNORE INTO platform_users (id,kind,name,member_id,credits,storage_bytes,created_at) VALUES (?,\'account\',?,?,500,0,?)',[id,name,memberId,now()]);
    user=await first(env,'SELECT * FROM platform_users WHERE id=?',[id]);
    user.isOwner=(env.ADMIN_EMAILS||'').split(/[\s,;]+/).filter(Boolean).map(v=>v.toLowerCase()).includes(email)&&!!email;
  }else{
    const token=cookieValue(request,COOKIE.guest);
    if(token&&/^[a-f0-9]{64}$/.test(token))user=await first(env,'SELECT u.* FROM platform_users u JOIN platform_sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.kind=\'guest\' AND s.expires_at>? AND u.kind=\'guest\'',[await hash(token),now()]);
    if(!user){await limit(env,'guest:'+ipKey(request),30,3600);const id=uid('guest'),memberId='VX-'+crypto.randomUUID().replaceAll('-','').slice(0,12).toUpperCase();await run(env,'INSERT INTO platform_users (id,kind,name,member_id,credits,storage_bytes,created_at) VALUES (?,\'guest\',\'Guest explorer\',?,500,0,?)',[id,memberId,now()]);await createSession(ctx,id,'guest',30*24*3600);user=await first(env,'SELECT * FROM platform_users WHERE id=?',[id]);}
    user.isOwner=false;
  }
  user.adminUnlocked=user.isOwner&&await validSession(ctx,'admin',user.id);ctx.user=user;return user;
}
function publicUser(u){return{id:u.id,name:u.name,kind:u.kind,memberId:u.member_id,credits:u.credits,isOwner:!!u.isOwner,adminUnlocked:!!u.adminUnlocked};}
function requireAccount(ctx){if(ctx.user.kind!=='account')fail(401,'AUTH_REQUIRED','Sign in with ChatGPT to use this private feature.');}
function requireOwner(ctx){requireAccount(ctx);if(!ctx.user.isOwner)fail(403,'OWNER_REQUIRED','This area is available only to the configured site owner.');}
function requireAdmin(ctx){requireOwner(ctx);if(!ctx.user.adminUnlocked)fail(403,'ADMIN_LOCKED','Unlock the owner workspace with your admin key first.');}
function serialJob(j){return{id:j.id,modelId:j.model_id,datasetId:j.dataset_id,status:j.status,mode:j.mode,costCredits:j.cost_credits,outputUrl:j.output_url,viewerUrl:j.viewer_url,createdAt:new Date(j.created_at).toISOString(),demo:true,notice:'Precomputed illustrative paired volume. No model inference was performed.'};}
function serialDataset(d){const sample=BUILTINS.find(b=>b.id===d.sample_id);return{id:d.id,name:d.name,label:d.name,kind:d.kind,modality:d.modality,studyId:sample?.studyId||d.id,source:'Private saved dataset',sampleId:d.sample_id,sizeBytes:d.size_bytes,dimensions:sample?.dimensions||null,spacing:sample?.spacing||null,downloadUrl:`/api/datasets/${d.id}/download`,url:`/api/datasets/${d.id}/download`,viewerUrl:`/viewer.html?datasetId=${encodeURIComponent(d.id)}`,createdAt:new Date(d.created_at).toISOString(),private:true,synthetic:!!sample?.synthetic};}

async function passwordHash(password){const salt=crypto.getRandomValues(new Uint8Array(16)),iterations=100000;const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);const out=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations},key,256));return JSON.stringify({algorithm:'PBKDF2-SHA256',iterations,salt:b64(salt),hash:b64(out)});}
async function passwordMatches(password,stored){try{const p=JSON.parse(stored);if(p.algorithm!=='PBKDF2-SHA256'||p.iterations!==100000)return false;const salt=from64(p.salt),expected=from64(p.hash);const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);const actual=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:p.iterations},key,256));let diff=actual.length^expected.length;for(let i=0;i<actual.length;i++)diff|=actual[i]^(expected[i]||0);return diff===0;}catch{return false;}}
function validatePassword(p){if(typeof p!=='string'||p.length<12||p.length>128)fail(400,'INVALID_PASSWORD','Use a password with 12 to 128 characters.');return p;}
async function seedProjects(env){const at=now();const drafts=[['genetic-mutation','Genetic mutation research','Private future work: MRI-based molecular and mutation research. Scope, datasets, validation and collaborators remain to be defined.','research',null],['eeg-research','EEG research','Private future work: signal processing and EEG learning experiments. No trained service is connected.','research',null],['opportunity-draft','Proposed research opportunity','Private planning draft only. A possible USD 2,000 opportunity requires owner review and a separate agreement. This is not a public payout, prize, or payment commitment.','opportunity',2000]];await env.DB.batch(drafts.map(([id,title,description,kind,budget])=>stmt(env,'INSERT OR IGNORE INTO platform_admin_projects (id,title,description,kind,status,budget_usd,created_at,updated_at) VALUES (?,?,?,?,\'draft\',?,?,?)',[id,title,description,kind,budget,at,at])));}
function projectRow(p){return{id:p.id,title:p.title,description:p.description,kind:p.kind,status:p.status,budgetUsd:p.budget_usd,createdAt:new Date(p.created_at).toISOString(),updatedAt:new Date(p.updated_at).toISOString(),private:true};}

async function reserveStorage(env,userId,size){
  await run(env,'INSERT OR IGNORE INTO platform_storage_usage (key,used_bytes) VALUES (\'total\',0)');
  const result=await env.DB.batch([
    stmt(env,'UPDATE platform_users SET storage_bytes=storage_bytes+? WHERE id=? AND storage_bytes+?<=? AND (SELECT used_bytes FROM platform_storage_usage WHERE key=\'total\')+?<=?',[size,userId,size,USER_QUOTA,size,GLOBAL_QUOTA]),
    stmt(env,'UPDATE platform_storage_usage SET used_bytes=used_bytes+? WHERE key=\'total\' AND changes()=1',[size]),
  ]);
  if(!(result[0]?.meta?.changes>0))fail(413,'STORAGE_QUOTA','The 64 MB account quota or platform demonstration storage limit has been reached.');
}
async function releaseStorage(env,userId,size){await env.DB.batch([stmt(env,'UPDATE platform_users SET storage_bytes=MAX(0,storage_bytes-?) WHERE id=?',[size,userId]),stmt(env,'UPDATE platform_storage_usage SET used_bytes=MAX(0,used_bytes-?) WHERE key=\'total\'',[size])]);}
async function saveDataset(ctx,{name,bytes,kind,modality='Unknown',sampleId=null}){
  if(!ctx.env.BUCKET)fail(503,'STORAGE_UNAVAILABLE','Private file storage is not configured.');
  if(!bytes.length||bytes.length>MAX_FILE_BYTES)fail(413,'FILE_SIZE','Choose a nonempty NIfTI file no larger than 32 MB. Each account can store 64 MB total.');
  const id=uid('dataset'),objectKey=`private/${ctx.user.id}/${id}`;await reserveStorage(ctx.env,ctx.user.id,bytes.length);
  try{await ctx.env.BUCKET.put(objectKey,bytes,{httpMetadata:{contentType:'application/octet-stream'},customMetadata:{ownerId:ctx.user.id}});await run(ctx.env,'INSERT INTO platform_datasets (id,owner_id,name,kind,modality,sample_id,object_key,size_bytes,created_at) VALUES (?,?,?,?,?,?,?,?,?)',[id,ctx.user.id,name,kind,modality,sampleId,objectKey,bytes.length,now()]);}
  catch(e){try{await ctx.env.BUCKET.delete(objectKey);}finally{await releaseStorage(ctx.env,ctx.user.id,bytes.length);}throw e;}
  return serialDataset(await first(ctx.env,'SELECT * FROM platform_datasets WHERE id=?',[id]));
}
async function trustedSample(ctx,sample){
  const url=new URL(sample.url,ctx.request.url);let response;
  if(ctx.env.ASSETS?.fetch)response=await ctx.env.ASSETS.fetch(new Request(url));else response=await fetch(url,{redirect:'error'});
  if(!response.ok)fail(503,'SAMPLE_UNAVAILABLE','The demonstration sample could not be read.');
  return boundedBody(response,MAX_FILE_BYTES);
}

async function route(ctx){
  const {request,env}=ctx,url=new URL(request.url),path=url.pathname.replace(/\/+$/,''),method=request.method,u=ctx.user;
  if(path.startsWith('/api/chat/'))return routeChat(ctx);
  if(path==='/api/session'&&method==='GET')return json({user:publicUser(u),adminKeyConfigured:!!await setting(env,'admin_password'),demo:true,storage:{quotaBytes:USER_QUOTA,maxFileBytes:MAX_FILE_BYTES,usedBytes:u.storage_bytes},notice:'Demo credits have no monetary value.'});
  if(path==='/api/credits/mint'&&method==='POST'){
    await limit(env,'credit-mint:'+u.id,5,3600);
    await limit(env,'credit-mint-ip:'+ipKey(request),25,3600);
    // D1 batches execute transactionally, so concurrent refills cannot lose an
    // increment or report another request's grant as their own.
    const result=await env.DB.batch([
      stmt(env,'SELECT credits FROM platform_users WHERE id=?',[u.id]),
      stmt(env,'UPDATE platform_users SET credits=MIN(?,credits+?) WHERE id=? AND credits<?',[DEMO_CREDIT_CAP,DEMO_CREDIT_GRANT,u.id,DEMO_CREDIT_CAP]),
      stmt(env,'SELECT credits FROM platform_users WHERE id=?',[u.id]),
    ]);
    const before=result[0].results[0].credits,credits=result[2].results[0].credits;
    const awardedCredits=credits-before;
    return json({credits,awardedCredits,capCredits:DEMO_CREDIT_CAP,demo:true,notice:awardedCredits?'Imaginary demo credits added. They have no monetary value.':'Your demo-credit balance is at its refill limit. Use some credits before generating more.'});
  }
  if(['/api/models','/api/catalog/models'].includes(path)&&method==='GET')return json({models:MODELS,demo:true});
  if(path==='/api/datasets'&&method==='GET'){const privateRows=u.kind==='account'?await rows(env,'SELECT * FROM platform_datasets WHERE owner_id=? ORDER BY created_at DESC LIMIT 100',[u.id]):[];return json({datasets:[...BUILTINS,...privateRows.map(serialDataset)],storage:{quotaBytes:USER_QUOTA,maxFileBytes:MAX_FILE_BYTES,usedBytes:u.storage_bytes},demo:true});}
  if(path==='/api/datasets/import'&&method==='POST'){
    requireAccount(ctx);await limit(env,'import:'+u.id,8,3600);const input=await bodyJson(request);const sample=BUILTINS.find(d=>d.id===input.sampleId);if(!sample)fail(400,'UNKNOWN_SAMPLE','Choose a sample from the dataset catalog.');
    const existing=await first(env,'SELECT * FROM platform_datasets WHERE owner_id=? AND sample_id=? LIMIT 1',[u.id,sample.id]);if(existing)return json({dataset:serialDataset(existing),alreadySaved:true});
    const bytes=await trustedSample(ctx,sample);return json({dataset:await saveDataset(ctx,{name:sample.name,bytes,kind:'saved-sample',modality:sample.modality,sampleId:sample.id})},201);
  }
  if(path==='/api/datasets/upload'&&method==='POST'){
    requireAccount(ctx);await limit(env,'upload:'+u.id,6,3600);await limit(env,'upload-ip:'+ipKey(request),20,3600);
    const rawName=url.searchParams.get('name')||'';if(!rawName||rawName.length>180||!/^[-\w .()+\u0080-\uffff]+\.nii(\.gz)?$/i.test(rawName)||rawName.includes('..')||/[\r\n/\\]/.test(rawName))fail(400,'INVALID_FILENAME','Choose a NIfTI file with a simple .nii or .nii.gz filename.');
    const bytes=await boundedBody(request,MAX_FILE_BYTES);if(bytes.length<4)fail(400,'INVALID_NIFTI','The file is too short to be a NIfTI image.');
    if(/\.gz$/i.test(rawName)){if(bytes[0]!==31||bytes[1]!==139)fail(400,'INVALID_NIFTI','The .nii.gz file is not a gzip-compressed image.');}
    else{const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);const headerSize=[348,540].includes(view.getInt32(0,true))?view.getInt32(0,true):view.getInt32(0,false);if(![348,540].includes(headerSize)||bytes.length<headerSize)fail(400,'INVALID_NIFTI','The file does not have a complete NIfTI header.');}
    return json({dataset:await saveDataset(ctx,{name:rawName,bytes,kind:'upload'}),notice:'Saved privately. Real model inference is not connected.'},201);
  }
  const download=path.match(/^\/api\/datasets\/([a-zA-Z0-9_-]+)\/download$/);
  if(download&&method==='GET'){
    requireAccount(ctx);const data=await first(env,'SELECT * FROM platform_datasets WHERE id=? AND owner_id=?',[download[1],u.id]);if(!data)fail(404,'NOT_FOUND','Dataset not found.');const object=await env.BUCKET.get(data.object_key);if(!object)fail(404,'NOT_FOUND','The saved file is unavailable.');
    const safeName=data.name.replace(/[^a-zA-Z0-9_.-]/g,'_'),filename=/\.nii(\.gz)?$/i.test(safeName)?safeName:safeName+'.nii.gz';
    return new Response(object.body,{headers:{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="${filename}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Length':String(object.size)}});
  }
  if(path==='/api/synthesis'&&method==='POST'){
    await limit(env,'synthesis:'+u.id,30,60);const input=await bodyJson(request);const model=MODELS.find(m=>m.id===input.modelId);if(!model)fail(400,'UNKNOWN_MODEL','Choose a model from the demonstration catalog.');
    const key=clean(input.requestKey,100);if(!/^[a-zA-Z0-9_-]{16,100}$/.test(key))fail(400,'IDEMPOTENCY_KEY_REQUIRED','Provide a unique requestKey of 16 to 100 letters, digits, underscores, or hyphens.');
    const prior=await first(env,'SELECT * FROM platform_jobs WHERE owner_id=? AND request_key=?',[u.id,key]);if(prior){if(prior.model_id!==model.id||prior.dataset_id!==input.datasetId)fail(409,'REQUEST_KEY_REUSED','This request key was already used for a different selection.');const fresh=await first(env,'SELECT credits FROM platform_users WHERE id=?',[u.id]);return json({job:serialJob(prior),credits:fresh.credits,demo:true,replayed:true});}
    const sample=BUILTINS.find(d=>d.id===input.datasetId);
    if(!sample||!sample.synthetic)fail(409,'INFERENCE_NOT_CONNECTED','Only built-in synthetic practice volumes can run this precomputed demonstration. Real inference is not connected; no credits were charged.');
    if(sample.modality!==model.source)fail(400,'MODALITY_MISMATCH',`This model demonstration expects ${model.source} input. No credits were charged.`);
    const output=BUILTINS.find(d=>d.studyId===sample.studyId&&d.modality===model.target),id=uid('job'),at=now();
    await env.DB.batch([
      stmt(env,'UPDATE platform_users SET credits=credits-? WHERE id=? AND credits>=? AND NOT EXISTS (SELECT 1 FROM platform_jobs WHERE owner_id=? AND request_key=?)',[model.costCredits,u.id,model.costCredits,u.id,key]),
      stmt(env,'INSERT INTO platform_jobs (id,owner_id,request_key,model_id,dataset_id,status,mode,cost_credits,output_url,viewer_url,created_at) SELECT ?,?,?,?,?,\'completed\',\'precomputed-demo\',?,?,?,? WHERE changes()=1',[id,u.id,key,model.id,sample.id,model.costCredits,output.url,output.viewerUrl,at]),
    ]);
    const job=await first(env,'SELECT * FROM platform_jobs WHERE owner_id=? AND request_key=?',[u.id,key]);if(!job)fail(402,'INSUFFICIENT_DEMO_CREDITS','You do not have enough demo credits. No job was created.');
    if(job.model_id!==model.id||job.dataset_id!==sample.id)fail(409,'REQUEST_KEY_REUSED','This request key was already used for a different selection.');
    const fresh=await first(env,'SELECT credits FROM platform_users WHERE id=?',[u.id]);return json({job:serialJob(job),credits:fresh.credits,demo:true},201);
  }
  if(path==='/api/jobs'&&method==='GET')return json({jobs:(await rows(env,'SELECT * FROM platform_jobs WHERE owner_id=? ORDER BY created_at DESC LIMIT 100',[u.id])).map(serialJob),demo:true});
  if(path==='/api/federated/config'&&method==='GET')return json({configs:(await rows(env,'SELECT * FROM platform_federated_configs WHERE owner_id=? ORDER BY created_at DESC LIMIT 50',[u.id])).map(c=>({id:c.id,...JSON.parse(c.config_json),yaml:c.yaml,createdAt:new Date(c.created_at).toISOString(),status:'configuration-only'}))});
  if(path==='/api/federated/config'&&method==='POST'){
    await limit(env,'federated:'+u.id,20,3600);const input=await bodyJson(request);if(!Array.isArray(input.datasetIds)||input.datasetIds.length<1||input.datasetIds.length>20||input.datasetIds.some(v=>typeof v!=='string'))fail(400,'DATASETS_REQUIRED','Choose between one and twenty available datasets.');
    const datasetIds=[...new Set(input.datasetIds)];for(const id of datasetIds)if(!BUILTINS.some(d=>d.id===id)&&!await first(env,'SELECT id FROM platform_datasets WHERE id=? AND owner_id=?',[id,u.id]))fail(404,'DATASET_NOT_FOUND','A selected dataset is unavailable.');
    const aggregation=clean(input.aggregation,30);if(!['FedAvg','FedAdam','FedNova','FedProx'].includes(aggregation))fail(400,'INVALID_AGGREGATION','Choose FedAvg, FedAdam, FedNova, or FedProx.');
    const config={datasetIds,aggregation,clients:Number(input.clients),rounds:Number(input.rounds),localEpochs:Number(input.localEpochs),mode:'configuration-only'};
    for(const [key,min,max]of[['clients',2,20],['rounds',1,1000],['localEpochs',1,100]])if(!Number.isInteger(config[key])||config[key]<min||config[key]>max)fail(400,'INVALID_CONFIGURATION',`${key} must be an integer from ${min} to ${max}.`);
    const yaml=`# Voxel Atlas configuration draft\n# No training or model inference is executed by this website.\nmode: configuration-only\naggregation: ${aggregation}\nclients: ${config.clients}\nrounds: ${config.rounds}\nlocal_epochs: ${config.localEpochs}\ndatasets:\n${datasetIds.map(d=>'  - '+JSON.stringify(d)).join('\n')}\n`;
    const id=uid('fed'),at=now();await run(env,'INSERT INTO platform_federated_configs (id,owner_id,config_json,yaml,created_at) VALUES (?,?,?,?,?)',[id,u.id,JSON.stringify(config),yaml,at]);return json({config:{id,...config,yaml,createdAt:new Date(at).toISOString(),status:'configuration-only'},notice:'Configuration saved. No federated training has started.'},201);
  }
  if(path==='/api/admin/key'&&method==='POST'){
    requireOwner(ctx);await limit(env,'admin-setup:'+u.id,5,3600);const input=await bodyJson(request);const password=validatePassword(input.password);if(await setting(env,'admin_password'))fail(409,'KEY_ALREADY_CONFIGURED','An admin key is already configured. Use the unlock form.');
    const stored=await passwordHash(password);const result=await run(env,'INSERT OR IGNORE INTO platform_settings (key,value,updated_at) VALUES (\'admin_password\',?,?)',[stored,now()]);if(!(result.meta?.changes>0))fail(409,'KEY_ALREADY_CONFIGURED','An admin key is already configured.');await seedProjects(env);await createSession(ctx,u.id,'admin',2*3600);return json({configured:true,adminUnlocked:true});
  }
  if(path==='/api/admin/login'&&method==='POST'){
    requireOwner(ctx);await limit(env,'admin-login:'+u.id,5,15*60);await limit(env,'admin-login-ip:'+ipKey(request),12,15*60);const input=await bodyJson(request);const password=typeof input.password==='string'?input.password:'';const stored=await setting(env,'admin_password');if(!stored)fail(409,'KEY_NOT_CONFIGURED','Set up your admin key first.');if(password.length>128||!await passwordMatches(password,stored))fail(403,'INVALID_KEY','The admin key was not accepted.');await createSession(ctx,u.id,'admin',2*3600);return json({adminUnlocked:true});
  }
  if(path==='/api/admin/logout'&&method==='POST'){requireOwner(ctx);const token=cookieValue(request,COOKIE.admin);if(token)await run(env,'DELETE FROM platform_sessions WHERE token_hash=? AND user_id=? AND kind=\'admin\'',[await hash(token),u.id]);setCookie(ctx,COOKIE.admin,'',0);return json({adminUnlocked:false});}
  if(path==='/api/admin/projects'&&method==='GET'){requireAdmin(ctx);await seedProjects(env);return json({projects:(await rows(env,'SELECT * FROM platform_admin_projects ORDER BY created_at,id')).map(projectRow),private:true});}
  if(path==='/api/admin/settings'&&method==='GET'){requireAdmin(ctx);return json({redRoomConfigured:!!await setting(env,'red_room_password')});}
  if(path==='/api/admin/settings'&&method==='POST'){requireAdmin(ctx);await limit(env,'room-setting:'+u.id,5,3600);const input=await bodyJson(request);const password=validatePassword(input.redRoomPassword);await saveSetting(env,'red_room_password',await passwordHash(password));await run(env,'DELETE FROM platform_sessions WHERE kind=\'room\' OR kind LIKE \'room:%\'');return json({redRoomConfigured:true,notice:'Red Room password updated. Existing room sessions were revoked.'});}
  const projectMatch=path.match(/^\/api\/admin\/projects(?:\/([a-zA-Z0-9_-]+))?$/);
  if(projectMatch&&['POST','PATCH'].includes(method)){
    requireAdmin(ctx);await limit(env,'admin-project:'+u.id,30,3600);const input=await bodyJson(request);const old=projectMatch[1]?await first(env,'SELECT * FROM platform_admin_projects WHERE id=?',[projectMatch[1]]):null;if(method==='PATCH'&&!old)fail(404,'PROJECT_NOT_FOUND','Project not found.');
    const title=clean(input.title??old?.title,120),description=clean(input.description??old?.description,3000),kind=clean(input.kind??old?.kind??'research',30),status=clean(input.status??old?.status??'draft',30),budget=input.budgetUsd===undefined?(old?.budget_usd??null):input.budgetUsd;
    if(!title||!description||!['research','opportunity'].includes(kind)||!['draft','planned','active','archived'].includes(status))fail(400,'INVALID_PROJECT','Provide a title, description, valid project kind, and status.');if(budget!==null&&(!Number.isInteger(budget)||budget<0||budget>1000000))fail(400,'INVALID_BUDGET','Budget must be a whole USD amount between zero and one million.');
    const id=old?.id||uid('project'),at=now();if(old)await run(env,'UPDATE platform_admin_projects SET title=?,description=?,kind=?,status=?,budget_usd=?,updated_at=? WHERE id=?',[title,description,kind,status,budget,at,id]);else await run(env,'INSERT INTO platform_admin_projects (id,title,description,kind,status,budget_usd,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)',[id,title,description,kind,status,budget,at,at]);return json({project:projectRow(await first(env,'SELECT * FROM platform_admin_projects WHERE id=?',[id])),private:true},old?200:201);
  }
  if(path==='/api/red-room/unlock'&&method==='POST'){
    requireAccount(ctx);await limit(env,'room-unlock:'+u.id,5,15*60);await limit(env,'room-unlock-ip:'+ipKey(request),15,15*60);const input=await bodyJson(request),stored=await setting(env,'red_room_password');if(!stored)fail(409,'ROOM_NOT_CONFIGURED','The owner has not configured the Red Room yet.');const pass=typeof input.password==='string'?input.password:'';if(clean(input.memberId,30)!==u.member_id||pass.length>128||!await passwordMatches(pass,stored))fail(403,'ROOM_CREDENTIALS_REJECTED','The membership ID or room password was not accepted.');await createSession(ctx,u.id,'room',4*3600,stored);return json({unlocked:true,memberId:u.member_id});
  }
  if(path==='/api/red-room'&&method==='GET'){requireAccount(ctx);if(!await validSession(ctx,'room',u.id))fail(403,'ROOM_LOCKED','Unlock the Red Room with your membership ID and room password.');return json({title:'Red Room',memberId:u.member_id,private:true,message:'Your private member research lounge is open.',sections:[{title:'Research lounge',description:'A reserved place for future member discussions and curated research materials. No external chat service is connected.'},{title:'Membership',description:'Access uses your site membership ID and the owner-managed room password. No government identity document is collected.'}],demo:true});}
  if(path==='/api/vault'&&method==='GET'){requireAccount(ctx);return json({puzzle:PUZZLE,claimed:!!await first(env,'SELECT user_id FROM platform_vault_claims WHERE user_id=?',[u.id]),prizeCredits:100,demo:true,notice:'One educational puzzle reward per account. Demo credits have no cash value.'});}
  if(path==='/api/vault'&&method==='POST'){
    requireAccount(ctx);await limit(env,'vault-attempt:'+u.id,5,15*60);const input=await bodyJson(request);if(clean(input.answer,50).toLowerCase()!=='sagittal')fail(400,'TRY_AGAIN','That answer is not correct. Review the anatomical planes and try again.');
    const results=await env.DB.batch([stmt(env,'INSERT OR IGNORE INTO platform_vault_claims (user_id,claimed_at,prize_credits) VALUES (?,?,100)',[u.id,now()]),stmt(env,'UPDATE platform_users SET credits=credits+100 WHERE id=? AND changes()=1',[u.id])]);const fresh=await first(env,'SELECT credits FROM platform_users WHERE id=?',[u.id]);return json({correct:true,claimed:true,alreadyClaimed:!(results[0]?.meta?.changes>0),awardedCredits:results[0]?.meta?.changes>0?100:0,credits:fresh.credits,demo:true,notice:'Demo credits only. No real money or payout.'});
  }
  fail(404,'NOT_FOUND','This API route was not found.');
}

export async function handleApi(request,env){
  const ctx={request,env,cookies:[],user:null};let response;
  try{if(!env?.DB)fail(503,'DATABASE_UNAVAILABLE','The demonstration database is not configured.');checkOrigin(request);if(request.method==='OPTIONS')return json({error:{code:'METHOD_NOT_ALLOWED',message:'Cross-origin API access is not enabled.'}},405);await identity(ctx);response=await route(ctx);}
  catch(error){if(error instanceof ApiError||error instanceof ChatError)response=json({error:{code:error.code,message:error.message}},error.status);else{console.error('Voxel Atlas API operation failed:',error?.message||'Unknown error');response=json({error:{code:'SERVER_ERROR',message:'The operation could not be completed. Please try again.'}},500);}}
  const headers=new Headers(response.headers);for(const cookie of ctx.cookies)headers.append('Set-Cookie',cookie);headers.set('Cache-Control','private, no-store');headers.set('X-Content-Type-Options','nosniff');return new Response(response.body,{status:response.status,headers});
}

export const __test={MODELS,BUILTINS,PUZZLE,USER_QUOTA,MAX_FILE_BYTES,GLOBAL_QUOTA,DEMO_CREDIT_CAP,preparePassword:passwordHash,passwordMatches};

/** Only call from the authenticated Site MCP endpoint; never accept identity from JSON arguments. */
export async function platformAccountContext(request,env){
  if(!env?.DB)fail(503,'DATABASE_UNAVAILABLE','The conversation database is not configured.');
  if(!request.headers.get('oai-authenticated-user-id'))fail(401,'AUTH_REQUIRED','Sign in to the Voxel Atlas connection with the same account you use on the website.');
  const ctx={request,env,cookies:[],user:null};await identity(ctx);requireAccount(ctx);return ctx;
}
