import numpy as np
from pathlib import Path
from scipy.signal import butter, lfilter

sr=48000; dur=12.0; n=int(sr*dur); t=np.arange(n)/sr
mix=np.zeros(n,dtype=np.float64)
def env(start,length,attack=.01,release=.15):
    a=np.zeros(n); i=int(start*sr); j=min(n,int((start+length)*sr));
    if j<=i:return a
    x=np.arange(j-i)/sr
    a[i:j]=np.minimum(1,np.minimum(x/max(attack,.001),(length-x)/max(release,.001)))
    return np.maximum(a,0)
def sine(freq,phase=0): return np.sin(2*np.pi*freq*t+phase)
def add(x,g=.1):
    global mix;mix[:len(x)]+=x*g
# warm pad, very restrained
for f in [55,82.41,110]: add(sine(f)*env(0,11.7,.8,.8),.025)
# sparse arpeggio
notes=[220,277.18,329.63,440,329.63,277.18]
for k,start in enumerate(np.arange(.55,10.7,.32)):
    f=notes[k%len(notes)]; e=env(start,.25,.012,.16); add((sine(f)+.35*sine(f*2))*e,.035)
# low kick/impacts at narrative beats
for start in [1.15,2.35,4.72,5.35,7.62,9.95,10.75]:
    L=.42; idx=np.arange(int(L*sr))/sr; sweep=130*np.exp(-idx*8)+44; wave=np.sin(2*np.pi*np.cumsum(sweep)/sr); x=np.zeros(n); i=int(start*sr);x[i:i+len(idx)]=wave*np.exp(-idx*8);add(x,.22)
# filtered whooshes transitions
rng=np.random.default_rng(4)
for start in [2.0,4.45,7.3,9.7]:
    L=.55; z=rng.normal(0,1,int(L*sr)); b,a=butter(2,[250/(sr/2),4800/(sr/2)],btype='band');z=lfilter(b,a,z);x=np.zeros(n);i=int(start*sr);e=np.sin(np.linspace(0,np.pi,len(z)))**1.3;x[i:i+len(z)]=z*e;add(x,.05)
# tiny click ticks through payment mechanism
for start in [5.25,5.75,6.25,6.75]:
    L=.08; idx=np.arange(int(L*sr))/sr;x=np.zeros(n);i=int(start*sr);x[i:i+len(idx)]=(np.sin(2*np.pi*1800*idx)*np.exp(-idx*42));add(x,.11)
# final riser
idx=np.arange(int(1.0*sr))/sr;freq=260+1100*idx;wave=np.sin(2*np.pi*np.cumsum(freq)/sr);x=np.zeros(n);i=int(9.7*sr);x[i:i+len(idx)]=wave*np.sin(np.pi*idx)**1.6;add(x,.045)
# soft saturation / headroom
mix=np.tanh(mix*1.4); mix/=max(np.max(np.abs(mix)),1e-9); mix*=.78
mix[:int(.08*sr)]*=np.linspace(0,1,int(.08*sr));mix[-int(.5*sr):]*=np.linspace(1,0,int(.5*sr))
Path('/root/verge/artifacts/verge-intro').mkdir(parents=True,exist_ok=True)
import wave
with wave.open('/root/verge/artifacts/verge-intro/track.wav','wb') as w:
 w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes((mix*32767).astype('<i2').tobytes())
