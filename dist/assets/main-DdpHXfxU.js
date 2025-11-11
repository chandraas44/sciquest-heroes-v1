import{s as d}from"./config-4EZbmldV.js";import{createClient as g}from"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm";const f=d.url,h=d.anonKey,o=g(f,h);async function y(){const{data:{session:t}}=await o.auth.getSession();if(t){const{data:a}=await o.from("user_profiles").select("*").eq("id",t.user.id).maybeSingle();a&&x(a)}}function x(t){const a=document.querySelector("nav .max-w-7xl");if(!a)return;const i=a.querySelector(".btn-3d");if(!i)return;const l=t.first_name||t.full_name||t.username||"User",c=l.charAt(0).toUpperCase(),p=`
        <div class="user-menu" style="position: relative;">
            <div class="user-menu-trigger" id="navUserMenuTrigger" style="
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px 20px;
                background: white;
                border: 2px solid #e2e8f0;
                border-radius: 50px;
                cursor: pointer;
                transition: all 0.3s ease;
            ">
                <div class="user-avatar" style="
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #a855f7, #ec4899);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: 800;
                    font-size: 16px;
                    overflow: hidden;
                ">
                    ${t.avatar_url?`<img src="${t.avatar_url}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover;">`:c}
                </div>
                <span style="font-weight: 700; color: #1e293b; font-size: 14px;">${l}</span>
                <i class="fas fa-chevron-down" style="color: #64748b; font-size: 12px;"></i>
            </div>
            <div class="dropdown-menu" id="navDropdownMenu" style="
                position: absolute;
                top: calc(100% + 10px);
                right: 0;
                background: white;
                border: 2px solid #e2e8f0;
                border-radius: 16px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.15);
                min-width: 220px;
                display: none;
                overflow: hidden;
                z-index: 1000;
            ">
                <a href="${m(t.account_type)}" class="dropdown-item" style="
                    padding: 14px 20px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: #475569;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    text-decoration: none;
                ">
                    <i class="fas fa-th-large" style="width: 20px;"></i>
                    <span>Dashboard</span>
                </a>
                ${t.account_type==="student"?`
                <a href="profile.html" class="dropdown-item" style="
                    padding: 14px 20px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: #475569;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    text-decoration: none;
                ">
                    <i class="fas fa-user" style="width: 20px;"></i>
                    <span>Profile</span>
                </a>
                <a href="avatar-selection.html" class="dropdown-item" style="
                    padding: 14px 20px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: #475569;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    text-decoration: none;
                ">
                    <i class="fas fa-user-circle" style="width: 20px;"></i>
                    <span>Change Avatar</span>
                </a>
                `:""}
                <div style="height: 1px; background: #e2e8f0; margin: 8px 0;"></div>
                <div class="dropdown-item" id="navLogoutBtn" style="
                    padding: 14px 20px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: #475569;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                ">
                    <i class="fas fa-sign-out-alt" style="width: 20px;"></i>
                    <span>Logout</span>
                </div>
            </div>
        </div>
    `;i.outerHTML=p;const r=document.getElementById("navUserMenuTrigger"),s=document.getElementById("navDropdownMenu"),u=document.getElementById("navLogoutBtn");r.addEventListener("click",e=>{e.stopPropagation(),s.style.display=s.style.display==="block"?"none":"block"}),document.addEventListener("click",e=>{!r.contains(e.target)&&!s.contains(e.target)&&(s.style.display="none")}),document.querySelectorAll(".dropdown-item").forEach(e=>{e.addEventListener("mouseenter",n=>{n.currentTarget.style.background="#f8fafc",n.currentTarget.style.color="#a855f7"}),e.addEventListener("mouseleave",n=>{n.currentTarget.style.background="transparent",n.currentTarget.style.color="#475569"})}),r.addEventListener("mouseenter",e=>{e.currentTarget.style.borderColor="#a855f7",e.currentTarget.style.boxShadow="0 4px 12px rgba(168, 85, 247, 0.2)"}),r.addEventListener("mouseleave",e=>{e.currentTarget.style.borderColor="#e2e8f0",e.currentTarget.style.boxShadow="none"}),u.addEventListener("click",async()=>{try{const{error:e}=await o.auth.signOut();if(e)throw e;localStorage.clear(),sessionStorage.clear(),window.location.reload()}catch(e){console.error("Logout error:",e),alert("Failed to logout. Please try again.")}})}function m(t){return t==="parent"?"parent-dashboard.html":t==="teacher"?"teacher-dashboard.html":"index.html#avatars"}y();
