import{u as m,g as A,o as C,s as b,b as y,d as I,e as F,f as P,h as L,j as N,k as R}from"./index-Ckd83Gdd.js";const S="Location",H=5e3,x=18e4;let T=new Map;setInterval(()=>{const e=Date.now();for(let[r,n]of T.entries())!n[4].count&&e-n[0]>x&&T.delete(r)},3e5);function h(){return T}function w(e,r){e.GET&&(e=e.GET);const n=(...a)=>{const o=h(),i=I(),j=L(),D=P()?m():void 0,g=Date.now(),d=r+E(a);let t=o.get(d),O;if(A()&&(O=!0,C(()=>t[4].count--)),t&&t[0]&&(i==="native"||t[4].count||Date.now()-t[0]<H)){O&&(t[4].count++,t[4][0]()),t[3]==="preload"&&i!=="preload"&&(t[0]=g);let f=t[1];return i!=="preload"&&(f="then"in t[1]?t[1].then(l(!1),l(!0)):l(!1)(t[1]),i==="navigate"&&b(()=>t[4][1](t[0]))),j&&"then"in f&&f.catch(()=>{}),f}let c;return y.has&&y.has(d)?(c=y.load(d),delete globalThis._$HY.r[d]):c=e(...a),t?(t[0]=g,t[1]=c,t[3]=i,i==="navigate"&&b(()=>t[4][1](t[0]))):(o.set(d,t=[g,c,,i,F(g)]),t[4].count=0),O&&(t[4].count++,t[4][0]()),i!=="preload"&&(c="then"in c?c.then(l(!1),l(!0)):l(!1)(c)),j&&"then"in c&&c.catch(()=>{}),c;function l(f){return async u=>{if(u instanceof Response){const p=u.headers.get(S);if(p!==null){D&&p.startsWith("/")?b(()=>{D(p,{replace:!0})}):window.location.href=p;return}u.customBody&&(u=await u.customBody())}if(f)throw u;return t[2]=u,u}}};return n.keyFor=(...a)=>r+E(a),n.key=r,n}w.get=e=>h().get(e)[2];w.set=(e,r)=>{const n=h(),a=Date.now();let o=n.get(e);o?(o[0]=a,o[1]=Promise.resolve(r),o[2]=r,o[3]="preload"):(n.set(e,o=[a,Promise.resolve(r),r,"preload",F(a)]),o[4].count=0)};w.delete=e=>h().delete(e);w.clear=()=>h().clear();function E(e){return JSON.stringify(e,(r,n)=>B(n)?Object.keys(n).sort().reduce((a,o)=>(a[o]=n[o],a),{}):n)}function B(e){let r;return e!=null&&typeof e=="object"&&(!(r=Object.getPrototypeOf(e))||r===Object.prototype)}function G(e,r){let n,a=()=>!n||n.state==="unresolved"?void 0:n.latest;[n]=N(()=>U(e,R(a)),i=>i);const o=()=>n();return Object.defineProperty(o,"latest",{get(){return n.latest}}),o}class s{static all(){return new s}static allSettled(){return new s}static any(){return new s}static race(){return new s}static reject(){return new s}static resolve(){return new s}catch(){return new s}then(){return new s}finally(){return new s}}function U(e,r){if(!y.context)return e(r);const n=fetch,a=Promise;try{return window.fetch=()=>new s,Promise=s,e(r)}finally{window.fetch=n,Promise=a}}function q(e,r){return new Promise(n=>setTimeout(n,e,r))}function J(e,r){return Math.floor(Math.random()*(r-e+1))+e}const K=w(()=>q(J(500,1e3),"Solid"),"aboutName"),$=()=>G(()=>K());export{$ as default};
