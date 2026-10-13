"use strict";
const COMPANIES={oai:{name:"OpenAI",color:"#94a6ff"},anth:{name:"Anthropic",color:"#ce9980"},goog:{name:"Google DeepMind",color:"#5c9bee"},meta:{name:"Meta",color:"#9e8bee"},mis:{name:"Mistral AI",color:"#f3a563"},deep:{name:"DeepSeek",color:"#46bfaf"},qwen:{name:"Alibaba Qwen",color:"#e8b459"},xai:{name:"xAI",color:"#95a0af"},glm:{name:"Zhipu AI / GLM",color:"#c790e8"},moon:{name:"Moonshot AI",color:"#73cce0"},mini:{name:"MiniMax",color:"#ed8aa7"}};
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
const monthStart=key=>key+"-01";
const monthAfter=key=>{const [y,m]=key.split("-").map(Number);return iso(y,m+1).slice(0,7);};
const yearFromMonth=key=>Number(key.slice(0,4));
const MAX_ZOOM=2.8;
const validMonth=value=>/^\d{4}-(0[1-9]|1[0-2])$/.test(value);
const state={data:[],query:"",companies:new Set(COMPANY_ORDER),availability:new Set(["open","closed"]),capabilities:new Set(CAPS),fromMonth:"2025-01",toMonth:"2026-05",mode:"timeline",density:"detail",zoom:1.3,filtersCollapsed:false,expanded:false,drawer:null,listLimit:120};
let datasetMeta={},toastTimeout,previousFocus=null,resizeTimer,firstDataMonth,lastDataMonth,lastSelectableMonth;
let activeMonthField=null,calendarYear=0;
function tell(message){const el=$("toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove("show"),2800);}
function prettyMonth(value){
 if(!validMonth(value))return "Select month";
 return MONTHS[Number(value.slice(5))-1]+" "+value.slice(0,4);
}
function syncMonthButtons(){
 for(const field of ["fromMonth","toMonth"]){
  $(field+"Text").textContent=prettyMonth(state[field]);
  $(field).dataset.month=state[field];
  $(field).setAttribute("aria-expanded",String(activeMonthField===field&&!$("monthPickerPopup").hidden));
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
 if(["overview","detail","models"].includes(q.get("density")))state.density=q.get("density");
 if(["timeline","list"].includes(q.get("view")))state.mode=q.get("view");
 const z=Number(q.get("zoom"));if(q.has("zoom")&&Number.isFinite(z))state.zoom=Math.min(MAX_ZOOM,Math.max(.4,z));
 state._from=q.get("from");state._to=q.get("to");
 if(state.zoom>=MAX_ZOOM)state.density="models";
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
 $("overviewBtn").classList.toggle("active",state.density==="overview");$("detailBtn").classList.toggle("active",state.density==="detail");$("modelsBtn").classList.toggle("active",state.density==="models");
 $("densityLabel").textContent=state.density==="overview"?"Nearby releases grouped":state.density==="models"?"Every named model shown separately":"Same-day model families grouped";
 $("zoomRange").value=String(state.zoom);
 $("groupingNote").textContent=state.density==="overview"?"Click a group to inspect every release.":state.density==="models"?"Every named variant is shown without family aggregation.":"Same-day variants share a family card when supported by the available model names; All models expands them.";
}
function draw({keepScroll=true}={}){
 const scroll=$("timelineScroll"),left=scroll.scrollLeft,top=scroll.scrollTop;
 buildFilters();syncButtons();syncMonthButtons();
 const entries=filtered();
 $("resultsCount").textContent=entries.length.toLocaleString()+" release groups · "+new Set(entries.map(e=>e.company)).size+" companies";
 if(state.mode==="timeline")drawTimeline(entries);else drawList(entries);
 if(keepScroll){scroll.scrollLeft=Math.min(left,Math.max(0,scroll.scrollWidth-scroll.clientWidth));scroll.scrollTop=top;}
 paramsWrite();
}
function makeGrid(width,px,start){
 const marks=[];let key=state.fromMonth;
 while(key<=state.toMonth){
  const pos=days(start,monthStart(key))*px;
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

function familyNameForEvent(event){
 const title=String(event.title||"").trim();
 if(!/\s+family$/i.test(title))return null;
 const family=title.replace(/\s+family$/i,"").trim();
 const names=expandModelNames(event.models);
 if(names.length<2)return null;
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
 for(const e of entries){
  const family=familyNameForEvent(e);
  if(!family){standalone.push({events:[e],date:e.date,name:e.title,grouped:false});continue;}
  const key=[e.date,e.company,e.availability,e.capabilities.slice().sort().join(";"),family.toLowerCase()].join("|");
  if(!grouped.has(key))grouped.set(key,{events:[],date:e.date,name:family,grouped:true,family:true});
  grouped.get(key).events.push(e);
 }
 return [...standalone,...grouped.values()];
}
function textWidthApprox(text){
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
function compactCardMetrics(name){
 const choices=[92,104,116,128,140,152,166,180,194];
 let best=null;
 for(const width of choices){
  const lines=wrapCardTitle(name,width-17);
  const height=Math.ceil(17+lines.length*12.5);
  const score=(width+5)*(height+4)+(lines.length>3?400*(lines.length-3):0);
  if(!best||score<best.score)best={width,height,lines,score};
 }
 return best;
}
function layoutEvents(entries,scale){
 const gap=6,rowGap=4;
 let items=[];
 if(state.density==="overview"){
   const buckets=new Map(),windowDays=Math.max(28,Math.min(115,Math.round(105/Math.max(.4,state.zoom))));
   for(const e of entries){
     const bucket=Math.floor(days(monthStart(state.fromMonth),e.date)/windowDays);
     if(!buckets.has(bucket))buckets.set(bucket,[]);
     buckets.get(bucket).push(e);
   }
   items=[...buckets.values()].map(list=>({events:list,date:list[0].date,name:list.length===1?list[0].title:list.length+" releases",grouped:list.length>1}));
 }else if(state.density==="models"){
   for(const e of entries){
     for(const name of expandModelNames(e.models.length?e.models:[e.title])){
       items.push({events:[e],date:e.date,name,model:name,grouped:false});
     }
   }
 }else items=groupSameDayFamilies(entries);
 items.sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name));
 const occupied=[],rowHeights=[],cards=[];
 for(const item of items){
  const metrics=compactCardMetrics(item.name);
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
  const nameLines=metrics.lines.map(escapeHTML).join("<br>");
  const family=item.family?" family-card":"";
  const card='<button type="button" aria-label="'+fullName+' — '+escapeHTML(item.date)+'" class="event-card compact-card'+family+' '+(item.grouped&&!item.family?"grouped ":"")+(item.model?"model-level":"")+'" data-id="'+escapeHTML(item.events[0].id)+'" data-group="'+(item.grouped?"true":"false")+'" data-model="'+escapeHTML(item.model||"")+'" style="left:'+x.toFixed(1)+'px;top:'+rowTops[row]+'px;width:'+metrics.width+'px;height:'+metrics.height+'px;--event-color:'+company.color+'" title="'+fullName+' — '+escapeHTML(item.date)+'"><span class="event-name">'+nameLines+'</span><span class="event-date">'+escapeHTML(item.date)+'</span></button>';
  return {html:card,events:item.events};
 });
 return {height:Math.max(57,offset+3),cards:html};
}
const groupRecords=new Map();
function drawTimeline(entries){
 groupRecords.clear();
 if(!entries.length){$("timelineCanvas").innerHTML='<div class="no-results">No matching releases. Try a different company, month range or search.</div>';return;}
 const start=monthStart(state.fromMonth),end=monthStart(monthAfter(state.toMonth));
 const px=(state.density==="overview"?1.07:2.08)*state.zoom;
 const label=LABEL_W(),width=Math.max($("timelineScroll").clientWidth-label,days(start,end)*px+360),grid=makeGrid(width,px,start);
 const yearSegments=[],monthSegments=[];
 let key=state.fromMonth;
 while(key<=state.toMonth){
   const x=days(start,monthStart(key))*px,monthEnd=monthAfter(key),w=days(monthStart(key),monthStart(monthEnd))*px;
   if(key===state.fromMonth||key.endsWith("-01")){
    const year=key.slice(0,4),yearNext=(Number(year)+1)+"-01";
    const boundedEnd=monthStart(yearNext)<end?monthStart(yearNext):end;
    yearSegments.push('<div class="axis-year" style="left:'+x.toFixed(1)+'px;width:'+(days(monthStart(key),boundedEnd)*px).toFixed(1)+'px">'+year+'</div>');
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
     const layout=layoutEvents(subset,px);
     html+='<div class="track" style="width:'+(width+label)+'px;height:'+layout.height+'px"><div class="track-label"><span class="track-label-name" style="color:var(--'+av+')">'+(av==="open"?"Open":"Closed")+'</span><span class="track-count">'+(state.density==="models"?layout.cards.length:subset.length)+'</span></div><div class="track-grid" style="width:'+width+'px">'+grid+layout.cards.map(c=>{
       if(c.events.length>1)groupRecords.set("g"+gIndex++,c.events);
       return c.html.replace('data-group="true"',c.events.length>1?'data-group="g'+(gIndex-1)+'"':'data-group="false"');
     }).join("")+'</div></div>';
   }
 }
 $("timelineCanvas").innerHTML=html;
 $("timelineCanvas").style.width=width+label+"px";
 $("visibleRange").textContent=state.fromMonth+" – "+state.toMonth;
 const today=new Date().toISOString().slice(0,10);
 if(today>=start&&today<end){
  const line=document.createElement("i");line.className="today-line";line.style.left=(label+days(start,today)*px)+"px";line.style.top="57px";$("timelineCanvas").append(line);
 }
}
function drawList(entries){
 const ordered=entries.slice().sort((a,b)=>b.date.localeCompare(a.date)||a.title.localeCompare(b.title));
 const shown=ordered.slice(0,state.listLimit);
 $("listRows").innerHTML=shown.map(e=>'<tr><td>'+escapeHTML(e.date)+'</td><td>'+escapeHTML(e.title)+'</td><td>'+escapeHTML(COMPANIES[e.company]?.name||e.company)+'</td><td><span class="'+e.availability+'-tag">'+(e.availability==="open"?"Open":"Closed")+'</span></td><td>'+escapeHTML(e.capabilities.join(", "))+'</td><td><button class="row-open" type="button" data-id="'+escapeHTML(e.id)+'">Details ↗</button></td></tr>').join("");
 $("showMore").hidden=shown.length>=ordered.length;
}
function openDetails(id,groupKey,modelName=""){
 let entries=groupKey&&groupRecords.has(groupKey)?groupRecords.get(groupKey):[];
 if(!entries.length){const found=state.data.find(e=>e.id===id);if(found)entries=[found];}
 if(!entries.length)return;
 previousFocus=document.activeElement;
 const first=entries[0],comp=COMPANIES[first.company];
 const uniqueModels=[...new Set(entries.flatMap(e=>expandModelNames(e.models)))];
 const grouped=entries.length>1;
 $("drawerContent").innerHTML='<div class="drawer-company"><span class="company-color" style="background:'+comp.color+'"></span>'+escapeHTML(comp.name)+'</div><h2 class="drawer-title" id="drawerTitle">'+escapeHTML(grouped?entries.length+" grouped releases":(modelName||first.title))+'</h2><div class="drawer-info"><div><span class="detail-key">'+(grouped?"Earliest release":"Release date")+'</span><span class="detail-value">'+escapeHTML(fmt(first.date))+'</span></div><div><span class="detail-key">Availability</span><span class="detail-value">'+(first.availability==="open"?"Open":"Closed")+'</span></div><div><span class="detail-key">Release groups</span><span class="detail-value">'+entries.length+'</span></div><div><span class="detail-key">Capabilities</span><span class="detail-value">'+escapeHTML([...new Set(entries.flatMap(e=>e.capabilities))].join(", "))+'</span></div></div>'+(grouped?'<section class="drawer-section"><h3>RELEASE DATES</h3><ul class="drawer-models">'+entries.map(e=>'<li>'+escapeHTML(e.date)+' · '+escapeHTML(e.title)+'</li>').join("")+'</ul></section>':'')+'<section class="drawer-section"><h3>MODELS IN THIS RELEASE</h3><ul class="drawer-models">'+uniqueModels.map(m=>'<li>'+escapeHTML(m)+'</li>').join("")+'</ul></section><section class="drawer-section"><h3>DATA & SOURCES</h3>'+(first.source?'<a class="drawer-link" href="'+escapeHTML(first.source)+'" target="_blank" rel="noopener noreferrer">Official release reference ↗</a>':'<div class="drawer-note">Source not yet recorded in the migrated dataset. This historical entry has not been independently verified. Help improve its accuracy on GitHub.</div>')+'<p><a class="drawer-link" href="https://github.com/CYBIRD-D/AI-Model-LLM-Timeline/issues/new" target="_blank" rel="noopener noreferrer">Suggest a correction ↗</a></p></section>';
 $("drawerOverlay").hidden=false;$("detailDrawer").classList.add("is-open");$("detailDrawer").setAttribute("aria-hidden","false");document.body.style.overflow="hidden";$("closeDrawer").focus();
}
function closeDetails(){$("detailDrawer").classList.remove("is-open");$("detailDrawer").setAttribute("aria-hidden","true");$("drawerOverlay").hidden=true;document.body.style.overflow="";if(previousFocus?.isConnected)previousFocus.focus();}

function scrollToDate(date,behavior="smooth"){
 if(!date||date.slice(0,7)<state.fromMonth||date.slice(0,7)>state.toMonth)return false;
 const px=(state.density==="overview"?1.07:2.08)*state.zoom;
 const scroller=$("timelineScroll");
 scroller.scrollTo({left:Math.max(0,LABEL_W()+days(monthStart(state.fromMonth),date)*px-scroller.clientWidth/2),behavior});
 return true;
}
function jumpToToday(){
 if(!scrollToDate(new Date().toISOString().slice(0,10)))tell("Today is outside the selected month range.");
}
function applyZoom(value){
 state.zoom=Math.max(.4,Math.min(MAX_ZOOM,Math.round(value*10)/10));
 if(state.zoom>=MAX_ZOOM)state.density="models";
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
function setupEvents(){
 $("searchInput").addEventListener("input",e=>{state.query=e.target.value;state.listLimit=120;draw();});
 $("companyFilters").addEventListener("change",e=>{const id=e.target.dataset.company;if(!id)return;e.target.checked?state.companies.add(id):state.companies.delete(id);draw();});
 $("availabilityFilters").addEventListener("change",e=>{const id=e.target.dataset.av;if(!id)return;e.target.checked?state.availability.add(id):state.availability.delete(id);draw();});
 $("capabilityFilters").addEventListener("click",e=>{const id=e.target.closest("[data-cap]")?.dataset.cap;if(!id)return;state.capabilities.has(id)?state.capabilities.delete(id):state.capabilities.add(id);draw();});
 $("allCompanies").addEventListener("click",()=>{state.companies=new Set(COMPANY_ORDER);draw();});
 $("allCategories").addEventListener("click",()=>{state.capabilities=new Set(CAPS);draw();});
 $("resetBtn").addEventListener("click",()=>{state.query="";state.companies=new Set(COMPANY_ORDER);state.availability=new Set(["open","closed"]);state.capabilities=new Set(CAPS);state.fromMonth=Math.max(firstDataMonth,(yearFromMonth(lastDataMonth)-1)+"-01");state.toMonth=lastDataMonth;state.zoom=1.3;state.density="detail";state.listLimit=120;$("searchInput").value="";closeMonthPicker();draw({keepScroll:false});});
 for(const [id,value] of [["timelineTab","timeline"],["listTab","list"]])$(id).addEventListener("click",()=>{state.mode=value;draw();});
 for(const [id,value] of [["overviewBtn","overview"],["detailBtn","detail"],["modelsBtn","models"]])$(id).addEventListener("click",()=>{state.density=value;draw({keepScroll:false});});
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
 $("timelineCanvas").addEventListener("click",e=>{const btn=e.target.closest(".event-card");if(btn)openDetails(btn.dataset.id,btn.dataset.group,btn.dataset.model);});
 $("listRows").addEventListener("click",e=>{const btn=e.target.closest("button[data-id]");if(btn)openDetails(btn.dataset.id);});
 $("showMore").addEventListener("click",()=>{state.listLimit+=150;draw();});
 $("closeDrawer").addEventListener("click",closeDetails);$("drawerOverlay").addEventListener("click",closeDetails);
 document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&activeMonthField){e.preventDefault();closeMonthPicker(true);return;}
  if(e.key==="Escape"&&$("detailDrawer").classList.contains("is-open")){closeDetails();return;}
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
 const previousYear=(yearFromMonth(lastDataMonth)-1)+"-01";
 state.fromMonth=previousYear<firstDataMonth?firstDataMonth:previousYear;
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
 $("updateBadge").textContent="Dataset migrated "+datasetMeta.datasetUpdated;
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