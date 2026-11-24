import { Niivue } from './vendor/niivue-0.69.0.esm.js';

const $ = (id) => document.getElementById(id);
const icons = {
  grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  cube:'<path d="m12 3 9 5v8l-9 5-9-5V8z M3 8l9 5 9-5 M12 13v8"/>',
  layers:'<path d="m12 3 10 5-10 5L2 8z M2 12l10 5 10-5 M2 16l10 5 10-5"/>',
  brain:'<path d="M12 5C9 1 5 3 5 6c-4 0-4 6-2 7-2 4 1 7 4 6 1 3 5 2 5-1V5Z M12 5c3-4 7-2 7 1 4 0 4 6 2 7 2 4-1 7-4 6-1 3-5 2-5-1 M5 6l2 2 M3 13h3 M19 6l-2 2 M21 13h-3"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  folder:'<path d="M3 5h6l2 3h10v12H3z"/>',
  plus:'<path d="M12 5v14 M5 12h14"/>',
  book:'<path d="M12 5C9 3 5 3 2 4v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Z M12 5v15"/>',
  menu:'<path d="M4 6h16 M4 12h16 M4 18h16"/>',
  upload:'<path d="M12 16V3 m-5 5 5-5 5 5 M4 15v6h16v-6"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4 M12 17h.01"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6 M12 7h.01"/>',
  link:'<path d="m10 14 4-4 M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0 M16 8l1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(1 0) scale(.92 1)"/>',
  reset:'<path d="M3 10a9 9 0 1 1 2 8 M3 4v6h6"/>',
  camera:'<path d="M3 7h4l2-3h6l2 3h4v14H3z"/><circle cx="12" cy="13" r="4"/>',
  expand:'<path d="M3 9V3h6 M15 3h6v6 M21 15v6h-6 M9 21H3v-6"/>',
  rotate:'<path d="M5 6a8 8 0 1 1-1 11 M5 2v5h5"/>',
  crosshair:'<circle cx="12" cy="12" r="6"/><path d="M12 2v6 M12 16v6 M2 12h6 M16 12h6"/>',
  sliders:'<path d="M4 3v5 M4 12v9 M12 3v11 M12 18v3 M20 3v3 M20 10v11 M2 8h4v4H2z M10 14h4v4h-4z M18 6h4v4h-4z"/>',
  chevron:'<path d="m6 9 6 6 6-6"/>',
  close:'<path d="m6 6 12 12 M18 6 6 18"/>',
};
function icon(name) { return `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.cube}</svg>`; }
function paintIcons(root = document) { root.querySelectorAll('[data-icon]').forEach(el => {el.innerHTML = icon(el.dataset.icon);}); }
function esc(value) { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
paintIcons();

const catalog = [
  {id:'reference',name:'Reference anatomy',short:'1 atlas · Brain',icon:'brain',kind:'Public atlas',description:'Explore a real, averaged anatomical brain volume with linked 3D and 2D views.',thumbnail:'assets/mni-preview.png',cases:[{id:'mni152',name:'MNI152 template',title:'The brain, in perspective.',subtitle:'MNI152 anatomical reference',badge:'Atlas template',organ:'Brain',source:'ICBM152 nonlinear atlas, via the NiiVue sample collection',notice:'Public anatomical reference template. This is an averaged atlas, not an individual patient scan.',thumbnail:'assets/mni-thumb.png',modalities:{T1:{url:'data/mni152.nii.gz',min:40,max:80}},sourceUrl:'https://github.com/niivue/niivue-demo-images',sourceTitle:'NiiVue MRI source and attribution'}]},
  {id:'synthetic',name:'Synthetic brain lab',short:'2 studies · 4 series each',icon:'layers',kind:'Synthetic data',description:'Practice with four illustrative MRI contrasts and a simulated region overlay.',thumbnail:'assets/phantom-preview.png',cases:[1,2].map(n=>({id:`demo-00${n}`,name:`Synthetic study 00${n}`,title:`Synthetic study 00${n}`,subtitle:'Brain phantom · multimodal practice',badge:'Synthetic demo',organ:'Brain phantom',source:'Deterministic geometric phantom; no real patient data',notice:'Synthetic demonstration. Invented geometry; no real patient data. Not an anatomically validated model.',thumbnail:`assets/phantom-${n}-thumb.png`,modalities:Object.fromEntries(['T1','T1ce','T2','FLAIR'].map(m=>[m,{url:`data/demo-00${n}-${m.toLowerCase()}.nii.gz`,min:0,max:210}])),overlay:`data/demo-00${n}-region.nii.gz`,sourceUrl:'data/phantom-metadata.json',sourceTitle:'Synthetic phantom metadata'}))},
  {id:'local',name:'Local files',short:'On this device',icon:'folder',kind:'Local volume',description:'MRI files opened from this device, available for this browser session.',cases:[]},
  {id:'saved',name:'Saved library',short:'Private account storage',icon:'folder',kind:'Private volume',description:'MRI volumes saved to your private account.',cases:[]},
];
const modalityNotes = {T1:'T1-weighted reference volume',T1ce:'Illustrative T1 contrast enhancement',T2:'Illustrative T2-weighted contrast',FLAIR:'Illustrative fluid-suppressed contrast',Volume:'Local NIfTI volume'};
const state = {dataset:'reference',caseId:'mni152',modality:'T1',mode:'explore',loading:true,ready:false,request:0,windowMin:0,windowMax:100,overlay:false,localSeq:0};
let nv, queue = Promise.resolve(), toastTimer, renderFrame;
function currentDataset() { return catalog.find(d=>d.id===state.dataset); }
function currentCase() { return currentDataset()?.cases.find(c=>c.id===state.caseId); }
function toast(message) { $('toast').textContent=message; $('toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4800); }
function setSidebar(open) { $('sidebar').classList.toggle('open',open); }
function showDialog(id) { if(!$(id).open) $(id).showModal(); }
function showLoading(title,caption='Preparing the 3D and slice views',error=false) {
  $('loading-cover').hidden=false; $('loading-cover').classList.toggle('error',error); $('loading-title').textContent=title; $('loading-caption').textContent=caption;
}
function setBusy(busy) {
  state.loading=busy;
  document.querySelectorAll('.inspector input,.inspector select,.camera-presets button,.plane-sliders input,#snapshot,#reset-view,#center-crosshair,#study-info-button,#source-link').forEach(el=>el.disabled=busy||!state.ready);
}
function renderNavigation() {
  $('dataset-list').innerHTML=catalog.filter(d=>d.id!=='saved'||d.cases.length).map(d=>`<button class="dataset-button ${state.dataset===d.id?'active':''}" data-dataset="${d.id}" ${state.dataset===d.id?'aria-current="true"':''}><span class="dataset-icon">${icon(d.icon)}</span><span>${esc(d.name)}<small>${d.id==='local'?`${d.cases.length} file${d.cases.length===1?'':'s'} · this session`:d.short}</small></span></button>`).join('');
  document.querySelectorAll('[data-dataset]').forEach(el=>el.addEventListener('click',()=>chooseDataset(el.dataset.dataset)));
  renderCases();
}
function renderCases() {
  const d=currentDataset(); const query=$('case-search').value.trim().toLowerCase();
  const visible=d.cases.filter(c=>`${c.name} ${c.subtitle}`.toLowerCase().includes(query));
  $('case-count').textContent=String(d.cases.length);
  $('case-list-title').textContent=d.id==='reference'?'REFERENCE VOLUMES':d.id==='local'?'LOCAL VOLUMES':d.id==='saved'?'PRIVATE SAVED VOLUMES':'STUDIES';
  $('case-list').innerHTML=visible.length?visible.map(c=>`<button class="case-row ${state.caseId===c.id?'active':''}" data-case="${c.id}" ${state.caseId===c.id?'aria-current="true"':''}>${c.thumbnail?`<img src="${c.thumbnail}" alt=""/>`:`<span class="case-initial">${icon('cube')}</span>`}<span><strong>${esc(c.name)}</strong><small>${d.id==='reference'?'T1 · anatomical atlas':d.id==='local'?'NIfTI · local file':d.id==='saved'?`${esc(Object.keys(c.modalities).join(' · '))} · private saved file`:'T1 · T1ce · T2 · FLAIR'}</small></span></button>`).join(''):`<div class="empty-state">${query?'No matching studies.':'Open a NIfTI file to begin.'}</div>`;
  $('case-list').querySelectorAll('[data-case]').forEach(el=>el.addEventListener('click',()=>{requestStudy(state.dataset,el.dataset.case);setSidebar(false);}));
}
function renderLibrary() {
  $('library-cards').innerHTML=catalog.filter(d=>['reference','synthetic'].includes(d.id)).map(d=>`<button class="library-card" data-library-dataset="${d.id}"><img src="${d.thumbnail}" alt="${d.id==='reference'?'Three orthogonal MRI slices of the MNI152 reference template':'Three illustrative synthetic brain phantom slices'}"/><span class="library-card-body"><span class="pill ${d.id==='synthetic'?'synthetic':''}">${d.kind}</span><h3>${d.name}</h3><p>${d.description}</p><span class="card-footer"><span>Explore collection</span><span>${d.short}</span></span></span></button>`).join('');
  $('library-cards').querySelectorAll('[data-library-dataset]').forEach(el=>el.addEventListener('click',()=>{$('library-dialog').close();chooseDataset(el.dataset.libraryDataset);}));
}
function chooseDataset(id) {
  const d=catalog.find(d=>d.id===id); $('case-search').value='';
  if(!d.cases.length) {$('file-input').click();return;}
  requestStudy(id,d.cases[0].id);setSidebar(false);
}
function updateStudyHeader() {
  const d=currentDataset(),c=currentCase();
  $('breadcrumb-dataset').textContent=d.name; $('breadcrumb-study').textContent=c.id==='mni152'?'MNI152':c.name;
  $('study-eyebrow').textContent=`${d.name.toUpperCase()} · ${c.organ.toUpperCase()}`;
  $('study-title').textContent=c.title; $('study-subtitle').textContent=c.subtitle;
  $('source-badge').textContent=c.badge; $('source-badge').classList.toggle('synthetic',d.id==='synthetic'||!!c.synthetic);
  $('data-notice').textContent=c.notice;
  $('source-link').hidden=d.id==='local'||d.id==='saved';
  const available=Object.keys(c.modalities);
  const labels=['local','saved'].includes(d.id)?available:['T1','T1ce','T2','FLAIR'];
  $('modality-grid').innerHTML=labels.map(m=>`<button class="modality-button ${state.modality===m?'active':''}" data-modality="${m}" ${c.modalities[m]?'':'disabled'} title="${c.modalities[m]?`View ${m}`:'Not included in this study'}" aria-pressed="${state.modality===m}">${m}</button>`).join('');
  $('modality-grid').querySelectorAll('[data-modality]').forEach(el=>el.addEventListener('click',()=>{if(state.modality!==el.dataset.modality) requestStudy(state.dataset,state.caseId,el.dataset.modality,true);}));
  $('series-count').textContent=`${available.length} available`;
  $('modality-note').textContent=d.id==='saved'?(c.synthetic?'Saved synthetic demonstration':'Private saved NIfTI volume'):d.id==='synthetic'?'Illustrative contrasts · synthetic data':(modalityNotes[state.modality]||'Local NIfTI volume');
  $('overlay-row').hidden=!c.overlay; $('overlay').checked=state.overlay;
  $('volume-dims').textContent='—';$('volume-spacing').textContent='—';
}
function resetControls() {
  $('colormap').value='gray'; $('contrast').value=100; $('brightness').value=0;$('opacity').value=100;
  $('contrast-value').textContent='100%';$('brightness-value').textContent='0';$('opacity-value').textContent='100%';
  $('cutaway').checked=false;$('clip-depth').value=0;$('clip-value').textContent='50%';$('cutaway-controls').hidden=true;
  $('crosshair').checked=true;document.querySelectorAll('[data-camera]').forEach(el=>el.classList.remove('active'));
}
function requestStudy(datasetId,caseId,modality,keepPosition=false) {
  const id=++state.request; const previousFraction=keepPosition&&nv?.scene?.crosshairPos?[...nv.scene.crosshairPos]:[.5,.5,.5];
  const previousOverlay=state.overlay;
  state.dataset=datasetId;state.caseId=caseId;state.modality=modality||Object.keys(currentCase().modalities)[0];state.overlay=keepPosition?previousOverlay:false;
  state.ready=false;resetControls();renderNavigation();updateStudyHeader();setBusy(true);
  showLoading(`Opening ${currentCase().name}`);$('render-status').innerHTML='<i></i>Loading volume';
  const study=currentCase(); const series=study.modalities[state.modality];
  queue=queue.catch(()=>{}).then(async()=>{
    if(id!==state.request)return;
    try {
      if(!nv)throw new Error('The 3D viewer could not initialize. Try a browser with WebGL2 enabled.');
      let localUrl;
      try {
        const url=study.file?(localUrl=URL.createObjectURL(study.file)):series.url;
        const volumes=[{url,name:study.file?study.file.name:`${study.id}-${state.modality}.nii.gz`,colormap:'gray',...(series.min!==undefined?{cal_min:series.min,cal_max:series.max}:{})}];
        if(study.overlay)volumes.push({url:study.overlay,name:'Simulated region.nii.gz',colormap:'red',cal_min:.5,cal_max:1,opacity:state.overlay?.72:0});
        await nv.loadVolumes(volumes);
      } finally {if(localUrl)URL.revokeObjectURL(localUrl);}
      if(id!==state.request)return;
      const vol=nv.volumes[0]; if(!vol?.hdr||!vol.img?.length)throw new Error('No valid image volume was found in this file. Choose a NIfTI .nii or .nii.gz image.');
      state.windowMin=Number.isFinite(vol.cal_min)?vol.cal_min:vol.robust_min;
      state.windowMax=Number.isFinite(vol.cal_max)?vol.cal_max:vol.robust_max;
      if(!(state.windowMax>state.windowMin)){state.windowMin=0;state.windowMax=100;}
      nv.setOpacity(0,1);nv.setClipPlane([3,0,0]);nv.setCrosshairWidth(1);nv.setRenderAzimuthElevation(120,15);nv.setScale(1);
      nv.scene.crosshairPos=previousFraction;
      await nv.setVolumeRenderIllumination(.6);
      if(id!==state.request)return;
      state.ready=true;applyLayout();nv.drawScene();
      const dims=vol.hdr.dims.slice(1,4),spacing=vol.hdr.pixDims.slice(1,4).map(v=>Math.abs(v));
      $('volume-dims').textContent=dims.join(' × ');
      $('volume-spacing').textContent=spacing.every(v=>Math.abs(v-spacing[0])<.001)?`${spacing[0].toFixed(2)} mm iso`:`${spacing.map(v=>v.toFixed(2)).join(' × ')} mm`;
      $('render-status').innerHTML=`<i></i>${nv.compatibilityMode?'Compatibility 3D':'Volume ready'}`;
      $('render-status').title=nv.compatibilityMode?'Canvas compatibility renderer. The 3D preview is reduced in resolution; slices use the source volume.':'WebGL2 volume renderer';
      syncCoordinates();$('loading-cover').hidden=true;setBusy(false);
      if(vol.hdr.dims[4]>1)toast(`This is a 4D file. Showing the first volume of ${vol.hdr.dims[4]}.`);
    } catch(error) {
      if(id!==state.request)return;
      state.ready=false;setBusy(false);$('render-status').textContent='Unable to open volume';
      showLoading('The volume could not be opened',error.message||'Try another NIfTI file or reload the reference collection.',true);
      console.error('Volume loading failed',error);
    }
  });
  return queue;
}
function applyLayout() {
  if(!nv)return;
  const host=$('canvas-host');host.classList.toggle('volume-mode',state.mode==='volume');host.classList.toggle('slices-mode',state.mode==='slices');
  const narrow=host.clientWidth<530;host.classList.toggle('stacked',narrow);
  document.querySelectorAll('[data-mode]').forEach(el=>{el.classList.toggle('active',el.dataset.mode===state.mode);el.setAttribute('aria-pressed',String(el.dataset.mode===state.mode));});
  if(state.mode==='volume'){nv.clearCustomLayout();nv.setSliceType(4);}
  else if(state.mode==='slices'){nv.setSliceType(3);nv.setCustomLayout([0,1,2].map((sliceType,i)=>({sliceType,position:narrow?[0,i/3,1,1/3]:[i/3,0,1/3,1]})));}
  else {nv.setSliceType(3);nv.setCustomLayout(narrow?[
    {sliceType:4,position:[0,0,1,.66]},
    {sliceType:0,position:[0,.66,1/3,.34]},
    {sliceType:1,position:[1/3,.66,1/3,.34]},
    {sliceType:2,position:[2/3,.66,1/3,.34]},
  ]:[
    {sliceType:4,position:[0,0,.7,1]},
    {sliceType:0,position:[.7,0,.3,1/3]},
    {sliceType:1,position:[.7,1/3,.3,1/3]},
    {sliceType:2,position:[.7,2/3,.3,1/3]},
  ]);}
}
function syncCoordinates(location) {
  if(!state.ready||!nv?.volumes?.length)return;
  const frac=location?.frac||nv.scene.crosshairPos;
  const mm=location?.mm||nv.frac2mm(frac,0,true);
  $('coordinates').textContent=Array.from(mm).slice(0,3).map(v=>Number(v).toFixed(1)).join(', ');
  const dims=nv.volumes[0].dimsRAS||nv.volumes[0].hdr.dims;
  [['sagittal',0],['coronal',1],['axial',2]].forEach(([label,axis])=>{
    const n=Math.max(1,Math.round(dims[axis+1]||1));
    const index=Math.max(0,Math.min(n-1,Math.round(frac[axis]*n-.5)));
    $(label+'-slider').max=n-1;$(label+'-slider').value=index;$(label+'-output').textContent=`${index+1} / ${n}`;
  });
}
function updateWindow() {
  $('contrast-value').textContent=$('contrast').value+'%';$('brightness-value').textContent=(Number($('brightness').value)>0?'+':'')+$('brightness').value;
  if(!state.ready)return;
  const width=(state.windowMax-state.windowMin)*100/Number($('contrast').value);
  const center=(state.windowMin+state.windowMax)/2-(state.windowMax-state.windowMin)*Number($('brightness').value)/100;
  nv.volumes[0].cal_min=center-width/2;nv.volumes[0].cal_max=center+width/2;
  cancelAnimationFrame(renderFrame);renderFrame=requestAnimationFrame(()=>nv.updateGLVolume());
}
function updateClip() {
  $('cutaway-controls').hidden=!$('cutaway').checked;
  $('clip-value').textContent=Math.round((Number($('clip-depth').value)+100)/2)+'%';
  if(!state.ready)return;
  if(!$('cutaway').checked){nv.setClipPlane([3,0,0]);return;}
  const angles={coronal:[0,0],sagittal:[90,0],axial:[0,90]}[$('clip-axis').value];
  nv.setClipPlane([Number($('clip-depth').value)/100,...angles]);
}
function showStudyInfo() {
  const d=currentDataset(),c=currentCase(),vol=state.ready?nv.volumes[0]:null;
  const rows=[['Collection',d.name],['Study',c.name],['Source',c.source],['Available series',Object.keys(c.modalities).join(', ')],['Volume dimensions',vol?vol.hdr.dims.slice(1,4).join(' × '):'Not loaded'],['Voxel spacing',vol?vol.hdr.pixDims.slice(1,4).map(v=>Math.abs(v).toFixed(4)).join(' × ')+' mm':'Not loaded'],['Rendering',nv?.compatibilityMode?'Canvas compatibility mode; reduced 3D resolution':'WebGL2 volume rendering'],['Data access',d.id==='saved'?'Private account storage; authenticated download for viewing':d.id==='local'?'Local browser session; no upload':'Bundled demonstration volume']];
  if(vol?.hdr.dims[4]>1)rows.push(['4D file',`Showing volume 1 of ${vol.hdr.dims[4]}`]);
  $('study-info-content').innerHTML=`<table class="details-table">${rows.map(([k,v])=>`<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table><p>${esc(c.notice)}</p>${c.sourceUrl?`<p><a href="${c.sourceUrl}" target="_blank" rel="noopener">${esc(c.sourceTitle)}</a></p>`:''}<p>Coordinates and anatomical views follow the NIfTI spatial transform. This viewer does not perform segmentation, diagnosis, or clinical validation.</p>`;
  showDialog('info-dialog');
}
async function importFiles(list) {
  const all=Array.from(list||[]);if(!all.length)return;
  const valid=all.filter(file=>/\.nii(\.gz)?$/i.test(file.name));
  if(!valid.length){toast('Choose a NIfTI volume ending in .nii or .nii.gz. DICOM is not supported in this version.');return;}
  const d=catalog.find(d=>d.id==='local');
  for(const file of valid) {
    d.cases.push({id:`local-${++state.localSeq}`,name:file.name,title:file.name.replace(/\.nii(\.gz)?$/i,''),subtitle:'Your MRI volume · opened on this device',badge:'Local file',organ:'MRI volume',file,source:'Opened from this device; file contents are not uploaded',notice:'Local volume. File contents stay in this browser session and are cleared when the page is closed or reloaded.',modalities:{Volume:{}},thumbnail:null});
  }
  if(all.length!==valid.length)toast(`${all.length-valid.length} unsupported file(s) skipped. Only .nii and .nii.gz volumes are accepted.`);
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());setSidebar(false);$('case-search').value='';
  const firstAdded=d.cases[d.cases.length-valid.length];
  await requestStudy('local',firstAdded.id);
  if(state.ready&&state.dataset==='local'&&state.caseId===firstAdded.id)toast(valid.length===1?'Local volume opened. Nothing was uploaded.':`Added ${valid.length} local files. Showing ${firstAdded.name}.`);
}

async function openSavedDataset(datasetId) {
  const lookup=++state.request;
  state.ready=false;setBusy(true);
  $('breadcrumb-dataset').textContent='Saved library';$('breadcrumb-study').textContent='Private volume';
  $('study-eyebrow').textContent='SAVED LIBRARY · PRIVATE ACCOUNT STORAGE';
  $('study-title').textContent='Your saved MRI volume';$('study-subtitle').textContent='Checking account access';
  $('source-badge').textContent='Private saved file';$('source-link').hidden=true;
  $('data-notice').textContent='Saved volumes are stored privately in your account and downloaded to this browser for viewing.';
  $('render-status').textContent='Opening saved volume';
  showLoading('Opening your saved volume','Checking access to your private account storage');
  try {
    if(typeof datasetId!=='string'||!/^dataset_[a-f0-9]{32}$/.test(datasetId))throw new Error('This saved-volume link is invalid. Return to Datasets and select a saved MRI image.');
    const catalogResponse=await fetch('/api/datasets',{credentials:'same-origin',cache:'no-store',redirect:'error'});
    if(!catalogResponse.ok)throw new Error('Your saved library could not be opened. Return to Datasets, sign in with ChatGPT, and select your saved image.');
    const data=await catalogResponse.json();
    const record=Array.isArray(data.datasets)?data.datasets.find(d=>d.id===datasetId&&d.private===true):null;
    if(!record)throw new Error('This volume is unavailable to the current account. Return to Datasets, sign in, and choose a file from your saved library.');
    if(lookup!==state.request)return;
    // Construct the known same-origin endpoint from the validated opaque ID;
    // never fetch arbitrary URLs from query parameters or record metadata.
    const response=await fetch(`/api/datasets/${datasetId}/download`,{credentials:'same-origin',cache:'no-store',redirect:'error'});
    if(!response.ok)throw new Error('This private volume could not be downloaded. Return to Datasets and check your sign-in and saved file.');
    if(Number(response.headers.get('content-length')||0)>32*1024*1024)throw new Error('The saved file exceeds this viewer’s 32 MB download limit. Return to Datasets to review the file.');
    const blob=await response.blob();
    if(!blob.size||blob.size>32*1024*1024)throw new Error('The saved file is empty or exceeds the 32 MB limit. Return to Datasets to review the file.');
    let filename=response.headers.get('content-disposition')?.match(/filename="([^"]+)"/i)?.[1]||String(record.name||'saved-volume');
    filename=filename.replace(/[\r\n/\\]/g,'_');
    if(!/\.nii(\.gz)?$/i.test(filename)){
      const magic=new Uint8Array(await blob.slice(0,2).arrayBuffer());
      filename+=magic[0]===31&&magic[1]===139?'.nii.gz':'.nii';
    }
    if(lookup!==state.request)return;
    const file=new File([blob],filename,{type:'application/octet-stream'});
    const modality=['T1','T1ce','T2','FLAIR'].includes(record.modality)?record.modality:'Volume';
    const synthetic=record.synthetic===true,reference=record.sampleId==='mni152';
    const study={
      id:datasetId,name:String(record.name||filename),title:String(record.name||filename),
      subtitle:'Private saved volume · authenticated account access',badge:synthetic?'Private · synthetic':'Private saved file',
      organ:synthetic?'Brain phantom':reference?'Brain':'MRI volume',file,synthetic,
      source:record.kind==='saved-sample'?'Private account storage · saved demonstration sample':'Private account storage · uploaded NIfTI file',
      notice:synthetic?'Private saved copy of a synthetic demonstration. Invented geometry; no real patient data. The stored copy remains in your account.':reference?'Private saved copy of the MNI152 anatomical atlas. This is an averaged reference, not an individual patient. The stored copy remains in your account.':'This volume is saved privately in your account. Viewing downloads it to this browser; closing the page does not delete the stored copy.',
      modalities:{[modality]:reference?{min:40,max:80}:synthetic?{min:0,max:210}:{}},thumbnail:null,
    };
    const collection=catalog.find(d=>d.id==='saved');collection.cases=collection.cases.filter(c=>c.id!==datasetId);collection.cases.push(study);
    collection.short=`${collection.cases.length} private saved file${collection.cases.length===1?'':'s'}`;
    await requestStudy('saved',datasetId,modality);
    if(state.dataset==='saved'&&state.caseId===datasetId&&!state.ready){
      showLoading('The saved volume could not be opened',`${$('loading-caption').textContent} Return to Datasets to check your sign-in and saved file.`,true);
    }
  } catch(error) {
    if(lookup!==state.request)return;
    state.ready=false;setBusy(false);$('render-status').textContent='Saved volume unavailable';
    const message=error.message||'The private volume could not be opened.';
    const nextStep=/Datasets/.test(message)?'':' Return to Datasets, sign in with ChatGPT, and choose a saved MRI image.';
    showLoading('The saved volume could not be opened',message+nextStep,true);
  }
}

$('case-search').addEventListener('input',renderCases);
$('browse-datasets').onclick=()=>{renderLibrary();showDialog('library-dialog');setSidebar(false);};
$('brand').onclick=e=>{e.preventDefault();renderLibrary();showDialog('library-dialog');};
$('breadcrumb-dataset').onclick=()=>{renderLibrary();showDialog('library-dialog');};
['open-local-sidebar','open-local-top','open-local-library'].forEach(id=>$(id).onclick=()=>$('file-input').click());
$('file-input').addEventListener('change',async e=>{await importFiles(e.target.files);e.target.value='';});
['guide-sidebar','guide-button'].forEach(id=>$(id).onclick=()=>{showDialog('guide-dialog');setSidebar(false);});
$('study-info-button').onclick=showStudyInfo;
$('source-link').onclick=showStudyInfo;
$('menu-button').onclick=()=>setSidebar(true);$('sidebar-scrim').onclick=()=>setSidebar(false);
document.querySelectorAll('.close-dialog').forEach(el=>el.onclick=()=>el.closest('dialog').close());
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
document.querySelectorAll('[data-mode]').forEach(el=>el.onclick=()=>{state.mode=el.dataset.mode;applyLayout();});
document.querySelectorAll('[data-camera]').forEach(el=>el.onclick=()=>{if(!state.ready)return;const camera={front:[180,0],side:[90,0],top:[0,90]}[el.dataset.camera];nv.setRenderAzimuthElevation(...camera);document.querySelectorAll('[data-camera]').forEach(b=>b.classList.toggle('active',b===el));});
$('colormap').onchange=()=>{if(state.ready)nv.setColormap(nv.volumes[0].id,$('colormap').value);};
$('contrast').oninput=updateWindow;$('brightness').oninput=updateWindow;
$('opacity').oninput=()=>{$('opacity-value').textContent=$('opacity').value+'%';if(state.ready)nv.setOpacity(0,Number($('opacity').value)/100);};
$('cutaway').onchange=updateClip;$('clip-depth').oninput=updateClip;$('clip-axis').onchange=updateClip;
$('crosshair').onchange=()=>{if(state.ready)nv.setCrosshairWidth($('crosshair').checked?1:0);};
$('overlay').onchange=()=>{state.overlay=$('overlay').checked;if(state.ready&&nv.volumes[1])nv.setOpacity(1,state.overlay?.72:0);};
[['sagittal',0],['coronal',1],['axial',2]].forEach(([label,axis])=>$(label+'-slider').oninput=()=>{if(!state.ready)return;const frac=[...nv.scene.crosshairPos];frac[axis]=(Number($(label+'-slider').value)+.5)/(Number($(label+'-slider').max)+1);nv.scene.crosshairPos=frac;nv.drawScene();syncCoordinates();});
$('center-crosshair').onclick=()=>{if(state.ready){nv.scene.crosshairPos=[.5,.5,.5];nv.drawScene();syncCoordinates();}};
$('reset-view').onclick=()=>{if(!state.ready)return;resetControls();state.overlay=false;$('overlay').checked=false;nv.setColormap(nv.volumes[0].id,'gray');nv.setOpacity(0,1);if(nv.volumes[1])nv.setOpacity(1,0);nv.setClipPlane([3,0,0]);nv.setCrosshairWidth(1);nv.setRenderAzimuthElevation(120,15);nv.setScale(1);nv.scene.crosshairPos=[.5,.5,.5];updateWindow();syncCoordinates();toast('View and display settings reset.');};
$('snapshot').onclick=async()=>{if(!state.ready)return;try{await nv.saveScene(`voxel-atlas-${state.caseId}-${state.modality}.png`);toast('Viewer snapshot downloaded.');}catch{toast('Snapshot could not be saved in this browser.');}};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if($('viewer-card').requestFullscreen)await $('viewer-card').requestFullscreen();else toast('Fullscreen is not supported by this browser.');}catch{toast('Fullscreen is unavailable in this browser.');}};
document.addEventListener('fullscreenchange',()=>{applyLayout();nv?.resizeListener();});
document.addEventListener('keydown',e=>{if(e.key==='?'&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))showDialog('guide-dialog');if(e.key==='Escape')setSidebar(false);});
let dragDepth=0;
document.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault();});
$('canvas-host').addEventListener('dragenter',e=>{if(e.dataTransfer.types.includes('Files')){e.preventDefault();dragDepth++;$('drop-overlay').classList.add('active');}});
$('canvas-host').addEventListener('dragleave',()=>{dragDepth=Math.max(0,dragDepth-1);if(!dragDepth)$('drop-overlay').classList.remove('active');});
document.addEventListener('drop',async e=>{if(e.dataTransfer.files.length){e.preventDefault();dragDepth=0;$('drop-overlay').classList.remove('active');await importFiles(e.dataTransfer.files);}});

async function initialize() {
  renderNavigation();renderLibrary();setBusy(true);
  try {
    const options={backColor:[.0314,.051,.0784,1],fontColor:[.52,.62,.72,1],crosshairColor:[.62,.91,.82,.65],crosshairWidth:1,show3Dcrosshair:false,isOrientCube:true,isColorbar:false,dragAndDropEnabled:false,multiplanarShowRender:1,textHeight:.025,isRuler:false,loadingText:'Preparing volume…'};
    const test=document.createElement('canvas');let gl=null;try{gl=test.getContext('webgl2');}catch{}
    if(gl){
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      try {nv=new Niivue(options);await nv.attachToCanvas($('mri-canvas'));} catch(error) {console.warn('Using the compatibility renderer',error);$('mri-canvas').replaceWith($('mri-canvas').cloneNode(false));nv=null;}
    }
    if(!nv){const {SoftwareNiivue}=await import('./software-renderer.js');nv=new SoftwareNiivue(options);await nv.attachToCanvas($('mri-canvas'));}
    nv.onLocationChange=syncCoordinates;
    nv.onIntensityChange=()=>{};
    let previousWidth=0;new ResizeObserver(entries=>{const w=Math.round(entries[0].contentRect.width);if(w!==previousWidth){previousWidth=w;requestAnimationFrame(applyLayout);}}).observe($('canvas-host'));
    const query=new URLSearchParams(location.search);
    if(query.has('datasetId')){await openSavedDataset(query.get('datasetId'));return;}
    const sample=query.get('sample'), requestedModality=query.get('modality');
    const synthetic=catalog.find(d=>d.id==='synthetic')?.cases.find(c=>c.id===sample);
    if(synthetic)await requestStudy('synthetic',synthetic.id,synthetic.modalities[requestedModality]?requestedModality:'T1');
    else await requestStudy('reference','mni152');
  } catch(error) {state.ready=false;setBusy(false);showLoading('3D rendering is unavailable',error.message,true);$('render-status').textContent='Graphics unavailable';console.error(error);}
}
initialize();
