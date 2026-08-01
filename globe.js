/* ============ THE WINNER'S GLOBE ============
   Plain canvas, no libraries, works offline. Every country is a dot at its own
   coordinates, so the dots themselves draw the continents. The winner's lots
   burn brighter and are sized by population. */
function globe2d(host, owned){
  const cv=host.querySelector('canvas'), ctx=cv.getContext('2d');
  const own=new Set(owned.map(c=>c.code));
  const big=Math.max(1, Math.max(...owned.map(c=>c.pop)));
  // open facing whatever the winner actually took
  let sx=0, sy=0;
  owned.forEach(c=>{ const q=GEO[c.code]; if(!q) return; const r=q[1]*Math.PI/180; sx+=Math.cos(r); sy+=Math.sin(r); });
  let spin = (sx||sy) ? -Math.atan2(sy,sx) : -Math.PI/2;
  let tilt=0.38, drag=null, auto=true, raf=null;

  function size(){
    const w=Math.min(host.clientWidth, 460), dpr=Math.min(devicePixelRatio||1,2);
    cv.width=w*dpr; cv.height=w*dpr; cv.style.height=w+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    return w;
  }
  let W=size();

  const project=(lat,lon)=>{
    const a=lat*Math.PI/180, b=(lon*Math.PI/180)+spin;
    let x=Math.cos(a)*Math.sin(b), y=Math.sin(a), z=Math.cos(a)*Math.cos(b);
    const yy=y*Math.cos(tilt)-z*Math.sin(tilt), zz=y*Math.sin(tilt)+z*Math.cos(tilt);
    return {x, y:yy, z:zz};
  };

  function frame(){
    W=size();
    const R=W*0.43, cx=W/2, cy=W/2;
    ctx.clearRect(0,0,W,W);

    const g=ctx.createRadialGradient(cx-R*0.35,cy-R*0.4,R*0.1,cx,cy,R);
    g.addColorStop(0,'#20304A'); g.addColorStop(0.62,'#141C2C'); g.addColorStop(1,'#0A0D15');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,R,0,7); ctx.fill();

    ctx.strokeStyle='rgba(255,196,0,.13)'; ctx.lineWidth=1;
    for(let lat=-60;lat<=60;lat+=30){
      ctx.beginPath(); let on=false;
      for(let lon=-180;lon<=180;lon+=4){
        const p=project(lat,lon);
        if(p.z<=0){ on=false; continue; }
        const X=cx+p.x*R, Y=cy-p.y*R;
        on?ctx.lineTo(X,Y):ctx.moveTo(X,Y); on=true;
      }
      ctx.stroke();
    }
    for(let lon=-180;lon<180;lon+=30){
      ctx.beginPath(); let on=false;
      for(let lat=-90;lat<=90;lat+=4){
        const p=project(lat,lon);
        if(p.z<=0){ on=false; continue; }
        const X=cx+p.x*R, Y=cy-p.y*R;
        on?ctx.lineTo(X,Y):ctx.moveTo(X,Y); on=true;
      }
      ctx.stroke();
    }

    COUNTRIES.forEach(c=>{
      const q=GEO[c.code]; if(!q) return;
      const p=project(q[0],q[1]); if(p.z<=0) return;
      const X=cx+p.x*R, Y=cy-p.y*R, fade=Math.min(1,p.z*1.5+0.15);
      if(own.has(c.code)) return;
      ctx.fillStyle='rgba(226,232,240,'+(0.30*fade)+')';
      ctx.beginPath(); ctx.arc(X,Y,W*0.006,0,7); ctx.fill();
    });

    owned.slice().sort((a,b)=>project(GEO[a.code][0],GEO[a.code][1]).z-project(GEO[b.code][0],GEO[b.code][1]).z)
    .forEach(c=>{
      const q=GEO[c.code]; if(!q) return;
      const p=project(q[0],q[1]); if(p.z<=0) return;
      const X=cx+p.x*R, Y=cy-p.y*R, fade=Math.min(1,p.z*1.6+0.1);
      const r=W*(0.010+0.026*Math.sqrt(c.pop/big));
      const halo=ctx.createRadialGradient(X,Y,0,X,Y,r*3);
      halo.addColorStop(0,'rgba(255,122,0,'+(0.55*fade)+')');
      halo.addColorStop(1,'rgba(255,122,0,0)');
      ctx.fillStyle=halo; ctx.beginPath(); ctx.arc(X,Y,r*3,0,7); ctx.fill();
      ctx.fillStyle='rgba(255,196,0,'+fade+')';
      ctx.beginPath(); ctx.arc(X,Y,r,0,7); ctx.fill();
      ctx.strokeStyle='rgba(20,15,12,'+fade+')'; ctx.lineWidth=2;
      ctx.stroke();
      if(p.z>0.72){
        ctx.font='700 '+(W*0.032)+'px "Space Mono", monospace';
        ctx.fillStyle='rgba(255,243,224,'+((p.z-0.72)/0.28)+')';
        ctx.textAlign='center';
        ctx.fillText(cname(c).toUpperCase(), X, Y-r-W*0.018);
      }
    });

    ctx.strokeStyle='rgba(255,196,0,.35)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(cx,cy,R,0,7); ctx.stroke();

    if(auto) spin+=0.0032;
    raf=requestAnimationFrame(frame);
  }
  frame();

  const at=e=>(e.touches?e.touches[0]:e);
  cv.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
  cv.addEventListener('pointerdown',e=>{ drag={x:at(e).clientX,y:at(e).clientY}; auto=false; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove',e=>{
    if(!drag) return;
    spin+=(at(e).clientX-drag.x)*0.008;
    tilt=Math.max(-1.2,Math.min(1.2,tilt-(at(e).clientY-drag.y)*0.006));
    drag={x:at(e).clientX,y:at(e).clientY};
  });
  const stopDrag=()=>{ if(drag){ drag=null; setTimeout(()=>{auto=true;},1800); } };
  cv.addEventListener('pointerup',stopDrag);
  cv.addEventListener('pointercancel',stopDrag);
  return ()=>{ if(raf) cancelAnimationFrame(raf); };
}


/* ============ THE WINNER'S GLOBE — WebGL ============
   Lit sphere, atmosphere, starfield, real country outlines pulled from a public
   TopoJSON, population pillars and travelling arcs. Falls back to the flat canvas
   version if WebGL or three.js is unavailable. */

/* Borders are a bundled asset. Nothing here touches the network — an app that
   needs a server to draw its own map fails review the moment it is tested offline. */
const BORDER_FILE='data/countries-110m.json';
let BORDER_CACHE=null;

/* minimal TopoJSON reader — saves pulling in topojson-client */
function topoFeatures(topo, key){
  const o=topo.objects[key], tr=topo.transform;
  const arcs=topo.arcs.map(arc=>{
    let x=0,y=0;
    return arc.map(p=>{
      if(tr){ x+=p[0]; y+=p[1]; return [x*tr.scale[0]+tr.translate[0], y*tr.scale[1]+tr.translate[1]]; }
      return [p[0],p[1]];
    });
  });
  const ring=idx=>{
    let out=[];
    idx.forEach(i=>{
      let a = i<0 ? arcs[~i].slice().reverse() : arcs[i];
      if(out.length) a=a.slice(1);
      out=out.concat(a);
    });
    return out;
  };
  return o.geometries.map(g=>{
    const polys = g.type==='Polygon' ? [g.arcs] : g.type==='MultiPolygon' ? g.arcs : [];
    return { name:(g.properties&&g.properties.name)||'', rings: polys.map(p=>p.map(ring)).flat() };
  }).filter(f=>f.rings.length);
}

async function loadBorders(){
  if(BORDER_CACHE!==null) return BORDER_CACHE;
  try{
    const r=await fetch(BORDER_FILE);           // local file inside the bundle
    if(r.ok){
      const feats=topoFeatures(await r.json(),'countries');
      if(feats.length){ BORDER_CACHE=feats; return feats; }
    }
  }catch(e){}
  BORDER_CACHE=false; return false;             // globe still renders without outlines
}

const toVec=(lat,lon,r)=>{
  const a=(90-lat)*Math.PI/180, b=(lon+180)*Math.PI/180;
  return new THREE.Vector3(-r*Math.sin(a)*Math.cos(b), r*Math.cos(a), r*Math.sin(a)*Math.sin(b));
};

/* ocean + graticule painted into a texture */
function earthTexture(){
  const c=document.createElement('canvas'); c.width=2048; c.height=1024;
  const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,0,1024);
  g.addColorStop(0,'#0A1730'); g.addColorStop(.45,'#12294D'); g.addColorStop(.55,'#143059');
  g.addColorStop(1,'#0A1730');
  x.fillStyle=g; x.fillRect(0,0,2048,1024);
  for(let i=0;i<9000;i++){
    x.fillStyle='rgba(120,170,230,'+(Math.random()*0.05)+')';
    x.fillRect(Math.random()*2048,Math.random()*1024,2,2);
  }
  x.strokeStyle='rgba(120,190,255,.10)'; x.lineWidth=2;
  for(let lat=-75;lat<=75;lat+=15){ const y=(90-lat)/180*1024; x.beginPath(); x.moveTo(0,y); x.lineTo(2048,y); x.stroke(); }
  for(let lon=-180;lon<180;lon+=15){ const px=(lon+180)/360*2048; x.beginPath(); x.moveTo(px,0); x.lineTo(px,1024); x.stroke(); }
  x.strokeStyle='rgba(255,196,0,.20)'; x.lineWidth=3;
  x.beginPath(); x.moveTo(0,512); x.lineTo(2048,512); x.stroke();
  const t=new THREE.CanvasTexture(c);
  t.anisotropy=4;
  return t;
}

function glowSprite(colour){
  const c=document.createElement('canvas'); c.width=c.height=128;
  const x=c.getContext('2d');
  const g=x.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,colour); g.addColorStop(.25,colour.replace('1)','.55)'));
  g.addColorStop(1,'rgba(255,150,0,0)');
  x.fillStyle=g; x.fillRect(0,0,128,128);
  return new THREE.CanvasTexture(c);
}

function globe3d(host, owned){
  const wrap=document.createElement('div');
  wrap.style.cssText='position:relative';
  const W=Math.min(host.clientWidth||360, 560), H=Math.round(W*0.98);

  const renderer=new THREE.WebGLRenderer({antialias:true, alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  renderer.setSize(W,H,false);
  renderer.domElement.style.cssText='display:block;width:100%;height:auto;touch-action:none;cursor:grab';
  host.innerHTML='';
  host.appendChild(renderer.domElement);

  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(36, W/H, 0.1, 100);
  const rig=new THREE.Group(); scene.add(rig);

  /* stars */
  const sg=new THREE.BufferGeometry(), sp=[];
  for(let i=0;i<1800;i++){
    const th=Math.random()*Math.PI*2, ph=Math.acos(2*Math.random()-1), r=14+Math.random()*20;
    sp.push(r*Math.sin(ph)*Math.cos(th), r*Math.sin(ph)*Math.sin(th), r*Math.cos(ph));
  }
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp,3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({color:0xBFD4FF, size:0.075, sizeAttenuation:true, transparent:true, opacity:.8})));

  /* the planet */
  const earth=new THREE.Mesh(
    new THREE.SphereGeometry(1,96,64),
    new THREE.MeshPhongMaterial({map:earthTexture(), shininess:12, specular:0x224466, emissive:0x060C18})
  );
  rig.add(earth);

  /* atmosphere */
  const atmo=new THREE.Mesh(new THREE.SphereGeometry(1,64,48), new THREE.ShaderMaterial({
    vertexShader:'varying vec3 vN; void main(){ vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:'varying vec3 vN; void main(){ float i=pow(0.62-dot(vN,vec3(0.0,0.0,1.0)),2.6); gl_FragColor=vec4(1.0,0.58,0.12,1.0)*clamp(i,0.0,1.4); }',
    blending:THREE.AdditiveBlending, side:THREE.BackSide, transparent:true, depthWrite:false
  }));
  atmo.scale.setScalar(1.19); scene.add(atmo);

  scene.add(new THREE.AmbientLight(0x5a6f96, 0.85));
  const key=new THREE.DirectionalLight(0xfff0d8, 1.25); key.position.set(-3,2.2,3.4); scene.add(key);
  const rim=new THREE.DirectionalLight(0xff7a00, 0.75); rim.position.set(3.5,-1.5,-2.5); scene.add(rim);

  /* ---- the winner's lots: pillars + glow ---- */
  const big=Math.max(...owned.map(c=>c.pop), 1);
  const tips=[];
  owned.forEach(c=>{
    const q=GEO[c.code]; if(!q) return;
    const h=0.07+0.40*Math.sqrt(c.pop/big);
    const dir=toVec(q[0],q[1],1).normalize();
    const pillar=new THREE.Mesh(
      new THREE.CylinderGeometry(0.011,0.019,h,14),
      new THREE.MeshBasicMaterial({color:0xFFC400})
    );
    pillar.position.copy(dir.clone().multiplyScalar(1+h/2));
    pillar.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir);
    rig.add(pillar);

    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowSprite('rgba(255,170,30,1)'), blending:THREE.AdditiveBlending, transparent:true, depthWrite:false}));
    s.position.copy(dir.clone().multiplyScalar(1+h));
    s.scale.setScalar(0.20+0.16*Math.sqrt(c.pop/big));
    rig.add(s);

    const ring=new THREE.Mesh(new THREE.RingGeometry(0.030,0.046,32),
      new THREE.MeshBasicMaterial({color:0xFF7A00, side:THREE.DoubleSide, transparent:true, opacity:.85}));
    ring.position.copy(dir.clone().multiplyScalar(1.004));
    ring.lookAt(dir.clone().multiplyScalar(2));
    rig.add(ring);

    tips.push({c, v:dir.clone().multiplyScalar(1+h)});
  });

  /* arcs, drawn in the order the lots were won */
  for(let i=0;i<tips.length-1;i++){
    const a=tips[i].v.clone().normalize(), b=tips[i+1].v.clone().normalize();
    const lift=1+0.22+a.distanceTo(b)*0.28;
    const mid=a.clone().add(b).normalize().multiplyScalar(lift);
    const curve=new THREE.QuadraticBezierCurve3(a.clone().multiplyScalar(1.01), mid, b.clone().multiplyScalar(1.01));
    rig.add(new THREE.Mesh(
      new THREE.TubeGeometry(curve, 48, 0.0055, 8, false),
      new THREE.MeshBasicMaterial({color:0xFF7A00, transparent:true, opacity:.62, blending:THREE.AdditiveBlending, depthWrite:false})
    ));
  }

  /* ---- real country outlines, if the border file is reachable ---- */
  let bordersOn=false;
  const note=document.createElement('div');
  note.className='gload'; note.textContent=t('loadingBorders');
  host.appendChild(note);

  loadBorders().then(feats=>{
    note.remove();
    if(!feats) return;
    bordersOn=true;
    const mine=[], rest=[];
    const centroid=f=>{
      let x=0,y=0,n=0;
      f.rings.forEach(r=>r.forEach(p=>{x+=p[0];y+=p[1];n++;}));
      return [y/n, x/n];
    };
    const cents=feats.map(centroid);
    const claimed=new Set();
    owned.forEach(c=>{
      const q=GEO[c.code]; if(!q) return;
      let best=-1,bd=1e9;
      cents.forEach((ct,i)=>{
        if(claimed.has(i)) return;
        const d=(ct[0]-q[0])**2+((ct[1]-q[1])*Math.cos(q[0]*Math.PI/180))**2;
        if(d<bd){ bd=d; best=i; }
      });
      if(best>=0 && bd<90) claimed.add(best);
    });
    feats.forEach((f,i)=>{
      const target = claimed.has(i) ? mine : rest;
      f.rings.forEach(r=>{
        for(let k=0;k<r.length-1;k++){
          const p=toVec(r[k][1], r[k][0], 1.003), n=toVec(r[k+1][1], r[k+1][0], 1.003);
          target.push(p.x,p.y,p.z,n.x,n.y,n.z);
        }
      });
    });
    const add=(arr,colour,op,width)=>{
      if(!arr.length) return;
      const g=new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(arr,3));
      rig.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({color:colour, transparent:true, opacity:op, linewidth:width})));
    };
    add(rest, 0x7FA8D8, 0.34, 1);
    add(mine, 0xFFC400, 1.0, 2);
  });

  /* ---- labels ---- */
  const labels=tips.map(t=>{
    const d=document.createElement('div');
    d.className='glabel';
    d.innerHTML=esc(cname(t.c))+'<span class="pv">'+fmtPop(t.c.pop)+'</span>';
    host.appendChild(d);
    return {d, v:t.v};
  });

  /* ---- camera + controls ---- */
  let lon=0, lat=18, dist=3.05, drag=null, auto=true, raf=null, resume=0;
  let sx=0, sy=0;
  owned.forEach(c=>{ const q=GEO[c.code]; if(!q) return; const r=q[1]*Math.PI/180; sx+=Math.cos(r); sy+=Math.sin(r); });
  if(sx||sy) lon = -Math.atan2(sy,sx)*180/Math.PI - 90;

  const el=renderer.domElement;
  const clampLat = v => Math.max(-88, Math.min(88, v));   // all the way over either pole
  const zoom = d => { dist=Math.max(1.7, Math.min(5.4, d)); };
  let pinch=0;

  const down=(x,y)=>{ drag={x,y}; auto=false; };
  const move=(x,y)=>{
    if(!drag) return;
    lon -= (x-drag.x)*0.32;
    lat  = clampLat(lat + (y-drag.y)*0.30);
    drag={x,y};
  };
  const release=()=>{ if(drag){ drag=null; resume=performance.now()+2000; } pinch=0; };

  /* mouse */
  const onMouseMove=e=>{ if(drag) move(e.clientX,e.clientY); };
  el.addEventListener('mousedown',e=>{ e.preventDefault(); down(e.clientX,e.clientY); });
  window.addEventListener('mousemove',onMouseMove);
  window.addEventListener('mouseup',release);
  el.addEventListener('wheel',e=>{ e.preventDefault(); zoom(dist+e.deltaY*0.0016); },{passive:false});

  /* touch — every move on the globe is swallowed here so the page underneath stays put */
  el.addEventListener('touchstart',e=>{
    if(e.touches.length===1){ down(e.touches[0].clientX, e.touches[0].clientY); }
    else if(e.touches.length===2){
      drag=null; auto=false;
      pinch=Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
    }
  },{passive:true});

  el.addEventListener('touchmove',e=>{
    e.preventDefault();          // this is what stops the page from scrolling away
    if(e.touches.length===2 && pinch){
      const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
      zoom(dist*(pinch/d)); pinch=d; return;
    }
    if(e.touches.length===1) move(e.touches[0].clientX, e.touches[0].clientY);
  },{passive:false});

  el.addEventListener('touchend',release);
  el.addEventListener('touchcancel',release);

  const tmp=new THREE.Vector3();
  function frame(){
    if(!auto && resume && performance.now()>resume){ auto=true; resume=0; }
    if(auto) lon-=0.13;
    const a=lat*Math.PI/180, b=lon*Math.PI/180;
    camera.position.set(dist*Math.cos(a)*Math.sin(b), dist*Math.sin(a), dist*Math.cos(a)*Math.cos(b));
    camera.lookAt(0,0,0);

    labels.forEach(L=>{
      tmp.copy(L.v);
      const facing = tmp.clone().normalize().dot(camera.position.clone().normalize());
      tmp.project(camera);
      const vw=host.clientWidth, vh=el.clientHeight||Math.round(vw*0.98);
      const x=(tmp.x*0.5+0.5)*vw, y=(-tmp.y*0.5+0.5)*vh;
      L.d.style.left=x+'px'; L.d.style.top=y+'px';
      L.d.style.opacity = facing>0.35 ? Math.min(1,(facing-0.35)/0.25) : 0;
    });

    renderer.render(scene,camera);
    raf=requestAnimationFrame(frame);
  }
  frame();

  const onResize=()=>{
    const w=Math.min(host.clientWidth||360,560), h=Math.round(w*0.98);
    renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix();
  };
  window.addEventListener('resize',onResize);

  return ()=>{
    if(raf) cancelAnimationFrame(raf);
    window.removeEventListener('resize',onResize);
    window.removeEventListener('mousemove',onMouseMove);
    window.removeEventListener('mouseup',release);
    try{ renderer.dispose(); }catch(e){}
  };
}

function globe(host, owned){
  if(window.THREE && !window.__noThree){
    try{ return globe3d(host, owned); }catch(e){ console.warn('3D globe failed, using flat map', e); }
  }
  host.innerHTML='<canvas></canvas>';
  return globe2d(host, owned);
}
