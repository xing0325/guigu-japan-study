// Card IDs form the allowlist for a future Jev router. Never execute model HTML.
export const catalog = [
 {id:'visa',title:'签证，先看懂再准备',label:'签证机制',icon:'▤',tag:'机制介绍 · 材料清单',keys:['签证','在留','coe','visa','材料'],prompt:'日本留学签证怎么准备？',intro:'我会把学校申请、在留资格与签证分开，先给你一张可以勾选的准备卡。'},
 {id:'draft',title:'一起写申请的第一稿',label:'申请帮写',icon:'✎',tag:'填入经历 · 生成草稿',keys:['帮写','帮我写','写一份','申请书','理由书','文书','写申请','志望','留学理由'],prompt:'帮我整理一份留学申请理由书。',intro:'先整理你的真实经历和目标，再把它们放进可编辑的申请草稿。'},
 {id:'budget',title:'在日本，一年要多少钱？',label:'预算',icon:'¥',tag:'费用拆分 · 滑条试算',keys:['预算','多少钱','花费','学费','费用','万','生活费','省钱'],prompt:'帮我算一下日本留学第一年的预算。',intro:'我会展开一张预算卡。你调整学费、房租和生活费，总额会跟着变化。'},
 {id:'flight',title:'把出发安排妥当',label:'航班',icon:'↗',tag:'出发条件 · 行李清单',keys:['航班','机票','飞机','机场','出发','行李'],prompt:'我想规划去日本的航班和行李。',intro:'先确定出发地、目的地和日期，再准备行李与航班核对清单。'},
 {id:'housing',title:'找到合适的生活半径',label:'租房',icon:'⌂',tag:'住宿方式 · 入住费用',keys:['租房','住房','房子','宿舍','房租','合租','住哪里'],prompt:'帮我比较日本留学的住宿方式。',intro:'我会把月租和入住时的一次性费用分开，方便你比较宿舍、合租和独居。'},
 {id:'schools',title:'把学校放回城市里',label:'学校地点',icon:'⌖',tag:'53 所学校 · 地点资料',keys:['学校地点','位置','哪里','地图','学校','东京','大阪','京都','早稻田','isi'],prompt:'看看日本语言学校都在哪里。',intro:'我会用已有学校资料打开地点卡，先选城市，再看地址、交通和来源。'},
 {id:'compare',title:'让两所学校并排说话',label:'学校对比',icon:'⇄',tag:'并排比较 · 记录偏好',keys:['学校对比','两所','对比','比较','vs','哪所','选校','哪个好','区别'],prompt:'我想对比两所日本语言学校。',intro:'我会把两所学校放在同一张卡里。已有资料直接展示，缺少的信息留给你核实。'},
 {id:'reviews',title:'评价，也要看证据',label:'学校评价',icon:'☆',tag:'个人评估 · 证据笔记',keys:['学校评价','评价','口碑','评论','评分','好不好','靠谱'],prompt:'帮我整理学校评价，看看哪些值得核实。',intro:'先按你在意的维度做个人评估，再记录信息来源；这张卡不会编造学生评价。'},
 {id:'timeline',title:'从入学那天，倒推今天',label:'申请计划',icon:'▥',tag:'申请流程 · 可调甘特图',keys:['流程','甘特','时间','进度','计划','申请','几月','入学'],prompt:'帮我做一张申请流程甘特图。',intro:'我会以你选择的入学月份倒排准备步骤，生成可以调整和勾选的时间线。'},
 {id:'profile',title:'先认识你一点点',label:'留学画像',icon:'◉',tag:'问卷 · 选项 · 滑条',keys:['问卷','信息','了解我','个人','画像','背景','不知道','适合','问答'],prompt:'我还没想清楚，先帮我整理留学目标。',intro:'用几道轻量问题了解你的目标、日语水平和预算，再把这些偏好带进后续卡片。'},
 {id:'chart',title:'把数字变成看得懂的图',label:'图表',icon:'◴',tag:'预算占比 · 图表切换',keys:['图表','图','可视化','占比','柱状','饼图','趋势'],prompt:'把我的预算变成一张图表。',intro:'我会直接读取当前预算，把费用拆成可切换的图表；修改数字，图表也会更新。'},
 {id:'dictionary',title:'日语，不懂就停一下',label:'日语晓 tip',icon:'あ',tag:'读音 · 释义 · 随手收藏',keys:['日语','日文','单词','词典','读音','意思','查词','tip','敷金','礼金','出願','在留資格','奨学金'],prompt:'日语里的「敷金」是什么意思？',intro:'我会打开一张词语小卡，把读音、中文释义和使用场景放在一起。'}
];
export function route(text){const q=text.trim().toLowerCase();if(!q)return catalog;const scored=catalog.map((c,i)=>({c,i,score:c.keys.reduce((n,k)=>n+(q.includes(k.toLowerCase())?k.length+2:0),0)}));if(/[ぁ-ゖァ-ヺ]/.test(q))scored.find(x=>x.c.id==='dictionary').score+=8;return scored.filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.i-b.i).map(x=>x.c);}
export const defaultBudget={tuition:800000,rent:60000,living:50000,setup:200000,months:12,rate:0.05};
export function calculateBudget(v){const b={...defaultBudget,...v};const parts=[{label:'学费',value:+b.tuition},{label:'房租',value:+b.rent*+b.months},{label:'生活费',value:+b.living*+b.months},{label:'初期费用',value:+b.setup}];const total=parts.reduce((n,p)=>n+p.value,0);return{parts,total,cny:total*+b.rate};}
export function monthsBefore(target,offset){const [y,m]=target.split('-').map(Number);const d=new Date(Date.UTC(y,m-1-offset,1));return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;}
export const yen=n=>'¥'+Math.round(n).toLocaleString('zh-CN');
export const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const modelPlan={mode:'preview',router:{provider:'typesafe',model:'jev-1.13.0'},generator:{provider:'openai',model:'gpt-5.6'},schemaVersion:'study-card/v1'};
