const PRESETS=[
 {id:'black',label:'검정 펜',color:'#202020',tool:'pen'},
 {id:'red',label:'빨강 펜',color:'#C83232',tool:'pen'},
 {id:'blue',label:'파랑 펜',color:'#2861BA',tool:'pen'},
 {id:'yellow',label:'노랑 형광펜',color:'#FFE04A',tool:'highlighter'},
 {id:'green',label:'연두 형광펜',color:'#A8E65B',tool:'highlighter'},
 {id:'pink',label:'분홍 형광펜',color:'#FF91BD',tool:'highlighter'}
];
const PEN_WIDTHS=[2,3,5,8],MARKER_WIDTHS=[16,24,32];
function strokeOpacity(stroke){return stroke.tool==='highlighter'?.3:1;}
function createPenTools({container,el,button,onSelect=()=>{},onUndo,actions=true}){
 let selected=PRESETS[0],mode='pen',penWidth=3,markerWidth=24;
 const buttons=[];
 const sizes=el('select',null,{'aria-label':'선 굵기'});
 const update=()=>{
  for(const[preset,b]of buttons)b.setAttribute('aria-pressed',String(mode!=='eraser'&&selected.id===preset.id));
  eraser?.setAttribute('aria-pressed',String(mode==='eraser'));
  sizes.replaceChildren();for(const value of selected.tool==='highlighter'?MARKER_WIDTHS:PEN_WIDTHS)sizes.append(el('option',(selected.tool==='highlighter'?'형광펜 ':'펜 ')+value+' · '+({2:'가는 선',3:'기본',5:'굵은 선',8:'매우 굵게',16:'좁게',24:'기본',32:'넓게'}[value]),{value:String(value)}));sizes.value=String(selected.tool==='highlighter'?markerWidth:penWidth);
 };
 let eraser;
 for(const preset of PRESETS){const b=button(preset.label,()=>{selected=preset;mode=preset.tool;update();onSelect(mode);},{'data-pen-preset':preset.id,'aria-pressed':String(preset.id==='black')});b.style.setProperty('--swatch',preset.color);buttons.push([preset,b]);container.append(b);}
 if(actions){eraser=button('지우개',()=>{mode='eraser';update();onSelect(mode);},{'aria-pressed':'false'});container.append(eraser,button('되돌리기',()=>onUndo?.()));}
 sizes.onchange=()=>{if(selected.tool==='highlighter')markerWidth=Number(sizes.value);else penWidth=Number(sizes.value);};container.append(sizes);update();
 return {mode:()=>mode,color:()=>selected.color,width:()=>selected.tool==='highlighter'?markerWidth:penWidth,tool:()=>selected.tool,selectMode(value){mode=value;if(value==='pen'&&selected.tool!=='pen')selected=PRESETS[0];if(value==='highlighter'&&selected.tool!=='highlighter')selected=PRESETS[3];update();}};
}
module.exports={PRESETS,PEN_WIDTHS,MARKER_WIDTHS,strokeOpacity,createPenTools};
