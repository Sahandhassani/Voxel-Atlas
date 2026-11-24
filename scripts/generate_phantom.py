"""Deterministic synthetic MRI-like geometry for educational UI demonstration.
This is not a real scan and is not an anatomically validated phantom.
"""
from pathlib import Path
import gzip,json,struct
import numpy as np
from scipy.ndimage import gaussian_filter
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]/"dist"/"data"
ROOT.mkdir(parents=True,exist_ok=True)
N=128
SPACING=1.5
coords=(np.arange(N,dtype=np.float32)-(N-1)/2)*SPACING
X,Y,Z=np.meshgrid(coords,coords,coords,indexing='ij')
rng=np.random.default_rng(4107)
# A smooth cerebrum plus cerebellum and brainstem. These are invented shapes.
a,b,c=65.,79.,63.
z0=13.
r=np.sqrt((X/a)**2+(Y/b)**2+((Z-z0)/c)**2)
# Broad invented sulci, and an interhemispheric gap. They intentionally do not
# represent any named anatomical tract, cortical region, or atlas.
s1=np.sin(.16*Y+.043*X+.75*np.sin(Z*.07))
s2=np.sin(.18*X+.038*Y+.50*np.sin(Z*.09))
s3=np.sin(.15*Z+.05*Y+.5*np.cos(X*.09))
grooves=np.maximum.reduce([np.exp(-(s1/.18)**2),np.exp(-(s2/.16)**2)*.7,np.exp(-(s3/.16)**2)*.6])
surface=1.-.07*grooves*(.6+.4*np.sin(Z*.035)**2)
cerebrum=r<surface
fissure=(np.abs(X)<(1.0+1.4*np.maximum(0,(Z-10)/55)))&(Z>1)&(r>.50)
cerebrum&=~fissure
rc=np.sqrt((X/43.)**2+((Y+40.)/34.)**2+((Z+42.)/24.)**2)
folia=.965-.035*np.cos(Z*.65+.035*Y)
cerebellum=(rc<folia)&(Z<-23)
rb=np.sqrt((X/11.)**2+((Y+16.)/13.)**2+((Z+56.)/25.)**2)
stem=rb<1
brain=cerebrum|cerebellum|stem
wm_boundary=.76+.035*np.sin(Y*.13)*np.cos(X*.11)*np.cos(Z*.12)
wm=((r<wm_boundary)&cerebrum)|((rc<.67)&cerebellum)|stem
gm=brain&~wm
# Two mirrored, invented CSF cavities. This illustrates contrast only.
vent=np.zeros_like(brain)
for side in [-1,1]:
 xx=X-side*(10.+3.*np.sin(Y*.06))
 v=(xx/5.8)**2+((Y+4)/24.)**2+((Z-11)/7.5)**2<1
 horn=((X-side*17)/5.)**2+((Y+23)/10.)**2+((Z-4)/5.5)**2<1
 vent|=v|horn
vent|=(X/2.3)**2+((Y+7)/6.)**2+((Z-5)/12.)**2<1
vent&=brain
smooth_noise=gaussian_filter(rng.normal(0,1,brain.shape).astype(np.float32),1.8)
smooth_noise/=max(float(smooth_noise.std()),1e-5)
fine_noise=rng.normal(0,1,brain.shape).astype(np.float32)
bias=1.+.035*X/65.+.025*Y/79.

def write_nifti(path,data):
 # Single-file NIfTI-1, little-endian unsigned byte, x axis fastest.
 # sform maps i,j,k to RAS millimetres, yielding radiological viewer consistency.
 hdr=bytearray(352)
 struct.pack_into('<i',hdr,0,348)
 struct.pack_into('<8h',hdr,40,3,N,N,N,1,1,1,1)
 struct.pack_into('<h',hdr,70,2)
 struct.pack_into('<h',hdr,72,8)
 struct.pack_into('<8f',hdr,76,1.,SPACING,SPACING,SPACING,1.,1.,1.,1.)
 struct.pack_into('<f',hdr,108,352.)
 struct.pack_into('<f',hdr,112,1.)
 struct.pack_into('<f',hdr,116,0.)
 hdr[123]=2 # spatial units millimetres
 struct.pack_into('<f',hdr,124,float(data.max()))
 struct.pack_into('<f',hdr,128,0.)
 desc=b'SYNTHETIC DEMO ONLY. Invented geometric brain; no actual patient data.'
 hdr[148:148+len(desc)]=desc
 struct.pack_into('<h',hdr,252,0)
 struct.pack_into('<h',hdr,254,1)
 origin=-(N-1)*SPACING/2
 struct.pack_into('<4f',hdr,280,SPACING,0,0,origin)
 struct.pack_into('<4f',hdr,296,0,SPACING,0,origin)
 struct.pack_into('<4f',hdr,312,0,0,SPACING,origin)
 hdr[344:348]=b'n+1\0'
 with open(path,'wb') as raw:
  with gzip.GzipFile(filename='',mode='wb',fileobj=raw,mtime=0,compresslevel=9) as out:
   out.write(hdr)
   out.write(np.asarray(data,dtype=np.uint8).tobytes(order='F'))

patients=[]
all_imgs={}
for patient,center,radii in [('demo-001',(27.,12.,21.),(12.,15.,11.)),('demo-002',(-25.,-13.,27.),(10.,12.,13.))]:
 rr=np.sqrt(((X-center[0])/radii[0])**2+((Y-center[1])/radii[1])**2+((Z-center[2])/radii[2])**2)
 lesion=(rr<1)&brain&~vent
 edema=np.exp(-((rr-.98)/.48)**2)*brain*~vent
 modalities={}
 for mode,white,gray,csf,lesion_value,edema_delta in [('T1',166,112,34,125,-34),('T1ce',166,112,34,205,-25),('T2',87,124,211,174,50),('FLAIR',97,131,16,188,65)]:
  raw=np.zeros_like(X)
  raw[gm]=gray;raw[wm]=white;raw[vent]=csf
  raw+=edema*edema_delta
  raw[lesion]=lesion_value+10.*np.cos(rr[lesion]*4.)
  if mode=='T1ce':
   raw[lesion]=125.+85.*np.exp(-((rr[lesion]-.78)/.2)**2)
  raw=(raw*bias+smooth_noise*2.2+fine_noise*.75)*brain
  # Subvoxel partial-volume edge so surfaces look less stepped.
  soft=gaussian_filter(brain.astype(np.float32),.45)
  raw=raw*soft
  raw=np.clip(np.round(raw/2)*2,0,255).astype(np.uint8)
  filename=f'{patient}-{mode.lower()}.nii.gz'
  write_nifti(ROOT/filename,raw)
  modalities[mode]={'file':filename,'bytes':(ROOT/filename).stat().st_size}
  all_imgs[(patient,mode)]=raw
 maskname=f'{patient}-region.nii.gz'
 write_nifti(ROOT/maskname,lesion.astype(np.uint8))
 patients.append({'id':patient,'label':f'Synthetic study {patient[-3:]}','source':'Generated geometric phantom; no real patient','modalities':modalities,'segmentation':{'file':maskname,'bytes':(ROOT/maskname).stat().st_size,'labels':{'0':'Background','1':'Simulated region of interest'}},'simulated_roi_center_ras_mm':list(center),'simulated_roi_radii_mm':list(radii)})
meta={'name':'Synthetic Brain Lab','description':'Invented brain-shaped MRI-like volumes for testing slice navigation, contrast changes, volume rendering, and a region overlay.','disclaimer':'SYNTHETIC DEMONSTRATION — not a real MRI, not a validated anatomical model, and not suitable for diagnosis or anatomical assessment. Contrast patterns are illustrative, not quantitative MRI signals.','dimensions':[N,N,N],'voxel_spacing_mm':[SPACING]*3,'voxel_type':'uint8','affine_ras':[[SPACING,0,0,-(N-1)*SPACING/2],[0,SPACING,0,-(N-1)*SPACING/2],[0,0,SPACING,-(N-1)*SPACING/2],[0,0,0,1]],'world_orientation':'RAS+','generator_seed':4107,'patients':patients}
(ROOT/'phantom-metadata.json').write_text(json.dumps(meta,indent=2)+'\n')
# Quality-assurance montage: axial, coronal, sagittal for each modality.
W,H=1010,1080
canvas=Image.new('RGB',(W,H),'#10151d')
d=ImageDraw.Draw(canvas)
try:
 font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',24)
 small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16)
except: font=small=ImageFont.load_default()
d.text((24,15),'SYNTHETIC MRI-LIKE GEOMETRIC PHANTOM',font=font,fill='white')
d.text((24,49),'Invented geometry. Not a real scan or validated anatomical model.',font=small,fill='#e4b882')
for row,mode in enumerate(['T1','T2','FLAIR']):
 arr=all_imgs[('demo-001',mode)]
 zi=int(round((21.+(N-1)*SPACING/2)/SPACING));yi=int(round((12.+(N-1)*SPACING/2)/SPACING));xi=int(round((27.+(N-1)*SPACING/2)/SPACING))
 for col,(name,sl) in enumerate([('Axial',arr[:,:,zi]),('Coronal',arr[:,yi,:]),('Sagittal',arr[xi,:,:])]):
  im=Image.fromarray(np.rot90(sl)).convert('RGB').resize((310,310),Image.Resampling.BILINEAR)
  x=24+col*330;y=100+row*325
  canvas.paste(im,(x,y))
  d.text((x+8,y+8),f'{mode} · {name}',font=small,fill='#9cdbf5')
canvas.save(ROOT/'qa-montage.png')
print(json.dumps({'files':[{ 'file':p.name,'bytes':p.stat().st_size} for p in sorted(ROOT.glob('*'))],'total_nifti_bytes':sum(p.stat().st_size for p in ROOT.glob('*.nii.gz'))},indent=2))
