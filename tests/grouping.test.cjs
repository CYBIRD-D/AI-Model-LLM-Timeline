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
  ['CodeQwen1.5-7B','qwen','CodeQwen1.5-7B'],['Pixtral 12B','mis','Pixtral 12B']
 ])assert.equal(run('cardLabel(name,company)',{name,company}),expected);
 const event=data.events.find(e=>e.id==='qwen-2026-07-15-qwen3-7-flash');
 const html=run('state.density="models";state.fromMonth="2026-01";layoutEvents([event],2).cards[0].html',{event});
 assert.match(html,/0715 snapshot/);
 assert.match(html,/aria-label="Qwen3\.7-Flash/);
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
