import bpy, json, os, sys, argparse
parser=argparse.ArgumentParser(description="Export the attributed respiratory subset of the Z-Anatomy atlas")
parser.add_argument("--input",required=True)
parser.add_argument("--output",required=True)
args=parser.parse_args(sys.argv[sys.argv.index("--")+1:])
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
lobes={'Superior lobe of right lung':'right_upper','Middle lobe of right lung':'right_middle','Inferior lobe of right lung':'right_lower','Superior lobe of left lung':'left_upper','Inferior lobe of left lung':'left_lower'}
with bpy.data.libraries.load(args.input,link=False) as (source,target):
 target.objects=[n for n in source.objects if n in lobes or n in ['Trachea','Diaphragm'] or 'bronchus' in n.lower()]
selected=[]
for obj in target.objects:
 if not obj or obj.type not in ['MESH','CURVE']:continue
 bpy.context.scene.collection.objects.link(obj);obj.hide_set(False);obj.hide_viewport=False;obj.hide_render=False
 bpy.context.view_layer.update()
 if obj.type=='CURVE':
  print('SOURCE_CURVE',obj.name,'scale',list(obj.scale),'bevel',obj.data.bevel_depth,'profile',obj.data.bevel_object.name if obj.data.bevel_object else None,'radius',obj.data.splines[0].points[0].radius if obj.data.splines and obj.data.splines[0].points else 'bezier')
  bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.convert(target='MESH');obj=bpy.context.object
 if len(obj.data.vertices)<8:continue
 obj.parent=None
 print('EXPORT_PART',obj.name,len(obj.data.vertices),'bounds',list(obj.dimensions))
 if max(obj.dimensions)>.7:continue
 source_name=obj.name
 obj.name=lobes.get(source_name,'trachea' if source_name=='Trachea' else 'diaphragm' if source_name=='Diaphragm' else 'airway_'+source_name.lower().replace(' ','_'))
 obj['anatomy_source']='Z-Anatomy / BodyParts3D'
 obj['source_name']=source_name
 obj.modifiers.clear()
 obj.data.materials.clear()
 mat=bpy.data.materials.new(obj.name+'_material');mat.diffuse_color=(.55,.22,.25,1) if source_name in lobes else (.48,.16,.2,1) if source_name=='Diaphragm' else (.85,.69,.61,1)
 obj.data.materials.append(mat)
 for face in obj.data.polygons:face.use_smooth=True
 # Smooth the original atlas surfaces without inventing their anatomical silhouette.
 if source_name in lobes:
  mod=obj.modifiers.new('Atlas surface smoothing','SUBSURF');mod.levels=1;mod.render_levels=1
 selected.append(obj)
bpy.ops.object.select_all(action='DESELECT')
for obj in selected:obj.select_set(True)
bpy.context.view_layer.update()
coords=[obj.matrix_world @ Vector(corner) for obj in selected for corner in obj.bound_box]
lo=Vector(tuple(min(v[i] for v in coords) for i in range(3)));hi=Vector(tuple(max(v[i] for v in coords) for i in range(3)));print('ATLAS_BOUNDS',list(lo),list(hi),'COUNT',len(selected))
# Keep metric source coordinates and anatomical orientation; the viewer centres and scales at load time.
out=args.output;os.makedirs(out,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=out+'/respiratory-atlas.glb',export_format='GLB',use_selection=True,export_apply=True,export_extras=True,export_cameras=False,export_lights=False,export_animations=False,export_copyright='Z-Anatomy / Gauthier Kervyn and Marcin Zielinski; BodyParts3D / DBCLS, Kousaku Okubo. CC BY-SA 4.0 atlas adaptation.')
print('EXPORTED_RESPIRATORY',len(selected),os.path.getsize(out+'/respiratory-atlas.glb'))

# Retain machine-readable provenance inside the model and next to it.
import struct, hashlib
asset_path=os.path.join(out,'respiratory-atlas.glb')
with open(asset_path,'rb') as stream:
    magic,version,total=struct.unpack('<III',stream.read(12))
    size,chunk_type=struct.unpack('<II',stream.read(8))
    document=json.loads(stream.read(size));binary=stream.read()
document['asset']['extras']={
    'license':'https://creativecommons.org/licenses/by-sa/4.0/',
    'source':'https://github.com/Z-Anatomy/Models-of-human-anatomy',
    'sourceCommit':'6ffffec1d9b17ed3db355903bbd762582cb2328e',
    'modifications':'Respiratory subset, curve-to-mesh conversion, smooth subdivision of lung-lobe surfaces, glTF export. Teaching materials and breathing motion applied at runtime.'
}
encoded=json.dumps(document,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4)
with open(asset_path,'wb') as stream:
    stream.write(struct.pack('<III',magic,version,12+8+len(encoded)+len(binary)))
    stream.write(struct.pack('<II',len(encoded),chunk_type));stream.write(encoded);stream.write(binary)
with open(asset_path,'rb') as stream:digest=hashlib.sha256(stream.read()).hexdigest()
manifest={'source':document['asset']['extras'],'sha256':digest,'bytes':os.path.getsize(asset_path),'nodes':[{'id':node['name'],'sourceName':node.get('extras',{}).get('source_name')} for node in document['nodes']]}
with open(os.path.join(out,'manifest.json'),'w') as stream:json.dump(manifest,stream,indent=2);stream.write('\n')
