const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/badge-services-BEYCrsbD.js","assets/config-N_0HKkEA.js"])))=>i.map(i=>d[i]);
import{supabaseConfig as y}from"./config-N_0HKkEA.js";import{_ as E}from"./preload-helper-BXl3LOEh.js";import{createClient as R}from"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm";import{getBadgeById as U,getBadgeProgress as G}from"./badge-services-BEYCrsbD.js";import"./logo-handler-BTCRg4Zu.js";const N={},C=N?.VITE_EDGE_ANALYTICS_URL||"",F=(N?.VITE_USE_DASHBOARD_MOCKS??"true")==="true",A="sqh_analytics_queue_v1";let $=null,v=null;function B(){return!!(y?.url&&y?.anonKey)}function D(){return B()?($||($=R(y.url,y.anonKey)),$):null}function L(){return F?!0:!B()}async function g(){if(v)return v;const e=await fetch(new URL("/assets/mockDashboardData-BgXAbFKO.json",import.meta.url));if(!e.ok)throw new Error("Unable to load mock dashboard data");return v=await e.json(),v}async function K(e){if(L())return(await g()).children.filter(s=>s.parentId===e)||[];const a=D();if(!a)return(await g()).children.filter(s=>s.parentId===e)||[];try{const{data:r,error:s}=await a.rpc("get_parent_children",{parent_user_id:e}).select("*");if(s)throw s;return r||[]}catch(r){return console.warn("[dashboard] Supabase children fetch failed, reverting to mock data",r),(await g()).children.filter(o=>o.parentId===e)||[]}}async function Q(e){if(!e)throw new Error("childId is required");if(L())return(await g()).progress[e]||null;const a=D();if(!a)return(await g()).progress[e]||null;try{const{data:r,error:s}=await a.from("story_progress").select("*").eq("user_id",e);if(s)throw s;const{data:o,error:t}=await a.from("quiz_attempts").select("*").eq("user_id",e);if(t)throw t;const{data:n,error:i}=await a.from("chat_messages").select("*").eq("user_id",e);if(i)throw i;return{stories:V(r||[]),quizzes:Y(o||[]),chat:J(n||[]),streak:X(r||[],o||[],n||[]),activity:Z(r||[],o||[],n||[])}}catch(r){return console.warn("[dashboard] Supabase progress fetch failed, reverting to mock data",r),(await g()).progress[e]||null}}async function W(e){if(!e)throw new Error("childId is required");try{const{getChildBadges:a,getBadgeAwards:r}=await E(async()=>{const{getChildBadges:t,getBadgeAwards:n}=await import("./badge-services-BEYCrsbD.js");return{getChildBadges:t,getBadgeAwards:n}},__vite__mapDeps([0,1])),s=await a(e),o=r(e);return{coreBadges:s.map(t=>({...t,unlocked:t.unlocked||!1,awardedAt:t.awardedAt||null,hint:t.hint||t.description}))}}catch(a){if(console.warn("[dashboard] Badge service unavailable, using fallback",a),L())return{coreBadges:((await g()).badges?.coreBadges||[]).map(t=>({...t,unlocked:t.unlockedFor?.includes(e)||!1}))};const r=D();if(!r)return{coreBadges:((await g()).badges?.coreBadges||[]).map(t=>({...t,unlocked:t.unlockedFor?.includes(e)||!1}))};try{const{data:s,error:o}=await r.from("badge_awards").select("badge_id, awarded_at").eq("user_id",e);if(o)throw o;const{data:t,error:n}=await r.from("badges").select("*");if(n)throw n;const i=new Set((s||[]).map(d=>d.badge_id));return{coreBadges:(t||[]).map(d=>({...d,unlocked:i.has(d.id),awardedAt:i.has(d.id)?(s||[]).find(u=>u.badge_id===d.id)?.awarded_at:null}))}}catch(s){return console.warn("[dashboard] Supabase badges fetch failed, reverting to mock data",s),{coreBadges:((await g()).badges?.coreBadges||[]).map(n=>({...n,unlocked:n.unlockedFor?.includes(e)||!1}))}}}}function V(e){const a=e.filter(o=>o.completed).length,r=e.filter(o=>!o.completed&&o.last_panel_index>0).length,s={};return e.forEach(o=>{const t=o.topic_tag||"Unknown";s[t]||(s[t]={storiesRead:0,inProgress:0,lastOpened:null,completionPercentage:0}),o.completed?s[t].storiesRead++:o.last_panel_index>0&&s[t].inProgress++,(!s[t].lastOpened||new Date(o.updated_at)>new Date(s[t].lastOpened))&&(s[t].lastOpened=o.updated_at)}),{completed:a,inProgress:r,total:e.length,byTopic:Object.entries(s).map(([o,t])=>({topic:o,icon:ee(o),...t}))}}function Y(e){if(!e.length)return{attempts:0,averageScore:0,byTopic:[]};const a=e.reduce((o,t)=>o+(t.score||0),0),r=Math.round(a/e.length),s={};return e.forEach(o=>{const t=o.topic_tag||"Unknown";s[t]||(s[t]={attempts:0,scores:[],lastAttempt:null}),s[t].attempts++,s[t].scores.push(o.score||0),(!s[t].lastAttempt||new Date(o.created_at)>new Date(s[t].lastAttempt))&&(s[t].lastAttempt=o.created_at)}),{attempts:e.length,averageScore:r,byTopic:Object.entries(s).map(([o,t])=>({topic:o,attempts:t.attempts,bestScore:Math.max(...t.scores),lastAttempt:t.lastAttempt,averageScore:Math.round(t.scores.reduce((n,i)=>n+i,0)/t.scores.length)}))}}function J(e){const a=new Date;a.setDate(a.getDate()-7);const r=e.filter(o=>o.role==="user"&&new Date(o.created_at)>=a).length,s=new Set(e.map(o=>o.topic_id).filter(Boolean)).size;return{questionsThisWeek:r,totalQuestions:e.filter(o=>o.role==="user").length,topicsExplored:s}}function X(e,a,r){const s=[...e.map(i=>new Date(i.updated_at)),...a.map(i=>new Date(i.created_at)),...r.map(i=>new Date(i.created_at))];if(!s.length)return{days:0,lastActivity:null};const o=new Date(Math.max(...s.map(i=>i.getTime())));let t=0;const n=new Date;n.setHours(0,0,0,0);for(let i=0;i<30;i++){const d=new Date(n);if(d.setDate(d.getDate()-i),s.some(c=>{const p=new Date(c);return p.setHours(0,0,0,0),p.getTime()===d.getTime()}))t++;else if(i>0)break}return{days:t,lastActivity:o.toISOString()}}function Z(e,a,r){const s=[],o=new Date;for(let n=6;n>=0;n--){const i=new Date(o);i.setDate(i.getDate()-n);const d=i.toISOString().split("T")[0],u=[...e.filter(c=>c.updated_at?.startsWith(d)),...a.filter(c=>c.created_at?.startsWith(d)),...r.filter(c=>c.created_at?.startsWith(d))];s.push({date:d,sessions:new Set(u.map(c=>c.user_id||c.id)).size})}const t={};return[...e,...a,...r].forEach(n=>{const i=n.topic_tag||n.topic_id||"Unknown";t[i]=(t[i]||0)+1}),{last7Days:s,topicsExplored:Object.entries(t).map(([n,i])=>({topic:n,count:i}))}}function ee(e){return{Photosynthesis:"🌱","Solar System":"🪐","Moon & Gravity":"🌙","Ocean Life":"🌊",Dinosaurs:"🦖",Robotics:"🤖"}[e]||"📚"}function x(e,a={}){const r={event_name:e,event_data:a,timestamp:new Date().toISOString(),source:"parent_dashboard"};try{const s=JSON.parse(localStorage.getItem(A)||"[]");s.push(r),localStorage.setItem(A,JSON.stringify(s))}catch(s){console.warn("[dashboard] Failed to queue analytics event",s)}C&&B()&&fetch(C,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(r)}).catch(s=>{console.warn("[dashboard] Analytics send failed, queued only",s)})}const M="parent-001",l={selectedChildId:null,children:[],progress:null,badges:null,activeTab:"overview"},w=document.getElementById("childrenList"),te=document.getElementById("emptyState"),O=document.getElementById("childDetail"),se=document.getElementById("childHeader"),ae=document.getElementById("learningSnapshot"),S=document.getElementById("tabOverview"),_=document.getElementById("tabStories"),b=document.getElementById("tabQuizzes"),z=document.getElementById("badgesSection"),re=document.getElementById("badgesSummary"),H=document.getElementById("badgesContainer"),oe=new URLSearchParams(window.location.search),k=oe.get("childId");function T(e){if(!e)return"Never";const a=new Date(e),s=new Date-a,o=Math.floor(s/6e4),t=Math.floor(s/36e5),n=Math.floor(s/864e5);return o<1?"Just now":o<60?`${o} ${o===1?"minute":"minutes"} ago`:t<24?`${t} ${t===1?"hour":"hours"} ago`:n<7?`${n} ${n===1?"day":"days"} ago`:a.toLocaleDateString()}function ne(e){if(!e.lastActive)return"Needs Attention";const a=new Date(e.lastActive);return(new Date-a)/(1e3*60*60*24)<=7?"On Track":"Needs Attention"}function ie(e){const a=document.createElement("div"),r=l.selectedChildId===e.id,s=e.status||ne(e);a.className=`bg-gradient-to-br from-purple-50 to-pink-50 border-2 ${r?"border-purple-500 shadow-[0_0_30px_rgba(139,92,246,0.4)]":"border-purple-200"} rounded-3xl p-4 mb-4 shadow-[0_0_20px_rgba(139,92,246,0.15)] hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] transition cursor-pointer`;let o={completed:0,inProgress:0},t=0;return r&&l.progress&&(o=l.progress.stories||o,t=l.progress.quizzes?.attempts||0),a.innerHTML=`
    <div class="flex items-center gap-4 mb-3">
      <img
        src="${e.avatarUrl||"/avatars/child1.png"}"
        alt="${e.firstName}"
        class="w-16 h-16 rounded-full border-4 border-purple-200 object-cover"
        onerror="this.src='/avatars/child1.png'"
      />
      <div class="flex-1">
        <h3 class="font-fredoka text-xl font-bold text-slate-700 mb-1">${e.firstName||e.username}</h3>
        <p class="text-slate-600 text-sm">${e.gradeLevel||"Grade N/A"} · Age ${e.age||"N/A"}</p>
      </div>
    </div>
    <p class="text-slate-600 text-xs font-semibold mb-3">
      Stories: ${o.completed} · Quizzes: ${t}
    </p>
    <div class="flex items-center justify-between mb-3">
      <span class="px-3 py-1 rounded-full text-xs font-bold ${s==="On Track"?"bg-green-500/30 text-green-100 border border-green-400/50":"bg-amber-500/30 text-amber-100 border border-amber-400/50"}">
        ${s}
      </span>
    </div>
    <button class="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-2 px-4 rounded-2xl hover:from-purple-600 hover:to-pink-600 transition shadow-lg">
      View Progress
    </button>
  `,a.querySelector("button").addEventListener("click",()=>{q(e.id)}),a}function I(){if(w.innerHTML="",!l.children.length){w.innerHTML='<p class="text-slate-500 text-sm">No children found.</p>';return}l.children.forEach(e=>{w.appendChild(ie(e))})}async function q(e){l.selectedChildId=e;const a=new URL(window.location);a.searchParams.set("childId",e),window.history.pushState({childId:e},"",a),await x("parent_child_switch",{childId:e}),await le(e),I(),te.classList.add("hidden"),O.classList.remove("hidden")}async function le(e){try{const[a,r]=await Promise.all([Q(e),W(e)]);l.progress=a,l.badges=r,de(),ce(),P(),ge(),await x("child_progress_viewed",{childId:e})}catch(a){console.error("[dashboard] Failed to load child data",a),O.innerHTML=`
      <div class="bg-red-50 border-2 border-red-200 rounded-3xl p-6 text-center">
        <p class="text-red-600 font-semibold">Unable to load progress data. Please try again.</p>
      </div>
    `}}function de(){if(!l.selectedChildId||!l.children.length)return;const e=l.children.find(s=>s.id===l.selectedChildId);if(!e)return;const a=T(e.lastActive),r=e.currentTopic||"None";se.innerHTML=`
    <div class="flex items-center gap-4">
      <img
        src="${e.avatarUrl||"/avatars/child1.png"}"
        alt="${e.firstName}"
        class="w-16 h-16 rounded-full border-4 border-purple-200 object-cover"
        onerror="this.src='/avatars/child1.png'"
      />
      <div>
        <h2 class="font-fredoka text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">${e.firstName||e.username}</h2>
        <p class="text-slate-600 text-sm mt-1">
          Last active: ${a} · Current topic: ${r}
        </p>
      </div>
    </div>
  `}function ce(){if(!l.progress)return;const e=l.progress.stories||{completed:0,inProgress:0},a=l.progress.quizzes||{averageScore:0},r=l.progress.chat||{questionsThisWeek:0},s=l.progress.streak||{days:0};ae.innerHTML=`
    <div class="metric-card bg-white border-2 border-purple-200 rounded-2xl p-4 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
      <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-3">
        <span class="text-2xl">📚</span>
      </div>
      <div class="font-fredoka text-2xl font-bold text-slate-700 mb-1">${e.completed} / ${e.inProgress}</div>
      <p class="text-slate-600 text-xs font-medium">Stories completed: ${e.completed} / In progress: ${e.inProgress}</p>
    </div>
    <div class="metric-card bg-white border-2 border-purple-200 rounded-2xl p-4 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
      <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-3">
        <span class="text-2xl">🏆</span>
      </div>
      <div class="font-fredoka text-2xl font-bold text-slate-700 mb-1">${a.averageScore}%</div>
      <p class="text-slate-600 text-xs font-medium">Average quiz score: ${a.averageScore}%</p>
    </div>
    <div class="metric-card bg-white border-2 border-purple-200 rounded-2xl p-4 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
      <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-3">
        <span class="text-2xl">💬</span>
      </div>
      <div class="font-fredoka text-2xl font-bold text-slate-700 mb-1">${r.questionsThisWeek}</div>
      <p class="text-slate-600 text-xs font-medium">Questions asked this week: ${r.questionsThisWeek}</p>
    </div>
    <div class="metric-card bg-white border-2 border-purple-200 rounded-2xl p-4 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
      <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-3">
        <span class="text-2xl">🔥</span>
      </div>
      <div class="font-fredoka text-2xl font-bold text-slate-700 mb-1">${s.days}</div>
      <p class="text-slate-600 text-xs font-medium">Learning streak: ${s.days} days</p>
    </div>
  `}function P(){l.activeTab==="overview"?pe():l.activeTab==="stories"?ue():l.activeTab==="quizzes"&&fe()}function pe(){if(!l.progress)return;const e=l.progress.activity||{last7Days:[],topicsExplored:[]},r=l.children.find(c=>c.id===l.selectedChildId)?.firstName||"Your child",s=e.topicsExplored?.length||0,o=l.progress.stories?.completed||0,t=Math.max(...e.last7Days.map(c=>c.sessions),1),n=192;let i=`
    <svg viewBox="0 0 300 ${n}" class="w-full h-full">
      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#a855f7;stop-opacity:0.3" />
          <stop offset="100%" style="stop-color:#ec4899;stop-opacity:0.1" />
        </linearGradient>
      </defs>
  `;e.last7Days.forEach((c,p)=>{const h=p*300/7+20,m=c.sessions/t*(n-40),f=n-20-m;i+=`
      <rect x="${h}" y="${f}" width="30" height="${m}" fill="url(#lineGradient)" rx="4" />
      <text x="${h+15}" y="${n-5}" text-anchor="middle" fill="#475569" font-size="10" opacity="0.7">
        ${new Date(c.date).toLocaleDateString("en-US",{weekday:"short"}).slice(0,1)}
      </text>
    `}),i+="</svg>";const d=Math.max(...e.topicsExplored.map(c=>c.count)||[1],1);let u=`
    <svg viewBox="0 0 300 ${n}" class="w-full h-full">
  `;e.topicsExplored.slice(0,5).forEach((c,p)=>{const h=p*300/5+20,m=c.count/d*(n-40),f=n-20-m;u+=`
      <rect x="${h}" y="${f}" width="40" height="${m}" fill="url(#lineGradient)" rx="4" />
      <text x="${h+20}" y="${n-5}" text-anchor="middle" fill="#475569" font-size="8" opacity="0.7" transform="rotate(-45 ${h+20} ${n-5})">
        ${c.topic.substring(0,10)}
      </text>
    `}),u+="</svg>",S.innerHTML=`
    <div class="grid md:grid-cols-2 gap-4 mb-4">
      <div class="chart-container bg-white rounded-xl p-4 border-2 border-purple-200">
        <h4 class="font-fredoka text-sm font-bold text-slate-700 mb-3">Last 7 Days Activity</h4>
        <div class="h-48">${i}</div>
      </div>
      <div class="chart-container bg-white rounded-xl p-4 border-2 border-purple-200">
        <h4 class="font-fredoka text-sm font-bold text-slate-700 mb-3">Topics Explored</h4>
        <div class="h-48">${u}</div>
      </div>
    </div>
    <p class="text-slate-600 text-sm font-medium bg-white rounded-xl p-4 border-2 border-purple-200">
      This week, ${r} explored ${s} topics and completed ${o} new stories.
    </p>
  `}function ue(){if(!l.progress?.stories?.byTopic){_.innerHTML='<p class="text-slate-500 text-sm">No story progress data available.</p>';return}const e=l.progress.stories.byTopic;let a='<div class="stories-list space-y-3">';e.forEach(r=>{const s=r.completionPercentage||0,o=T(r.lastOpened);a+=`
      <div class="topic-progress-row bg-white rounded-xl p-4 hover:bg-purple-50 transition border-2 border-purple-200">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full flex items-center justify-center">
            <span class="text-xl">${r.icon||"📚"}</span>
          </div>
          <h4 class="font-fredoka text-lg font-bold text-slate-700">${r.topic}</h4>
        </div>
        <div class="mb-2">
          <div class="bg-purple-100 rounded-full h-3 mb-1">
            <div class="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all" style="width: ${s}%"></div>
          </div>
          <p class="text-slate-700 text-xs font-semibold">${s}%</p>
        </div>
        <p class="text-slate-600 text-xs">
          Stories read: ${r.storiesRead||0} · In progress: ${r.inProgress||0} · Last opened: ${o}
        </p>
      </div>
    `}),a+="</div>",_.innerHTML=a}function fe(){if(!l.progress?.quizzes){b.innerHTML='<p class="text-slate-500 text-sm">No quiz data available.</p>';return}const e=l.progress.quizzes.byTopic||[];if(!e.length){b.innerHTML='<p class="text-slate-500 text-sm">No quiz attempts yet.</p>';return}const a=Math.max(...e.map(t=>t.averageScore||0),100),r=192;let s=`
    <svg viewBox="0 0 300 ${r}" class="w-full h-full">
      <defs>
        <linearGradient id="quizGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#a855f7;stop-opacity:0.5" />
          <stop offset="100%" style="stop-color:#ec4899;stop-opacity:0.3" />
        </linearGradient>
      </defs>
  `;e.forEach((t,n)=>{const i=n*300/e.length+20,d=(t.averageScore||0)/a*(r-40),u=r-20-d;s+=`
      <rect x="${i}" y="${u}" width="40" height="${d}" fill="url(#quizGradient)" rx="4" />
      <text x="${i+20}" y="${r-5}" text-anchor="middle" fill="#475569" font-size="8" opacity="0.7" transform="rotate(-45 ${i+20} ${r-5})">
        ${t.topic.substring(0,10)}
      </text>
    `}),s+="</svg>";let o=`
    <div class="bg-white rounded-xl p-4 overflow-x-auto border-2 border-purple-200">
      <table class="w-full">
        <thead>
          <tr class="border-b border-purple-200">
            <th class="text-left text-slate-700 font-bold text-sm py-2">Topic</th>
            <th class="text-left text-slate-700 font-bold text-sm py-2">Attempts</th>
            <th class="text-left text-slate-700 font-bold text-sm py-2">Best Score</th>
            <th class="text-left text-slate-700 font-bold text-sm py-2">Last Attempt</th>
          </tr>
        </thead>
        <tbody>
  `;e.forEach(t=>{const n=T(t.lastAttempt);o+=`
      <tr class="border-b border-purple-100">
        <td class="text-slate-600 text-sm py-2">${t.topic}</td>
        <td class="text-slate-600 text-sm py-2">${t.attempts||0}</td>
        <td class="text-slate-600 text-sm py-2">${t.bestScore||0}%</td>
        <td class="text-slate-600 text-sm py-2">${n}</td>
      </tr>
    `}),o+=`
        </tbody>
      </table>
    </div>
  `,b.innerHTML=`
    <div class="chart-container bg-white rounded-xl p-4 mb-4 border-2 border-purple-200">
      <h4 class="font-fredoka text-sm font-bold text-slate-700 mb-3">Quiz Performance by Topic</h4>
      <div class="h-48">${s}</div>
    </div>
    ${o}
  `}function ge(){if(!l.badges?.coreBadges){z.classList.add("hidden");return}z.classList.remove("hidden");const e=l.badges.coreBadges,a=e.filter(t=>t.unlocked).length,r=e.length,o=l.children.find(t=>t.id===l.selectedChildId)?.firstName||"Your child";re.textContent=`${o} has unlocked ${a} of ${r} core curiosity badges.`,H.innerHTML="",e.forEach(t=>{const n=document.createElement("div");n.className="badge-tile bg-white border-2 border-purple-200 rounded-2xl p-4 min-w-[180px] flex-shrink-0 hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:border-purple-300 transition relative cursor-pointer",n.dataset.badgeId=t.id;const i=t.unlocked?"bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_0_20px_rgba(139,92,246,0.4)]":"bg-purple-100 border-2 border-purple-200",d=t.unlocked?"":"opacity-70";n.innerHTML=`
      <div class="badge-icon-container mb-3 flex justify-center relative">
        <div class="badge-icon w-16 h-16 rounded-full flex items-center justify-center ${i}">
          <span class="text-3xl ${d}">${t.icon||"🏆"}</span>
        </div>
        ${t.unlocked?'<span class="absolute top-0 right-0 w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs">✓</span>':'<span class="absolute top-0 right-0 w-6 h-6 bg-purple-200 rounded-full flex items-center justify-center text-purple-600 text-xs">🔒</span>'}
      </div>
      <h4 class="font-fredoka text-base font-bold text-slate-700 mb-2 text-center">${t.name}</h4>
      <p class="text-slate-600 text-xs text-center ${t.unlocked?"":"italic text-slate-500"}">
        ${t.unlocked?`Earned on: ${t.awardedAt?new Date(t.awardedAt).toLocaleDateString():"Recently"}`:`Hint: ${t.hint||t.description}`}
      </p>
    `,n.addEventListener("click",()=>{me(t.id)}),H.appendChild(n)})}async function me(e){const a=await U(e);if(!a){alert("Badge not found");return}const s=(l.badges?.coreBadges||[]).find(f=>f.id===e),o=s?.unlocked||!1;let t=null;!o&&l.selectedChildId&&(t=await G(l.selectedChildId,e));const n=o?"bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_0_20px_rgba(139,92,246,0.4)]":"bg-purple-100 border-2 border-purple-200",i=o?"":"opacity-70";let d="";if(t){const f=Math.round(t.current/t.required*100);d=`
      <div class="mb-4">
        <div class="bg-purple-100 rounded-full h-3 mb-2">
          <div class="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all" style="width: ${f}%"></div>
        </div>
        <p class="text-slate-600 text-xs font-semibold">${t.current} of ${t.required} completed (${f}%)</p>
      </div>
    `}const u=`
    <div class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-white border-2 border-purple-200 rounded-3xl p-8 max-w-md w-full mx-4 shadow-[0_0_40px_rgba(139,92,246,0.3)] relative">
        <button
          id="closeBadgeModalBtn"
          class="absolute top-4 right-4 text-slate-600 hover:text-slate-900 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-purple-50 transition"
        >
          ×
        </button>
        <div class="text-center">
          <div class="badge-icon-container mb-4 flex justify-center relative">
            <div class="badge-icon w-32 h-32 rounded-full flex items-center justify-center ${n} mx-auto">
              <span class="text-6xl ${i}">${a.icon||"🏆"}</span>
            </div>
            ${o?'<span class="absolute top-0 right-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm">✓</span>':'<span class="absolute top-0 right-0 w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center text-purple-600 text-sm">🔒</span>'}
          </div>
          <h3 class="font-fredoka text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">${a.name}</h3>
          <p class="text-slate-600 text-lg mb-4">${a.description}</p>
          ${d}
          ${o?`<p class="text-slate-500 text-sm mb-4">Earned on: ${s?.awardedAt?new Date(s.awardedAt).toLocaleDateString():"Recently"}</p>`:`<p class="text-slate-500 italic text-sm mb-4">Hint: ${a.hint||a.description}</p>`}
        </div>
      </div>
    </div>
  `,c=document.getElementById("badgeDetailModal");c&&c.remove();const p=document.createElement("div");p.id="badgeDetailModal",p.innerHTML=u,document.body.appendChild(p),p.querySelector("#closeBadgeModalBtn").addEventListener("click",()=>{p.remove()}),p.addEventListener("click",f=>{f.target===p&&p.remove()});const m=f=>{f.key==="Escape"&&document.getElementById("badgeDetailModal")&&(document.getElementById("badgeDetailModal")?.remove(),document.removeEventListener("keydown",m))};document.addEventListener("keydown",m),await x("badge_detail_viewed",{badgeId:e,childId:l.selectedChildId})}document.querySelectorAll(".tab-btn").forEach(e=>{e.addEventListener("click",async()=>{const a=e.dataset.tab;l.activeTab=a,document.querySelectorAll(".tab-btn").forEach(r=>{r.className=r.className.replace(/bg-gradient-to-r from-purple-500 to-pink-500 text-white/g,"bg-purple-100 text-slate-600 hover:bg-purple-200"),r.className=r.className.replace(/active/g,"")}),e.className=e.className.replace(/bg-purple-100 text-slate-600 hover:bg-purple-200/g,"bg-gradient-to-r from-purple-500 to-pink-500 text-white"),e.className+=" active",S.classList.add("hidden"),_.classList.add("hidden"),b.classList.add("hidden"),a==="overview"?S.classList.remove("hidden"):a==="stories"?_.classList.remove("hidden"):a==="quizzes"&&b.classList.remove("hidden"),await x("progress_tab_switched",{tab:a,childId:l.selectedChildId}),P()})});document.getElementById("viewBadgeRulesBtn")?.addEventListener("click",()=>{alert("Badge rules will be available soon! 🏆")});async function he(){try{const e=await K(M);l.children=e,I(),k&&e.find(r=>r.id===k)&&await q(k),await x("dashboard_viewed",{parentId:M})}catch(e){console.error("[dashboard] Failed to load dashboard",e),w.innerHTML='<p class="text-red-600 text-sm">Unable to load dashboard data.</p>'}}he();const j=async()=>{try{const{createClient:e}=await E(async()=>{const{createClient:r}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm");return{createClient:r}},[]),{supabaseConfig:a}=await E(async()=>{const{supabaseConfig:r}=await import("./config-N_0HKkEA.js");return{supabaseConfig:r}},[]);if(a?.url&&a?.anonKey){const r=e(a.url,a.anonKey),{error:s}=await r.auth.signOut();if(s)throw s}}catch{console.log("Supabase logout skipped (mock mode)")}localStorage.clear(),sessionStorage.clear(),window.location.href="../auth/auth.html"};document.getElementById("logoutBtn")?.addEventListener("click",j);document.getElementById("logoutBtnMobile")?.addEventListener("click",j);
