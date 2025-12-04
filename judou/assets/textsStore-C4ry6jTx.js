import{C as R,u as U,r as y,m as z}from"./index-C2SehGG3.js";import{u as D}from"./useSupabase-CcifVOl-.js";const L=/[。！？；，：]/g,M=/[「」『』“”"']/g,P=/\|{2,}/g;function v(r){if(!r)return"";const u=r.replace(M,"").replace(L,"|").replace(P,"|").trim();return u.endsWith("|")?u.slice(0,-1):u}function E(r){const a=r.replace(/\|/g,"").length;return a<=70?1:a<=150?2:3}function A(r){return r.replace(/\|/g,"").length}const k=R("texts",()=>{const r=D(),a=U(),i=y([]),u=y(!1),x=y(null),T=z(()=>[...i.value].sort((e,t)=>(t.created_at??"").localeCompare(e.created_at??"")));async function b(){if(!r){x.value="Supabase 尚未配置";return}u.value=!0,x.value=null;try{const{data:e,error:t}=await r.from("practice_texts").select(`
          *,
          category:practice_categories (
            id,
            name,
            slug,
            level,
            parent_id
          ),
          text_practice_categories (
            category:practice_categories (
              id,
              name,
              slug,
              level,
              parent_id
            )
          ),
          source_text:practice_texts!source_text_id (
            id,
            title
          )
        `).order("created_at",{ascending:!1});if(t)throw t;i.value=(e||[]).map(c=>{const s=Array.isArray(c.source_text)?c.source_text[0]:c.source_text,n=Array.isArray(c.text_practice_categories)?c.text_practice_categories.map(d=>d.category).filter(Boolean):[];return{...c,source_text:s||null,practice_categories:n,text_practice_categories:void 0}})}catch(e){x.value=e.message??"無法載入文章"}finally{u.value=!1}}async function C(e,t=!1){if(!r)throw new Error("Supabase 尚未配置");if(!a.user)throw new Error("請先登入");const c=v(e.content),s=E(c),n=A(c);if(t&&!a.isAdmin)throw new Error("只有管理員可以創建系統文章");if(!t&&!a.isTeacher)throw new Error("只有老師可以創建私有文章");const d=e.practice_category_ids&&e.practice_category_ids.length>0?e.practice_category_ids[0]:e.category_id||null,{data:l,error:p}=await r.from("practice_texts").insert({title:e.title,author:e.author??null,source:e.source??null,summary:e.summary??null,category_id:d,content:c,difficulty:s,word_count:n,is_system:t,created_by:t?null:a.user.id}).select(`
        *,
        category:practice_categories (
          id,
          name,
          slug,
          level,
          parent_id
        )
      `).single();if(p)throw p;if(l&&e.practice_category_ids&&e.practice_category_ids.length>0){const{error:h}=await r.from("text_practice_categories").insert(e.practice_category_ids.map(g=>({text_id:l.id,category_id:g})));if(h)throw h;const{data:o,error:_}=await r.from("practice_texts").select(`
          *,
          category:practice_categories (
            id,
            name,
            slug,
            level,
            parent_id
          ),
          text_practice_categories (
            category:practice_categories (
              id,
              name,
              slug,
              level,
              parent_id
            )
          )
        `).eq("id",l.id).single();if(_)throw _;if(o){const g=Array.isArray(o.text_practice_categories)?o.text_practice_categories.map(m=>m.category).filter(Boolean):[],f={...o,practice_categories:g,text_practice_categories:void 0};i.value.unshift(f)}}else l&&i.value.unshift(l)}async function S(e,t){if(!r)throw new Error("Supabase 尚未配置");if(!a.user)throw new Error("請先登入");const{data:c}=await r.from("practice_texts").select("is_system, created_by").eq("id",e).single();if(c){if(c.is_system&&!a.isAdmin)throw new Error("只有管理員可以更新系統文章");if(!c.is_system&&c.created_by!==a.user.id)throw new Error("只能更新自己創建的文章")}const s=v(t.content),n=E(s),d=A(s),l=t.practice_category_ids&&t.practice_category_ids.length>0?t.practice_category_ids[0]:t.category_id||null,{data:p,error:h}=await r.from("practice_texts").update({title:t.title,author:t.author??null,source:t.source??null,summary:t.summary??null,category_id:l,content:s,difficulty:n,word_count:d}).eq("id",e).select(`
        *,
        category:practice_categories (
          id,
          name,
          slug,
          level,
          parent_id
        )
      `).single();if(h)throw h;if(t.practice_category_ids!==void 0){const{error:o}=await r.from("text_practice_categories").delete().eq("text_id",e);if(o)throw o;if(t.practice_category_ids.length>0){const{error:f}=await r.from("text_practice_categories").insert(t.practice_category_ids.map(m=>({text_id:e,category_id:m})));if(f)throw f}const{data:_,error:g}=await r.from("practice_texts").select(`
          *,
          category:practice_categories (
            id,
            name,
            slug,
            level,
            parent_id
          ),
          text_practice_categories (
            category:practice_categories (
              id,
              name,
              slug,
              level,
              parent_id
            )
          )
        `).eq("id",e).single();if(g)throw g;if(_){const f=Array.isArray(_.text_practice_categories)?_.text_practice_categories.map(w=>w.category).filter(Boolean):[],m={..._,practice_categories:f,text_practice_categories:void 0};i.value=i.value.map(w=>w.id===e?m:w)}}else p&&(i.value=i.value.map(o=>o.id===e?p:o))}async function q(e){if(!r)throw new Error("Supabase 尚未配置");if(!a.user)throw new Error("請先登入");const{data:t}=await r.from("practice_texts").select("is_system, created_by").eq("id",e).single();if(t){if(t.is_system&&!a.isAdmin)throw new Error("只有管理員可以刪除系統文章");if(!t.is_system&&t.created_by!==a.user.id)throw new Error("只能刪除自己創建的文章")}const{error:c}=await r.from("practice_texts").delete().eq("id",e);if(c)throw c;i.value=i.value.filter(s=>s.id!==e)}async function B(e){if(!r)return null;const t=e.username??"anonymous_user",c=e.display_name??"匿名學員",{data:s,error:n}=await r.from("practice_records").insert({...e,username:t,display_name:c}).select("id").single();return n?(console.error("記錄練習結果失敗:",n),null):s?.id||null}function I(){if(!i.value.length)return null;const e=Math.floor(Math.random()*i.value.length);return i.value[e]}return{texts:i,sortedTexts:T,isLoading:u,error:x,fetchTexts:b,addText:C,updateText:S,deleteText:q,recordPracticeResult:B,getRandomText:I}});export{k as u};
