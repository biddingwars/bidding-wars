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

/* NASA-derived satellite imagery. Tried in order: a copy bundled with the app,
   then two public CDNs. Falls back to the drawn texture if all three fail. */
const EARTH_TEXTURES=[
  'earth.jpg',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/textures/planets/earth_atmos_2048.jpg',
  'https://unpkg.com/three@0.128.0/examples/textures/planets/earth_atmos_2048.jpg'
];

function loadEarthTexture(done){
  if(!window.THREE || !THREE.TextureLoader){ done(null); return; }
  const loader=new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  let i=0;
  const next=()=>{
    if(i>=EARTH_TEXTURES.length){ done(null); return; }
    const url=EARTH_TEXTURES[i++];
    loader.load(url, tex=>{ tex.anisotropy=8; done(tex); }, undefined, ()=>next());
  };
  next();
}

const toVec=(lat,lon,r)=>{
  const a=(90-lat)*Math.PI/180, b=(lon+180)*Math.PI/180;
  return new THREE.Vector3(-r*Math.sin(a)*Math.cos(b), r*Math.cos(a), r*Math.sin(a)*Math.sin(b));
};

const LANDMASS={
  "north_america":[[-156,71],[-165,66],[-160,59],[-152,58],[-135,55],[-130,55],[-125,49],[-124,40],[-122,37],[-117,33],[-110,31],[-106,23],[-97,20],[-92,16],[-88,14],[-84,9],[-80,8],[-77,8],[-79,9],[-83,12],[-86,16],[-88,18],[-90,19],[-92,20],[-97,21],[-97,26],[-94,29],[-90,29],[-87,30],[-84,30],[-82,27],[-81,25],[-80,25],[-81,31],[-77,34],[-75,39],[-74,40],[-70,42],[-67,45],[-64,47],[-60,50],[-56,52],[-53,49],[-56,54],[-65,58],[-75,62],[-85,62],[-95,63],[-90,68],[-100,70],[-110,72],[-130,71],[-145,70],[-156,71]],
  "south_america":[[-77,8],[-79,2],[-80,-4],[-81,-6],[-71,-18],[-70,-25],[-70,-33],[-73,-42],[-74,-52],[-68,-55],[-65,-54],[-62,-52],[-58,-38],[-57,-35],[-48,-25],[-40,-15],[-35,-8],[-35,-5],[-45,0],[-50,2],[-60,5],[-67,8],[-72,9],[-77,8]],
  "africa":[[-17,21],[-16,15],[-11,7],[-9,5],[3,5],[9,4],[9,2],[13,-5],[12,-18],[13,-27],[18,-34],[26,-33],[32,-29],[35,-22],[40,-15],[43,-11],[51,-12],[51,-2],[45,2],[43,10],[42,12],[43,14],[38,18],[35,22],[33,27],[32,31],[25,32],[10,37],[0,36],[-6,35],[-9,31],[-15,25],[-17,21]],
  "eurasia":[[-9,43],[-9,38],[-6,36],[3,42],[8,44],[10,44],[13,38],[20,35],[23,36],[26,40],[29,41],[35,36],[36,34],[35,31],[34,29],[42,15],[43,12],[48,12],[52,16],[56,22],[60,25],[63,25],[68,24],[72,20],[73,17],[77,8],[80,7],[80,13],[83,17],[88,22],[92,22],[95,20],[98,16],[100,13],[104,10],[107,10],[109,15],[108,21],[112,23],[120,23],[122,28],[121,32],[124,35],[127,37],[130,36],[132,38],[135,42],[140,43],[145,43],[155,60],[160,60],[168,65],[175,67],[179,69],[177,71],[170,70],[160,71],[140,73],[120,74],[100,77],[80,78],[60,78],[40,77],[28,71],[20,70],[10,68],[5,62],[10,58],[15,55],[10,54],[5,52],[3,51],[-1,52],[-3,49],[-9,43]],
  "scandinavia":[[5,58],[8,58],[11,59],[13,63],[15,66],[19,69],[24,70],[28,70],[30,69],[28,66],[24,64],[20,60],[14,57],[10,56],[6,57],[5,58]],
  "australia":[[113,-22],[114,-26],[115,-34],[118,-35],[122,-34],[131,-32],[136,-35],[138,-35],[140,-38],[145,-38],[147,-38],[150,-37],[153,-29],[153,-25],[150,-22],[145,-17],[143,-11],[137,-12],[132,-12],[130,-13],[127,-14],[123,-17],[121,-18],[114,-22],[113,-22]],
  "greenland":[[-45,60],[-42,60],[-25,70],[-22,76],[-30,82],[-45,83],[-55,76],[-56,70],[-52,64],[-45,60]],
  "madagascar":[[43,-25],[44,-25],[47,-24],[50,-16],[49,-12],[47,-13],[44,-16],[43,-20],[43,-25]],
  "gb_ireland":[[-5,58],[-3,58],[-1,56],[0,53],[1,52],[-1,51],[-3,50],[-5,50],[-6,52],[-10,53],[-8,55],[-6,55],[-5,58]],
  "japan":[[130,31],[133,32],[136,34],[139,36],[140,38],[141,41],[142,43],[145,44],[143,45],[139,42],[136,38],[133,35],[130,33],[129,32],[130,31]],
  "nz":[[173,-41],[175,-37],[178,-38],[178,-40],[175,-42],[173,-44],[171,-44],[169,-46],[167,-45],[171,-42],[173,-41]],
  "indonesia_1":[[95,6],[98,3],[102,-3],[104,-5],[106,-7],[110,-8],[114,-8.5],[116,-8],[119,-8],[119,-4],[116,-2],[112,-2],[108,0],[104,2],[100,4],[97,5],[95,6]],
  "indonesia_2":[[110,-1],[113,1],[117,1],[119,0],[117,-2],[113,-3],[110,-2],[110,-1]],
  "philippines":[[121,18],[122,14],[124,10],[126,8],[125,6],[123,7],[121,10],[120,14],[121,18]],
  "antarctica":[[-180,-63],[-90,-63],[0,-63],[90,-63],[180,-63],[180,-90],[-180,-90],[-180,-63]]
};

/* ocean + baked-in continents + graticule painted into a texture.
   The continents are drawn straight into the texture, independent of the
   optional real-border fetch below, so the globe always looks like Earth
   even with zero network access. */
/* Longitudes are made continuous so a country spanning the antimeridian
   (Russia, Fiji, Antarctica) doesn't smear a band across the whole map. */
function unwrap(ring){
  const out=[[ring[0][0], ring[0][1]]];
  for(let i=1;i<ring.length;i++){
    let lon=ring[i][0];
    const prev=out[i-1][0];
    while(lon-prev> 180) lon-=360;
    while(lon-prev<-180) lon+=360;
    out.push([lon, ring[i][1]]);
  }
  return out;
}

function earthTexture(feats, ownedSet){
  const W=2048, H=1024;
  const c=document.createElement('canvas'); c.width=W; c.height=H;
  const x=c.getContext('2d');

  const g=x.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#071A33');   g.addColorStop(.28,'#0C2A50');
  g.addColorStop(.5,'#0F3563');  g.addColorStop(.72,'#0C2A50');
  g.addColorStop(1,'#071A33');
  x.fillStyle=g; x.fillRect(0,0,W,H);

  // subtle depth bands so open ocean doesn't read as a flat fill
  x.globalAlpha=.5;
  for(let i=0;i<6;i++){
    const ry=Math.random()*H, rx=Math.random()*W, rr=140+Math.random()*260;
    const rg=x.createRadialGradient(rx,ry,0,rx,ry,rr);
    rg.addColorStop(0,'rgba(90,150,200,.10)'); rg.addColorStop(1,'rgba(90,150,200,0)');
    x.fillStyle=rg; x.fillRect(rx-rr,ry-rr,rr*2,rr*2);
  }
  x.globalAlpha=1;

  const project=(lon,lat)=>{
    /* No modulo here on purpose: unwrap() produces continuous longitudes that can
       run past 180, and the -W / 0 / +W triple-draw below handles the wrap. */
    const px=(lon+180)/360*W;
    const py=(90-lat)/180*H;
    return [px,py];
  };
  const drawLand=(poly,dx)=>{
    x.beginPath();
    poly.forEach(([lon,lat],i)=>{
      const [px,py]=project(lon,lat);
      i===0 ? x.moveTo(px+dx,py) : x.lineTo(px+dx,py);
    });
    x.closePath(); x.fill(); x.stroke();
  };
  if(feats && feats.length){
    /* Real Natural Earth coastlines: fill the land, then stroke every national
       border on top. Painted into the texture so the lines actually have width. */
    feats.forEach((f,i)=>{
      const owned = ownedSet && ownedSet.has(i);
      x.fillStyle   = owned ? '#FFC42E' : '#6FB37A';
      x.strokeStyle = owned ? '#7A4E00' : '#2E6B4A';
      x.lineWidth   = owned ? 2.2 : 0.9;
      f.rings.forEach(ring=>{
        const u=unwrap(ring);
        [0,-W,W].forEach(dx=>drawLand(u,dx));
      });
    });
  } else {
    x.fillStyle='#6FB37A'; x.strokeStyle='#2E6B4A'; x.lineWidth=1.0;
    Object.values(LANDMASS).forEach(poly=>{
      drawLand(poly,0); drawLand(poly,-W); drawLand(poly,W);
    });
  }

  // faint terrain shading so land doesn't read as flat green
  x.globalAlpha=.18;
  if(!(feats && feats.length)) Object.values(LANDMASS).forEach(poly=>{
    const lg=x.createLinearGradient(0,0,0,H);
    lg.addColorStop(0,'rgba(255,255,255,.5)'); lg.addColorStop(1,'rgba(0,0,0,.35)');
    x.fillStyle=lg;
    [0,-W,W].forEach(dx=>drawLand(poly,dx));
  });
  x.globalAlpha=1;

  x.strokeStyle='rgba(120,190,255,.10)'; x.lineWidth=2;
  for(let lat=-75;lat<=75;lat+=15){ const y=(90-lat)/180*H; x.beginPath(); x.moveTo(0,y); x.lineTo(W,y); x.stroke(); }
  for(let lon=-180;lon<180;lon+=15){ const px=(lon+180)/360*W; x.beginPath(); x.moveTo(px,0); x.lineTo(px,H); x.stroke(); }
  x.strokeStyle='rgba(255,196,0,.22)'; x.lineWidth=3;
  x.beginPath(); x.moveTo(0,H/2); x.lineTo(W,H/2); x.stroke();

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
  const earthMat=new THREE.MeshPhongMaterial({map:earthTexture(), shininess:6, specular:0x101c2e, emissive:0x0A1424});
  const earth=new THREE.Mesh(new THREE.SphereGeometry(1,96,64), earthMat);
  rig.add(earth);

  let satelliteOn=false;
  loadEarthTexture(tex=>{
    if(!tex) return;
    satelliteOn=true;
    const old=earthMat.map;
    earthMat.map=tex;
    earthMat.emissive=new THREE.Color(0x000000);
    earthMat.specular=new THREE.Color(0x223344);
    earthMat.shininess=15;
    earthMat.needsUpdate=true;
    if(old && old.dispose) old.dispose();
    const cap=host.parentNode && host.parentNode.querySelector('.gcap');
    if(cap) cap.textContent += ' · satellite';
  });

  /* atmosphere */
  const atmo=new THREE.Mesh(new THREE.SphereGeometry(1,64,48), new THREE.ShaderMaterial({
    vertexShader:'varying vec3 vN; void main(){ vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:'varying vec3 vN; void main(){ float i=pow(0.58-dot(vN,vec3(0.0,0.0,1.0)),3.4); gl_FragColor=vec4(1.0,0.62,0.18,1.0)*clamp(i,0.0,0.85); }',
    blending:THREE.AdditiveBlending, side:THREE.BackSide, transparent:true, depthWrite:false
  }));
  atmo.scale.setScalar(1.13); scene.add(atmo);

  scene.add(new THREE.AmbientLight(0x9FB4D0, 1.15));
  const key=new THREE.DirectionalLight(0xfff6e8, 1.35); key.position.set(-3,2.2,3.4); scene.add(key);
  const rim=new THREE.DirectionalLight(0xff9126, 0.45); rim.position.set(3.5,-1.5,-2.5); scene.add(rim);

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
    const cap=host.parentNode && host.parentNode.querySelector('.gcap');
    if(!feats){
      if(cap) cap.textContent += ' · simplified outlines';
      return;
    }
    if(cap && !satelliteOn) cap.textContent += ' · ' + feats.length + ' real borders';
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
    /* Repaint the globe with the real coastlines. Done in the texture rather than
       as 3D lines because WebGL ignores line thickness — hairlines vanish at
       this scale. In the texture the borders get real width and antialiasing. */
    if(!satelliteOn){
      const old = earthMat.map;
      earthMat.map = earthTexture(feats, claimed);
      earthMat.needsUpdate = true;
      if(old && old.dispose) old.dispose();
    }

    /* Winner's countries also get a raised gold outline so they read in 3D. */
    feats.forEach((f,i)=>{
      if(!claimed.has(i)) return;
      f.rings.forEach(r=>{
        for(let k=0;k<r.length-1;k++){
          const p=toVec(r[k][1], r[k][0], 1.008), n=toVec(r[k+1][1], r[k+1][0], 1.008);
          mine.push(p.x,p.y,p.z,n.x,n.y,n.z);
        }
      });
    });
    if(mine.length){
      const g=new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(mine,3));
      rig.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({color:0xFFE680, transparent:true, opacity:0.95})));
    }
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
  let lon=0, lat=18, dist=2.62, drag=null, auto=true, raf=null, resume=0;
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
