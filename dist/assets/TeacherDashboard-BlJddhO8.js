import{A as b,v as N,r as h,w as f,j as e,N as v,f as w}from"./index-CXW08ga6.js";import{U as u}from"./entities-CLCXHT4z.js";import"./messaging-cshogndc.js";import{G as _}from"./GoogleClassroomConnect-DuR6H9SW.js";import{B as L}from"./badge-Dl3t65au.js";import"./alert-KdgI_V-I.js";import"./book-open-Bot6lLRm.js";import"./circle-alert-CzGZOM4y.js";import"./external-link-Duz6MPfX.js";import"./users-CCMiawQ7.js";function T(){const{isAuthenticated:r}=b(),i=N(),[p,l]=h.useState(null);h.useEffect(()=>{r&&u.me().then(l).catch(console.error)},[r]);const{data:t,isLoading:o,error:n,refetch:y}=f({queryKey:["teacher-dashboard",i],enabled:r&&!!i,queryFn:async()=>w({query:`query TeacherDashboard($eventsLimit: Int, $assignmentsLimit: Int) {
        classrooms(order_by: { name: asc }) {
          id
          name
        }
        events(order_by: { starts_at: asc }, limit: $eventsLimit) {
          id
          title
          starts_at
          classroom {
            name
          }
        }
        assignments(
          order_by: { due_at: asc }, 
          limit: $assignmentsLimit, 
          where: { status: { _eq: "active" } }
        ) {
          id
          title
          due_at
          classroom {
            name
          }
          submissions_aggregate {
            aggregate {
              count
            }
          }
        }
      }`,variables:{eventsLimit:5,assignmentsLimit:5}})}),c=(t==null?void 0:t.classrooms)??[],m=(t==null?void 0:t.events)??[],d=(t==null?void 0:t.assignments)??[],j=()=>{u.me().then(l),y()};return r?e.jsxs("div",{className:"p-6 space-y-6",children:[e.jsxs("header",{children:[e.jsx("h1",{className:"text-3xl font-semibold text-gray-900",children:"Teacher dashboard"}),e.jsx("p",{className:"text-gray-600",children:"Manage classrooms, sync assignments, and stay ahead of upcoming events."})]}),e.jsx("section",{children:e.jsx(_,{user:p,onConnectionUpdate:j})}),o&&e.jsx("p",{className:"text-gray-600",children:"Loading dashboard data…"}),n&&e.jsxs("p",{className:"text-red-600",role:"alert",children:["Unable to load teacher data. ",n.message]}),!o&&!n&&e.jsxs("div",{className:"grid gap-4 md:grid-cols-2 lg:grid-cols-3",children:[e.jsxs("div",{className:"rounded-xl border border-gray-200 bg-white p-5 shadow-sm",children:[e.jsx("h2",{className:"text-lg font-semibold text-gray-900 mb-2",children:"Your Classrooms"}),e.jsxs("ul",{className:"space-y-2 text-sm",children:[c.map(s=>e.jsx("li",{className:"rounded-lg bg-slate-50 p-3 flex items-center justify-between",children:e.jsx("p",{className:"font-medium text-gray-900",children:s.name})},s.id)),c.length===0&&e.jsx("li",{className:"text-sm text-gray-500",children:"No classrooms assigned. Sync to import."})]})]}),e.jsxs("div",{className:"rounded-xl border border-gray-200 bg-white p-5 shadow-sm",children:[e.jsx("h2",{className:"text-lg font-semibold text-gray-900 mb-2",children:"Active Assignments"}),e.jsxs("ul",{className:"space-y-2 text-sm",children:[d.map(s=>{var a,x,g;return e.jsxs("li",{className:"rounded-lg bg-slate-50 p-3",children:[e.jsxs("div",{className:"flex justify-between items-start mb-1",children:[e.jsx("p",{className:"font-medium text-gray-900 line-clamp-1",children:s.title}),e.jsxs(L,{variant:"secondary",className:"text-[10px] px-1.5 py-0",children:[((x=(a=s.submissions_aggregate)==null?void 0:a.aggregate)==null?void 0:x.count)||0," Subs"]})]}),e.jsxs("div",{className:"flex justify-between text-xs text-gray-500",children:[e.jsx("span",{children:(g=s.classroom)==null?void 0:g.name}),e.jsxs("span",{children:["Due ",new Date(s.due_at).toLocaleDateString()]})]})]},s.id)}),d.length===0&&e.jsx("li",{className:"text-sm text-gray-500",children:'No active assignments. Click "Sync Assignments" above to update.'})]})]}),e.jsxs("div",{className:"rounded-xl border border-gray-200 bg-white p-5 shadow-sm",children:[e.jsx("h2",{className:"text-lg font-semibold text-gray-900 mb-2",children:"Upcoming Events"}),e.jsxs("ul",{className:"space-y-2 text-sm",children:[m.map(s=>{var a;return e.jsxs("li",{className:"rounded-lg bg-slate-50 p-3",children:[e.jsx("p",{className:"font-medium text-gray-900",children:s.title}),e.jsxs("p",{className:"text-xs text-gray-600",children:[(a=s.classroom)!=null&&a.name?`${s.classroom.name} · `:"",new Date(s.starts_at).toLocaleString(void 0,{dateStyle:"short",timeStyle:"short"})]})]},s.id)}),m.length===0&&e.jsx("li",{className:"text-sm text-gray-500",children:"No upcoming events found."})]})]})]})]}):e.jsx(v,{to:"/",replace:!0})}export{T as default};
//# sourceMappingURL=TeacherDashboard-BlJddhO8.js.map
