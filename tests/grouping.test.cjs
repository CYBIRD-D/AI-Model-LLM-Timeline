const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/releases.json'),'utf8'));
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8').replace(/\ninit\(\);\s*$/,''),context);
function run(code,args={}){Object.assign(context,args);return JSON.parse(JSON.stringify(vm.runInContext(code,context)));}
const entry=(id,company,date,models,extra={})=>({id,company,date,models,title:models[0],availability:'open',capabilities:['General'],...extra});

test('OpenAI families keep each launch date and retain their members on one card in every mode',()=>{
 const entries=data.events.filter(e=>e.company==='oai');
 const expected=[
  ['2024-09-12','o1 Family',['o1-preview','o1-mini']],
  ['2024-12-05','o1 Family',['OpenAI o1','o1 pro mode']],
  ['2025-05-16','codex-1 Family',['codex-1','codex-mini-latest']],
  ['2025-08-05','gpt-oss Family',['gpt-oss-120b','gpt-oss-20b']]
 ];
 for(const density of ['overview','detail','models'])for(const zoom of [.4,2.8]){
  const cards=run('state.density=density;state.zoom=zoom;state.fromMonth="2022-11";layoutEvents(entries,2.08*zoom).cards',{entries,density,zoom});
  for(const [date,name,models] of expected){
   const matching=cards.filter(({events})=>events[0].date===date);
   assert.equal(matching.length,1,`${density}/${zoom}: ${name} on ${date}`);
   assert.deepEqual(matching[0].events.flatMap(e=>e.models),models);
   assert.ok(matching[0].html.includes(`aria-label="${name} — ${date}"`));
   assert.ok(matching[0].html.includes(`class="event-date" datetime="${date}">${date.slice(2)}</time>`));
  }
 }
 const groups=run('groupSameDayFamilies(entries)',{entries});
 assert.equal(groups.find(g=>g.date==='2025-03-19').name,'o1-pro');
 assert.equal(groups.find(g=>g.date==='2025-04-16').family,undefined);
});

test('Mistral and Muse Wonder variants share cards only within the same family and launch',()=>{
 const entries=data.events.filter(e=>e.company==='mis'||e.company==='meta');
 const families=[
  ['2025-07-15','Voxtral Family',['Voxtral Small','Voxtral Mini']],
  ['2025-12-02','Ministral 3 Family',['Ministral 3 - 3B','Ministral 3 - 8B','Ministral 3 - 14B']],
  ['2025-12-09','Devstral 2 Family',['Devstral 2','Devstral Small 2']],
  ['2026-10-12','Muse Wonder Family',['Muse Wonder','Muse Wonder Full']]
 ];
 for(const density of ['overview','detail','models'])for(const zoom of [.4,2.8]){
  const cards=run('state.density=density;state.zoom=zoom;state.fromMonth="2022-11";layoutEvents(entries,2.08*zoom).cards',{entries,density,zoom});
  for(const [date,name,models] of families){
   const family=cards.filter(({html})=>html.includes(`aria-label="${name} — ${date}"`));
   assert.equal(family.length,1,`${density}/${zoom}: ${name}`);
   const names=family[0].events.flatMap(e=>e.models);
   assert.deepEqual(run('expandModelNames(names)',{names}),models);
  }
 }
 const groups=run('groupSameDayFamilies(entries)',{entries});
 const sameDay=date=>groups.filter(g=>g.date===date).map(g=>g.name).sort();
 assert.deepEqual(sameDay('2024-11-18'),['Mistral Large 2.1','Pixtral Large']);
 assert.deepEqual(sameDay('2026-03-16'),['Leanstral','Mistral Small 4']);
 assert.equal(entries.find(e=>e.title==='Devstral Medium 1.0').availability,'closed');
 assert.equal(entries.find(e=>e.title==='Devstral Small 1.1').availability,'open');
});

test('Dots collect a release day within a track, retain exact positions and survive maximum zoom',()=>{
 const entries=[
  entry('a','oai','2026-11-01',['GPT-6 Astra']),
  entry('b','oai','2026-11-01',['GPT-6 Sol']),
  entry('c','oai','2026-11-02',['GPT-6 Luna'])
 ];
 const dots=run('state.fromMonth="2026-11";state.density="dots";layoutDots(entries,2).cards',{entries});
 assert.equal(dots.length,2);
 assert.deepEqual(dots[0].events.map(e=>e.id),['a','b']);
 assert.deepEqual(dots[1].events.map(e=>e.id),['c']);
 assert.match(dots[0].html,/class="event-dot".*style="left:0\.0px;top:8px;/);
 assert.match(dots[1].html,/class="event-dot".*style="left:2\.0px;top:35px;/);
 assert.ok(dots.every(d=>!d.html.includes('event-name')));
 const density=run('paramsRead();state.density',{URL,location:{href:'https://example.test/?density=dots&zoom=2.8'}});
 assert.equal(density,'dots');
});

test('Qwen Next, Omni, VL, Coder and Math never collapse into a generic Qwen3 family',()=>{
 const releases=run('groupSameDayFamilies(entries)',{entries:data.events.filter(e=>e.company==='qwen')});
 for(const [date,name] of [['2025-09-11','Qwen3-Next Family'],['2025-09-21','Qwen3-Omni Family'],['2025-09-23','Qwen3-VL Family']]){
  assert.equal(releases.find(e=>e.date===date).name,name);
 }
 assert.deepEqual(releases.filter(e=>e.date==='2024-09-19').map(e=>e.name).sort(),['Qwen2.5 Family','Qwen2.5-Coder Family','Qwen2.5-Math Family']);
 const sameDay=['Next','Omni','VL'].map((series,i)=>entry(String(i),'qwen','2025-09-11',[`Qwen3-${series}-80B-A3B-Instruct / Thinking`]));
 assert.equal(run('groupSameDayFamilies(entries).length',{entries:sameDay}),3);
});

test('Gemma parameter variants stay grouped in all modes and at both zoom limits',()=>{
 const entries=data.events.filter(e=>e.company==='goog'&&e.models.some(m=>/gemma/i.test(m)));
 for(const density of ['overview','detail','models'])for(const zoom of [.4,1.3,2.8]){
  const html=run('state.density=density;state.zoom=zoom;state.fromMonth="2022-11";layoutEvents(entries,2.08*zoom).cards.map(c=>c.html).join("")',{entries,density,zoom});
  for(const name of ['Gemma 3n Family','PaliGemma 2 Family','PaliGemma 2 mix Family','MedGemma Family','TranslateGemma Family','Gemma 4 Family']){
   assert.equal(html.split(`aria-label="${name} —`).length-1,1,`${density}/${zoom}: ${name}`);
  }
  assert.doesNotMatch(html,/aria-label="Gemma 4 (?:E2B|E4B|31B|26B)/);
 }
});

test('Early GLM families stay grouped without mixing Z1, Rumination, vision or context variants',()=>{
 const entries=data.events.filter(e=>e.company==='glm');
 const groups=run('groupSameDayFamilies(entries)',{entries});
 const april=groups.filter(g=>g.date==='2025-04-14');
 assert.deepEqual(april.map(g=>g.name).sort(),['GLM-4-0414 Family','GLM-Z1-0414 Family','GLM-Z1-Rumination-32B-0414']);
 assert.deepEqual(april.find(g=>g.name==='GLM-4-0414 Family').events.flatMap(e=>e.models),['GLM-4-9B-0414','GLM-4-32B-Base-0414','GLM-4-32B-0414']);
 assert.deepEqual(april.find(g=>g.name==='GLM-Z1-0414 Family').events.flatMap(e=>e.models),['GLM-Z1-9B-0414','GLM-Z1-32B-0414']);
 assert.deepEqual(groups.filter(g=>g.date==='2024-06-05').map(g=>g.name).sort(),['GLM-4 Family','GLM-4-9B-Chat-1M','GLM-4V-9B']);
 assert.deepEqual(groups.find(g=>g.name==='ChatGLM Family').events.flatMap(e=>e.models),['ChatGLM-6B','ChatGLM-130B']);
 const before=JSON.stringify(entries);
 for(const density of ['overview','detail','models'])for(const zoom of [.4,1.3,2.8]){
  const cards=run('state.density=density;state.zoom=zoom;state.fromMonth="2022-11";layoutEvents(entries,2.08*zoom).cards',{entries,density,zoom});
  const html=cards.map(c=>c.html).join('');
  for(const [date,name] of [['2023-03-14','ChatGLM Family'],['2024-06-05','GLM-4 Family'],['2025-04-14','GLM-4-0414 Family'],['2025-04-14','GLM-Z1-0414 Family'],['2025-07-28','GLM-4.5 Family']]){
   assert.equal(html.split(`aria-label="${name} — ${date}"`).length-1,1,`${density}/${zoom}: ${name}`);
  }
  assert.doesNotMatch(html,/aria-label="GLM-(?:4-(?:9B|32B)(?:-Base)?|Z1-(?:9B|32B))-0414 —/);
  for(const event of entries){
   const actual=cards.flatMap(c=>c.events).filter(e=>e.id===event.id);
   assert.ok(actual.every(e=>e.date===event.date));
   assert.deepEqual(run('expandModelNames(names)',{names:actual.flatMap(e=>e.models)}).sort(),run('expandModelNames(names)',{names:event.models}).sort());
  }
 }
 assert.equal(JSON.stringify(entries),before);
});

test('GLM grouping combines separate same-day parameter entries and respects date and status boundaries',()=>{
 const entries=[
  entry('a','glm','2025-04-14',['GLM-Z1-9B-0414']),
  entry('b','glm','2025-04-14',['GLM-Z1-32B-0414']),
  entry('c','glm','2025-04-15',['GLM-Z1-9B-0414']),
  entry('d','glm','2025-04-14',['GLM-Z1-32B-0414'],{availability:'closed'}),
  entry('e','glm','2025-04-14',['GLM-Z1-9B-0415']),
  entry('f','glm','2025-04-14',['GLM-Z1-Rumination-32B-0414'])
 ];
 const groups=run('groupSameDayFamilies(entries)',{entries});
 assert.equal(groups.length,5);
 const family=groups.find(g=>g.name==='GLM-Z1-0414 Family');
 assert.deepEqual(family.events.map(e=>e.id),['a','b']);
 assert.equal(family.date,'2025-04-14');
});

test('Grouping preserves dates, subtype qualifiers and complete member lists',()=>{
 const entries=[
  entry('a','goog','2026-03-31',['Gemma 4 E2B'],{capabilities:['General']}),
  entry('b','goog','2026-03-31',['Gemma 4 31B'],{capabilities:['Multimodal'],event_type:'api_release'}),
  entry('c','goog','2026-04-01',['Gemma 4 E4B']),
  entry('d','goog','2026-03-31',['Gemma 3n E2B']),
  entry('e','goog','2026-03-31',['PaliGemma 2 3B'])
 ];
 const groups=run('groupSameDayFamilies(entries)',{entries});
 assert.equal(groups.length,4);
 const family=groups.find(g=>g.name==='Gemma 4 Family');
 assert.deepEqual(family.events.flatMap(e=>e.models),['Gemma 4 E2B','Gemma 4 31B']);
 assert.equal(family.date,'2026-03-31');
 const mixed=data.events.find(e=>e.id==='goog-2025-07-09-171');
 const split=run('groupSameDayFamilies([event])',{event:mixed});
 assert.deepEqual(split.map(g=>g.name).sort(),['MedGemma 27B multimodal','T5Gemma']);
 assert.ok(split.every(g=>g.events.every(e=>e.models.length===1)));
});

test('Timeline abbreviations preserve special series, checkpoint dates and full source names',()=>{
 for(const [name,company,expected] of [
  ['GPT-4.1 Family','oai','4.1 Family'],['Claude Sonnet 4.5','anth','Sonnet 4.5'],
  ['Gemini 4 Carbon','goog','4 Carbon'],['Qwen3-Next Family','qwen','3-Next Family'],
  ['DeepSeek-V4.1-Flash-1017','deep','V4.1-Flash-1017'],['gpt-oss Family','oai','gpt-oss Family'],
  ['Gemma 3n Family','goog','Gemma 3n Family'],['QwQ-32B','qwen','QwQ-32B'],
  ['CodeQwen1.5-7B','qwen','CodeQwen1.5-7B'],['Pixtral 12B','mis','Pixtral 12B'],
  ['GPT-4V / GPT-4 with Vision','oai','4V / 4 with Vision'],['GPT-4o update (1120)','oai','4o update (1120)'],
  ['Gemini 2.0 Flash Experimental','goog','2.0 Flash Experimental'],
  ['Qwen3-Coder-480B-A35B-Instruct','qwen','3-Coder-480B-A35B-Instruct']
 ])assert.equal(run('cardLabel(name,company)',{name,company}),expected);
 const event=data.events.find(e=>e.id==='qwen-2026-07-15-qwen3-7-flash');
 const html=run('state.density="models";state.fromMonth="2026-01";layoutEvents([event],2).cards[0].html',{event});
 assert.match(html,/0715 snapshot/);
 assert.match(html,/aria-label="Qwen3\.7-Flash/);
});

test('A short card is narrower than the old minimum and keeps its full label and date',()=>{
 const date='2024-05-13';
 const short=run('compactCardMetrics("4o",date)',{date});
 const long=run('compactCardMetrics("4 Turbo Preview 0125",date)',{date});
 assert.ok(short.width<70);
 assert.deepEqual(short.lines,['4o']);
 assert.equal(long.lines.join(' '),'4 Turbo Preview 0125');
 const event=entry('a','oai',date,['GPT-4o']);
 const html=run('state.density="detail";state.fromMonth="2024-05";layoutEvents([event],2).cards[0].html',{event});
 assert.match(html,/aria-label="GPT-4o — 2024-05-13"/);
 assert.match(html,/<time class="event-date" datetime="2024-05-13">24-05-13<\/time>/);
});

test('Weights metadata never shifts the original launch or adds a duplicate release',()=>{
 for(const [id,date,weightDate] of [
  ['mini-2026-06-01-minimax-m3','2026-06-01','2026-06-12'],
  ['moon-2026-07-16-kimi-k3','2026-07-16','2026-07-27'],
  ['deep-2026-08-21-deepseek-v4-flash-vision-exp-api_release','2026-08-21','2026-08-31'],
  ['mini-2026-10-19-minimax-m3-1-flash-api_release','2026-10-19','2026-10-23']
 ]){
  const event=data.events.find(e=>e.id===id);
  assert.equal(event.date,date);assert.equal(event.weight_release_date,weightDate);assert.equal(event.availability,'open');
  assert.equal(data.events.filter(e=>e.company===event.company&&JSON.stringify(e.models)===JSON.stringify(event.models)).length,1);
 }
 assert.ok(!data.events.some(e=>e.event_type==='weights_release'));
 for(const id of ['hy-2026-11-04-hy4-ga','moon-2026-10-23-kimi-k3-1-pro-api_release','mis-2026-10-06-mistral-large-4-preview','glm-2026-08-14-glm-5-3']){
  const event=data.events.find(e=>e.id===id);
  assert.equal(event.availability,'open');assert.equal(event.weight_status,'announced');
  assert.ok(event.weight_release_window&&event.weight_schedule_source);
  assert.ok(!event.weight_release_date);
 }
 assert.equal(new Set(data.events.map(e=>e.id)).size,data.events.length);
});
