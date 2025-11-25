import{v as S,u as A,r as d,c as q}from"./index-goaX2Wav.js";import{u as B}from"./useSupabase-D5dpljik.js";const C=/[。！？；，：]/g,R=/[「」『』“”"']/g,U=/\|{2,}/g;function h(r){if(!r)return"";const a=r.replace(R,"").replace(C,"|").replace(U,"|").trim();return a.endsWith("|")?a.slice(0,-1):a}function _(r){const n=r.replace(/\|/g,"").length;return n<=70?1:n<=150?2:3}function g(r){return r.replace(/\|/g,"").length}const M=S("texts",()=>{const r=B(),n=A(),o=d([]),a=d(!1),l=d(null),p=q(()=>[...o.value].sort((e,t)=>(t.created_at??"").localeCompare(e.created_at??"")));async function x(){if(!r){l.value="Supabase 尚未配置";return}a.value=!0,l.value=null;try{const{data:e,error:t}=await r.from("practice_texts").select(`
          *,
          category:practice_categories (
            id,
            name,
            slug,
            level,
            parent_id
          )
        `).order("created_at",{ascending:!1});if(t)throw t;o.value=e||[]}catch(e){l.value=e.message??"無法載入文章"}finally{a.value=!1}}async function y(e,t=!1){if(!r)throw new Error("Supabase 尚未配置");if(!n.user)throw new Error("請先登入");const s=h(e.content),i=_(s),c=g(s);if(t&&!n.isAdmin)throw new Error("只有管理員可以創建系統文章");if(!t&&!n.isTeacher)throw new Error("只有老師可以創建私有文章");const{data:f,error:u}=await r.from("practice_texts").insert({title:e.title,author:e.author??null,source:e.source??null,summary:e.summary??null,category_id:e.category_id||null,content:s,difficulty:i,word_count:c,is_system:t,created_by:t?null:n.user.id}).select(`
        *,
        category:practice_categories (
          id,
          name,
          slug,
          level,
          parent_id
        )
      `).single();if(u)throw u;f&&o.value.unshift(f)}async function E(e,t){if(!r)throw new Error("Supabase 尚未配置");if(!n.user)throw new Error("請先登入");const{data:s}=await r.from("practice_texts").select("is_system, created_by").eq("id",e).single();if(s){if(s.is_system&&!n.isAdmin)throw new Error("只有管理員可以更新系統文章");if(!s.is_system&&s.created_by!==n.user.id)throw new Error("只能更新自己創建的文章")}const i=h(t.content),c=_(i),f=g(i),{data:u,error:m}=await r.from("practice_texts").update({title:t.title,author:t.author??null,source:t.source??null,summary:t.summary??null,category_id:t.category_id||null,content:i,difficulty:c,word_count:f}).eq("id",e).select(`
        *,
        category:practice_categories (
          id,
          name,
          slug,
          level,
          parent_id
        )
      `).single();if(m)throw m;u&&(o.value=o.value.map(w=>w.id===e?u:w))}async function v(e){if(!r)throw new Error("Supabase 尚未配置");if(!n.user)throw new Error("請先登入");const{data:t}=await r.from("practice_texts").select("is_system, created_by").eq("id",e).single();if(t){if(t.is_system&&!n.isAdmin)throw new Error("只有管理員可以刪除系統文章");if(!t.is_system&&t.created_by!==n.user.id)throw new Error("只能刪除自己創建的文章")}const{error:s}=await r.from("practice_texts").delete().eq("id",e);if(s)throw s;o.value=o.value.filter(i=>i.id!==e)}async function T(e){if(!r)return null;const t=e.username??"anonymous_user",s=e.display_name??"匿名學員",{data:i,error:c}=await r.from("practice_records").insert({...e,username:t,display_name:s}).select("id").single();return c?(console.error("記錄練習結果失敗:",c),null):i?.id||null}function b(){if(!o.value.length)return null;const e=Math.floor(Math.random()*o.value.length);return o.value[e]}return{texts:o,sortedTexts:p,isLoading:a,error:l,fetchTexts:x,addText:y,updateText:E,deleteText:v,recordPracticeResult:T,getRandomText:b}});export{M as u};
