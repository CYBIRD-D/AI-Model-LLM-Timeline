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
const state={data:[],query:"",companies:new Set(COMPANY_ORDER),availability:new Set(["open","closed"]),capabilities:new Set(CAPS),startYear:2022,endYear:2026,mode:"timeline",density:"detail",zoom:1.3,drawer:null,listLimit:120};
let datasetMeta={},renderSignature="",toastTimeout,previousFocus=null,resizeTimer;
function tell(message){const el=$("toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove("show"),2800);}
function paramsRead(){
 const url=new URL(location.href),q=url.searchParams;
 state.query=q.get("q")||"";
 for(const [key,field,allowed] of [["companies","companies",COMPANY_ORDER],["availability","availability",["open","closed"]],["capabilities","capabilities",CAPS]])if(q.has(key))state[field]=new Set((q.get(key)||"").split(",").filter(x=>allowed.includes(x)));
 if(["overview","detail"].includes(q.get("density")))state.density=q.get("density");
 if(["timeline","list"].includes(q.get("view")))state.mode=q.get("view");
 const z=Number(q.get("zoom"));if(q.has("zoom")&&Number.isFinite(z))state.zoom=Math.min(2.8,Math.max(.4,z));
 state._from=q.get("from");state._to=q.get("to");
}
function paramsWrite(){
 const url=new URL(location.href),q=url.searchParams;q.delete("q");q.delete("companies");q.delete("availability");q.delete("capabilities");q.delete("from");q.delete("to");q.delete("view");q.delete("density");q.delete("zoom");
 if(state.query)q.set("q",state.query);
 if(state.companies.size!==COMPANY_ORDER.length)q.set("companies",[...state.companies].join(","));
 if(state.availability.size!==2)q.set("availability",[...state.availability].join(","));
 if(state.capabilities.size!==CAPS.length)q.set("capabilities",[...state.capabilities].join(","));
 q.set("from",state.startYear);q.set("to",state.endYear);
 if(state.mode!=="timeline")q.set("view",state.mode);
 if(state.density!=="detail")q.set("density",state.density);
 if(state.zoom!==1.3)q.set("zoom",state.zoom);
 history.replaceState(null,"",url);
}
function filtered(){
 const q=state.query.trim().toLowerCase();
 return state.data.filter(e=>e.date.slice(0,4)>=String(state.startYear)&&e.date.slice(0,4)<=String(state.endYear)&&state.companies.has(e.company)&&state.availability.has(e.availability)&&e.capabilities.some(x=>state.capabilities.has(x))&&(!q||[e.title,e.company,COMPANIES[e.company]?.name,e.date,...e.models,...e.capabilities].join(" ").toLowerCase().includes(q)));
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
 $("overviewBtn").classList.toggle("active",state.density==="overview");$("detailBtn").classList.toggle("active",state.density==="detail");
 $("densityLabel").textContent=state.density==="overview"?"Nearby releases grouped":"Individual releases";
 $("zoomRange").value=String(state.zoom);
 $("groupingNote").textContent=state.density==="overview"?"Click a group to inspect every release.":"Switch to Overview for compact month-scale groups.";
}
function draw({keepScroll=true}={}){
 const scroll=$("timelineScroll"),left=scroll.scrollLeft,top=scroll.scrollTop;
 buildFilters();syncButtons();
 const entries=filtered();
 $("resultsCount").textContent=entries.length.toLocaleString()+" release groups · "+new Set(entries.map(e=>e.company)).size+" companies";
 if(state.mode==="timeline")drawTimeline(entries);else drawList(entries);
 if(keepScroll){scroll.scrollLeft=Math.min(left,Math.max(0,scroll.scrollWidth-scroll.clientWidth));scroll.scrollTop=top;}
 paramsWrite();
}
function makeGrid(width,px,start){
 const items=[];
 for(let year=state.startYear;year<=state.endYear;year++){
  for(let mo=1;mo<=12;mo++){
   const at=iso(year,mo),pos=days(start,at)*px;
   if(pos>=width)continue;
   items.push('<i aria-hidden="true" class="grid-tick '+(mo===1?"year":"")+'" style="left:'+pos.toFixed(1)+'px"></i>');
  }
 }
 return items.join("");
}
function layoutEvents(entries,scale,width){
 const cardW=state.density==="detail"?128:124,pad=7,gap=5,rowH=42;
 let items;
 if(state.density==="overview"){
   const buckets=new Map(),windowDays=Math.max(28,Math.min(115,Math.round(105/Math.max(.4,state.zoom))));
   for(const e of entries){
     const b=Math.floor(days(iso(state.startYear),e.date)/windowDays),key=String(b);
     if(!buckets.has(key))buckets.set(key,[]);
     buckets.get(key).push(e);
   }
   items=[...buckets.values()].map(list=>({events:list,date:list[0].date,name:list.length===1?list[0].title:list.length+" releases",grouped:list.length>1}));
 }else items=entries.map(e=>({events:[e],date:e.date,name:e.title,grouped:false}));
 const occupied=[],cards=[];
 items.sort((a,b)=>a.date.localeCompare(b.date));
 for(const item of items){
  const x=days(iso(state.startYear),item.date)*scale;
  let row=occupied.findIndex(end=>end+gap<=x);
  if(row<0){row=occupied.length;occupied.push(x+cardW);}else occupied[row]=x+cardW;
  const c=COMPANIES[item.events[0].company];
  const card='<button type="button" class="event-card '+(item.grouped?"grouped":"")+'" data-id="'+escapeHTML(item.events[0].id)+'" data-group="'+(item.grouped?"true":"false")+'" style="left:'+x.toFixed(1)+'px;top:'+(8+row*rowH)+'px;width:'+cardW+'px;--event-color:'+c.color+'" title="'+escapeHTML(item.grouped?item.events.length+" releases beginning "+item.date:item.name)+'"><span class="event-name">'+escapeHTML(item.name)+'</span><span class="event-date">'+escapeHTML(item.date)+(item.grouped?" · grouped":"")+'</span></button>';
  cards.push({html:card,events:item.events});
 }
 return {height:Math.max(62,16+occupied.length*rowH),cards};
}
const groupRecords=new Map();
function drawTimeline(entries){
 groupRecords.clear();
 if(!entries.length){$("timelineCanvas").innerHTML='<div class="no-results">No matching releases. Try a different company, date range or search.</div>';return;}
 const start=iso(state.startYear),end=iso(state.endYear+1),px=(state.density==="overview"?1.07:2.08)*state.zoom,width=Math.max(1100,days(start,end)*px+150),label=LABEL_W(), grid=makeGrid(width,px,start);
 const yearSegments=[],monthSegments=[];
 for(let yr=state.startYear;yr<=state.endYear;yr++){
   const x=days(start,iso(yr))*px,w=days(iso(yr),iso(yr+1))*px;
   yearSegments.push('<div class="axis-year" style="left:'+x.toFixed(1)+'px;width:'+w.toFixed(1)+'px">'+yr+'</div>');
   for(let mo=1;mo<=12;mo++){
     const mx=days(start,iso(yr,mo))*px,mw=days(iso(yr,mo),mo===12?iso(yr+1):iso(yr,mo+1))*px;
     if(mw>=31)monthSegments.push('<div class="axis-month" style="left:'+mx.toFixed(1)+'px;width:'+mw.toFixed(1)+'px">'+MONTHS[mo-1]+'</div>');
   }
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
     const layout=layoutEvents(subset,px,width);
     html+='<div class="track" style="width:'+(width+label)+'px;height:'+layout.height+'px"><div class="track-label"><span class="track-label-name" style="color:var(--'+av+')">'+(av==="open"?"Open":"Closed")+'</span><span class="track-count">'+subset.length+'</span></div><div class="track-grid" style="width:'+width+'px">'+grid+layout.cards.map(c=>{
       if(c.events.length>1)groupRecords.set("g"+gIndex++,c.events);
       return c.html.replace('data-group="true"',c.events.length>1?'data-group="g'+(gIndex-1)+'"':'data-group="false"');
     }).join("")+'</div></div>';
   }
 }
 $("timelineCanvas").innerHTML=html;
 $("timelineCanvas").style.width=width+label+"px";
 $("visibleRange").textContent=state.startYear+" – "+state.endYear;
 const today=new Date().toISOString().slice(0,10);
 if(today>=start&&today<end){
  // Append a pointer-events-free line only inside the canvas content, aligned to the same calendar coordinate.
  const line=document.createElement("i");line.className="today-line";line.style.left=(label+days(start,today)*px)+"px";line.style.top="57px";$("timelineCanvas").append(line);
 }
}
function drawList(entries){
 const ordered=entries.slice().sort((a,b)=>b.date.localeCompare(a.date)||a.title.localeCompare(b.title));
 const shown=ordered.slice(0,state.listLimit);
 $("listRows").innerHTML=shown.map(e=>'<tr><td>'+escapeHTML(e.date)+'</td><td>'+escapeHTML(e.title)+'</td><td>'+escapeHTML(COMPANIES[e.company]?.name||e.company)+'</td><td><span class="'+e.availability+'-tag">'+(e.availability==="open"?"Open":"Closed")+'</span></td><td>'+escapeHTML(e.capabilities.join(", "))+'</td><td><button class="row-open" type="button" data-id="'+escapeHTML(e.id)+'">Details ↗</button></td></tr>').join("");
 $("showMore").hidden=shown.length>=ordered.length;
}
function openDetails(id,groupKey){
 let entries=groupKey&&groupRecords.has(groupKey)?groupRecords.get(groupKey):[];
 if(!entries.length){const found=state.data.find(e=>e.id===id);if(found)entries=[found];}
 if(!entries.length)return;
 previousFocus=document.activeElement;
 const first=entries[0],comp=COMPANIES[first.company];
 const uniqueModels=[...new Set(entries.flatMap(e=>e.models))];
 const grouped=entries.length>1;
 $("drawerContent").innerHTML='<div class="drawer-company"><span class="company-color" style="background:'+comp.color+'"></span>'+escapeHTML(comp.name)+'</div><h2 class="drawer-title" id="drawerTitle">'+escapeHTML(grouped?entries.length+" grouped releases":first.title)+'</h2><div class="drawer-info"><div><span class="detail-key">'+(grouped?"Earliest release":"Release date")+'</span><span class="detail-value">'+escapeHTML(fmt(first.date))+'</span></div><div><span class="detail-key">Availability</span><span class="detail-value">'+(first.availability==="open"?"Open":"Closed")+'</span></div><div><span class="detail-key">Release groups</span><span class="detail-value">'+entries.length+'</span></div><div><span class="detail-key">Capabilities</span><span class="detail-value">'+escapeHTML([...new Set(entries.flatMap(e=>e.capabilities))].join(", "))+'</span></div></div>'+(grouped?'<section class="drawer-section"><h3>RELEASE DATES</h3><ul class="drawer-models">'+entries.map(e=>'<li>'+escapeHTML(e.date)+' · '+escapeHTML(e.title)+'</li>').join("")+'</ul></section>':'')+'<section class="drawer-section"><h3>MODELS IN THIS RELEASE</h3><ul class="drawer-models">'+uniqueModels.map(m=>'<li>'+escapeHTML(m)+'</li>').join("")+'</ul></section><section class="drawer-section"><h3>DATA & SOURCES</h3>'+(first.source?'<a class="drawer-link" href="'+escapeHTML(first.source)+'" target="_blank" rel="noopener noreferrer">Official release reference ↗</a>':'<div class="drawer-note">Source not yet recorded in the migrated dataset. This historical entry has not been independently verified. Help improve its accuracy on GitHub.</div>')+'<p><a class="drawer-link" href="https://github.com/CYBIRD-D/AI-Model-LLM-Timeline/issues/new" target="_blank" rel="noopener noreferrer">Suggest a correction ↗</a></p></section>';
 $("drawerOverlay").hidden=false;$("detailDrawer").classList.add("is-open");$("detailDrawer").setAttribute("aria-hidden","false");document.body.style.overflow="hidden";$("closeDrawer").focus();
}
function closeDetails(){$("detailDrawer").classList.remove("is-open");$("detailDrawer").setAttribute("aria-hidden","true");$("drawerOverlay").hidden=true;document.body.style.overflow="";if(previousFocus?.isConnected)previousFocus.focus();}
function exportCSV(){
 const headers=["date","company","model_release","availability","capabilities","models","source","verification"];
 const rows=filtered().slice().sort((a,b)=>a.date.localeCompare(b.date)).map(e=>[e.date,COMPANIES[e.company]?.name||e.company,e.title,e.availability,e.capabilities.join("; "),e.models.join("; "),e.source||"",e.verification||""]);
 const quoted=([v,...rest])=>[v,...rest].map(s=>'"'+String(s).replaceAll('"','""')+'"').join(",");
 const csv="\uFEFF"+[headers,...rows].map(quoted).join("\r\n");
 const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download="ai-model-releases-"+state.startYear+"-"+state.endYear+".csv";link.click();setTimeout(()=>URL.revokeObjectURL(link.href),2000);
 tell("Exported "+rows.length+" release groups.");
}
function jumpToToday(){
 const today=new Date().toISOString().slice(0,10),year=Number(today.slice(0,4));
 if(year<state.startYear||year>state.endYear){tell("Today falls outside the selected year range.");return;}
 const start=iso(state.startYear),px=(state.density==="overview"?1.07:2.08)*state.zoom;
 const node=$("timelineScroll");node.scrollTo({left:Math.max(0,LABEL_W()+days(start,today)*px-node.clientWidth/2),behavior:"smooth"});
}
function setupEvents(){
 $("searchInput").addEventListener("input",e=>{state.query=e.target.value;state.listLimit=120;draw();});
 $("companyFilters").addEventListener("change",e=>{const id=e.target.dataset.company;if(!id)return;e.target.checked?state.companies.add(id):state.companies.delete(id);draw();});
 $("availabilityFilters").addEventListener("change",e=>{const id=e.target.dataset.av;if(!id)return;e.target.checked?state.availability.add(id):state.availability.delete(id);draw();});
 $("capabilityFilters").addEventListener("click",e=>{const id=e.target.closest("[data-cap]")?.dataset.cap;if(!id)return;state.capabilities.has(id)?state.capabilities.delete(id):state.capabilities.add(id);draw();});
 $("allCompanies").addEventListener("click",()=>{state.companies=new Set(COMPANY_ORDER);draw();});
 $("allCategories").addEventListener("click",()=>{state.capabilities=new Set(CAPS);draw();});
 $("resetBtn").addEventListener("click",()=>{state.query="";state.companies=new Set(COMPANY_ORDER);state.availability=new Set(["open","closed"]);state.capabilities=new Set(CAPS);state.startYear=Math.max(2022,Math.max(...state.data.map(x=>Number(x.date.slice(0,4))))-1);state.endYear=Math.max(...state.data.map(x=>Number(x.date.slice(0,4))));state.zoom=1.3;state.density="detail";state.listLimit=120;$("searchInput").value="";$("fromYear").value=state.startYear;$("toYear").value=state.endYear;draw({keepScroll:false});});
 for(const [id,value] of [["timelineTab","timeline"],["listTab","list"]])$(id).addEventListener("click",()=>{state.mode=value;draw();});
 for(const [id,value] of [["overviewBtn","overview"],["detailBtn","detail"]])$(id).addEventListener("click",()=>{state.density=value;draw({keepScroll:false});});
 $("zoomRange").addEventListener("input",e=>{state.zoom=Number(e.target.value);draw();});
 $("zoomOut").addEventListener("click",()=>{state.zoom=Math.max(.4,Math.round((state.zoom-.2)*10)/10);draw();});
 $("zoomIn").addEventListener("click",()=>{state.zoom=Math.min(2.8,Math.round((state.zoom+.2)*10)/10);draw();});
 $("todayBtn").addEventListener("click",jumpToToday);
 $("fromYear").addEventListener("change",e=>{state.startYear=Number(e.target.value);if(state.startYear>state.endYear){state.endYear=state.startYear;$("toYear").value=state.endYear;}draw({keepScroll:false});});
 $("toYear").addEventListener("change",e=>{state.endYear=Number(e.target.value);if(state.endYear<state.startYear){state.startYear=state.endYear;$("fromYear").value=state.startYear;}draw({keepScroll:false});});
 $("timelineCanvas").addEventListener("click",e=>{const btn=e.target.closest(".event-card");if(btn)openDetails(btn.dataset.id,btn.dataset.group);});
 $("listRows").addEventListener("click",e=>{const btn=e.target.closest("button[data-id]");if(btn)openDetails(btn.dataset.id);});
 $("showMore").addEventListener("click",()=>{state.listLimit+=150;draw();});
 $("closeDrawer").addEventListener("click",closeDetails);$("drawerOverlay").addEventListener("click",closeDetails);
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("detailDrawer").classList.contains("is-open")){closeDetails();return;}if(e.key==="/"&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)&&!$("detailDrawer").classList.contains("is-open")){e.preventDefault();$("searchInput").focus();}});
 $("detailDrawer").addEventListener("keydown",e=>{if(e.key!=="Tab")return;const els=[...$("detailDrawer").querySelectorAll("button,a[href]")].filter(x=>x.offsetWidth>0);if(!els.length)return;const first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
 $("exportBtn").addEventListener("click",exportCSV);
 $("shareBtn").addEventListener("click",async()=>{paramsWrite();try{await navigator.clipboard.writeText(location.href);tell("Link copied with your current filters.");}catch{tell("Share link is in the address bar.");}});
 $("themeBtn").addEventListener("click",()=>{const next=document.body.dataset.theme==="dark"?"light":"dark";document.body.dataset.theme=next;localStorage.setItem("timeline-theme",next);$("themeBtn").setAttribute("aria-label","Switch to "+(next==="dark"?"light":"dark")+" theme");});
 window.addEventListener("resize",()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>draw(),180);});
}
async function init(){
 try{
 const response=await fetch("./data/releases.json",{cache:"no-cache"});
 if(!response.ok)throw new Error("Unable to load release dataset: "+response.status);
 datasetMeta=await response.json();
 if(!Array.isArray(datasetMeta.events))throw new Error("Invalid dataset");
 state.data=datasetMeta.events.filter(e=>COMPANIES[e.company]&&/^\d{4}-\d{2}-\d{2}$/.test(e.date)&&["open","closed"].includes(e.availability)&&Array.isArray(e.models)&&Array.isArray(e.capabilities));
 paramsRead();
 const years=[...new Set(state.data.map(e=>Number(e.date.slice(0,4))))].sort((a,b)=>a-b);
 const last=years.at(-1),first=years[0];
 state.startYear=Math.max(first,last-1);state.endYear=last;
 if(state._from&&years.includes(Number(state._from)))state.startYear=Number(state._from);
 if(state._to&&years.includes(Number(state._to)))state.endYear=Number(state._to);
 if(state.startYear>state.endYear)state.startYear=state.endYear;
 $("fromYear").innerHTML=years.map(y=>'<option value="'+y+'">'+y+'</option>').join("");
 $("toYear").innerHTML=$("fromYear").innerHTML;$("fromYear").value=state.startYear;$("toYear").value=state.endYear;
 $("searchInput").value=state.query;
 $("metricEvents").textContent=state.data.length.toLocaleString();
 $("metricModels").textContent=state.data.reduce((n,e)=>n+e.models.length,0).toLocaleString();
 $("metricCompanies").textContent=new Set(state.data.map(e=>e.company)).size;
 $("updateBadge").textContent="Dataset migrated "+datasetMeta.datasetUpdated;
 $("coverageBadge").textContent="Records through "+datasetMeta.coverageThrough;
 const theme=localStorage.getItem("timeline-theme");if(["dark","light"].includes(theme))document.body.dataset.theme=theme;
 setupEvents();draw({keepScroll:false});
 if(state.mode==="timeline")requestAnimationFrame(()=>jumpToToday());
 }catch(error){$("resultsCount").textContent="Data unavailable";$("timelineCanvas").innerHTML='<div class="no-results">Failed to load the release database. Check the data file or try reloading this page.</div>';console.error(error);}
}
init();