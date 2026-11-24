from pathlib import Path
import gzip,struct
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]/'dist'
OUT=ROOT/'assets'
OUT.mkdir(parents=True,exist_ok=True)
BG=(8,15,22)

def load(p):
 b=gzip.decompress(p.read_bytes())
 endian='<' if struct.unpack_from('<i',b,0)[0]==348 else '>'
 dims=struct.unpack_from(endian+'8h',b,40)[1:4]
 code=struct.unpack_from(endian+'h',b,70)[0]
 dt={2:'u1',4:'i2',8:'i4',16:'f4',64:'f8',512:'u2'}[code]
 offset=int(struct.unpack_from(endian+'f',b,108)[0])
 slope=struct.unpack_from(endian+'f',b,112)[0] or 1
 inter=struct.unpack_from(endian+'f',b,116)[0]
 arr=np.frombuffer(b,dtype=endian+dt,offset=offset,count=np.prod(dims)).reshape(dims,order='F').astype(np.float32)*slope+inter
 A=np.eye(4)
 A[:3,:]=np.asarray([struct.unpack_from(endian+'4f',b,o) for o in [280,296,312]])
 return arr,A

def slices_at(data,A,xyz):
 assert np.allclose(A[:3,:3],np.diag(np.diag(A[:3,:3]))) # supplied files are RAS+, no oblique axes
 ijk=np.rint(np.linalg.inv(A)@np.r_[xyz,1]).astype(int)[:3]
 ijk=np.clip(ijk,0,np.array(data.shape)-1)
 return [np.rot90(data[:,:,ijk[2]]),np.rot90(data[:,ijk[1],:]),np.rot90(data[ijk[0],:,:])]

def rendered(sl,size,lo,hi):
 # Data crop removes only zero padding and preserves the scan's shape.
 mask=sl>max(0,lo*.1)
 yy,xx=np.where(mask)
 if len(xx):
  y0,y1=max(0,yy.min()-3),min(sl.shape[0],yy.max()+4)
  x0,x1=max(0,xx.min()-3),min(sl.shape[1],xx.max()+4)
  sl=sl[y0:y1,x0:x1]
 vals=np.clip((sl-lo)/(hi-lo),0,1)
 gray=np.rint(vals*245).astype(np.uint8)
 rgb=np.stack([gray,gray,gray],axis=-1)
 # Outside the original nonzero anatomy matches the UI background.
 rgb[sl<=0]=BG
 im=Image.fromarray(rgb)
 scale=min(size[0]/im.width,size[1]/im.height)
 im=im.resize((max(1,round(im.width*scale)),max(1,round(im.height*scale))),Image.Resampling.LANCZOS)
 pad=Image.new('RGB',size,BG)
 pad.paste(im,((size[0]-im.width)//2,(size[1]-im.height)//2))
 return pad

def make_preview(slices,name,lo,hi):
 image=Image.new('RGB',(600,300),BG)
 for i,sl in enumerate(slices):
  image.paste(rendered(sl,(184,260),lo,hi),(14+i*196,20))
 image.save(OUT/name,optimize=True)

def make_thumb(sl,name,lo,hi):
 rendered(sl,(100,100),lo,hi).save(OUT/name,optimize=True)

mni,A=load(ROOT/'data/mni152.nii.gz')
sl=slices_at(mni,A,(1,-17,24))
make_preview(sl,'mni-preview.png',40,80)
make_thumb(sl[0],'mni-thumb.png',40,80)
for n,xyz in [(1,(27,12,21)),(2,(-25,-13,27))]:
 p,A=load(ROOT/f'data/demo-00{n}-t1.nii.gz')
 sl=slices_at(p,A,xyz)
 if n==1:make_preview(sl,'phantom-preview.png',20,185)
 make_thumb(sl[0],f'phantom-{n}-thumb.png',20,185)
for p in OUT.glob('*.png'):
 with Image.open(p) as image:print(p.name,image.size,p.stat().st_size)
