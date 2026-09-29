/* A single printed WebGL cloth. Geometry, texture and lighting move together. */
(()=>{
  'use strict';
  const t=window.guiguLocale.t;
  const entry=document.getElementById('cloth-entry');
  const canvas=document.getElementById('cloth-canvas');
  const enter=document.getElementById('cloth-enter');
  const skip=document.getElementById('cloth-skip');
  if(!entry||!canvas)return;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const abort=new AbortController(),eventOptions={signal:abort.signal};
  const siblings=[...document.body.children].filter(el=>el!==entry&&!['SCRIPT','STYLE'].includes(el.tagName));
  const previousInert=siblings.map(el=>el.inert);
  siblings.forEach(el=>{el.inert=true});
  document.body.classList.add('cloth-active');
  let width=1,height=1,raf=0,done=false,progress=0,target=0,automatic=false,exitStart=0,exitFrom=0;
  let last=performance.now(),drag=null,velocity=0;
  const pointer={x:.5,y:.5,sx:.5,sy:.5,energy:0};
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false});
  const COLS=120,ROWS=80,vertices=new Float32Array((COLS+1)*(ROWS+1)*5);
  let program,buffer,texture,indexBuffer,uniforms,indexCount;
  const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
  const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};

  function finish(){
    if(done)return;done=true;cancelAnimationFrame(raf);abort.abort();
    entry.hidden=true;document.body.classList.remove('cloth-active');
    siblings.forEach((el,i)=>{el.inert=previousInert[i]});
    document.querySelector('.brand')?.focus({preventScroll:true});
    if(gl){gl.deleteBuffer(buffer);gl.deleteBuffer(indexBuffer);gl.deleteTexture(texture);gl.deleteProgram(program)}
  }
  function release(){
    if(done||automatic)return;
    if(reduce.matches){finish();return}
    automatic=true;exitStart=performance.now();exitFrom=progress;entry.classList.add('is-moving');
    if(!program){setTimeout(finish,700)}
  }
  function shader(type,source){
    const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function setup(){
    if(!gl)return;
    const derivatives=gl.getExtension('OES_standard_derivatives');
    const vs=shader(gl.VERTEX_SHADER,`
      attribute vec3 position; attribute vec2 uv;
      varying vec2 vUv; varying vec3 vPosition;
      uniform vec2 resolution;
      void main(){
        vUv=uv;vPosition=position;
        float perspective=1.0-position.z/1800.0;
        gl_Position=vec4((position.x/resolution.x*2.0-1.0), (1.0-position.y/resolution.y*2.0), -position.z/2200.0,perspective);
      }`);
    const fs=shader(gl.FRAGMENT_SHADER,`${derivatives?'#extension GL_OES_standard_derivatives : enable':''}
      precision mediump float;
      varying vec2 vUv; varying vec3 vPosition;
      uniform sampler2D poster; uniform float movement;
      void main(){
        vec3 ink=texture2D(poster,vUv).rgb;
        ${derivatives?`vec3 normal=normalize(cross(dFdx(vPosition),dFdy(vPosition)));
        float diffuse=abs(dot(normal,normalize(vec3(-0.35,-0.45,1.0))));
        float shade=mix(1.0,0.40+0.64*diffuse,movement);
        float silk=pow(abs(dot(normal,normalize(vec3(0.5,0.6,1.0)))),22.0)*0.1*movement;`:'float shade=1.0;float silk=0.0;'}
        gl_FragColor=vec4(ink*shade+silk,1.0);
      }`);
    program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
    gl.deleteShader(vs);gl.deleteShader(fs);gl.useProgram(program);
    buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,vertices.byteLength,gl.DYNAMIC_DRAW);
    const pos=gl.getAttribLocation(program,'position'),uv=gl.getAttribLocation(program,'uv');
    gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,3,gl.FLOAT,false,20,0);
    gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,20,12);
    const indices=[];
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){const a=y*(COLS+1)+x,b=a+COLS+1;indices.push(a,b,a+1,b,b+1,a+1)}
    indexCount=indices.length;indexBuffer=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
    texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    uniforms={resolution:gl.getUniformLocation(program,'resolution'),movement:gl.getUniformLocation(program,'movement')};
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(0,0,0,0);
    entry.classList.add('has-webgl');
  }
  function printPoster(){
    if(!program||done)return;
    const sheet=document.createElement('canvas');
    const ratio=Math.min(2,4096/Math.max(width,height));sheet.width=Math.round(width*ratio);sheet.height=Math.round(height*ratio);
    const c=sheet.getContext('2d');c.scale(ratio,ratio);
    const family=window.guiguLocale.lang==='ja'?'"Guigu Maru",sans-serif':'"Guigu Sans",sans-serif';
    const mobile=width<650,pad=mobile?25:width*.048,ink='#3439ce';
    c.fillStyle='#ffffff';c.fillRect(0,0,width,height);c.fillStyle=ink;c.textBaseline='top';
    const text=(str,x,y,font,color=ink)=>{c.font=font;c.fillStyle=color;c.fillText(str,x,y)};
    text(t('龟谷择校'),pad,mobile?28:33,`700 ${mobile?21:25}px ${family}`);
    const top=mobile?height*.235:Math.max(115,height*.225);
    const fontScale=window.guiguLocale.lang==='ja'?.78:1;
    const fontSize=fontScale*(mobile?Math.min(width*.208,height*.125):Math.min(width*.147,height*.244));
    // Keep the lettering on the texture, so it bends with the fabric.
    c.font=`600 ${fontSize}px ${family}`;
    const first=t('下一站，'),second=t('去日本。');
    text(first,pad-fontSize*.04,top,c.font);
    const lineY=top+fontSize*1.14;
    text(second,pad+width*(mobile?.07:.14),lineY,`600 ${fontSize}px ${family}`);
    // A small directional seal is printed on the cloth too.
    const cx=width-pad-(mobile?20:38),cy=top+(mobile?fontSize*.51:fontSize*.4),radius=mobile?19:34;
    c.fillStyle='#e3e4ff';c.beginPath();c.arc(cx,cy,radius,0,Math.PI*2);c.fill();
    c.strokeStyle=ink;c.lineWidth=mobile?2:3;c.beginPath();c.moveTo(cx-radius*.35,cy+radius*.35);c.lineTo(cx+radius*.32,cy-radius*.32);c.moveTo(cx-radius*.25,cy-radius*.32);c.lineTo(cx+radius*.32,cy-radius*.32);c.lineTo(cx+radius*.32,cy+radius*.25);c.stroke();
    const descY=Math.min(height-137,lineY+fontSize*1.28);
    text(t('让每一个选择，都更接近你。'),pad,descY,`${mobile?12:14}px ${family}`);
    c.strokeStyle='#3439ce30';c.lineWidth=1;c.beginPath();c.moveTo(pad,height-87);c.lineTo(width-pad,height-87);c.stroke();
    gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,sheet);
  }
  function resize(){
    width=innerWidth;height=innerHeight;
    const dpr=Math.min(devicePixelRatio||1,1.75);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    if(program){gl.viewport(0,0,canvas.width,canvas.height);gl.uniform2f(uniforms.resolution,width,height);printPoster()}
  }
  function render(now){
    if(done||!program)return;
    const dt=Math.min(40,now-last);last=now;
    pointer.sx+=(pointer.x-pointer.sx)*.065;pointer.sy+=(pointer.y-pointer.sy)*.065;pointer.energy*=.955;
    if(automatic){
      const t=clamp((now-exitStart)/1700);progress=exitFrom+(1-exitFrom)*(t*t*(3-2*t));
      if(t>=1){finish();return}
    }else progress+=(target-progress)*Math.min(1,dt*.012);
    entry.classList.toggle('is-moving',progress>.035||automatic);
    const p=progress,scale=Math.min(width,height),curl=smooth(p/.6),depart=smooth((p-.35)/.65);
    let k=0;
    for(let row=0;row<=ROWS;row++)for(let col=0;col<=COLS;col++){
      const u=col/COLS,v=row/ROWS;
      // The right edge is lifted first. A diagonal rolling fold travels across
      // the whole sheet; the free fabric trails behind the pulled corner.
      const front=1.205-p*2.005;
      const folded=Math.max(0,u+v*.20-front);
      const theta=folded*(4.1+curl*1.8);
      const radius=scale*(.13+.08*(1-curl));
      let x=u*width,y=v*height,z=0;
      if(folded>0){
        x-=folded*width-Math.sin(theta)*radius;
        z+=(1-Math.cos(theta))*radius;
        y-=Math.sin(theta*.7)*radius*.6;
      }
      const billow=Math.sin(u*8-v*4-now*.006)*Math.sin(v*3.14159)*Math.sin(u*3.14159);
      z+=billow*scale*.095*Math.sin(p*Math.PI);
      y+=Math.sin(u*11+v*5-now*.004)*scale*.035*Math.sin(p*Math.PI);
      const twist=(v-.5)*curl*.62;
      const dx=x-width*.18,dz=z;
      x=width*.18+dx*Math.cos(twist)+dz*Math.sin(twist);
      z=-dx*Math.sin(twist)+dz*Math.cos(twist);
      x-=depart*width*1.32;y-=depart*height*.83;
      // A restrained pointer ripple previews the material without moving type.
      if(!reduce.matches&&p<.01){
        const dist=Math.hypot((u-pointer.sx)*1.4,v-pointer.sy);
        const ripple=Math.exp(-dist*9)*Math.sin(dist*22-now*.005)*pointer.energy;
        z+=ripple*2.6;
      }
      vertices[k++]=x;vertices[k++]=y;vertices[k++]=z;vertices[k++]=u;vertices[k++]=v;
    }
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,vertices);
    gl.uniform1f(uniforms.movement,smooth(p*8));gl.drawElements(gl.TRIANGLES,indexCount,gl.UNSIGNED_SHORT,0);
    raf=requestAnimationFrame(render);
  }
  enter.addEventListener('click',release,eventOptions);skip.addEventListener('click',finish,eventOptions);
  entry.addEventListener('wheel',e=>{e.preventDefault();if(e.deltaY>4)release()},{passive:false,signal:abort.signal});
  canvas.addEventListener('pointerdown',e=>{if(automatic)return;drag={x:e.clientX,y:e.clientY,time:performance.now()};canvas.setPointerCapture(e.pointerId)},eventOptions);
  canvas.addEventListener('pointermove',e=>{
    pointer.x=e.clientX/width;pointer.y=e.clientY/height;pointer.energy=Math.min(1,pointer.energy+.12);
    if(drag&&!automatic){const distance=Math.max(drag.y-e.clientY,(drag.x-e.clientX)*.8);target=clamp(distance/Math.min(width,height)*.85,0,.68);velocity=distance;}
  },eventOptions);
  canvas.addEventListener('pointerup',()=>{if(!drag)return;const duration=performance.now()-drag.time;drag=null;if(target>.12||velocity>35||(duration<280&&target<.015))release();else target=0;velocity=0},eventOptions);
  canvas.addEventListener('pointercancel',()=>{drag=null;target=0;velocity=0},eventOptions);
  entry.addEventListener('keydown',e=>{
    if(['Enter',' ','ArrowDown','PageDown'].includes(e.key)){e.preventDefault();release()}
    if(e.key==='Escape'){e.preventDefault();finish()}
    if(e.key==='Tab'){e.preventDefault();(document.activeElement===enter?skip:enter).focus()}
  },eventOptions);
  addEventListener('resize',resize,eventOptions);
  addEventListener('languagechange',printPoster,eventOptions);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();finish()},eventOptions);
  try{setup();resize();if(program)raf=requestAnimationFrame(render);else entry.classList.add('no-webgl')}
  catch(error){console.warn('Cloth renderer unavailable; using accessible poster.',error);program=null;entry.classList.remove('has-webgl');entry.classList.add('no-webgl')}
  entry.tabIndex=-1;entry.style.outline='none';entry.focus({preventScroll:true});
  document.fonts?.ready.then(()=>{if(!done)printPoster()});
})();
