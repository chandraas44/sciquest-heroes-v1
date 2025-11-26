let f=[],s=!1;function h(){const o=["#a855f7","#ec4899","#fbbf24"],a=document.createElement("div");a.className="fixed inset-0 pointer-events-none z-[60]",a.id="badge-confetti";for(let n=0;n<30;n++){const e=document.createElement("div"),l=o[Math.floor(Math.random()*o.length)],c=Math.random()*100,d=Math.random()*2,r=3+Math.random()*2;e.className="absolute w-3 h-3 rounded-full",e.style.left=`${c}%`,e.style.backgroundColor=l,e.style.top="-10px",e.style.animation=`confetti-fall ${r}s ease-out ${d}s forwards`,a.appendChild(e)}if(!document.getElementById("badge-confetti-styles")){const n=document.createElement("style");n.id="badge-confetti-styles",n.textContent=`
      @keyframes confetti-fall {
        0% {
          transform: translateY(0) rotate(0deg);
          opacity: 1;
        }
        100% {
          transform: translateY(100vh) rotate(720deg);
          opacity: 0;
        }
      }
      @keyframes badge-glow-pulse {
        0%, 100% { box-shadow: 0 0 40px rgba(155, 55, 255, 0.6); }
        50% { box-shadow: 0 0 60px rgba(155, 55, 255, 0.9); }
      }
      @keyframes badge-icon-bounce {
        0% { transform: scale(0.5) rotate(0deg); opacity: 0; }
        50% { transform: scale(1.2) rotate(180deg); opacity: 1; }
        100% { transform: scale(1) rotate(360deg); opacity: 1; }
      }
    `,document.head.appendChild(n)}return a}function g(t,o,a){const n=document.createElement("div");n.className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4",n.id="badge-celebration-overlay";const e=document.createElement("div");e.className="bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_0_60px_rgba(155,55,255,0.8)] rounded-3xl p-8 text-center max-w-md w-full relative animate-[badge-glow-pulse_2s_ease-in-out_3]";const l=document.createElement("div");l.className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-xl border-4 border-white/30 mx-auto mb-4 flex items-center justify-center animate-[badge-icon-bounce_1s_ease-out]",l.innerHTML=`<span class="text-6xl">${a||"🏆"}</span>`;const c=document.createElement("h2");c.className="font-fredoka text-4xl font-bold text-white mb-2",c.textContent="Badge Unlocked!";const d=document.createElement("p");d.className="font-fredoka text-2xl font-bold text-white mb-6",d.textContent=o||"New Badge";const r=document.createElement("button");r.className="bg-white/20 backdrop-blur-xl border-2 border-white/30 text-white font-fredoka font-bold px-8 py-3 rounded-2xl hover:bg-white/30 transition shadow-lg mb-4",r.textContent="View Badge",r.onclick=()=>{window.location.href=`/badges/badges.html?badgeId=${t}`};const i=document.createElement("button");i.className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition",i.innerHTML="×",i.onclick=()=>{m()},e.appendChild(i),e.appendChild(l),e.appendChild(c),e.appendChild(d),e.appendChild(r),n.appendChild(e),n.onclick=u=>{u.target===n&&m()};const b=u=>{u.key==="Escape"&&(m(),document.removeEventListener("keydown",b))};return document.addEventListener("keydown",b),n}function m(){const t=document.getElementById("badge-celebration-overlay"),o=document.getElementById("badge-confetti");t&&t.remove(),o&&setTimeout(()=>o.remove(),3e3),s=!1,x()}function x(){if(s||f.length===0)return;const t=f.shift();p(t.badgeId,t.badgeName,t.badgeIcon)}function p(t,o,a){if(s){f.push({badgeId:t,badgeName:o,badgeIcon:a});return}s=!0;const n=h();document.body.appendChild(n);const e=g(t,o,a);document.body.appendChild(e),setTimeout(()=>{m()},5e3)}function y(t,o,a){s?f.push({badgeId:t,badgeName:o,badgeIcon:a}):p(t,o,a)}export{y as s};
