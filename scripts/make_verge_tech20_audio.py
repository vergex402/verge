import numpy as np, wave
from pathlib import Path
from scipy.signal import butter,lfilter
sr=48000;D=20;n=int(sr*D);t=np.arange(n)/sr;mix=np.zeros(n);rng=np.random.default_rng(20)
def E(st,L,a=.02,r=.2):
 x=np.zeros(n);i=int(st*sr);j=min(n,int((st+L)*sr));u=np.arange(j-i)/sr;x[i:j]=np.maximum(0,np.minimum(1,np.minimum(u/a,(L-u)/r)));return x
def add(x,g):
 global mix;mix+=x*g
# restrained low industrial pulse
for f in [48,72,96]: add(np.sin(2*np.pi*f*t)*E(0,19,.8,1),.020)
for st in np.arange(.8,18.5,.48):
 idx=np.arange(int(.23*sr))/sr; x=np.zeros(n);i=int(st*sr); x[i:i+len(idx)]=np.sin(2*np.pi*(180+((int(st*10)%3)*35))*idx)*np.exp(-idx*11);add(x,.052)
for st in [3.3,7.25,12.0,16.15]:
 L=.8;u=np.arange(int(L*sr))/sr;z=rng.normal(size=len(u));b,a=butter(2,[180/(sr/2),4200/(sr/2)],btype='band');z=lfilter(b,a,z);x=np.zeros(n);i=int(st*sr);x[i:i+len(u)]=z*np.sin(np.pi*u/L)**1.3;add(x,.075)
for st in [4.3,5.1,5.9,8.3,9.1,9.9,12.9,13.7]:
 L=.09;u=np.arange(int(L*sr))/sr;x=np.zeros(n);i=int(st*sr);x[i:i+len(u)]=np.sin(2*np.pi*1750*u)*np.exp(-u*44);add(x,.10)
# final lift
u=np.arange(int(1.1*sr))/sr;f=220+1200*u;x=np.zeros(n);i=int(16.3*sr);x[i:i+len(u)]=np.sin(2*np.pi*np.cumsum(f)/sr)*np.sin(np.pi*u/1.1)**1.4;add(x,.055)
mix=np.tanh(mix*1.35);mix=mix/max(abs(mix))*0.78;mix[:int(.1*sr)]*=np.linspace(0,1,int(.1*sr));mix[-int(.8*sr):]*=np.linspace(1,0,int(.8*sr))
out=Path('/root/verge/artifacts/verge-tech-20/track.wav');out.parent.mkdir(parents=True,exist_ok=True)
with wave.open(str(out),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes((mix*32767).astype('<i2').tobytes())
