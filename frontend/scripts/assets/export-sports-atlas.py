"""blender -b --python export-sports-atlas.py -- --input Startup.blend --output public/stem/anatomy/sports"""
import bpy, argparse,sys,os,json,re,hashlib
p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);os.makedirs(a.output,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
base=['Femur','Tibia','Fibula','Humerus','Radius','Ulna','Scapula','Clavicle','Patella','Sacrum','Hip bone','Talus','Calcaneus','Frontal bone','Parietal bone','Occipital bone','Temporal bone','Zygomatic bone','Maxilla','Mandible','Sphenoid bone','Ethmoid bone','Nasal bone','Vomer','Manubrium of sternum','Body of sternum','Xiphoid process']
ribs=['First','Second','Third','Fourth','Fifth','Sixth','Seventh','Eighth','Ninth','Tenth','Eleventh','Twelfth']
def chosen(n):return any(n==b or n in [b+'.r',b+'.l'] for b in base) or bool(re.match(r'^Vertebra [CTL]\d+$',n)) or any(n in [b+' rib.r',b+' rib.l'] for b in ribs) or bool(re.match(r'^(First|Second|Third|Fourth|Fifth) (metacarpal|metatarsal) bone\.[rl]$',n))
with bpy.data.libraries.load(a.input,link=False) as (s,t):t.objects=[n for n in s.objects if chosen(n)]
selected=[];manifest=[]
for o in t.objects:
 if not o or o.type!='MESH':continue
 bpy.context.scene.collection.objects.link(o);o.hide_set(False);o.hide_viewport=False;o.hide_render=False;o.parent=None;o.modifiers.clear();o.data.materials.clear()
 name=o.name;stem=re.sub(r'\.[rl]$','',name)
 key='vertebra' if stem.startswith('Vertebra ') else 'ribs' if 'rib' in stem.lower() else 'sternum' if 'sternum' in stem or stem=='Xiphoid process' else 'skull' if stem in base[14:28] else stem.lower().replace(' ','-')
 o.name=key+'_'+name.replace(' ','_');o['bone_key']=key;o['source_name']=name;o['anatomy_source']='Z-Anatomy / BodyParts3D; CC BY-SA 4.0'
 for f in o.data.polygons:f.use_smooth=True
 if len(o.data.polygons)>6000:
  m=o.modifiers.new('Teaching mesh optimization','DECIMATE');m.ratio=6000/len(o.data.polygons)
 selected.append(o);manifest.append(dict(name=o.name,key=key,source_name=name))
def export(name,objects):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 path=os.path.join(a.output,name);bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,export_apply=True,export_extras=True,export_cameras=False,export_lights=False,export_animations=False,export_copyright='Z-Anatomy / Gauthier Kervyn and Marcin Zielinski; BodyParts3D / DBCLS, Kousaku Okubo. CC BY-SA 4.0 atlas adaptation.')
 return dict(file=name,bytes=os.path.getsize(path),sha256=hashlib.sha256(open(path,'rb').read()).hexdigest())
assets=[export('skeleton-atlas-v1.glb',selected),export('thorax-atlas-v1.glb',[o for o in selected if o['bone_key'] in ['ribs','sternum']])]
json.dump(dict(source='https://github.com/Z-Anatomy/Models-of-human-anatomy',revision='6ffffec1d9b17ed3db355903bbd762582cb2328e',license='CC-BY-SA-4.0',modifications='Bone subset, label removal, polygon reduction on large meshes, smooth normals, glTF export.',assets=assets,bones=manifest),open(os.path.join(a.output,'manifest.json'),'w'),indent=2)
print('SPORTS_EXPORT',len(selected),assets)
