"""Render twelve distinct four-bar play-alongs and eighteen additional one-bar loops.
Uses the pinned, CC0 recorded notes prepared by prepare-recorded-sounds.py.
No commercial songs, vocals or traditional-performance transcriptions are used.
"""
from pathlib import Path
import runpy, array, wave, json, hashlib, math
ROOT=Path(__file__).resolve().parents[3]
p=runpy.run_path(str(Path(__file__).with_name('prepare-recorded-sounds.py')))
RATE=p['RATE'];prepared=p['prepared'];run=p['run'];OUT=p['OUT'];CACHE=p['CACHE']
songs=json.loads((ROOT/'frontend/public/assets/music/songs/songs.json').read_text())['songs']
def midi(n):
 notes={'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}
 return (int(n[-1])+1)*12+notes[n[0]]+(1 if '#' in n else -1 if 'b' in n else 0)
def note(dest,source,pitch,at,duration,gain):
 data,base=prepared[source];ratio=2**((pitch-base)/12);start=round(at*RATE);length=min(int(duration*RATE),len(dest)-start,int((len(data)-1)/ratio))
 fade=min(round(RATE*.025),max(1,length//4))
 for i in range(max(0,length)):
  x=i*ratio;j=int(x);value=data[j]*(1-x+j)+data[j+1]*(x-j)
  dest[start+i]+=value*gain*min(1,(length-i)/fade)
def voice(group,pitch):return min((s for s in prepared if s.startswith(group)),key=lambda s:abs(prepared[s][1]-pitch))
def write(values,target,mp3=True,bins=128):
 peak=max(map(abs,values)) or 1
 if peak>.85:values=array.array('f',(v/peak*.85 for v in values))
 # A short boundary fade removes clicks without moving beat positions.
 for i in range(min(180,len(values)//4)):values[i]*=i/180;values[-1-i]*=i/180
 wav=CACHE/(target.stem+'.wav') if mp3 else target
 with wave.open(str(wav),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(RATE);w.writeframes(array.array('h',(round(max(-1,min(1,x))*32767) for x in values)).tobytes())
 if mp3:run(['ffmpeg','-v','error','-y','-i',str(wav),'-codec:a','libmp3lame','-b:a','128k','-ac','2',str(target)])
 size=len(values)//bins;peaks=[round(max(abs(v) for v in values[i*size:(i+1)*size]),4) for i in range(bins)]
 return dict(bytes=target.stat().st_size,sha256=hashlib.sha256(target.read_bytes()).hexdigest(),waveform=peaks)
chords={'C':[60,64,67],'F':[60,65,69],'G':[59,62,67],'Am':[60,64,69],'Dm':[62,65,69],'Em':[59,64,67]}
arrangements=[json.loads((OUT/'play-along.json').read_text())]
for song in songs:
 if song['content_kind'] not in ['ORIGINAL','PUBLIC_DOMAIN_STUDY'] or song['slug']=='ode-to-joy-theme':continue
 bpm=song['bpm'];beat=60/bpm;beats=3 if song['time_signature']=='6/8' else 4;bar=beat*beats;duration=4*bar+1;N=round(duration*RATE)
 stems={k:array.array('f',[0])*N for k in ['melody','keys','bass','strings','percussion']}
 for n in song['notation_json']['melody']:
  pitch=midi(n['pitch']);note(stems['melody'],voice('marimba',pitch),pitch,(n['bar']*beats+n['step']/4)*beat,n['length']/4*beat+.1,.8)
 genre=song['genre'];progression=song['chord_progression']
 for b in range(4):
  chord=chords.get(progression[b%len(progression)],chords['C']);root=chord[0]-24
  # Offbeat keys for rhumba/coastal music, arpeggios for Benga/ballad, block chords for pop.
  times=[.5,1.5,2.5,3.5] if genre in ['Rhumba','Chakacha','Afrobeat'] else [0,.5,1,1.5,2,2.5,3,3.5] if genre in ['Benga','Western Pop'] else [0,1.5] if beats==3 else [0,2]
  for j,t in enumerate(t for t in times if t<beats):
   for pitch in ([chord[j%3]] if genre in ['Benga','Western Pop'] else chord):note(stems['keys'],voice('piano',pitch),pitch,b*bar+t*beat,beat*(.36 if genre in ['Chakacha','Afrobeat'] else .8),.4)
  for j,t in enumerate([0,1.5] if beats==3 else [0,1.5,2.5,3.5]):note(stems['bass'],'bass-cs2',root+(7 if j%2 else 0),b*bar+t*beat,beat*.48,.78)
  note(stems['strings'],'strings-a3',chord[0],b*bar,bar*.95,.34)
  steps=12 if beats==3 else 16;patterns=song['isukuti_pattern']
  for step in range(steps):
   at=b*bar+step/4*beat
   if patterns['isatsa'][step]:note(stems['percussion'],'kit-low',36,at,.42,.58)
   if patterns['ikhasi'][step]:note(stems['percussion'],'kit-snare',38,at,.22,.26)
   if patterns['rattles'][step]:note(stems['percussion'],'kit-triangle',84,at,.09,.12)
 ident=song['slug']+'-band-v1';items=[]
 labels={'melody':'Marimba melody','keys':'Upright piano','bass':'Acoustic bass','strings':'Violin pad','percussion':'Acoustic kit'}
 for stem,values in stems.items():
  target=OUT/(song['slug']+'-'+stem+'.mp3');meta=write(values,target)
  items.append(dict(id=stem,label=labels[stem],url='/assets/music/recorded/'+target.name,**meta,recorded_sample_based=True))
 arr=dict(id=ident,song_slug=song['slug'],title=song['title'].replace(' — theme study','').replace(' — melody study','').replace(' — round study',''),genre=genre,subtitle='A recorded-sample play-along arrangement',composer=song['artist'],arranger='Assignment Hub original four-bar accompaniment',bpm=bpm,time_signature=song['time_signature'],bars=4,musical_duration=4*bar,duration=duration,chords=progression,source_license='CC0-1.0 samples; original or public-domain melody; original Assignment Hub accompaniment',credits_url='/assets/music/recorded/samples.json',stems=items)
 arrangements.append(arr);print('Arranged:',arr['title'],flush=True)
arrangements[0]['genre']='Classical & Traditional'
(OUT/'arrangements.json').write_text(json.dumps(dict(version=2,arrangements=arrangements),indent=2)+'\n')
registry=[{k:a[k] for k in ['id','song_slug','bpm','time_signature','bars']} for a in arrangements]
(ROOT/'backend/src/student/music-production/arrangements.json').write_text(json.dumps(registry,indent=2)+'\n')
# New loop packs each contain rhythm, harmonic and bass parts at a shared tempo.
loop_root=ROOT/'frontend/public/assets/music-loops';library=json.loads((loop_root/'loops.json').read_text());library['loops']=[l for l in library['loops'] if l['id'] in ['sikuti_lead','sikuti_response','benga_guitar','chakacha_percussion','afrobeat_drums','amapiano_log']]
packs=[
 ('dancehall','Dancehall',96,'Jamaica','Dancehall draws on Jamaican sound-system music. Explore this original syncopated rhythm with a bass and offbeat keyboard part.',[0,3,6,8,11,14],[4,12],[0,3,6,10,14]),
 ('reggae','Reggae',80,'Jamaica','Reggae developed in Jamaica. Hear the offbeat keyboard skank, one-drop-inspired drum placement and answering bass in this original practice pack.',[8],[8],[0,6,8,14]),
 ('folk','Kenyan Folk-inspired',108,'Kenya — original classroom call and response','A newly composed classroom call-and-response exercise inspired by layered Kenyan ensemble learning. It is not a named folk song, traditional transcription or field recording.',[0,6],[3,9,11],[0,4,6,10]),
 ('benga','Benga',120,'Kenya','Benga is associated with interlocking melodic lines and Luo musical traditions. These original recorded-sample exercises explore interlocking keys and bass.',[0,8],[4,12],[0,3,6,8,11,14]),
 ('coastal','Chakacha',110,'Swahili coast','Chakacha is associated with coastal Swahili music and dance. This original classroom arrangement explores layered offbeats using orchestral samples, not traditional percussion recordings.',[0,6,8,14],[4,10,12],[0,6,8,14]),
 ('rhumba','Rhumba',100,'Congo and East Africa','Congolese rumba has influenced East African popular music. Explore an original interlocking keyboard and bass exercise with a steady four-beat pulse.',[0,8],[4,12],[0,6,10,14])]
for slug,category,bpm,origin,context,kicks,snares,bass_steps in packs:
 beats=3 if slug=='folk' else 4;steps=beats*4;beat=60/bpm;duration=beats*beat;N=round(duration*RATE);parts={k:array.array('f',[0])*N for k in ['drums','keys','bass']}
 for step in range(steps):
  at=step/4*beat
  if step in kicks:note(parts['drums'],'kit-low',36,at,.4,.7)
  if step in snares:note(parts['drums'],'kit-snare',38,at,.2,.4)
  if step%2:note(parts['drums'],'kit-triangle',84,at,.07,.15)
 key_steps=[2,6,10,14] if slug in ['reggae','dancehall','coastal'] else [0,2,4,6,8,10,12,14]
 for j,step in enumerate(t for t in key_steps if t<steps):
  for pitch in ([60,64,67] if slug in ['reggae','dancehall','coastal'] else [[60,64,67,69,67,64,62,67][j]]):note(parts['keys'],voice('piano',pitch),pitch,step/4*beat,beat*.32,.42)
 for j,step in enumerate(t for t in bass_steps if t<steps):note(parts['bass'],'bass-cs2',[36,43,40,38,36][j%5],step/4*beat,beat*.45,.8)
 for part,values in parts.items():
  ident=slug+'_'+part;target=loop_root/(ident+'.wav');meta=write(values,target,False,32)
  library['loops'].append(dict(id=ident,name=category+' '+('Call & Response' if part=='drums' and slug=='folk' else 'Offbeat Keys' if part=='keys' and slug=='reggae' else part.title()),category='Kenyan Rhythms' if slug in ['benga','coastal'] else category,origin=origin,bpm=bpm,time_signature='6/8' if beats==3 else '4/4',file='/assets/music-loops/'+target.name,context=context,provenance='Original arrangement using CC0 VSCO 2 recorded instrument samples; not a traditional recording.',duration_seconds=round(duration,6),sample_credits='/assets/music/recorded/samples.json',**meta))
library['version']=2;(loop_root/'loops.json').write_text(json.dumps(library,indent=2)+'\n')
(ROOT/'backend/src/student/music/loop-ids.json').write_text(json.dumps([l['id'] for l in library['loops']],indent=2)+'\n')
print(f"Prepared {len(arrangements)} playable arrangements and {len(library['loops'])} loops.",flush=True)
