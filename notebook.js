(() => {
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const locale=window.guiguLocale, t=locale.t;
let openDetailId=null, creditsOpen=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)'), params=new URLSearchParams(location.search);
const regions=[
  {id:'hokkaido',name:'札幌・函馆',cities:['札幌','函馆']},
  {id:'kanto',name:'东京周边',cities:['东京','埼玉','川崎','横滨']},
  {id:'kinki',name:'京阪神',cities:['大阪','京都','神户']},
  {id:'chubu',name:'甲府',cities:['甲府']},
  {id:'kyushu',name:'福冈周边',cities:['北九州','福冈']},
  {id:'okinawa',name:'冲绳',cities:['那霸']}
];
const regionForCity=city=>regions.find(r=>r.cities.includes(city))?.id||'';
const regionForSchool=school=>regionForCity(school.city);
const validRegion=id=>id==='kyushu-okinawa'?'kyushu':regions.some(r=>r.id===id)?id:'';
const state={region:validRegion(params.get('region')),schools:[],filtered:[],tab:'discover',city:params.get('city')||'',district:params.get('district')||'',query:'',savedOnly:false,limit:9,selected:null,level:'',goal:''};
let saved=new Set(),map=null,mapReady=false,mapStarting=false,pendingFocus=null,mapWatchdog=0,popup=null;
try{saved=new Set(JSON.parse(localStorage.getItem('guigu-favorites')||'[]'));const profile=JSON.parse(sessionStorage.getItem('guigu-profile')||'{}');state.level=profile.level||'';state.goal=profile.goal||''}catch{}
let entered=params.has('entered');try{entered ||= sessionStorage.getItem('guigu-notebook-entered')==='1'}catch{}
const entry=$('#cloth-entry');if(entered)entry?.remove();else if(entry)new MutationObserver(()=>{if(entry.hidden){try{sessionStorage.setItem('guigu-notebook-entered','1')}catch{}}}).observe(entry,{attributes:true,attributeFilter:['hidden']});
function toast(message){$('#toast').dataset.i18n=message;$('#toast').textContent=t(message);$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),2400)}
function remember(){try{localStorage.setItem('guigu-favorites',JSON.stringify([...saved]))}catch{}$('#saved-count').textContent=saved.size}
function syncUrl(push=false){const u=new URL(location.href);u.searchParams.set('tab',state.tab);u.searchParams.set('lang',locale.lang);state.city?u.searchParams.set('city',state.city):u.searchParams.delete('city');state.region?u.searchParams.set('region',state.region):u.searchParams.delete('region');state.district?u.searchParams.set('district',state.district):u.searchParams.delete('district');if(!state.selected)u.searchParams.delete('school');u.hash='';(push?history.pushState:history.replaceState).call(history,{},'',u)}
const scrollPositions={discover:0,schools:0,map:0};
function setTab(tab,{push=true,restore=true}={}){if(!['discover','schools','map'].includes(tab))tab='discover';const previous=state.tab;scrollPositions[previous]=window.scrollY;state.tab=tab;$('#panel-discover').hidden=tab!=='discover';$('#workspace').hidden=tab==='discover';$('#panel-schools').hidden=tab!=='schools';$('#panel-map').hidden=tab!=='map';document.body.classList.toggle('map-mode',tab==='map');$$('.main-tabs [role=tab]').forEach(b=>{const on=b.dataset.tab===tab;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1});$('#workspace-title').textContent=t(tab==='map'?'把学校，放进生活里。':'找到你的学校。');if(push)syncUrl(true);requestAnimationFrame(()=>{if(previous!==tab)window.scrollTo({top:restore?scrollPositions[tab]:0,behavior:'instant'});updateHeader();if(tab==='map'){drawRegionOutlines();ensureMap();map?.resize()}});closeDropdowns();}
function updateHeader(){$('#site-header').classList.toggle('compact',window.scrollY>35||state.tab==='map')}
window.addEventListener('scroll',updateHeader,{passive:true});
document.addEventListener('click',e=>{const tab=e.target.closest('[data-tab]');if(tab)setTab(tab.dataset.tab);const city=e.target.closest('[data-city]');if(city){state.region=regionForCity(city.dataset.city);state.city=city.dataset.city;state.district='';state.query='';state.savedOnly=false;syncControls();render();setTab('schools',{restore:false})}const open=e.target.closest('[data-open]');if(open)showDetail(open.dataset.open);const save=e.target.closest('[data-save]');if(save){const id=save.dataset.save;saved.has(id)?saved.delete(id):saved.add(id);remember();render({fit:false});$$('[data-save]').forEach(b=>{const on=saved.has(b.dataset.save);b.setAttribute('aria-pressed',String(on));b.textContent=on?'♥':'♡'});toast(saved.has(id)?'已收进心动清单':'已从心动清单移除')}const locate=e.target.closest('[data-locate]');if(locate){$('#school-dialog').close();setTab('map',{restore:false});selectSchool(locate.dataset.locate)}const row=e.target.closest('[data-map-school]');if(row)selectSchool(row.dataset.mapSchool);if(e.target.closest('[data-reset]'))resetFilters()});
$$('.main-tabs [role=tab]').forEach((b,i)=>b.addEventListener('keydown',e=>{const tabs=$$('.main-tabs [role=tab]');let next;if(e.key==='ArrowRight')next=(i+1)%tabs.length;if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();setTab(tabs[next].dataset.tab);tabs[next].focus()}}));
window.addEventListener('popstate',()=>{const q=new URLSearchParams(location.search);if(q.get('lang'))locale.set(q.get('lang'),{history:false});state.city=q.get('city')||'';state.region=regionForCity(state.city)||validRegion(q.get('region'));state.district=q.get('district')||'';syncControls();render();setTab(q.get('tab')||'discover',{push:false})});
$('#to-cities').onclick=()=>$('#city-section').scrollIntoView({behavior:reduced.matches?'instant':'smooth'});
function photo(s){
  const specific={1:'kfla',2:'waseda',4:'unitas',10:'isi-shinjuku',11:'kcp'};
  if(specific[s.row])return {src:'assets/'+specific[s.row]+'.jpg',label:t('校园实景')};
  const cities={'东京':'tokyo','京都':'kyoto','大阪':'osaka'};
  if(cities[s.city])return {src:'assets/'+cities[s.city]+'.jpg',label:t('城市街景')};
  return {src:'assets/illustrations/journey.png',label:t('留学生活插画')};
}
function card(raw){const p=photo(raw),s=locale.school(raw);return `<article class="school-card"><div class="school-photo"><button class="open-card" data-open="${escape(s.id)}" aria-label="${t('查看学校详情')}：${escape(s.name)}"><img src="${p.src}" alt="${p.label}" loading="lazy"></button><button class="save-button" data-save="${escape(s.id)}" aria-label="${t('收藏学校')}：${escape(s.name)}" aria-pressed="${saved.has(s.id)}">${saved.has(s.id)?'♥':'♡'}</button></div><div class="school-info"><div class="school-meta">${escape(s.city)}${s.city!==s.district?' / '+escape(s.district):''}</div><h3><button data-open="${escape(s.id)}">${escape(s.name)}</button></h3><p><span>${escape(s.access||t('学校资料待确认'))}</span><span aria-hidden="true">↗</span></p></div></article>`}
function empty(){return `<div class="empty-state"><img src="assets/illustrations/turtle.png" alt=""><h3>${t('换个方向，再找找。')}</h3><p>${t('暂时没有符合条件的学校，试试其他城市或关键词。')}</p><button data-reset>${t('清空筛选，重新看看 →')}</button></div>`}
function districts(){const values=[...new Set(state.schools.filter(s=>(!state.region||regionForSchool(s)===state.region)&&(!state.city||s.city===state.city)).map(s=>s.district))];$('#district-filter').innerHTML='<option value="">'+t('不限街区')+'</option>'+values.map(d=>`<option value="${escape(d)}">${escape(t(d))}</option>`).join('');if(!values.includes(state.district))state.district='';$('#district-filter').value=state.district}
function syncControls(){populateCities();$('#city-filter').value=state.city;districts();$('#school-search').value=state.query;$('#level-filter').value=state.level;$('#goal-filter').value=state.goal;syncDropdowns()}
function render({fit=true}={}){
  state.filtered=state.schools.filter(s=>(!state.region||regionForSchool(s)===state.region)&&(!state.city||s.city===state.city)&&(!state.district||s.district===state.district)&&(!state.query||locale.search(s).includes(state.query.toLowerCase()))&&(!state.savedOnly||saved.has(s.id)));
  $('#result-count').textContent=(state.savedOnly?t('心动清单 · '):'')+(state.region?t(regions.find(r=>r.id===state.region).name)+' · ':'')+t('{count} 条学校资料',{count:state.filtered.length});
  $('#profile-note').textContent=state.level||state.goal?t('意向已记下；课程与语言要求需向学校确认。'):'';
  $('#profile-note').hidden=!(state.level||state.goal);
  $('#saved-toggle').setAttribute('aria-pressed',String(state.savedOnly));
  $('#school-grid').innerHTML=state.filtered.slice(0,state.limit).map(card).join('')||empty();
  $('#load-more').hidden=state.filtered.length<=state.limit;
  $('#map-school-list').innerHTML=state.filtered.map(raw=>{const s=locale.school(raw);return `<button class="map-row${state.selected===s.id?' selected':''}" data-map-school="${escape(s.id)}" aria-pressed="${state.selected===s.id}"><small>${escape(s.city)}${s.city!==s.district?' / '+escape(s.district):''}</small><strong>${escape(s.name)}</strong><span>${s.coordinates?'⌖ '+escape(s.access||t('查看学校位置')):t('校名待确认 · 暂未落点')}</span></button>`}).join('')||empty();
  $('#point-count').textContent=t('{count} 个位置',{count:state.filtered.filter(s=>s.coordinates).length});
  if(state.selected&&!state.filtered.some(s=>s.id===state.selected)){state.selected=null;$('#map-school-detail').hidden=true}
  if(mapReady){updateMapSource();if(fit)fitMap()}syncDropdowns();syncRegions();syncDensityShortcuts();if(clusterSchoolIds.length&&!clusterSchoolIds.every(id=>state.filtered.some(s=>s.id===id)))clearClusterPicker();
}
function resetFilters(){Object.assign(state,{region:'',city:'',district:'',query:'',savedOnly:false,limit:9,level:'',goal:''});try{sessionStorage.removeItem('guigu-profile')}catch{}syncControls();render();syncUrl()}
$('#city-filter').onchange=()=>{state.city=$('#city-filter').value;state.region=regionForCity(state.city)||state.region;state.district='';state.limit=9;syncControls();render();syncUrl()};$('#district-filter').onchange=()=>{state.district=$('#district-filter').value;state.limit=9;render();syncUrl()};$('#school-search').oninput=()=>{state.query=$('#school-search').value.trim();state.limit=9;render()};for(const id of ['level','goal'])$('#'+id+'-filter').onchange=()=>{state[id]=$('#'+id+'-filter').value;try{sessionStorage.setItem('guigu-profile',JSON.stringify({level:state.level,goal:state.goal}))}catch{}render({fit:false})};$('#filters').onsubmit=e=>e.preventDefault();$('#reset-filters').onclick=resetFilters;$('#load-more').onclick=()=>{state.limit+=9;render({fit:false})};$('#saved-toggle').onclick=()=>{state.savedOnly=!state.savedOnly;state.region='';state.city='';state.district='';state.query='';state.limit=9;syncControls();render();if(state.tab==='discover')setTab('schools',{restore:false});else syncUrl()};
function showDetail(id){const raw=state.schools.find(s=>s.id===id);if(!raw)return;const p=photo(raw),s=locale.school(raw);openDetailId=id;creditsOpen=false;$('#dialog-content').innerHTML=`<img class="detail-photo" src="${p.src}" alt="${p.label}"><div class="detail-body"><p class="photo-source">${p.label}</p><h2>${escape(s.name)}</h2><dl><dt>${t('所在城市')}</dt><dd>${escape(s.city)}${s.city!==s.district?' / '+escape(s.district):''}</dd><dt>${t('学校地址')}</dt><dd>${escape(s.address||t('待核实'))}</dd><dt>${t('附近交通')}</dt><dd>${escape(s.access||t('待核实'))}</dd></dl>${s.note?`<p>${escape(s.note)}</p>`:''}<p>${t('学费、入学时间与申请条件，以学校最新公布的信息为准。')}</p><div class="detail-actions">${s.coordinates?`<button class="primary" data-locate="${escape(s.id)}">${t('在地图中查看 ↗')}</button>`:`<span>${t('校名待确认，暂未落点')}</span>`}<a href="${escape(s.source)}" target="_blank" rel="noopener noreferrer">${t('学校资料来源 ↗')}</a><button data-save="${escape(s.id)}" aria-label="${t('收藏学校')}：${escape(s.name)}" aria-pressed="${saved.has(s.id)}">${saved.has(s.id)?'♥':'♡'}</button></div></div>`;if(!$('#school-dialog').open)$('#school-dialog').showModal()}
$('.dialog-close').onclick=()=>$('#school-dialog').close();$('#school-dialog').addEventListener('click',e=>{if(e.target!==e.currentTarget)return;const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()});
function showCredits(){openDetailId=null;creditsOpen=true;$('#dialog-content').innerHTML=`<div class="detail-body"><h2>${t('图片来源')}</h2><p>${t('城市摄影来自 Unsplash；校园照片来自学校官网。')}</p><p>${t('通学、共读、出发与小龟插画为本站生成的原创插画。')}</p><div class="detail-actions"><a href="assets/photo-sources.json" target="_blank" rel="noopener">${t('查看摄影来源 ↗')}</a></div></div>`;if(!$('#school-dialog').open)$('#school-dialog').showModal()}
$('#credits-open').onclick=showCredits;
// One native MapLibre instance lives inside the map tab. It is never navigated to or recreated on tab changes.
function collection(){return{type:'FeatureCollection',features:state.filtered.filter(s=>s.coordinates).map(s=>({type:'Feature',properties:{id:s.id,name:locale.school(s).name},geometry:{type:'Point',coordinates:s.coordinates}}))}}
let mapSourceKey='';
function updateMapSource(){const key=locale.lang+':'+state.filtered.map(s=>s.id).join(',');if(key!==mapSourceKey){map.getSource('schools')?.setData(collection());mapSourceKey=key;}const selected=state.schools.find(s=>s.id===state.selected);map.getSource('selection')?.setData({type:'FeatureCollection',features:selected?.coordinates?[{type:'Feature',properties:{},geometry:{type:'Point',coordinates:selected.coordinates}}]:[]})}
function fitMap(){if(!mapReady)return;const points=state.filtered.filter(s=>s.coordinates);if(!points.length)return;if(points.length===1){map.easeTo({center:points[0].coordinates,zoom:13,duration:reduced.matches?0:650});return}const b=new maplibregl.LngLatBounds();points.forEach(s=>b.extend(s.coordinates));map.fitBounds(b,{padding:65,maxZoom:13,duration:reduced.matches?0:650})}
let mapStylePromise=null;
function prepareMap(){
  if(!mapStylePromise){
    mapStylePromise=fetch('map-style.json?v=20261007-map',{signal:AbortSignal.timeout(10000)})
      .then(r=>{if(!r.ok)throw Error('map style');return r.json()})
      .catch(error=>{mapStylePromise=null;throw error});
  }
  return mapStylePromise;
}
// Warm just the small style and connections on intent, without creating a hidden map.
function warmMap(){
  for(const href of ['https://tiles-a.basemaps.cartocdn.com','https://tiles.basemaps.cartocdn.com']){
    if(!document.head.querySelector(`link[rel="preconnect"][href="${href}"]`)){
      const link=document.createElement('link');link.rel='preconnect';link.href=href;link.crossOrigin='anonymous';document.head.append(link);
    }
  }
  prepareMap().catch(()=>{});
}
$$('[data-tab="map"]').forEach(button=>{
  button.addEventListener('pointerenter',warmMap,{once:true});
  button.addEventListener('focus',warmMap,{once:true});
});
function mapCamera(){
  const selected=state.schools.find(s=>s.id===(pendingFocus||state.selected));
  if(selected?.coordinates)return {center:selected.coordinates,zoom:14};
  const points=state.filtered.filter(s=>s.coordinates);
  if(!points.length)return {center:[138,36],zoom:4};
  if(points.length===1)return {center:points[0].coordinates,zoom:13};
  const bounds=new maplibregl.LngLatBounds();points.forEach(s=>bounds.extend(s.coordinates));
  return {bounds,fitBoundsOptions:{padding:65,maxZoom:13,duration:0}};
}
async function ensureMap(camera){
  if(map){map.resize();return}
  if(mapStarting)return;
  mapStarting=true;
  mapStatus('正在加载街道底图…');
  let current=null;
  try{
    const style=JSON.parse(JSON.stringify(await prepareMap()));
    localizeMapStyle(style);
    for(const layer of style.layers){
      if(layer.type==='symbol'&&layer.paint){layer.paint['text-color']='#74768b';layer.paint['text-halo-color']='#ffffff'}
      if(layer.type==='fill'&&/building/i.test(layer.id))layer.paint={...layer.paint,'fill-color':'#e6e7f0'};
      if(layer.type==='background')layer.paint={'background-color':'#f8f8fc'};
      if(layer.type==='fill'&&/water/i.test(layer.id))layer.paint={...layer.paint,'fill-color':'#dfe5fa'};
      if(layer.type==='fill'&&/park|landcover|landuse/i.test(layer.id)&&layer.paint?.['fill-color'])layer.paint['fill-color']='#eaeef3';
    }
    // Start at the intended viewport: do not download Japan overview tiles first.
    const initialResults=state.filtered.map(s=>s.id).join(',');
    const initialSchool=pendingFocus||state.selected;
    current=map=new maplibregl.Map({container:'school-map',style,...(camera||mapCamera()),minZoom:2,maxZoom:18,attributionControl:true,locale:{'NavigationControl.ZoomIn':t('放大'),'NavigationControl.ZoomOut':t('缩小'),'AttributionControl.ToggleAttribution':t('切换地图来源信息'),'AttributionControl.MapFeedback':t('地图来源')}});
    current.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
    let hasBasemapTile=false,failed=false;
    const showSlow=()=>{
      clearTimeout(mapWatchdog);
      mapWatchdog=setTimeout(()=>{if(map===current)mapStatus('底图加载较慢，可先查看学校资料。',true)},6000);
    };
    showSlow();
    current.on('dataloading',e=>{
      if(map!==current||e.sourceId!=='carto')return;
      // Do not erase an error just because another tile is still in flight.
      if($('#map-status').hidden){mapStatus('正在加载街道底图…');showSlow()}
    });
    current.on('sourcedata',e=>{
      if(e.sourceId==='carto'&&e.tile?.state==='loaded')hasBasemapTile=true;
    });
    current.on('idle',()=>{
      if(map!==current||!hasBasemapTile||failed)return;
      clearTimeout(mapWatchdog);$('#map-status').hidden=true;$('#map-retry').hidden=true;
    });
    current.on('error',e=>{
      if(map!==current)return;
      failed=true;clearTimeout(mapWatchdog);
      mapStatus('底图加载失败，可重试；学校资料仍可查看。',true);
      console.warn('Map resource failed',e.error);
    });
    // The local school overlay must not wait for remote basemap tiles to finish.
    current.once('style.load',()=>{
      if(map!==current)return;
      map.addSource('schools',{type:'geojson',data:collection(),cluster:true,clusterMaxZoom:9,clusterRadius:40});
      map.addSource('selection',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
      map.addLayer({id:'clusters',type:'circle',source:'schools',filter:['has','point_count'],paint:{'circle-color':'#3439ce','circle-radius':['step',['get','point_count'],18,10,24,30,29],'circle-stroke-width':3,'circle-stroke-color':'#ffffff'}});
      map.addLayer({id:'cluster-count',type:'symbol',source:'schools',filter:['has','point_count'],layout:{'text-field':['get','point_count_abbreviated'],'text-font':['Open Sans Regular'],'text-size':12},paint:{'text-color':'#fff'}});
      map.addLayer({id:'points',type:'circle',source:'schools',filter:['!',['has','point_count']],paint:{'circle-color':'#3439ce','circle-radius':7,'circle-stroke-width':2,'circle-stroke-color':'#fff'}});
      map.addLayer({id:'selected-point',type:'circle',source:'selection',paint:{'circle-radius':13,'circle-color':'#3439ce','circle-opacity':.2,'circle-stroke-width':2,'circle-stroke-color':'#3439ce'}});
      map.on('click','points',e=>{
        const ids=[...new Set(e.features.map(f=>f.properties.id))];
        if(ids.length>1)showClusterSchools(ids);else selectSchool(ids[0]);
      });
      map.on('click','clusters',async e=>{
        const request=++clusterRequest,sourceKey=mapSourceKey,instance=map,feature=e.features[0];
        try{
          const leaves=await instance.getSource('schools').getClusterLeaves(feature.properties.cluster_id,feature.properties.point_count,0);
          if(request!==clusterRequest||instance!==map||sourceKey!==mapSourceKey)return;
          showClusterSchools(leaves.map(f=>f.properties.id));
        }catch(error){if(request===clusterRequest)toast('暂时无法展开，请重试。')}
      });
      map.on('mouseenter','points',e=>{map.getCanvas().style.cursor='pointer';popup?.remove();popup=new maplibregl.Popup({closeButton:false,offset:14}).setLngLat(e.features[0].geometry.coordinates).setText(e.features[0].properties.name).addTo(map)});
      map.on('mouseleave','points',()=>{map.getCanvas().style.cursor='';popup?.remove()});
      map.on('mouseenter','clusters',()=>map.getCanvas().style.cursor='pointer');
      map.on('mouseleave','clusters',()=>map.getCanvas().style.cursor='');
      mapReady=true;mapStarting=false;mapSourceKey='';updateMapSource();
      if(pendingFocus){const id=pendingFocus;pendingFocus=null;selectSchool(id,{move:id!==initialSchool})}
      else if(initialResults!==state.filtered.map(s=>s.id).join(','))fitMap();
    });
  }catch(error){
    if(current){current.remove();if(map===current)map=null}
    mapStarting=false;mapReady=false;clearTimeout(mapWatchdog);
    mapStatus('底图加载失败，可重试；学校资料仍可查看。',true);
    console.error(error);
  }
}
$('#map-retry').onclick=()=>{
  const camera=map?{center:map.getCenter(),zoom:map.getZoom(),bearing:map.getBearing(),pitch:map.getPitch()}:undefined;
  clearTimeout(mapWatchdog);popup?.remove();popup=null;map?.remove();map=null;
  mapStarting=false;mapReady=false;mapSourceKey='';
  ensureMap(camera);
};
function selectSchool(id,{move=true}={}){clearClusterPicker();const raw=state.schools.find(s=>s.id===id);if(!raw)return;const s=locale.school(raw);if(!s.coordinates){showDetail(id);return}state.selected=id;$$('[data-map-school]').forEach(b=>{const selected=b.dataset.mapSchool===id;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected))});$('#map-school-detail').innerHTML=`<button id="close-map-detail" aria-label="${t('收起学校信息')}">×</button><small>${escape(s.city)}${s.city!==s.district?' / '+escape(s.district):''}</small><h3>${escape(s.name)}</h3><p>${escape(s.address)}<br>${escape(s.access)}</p><button class="line-link" data-open="${escape(id)}">${t('看看这所学校')} <span>↗</span></button>`;$('#map-school-detail').hidden=false;$('#close-map-detail').onclick=()=>{state.selected=null;$('#map-school-detail').hidden=true;$$('[data-map-school]').forEach(b=>{b.classList.remove('selected');b.setAttribute('aria-pressed','false')});if(mapReady)updateMapSource()};if(mapReady){updateMapSource();if(move)map.flyTo({center:s.coordinates,zoom:14,duration:reduced.matches?0:900,padding:{right:innerWidth>760?170:0}})}else{pendingFocus=id;ensureMap()}}
$('#map-fit').onclick=fitMap;
const dropdowns=[];
function closeDropdowns(){dropdowns.forEach(({shell,trigger})=>{shell.classList.remove('open');trigger.setAttribute('aria-expanded','false')})}
function syncDropdowns(){dropdowns.forEach(d=>d.sync())}
$$('#filters select').forEach(select=>{select.hidden=true;const shell=document.createElement('div');shell.className='select-shell';const trigger=document.createElement('button');trigger.type='button';trigger.className='select-trigger';trigger.setAttribute('role','combobox');trigger.setAttribute('aria-label',select.parentElement.querySelector('span').textContent);trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-haspopup','listbox');const menu=document.createElement('div');menu.id=select.id+'-options';menu.className='select-menu';menu.setAttribute('role','listbox');menu.setAttribute('aria-label',trigger.getAttribute('aria-label'));trigger.setAttribute('aria-controls',menu.id);shell.append(trigger,menu);select.after(shell);function sync(){const label=select.parentElement.querySelector('span').textContent;trigger.setAttribute('aria-label',label);menu.setAttribute('aria-label',label);trigger.innerHTML='<span>'+escape(select.selectedOptions[0]?.textContent||'')+'</span><span class="chevron" aria-hidden="true">⌄</span>';menu.innerHTML='';[...select.options].forEach(option=>{const b=document.createElement('button');b.type='button';b.className='select-option';b.setAttribute('role','option');b.setAttribute('aria-selected',String(option.selected));b.tabIndex=-1;b.textContent=option.textContent;b.onclick=()=>{select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));closeDropdowns();trigger.focus()};menu.append(b)})}dropdowns.push({shell,trigger,sync});function open(){closeDropdowns();shell.classList.add('open');trigger.setAttribute('aria-expanded','true')}trigger.onclick=()=>shell.classList.contains('open')?closeDropdowns():open();shell.addEventListener('keydown',e=>{if(e.key==='Escape'){closeDropdowns();trigger.focus();e.preventDefault()}else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();if(!shell.classList.contains('open'))open();const children=[...menu.children],i=children.indexOf(document.activeElement),n=e.key==='Home'?0:e.key==='End'?children.length-1:e.key==='ArrowDown'?Math.min(i+1,children.length-1):Math.max(0,i-1);children[n]?.focus()}else if(e.key==='Tab')closeDropdowns()});sync()});document.addEventListener('click',e=>{if(!e.target.closest('.select-shell'))closeDropdowns()});
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target)}}),{threshold:.12});if(!reduced.matches)$$('.section-heading,.city-card,.everyday-section,.map-note').forEach(e=>{e.classList.add('reveal');observer.observe(e)});

function populateCities(){const cities=[...new Set(state.schools.filter(s=>!state.region||regionForSchool(s)===state.region).map(s=>s.city))];$('#city-filter').innerHTML='<option value="">'+t(state.region?'大区内全部城市':'日本全境')+'</option>'+cities.map(c=>`<option value="${escape(c)}">${escape(t(c))}</option>`).join('')}
// A cluster is a shortcut to its complete school list, not another zoom gate.
let clusterSchoolIds=[],clusterRequest=0;
function clearClusterPicker(){
  clusterRequest++;clusterSchoolIds=[];
  const panel=$('#map-school-detail');panel.classList.remove('is-cluster');
  if(!state.selected)panel.hidden=true;
}
function showClusterSchools(ids,{focus=true}={}){
  const allowed=new Set(ids);
  const schools=state.filtered.filter(s=>allowed.has(s.id));
  if(!schools.length)return;
  clusterSchoolIds=schools.map(s=>s.id);state.selected=null;popup?.remove();
  $$('[data-map-school]').forEach(button=>{button.classList.remove('selected');button.setAttribute('aria-pressed','false')});
  if(mapReady)updateMapSource();
  const panel=$('#map-school-detail');panel.classList.add('is-cluster');panel.hidden=false;
  panel.innerHTML=`<button id="close-cluster-detail" aria-label="${t('收起学校信息')}">×</button><h3 tabindex="-1" id="cluster-heading">${t('这组 {count} 所学校',{count:schools.length})}</h3><p class="cluster-hint">${t('直接选择学校，无需继续放大。')}</p><div class="cluster-options">${schools.map(raw=>{const school=locale.school(raw);return `<button data-map-school="${escape(school.id)}"><strong>${escape(school.name)}</strong><small>${escape(school.city)} · ${escape(school.access||school.district)}</small><span aria-hidden="true">↗</span></button>`}).join('')}</div>`;
  $('#close-cluster-detail').onclick=()=>{clearClusterPicker();panel.hidden=true;map?.getCanvas().focus()};
  if(focus){$('#cluster-heading').focus({preventScroll:true});if(innerWidth<=760)panel.scrollIntoView({block:'nearest',behavior:reduced.matches?'instant':'smooth'})}
}
const denseDistricts=['新宿・大久保','早稻田・高田马场','池袋・北区・板桥'];
function syncDensityShortcuts(){
  const wrap=$('#density-shortcuts');wrap.hidden=state.region!=='kanto';
  if(wrap.hidden)return;
  wrap.innerHTML=`<small>${t('东京密集街区')}</small><div><button data-dense="" aria-pressed="${!state.district&&!state.city}">${t('区内全部')}</button>${denseDistricts.map(d=>`<button data-dense="${escape(d)}" aria-pressed="${state.district===d}">${escape(t(d))} <span>${state.schools.filter(s=>s.city==='东京'&&s.district===d).length}</span></button>`).join('')}</div>`;
}
$('#density-shortcuts').addEventListener('click',e=>{
  const button=e.target.closest('[data-dense]');if(!button)return;
  const district=button.dataset.dense;
  Object.assign(state,{city:district?'东京':'',district,query:'',savedOnly:false,selected:null,limit:9});
  clearClusterPicker();pendingFocus=null;$('#map-school-detail').hidden=true;
  syncControls();render();syncUrl(true);$('#map-school-list').scrollTop=0;
  $(`#density-shortcuts [data-dense="${district}"]`)?.focus({preventScroll:true});
});
function drawRegionOutlines(){
  const svg=$('#region-map-art svg');if(!svg||!svg.getBoundingClientRect().width)return;
  svg.querySelector('.region-outlines')?.remove();
  const ns='http://www.w3.org/2000/svg',outlines=document.createElementNS(ns,'g');outlines.setAttribute('class','region-outlines');
  const inverse=svg.getScreenCTM().inverse();
  for(const region of regions){
    const shape=svg.querySelector(`.region-shape[data-region="${region.id}"]`);if(!shape)continue;
    const corners=[];
    // Frame mainland shapes; tiny outlying islands should not enlarge a hotspot.
    shape.querySelectorAll('.prefecture').forEach(pref=>{
      const polygons=[...pref.querySelectorAll('path,polygon')].map(node=>({node,box:node.getBBox()})).sort((a,b)=>b.box.width*b.box.height-a.box.width*a.box.height);
      const main=polygons[0];if(!main)return;
      const {node,box}=main,matrix=inverse.multiply(node.getScreenCTM());
      for(const [x,y] of [[box.x,box.y],[box.x+box.width,box.y],[box.x,box.y+box.height],[box.x+box.width,box.y+box.height]]){
        const point=svg.createSVGPoint();point.x=x;point.y=y;corners.push(point.matrixTransform(matrix));
      }
    });
    if(!corners.length)continue;
    const xs=corners.map(p=>p.x),ys=corners.map(p=>p.y),pad=13;
    const rect=document.createElementNS(ns,'rect');
    for(const [key,value] of Object.entries({x:Math.min(...xs)-pad,y:Math.min(...ys)-pad,width:Math.max(...xs)-Math.min(...xs)+pad*2,height:Math.max(...ys)-Math.min(...ys)+pad*2,rx:12,'data-region':region.id,class:'region-outline'}))rect.setAttribute(key,value);
    const title=document.createElementNS(ns,'title');title.textContent=t(region.name);rect.append(title);outlines.append(rect);
  }
  // Neighboring coverage frames must never intercept each other's clicks.
  const frames=[...outlines.children];
  for(let i=0;i<frames.length;i++)for(let j=i+1;j<frames.length;j++){
    const a=frames[i],b=frames[j],box=rect=>({x:+rect.getAttribute('x'),y:+rect.getAttribute('y'),w:+rect.getAttribute('width'),h:+rect.getAttribute('height')});
    const p=box(a),q=box(b),ox=Math.min(p.x+p.w,q.x+q.w)-Math.max(p.x,q.x),oy=Math.min(p.y+p.h,q.y+q.h)-Math.max(p.y,q.y);
    if(ox<=0||oy<=0)continue;
    const horizontal=ox<oy,axis=horizontal?'x':'y',size=horizontal?'width':'height',dim=horizontal?'w':'h';
    const [first,last,from,to]=p[axis]+p[dim]/2<q[axis]+q[dim]/2?[a,b,p,q]:[b,a,q,p];
    const edge=(Math.max(from[axis],to[axis])+Math.min(from[axis]+from[dim],to[axis]+to[dim]))/2;
    first.setAttribute(size,edge-3-from[axis]);last.setAttribute(axis,edge+3);last.setAttribute(size,to[axis]+to[dim]-edge-3);
  }
  svg.append(outlines);syncRegions();
}
// The region navigator uses local SVG only; it stays usable while tiles load.
function syncRegions(){
  const active=regions.find(r=>r.id===state.region);
  $('#region-summary').textContent=t('{region} · {count} 所学校',{region:t(active?.name||'全日本'),count:state.filtered.length});
  for(const region of regions){
    const count=state.schools.filter(s=>regionForSchool(s)===region.id).length;
    const button=$(`#region-options [data-region="${region.id}"]`);
    if(button){
      button.querySelector('span').textContent=t(region.name);
      button.querySelector('small').textContent=count;
      button.disabled=!count;
      button.title=count?'':t('该大区暂未收录学校');
      button.setAttribute('aria-label',t('{region}：{count} 所学校',{region:t(region.name),count}));
      button.setAttribute('aria-pressed',String(state.region===region.id));
    }
    $$(`#region-map-art [data-region="${region.id}"]`).forEach(shape=>{shape.classList.toggle('is-selected',state.region===region.id);shape.classList.toggle('is-empty',!count)});
  }
  $('#region-selector .region-heading button').setAttribute('aria-pressed',String(!state.region));
}
function chooseRegion(id){
  if(id&&!regions.some(r=>r.id===id&&state.schools.some(s=>regionForSchool(s)===id)))return;
  Object.assign(state,{region:id,city:'',district:'',query:'',savedOnly:false,limit:9,selected:null});
  pendingFocus=null;popup?.remove();clearClusterPicker();$('#map-school-detail').hidden=true;
  syncControls();render();syncUrl(true);
  $('#map-school-list').scrollTop=0;
}
$('#region-options').innerHTML=regions.map(r=>`<button type="button" data-region="${r.id}" aria-pressed="false"><span>${t(r.name)}</span><small>0</small></button>`).join('');
$('#region-selector').addEventListener('click',e=>{
  const target=e.target.closest('[data-region]');if(target)chooseRegion(target.dataset.region);
});
for(const event of ['pointerover','focusin'])$('#region-selector').addEventListener(event,e=>{
  const target=e.target.closest('[data-region]');$('#region-selector').dataset.hover=target?.dataset.region||'';
});
for(const event of ['pointerleave','focusout'])$('#region-selector').addEventListener(event,()=>{delete $('#region-selector').dataset.hover});
fetch('assets/maps/japan-regions.svg').then(r=>{if(!r.ok)throw Error('region map');return r.text()}).then(svg=>{
  $('#region-map-art').innerHTML=svg;drawRegionOutlines();syncRegions();
}).catch(()=>{$('#region-map-art').hidden=true});
function mapStatus(key,retry=false){$('#map-status-text').dataset.i18n=key;$('#map-status-text').textContent=t(key);$('#map-status').hidden=false;$('#map-retry').hidden=!retry}
function mapLabel(){return ['coalesce',['get',locale.lang==='ja'?'name:ja':'name:zh'],['get','name']]}
function localizeMapStyle(style){for(const layer of style.layers){if(layer.type==='symbol'&&JSON.stringify(layer.layout?.['text-field']||'').includes('name'))layer.layout['text-field']=mapLabel()}}
function localizeMap(){if(!map)return;popup?.remove();for(const layer of map.getStyle().layers){if(layer.type==='symbol'&&layer.id!=='cluster-count'&&JSON.stringify(layer.layout?.['text-field']||'').includes('name'))map.setLayoutProperty(layer.id,'text-field',mapLabel())}const controls=[['.maplibregl-ctrl-zoom-in','放大'],['.maplibregl-ctrl-zoom-out','缩小'],['.maplibregl-ctrl-attrib-button','切换地图来源信息']];for(const [selector,key] of controls){const el=$(selector);if(el){el.title=t(key);el.setAttribute('aria-label',t(key))}}}
window.addEventListener('languagechange',()=>{
  closeDropdowns();populateCities();syncControls();remember();render({fit:false});
  $('#workspace-title').textContent=t(state.tab==='map'?'把学校，放进生活里。':'找到你的学校。');
  if(mapReady)localizeMap();
  if(state.selected)selectSchool(state.selected,{move:false});else if(clusterSchoolIds.length)showClusterSchools(clusterSchoolIds,{focus:false});
  if($('#school-dialog').open){if(openDetailId)showDetail(openDetailId);else if(creditsOpen)showCredits()}
});

(async()=>{try{const r=await fetch('locations.json');if(!r.ok)throw Error('学校数据读取失败');state.schools=await r.json();const cityNames=[...new Set(state.schools.map(s=>s.city))];populateCities();if(!cityNames.includes(state.city))state.city='';if(state.city)state.region=regionForCity(state.city);syncControls();remember();render();setTab(params.get('tab')||'discover',{push:false,restore:false});if(params.get('school')){setTab('map',{push:false,restore:false});selectSchool(params.get('school'))}syncUrl()}catch(e){$('#result-count').textContent=t('学校资料加载失败，请刷新重试。');console.error(e)}})();
})();
