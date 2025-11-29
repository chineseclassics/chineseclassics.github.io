import{y as S,u as A,r as d,c as q}from"./index-D3NuB_Em.js";import{u as B}from"./useSupabase-DxQBIjgg.js";const C=/[。！？；，：]/g,R=/[「」『』“”"']/g,U=/\|{2,}/g;function w(r){if(!r)return"";const a=r.replace(R,"").replace(C,"|").replace(U,"|").trim();return a.endsWith("|")?a.slice(0,-1):a}function h(r){const s=r.replace(/\|/g,"").length;return s<=70?1:s<=150?2:3}function g(r){return r.replace(/\|/g,"").length}const M=S("texts",()=>{const r=B(),s=A(),i=d([]),a=d(!1),l=d(null),p=q(()=>[...i.value].sort((e,t)=>(t.created_at??"").localeCompare(e.created_at??"")));async function x(){if(!r){l.value="Supabase 尚未配置";return}a.value=!0,l.value=null;try{const{data:e,error:t}=await r.from("practice_texts").select(`
          *,
          category:practice_categories (
            id,
            name,
            slug,
            level,
            parent_id
          ),
          source_text:practice_texts!source_text_id (
            id,
            title
          )
        `).order("created_at",{ascending:!1});if(t)throw t;i.value=e||[]}catch(e){l.value=e.message??"無法載入文章"}finally{a.value=!1}}async function y(e,t=!1){if(!r)throw new Error("Supabase 尚未配置");if(!s.user)throw new Error("請先登入");const n=w(e.content),o=h(n),c=g(n);if(t&&!s.isAdmin)throw new Error("只有管理員可以創建系統文章");if(!t&&!s.isTeacher)throw new Error("只有老師可以創建私有文章");const{data:f,error:u}=await r.from("practice_texts").insert({title:e.title,author:e.author??null,source:e.source??null,summary:e.summary??null,category_id:e.category_id||null,content:n,difficulty:o,word_count:c,is_system:t,created_by:t?null:s.user.id}).select(`
        *,
        category:practice_categories (
          id,
          name,
          slug,
          level,
          parent_id
        )
      `).single();if(u)throw u;f&&i.value.unshift(f)}async function E(e,t){if(!r)throw new Error("Supabase 尚未配置");if(!s.user)throw new Error("請先登入");const{data:n}=await r.from("practice_texts").select("is_system, created_by").eq("id",e).single();if(n){if(n.is_system&&!s.isAdmin)throw new Error("只有管理員可以更新系統文章");if(!n.is_system&&n.created_by!==s.user.id)throw new Error("只能更新自己創建的文章")}const o=w(t.content),c=h(o),f=g(o),{data:u,error:_}=await r.from("practice_texts").update({title:t.title,author:t.author??null,source:t.source??null,summary:t.summary??null,category_id:t.category_id||null,content:o,difficulty:c,word_count:f}).eq("id",e).select(`
        *,
        category:practice_categories (
          id,
          name,
          slug,
          level,
          parent_id
        )
      `).single();if(_)throw _;u&&(i.value=i.value.map(m=>m.id===e?u:m))}async function v(e){if(!r)throw new Error("Supabase 尚未配置");if(!s.user)throw new Error("請先登入");const{data:t}=await r.from("practice_texts").select("is_system, created_by").eq("id",e).single();if(t){if(t.is_system&&!s.isAdmin)throw new Error("只有管理員可以刪除系統文章");if(!t.is_system&&t.created_by!==s.user.id)throw new Error("只能刪除自己創建的文章")}const{error:n}=await r.from("practice_texts").delete().eq("id",e);if(n)throw n;i.value=i.value.filter(o=>o.id!==e)}async function T(e){if(!r)return null;const t=e.username??"anonymous_user",n=e.display_name??"匿名學員",{data:o,error:c}=await r.from("practice_records").insert({...e,username:t,display_name:n}).select("id").single();return c?(console.error("記錄練習結果失敗:",c),null):o?.id||null}function b(){if(!i.value.length)return null;const e=Math.floor(Math.random()*i.value.length);return i.value[e]}return{texts:i,sortedTexts:p,isLoading:a,error:l,fetchTexts:x,addText:y,updateText:E,deleteText:v,recordPracticeResult:T,getRandomText:b}});export{M as u};
