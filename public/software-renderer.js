/**
 * CPU compatibility renderer for scalar NIfTI images.
 * Original voxel data and spatial transforms are decoded by NiiVue NVImage.
 * Slices sample the original data in RAS world planes; the 3D preview is
 * resampled to a smaller physical grid for interactive Canvas2D rendering.
 */
import { NVImage } from './vendor/niivue-0.69.0.esm.js';
import { canonicalScalar } from './vendor/nvimage-cpu-utils.js';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const norm=a=>{const n=Math.hypot(...a)||1;return a.map(v=>v/n);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];

function prepareScalar(image) {
  const s=canonicalScalar(image,0);
  const p=s.voxelAt([0,0,0]),x=s.voxelAt([1,0,0]),y=s.voxelAt([0,1,0]),z=s.voxelAt([0,0,1]);
  s.inverse=[x[0]-p[0],y[0]-p[0],z[0]-p[0],p[0],x[1]-p[1],y[1]-p[1],z[1]-p[1],p[1],x[2]-p[2],y[2]-p[2],z[2]-p[2],p[2]];
  s.bounds=[[Infinity,Infinity,Infinity],[-Infinity,-Infinity,-Infinity]];
  for(let k=0;k<8;k++) {
    // Fractional coordinates span voxel EDGES, matching NiiVue's
    // voxel=(fraction*dimension)-0.5 convention for axis-aligned files.
    const q=s.worldAt([(k&1)?s.dims[0]-.5:-.5,(k&2)?s.dims[1]-.5:-.5,(k&4)?s.dims[2]-.5:-.5]);
    for(let a=0;a<3;a++){s.bounds[0][a]=Math.min(s.bounds[0][a],q[a]);s.bounds[1][a]=Math.max(s.bounds[1][a],q[a]);}
  }
  s.length=s.bounds[1].map((v,i)=>Math.max(s.spacing[i],v-s.bounds[0][i]));
  return s;
}

function sampleVoxel(s,x,y,z,nearest=false) {
  const [nx,ny,nz]=s.dims;
  if(x<0||y<0||z<0||x>nx-1||y>ny-1||z>nz-1)return 0;
  if(nearest)return s.data[Math.round(x)+nx*(Math.round(y)+ny*Math.round(z))]||0;
  const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),jx=Math.min(ix+1,nx-1),jy=Math.min(iy+1,ny-1),jz=Math.min(iz+1,nz-1);
  const fx=x-ix,fy=y-iy,fz=z-iz,xy=nx*ny,d=s.data;
  const a=ix+iy*nx+iz*xy,b=jx+iy*nx+iz*xy,c=ix+jy*nx+iz*xy,e=jx+jy*nx+iz*xy;
  const az=ix+iy*nx+jz*xy,bz=jx+iy*nx+jz*xy,cz=ix+jy*nx+jz*xy,ez=jx+jy*nx+jz*xy;
  const low=(d[a]*(1-fx)+d[b]*fx)*(1-fy)+(d[c]*(1-fx)+d[e]*fx)*fy;
  const high=(d[az]*(1-fx)+d[bz]*fx)*(1-fy)+(d[cz]*(1-fx)+d[ez]*fx)*fy;
  const val=low*(1-fz)+high*fz;return Number.isFinite(val)?val:0;
}
function sampleWorld(s,x,y,z,nearest=false){const m=s.inverse;return sampleVoxel(s,m[0]*x+m[1]*y+m[2]*z+m[3],m[4]*x+m[5]*y+m[6]*z+m[7],m[8]*x+m[9]*y+m[10]*z+m[11],nearest);}

function rgb(t,map='gray') {
  t=clamp(t);
  if(map==='warm')return [255*Math.min(1,t*1.35),255*Math.pow(t,1.25)*.83,255*Math.pow(t,1.8)*.55];
  if(map==='cool')return [255*(.12+.53*t),255*(.17+.83*t),255*(.3+.7*t)];
  if(map==='viridis') {
    const stops=[[68,1,84],[59,82,139],[33,145,140],[94,201,98],[253,231,37]];const i=Math.min(3,Math.floor(t*4)),f=t*4-i;return stops[i].map((v,a)=>v*(1-f)+stops[i+1][a]*f);
  }
  if(map==='red')return [255,110,78];
  return [t*255,t*255,t*255];
}

export class SoftwareNiivue {
  constructor(options={}) {
    this.opts={...options};this.compatibilityMode=true;this.volumes=[];this.scalar=[];
    this.scene={crosshairPos:[.5,.5,.5]};this.onLocationChange=()=>{};
    this.layout=null;this.sliceType=4;this.azimuth=120;this.elevation=15;this.scale=1;
    this.crosshairWidth=options.crosshairWidth??1;this.clip=[3,0,0];this.tiles=[];
    this._scheduled=0;this._lastLoc='';this._drag=null;this._qualityTimer=0;this._volumeDirty=true;
  }
  async attachToCanvas(canvas) {
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});
    if(!this.ctx)throw new Error('This browser does not provide a 2D drawing context.');
    this.scratch=document.createElement('canvas');this.rayCanvas=document.createElement('canvas');
    canvas.addEventListener('pointerdown',e=>this._pointerDown(e));
    canvas.addEventListener('pointermove',e=>this._pointerMove(e));
    canvas.addEventListener('pointerup',e=>this._pointerUp(e));
    canvas.addEventListener('pointercancel',e=>this._pointerUp(e));
    canvas.addEventListener('wheel',e=>this._wheel(e),{passive:false});
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
    this._resizeObserver=new ResizeObserver(()=>this.resizeListener());this._resizeObserver.observe(canvas.parentElement);
    this.resizeListener();return this;
  }
  async loadVolumes(descriptors) {
    const loaded=[];
    for(const d of descriptors) {
      const image=await NVImage.loadFromUrl({url:d.url,name:d.name,colormap:d.colormap||'gray',opacity:d.opacity??1,cal_min:d.cal_min,cal_max:d.cal_max});
      if(!image?.hdr||!image.img?.length)throw new Error('The file does not contain a valid scalar NIfTI volume.');
      if(Number.isFinite(d.cal_min))image.cal_min=d.cal_min;if(Number.isFinite(d.cal_max))image.cal_max=d.cal_max;
      image.opacity=d.opacity??1;image.colormap=d.colormap||'gray';loaded.push(image);
    }
    this.volumes=loaded;this.scalar=loaded.map(prepareScalar);this._buildPreview();this._volumeDirty=true;
    this.drawScene();return this;
  }
  _buildPreview() {
    const s=this.scalar[0];if(!s){this.preview=null;return;}
    const length=Math.max(...s.length),dims=s.length.map(v=>Math.max(12,Math.round(98*v/length)));
    const preview={dims,data:new Float32Array(dims[0]*dims[1]*dims[2]),half:s.length.map(v=>v/length),length:s.length,bounds:s.bounds};
    let k=0;
    for(let z=0;z<dims[2];z++)for(let y=0;y<dims[1];y++)for(let x=0;x<dims[0];x++,k++){
      preview.data[k]=sampleWorld(s,s.bounds[0][0]+x/(dims[0]-1)*s.length[0],s.bounds[0][1]+y/(dims[1]-1)*s.length[1],s.bounds[0][2]+z/(dims[2]-1)*s.length[2]);
    }
    this.preview=preview;
  }
  setCustomLayout(layout){this.layout=layout;this.drawScene();}
  clearCustomLayout(){this.layout=null;this.drawScene();}
  setSliceType(value){this.sliceType=value;this.drawScene();}
  setRenderAzimuthElevation(a,e){this.azimuth=a;this.elevation=e;this._volumeDirty=true;this.drawScene();}
  setScale(v){this.scale=clamp(v,.35,4);this._volumeDirty=true;this.drawScene();}
  setOpacity(index,v){if(this.volumes[index])this.volumes[index].opacity=clamp(v);this._volumeDirty=true;this.drawScene();}
  setColormap(id,map){const v=this.volumes.find(v=>v.id===id);if(v)v.colormap=map;this._volumeDirty=true;this.drawScene();}
  setClipPlane(p){this.clip=[...p];this._volumeDirty=true;this.drawScene();}
  setCrosshairWidth(w){this.crosshairWidth=w;this.drawScene();}
  async setVolumeRenderIllumination(v){this.illumination=v;this._volumeDirty=true;this.drawScene();}
  updateGLVolume(){this._volumeDirty=true;this.drawScene();}
  frac2mm(frac){const s=this.scalar[0];return s?frac.map((v,i)=>s.bounds[0][i]+v*s.length[i]):[0,0,0];}
  resizeListener(){if(!this.canvas)return;const r=this.canvas.getBoundingClientRect();const w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height));if(w!==this.canvas.width||h!==this.canvas.height){this.canvas.width=w;this.canvas.height=h;this._volumeDirty=true;}this.drawScene();}
  drawScene(){if(this._scheduled)return;this._scheduled=requestAnimationFrame(()=>{this._scheduled=0;this._draw();});}
  _draw() {
    if(!this.ctx)return;
    const ctx=this.ctx,w=this.canvas.width,h=this.canvas.height;ctx.fillStyle='#080d14';ctx.fillRect(0,0,w,h);this.tiles=[];
    if(!this.scalar.length)return;
    const layout=this.layout||[{sliceType:this.sliceType,position:[0,0,1,1]}];
    for(const t of layout){const [x,y,tw,th]=t.position;const tile={type:t.sliceType,x:x*w,y:y*h,w:tw*w,h:th*h};this.tiles.push(tile);ctx.save();ctx.beginPath();ctx.rect(tile.x,tile.y,tile.w,tile.h);ctx.clip();if(t.sliceType===4)this._drawVolume(tile);else this._drawSlice(tile);ctx.restore();}
    const key=this.scene.crosshairPos.map(v=>v.toFixed(6)).join(',');
    if(key!==this._lastLoc){this._lastLoc=key;const mm=this.frac2mm(this.scene.crosshairPos);const s=this.scalar[0];this.onLocationChange({mm,frac:this.scene.crosshairPos,vox:s.voxelAt(mm),values:this.scalar.map((v,i)=>({id:this.volumes[i].id,name:this.volumes[i].name,value:sampleWorld(v,...mm),mm})),string:mm.map(v=>v.toFixed(1)).join(', ')});}
  }
  _drawSlice(tile) {
    const s=this.scalar[0],v=this.volumes[0],ctx=this.ctx;const type=tile.type;
    const axes=type===0?[0,1,2]:type===1?[0,2,1]:[1,2,0];
    const [ax,ay,az]=axes,flipX=type===2;
    const availW=Math.max(1,tile.w-30),availH=Math.max(1,tile.h-49),ratio=s.length[ax]/s.length[ay];
    let dw=availW,dh=dw/ratio;if(dh>availH){dh=availH;dw=dh*ratio;}
    const x=tile.x+(tile.w-dw)/2,y=tile.y+29+(availH-dh)/2;
    tile.imageRect={x,y,w:dw,h:dh,axes,flipX};
    const iw=Math.max(1,Math.min(384,Math.round(dw))),ih=Math.max(1,Math.min(384,Math.round(dh)));
    this.scratch.width=iw;this.scratch.height=ih;const sx=this.scratch.getContext('2d'),im=sx.createImageData(iw,ih),data=im.data;
    const world=this.frac2mm(this.scene.crosshairPos);const low=v.cal_min,range=Math.max(1e-6,v.cal_max-low);
    for(let py=0,k=0;py<ih;py++)for(let px=0;px<iw;px++,k+=4){
      const fx=(px+.5)/iw,fy=1-(py+.5)/ih;world[ax]=s.bounds[0][ax]+(flipX?1-fx:fx)*s.length[ax];world[ay]=s.bounds[0][ay]+fy*s.length[ay];
      const val=sampleWorld(s,...world);let col=rgb((val-low)/range,v.colormap);
      for(let i=1;i<this.scalar.length;i++)if(this.volumes[i].opacity>0){const label=sampleWorld(this.scalar[i],...world,true);if(label>this.volumes[i].cal_min){const alpha=this.volumes[i].opacity;const c=rgb(1,this.volumes[i].colormap);col=col.map((a,j)=>a*(1-alpha)+c[j]*alpha);}}
      data[k]=col[0];data[k+1]=col[1];data[k+2]=col[2];data[k+3]=255;
    }
    sx.putImageData(im,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(this.scratch,x,y,dw,dh);
    if(this.crosshairWidth){ctx.strokeStyle=['#e6a18c99','#87b8de99','#c8ade299'][type];ctx.lineWidth=1;const cx=x+(flipX?1-this.scene.crosshairPos[ax]:this.scene.crosshairPos[ax])*dw,cy=y+(1-this.scene.crosshairPos[ay])*dh;ctx.beginPath();ctx.moveTo(x,cy+.5);ctx.lineTo(cx-5,cy+.5);ctx.moveTo(cx+5,cy+.5);ctx.lineTo(x+dw,cy+.5);ctx.moveTo(cx+.5,y);ctx.lineTo(cx+.5,cy-5);ctx.moveTo(cx+.5,cy+5);ctx.lineTo(cx+.5,y+dh);ctx.stroke();}
    ctx.fillStyle='#9aafbd';ctx.font='11px ui-monospace,monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(type===2?'A':'L',tile.x+9,y+dh/2);ctx.fillText(type===2?'P':'R',tile.x+tile.w-9,y+dh/2);ctx.fillText(type===0?'A':'S',x+dw/2,y-9);ctx.fillText(type===0?'P':'I',x+dw/2,y+dh+10);
  }
  _drawVolume(tile) {
    if(!this.preview)return;
    const dragging=!!this._drag;const max=dragging?126:248;const aspect=tile.w/tile.h;let bw,bh;if(aspect>1){bw=max;bh=Math.max(80,Math.round(max/aspect));}else{bh=max;bw=Math.max(80,Math.round(max*aspect));}
    const key=[bw,bh,this.azimuth,this.elevation,this.scale,this.volumes[0].cal_min,this.volumes[0].cal_max,this.volumes.map(v=>`${v.opacity}:${v.colormap}`).join(','),this.clip.join(',')].join('|');
    if(this._volumeDirty||key!==this._rayKey){this._rayKey=key;this._volumeDirty=false;this._renderRays(bw,bh);}
    this.ctx.imageSmoothingEnabled=true;this.ctx.drawImage(this.rayCanvas,tile.x,tile.y,tile.w,tile.h);
    this._drawOrientation(tile);
  }
  _renderRays(w,h) {
    const p=this.preview,v=this.volumes[0],half=p.half;
    this.rayCanvas.width=w;this.rayCanvas.height=h;const context=this.rayCanvas.getContext('2d');const im=context.createImageData(w,h),out=im.data;
    const a=this.azimuth*Math.PI/180,e=clamp(this.elevation,-89.95,89.95)*Math.PI/180;
    const camera=[Math.sin(a)*Math.cos(e),-Math.cos(a)*Math.cos(e),Math.sin(e)];
    const right=norm(cross([0,0,1],camera)),up=norm(cross(camera,right));
    const direction=camera.map(v=>-v),light=norm(camera.map((v,i)=>v*.85+up[i]*.5-right[i]*.35));
    const view=1.4/this.scale,aspect=w/h;const scaleX=aspect>1?aspect:1,scaleY=aspect<1?1/aspect:1;
    const low=v.cal_min,range=Math.max(1e-6,v.cal_max-low),threshold=.11;
    const step=2/Math.max(...p.dims)*.8;const opacity=v.opacity??1;
    const clipOn=this.clip[0]<=2;const ca=this.clip[1]*Math.PI/180,ce=this.clip[2]*Math.PI/180;
    const cn=[Math.sin(ca)*Math.cos(ce),Math.cos(ca)*Math.cos(ce),Math.sin(ce)];
    const clipDistance=this.clip[0];
    const sample=(x,y,z)=>sampleVoxel(p,(x/half[0]+1)*.5*(p.dims[0]-1),(y/half[1]+1)*.5*(p.dims[1]-1),(z/half[2]+1)*.5*(p.dims[2]-1));
    for(let py=0,k=0;py<h;py++)for(let px=0;px<w;px++,k+=4){
      const u=((px+.5)/w*2-1)*view*scaleX,t=(1-(py+.5)/h*2)*view*scaleY;
      const origin=[camera[0]*3+right[0]*u+up[0]*t,camera[1]*3+right[1]*u+up[1]*t,camera[2]*3+right[2]*u+up[2]*t];
      let near=0,far=7;
      for(let ax=0;ax<3;ax++){if(Math.abs(direction[ax])<1e-8){if(origin[ax]<-half[ax]||origin[ax]>half[ax]){far=-1;break;}}else{const x=(-half[ax]-origin[ax])/direction[ax],y=(half[ax]-origin[ax])/direction[ax];near=Math.max(near,Math.min(x,y));far=Math.min(far,Math.max(x,y));}}
      let rr=0,gg=0,bb=0,alpha=0;
      if(far>near) {
        for(let depth=near;depth<=far&&alpha<.985;depth+=step){
          const x=origin[0]+direction[0]*depth,y=origin[1]+direction[1]*depth,z=origin[2]+direction[2]*depth;
          if(clipOn&&(x*cn[0]+y*cn[1]+z*cn[2])>clipDistance)continue;
          const value=sample(x,y,z),normalized=(value-low)/range;if(normalized<threshold)continue;
          const amount=clamp(normalized);const delta=step*1.5;
          let nx=sample(x-delta,y,z)-sample(x+delta,y,z),ny=sample(x,y-delta,z)-sample(x,y+delta,z),nz=sample(x,y,z-delta)-sample(x,y,z+delta);
          let length=Math.hypot(nx,ny,nz);let lightness=.7;
          if(length>.001){nx/=length;ny/=length;nz/=length;const diffuse=Math.max(0,nx*light[0]+ny*light[1]+nz*light[2]);const facing=Math.max(0,nx*camera[0]+ny*camera[1]+nz*camera[2]);lightness=.28+.68*diffuse+.13*Math.pow(facing,18);}
          const clipSurface=clipOn&&Math.abs(x*cn[0]+y*cn[1]+z*cn[2]-clipDistance)<step*1.8;
          if(clipSurface)lightness=.7+.3*amount;
          let color=v.colormap==='gray'?[224,231,235]:rgb(.25+.7*amount,v.colormap);
          const tissue=.7+.3*amount;color=color.map(c=>c*lightness*tissue);
          if(this.scalar.length>1){const wx=p.bounds[0][0]+(x/half[0]+1)*.5*p.length[0],wy=p.bounds[0][1]+(y/half[1]+1)*.5*p.length[1],wz=p.bounds[0][2]+(z/half[2]+1)*.5*p.length[2];for(let n=1;n<this.scalar.length;n++){if(this.volumes[n].opacity>0&&sampleWorld(this.scalar[n],wx,wy,wz,true)>.5){const overlayAlpha=this.volumes[n].opacity;color=color.map((c,i)=>c*(1-overlayAlpha)+[255,113,81][i]*overlayAlpha);}}}
          const density=clamp((amount-threshold)*.85+.15)*opacity*.65,weight=(1-alpha)*density;
          rr+=color[0]*weight;gg+=color[1]*weight;bb+=color[2]*weight;alpha+=weight;
        }
      }
      out[k]=rr+8*(1-alpha);out[k+1]=gg+13*(1-alpha);out[k+2]=bb+20*(1-alpha);out[k+3]=255;
    }
    context.putImageData(im,0,0);
  }
  _drawOrientation(tile){
    const ctx=this.ctx,cx=tile.x+tile.w-39,cy=tile.y+tile.h-34,rad=14;
    const a=this.azimuth*Math.PI/180,e=this.elevation*Math.PI/180;const camera=[Math.sin(a)*Math.cos(e),-Math.cos(a)*Math.cos(e),Math.sin(e)],right=norm(cross([0,0,1],camera)),up=norm(cross(camera,right));
    const axes=[{v:[1,0,0],c:'#dfa994',t:'R'},{v:[0,1,0],c:'#9fc3e2',t:'A'},{v:[0,0,1],c:'#c2afe0',t:'S'}];
    ctx.font='10px ui-monospace,monospace';ctx.textAlign='center';ctx.textBaseline='middle';
    for(const axis of axes){const x=cx+dot(axis.v,right)*rad,y=cy-dot(axis.v,up)*rad;ctx.strokeStyle=axis.c;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(x,y);ctx.stroke();ctx.fillStyle=axis.c;ctx.fillText(axis.t,cx+(x-cx)*1.55,cy+(y-cy)*1.55);}
  }
  _point(e){const r=this.canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*this.canvas.width/r.width,y:(e.clientY-r.top)*this.canvas.height/r.height};}
  _tileAt(p){return this.tiles.find(t=>p.x>=t.x&&p.x<t.x+t.w&&p.y>=t.y&&p.y<t.y+t.h);}
  _pointerDown(e){if(!this.volumes.length)return;const p=this._point(e),tile=this._tileAt(p);if(!tile)return;e.preventDefault();this.canvas.setPointerCapture(e.pointerId);this._drag={x:p.x,y:p.y,tile};if(tile.type!==4)this._moveSlice(p,tile);}
  _pointerMove(e){if(!this._drag)return;const p=this._point(e),d=this._drag;if(d.tile.type===4){this.azimuth+=(p.x-d.x)*.65;this.elevation=clamp(this.elevation+(p.y-d.y)*.65,-89,89);this._volumeDirty=true;this.drawScene();}else this._moveSlice(p,d.tile);d.x=p.x;d.y=p.y;}
  _pointerUp(e){if(!this._drag)return;this._drag=null;this._volumeDirty=true;this.drawScene();if(this.canvas.hasPointerCapture(e.pointerId))this.canvas.releasePointerCapture(e.pointerId);}
  _moveSlice(p,tile){const r=tile.imageRect;if(!r)return;const fx=clamp((p.x-r.x)/r.w),fy=1-clamp((p.y-r.y)/r.h);this.scene.crosshairPos[r.axes[0]]=r.flipX?1-fx:fx;this.scene.crosshairPos[r.axes[1]]=fy;this.drawScene();}
  _wheel(e){if(!this.volumes.length)return;const p=this._point(e),tile=this._tileAt(p);if(!tile)return;e.preventDefault();if(tile.type===4){this.scale=clamp(this.scale*Math.exp(-e.deltaY*.001),.35,4);this._volumeDirty=true;}else{const axis=tile.type===0?2:tile.type===1?1:0;const n=this.scalar[0].dims[axis];this.scene.crosshairPos[axis]=clamp(this.scene.crosshairPos[axis]+Math.sign(e.deltaY)/n,.5/n,1-.5/n);}this.drawScene();}
  async saveScene(filename='voxel-atlas.png'){this._draw();const blob=await new Promise(resolve=>this.canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('Snapshot export failed.');const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
}

export {prepareScalar,sampleWorld,sampleVoxel};
