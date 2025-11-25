import{v as F,u as H,r as m,H as n}from"./index-2a9Yh5Aa.js";const j=F("assignment",()=>{const l=H(),c=m([]),f=m([]),g=m(new Map),i=m(!1),s=m(null);async function A(e){if(n){i.value=!0,s.value=null;try{const{data:t,error:a}=await n.from("class_assignments").select(`
          *,
          text:practice_texts (
            id,
            title,
            author,
            difficulty
          ),
          class:classes (
            id,
            class_name,
            teacher_id
          )
        `).eq("class_id",e).order("assigned_at",{ascending:!1});if(a){s.value=a.message;return}c.value=t||[]}catch(t){s.value=t.message}finally{i.value=!1}}}async function S(e,t,a){if(!n||!l.user)return s.value="請先登入",null;if(!l.isTeacher)return s.value="只有老師可以創建作業",null;i.value=!0,s.value=null;try{const{data:r,error:o}=await n.from("class_assignments").insert({class_id:e,text_id:t,assigned_by:l.user.id,title:a||null}).select(`
          *,
          text:practice_texts (
            id,
            title,
            author,
            difficulty
          )
        `).single();return o?(s.value=o.message,null):(c.value.unshift(r),r)}catch(r){return s.value=r.message,null}finally{i.value=!1}}async function q(e){if(!n||!l.isTeacher)return s.value="無權限",!1;i.value=!0,s.value=null;try{const{error:t}=await n.from("class_assignments").delete().eq("id",e);return t?(s.value=t.message,!1):(c.value=c.value.filter(a=>a.id!==e),!0)}catch(t){return s.value=t.message,!1}finally{i.value=!1}}async function x(e){if(n){i.value=!0,s.value=null;try{const{data:t,error:a}=await n.from("assignment_completions").select(`
          *,
          student:users!assignment_completions_student_id_fkey (
            id,
            display_name,
            email
          )
        `).eq("assignment_id",e).order("completed_at",{ascending:!1});if(a){s.value=a.message;return}f.value=t||[]}catch(t){s.value=t.message}finally{i.value=!1}}}async function C(e,t){if(n)try{const{data:a}=await n.from("class_assignments").select("id").eq("class_id",e);if(!a||a.length===0)return;const r=a.map(d=>d.id),{data:o}=await n.from("assignment_completions").select("assignment_id, score, accuracy").in("assignment_id",r),w=new Map;for(const d of r){const _=(o||[]).filter(u=>u.assignment_id===d),T=_.length,v=_.map(u=>u.score).filter(u=>u!==null),h=_.map(u=>u.accuracy).filter(u=>u!==null);w.set(d,{assignment_id:d,total_students:t,completed_count:T,average_score:v.length>0?Math.round(v.reduce((u,p)=>u+p,0)/v.length):null,average_accuracy:h.length>0?Math.round(h.reduce((u,p)=>u+p,0)/h.length):null})}g.value=w}catch(a){console.error("獲取作業統計失敗:",a)}}function E(e){return g.value.get(e)||null}async function y(){if(!(!n||!l.user)){i.value=!0,s.value=null;try{const{data:e}=await n.from("class_members").select("class_id").eq("student_id",l.user.id);if(!e||e.length===0){c.value=[];return}const t=e.map(o=>o.class_id),{data:a,error:r}=await n.from("class_assignments").select(`
          *,
          text:practice_texts (
            id,
            title,
            author,
            difficulty
          ),
          class:classes (
            id,
            class_name,
            teacher_id
          ),
          teacher:users!class_assignments_assigned_by_fkey (
            id,
            display_name
          )
        `).in("class_id",t).order("assigned_at",{ascending:!1});if(r){s.value=r.message;return}c.value=a||[]}catch(e){s.value=e.message}finally{i.value=!1}}}async function M(e){if(!n||!l.user)return!1;const{data:t}=await n.from("assignment_completions").select("id").eq("assignment_id",e).eq("student_id",l.user.id).single();return!!t}async function b(e,t,a,r){if(!n||!l.user)return s.value="請先登入",!1;i.value=!0,s.value=null;try{const{error:o}=await n.from("assignment_completions").insert({assignment_id:e,student_id:l.user.id,practice_record_id:t,score:a,accuracy:r});return o?(s.value=o.message,!1):!0}catch(o){return s.value=o.message,!1}finally{i.value=!1}}async function I(){if(!n||!l.user||!l.isStudent)return 0;try{if(await y(),c.value.length===0)return 0;const e=c.value.map(r=>r.id),{data:t}=await n.from("assignment_completions").select("assignment_id").eq("student_id",l.user.id).in("assignment_id",e),a=new Set(t?.map(r=>r.assignment_id)||[]);return c.value.filter(r=>!a.has(r.id)).length}catch(e){return console.error("獲取待完成作業數量失敗:",e),0}}function k(){c.value=[],f.value=[],s.value=null}return{assignments:c,completions:f,assignmentStats:g,loading:i,error:s,fetchClassAssignments:A,createAssignment:S,deleteAssignment:q,fetchAssignmentCompletions:x,fetchAssignmentStats:C,getAssignmentStats:E,fetchStudentAssignments:y,checkAssignmentCompletion:M,recordCompletion:b,getPendingCount:I,reset:k}});export{j as u};
