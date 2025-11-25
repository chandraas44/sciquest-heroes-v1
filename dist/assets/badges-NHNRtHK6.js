import"./config-N_0HKkEA.js";import{getChildBadges as L,logBadgeEvent as k,getBadgeProgress as _}from"./badge-services-BEYCrsbD.js";import{_ as x}from"./preload-helper-BXl3LOEh.js";import"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm";const u="child-akhil",d={badges:[],selectedBadgeId:null},$=new URLSearchParams(window.location.search),f=$.get("badgeId"),l=document.getElementById("badgeGrid"),b=document.getElementById("badgeSummary"),i=document.getElementById("emptyState"),p=document.getElementById("errorState"),g=document.getElementById("badgeModal"),B=document.getElementById("modalContent"),M=document.getElementById("closeModalBtn"),I=document.getElementById("retryBtn");function S(e){const t={rare:0,uncommon:1,common:2};return e.sort((n,o)=>{if(n.unlocked&&!o.unlocked)return-1;if(!n.unlocked&&o.unlocked)return 1;if(n.unlocked===o.unlocked){const r=t[n.rarity]??2,s=t[o.rarity]??2;if(r!==s)return r-s}return n.name.localeCompare(o.name)})}function C(e){if(!e)return"Never";const t=new Date(e),o=new Date-t,r=Math.floor(o/6e4),s=Math.floor(o/36e5),c=Math.floor(o/864e5);return r<1?"Just now":r<60?`${r} ${r===1?"minute":"minutes"} ago`:s<24?`${s} ${s===1?"hour":"hours"} ago`:c<7?`${c} ${c===1?"day":"days"} ago`:t.toLocaleDateString()}function D(e){const t=document.createElement("div");t.className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-3xl p-6 shadow-[0_0_20px_rgba(139,92,246,0.15)] hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:border-purple-300 transition cursor-pointer",t.dataset.badgeId=e.id,f===e.id&&(t.classList.add("border-purple-500","shadow-[0_0_40px_rgba(139,92,246,0.4)]"),setTimeout(()=>t.scrollIntoView({behavior:"smooth",block:"center"}),500));const n=e.unlocked?"bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_0_20px_rgba(139,92,246,0.4)]":"bg-purple-100 border-2 border-purple-200",o=e.unlocked?"":"opacity-70",r=e.unlocked?'<span class="absolute top-0 right-0 w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs">✓</span>':'<span class="absolute top-0 right-0 w-6 h-6 bg-purple-200 rounded-full flex items-center justify-center text-purple-600 text-xs">🔒</span>';return t.innerHTML=`
    <div class="badge-icon-container mb-3 flex justify-center relative">
      <div class="badge-icon w-16 h-16 rounded-full flex items-center justify-center ${n}">
        <span class="text-3xl ${o}">${e.icon||"🏆"}</span>
      </div>
      ${r}
    </div>
    <h4 class="font-fredoka text-xl font-bold text-slate-700 mb-2 text-center">${e.name}</h4>
    <p class="text-slate-600 text-xs text-center ${e.unlocked?"":"italic text-slate-500"}">
      ${e.unlocked?`Earned: ${e.awardedAt?C(e.awardedAt):"Recently"}`:`Hint: ${e.hint||e.description}`}
    </p>
  `,t.addEventListener("click",()=>{w(e.id)}),t}async function w(e){const t=d.badges.find(a=>a.id===e);if(!t)return;d.selectedBadgeId=e,await k("badge_viewed",{badgeId:e,childId:u});let n=null;t.unlocked||(n=await _(u,e));const o=t.unlocked?"bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_0_20px_rgba(139,92,246,0.4)]":"bg-purple-100 border-2 border-purple-200",r=t.unlocked?"":"opacity-70";let s="";if(n){const a=Math.round(n.current/n.required*100);s=`
      <div class="mb-4">
        <div class="bg-purple-100 rounded-full h-3 mb-2">
          <div class="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all" style="width: ${a}%"></div>
        </div>
        <p class="text-slate-600 text-xs font-semibold">${n.current} of ${n.required} completed (${a}%)</p>
      </div>
    `}let c="";if(!t.unlocked){let a="",m="";t.category==="stories"?(a="../stories/index.html",m="Explore Stories"):t.category==="chat"?(a="../chat/index.html",m="Start Chatting"):t.category==="quizzes"&&(a="../stories/index.html",m="Take Quizzes"),a&&(c=`
        <a 
          href="${a}" 
          class="block w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-fredoka font-bold px-8 py-3 rounded-2xl hover:from-purple-600 hover:to-pink-600 transition shadow-lg text-center"
        >
          ${m}
        </a>
      `)}B.innerHTML=`
    <div class="text-center">
        <div class="badge-icon-container mb-4 flex justify-center relative">
          <div class="badge-icon w-32 h-32 rounded-full flex items-center justify-center ${o} mx-auto">
            <span class="text-6xl ${r}">${t.icon||"🏆"}</span>
          </div>
          ${t.unlocked?'<span class="absolute top-0 right-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm">✓</span>':'<span class="absolute top-0 right-0 w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center text-purple-600 text-sm">🔒</span>'}
        </div>
        <h3 class="font-fredoka text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">${t.name}</h3>
        <p class="text-slate-600 text-lg mb-4">${t.description}</p>
        ${s}
        ${t.unlocked?`<p class="text-slate-500 text-sm mb-4">Earned on: ${t.awardedAt?new Date(t.awardedAt).toLocaleDateString():"Recently"}</p>`:`<p class="text-slate-500 italic text-sm mb-4">Hint: ${t.hint||t.description}</p>`}
      ${c}
    </div>
  `,g.classList.remove("hidden")}function h(){g.classList.add("hidden"),d.selectedBadgeId=null}M?.addEventListener("click",h);g?.addEventListener("click",e=>{e.target===g&&h()});document.addEventListener("keydown",e=>{e.key==="Escape"&&!g.classList.contains("hidden")&&h()});function T(){const e=d.badges.filter(n=>n.unlocked).length,t=d.badges.length;b.innerHTML=`
    <p class="text-slate-700 text-lg font-medium">
      You've unlocked <span class="font-fredoka text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">${e}</span> of <span class="font-fredoka text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">${t}</span> badges!
    </p>
  `}function H(){if(l.innerHTML="",i.classList.add("hidden"),p.classList.add("hidden"),!d.badges.length){i.classList.remove("hidden");return}const e=S([...d.badges]);e.forEach(t=>{l.appendChild(D(t))}),f&&e.find(n=>n.id===f)&&setTimeout(()=>w(f),300)}async function v(){try{l.innerHTML="",i.classList.add("hidden"),p.classList.add("hidden"),console.log("[badges] Loading badges for child:",u);const e=await L(u);console.log("[badges] Loaded badges:",e),d.badges=e,T(),H(),await k("badge_gallery_viewed",{childId:u,badgeCount:e.length})}catch(e){console.error("[badges] Failed to load badges",e),l.innerHTML="",i.classList.add("hidden"),p.classList.remove("hidden")}}I?.addEventListener("click",()=>{v()});document.readyState==="loading"?document.addEventListener("DOMContentLoaded",y):y();function y(){if(console.log("[badges] Script loaded successfully"),console.log("[badges] MOCK_CHILD_ID:",u),console.log("[badges] DOM elements:",{badgeGridEl:!!l,emptyStateEl:!!i,errorStateEl:!!p,badgeSummaryEl:!!b}),!l||!i||!p||!b){console.error("[badges] Missing required DOM elements!",{badgeGridEl:!!l,emptyStateEl:!!i,errorStateEl:!!p,badgeSummaryEl:!!b});return}v()}const E=async()=>{try{const{createClient:e}=await x(async()=>{const{createClient:n}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm");return{createClient:n}},[]),{supabaseConfig:t}=await x(async()=>{const{supabaseConfig:n}=await import("./config-N_0HKkEA.js");return{supabaseConfig:n}},[]);if(t?.url&&t?.anonKey){const n=e(t.url,t.anonKey),{error:o}=await n.auth.signOut();if(o)throw o}}catch{console.log("Supabase logout skipped (mock mode)")}localStorage.clear(),sessionStorage.clear(),window.location.href="../auth/auth.html"};document.getElementById("logoutBtn")?.addEventListener("click",E);document.getElementById("logoutBtnMobile")?.addEventListener("click",E);async function O(){}O();
