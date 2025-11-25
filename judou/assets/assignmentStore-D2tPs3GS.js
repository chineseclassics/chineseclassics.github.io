import{v as x,u as A,r as o,H as a}from"./index-Bakowwg8.js";const S=x("assignment",()=>{const l=A(),u=o([]),d=o([]),i=o(!1),e=o(null);async function m(s){if(a){i.value=!0,e.value=null;try{const{data:t,error:n}=await a.from("class_assignments").select(`
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
        `).eq("class_id",s).order("assigned_at",{ascending:!1});if(n){e.value=n.message;return}u.value=t||[]}catch(t){e.value=t.message}finally{i.value=!1}}}async function g(s,t,n){if(!a||!l.user)return e.value="請先登入",null;if(!l.isTeacher)return e.value="只有老師可以創建作業",null;i.value=!0,e.value=null;try{const{data:r,error:c}=await a.from("class_assignments").insert({class_id:s,text_id:t,assigned_by:l.user.id,title:n||null}).select(`
          *,
          text:practice_texts (
            id,
            title,
            author,
            difficulty
          )
        `).single();return c?(e.value=c.message,null):(u.value.unshift(r),r)}catch(r){return e.value=r.message,null}finally{i.value=!1}}async function v(s){if(!a||!l.isTeacher)return e.value="無權限",!1;i.value=!0,e.value=null;try{const{error:t}=await a.from("class_assignments").delete().eq("id",s);return t?(e.value=t.message,!1):(u.value=u.value.filter(n=>n.id!==s),!0)}catch(t){return e.value=t.message,!1}finally{i.value=!1}}async function _(s){if(a){i.value=!0,e.value=null;try{const{data:t,error:n}=await a.from("assignment_completions").select(`
          *,
          student:users!assignment_completions_student_id_fkey (
            id,
            display_name,
            email
          )
        `).eq("assignment_id",s).order("completed_at",{ascending:!1});if(n){e.value=n.message;return}d.value=t||[]}catch(t){e.value=t.message}finally{i.value=!1}}}async function f(){if(!(!a||!l.user)){i.value=!0,e.value=null;try{const{data:s}=await a.from("class_members").select("class_id").eq("student_id",l.user.id);if(!s||s.length===0){u.value=[];return}const t=s.map(c=>c.class_id),{data:n,error:r}=await a.from("class_assignments").select(`
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
        `).in("class_id",t).order("assigned_at",{ascending:!1});if(r){e.value=r.message;return}u.value=n||[]}catch(s){e.value=s.message}finally{i.value=!1}}}async function h(s){if(!a||!l.user)return!1;const{data:t}=await a.from("assignment_completions").select("id").eq("assignment_id",s).eq("student_id",l.user.id).single();return!!t}async function y(s,t,n,r){if(!a||!l.user)return e.value="請先登入",!1;i.value=!0,e.value=null;try{const{error:c}=await a.from("assignment_completions").insert({assignment_id:s,student_id:l.user.id,practice_record_id:t,score:n,accuracy:r});return c?(e.value=c.message,!1):!0}catch(c){return e.value=c.message,!1}finally{i.value=!1}}async function p(){if(!a||!l.user||!l.isStudent)return 0;try{if(await f(),u.value.length===0)return 0;const s=u.value.map(r=>r.id),{data:t}=await a.from("assignment_completions").select("assignment_id").eq("student_id",l.user.id).in("assignment_id",s),n=new Set(t?.map(r=>r.assignment_id)||[]);return u.value.filter(r=>!n.has(r.id)).length}catch(s){return console.error("獲取待完成作業數量失敗:",s),0}}function w(){u.value=[],d.value=[],e.value=null}return{assignments:u,completions:d,loading:i,error:e,fetchClassAssignments:m,createAssignment:g,deleteAssignment:v,fetchAssignmentCompletions:_,fetchStudentAssignments:f,checkAssignmentCompletion:h,recordCompletion:y,getPendingCount:p,reset:w}});export{S as u};
