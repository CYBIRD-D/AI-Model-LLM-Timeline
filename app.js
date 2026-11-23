"use strict";
const COMPANIES={oai:{name:"OpenAI",color:"#94a6ff"},anth:{name:"Anthropic",color:"#ce9980"},goog:{name:"Google DeepMind",color:"#5c9bee"},meta:{name:"Meta",color:"#9e8bee"},mis:{name:"Mistral AI",color:"#f3a563"},deep:{name:"DeepSeek",color:"#46bfaf"},qwen:{name:"Alibaba Qwen",color:"#e8b459"},xai:{name:"xAI",color:"#95a0af"},glm:{name:"Zhipu AI / GLM",color:"#c790e8"},hy:{name:"Tencent Hunyuan",color:"#75bcd7"},moon:{name:"Moonshot AI",color:"#73cce0"},mini:{name:"MiniMax",color:"#ed8aa7"}};
const COMPANY_ORDER=Object.keys(COMPANIES);
const CAPS=["General","Reasoning","Multimodal","Coding"];
const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const LABEL_W=()=>matchMedia("(max-width:780px)").matches?114:151;
const $=id=>document.getElementById(id);
const escapeHTML=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dUTC=s=>Date.parse(s+"T00:00:00Z");
const days=(a,b)=>(dUTC(b)-dUTC(a))/86400000;
const iso=(y,m=1,d=1)=>new Date(Date.UTC(y,m-1,d)).toISOString().slice(0,10);
const fmt=d=>{const [y,m,day]=d.split("-");return MONTHS[Number(m)-1]+" "+Number(day)+", "+y;};
const shortDate=value=>value.slice(2);
const monthStart=key=>key+"-01";
const monthAfter=key=>{const [y,m]=key.split("-").map(Number);return iso(y,m+1).slice(0,7);};
const yearFromMonth=key=>Number(key.slice(0,4));
const MAX_ZOOM=2.8;
const DOT_HIT_SIZE=24;
const DOT_TIERS={flagship:"Flagship",secondary:"Secondary",other:"Other"};
const DENSITIES={
 overview:{button:"overviewBtn",label:"Nearby releases grouped",note:"Click a group to inspect every release."},
 detail:{button:"detailBtn",label:"Same-day model families grouped",note:"Click a Family card to see its members."},
 models:{button:"modelsBtn",label:"Individual models · families kept together",note:"Click any card to see the full model names."},
 dots:{button:"dotsBtn",label:"Model tiers at launch",note:"Hover or focus a dot to preview the models. Click or tap for details."}
};
const validMonth=value=>/^\d{4}-(0[1-9]|1[0-2])$/.test(value);
const state={data:[],query:"",companies:new Set(COMPANY_ORDER),availability:new Set(["open","closed"]),capabilities:new Set(CAPS),fromMonth:"2025-01",toMonth:"2026-05",mode:"timeline",density:"detail",zoom:1.3,filtersCollapsed:false,expanded:false,drawer:null,listLimit:120};
let datasetMeta={},toastTimeout,previousFocus=null,resizeTimer,firstDataMonth,lastDataMonth,lastSelectableMonth;
let activeMonthField=null,calendarYear=0,activeDot=null;
function tell(message){const el=$("toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove("show"),2800);}
function prettyMonth(value,compact=false){
 if(!validMonth(value))return "Select month";
 const year=value.slice(0,4);
 return MONTHS[Number(value.slice(5))-1]+" "+(compact?shortDate(year):year);
}
function syncMonthButtons(){
 for(const field of ["fromMonth","toMonth"]){
  const button=$(field);
  $(field+"Text").textContent=prettyMonth(state[field],true);
  button.title=prettyMonth(state[field]);
  button.dataset.month=state[field];
  button.setAttribute("aria-expanded",String(activeMonthField===field&&!$("monthPickerPopup").hidden));
 }
}
function renderMonthPicker(){
 if(!activeMonthField)return;
 const firstYear=yearFromMonth(firstDataMonth),lastYear=yearFromMonth(lastSelectableMonth);
 calendarYear=Math.max(firstYear,Math.min(lastYear,calendarYear));
 $("calYear").innerHTML=Array.from({length:lastYear-firstYear+1},(_,i)=>firstYear+i).map(y=>'<option value="'+y+'"'+(y===calendarYear?' selected':'')+'>'+y+'</option>').join("");
 $("calYear").value=String(calendarYear);
 $("calPrevYear").disabled=calendarYear<=firstYear;
 $("calNextYear").disabled=calendarYear>=lastYear;
 $("monthPickerPopup").setAttribute("aria-label","Choose "+(activeMonthField==="fromMonth"?"starting":"ending")+" month");
 $("calMonthGrid").innerHTML=MONTHS.map((name,i)=>{
  const key=String(calendarYear)+"-"+String(i+1).padStart(2,"0");
  const selected=key===state[activeMonthField],unavailable=key<firstDataMonth||key>lastSelectableMonth;
  return '<button type="button" class="calendar-month'+(selected?' is-selected':'')+'" data-month="'+key+'"'+(unavailable?' disabled':'')+' aria-pressed="'+selected+'" aria-label="'+name+" "+calendarYear+'">'+name+'</button>';
 }).join("");
 syncMonthButtons();
}
function closeMonthPicker(restoreFocus=false){
 if(!activeMonthField)return;
 const trigger=$(activeMonthField);
 $("monthPickerPopup").hidden=true;
 $("dateGroup").classList.remove("date-picker-open");
 activeMonthField=null;
 syncMonthButtons();
 if(restoreFocus)trigger.focus();
}
function openMonthPicker(field){
 if(activeMonthField===field&&!$("monthPickerPopup").hidden){closeMonthPicker(true);return;}
 activeMonthField=field;
 calendarYear=yearFromMonth(state[field]);
 $("monthPickerPopup").hidden=false;
 $("dateGroup").classList.add("date-picker-open");
 renderMonthPicker();
 const current=$("calMonthGrid").querySelector('.calendar-month.is-selected:not([disabled])');
 if(current)current.focus();else $("calYear").focus();
}
function chooseMonth(value){
 if(!activeMonthField||!validMonth(value)||value<firstDataMonth||value>lastSelectableMonth)return;
 const field=activeMonthField;
 state[field]=value;
 if(state.fromMonth>state.toMonth){
  state[field==="fromMonth"?"toMonth":"fromMonth"]=value;
 }
 closeMonthPicker(true);
 draw({keepScroll:false});
}
function paramsRead(){
 const url=new URL(location.href),q=url.searchParams;
 state.query=q.get("q")||"";
 for(const [key,field,allowed] of [["companies","companies",COMPANY_ORDER],["availability","availability",["open","closed"]],["capabilities","capabilities",CAPS]])if(q.has(key))state[field]=new Set((q.get(key)||"").split(",").filter(x=>allowed.includes(x)));
 if(Object.hasOwn(DENSITIES,q.get("density")))state.density=q.get("density");
 if(["timeline","list"].includes(q.get("view")))state.mode=q.get("view");
 const z=Number(q.get("zoom"));if(q.has("zoom")&&Number.isFinite(z))state.zoom=Math.min(MAX_ZOOM,Math.max(.4,z));
 state._from=q.get("from");state._to=q.get("to");
 if(state.zoom>=MAX_ZOOM&&state.density!=="dots")state.density="models";
}
function paramsWrite(){
 const url=new URL(location.href),q=url.searchParams;q.delete("q");q.delete("companies");q.delete("availability");q.delete("capabilities");q.delete("from");q.delete("to");q.delete("view");q.delete("density");q.delete("zoom");
 if(state.query)q.set("q",state.query);
 if(state.companies.size!==COMPANY_ORDER.length)q.set("companies",[...state.companies].join(","));
 if(state.availability.size!==2)q.set("availability",[...state.availability].join(","));
 if(state.capabilities.size!==CAPS.length)q.set("capabilities",[...state.capabilities].join(","));
 q.set("from",state.fromMonth);q.set("to",state.toMonth);
 if(state.mode!=="timeline")q.set("view",state.mode);
 if(state.density!=="detail")q.set("density",state.density);
 if(state.zoom!==1.3)q.set("zoom",state.zoom);
 history.replaceState(null,"",url);
}
function filtered(){
 const q=state.query.trim().toLowerCase();
 return state.data.filter(e=>e.date.slice(0,7)>=state.fromMonth&&e.date.slice(0,7)<=state.toMonth&&state.companies.has(e.company)&&state.availability.has(e.availability)&&e.capabilities.some(x=>state.capabilities.has(x))&&(!q||[e.title,e.company,COMPANIES[e.company]?.name,e.date,...e.models,...e.capabilities].join(" ").toLowerCase().includes(q)));
}
function buildFilters(){
 const counts=Object.fromEntries(COMPANY_ORDER.map(code=>[code,state.data.filter(e=>e.company===code).length]));
 $("companyFilters").innerHTML=COMPANY_ORDER.map(code=>'<label class="filter-choice"><input type="checkbox" data-company="'+code+'" '+(state.companies.has(code)?"checked":"")+'><span class="company-color" style="background:'+COMPANIES[code].color+'"></span><span class="choice-name">'+escapeHTML(COMPANIES[code].name)+'</span><span class="choice-count">'+counts[code]+'</span></label>').join("");
 $("availabilityFilters").innerHTML=["open","closed"].map(a=>'<label class="filter-choice"><input type="checkbox" data-av="'+a+'" '+(state.availability.has(a)?"checked":"")+'><span class="legend-dot '+(a==="open"?"legend-open":"legend-closed")+'"></span><span class="choice-name">'+(a==="open"?"Open":"Closed")+'</span></label>').join("");
 $("capabilityFilters").innerHTML=CAPS.map(c=>'<button class="cap-pill '+(state.capabilities.has(c)?"active":"")+'" type="button" data-cap="'+c+'" aria-pressed="'+state.capabilities.has(c)+'">'+c+'</button>').join("");
}
function syncButtons(){
 $("timelineTab").classList.toggle("active",state.mode==="timeline");$("listTab").classList.toggle("active",state.mode==="list");
 $("timelineTab").setAttribute("aria-pressed",state.mode==="timeline");$("listTab").setAttribute("aria-pressed",state.mode==="list");
 $("timelineView").hidden=state.mode!=="timeline";$("listView").hidden=state.mode!=="list";
 $("resultsTitle").textContent=state.mode==="list"?"Release directory":"Timeline overview";
 for(const [density,{button}] of Object.entries(DENSITIES)){
  const active=density===state.density;
  $(button).classList.toggle("active",active);
  $(button).setAttribute("aria-pressed",String(active));
 }
 $("densityLabel").textContent=DENSITIES[state.density].label;
 $("zoomRange").value=String(state.zoom);
 $("groupingNote").textContent=DENSITIES[state.density].note;
}
function draw({keepScroll=true}={}){
 hideDotPreview();
 const scroll=$("timelineScroll"),left=scroll.scrollLeft,top=scroll.scrollTop;
 buildFilters();syncButtons();syncMonthButtons();
 const entries=filtered();
 $("resultsCount").textContent=entries.length.toLocaleString()+" release groups · "+new Set(entries.map(e=>e.company)).size+" companies";
 if(state.mode==="timeline")drawTimeline(entries);else drawList(entries);
 if(keepScroll){scroll.scrollLeft=Math.min(left,Math.max(0,scroll.scrollWidth-scroll.clientWidth));scroll.scrollTop=top;}
 paramsWrite();
}
function timelineX(start,date,scale){
 const inset=state.density==="dots"?DOT_HIT_SIZE/2:0;
 return days(start,date)*scale+inset;
}
function makeGrid(px,start){
 const marks=[];let key=state.fromMonth;
 while(key<=state.toMonth){
  const pos=timelineX(start,monthStart(key),px);
  marks.push('<i aria-hidden="true" class="grid-tick '+(key.slice(5)==="01"?"year":"")+'" style="left:'+pos.toFixed(1)+'px"></i>');
  key=monthAfter(key);
 }
 return marks.join("");
}
/**
 * Only expand variant lists when the original data explicitly supplies sizes or suffixes.
 * Ambiguous alias/family text remains unchanged instead of inventing model identifiers.
 */
function expandModelName(raw){
 const label=String(raw||"").trim();
 if(!label)return [];
 const qwenFamily=label.match(/^(Qwen\d+(?:\.\d+)?) Family \(([\w.\s/-]+)\)$/i);
 if(qwenFamily){
  const sizes=qwenFamily[2].split(/\s*\/\s*/).map(x=>x.trim()).filter(Boolean);
  if(sizes.length>1&&sizes.every(x=>/^\d+(?:\.\d+)?B(?:-A\d+(?:\.\d+)?B)?$/.test(x)))return sizes.map(x=>qwenFamily[1]+"-"+x);
 }
 const slashSizes=label.match(/^(.*?)(\d+(?:\.\d+)?B(?:-A\d+(?:\.\d+)?B)?)(\s*\/\s*\d+(?:\.\d+)?B(?:-A\d+(?:\.\d+)?B)?(?:\s*\/\s*\d+(?:\.\d+)?B(?:-A\d+(?:\.\d+)?B)?)*)$/);
 if(slashSizes){const sizes=[slashSizes[2],...slashSizes[3].trim().split(/\s*\/\s*/).filter(Boolean)];if(sizes.length>1)return sizes.map(x=>slashSizes[1]+x);}
 const inThinking=label.match(/^(.*-)(Instruct)\s*\/\s*(Thinking)$/i);
 if(inThinking)return [inThinking[1]+inThinking[2],inThinking[1]+inThinking[3]];
 const sizeParentheses=label.match(/^(.+?)\s*\(([^()]+)\)$/);
 if(sizeParentheses&&/(?:Gemma|Qwen)/i.test(sizeParentheses[1])){
  const sizes=sizeParentheses[2].split(/\s*,\s*|\s*\/\s*/).filter(Boolean);
  if(sizes.length>1&&sizes.every(x=>/^(?:E?\d+(?:\.\d+)?B(?:\s*A\d+B)?|\d+M)$/.test(x)))return sizes.map(x=>sizeParentheses[1]+" "+x);
 }
 const gemini=label.match(/^(Gemini\s+\d+(?:\.\d+)?)\s*\(\s*(Ultra\s*\/\s*Pro\s*\/\s*Nano)\s*\)$/i);
 if(gemini)return gemini[2].split(/\s*\/\s*/).map(x=>gemini[1]+" "+x);
 const abab=label.match(/^(abab[\w.]+)\s*\/\s*(abab[\w.-]+)$/i);
 if(abab)return [abab[1],abab[2]];
 return [label];
}
function expandModelNames(names){
 return [...new Set(names.flatMap(expandModelName).filter(Boolean))];
}

// Company tracks repeat the provider name. Keep the rest of the title intact.
function cardLabel(name,company){
 const prefixes={oai:/\bGPT-(?=\d)/gi,anth:/\bClaude\s+/gi,goog:/\bGemini\s+/gi,meta:/^(?:Meta\s+|Llama[\s-]+)(?=\S)/i,mis:/^Mistral[\s-]+/i,deep:/^DeepSeek[\s-]+/i,qwen:/^Qwen[\s-]*(?=\d|VL\b)/i,xai:/^Grok[\s-]+/i,glm:/^GLM[\s-]+/i,moon:/^Kimi[\s-]+/i,mini:/^MiniMax[\s-]+/i};
 const short=String(name).replace(prefixes[company]||/^$/,"").trim();
 return short||name;
}

// Derive these families from model identifiers, not legacy titles such as
// "Qwen3 family", "Gemma 2 family" or "GLM-4 family" that mixed subseries.
function parameterFamily(name,company){
 let value=String(name).replace(/\s+Family\b/i,"").trim();
 if(company==="qwen"&&/^Qwen(?:\d|[-\s])/i.test(value)){
  const match=value.match(/^(Qwen(?:\d+(?:\.\d+)*)?)(.*)$/i);
  if(!match)return null;
  let suffix=match[2];
  suffix=suffix.replace(/[-\s]+\d+(?:\.\d+)?[BMT](?:[-\s]+A\d+(?:\.\d+)?B)?(?=$|[-\s])/gi,"");
  suffix=suffix.replace(/[-\s]+(?:Instruct|Thinking|Base)(?=$|[-\s])/gi,"");
  suffix=suffix.replace(/^[-\s]+|[-\s]+$/g,"");
  return match[1]+(suffix?"-"+suffix.replace(/\s+/g,"-"):"");
 }
 if(company==="goog"&&/^(?:Gemma|CodeGemma|PaliGemma|RecurrentGemma|DataGemma|MedGemma|T5Gemma|FunctionGemma|TranslateGemma|VaultGemma)\b/i.test(value)){
  // E2B/E4B, 270M, 26B A4B: parameter counts are not separate series.
  // Keep 3n, JPN, mix, v2 and multimodal qualifiers in the family key.
  return value.replace(/\s*\(\s*(?:E?\d+(?:\.\d+)?[BMT](?:[-\s]+A\d+(?:\.\d+)?B)?)\s*\)/gi,"")
   .replace(/\s+E?\d+(?:\.\d+)?[BMT](?:[-\s]+A\d+(?:\.\d+)?B)?(?=$|\s)/gi,"").replace(/\s+/g," ").trim();
 }
 if(company==="glm"&&/^(?:ChatGLM\d*|GLM[-\s])\b/i.test(value)&&/[-\s]\d+(?:\.\d+)?B(?=$|[-\s])/i.test(value)){
  // B denotes parameters here; 1M is a context variant. Keep V, Z1,
  // Rumination and dated checkpoints separate, while Base/Chat/Instruct
  // variants of the same parameter family share one card.
  return value.replace(/[-\s]+\d+(?:\.\d+)?B(?=$|[-\s])/gi,"")
   .replace(/[-\s]+(?:Base|Chat|Instruct)(?=$|[-\s])/gi,"")
   .replace(/\s+/g,"-").replace(/-+$/g,"");
 }
 return null;
}

function splitModelSeries(event){
 if(!["qwen","goog","glm"].includes(event.company))return [{event,family:null}];
 const names=expandModelNames(event.models),groups=new Map();
 for(const name of names){
  const family=parameterFamily(name,event.company);
  const key=family||name;
  if(!groups.has(key))groups.set(key,{family,names:[]});
  groups.get(key).names.push(name);
 }
 // Model names without parameters retain explicitly declared family rules.
 if(![...groups.values()].some(group=>group.family))return [{event,family:null}];
 return [...groups.values()].map(group=>{
  const title=group.names.length>1&&group.family?group.family+" Family":groups.size===1&&!/\s+family$/i.test(event.title)?event.title:group.names[0];
  return {family:group.family,event:{...event,models:group.names,title}};
 });
}

const NAMED_FAMILY_MEMBERS={
 oai:new Map([
  ["o1",/^(?:OpenAI\s+)?o1(?:-(?:preview|mini|pro)|\s+pro\s+mode)?$/i],
  ["gpt-oss",/^gpt-oss-\d+(?:\.\d+)?b$/i],
  ["codex-1",/^(?:codex-1|codex-mini-latest)$/i]
 ]),
 mis:new Map([
  ["ministral 3",/^Ministral 3\s*-\s*\d+B$/i],
  ["devstral 2",/^Devstral(?: Small)? 2$/i],
  ["voxtral",/^Voxtral (?:Small|Mini)$/i]
 ]),
 meta:new Map([["muse wonder",/^Muse Wonder(?: Full)?$/i]])
};
function familyNameForEvent(event){
 const title=String(event.title||"").trim();
 if(!/\s+family$/i.test(title))return null;
 const family=title.replace(/\s+family$/i,"").trim();
 const names=expandModelNames(event.models);
 if(names.length<2)return null;
 const rule=NAMED_FAMILY_MEMBERS[event.company]?.get(family.toLowerCase());
 if(rule)return names.every(name=>rule.test(name))?family+" Family":null;
 const escaped=family.replace(/[-/\\^$*+?.()|[\]{}]/g,"\\$&");
 let match;
 if(/^Claude\s+\d+(?:\.\d+)?$/i.test(family)){
  const version=family.slice("Claude ".length).replaceAll(".","\\.");
  match=name=>new RegExp("^Claude\\s+(?:(?:Opus|Sonnet|Haiku|Instant)\\s+)?"+version+"(?=$|[-\\s])","i").test(name);
 }else if(/^(?:GPT-\d+(?:\.\d+)*|Qwen\d+(?:\.\d+)*|Gemma\s+\d+(?:\.\d+)*|Gemini\s+\d+(?:\.\d+)*|Llama\s+\d+(?:\.\d+)*|DeepSeek-[A-Z]\d+(?:\.\d+)*|GLM-\d+(?:\.\d+)*)$/i.test(family)){
  match=name=>new RegExp("^"+escaped+"(?=$|[\\s-])","i").test(name);
 }else return null;
 return names.every(match)?family+" Family":null;
}
function groupSameDayFamilies(entries){
 const grouped=new Map(),standalone=[];
 for(const entry of entries)for(const {event:e,family:inferred} of splitModelSeries(entry)){
  const family=inferred?inferred+" Family":familyNameForEvent(e);
  if(!family){standalone.push({events:[e],date:e.date,name:e.title,grouped:false});continue;}
  const key=[e.date,e.company,e.availability,family.toLowerCase()].join("|");
  if(!grouped.has(key))grouped.set(key,{events:[],date:e.date,name:family,grouped:true,family:true,inferred:!!inferred});
  grouped.get(key).events.push(e);
 }
 for(const item of grouped.values()){
  const models=expandModelNames(item.events.flatMap(e=>e.models));
  if(item.inferred&&models.length===1){item.name=item.events[0].title;item.family=false;item.grouped=false;}
 }
 return [...standalone,...grouped.values()];
}
let measuredTextContext=null;
function textWidthApprox(text,font="710 10.1px system-ui"){
 // Use real browser font metrics so shrinking the card never clips a model name.
 if(!measuredTextContext&&typeof document!=="undefined"){
  try{measuredTextContext=document.createElement("canvas").getContext("2d");}catch{}
 }
 if(measuredTextContext){
  measuredTextContext.font=font;
  return measuredTextContext.measureText(text).width;
 }
 let width=0;
 for(const char of text){
  if(/[il1.,': ]/.test(char))width+=3.2;
  else if(/[WMW@]/.test(char))width+=8.2;
  else if(/[A-Z]/.test(char))width+=6.5;
  else if(/[^\u0000-\u00ff]/.test(char))width+=10.5;
  else width+=5.6;
 }
 return width;
}
function wrapCardTitle(label,maxWidth){
 const lines=[];let current="";
 const fits=value=>textWidthApprox(value)<=maxWidth;
 for(const char of Array.from(label)){
  if(current&&!fits(current+char)){
   let split=-1;
   for(let i=2;i<current.length;i++){
    if(" -/".includes(current[i-1])&&fits(current.slice(0,i)))split=i;
   }
   if(split>0){
    lines.push(current.slice(0,split).trimEnd());
    current=current.slice(split).trimStart()+char;
   }else{
    lines.push(current);
    current=char;
   }
  }else current+=char;
 }
 if(current)lines.push(current);
 return lines.length?lines:[""];
}
function compactCardMetrics(name,date){
 const lines=wrapCardTitle(name,108);
 const dateWidth=textWidthApprox(shortDate(date),"400 8.5px system-ui");
 const lineWidth=Math.max(...lines.map(line=>textWidthApprox(line)));
 // The side borders and padding use 13 px. Allow 2 px for font rounding.
 const width=Math.ceil(Math.max(dateWidth,lineWidth))+15;
 const height=Math.ceil(17+lines.length*12.5);
 return {width,height,lines};
}
function layoutEvents(entries,scale){
 const gap=6,rowGap=4;
 const releases=groupSameDayFamilies(entries);
 let items=[];
 if(state.density==="overview"){
   const buckets=new Map(),windowDays=Math.max(28,Math.min(115,Math.round(105/Math.max(.4,state.zoom))));
   for(const release of releases){
     // Family cards stay atomic at every zoom; never obscure inferred subseries.
     if(release.family||release.events.some(e=>e.company==="qwen"||e.company==="glm"||e.company==="goog"&&e.models.some(m=>/gemma/i.test(m)))){items.push(release);continue;}
     const e=release.events[0];
     const bucket=Math.floor(days(monthStart(state.fromMonth),e.date)/windowDays);
     if(!buckets.has(bucket))buckets.set(bucket,[]);
     buckets.get(bucket).push(e);
   }
   items.push(...[...buckets.values()].map(list=>({events:list,date:list[0].date,name:list.length===1?list[0].title:list.length+" releases",grouped:list.length>1})));
 }else if(state.density==="models"){
   // All models does not break apart same-day family releases.
   // The family card keeps its original member list in the detail drawer.
   for(const release of releases){
     if(release.family){
       items.push(release);
       continue;
     }
     for(const e of release.events){
       const names=expandModelNames(e.models.length?e.models:[e.title]);
       for(const name of names){
         const label=names.length===1&&!/\bfamily\b/i.test(e.title)?e.title:name;
         items.push({events:[e],date:e.date,name:label,model:label,grouped:false});
       }
     }
   }
 }else items=releases;
 items.sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name));
 const occupied=[],rowHeights=[],cards=[];
 for(const item of items){
  const metrics=compactCardMetrics(cardLabel(item.name,item.events[0].company),item.date);
  const x=days(monthStart(state.fromMonth),item.date)*scale;
  let row=occupied.findIndex(end=>end+gap<=x);
  if(row<0){row=occupied.length;occupied.push(x+metrics.width);rowHeights.push(metrics.height);}
  else{occupied[row]=x+metrics.width;rowHeights[row]=Math.max(rowHeights[row],metrics.height);}
  cards.push({item,row,x,metrics});
 }
 const rowTops=[];let offset=6;
 for(let i=0;i<rowHeights.length;i++){rowTops.push(offset);offset+=rowHeights[i]+rowGap;}
 const html=cards.map(({item,row,x,metrics})=>{
  const company=COMPANIES[item.events[0].company];
  const fullName=escapeHTML(item.name);
  const fullDate=escapeHTML(item.date);
  const nameLines=metrics.lines.map(escapeHTML).join("<br>");
  const family=item.family?" family-card":"";
  const card='<button type="button" aria-label="'+fullName+' — '+fullDate+'" class="event-card compact-card'+family+' '+(item.grouped&&!item.family?"grouped ":"")+(item.model?"model-level":"")+'" data-id="'+escapeHTML(item.events[0].id)+'" data-group="'+(item.grouped?"true":"false")+'" data-model="'+escapeHTML(item.model||"")+'" style="left:'+x.toFixed(1)+'px;top:'+rowTops[row]+'px;width:'+metrics.width+'px;height:'+metrics.height+'px;--event-color:'+company.color+'" title="'+fullName+' — '+fullDate+'"><span class="event-name">'+nameLines+'</span><time class="event-date" datetime="'+fullDate+'">'+escapeHTML(shortDate(item.date))+'</time></button>';
  return {html:card,events:item.events};
 });
 return {height:Math.max(57,offset+3),cards:html};
}
const groupRecords=new Map();

// Follow each provider's lineup at launch. A suffix such as Sonnet or Flash
// has a different role across providers and generations. Unmatched models use Other.
const DOT_TIER_RULES={
 oai:{
  flagship:[/^ChatGPT \/ GPT-3\.5 series$|^GPT-3\.5 Turbo$/i,/^GPT-4(?:V|o|\.1|\.5)?(?:$| (?!mini\b|nano\b))/i,/^GPT-5(?:\.[1-5])?(?:$| (?:Thinking|Pro)$)/i,/^GPT-(?:5\.6 Sol|6(?:\.\d+)? Astra)\b/i,/^(?:OpenAI )?o[13](?:$|-(?:preview|pro)$| pro mode$)/i,/^gpt-oss-120b$/i],
  secondary:[/^GPT-3\.5 Turbo\b|^GPT-[45](?:\.\d+|o)? (?:mini|Instant)\b/i,/^GPT-(?:5\.6 Terra|6(?:\.\d+)? Sol)\b/i,/^o[134]-mini$|^gpt-oss-20b$/i,/^codex-1$|^GPT-5(?:\.\d+)?-Codex(?:-Max)?$/i]
 },
 anth:{
  flagship:[/^Claude [12]\.\d+$|^Claude (?:Opus|Fable|Mythos)\b|^Claude \d+(?:\.\d+)? (?:Opus|Fable|Mythos)\b/i,/^Claude 3\.[57] Sonnet\b/i],
  secondary:[/^Claude (?:Instant|Sonnet)\b|^Claude \d+(?:\.\d+)? Sonnet\b/i]
 },
 goog:{
  flagship:[/^Gemini (?:1\.0 Ultra|Ultra 1\.0|(?:1\.5|[23](?:\.\d+)?) Pro|2\.5 Deep Think|4 (?:Argon|Carbon))\b/i,/^Gemma (?:1 7B|1\.1|2 27B|3 27B|4 31B)(?:$|\b)/i],
  secondary:[/^Gemini (?:1\.0 Pro|4 Neon)\b|^Gemini \d+(?:\.\d+)? Flash(?:$| )/i,/^Gemma (?:1 2B|2 9B|3 12B|4 26B)\b/i]
 },
 meta:{
  flagship:[/^LLaMA(?: [23](?:\.1)?| 3\.3\b.*| 4 Maverick)?$|^Muse (?:Spark(?: 1\.\d+)?|Wonder Full)$/i],
  secondary:[/^Llama 3\.2\b|^Llama 4 Scout\b|^Muse Wonder$/i]
 },
 mis:{
  flagship:[/^Mistral (?:7B 0\.1|Large \d|Medium (?:1\.0|3\.[015]))\b|^Mixtral 8x(?:7|22)B\b/i],
  secondary:[/^Mistral (?:7B 0\.[23]|Small|NeMo)\b|^Pixtral Large\b|^Magistral Medium\b|^Devstral (?:2|Medium)\b/i]
 },
 deep:{
  flagship:[/^DeepSeek-(?:LLM|V[23](?:\.\d+)?(?:$|-(?!Lite\b))|R1(?:$|-\d{4}$)|V4(?:\.\d+)?-Pro\b)/i],
  secondary:[/^DeepSeek-(?:V2-Lite|R1-(?:Lite|Zero)|V4(?:\.\d+)?-Flash|Coder(?:-V2(?:-Instruct-\d{4})?)?$)\b/i]
 },
 qwen:{
  flagship:[/^Qwen(?:-VL)?(?:\d+(?:\.\d+)?)?-Max\b/i,/^Qwen-(?:7|14|72)B$|^Qwen1\.5-(?:72|110)B\b|^Qwen2(?:\.5)?-72B\b|^Qwen3-235B\b|^Qwen3\.5-397B\b|^Qwen3\.8-2\.4T\b/i],
  secondary:[/^Qwen(?:-VL)?(?:\d+(?:\.\d+)?)?-(?:Plus|Flash|Omni|Next)\b/i,/^Qwen(?:\d+(?:\.\d+)?)?-(?:VL|Coder)-(?:27|30|32|72|235|480)B\b|^Qwen-VL$|^Q(?:wQ|VQ)-/i,/^Qwen(?:\d+(?:\.\d+)?)-(?:14|27|30|32|35|57|122)B\b/i]
 },
 xai:{
  flagship:[/^Grok(?:-1 Base)?$|^Grok[ -](?:[123](?:\.\d+)?(?:-1212)?|4(?: Heavy|\.20 Multi-agent|\.[13567](?: Beta)?))$|^grok-beta$/i],
  secondary:[/^Grok[ -](?:1\.5V|2-vision-1212|4|4 Fast|4\.20 Beta)$|^grok-vision-beta$/i]
 },
 glm:{
  flagship:[/^ChatGLM(?:-130B|[23]-6B)$|^GLM-4(?:$|-0520$|-Plus$|-9B(?:-Chat)?$|-32B(?:-Base)?-0414$)/i,/^GLM-(?:4\.[567]|5(?:\.\d+)?|Z1(?:-Rumination)?-32B-0414)$/i],
  secondary:[/^ChatGLM-6B$|^GLM-(?:4-9B-(?:Chat-1M|0414)|4V-9B|Z1-9B-0414|(?:4\.\d|5\.\d)-(?:Air|Flash))$/i]
 },
 hy:{flagship:[/^Hy4$/i],secondary:[/^Hy4[ -]Flash$/i]},
 moon:{
  flagship:[/^moonshot-v1$|^(?:Kimi[ -])?k1(?:\.5)?$|^Moonlight-16B-A3B$/i,/^Kimi[ -]K(?:2(?:$|-0905$|-thinking$|\.[56]$)|3(?:$|\.1 Pro$))/i],
  secondary:[/^moonshot-v1-auto$|^kimi-thinking-preview$|^Kimi[ -]K2\.(?:7 Code|8 Preview)$|^Kimi-(?:VL|Dev|Linear)\b/i]
 },
 mini:{
  flagship:[/^abab6(?:-chat|\.5)?$|^MiniMax[ -](?:Text-01|M[123](?:\.\d+)?)$/i],
  secondary:[/^abab6\.5s$|^MiniMax[ -]M\d(?:\.\d+)?-Flash$/i]
 }
};
function dotModelTier(company,model){
 const rules=DOT_TIER_RULES[company];
 if(rules?.flagship.some(pattern=>pattern.test(model)))return "flagship";
 if(rules?.secondary.some(pattern=>pattern.test(model)))return "secondary";
 return "other";
}
function layoutDots(entries,scale){
 const tiers=Object.keys(DOT_TIERS),byTier=new Map(tiers.map(tier=>[tier,new Map()]));
 // Use the same release groups as the card views and place each at its highest member tier.
 for(const release of groupSameDayFamilies(entries)){
  const memberTiers=new Set(release.events.flatMap(event=>
   expandModelNames(event.models.length?event.models:[event.title]).map(model=>dotModelTier(event.company,model))
  ));
  const tier=tiers.find(tier=>memberTiers.has(tier))||"other";
  const byDate=byTier.get(tier);
  if(!byDate.has(release.date))byDate.set(release.date,[]);
  byDate.get(release.date).push(release);
 }

 const start=monthStart(state.fromMonth),bands=[],cards=[];
 const minSpacing=14,rowHeight=DOT_HIT_SIZE+2,bandGap=4;
 let top=22;
 for(const [tier,byDate] of byTier){
  if(!byDate.size)continue;
  bands.push({tier,y:top+DOT_HIT_SIZE/2});
  const rows=[];
  for(const date of [...byDate.keys()].sort()){
   const x=timelineX(start,date,scale);
   let row=rows.find(items=>x-items.at(-1).x>=minSpacing);
   if(!row){row=[];rows.push(row);}
   row.push({date,x,releases:byDate.get(date)});
  }
  for(const row of rows){
   for(const [i,{date,x,releases}] of row.entries()){
    // Use narrower targets for neighbors on a dense row so both dots remain selectable.
    const before=row[i-1],after=row[i+1];
    const width=Math.min(DOT_HIT_SIZE,before?x-before.x:Infinity,after?after.x-x:Infinity);
    const events=releases.flatMap(release=>release.events);
    const left=x-width/2,first=events[0];
    const releaseName=releases.length===1?releases[0].name:"";
    const label=escapeHTML((releaseName||releases.length+" releases")+" — "+date+" · "+DOT_TIERS[tier]);
    const style='left:'+left.toFixed(2)+'px;top:'+top+'px;width:'+width.toFixed(2)+'px;height:'+DOT_HIT_SIZE+'px;--dot-color:'+COMPANIES[first.company].color;
    const html='<button type="button" class="event-dot" aria-label="'+label+'" data-id="'+escapeHTML(first.id)+'" data-tier="'+tier+'" data-model="'+escapeHTML(releaseName)+'" data-group="" style="'+style+'"></button>';
    cards.push({html,events});
   }
   top+=rowHeight;
  }
  top+=bandGap;
 }
 return {height:top,bands,cards};
}

function hideDotPreview(){
 if(!activeDot)return false;
 activeDot.removeAttribute("aria-describedby");
 $("dotPreview").hidden=true;
 activeDot=null;
 return true;
}
function showDotPreview(dot){
 if(dot===activeDot)return;
 const entries=groupRecords.get(dot.dataset.group);
 if(!entries?.length)return;
 hideDotPreview();
 activeDot=dot;
 const first=entries[0],company=COMPANIES[first.company];
 const models=expandModelNames(entries.flatMap(e=>e.models.length?e.models:[e.title]));
 const shown=models.slice(0,10);
 const preview=$("dotPreview");
 preview.innerHTML='<strong>'+escapeHTML(fmt(first.date))+'</strong><div class="dot-preview-meta">'+escapeHTML(company.name)+' · '+(first.availability==="open"?"Open":"Closed")+' · '+DOT_TIERS[dot.dataset.tier]+'</div>'
  +'<ul>'+shown.map(model=>'<li>'+escapeHTML(model)+'</li>').join("")+'</ul>'
  +(shown.length<models.length?'<div class="dot-preview-meta">+'+(models.length-shown.length)+' more in Details</div>':'');
 preview.style.setProperty("--dot-color",company.color);
 preview.hidden=false;
 const anchor=dot.getBoundingClientRect(),box=preview.getBoundingClientRect(),edge=8;
 const left=Math.min(Math.max(edge,anchor.left+anchor.width/2-box.width/2),window.innerWidth-box.width-edge);
 const below=anchor.bottom+edge;
 const top=below+box.height<=window.innerHeight-edge?below:Math.max(edge,anchor.top-box.height-edge);
 preview.style.left=left+"px";
 preview.style.top=top+"px";
 dot.setAttribute("aria-describedby",preview.id);
}

function drawTimeline(entries){
 groupRecords.clear();
 if(!entries.length){$("timelineCanvas").innerHTML='<div class="no-results">No matching releases. Try a different company, month range or search.</div>';return;}
 const start=monthStart(state.fromMonth),end=monthStart(monthAfter(state.toMonth));
 const px=(state.density==="overview"?1.07:2.08)*state.zoom;
 const label=LABEL_W(),width=Math.max($("timelineScroll").clientWidth-label,days(start,end)*px+360),grid=makeGrid(px,start);
 const yearSegments=[],monthSegments=[];
 let key=state.fromMonth;
 while(key<=state.toMonth){
   const x=timelineX(start,monthStart(key),px),monthEnd=monthAfter(key),w=days(monthStart(key),monthStart(monthEnd))*px;
   if(key===state.fromMonth||key.endsWith("-01")){
    const year=key.slice(0,4),yearNext=(Number(year)+1)+"-01";
    const boundedEnd=monthStart(yearNext)<end?monthStart(yearNext):end;
    yearSegments.push('<div class="axis-year" title="'+year+'" style="left:'+x.toFixed(1)+'px;width:'+(days(monthStart(key),boundedEnd)*px).toFixed(1)+'px">'+shortDate(year)+'</div>');
   }
   if(w>=29)monthSegments.push('<div class="axis-month" style="left:'+x.toFixed(1)+'px;width:'+w.toFixed(1)+'px">'+MONTHS[Number(key.slice(5))-1]+'</div>');
   key=monthEnd;
 }
 let html='<div class="timeline-axis" style="width:'+(width+label)+'px"><div class="axis-label">YEAR / MONTH</div><div class="axis-content" style="width:'+width+'px">'+yearSegments.join("")+monthSegments.join("")+'</div></div>';
 const visible=COMPANY_ORDER.filter(code=>state.companies.has(code)&&entries.some(e=>e.company===code));
 let gIndex=0;
 for(const code of visible){
   const company=COMPANIES[code],total=entries.filter(e=>e.company===code).length;
   html+='<div class="company-header" style="width:'+(width+label)+'px"><div class="company-header-left"><span class="company-mark" style="background:'+company.color+'"></span><span class="company-name">'+escapeHTML(company.name)+'</span></div><span class="company-header-right">'+total+' release'+(total===1?"":"s")+'</span></div>';
   for(const av of ["closed","open"]){
     if(!state.availability.has(av))continue;
     const subset=entries.filter(e=>e.company===code&&e.availability===av);
     if(!subset.length)continue;
     const dots=state.density==="dots";
     const layout=dots?layoutDots(subset,px):layoutEvents(subset,px);
     const count=dots||state.density==="models"?layout.cards.length:subset.length;
     const tierLabels=dots?layout.bands.map(({tier,y})=>'<span class="dot-tier-label" style="top:'+y+'px">'+DOT_TIERS[tier]+'</span>').join(""):"";
     const tierGuides=dots?layout.bands.map(({y})=>'<i aria-hidden="true" class="dot-tier-guide" style="top:'+y+'px"></i>').join(""):"";
     html+='<div class="track'+(dots?' dot-track':'')+'" style="width:'+(width+label)+'px;height:'+layout.height+'px"><div class="track-label"><span class="track-label-name" style="color:var(--'+av+')">'+(av==="open"?"Open":"Closed")+'</span><span class="track-count">'+count+'</span>'+tierLabels+'</div><div class="track-grid" style="width:'+width+'px">'+grid+tierGuides+layout.cards.map(c=>{
       const key="g"+gIndex++;
       groupRecords.set(key,c.events);
       return c.html.replace(/data-group="[^"]*"/,'data-group="'+key+'"');
     }).join("")+'</div></div>';
   }
 }
 $("timelineCanvas").innerHTML=html;
 $("timelineCanvas").style.width=width+label+"px";
 const range=$("visibleRange");
 range.textContent=shortDate(state.fromMonth)+" – "+shortDate(state.toMonth);
 range.title=state.fromMonth+" – "+state.toMonth;
 const today=new Date().toISOString().slice(0,10);
 if(today>=start&&today<end){
  const line=document.createElement("i");line.className="today-line";line.style.left=(label+timelineX(start,today,px))+"px";line.style.top="57px";$("timelineCanvas").append(line);
 }
}
function drawList(entries){
 const ordered=entries.slice().sort((a,b)=>b.date.localeCompare(a.date)||a.title.localeCompare(b.title));
 const shown=ordered.slice(0,state.listLimit);
 $("listRows").innerHTML=shown.map(e=>'<tr><td>'+escapeHTML(e.date)+'</td><td>'+escapeHTML(e.title)+'</td><td>'+escapeHTML(COMPANIES[e.company]?.name||e.company)+'</td><td><span class="'+e.availability+'-tag">'+(e.availability==="open"?"Open":"Closed")+'</span></td><td>'+escapeHTML(e.capabilities.join(", "))+'</td><td><button class="row-open" type="button" data-id="'+escapeHTML(e.id)+'">Details ↗</button></td></tr>').join("");
 $("showMore").hidden=shown.length>=ordered.length;
}
function weightDetails(entries){
 const records=entries.filter(e=>e.weight_status||e.weight_release_date||e.weight_release_window);
 if(!records.length)return "";
 return '<section class="drawer-section"><h3>MODEL WEIGHTS</h3>'+records.map(e=>{
  const status=e.weight_release_date?"Published "+fmt(e.weight_release_date):"Publication announced: "+e.weight_release_window;
  const source=e.weight_source||e.weight_schedule_source;
  return '<p class="drawer-note">'+(records.length>1?escapeHTML(e.title)+" · ":"")+escapeHTML(status)+'. The timeline uses the original model release date.</p>'+(source?'<a class="drawer-link" href="'+escapeHTML(source)+'" target="_blank" rel="noopener noreferrer">'+(e.weight_release_date?"Model weights / release reference":"Weight release schedule")+' ↗</a>':"");
 }).join("")+'</section>';
}
function openDetails(id,groupKey,modelName=""){
 let entries=groupKey&&groupRecords.has(groupKey)?groupRecords.get(groupKey):[];
 if(!entries.length){const found=state.data.find(e=>e.id===id);if(found)entries=[found];}
 if(!entries.length)return;
 previousFocus=document.activeElement;
 const first=entries[0],comp=COMPANIES[first.company];
 const uniqueModels=[...new Set(entries.flatMap(e=>expandModelNames(e.models)))];
 const grouped=entries.length>1;
 const title=modelName||(grouped?entries.length+" grouped releases":first.title);
 const eventLabels={weights_release:"Weights published",api_release:"API launch",api_snapshot:"API snapshot",model_update:"Model revision",general_availability:"General availability",limited_preview:"Limited preview",model_release:"Model release"};
 $("drawerContent").innerHTML='<div class="drawer-company"><span class="company-color" style="background:'+comp.color+'"></span>'+escapeHTML(comp.name)+'</div><h2 class="drawer-title" id="drawerTitle">'+escapeHTML(title)+'</h2><div class="drawer-info"><div><span class="detail-key">'+(grouped?"Earliest release":"Release date")+'</span><span class="detail-value">'+escapeHTML(fmt(first.date))+'</span></div><div><span class="detail-key">Availability</span><span class="detail-value">'+(first.availability==="open"?"Open":"Closed")+'</span></div><div><span class="detail-key">'+(grouped?"Release groups":"Event type")+'</span><span class="detail-value">'+(grouped?entries.length:escapeHTML(eventLabels[first.event_type]||"Model release"))+'</span></div><div><span class="detail-key">Capabilities</span><span class="detail-value">'+escapeHTML([...new Set(entries.flatMap(e=>e.capabilities))].join(", "))+'</span></div></div>'+weightDetails(entries)+(grouped?'<section class="drawer-section"><h3>RELEASE DATES</h3><ul class="drawer-models">'+entries.map(e=>'<li>'+escapeHTML(e.date)+' · '+escapeHTML(e.title)+'</li>').join("")+'</ul></section>':'')+'<section class="drawer-section"><h3>MODELS IN THIS RELEASE</h3><ul class="drawer-models">'+uniqueModels.map(m=>'<li>'+escapeHTML(m)+'</li>').join("")+'</ul></section><section class="drawer-section"><h3>DATA & SOURCES</h3>'+(first.source?'<a class="drawer-link" href="'+escapeHTML(first.source)+'" target="_blank" rel="noopener noreferrer">Official release reference ↗</a>':'<div class="drawer-note">Source not yet recorded in the migrated dataset. This historical entry has not been independently verified. Help improve its accuracy on GitHub.</div>')+(first.weight_source&&!first.weight_status?'<p><a class="drawer-link" href="'+escapeHTML(first.weight_source)+'" target="_blank" rel="noopener noreferrer">Official model weights ↗</a></p>':'')+(first.notes?'<p class="drawer-note">'+escapeHTML(first.notes)+'</p>':'')+'<p><a class="drawer-link" href="https://github.com/CYBIRD-D/AI-Model-LLM-Timeline/issues/new" target="_blank" rel="noopener noreferrer">Suggest a correction ↗</a></p></section>';
 $("drawerOverlay").hidden=false;$("detailDrawer").classList.add("is-open");$("detailDrawer").setAttribute("aria-hidden","false");document.body.style.overflow="hidden";$("closeDrawer").focus();
}
function closeDetails(){$("detailDrawer").classList.remove("is-open");$("detailDrawer").setAttribute("aria-hidden","true");$("drawerOverlay").hidden=true;document.body.style.overflow="";if(previousFocus?.isConnected)previousFocus.focus();}

function scrollToDate(date,behavior="smooth"){
 if(!date||date.slice(0,7)<state.fromMonth||date.slice(0,7)>state.toMonth)return false;
 const px=(state.density==="overview"?1.07:2.08)*state.zoom;
 const scroller=$("timelineScroll");
 scroller.scrollTo({left:Math.max(0,LABEL_W()+timelineX(monthStart(state.fromMonth),date,px)-scroller.clientWidth/2),behavior});
 return true;
}
function jumpToToday(){
 if(!scrollToDate(new Date().toISOString().slice(0,10)))tell("Today is outside the selected month range.");
}
function applyZoom(value){
 state.zoom=Math.max(.4,Math.min(MAX_ZOOM,Math.round(value*10)/10));
 if(state.zoom>=MAX_ZOOM&&state.density!=="dots")state.density="models";
 draw();
}
function setCollapsed(collapsed){
 state.filtersCollapsed=collapsed;
 const root=$("explorerRoot"),panel=$("filtersPanel"),btn=$("filterToggle");
 root.classList.toggle("filters-collapsed",collapsed);
 panel.setAttribute("aria-hidden",String(collapsed));panel.inert=collapsed;
 btn.setAttribute("aria-expanded",String(!collapsed));btn.title=collapsed?"Show filters":"Hide filters";
 $("filterToggleText").textContent=collapsed?"Show filters":"Filters";
 btn.querySelector(".filter-toggle-arrow").textContent=collapsed?"›":"‹";
 try{localStorage.setItem("timeline-filters-collapsed",collapsed?"1":"0");}catch{}
}
function setExpanded(expanded){
 state.expanded=expanded;
 $("explorerRoot").classList.toggle("is-expanded",expanded);
 $("expandBtn").setAttribute("aria-pressed",String(expanded));
 $("expandBtn").textContent=expanded?"Exit fullscreen ↙":"Expand ⤢";
 document.body.classList.toggle("workspace-expanded",expanded);
 draw();
}
function defaultFromMonth(){
 const previousYear=(yearFromMonth(lastDataMonth)-1)+"-01";
 return previousYear<firstDataMonth?firstDataMonth:previousYear;
}
function enableTimelineDrag(scroll,canvas){
 const threshold=6;
 let gesture=null,suppressClick=false;

 function endDrag(event){
  if(!gesture||(event.pointerId!==undefined&&event.pointerId!==gesture.pointerId))return;
  const {pointerId}=gesture;
  gesture=null;
  scroll.classList.remove("is-panning");
  if(scroll.hasPointerCapture(pointerId))scroll.releasePointerCapture(pointerId);
 }

 scroll.addEventListener("pointerdown",event=>{
  suppressClick=false;
  if(gesture||event.pointerType!=="mouse"||event.button!==0||!canvas.contains(event.target))return;
  if(scroll.scrollWidth<=scroll.clientWidth)return;
  gesture={pointerId:event.pointerId,x:event.clientX,y:event.clientY,left:scroll.scrollLeft,dragging:false};
 });
 window.addEventListener("pointermove",event=>{
  if(gesture?.pointerId!==event.pointerId)return;
  if(!(event.buttons&1)){endDrag(event);return;}
  const dx=event.clientX-gesture.x;
  if(!gesture.dragging){
   if(Math.abs(dx)<threshold||Math.abs(dx)<Math.abs(event.clientY-gesture.y))return;
   gesture.dragging=true;
   suppressClick=true;
   scroll.setPointerCapture(event.pointerId);
   scroll.classList.add("is-panning");
   hideDotPreview();
  }
  event.preventDefault();
  scroll.scrollLeft=gesture.left-dx;
 });
 window.addEventListener("pointerup",endDrag);
 window.addEventListener("pointercancel",endDrag);
 window.addEventListener("blur",endDrag);
 scroll.addEventListener("lostpointercapture",endDrag);
 scroll.addEventListener("click",event=>{
  // A drag can still generate a click, even when it began on a model button.
  if(!suppressClick||event.detail===0)return;
  suppressClick=false;
  event.preventDefault();
  event.stopPropagation();
 },true);
}
function setupEvents(){
 $("searchInput").addEventListener("input",e=>{state.query=e.target.value;state.listLimit=120;draw();});
 $("companyFilters").addEventListener("change",e=>{const id=e.target.dataset.company;if(!id)return;e.target.checked?state.companies.add(id):state.companies.delete(id);draw();});
 $("availabilityFilters").addEventListener("change",e=>{const id=e.target.dataset.av;if(!id)return;e.target.checked?state.availability.add(id):state.availability.delete(id);draw();});
 $("capabilityFilters").addEventListener("click",e=>{const id=e.target.closest("[data-cap]")?.dataset.cap;if(!id)return;state.capabilities.has(id)?state.capabilities.delete(id):state.capabilities.add(id);draw();});
 $("allCompanies").addEventListener("click",()=>{state.companies=new Set(COMPANY_ORDER);draw();});
 $("allCategories").addEventListener("click",()=>{state.capabilities=new Set(CAPS);draw();});
 $("resetBtn").addEventListener("click",()=>{state.query="";state.companies=new Set(COMPANY_ORDER);state.availability=new Set(["open","closed"]);state.capabilities=new Set(CAPS);state.fromMonth=defaultFromMonth();state.toMonth=lastDataMonth;state.zoom=1.3;state.density="detail";state.listLimit=120;$("searchInput").value="";closeMonthPicker();draw({keepScroll:false});});
 for(const [id,value] of [["timelineTab","timeline"],["listTab","list"]])$(id).addEventListener("click",()=>{state.mode=value;draw();});
 for(const [density,{button}] of Object.entries(DENSITIES))$(button).addEventListener("click",()=>{state.density=density;draw({keepScroll:false});});
 $("zoomRange").addEventListener("input",e=>applyZoom(Number(e.target.value)));
 $("zoomOut").addEventListener("click",()=>applyZoom(state.zoom-.2));
 $("zoomIn").addEventListener("click",()=>applyZoom(state.zoom+.2));
 $("todayBtn").addEventListener("click",jumpToToday);
 for(const field of ["fromMonth","toMonth"])$(field).addEventListener("click",()=>openMonthPicker(field));
 $("calPrevYear").addEventListener("click",()=>{calendarYear--;renderMonthPicker();});
 $("calNextYear").addEventListener("click",()=>{calendarYear++;renderMonthPicker();});
 $("calYear").addEventListener("change",e=>{calendarYear=Number(e.target.value);renderMonthPicker();});
 $("calMonthGrid").addEventListener("click",e=>{const button=e.target.closest("button[data-month]");if(button&&!button.disabled)chooseMonth(button.dataset.month);});
 document.addEventListener("pointerdown",e=>{if(activeMonthField&&!$("dateGroup").contains(e.target))closeMonthPicker();});
 $("filterToggle").addEventListener("click",()=>{setCollapsed(!state.filtersCollapsed);draw();});
 $("expandBtn").addEventListener("click",()=>setExpanded(!state.expanded));
 const canvas=$("timelineCanvas");
 enableTimelineDrag($("timelineScroll"),canvas);
 canvas.addEventListener("click",e=>{
  const button=e.target.closest(".event-card,.event-dot");
  if(!button)return;
  hideDotPreview();
  openDetails(button.dataset.id,button.dataset.group,button.dataset.model);
 });
 canvas.addEventListener("pointerover",e=>{
  const dot=e.target.closest(".event-dot");
  if(dot&&e.pointerType!=="touch")showDotPreview(dot);
 });
 canvas.addEventListener("pointerout",e=>{if(e.target===activeDot&&document.activeElement!==activeDot)hideDotPreview();});
 canvas.addEventListener("focusin",e=>{if(e.target.matches(".event-dot"))showDotPreview(e.target);});
 canvas.addEventListener("focusout",e=>{if(e.target===activeDot)hideDotPreview();});
 window.addEventListener("scroll",hideDotPreview,{capture:true,passive:true});
 $("listRows").addEventListener("click",e=>{const btn=e.target.closest("button[data-id]");if(btn)openDetails(btn.dataset.id);});
 $("showMore").addEventListener("click",()=>{state.listLimit+=150;draw();});
 $("closeDrawer").addEventListener("click",closeDetails);$("drawerOverlay").addEventListener("click",closeDetails);
 document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&activeMonthField){e.preventDefault();closeMonthPicker(true);return;}
  if(e.key==="Escape"&&$("detailDrawer").classList.contains("is-open")){closeDetails();return;}
  if(e.key==="Escape"&&hideDotPreview())return;
  if(e.key==="Escape"&&state.expanded){setExpanded(false);return;}
  if(e.key==="/"&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)&&!$("detailDrawer").classList.contains("is-open")){e.preventDefault();$("searchInput").focus();}
 });
 $("detailDrawer").addEventListener("keydown",e=>{if(e.key!=="Tab")return;const els=[...$("detailDrawer").querySelectorAll("button,a[href]")].filter(x=>x.offsetWidth>0);if(!els.length)return;const first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
 $("shareBtn").addEventListener("click",async()=>{paramsWrite();try{await navigator.clipboard.writeText(location.href);tell("Link copied with your current filters.");}catch{tell("Share link is in the address bar.");}});
 $("themeBtn").addEventListener("click",()=>{const next=document.body.dataset.theme==="dark"?"light":"dark";document.body.dataset.theme=next;try{localStorage.setItem("timeline-theme",next);}catch{}$("themeBtn").setAttribute("aria-label","Switch to "+(next==="dark"?"light":"dark")+" theme");});
 window.addEventListener("resize",()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>draw(),180);});
}

async function init(){
 try{
 const response=await fetch("./data/releases.json",{cache:"no-cache"});
 if(!response.ok)throw new Error("Unable to load release dataset: "+response.status);
 datasetMeta=await response.json();
 if(!Array.isArray(datasetMeta.events))throw new Error("Invalid dataset");
 state.data=datasetMeta.events.filter(e=>COMPANIES[e.company]&&/^\d{4}-\d{2}-\d{2}$/.test(e.date)&&["open","closed"].includes(e.availability)&&Array.isArray(e.models)&&Array.isArray(e.capabilities));
 const months=state.data.map(e=>e.date.slice(0,7)).sort();
 firstDataMonth=months[0];lastDataMonth=months.at(-1);
 lastSelectableMonth=lastDataMonth>new Date().toISOString().slice(0,7)?lastDataMonth:new Date().toISOString().slice(0,7);
 if(!firstDataMonth)throw new Error("No release data");
 paramsRead();
 state.fromMonth=defaultFromMonth();
 state.toMonth=lastDataMonth;
 function parseMonthParam(v,from){if(validMonth(v))return v;if(/^\d{4}$/.test(v||""))return v+(from?"-01":"-12");return null;}
 const from=parseMonthParam(state._from,true),to=parseMonthParam(state._to,false);
 if(from)state.fromMonth=from<firstDataMonth?firstDataMonth:from>lastSelectableMonth?lastSelectableMonth:from;
 if(to)state.toMonth=to<firstDataMonth?firstDataMonth:to>lastSelectableMonth?lastSelectableMonth:to;
 if(state.fromMonth>state.toMonth)state.fromMonth=state.toMonth;
 syncMonthButtons();
 $("searchInput").value=state.query;
 $("metricEvents").textContent=state.data.length.toLocaleString();
 $("metricModels").textContent=state.data.reduce((n,e)=>n+expandModelNames(e.models).length,0).toLocaleString();
 $("metricCompanies").textContent=new Set(state.data.map(e=>e.company)).size;
 $("updateBadge").textContent="Dataset updated "+datasetMeta.datasetUpdated;
 $("coverageBadge").textContent="Records through "+datasetMeta.coverageThrough;
 let theme=null,collapsed=null;
 try{theme=localStorage.getItem("timeline-theme");collapsed=localStorage.getItem("timeline-filters-collapsed");}catch{}
 if(["dark","light"].includes(theme))document.body.dataset.theme=theme;
 setupEvents();
 setCollapsed(collapsed===null?matchMedia("(max-width:780px)").matches:collapsed==="1");
 draw({keepScroll:false});
 if(state.mode==="timeline")requestAnimationFrame(()=>scrollToDate(datasetMeta.coverageThrough,"auto"));
 }catch(error){$("resultsCount").textContent="Data unavailable";$("timelineCanvas").innerHTML='<div class="no-results">Failed to load the release database. Check the data file or try reloading this page.</div>';console.error(error);}
}
init();
