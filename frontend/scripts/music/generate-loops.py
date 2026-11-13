"""Original synthesized, one-bar teaching loops. No recorded cultural performances."""
import math, random, wave, struct, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]/'public/assets/music-loops'
RATE=22050
LOOPS=[
 ('sikuti_lead','Isukuti Lead Drum','Kenyan Rhythms','Isukha and Idakho communities, Western Kenya',140,'6/8','Isukuti is a drum-and-dance tradition associated with the Isukha and Idakho communities. Try call and response between the lead and response tracks.'),
 ('sikuti_response','Isukuti Response Drum','Kenyan Rhythms','Western Kenya',140,'6/8','Explore an answering drum phrase. This simplified synthesized example is for practising call and response, not a transcription of a traditional performance.'),
 ('benga_guitar','Benga Guitar Riff','Kenyan Rhythms','Luo musical traditions; developed across Kenya',120,'4/4','Benga is associated with interlocking guitar lines and Luo musical traditions, and has developed across Kenya. This original plucked-synth phrase explores a repeating melody.'),
 ('chakacha_percussion','Chakacha Percussion','Kenyan Rhythms','Swahili coast, Kenya and Tanzania',110,'4/4','Chakacha is associated with coastal Swahili music and dance. Compare the off-beat percussion in this simplified teaching pattern.'),
 ('afrobeat_drums','Afrobeat Drum Loop','Afrobeat','Nigeria',105,'4/4','Afrobeat developed in Nigeria, combining influences including highlife, jazz and funk. Listen for the repeating groove in this original teaching loop.'),
 ('amapiano_log','Amapiano Log Drum','Amapiano','South Africa',112,'4/4','Amapiano developed in South Africa. Its sound often includes log-drum bass and layered percussion. This synthesized study loop explores a low, syncopated part.')]
ROOT.mkdir(parents=True,exist_ok=True)
rows=[]
for index,(ident,name,category,origin,bpm,meter,context) in enumerate(LOOPS):
 rng=random.Random(400+index); beats=3 if meter=='6/8' else 4; duration=beats*60/bpm; samples=[0.0]*round(RATE*duration)
 def hit(pos,freq,amp=0.7,kind='drum'):
  start=round(pos*duration*RATE); length=min(round(RATE*(0.28 if kind!='pluck' else 0.6)),len(samples)-start)
  for j in range(max(0,length)):
   t=j/RATE
   if kind=='noise': value=rng.uniform(-1,1)*math.exp(-t*34)
   elif kind=='pluck': value=(math.sin(2*math.pi*freq*t)+0.35*math.sin(4*math.pi*freq*t))*math.exp(-t*9)
   else: value=math.sin(2*math.pi*(freq*t+1.9*(1-math.exp(-t*25))))*math.exp(-t*18)
   samples[start+j]+=amp*value
 if index<2:
  for k in ([0,2,3,5] if index==0 else [1,4,5]): hit(k/6,110 if index==0 else 190,0.8 if k==0 else 0.55)
 elif index==2:
  for k,n in enumerate([60,67,64,67,69,67,64,62]): hit(k/8,440*2**((n-69)/12),0.62,'pluck')
 elif index==3:
  for k in range(8): hit(k/8,170,0.3 if k%2==0 else 0.5,'noise' if k%2 else 'drum')
 elif index==4:
  for k in range(16):
   hit(k/16,300,0.10,'noise')
   if k in [0,6,8,14]: hit(k/16,55,0.75)
   if k in [4,12]: hit(k/16,200,0.42,'noise')
 else:
  for k,n in [(0,38),(5,38),(7,43),(10,41),(14,38)]: hit(k/16,440*2**((n-69)/12),0.85)
  for k in range(8): hit(k/8,300,0.08,'noise')
 peak=max(abs(s) for s in samples) or 1; samples=[s/peak*0.78 for s in samples]
 # Fade both ends to avoid clicks when looping.
 for j in range(min(150,len(samples))): samples[j]*=j/150; samples[-1-j]*=j/150
 with wave.open(str(ROOT/f'{ident}.wav'),'wb') as out:
  out.setnchannels(1);out.setsampwidth(2);out.setframerate(RATE);out.writeframes(b''.join(struct.pack('<h',round(s*32767)) for s in samples))
 width=len(samples)//32
 peaks=[round(max(abs(s) for s in samples[k*width:(k+1)*width]),3) for k in range(32)]
 rows.append(dict(id=ident,name=name,category=category,origin=origin,bpm=bpm,time_signature=meter,file=f'/assets/music-loops/{ident}.wav',context=context,provenance='Original synthesized teaching example; not a traditional recording.',duration_seconds=round(duration,6),waveform=peaks))
(ROOT/'loops.json').write_text(json.dumps(dict(version=1,loops=rows),indent=2)+'\n')
print('Generated six original mono PCM teaching loops.')
