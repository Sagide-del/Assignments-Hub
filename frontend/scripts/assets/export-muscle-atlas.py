"""Export a right upper-limb subset from the pinned Z-Anatomy Startup.blend.
blender -b --python export-muscle-atlas.py -- --input Startup.blend --output arm-muscles-atlas-v1.glb
"""
import bpy,sys,argparse,os
p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
names=['Short head of biceps brachii.r','Long head of biceps brachii.r','Medial head of triceps brachii.r','Long head of triceps brachii.r','Lateral head of triceps brachii.r','Brachialis muscle.r','Humerus.r','Radius.r','Ulna.r','Scapula.r']
with bpy.data.libraries.load(a.input,link=False) as(s,t):t.objects=[n for n in s.objects if n in names]
for o in t.objects:
 if not o or o.type!='MESH':continue
 bpy.context.scene.collection.objects.link(o);o.hide_set(False);o.hide_viewport=False;o.hide_render=False;o.parent=None;o.modifiers.clear()
 o['structure']='biceps' if 'biceps' in o.name else 'triceps' if 'triceps' in o.name else 'brachialis' if 'Brachialis' in o.name else 'bone'
 o['source_name']=o.name
 for f in o.data.polygons:f.use_smooth=True
 if len(o.data.polygons)>8000:
  m=o.modifiers.new('Teaching mesh optimisation','DECIMATE');m.ratio=8000/len(o.data.polygons)
 o.select_set(True)
bpy.ops.export_scene.gltf(filepath=a.output,export_format='GLB',use_selection=True,export_apply=True,export_extras=True,export_cameras=False,export_lights=False,export_animations=False,export_copyright='Z-Anatomy / Gauthier Kervyn and Marcin Zielinski; BodyParts3D / DBCLS, Kousaku Okubo. CC BY-SA 4.0. Right upper-limb subset; polygon reduction; glTF conversion.')
print('EXPORTED',os.path.getsize(a.output))
