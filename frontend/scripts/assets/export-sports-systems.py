"""Export attributed Z-Anatomy teaching subsets. Run with Blender -- --input Startup.blend --output <directory>."""
import bpy,argparse,sys,os,json,hashlib
p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);os.makedirs(a.output,exist_ok=True)
sets={
 'energy':{
 'quadriceps':['Rectus femoris muscle.r','Vastus medialis muscle.r','Vastus lateralis muscle.r','Vastus intermedius muscle.r'],
 'hamstrings':['Long head of biceps femoris.r','Short head of biceps femoris.r'],
 'artery':['Femoral artery.r','Deep femoral artery.r'],
 'bone':['Hip bone.r','Femur.r','Patella.r','Tibia.r','Fibula.r']},
 'reflex':{
 'nerve':['Median nerve.r','Proper palmar digital branches of median nerve.r','Common palmar digital branches of median nerve.r'],
 'plexus':['Roots of brachial plexus.r','Superior trunk of brachial plexus.r','Middle trunk of brachial plexus.r','Inferior trunk of brachial plexus.r','Lateral cord of brachial plexus.r','Medial cord of brachial plexus.r'],
 'motor':['Musculocutaneous nerve.r'],
 'cord':['White matter of spinal cord','Grey matter of spinal cord','Anterior horn of spinal cord','Posterior horn of spinal cord'],
 'muscle':['Short head of biceps brachii.r','Long head of biceps brachii.r','Brachialis muscle.r'],
 'bone':['Humerus.r','Radius.r','Ulna.r','Scapula.r','Vertebra C5','Vertebra C6','Vertebra C7']},
 'circulation':{
 'right-atrium':['Right atrium'], 'right-ventricle':['Right ventricle'],
 'left-atrium':['Left atrium'],'left-ventricle':['Left ventricle'],
 'pulmonary-artery':['Pulmonary trunk','Right pulmonary artery','Left pulmonary artery'],
 'pulmonary-vein':['Right superior pulmonary vein','Right inferior pulmonary vein','Left superior pulmonary vein','Left inferior pulmonary vein'],
 'aorta':['Ascending aorta','Thoracic aorta'],
 'vena-cava':['Superior vena cava','Inferior vena cava (thoracic part)'],
 'lungs':['Superior lobe of right lung','Middle lobe of right lung','Inferior lobe of right lung','Superior lobe of left lung','Inferior lobe of left lung']}}
manifest={'source':'https://github.com/Z-Anatomy/Models-of-human-anatomy','revision':'6ffffec1d9b17ed3db355903bbd762582cb2328e','license':'CC-BY-SA-4.0','modifications':'Named anatomical subsets, structural-modifier baking, curve-to-surface conversion, polygon reduction, smooth normals, glTF export. Illustrative materials applied by the viewer; no anatomical deformation.','assets':[]}
for kind,groups in sets.items():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 mapping={n:key for key,names in groups.items() for n in names}
 with bpy.data.libraries.load(a.input,link=False) as(s,t):t.objects=[n for n in s.objects if n in mapping]
 exported=[]
 for o in t.objects:
  if not o or o.type not in ['MESH','CURVE']:continue
  source_name=o.name
  bpy.context.scene.collection.objects.link(o);o.hide_set(False);o.hide_viewport=False;o.hide_render=False
  bpy.context.view_layer.update()
  world=o.matrix_world.copy()
  # Bake structural modifiers before decimation. The cord uses Array/Curve
  # modifiers to form its full length; clearing them exports only a tiny segment.
  mesh=bpy.data.meshes.new_from_object(o.evaluated_get(bpy.context.evaluated_depsgraph_get()))
  original=o;o=bpy.data.objects.new(source_name+'_surface',mesh);o.matrix_world=world;bpy.context.scene.collection.objects.link(o);bpy.data.objects.remove(original,do_unlink=True)
  if not len(o.data.polygons):continue
  o.data.materials.clear()
  o['structure']=mapping[source_name];o['source_name']=source_name
  for f in o.data.polygons:f.use_smooth=True
  if len(o.data.polygons)>6500:
   m=o.modifiers.new('Teaching mesh optimisation','DECIMATE');m.ratio=6500/len(o.data.polygons)
  exported.append({'name':source_name,'structure':o['structure'],'bounds_m':[float(v) for v in o.dimensions]});o.select_set(False)
 for o in bpy.context.scene.objects:o.select_set(o.type=='MESH')
 path=os.path.join(a.output,kind+'-atlas-v1.glb')
 bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,export_apply=True,export_extras=True,export_cameras=False,export_lights=False,export_animations=False,export_copyright='Z-Anatomy / Gauthier Kervyn and Marcin Zielinski; BodyParts3D / DBCLS, Kousaku Okubo. CC BY-SA 4.0 atlas adaptation.')
 data=open(path,'rb').read();manifest['assets'].append({'kind':kind,'file':os.path.basename(path),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'structures':exported});print('EXPORTED',kind,len(data),exported)
json.dump(manifest,open(os.path.join(a.output,'systems-manifest.json'),'w'),indent=2)
