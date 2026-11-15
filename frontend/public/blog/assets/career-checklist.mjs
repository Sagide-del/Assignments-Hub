// Progressive enhancement: native checkboxes work without JavaScript.
// No form data, analytics calls or browser storage are used by this checklist.
export function enhanceCareerChecklist(root=document){
 const inputs=[...root.querySelectorAll('.career-checklist input[type="checkbox"]')];
 const progress=root.querySelector('#career-checklist-progress');
 const reset=root.querySelector('#career-checklist-reset');
 if(!inputs.length||!progress||!reset)return;
 const update=()=>{progress.textContent=`${inputs.filter(input=>input.checked).length} of ${inputs.length} steps checked`;};
 progress.hidden=false;reset.hidden=false;
 inputs.forEach(input=>input.addEventListener('change',update));
 reset.addEventListener('click',()=>{inputs.forEach(input=>{input.checked=false;});update();inputs[0].focus();});
 update();
}
if(typeof document!=='undefined')enhanceCareerChecklist();
