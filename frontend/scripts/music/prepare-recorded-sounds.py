"""Reproducible CC0 sample preparation and an original public-domain-theme arrangement.
Requires curl and ffmpeg. Never downloads commercial songs or stem-separated masters.
"""
from pathlib import Path
from urllib.parse import quote
import subprocess, json, hashlib, array, math, wave, tempfile
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'frontend/public/assets/music/recorded';OUT.mkdir(parents=True,exist_ok=True)
CACHE=Path(tempfile.gettempdir())/'assignmenthub-cc0-samples';CACHE.mkdir(exist_ok=True)
REV='440300901dfe9275fd84e0b7763af1f8443ae62e'
BASE=f'https://raw.githubusercontent.com/sgossner/VSCO-2-CE/{REV}/'
RATE=44100
SOURCES=[
 ('piano-a3','Keys/Upright Piano/Player_dyn2_rr1_018.wav',57,3.0,'Piano'),
 ('piano-cs4','Keys/Upright Piano/Player_dyn2_rr1_020.wav',61,3.0,'Piano'),
 ('piano-f4','Keys/Upright Piano/Player_dyn2_rr1_022.wav',65,3.0,'Piano'),
 ('piano-a4','Keys/Upright Piano/Player_dyn2_rr1_024.wav',69,3.0,'Piano'),
 ('marimba-f3','Percussion/Marimba/Marimba_hit_Outrigger_F3_loud_01.wav',53,2.0,'Marimba'),
 ('marimba-c4','Percussion/Marimba/Marimba_hit_Outrigger_C4_loud_01.wav',60,2.0,'Marimba'),
 ('marimba-b4','Percussion/Marimba/Marimba_hit_Outrigger_B4_loud_01.wav',71,2.0,'Marimba'),
 ('bass-cs2','Strings/Solo Contrabass/Pizz/BKCtbss_Pizz_C#2_v1_rr1.wav',37,2.2,'Bass'),
 ('strings-a3','Strings/Solo Violin/Arco Vib/LLVln_ArcoVib_A3_p.wav',57,4.2,'Strings'),
 ('kit-low','VSCO 1 Percussion/drums/bass/bdrum_f_1.wav',36,1.4,'Percussion'),
 ('kit-snare','Percussion/Snare2-HitSN_v3_rr1_Sum.wav',38,0.7,'Percussion'),
 ('kit-triangle','Percussion/Triangle6-Hit_v1_rr1_Sum.wav',84,1.8,'Percussion')]
def run(args):return subprocess.run(args,check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE).stdout
def fetch(path,target):
 if not target.exists():run(['curl','-fsSL',BASE+quote(path,safe='/'),'-o',str(target)])
 return target
license_path=fetch('LICENSE',CACHE/'CC0.txt');(OUT/'LICENSE-CC0.txt').write_bytes(license_path.read_bytes())
prepared={};assets=[]
for slug,path,midi,seconds,group in SOURCES:
 original=fetch(path,CACHE/(slug+'-original.wav'))
 raw=run(['ffmpeg','-v','error','-i',str(original),'-f','f32le','-ac','1','-ar',str(RATE),'pipe:1'])
 data=array.array('f');data.frombytes(raw)
 first=next((i for i,x in enumerate(data) if abs(x)>0.0004),0);first=max(0,first-100)
 data=data[first:first+int(seconds*RATE)]
 peak=max(map(abs,data)) or 1;data=array.array('f',(x/peak*0.72 for x in data))
 fade=min(2205,len(data)//4)
 for i in range(fade):data[-1-i]*=i/fade
 pcm=CACHE/(slug+'-trim.wav')
 with wave.open(str(pcm),'wb') as w:
  w.setnchannels(1);w.setsampwidth(2);w.setframerate(RATE);w.writeframes(array.array('h',(int(max(-1,min(1,x))*32767) for x in data)).tobytes())
 target=OUT/(slug+'.mp3');run(['ffmpeg','-v','error','-y','-i',str(pcm),'-codec:a','libmp3lame','-q:a','4',str(target)])
 prepared[slug]=(data,midi)
 assets.append(dict(id=slug,instrument=group,midi=midi,url='/assets/music/recorded/'+target.name,bytes=target.stat().st_size,sha256=hashlib.sha256(target.read_bytes()).hexdigest(),original_sha256=hashlib.sha256(original.read_bytes()).hexdigest(),source_url=BASE+quote(path,safe='/'),license='CC0-1.0',modifications='Trimmed leading silence and release; normalized, downmixed to mono, resampled to 44.1 kHz and MP3 encoded.'))
 print('Prepared recorded sample:',slug)
manifest=dict(version=1,source='VSCO 2 Community Edition — Sam Gossner / Versilian Studios and contributors',source_revision=REV,license='CC0-1.0',license_url=BASE+'LICENSE',credits_url='/assets/music/recorded/LICENSE-CC0.txt',authentic_isukuti=False,notes='Recorded orchestral instruments. These are not Isukuti, Nyatiti or Kalimba field recordings.',samples=assets)
(OUT/'samples.json').write_text(json.dumps(manifest,indent=2)+'\n')
# This is our own accompaniment, assembled from the recorded CC0 notes above.
# The four-bar Beethoven theme is public domain; it is not a commercial recording.
BPM=100;BEAT=60/BPM;MUSICAL=16*BEAT;TOTAL=MUSICAL+1.0;N=round(TOTAL*RATE)
stems={key:array.array('f',[0])*N for key in ['melody','keys','bass','strings','percussion']}
def place(stem,source,midi,at,duration,gain):
 samples,base=prepared[source];ratio=2**((midi-base)/12);start=round(at*RATE);length=min(int(duration*RATE),N-start,int((len(samples)-1)/ratio))
 dest=stems[stem];fade=min(round(RATE*0.04),max(1,length//4))
 for i in range(max(0,length)):
  p=i*ratio;j=int(p);value=samples[j]*(1-(p-j))+samples[j+1]*(p-j)
  envelope=min(1,(length-i)/fade)
  dest[start+i]+=value*gain*envelope
melody=[[64,64,65,67],[67,65,64,62],[60,60,62,64],[64,62,62]]
for bar,notes in enumerate(melody):
 for i,note in enumerate(notes):
  duration=BEAT*(2 if bar==3 and i==2 else 1);best=min(['marimba-f3','marimba-c4','marimba-b4'],key=lambda s:abs(prepared[s][1]-note));place('melody',best,note,(bar*4+i)*BEAT,duration+0.12,0.85)
chords=[[60,64,67],[59,62,67],[60,64,67],[55,59,62]]
for bar,chord in enumerate(chords):
 for beat in [0,2]:
  for note in chord:
   best=min(['piano-a3','piano-cs4','piano-f4','piano-a4'],key=lambda s:abs(prepared[s][1]-note));place('keys',best,note,(bar*4+beat)*BEAT,BEAT*1.9,0.36)
 place('bass','bass-cs2',36 if bar%2==0 else 31,bar*4*BEAT,BEAT*3.8,0.8)
 place('strings','strings-a3',60 if bar%2==0 else 55,bar*4*BEAT,BEAT*3.9,0.45)
 for step in range(16):
  at=(bar*4+step/4)*BEAT
  if step in [0,8]:place('percussion','kit-low',36,at,0.8,0.65)
  if step in [4,12]:place('percussion','kit-snare',38,at,0.5,0.4)
  if step%2==0:place('percussion','kit-triangle',84,at,0.18,0.2)
labels={'melody':'Marimba melody','keys':'Upright piano','bass':'Acoustic bass','strings':'Violin pad','percussion':'Acoustic kit'}
items=[]
for stem,values in stems.items():
 peak=max(map(abs,values)) or 1
 if peak>0.85:values=array.array('f',(v/peak*0.85 for v in values))
 wav=CACHE/('ode-'+stem+'.wav')
 with wave.open(str(wav),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(RATE);w.writeframes(array.array('h',(int(max(-1,min(1,v))*32767) for v in values)).tobytes())
 target=OUT/('ode-'+stem+'.mp3');run(['ffmpeg','-v','error','-y','-i',str(wav),'-codec:a','libmp3lame','-b:a','128k','-ac','2',str(target)])
 bins=128;size=len(values)//bins;peaks=[round(max(abs(v) for v in values[i*size:(i+1)*size]),4) for i in range(bins)]
 items.append(dict(id=stem,label=labels[stem],url='/assets/music/recorded/'+target.name,bytes=target.stat().st_size,sha256=hashlib.sha256(target.read_bytes()).hexdigest(),waveform=peaks,recorded_sample_based=True))
arr=dict(id='ode-to-joy-band-v1',song_slug='ode-to-joy-theme',title='Ode to Joy',subtitle='A recorded-sample play-along arrangement',composer='Ludwig van Beethoven · public-domain theme',arranger='Assignment Hub original four-bar accompaniment',bpm=BPM,time_signature='4/4',bars=4,musical_duration=MUSICAL,duration=TOTAL,chords=['C','G','C','G'],source_license='CC0-1.0 samples; public-domain melody; original Assignment Hub accompaniment',credits_url='/assets/music/recorded/samples.json',stems=items)
(OUT/'play-along.json').write_text(json.dumps(arr,indent=2)+'\n')
print('Prepared one synchronized five-stem public-domain play-along arrangement.')
