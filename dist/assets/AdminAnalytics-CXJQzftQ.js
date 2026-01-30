import{b as H,r as x,G as _,j as e,B as j,C as v,i as f,k as N,o as g,n as X,e as Y,y as F}from"./index-BPP-_OMN.js";import{I as U}from"./input-DXyqFpUo.js";import{S as B,a as M,b as O,c as z,d as b}from"./select-45VgWSkf.js";function V(s){return s?s.slice(0,10):null}function Q(s,n,w="text/plain"){const r=new Blob([n],{type:w}),p=URL.createObjectURL(r),h=document.createElement("a");h.href=p,h.download=s,h.click(),URL.revokeObjectURL(p)}function i(s){const n=String(s??"");return/[\n\r,\"]/g.test(n)?`"${n.replaceAll('"','""')}"`:n}function ae(){var E,A,D,q,L,T,k,R;const{data:s}=H(),[n,w]=x.useState(()=>{const t=new Date;return t.setDate(t.getDate()-14),t.toISOString().slice(0,10)}),[r,p]=x.useState(()=>new Date().toISOString().slice(0,10)),[h,K]=x.useState("all"),[y,P]=x.useState("all"),[d,S]=x.useState(null),I=_({queryKey:["analytics-ai-token"],queryFn:async()=>{const t=await X.auth.getAccessToken();return{"Content-Type":"application/json",...t?{Authorization:`Bearer ${t}`}:{}}}}),u=_({queryKey:["analytics-ai-usage-summary"],enabled:!!I.data,queryFn:async()=>{const t=await fetch(`${Y}/admin/ai/usage-summary`,{headers:I.data});if(!t.ok)throw new Error("Failed to load AI usage summary");return t.json()}}),C=x.useMemo(()=>{const t={day:{_gte:n,_lte:r}};return s!=null&&s.districtId&&(t.district_id={_eq:s.districtId}),s!=null&&s.schoolId&&(t.school_id={_eq:s.schoolId}),h!=="all"&&(t.event_name={_eq:h}),t},[n,r,s==null?void 0:s.districtId,s==null?void 0:s.schoolId,h]),c=_({queryKey:["analytics-rollups",C],enabled:!!(s!=null&&s.districtId),queryFn:async()=>{const t=await F(`query Rollups($where: analytics_event_rollups_daily_bool_exp!) {
          analytics_event_rollups_daily(
            where: $where,
            order_by: [{ day: desc }, { event_count: desc }],
            limit: 500
          ) {
            day
            event_name
            district_id
            school_id
            event_count
          }
        }`,{where:C});return(t==null?void 0:t.analytics_event_rollups_daily)??[]}}),$=x.useMemo(()=>{if(!d)return null;const t={event_ts:{_gte:`${n}T00:00:00.000Z`,_lte:`${r}T23:59:59.999Z`},event_name:{_eq:d}};return s!=null&&s.districtId&&(t.district_id={_eq:s.districtId}),s!=null&&s.schoolId&&(t.school_id={_eq:s.schoolId}),y!=="all"&&(t.metadata={_contains:{actor_role:y}}),t},[d,n,r,s==null?void 0:s.districtId,s==null?void 0:s.schoolId,y]),m=_({queryKey:["analytics-drill",$],enabled:!!$,queryFn:async()=>{const t=await F(`query Drill($where: analytics_events_bool_exp!) {
          analytics_events(
            where: $where,
            order_by: { event_ts: desc },
            limit: 200
          ) {
            id
            event_ts
            event_name
            actor_user_id
            entity_type
            entity_id
            metadata
          }
        }`,{where:$});return(t==null?void 0:t.analytics_events)??[]}}),J=x.useMemo(()=>{const t=new Set;for(const o of c.data??[])t.add(o.event_name);return Array.from(t).sort()},[c.data]),W=()=>{const t=c.data??[],a=[["day","event_name","district_id","school_id","event_count"].join(",")];for(const l of t)a.push([i(l.day),i(l.event_name),i(l.district_id??""),i(l.school_id??""),i(l.event_count??0)].join(","));Q(`teachmo_analytics_rollups_${n}_${r}.csv`,a.join(`
`),"text/csv")},Z=()=>{const t=m.data??[],a=[["event_ts","event_name","actor_user_id","entity_type","entity_id","metadata"].join(",")];for(const l of t)a.push([i(l.event_ts),i(l.event_name),i(l.actor_user_id??""),i(l.entity_type??""),i(l.entity_id??""),i(JSON.stringify(l.metadata??{}))].join(","));Q(`teachmo_analytics_events_${d}_${n}_${r}.csv`,a.join(`
`),"text/csv")},G=()=>{const t=`
      <html>
        <head>
          <title>Teachmo Analytics Export</title>
          <style>
            body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; padding: 24px; }
            h1 { font-size: 18px; margin: 0 0 8px; }
            h2 { font-size: 14px; margin: 18px 0 8px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 6px 8px; font-size: 12px; }
            th { text-align: left; background: #f6f6f6; }
            .meta { color: #555; font-size: 12px; margin-bottom: 8px; }
          </style>
        </head>
        <body>
          <h1>Teachmo Analytics Export</h1>
          <div class="meta">Range: ${n} → ${r}</div>
          <h2>Rollups (daily)</h2>
          <table>
            <thead>
              <tr><th>Day</th><th>Event</th><th>District</th><th>School</th><th>Count</th></tr>
            </thead>
            <tbody>
              ${(c.data??[]).map(a=>`<tr><td>${a.day}</td><td>${a.event_name}</td><td>${a.district_id??""}</td><td>${a.school_id??""}</td><td>${a.event_count??0}</td></tr>`).join("")}
            </tbody>
          </table>
          ${d?`
            <h2>Drilldown: ${d}</h2>
            <table>
              <thead>
                <tr><th>Time</th><th>User</th><th>Entity</th><th>Metadata</th></tr>
              </thead>
              <tbody>
                ${(m.data??[]).map(a=>`<tr><td>${new Date(a.event_ts).toLocaleString()}</td><td>${a.actor_user_id??""}</td><td>${(a.entity_type??"")+(a.entity_id?":"+a.entity_id:"")}</td><td><pre style="margin:0; white-space: pre-wrap;">${JSON.stringify(a.metadata??{},null,2)}</pre></td></tr>`).join("")}
              </tbody>
            </table>
          `:""}
        </body>
      </html>
    `,o=window.open("","_blank");o&&(o.document.open(),o.document.write(t),o.document.close(),o.focus(),o.print())};return e.jsxs("div",{className:"p-6 space-y-6",children:[e.jsxs("div",{className:"flex items-start justify-between gap-4 flex-wrap",children:[e.jsxs("div",{children:[e.jsx("h1",{className:"text-2xl font-semibold",children:"Analytics"}),e.jsx("p",{className:"text-sm text-muted-foreground",children:"Tenant-scoped rollups and event drilldowns (event_ts + metadata). Export to CSV or PDF."})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx(j,{variant:"secondary",onClick:G,disabled:c.isLoading,children:"Export PDF"}),e.jsx(j,{onClick:W,disabled:c.isLoading,children:"Export Rollups CSV"})]})]}),e.jsxs(v,{children:[e.jsx(f,{children:e.jsx(N,{children:"Filters"})}),e.jsxs(g,{className:"grid grid-cols-1 md:grid-cols-4 gap-3",children:[e.jsxs("div",{children:[e.jsx("div",{className:"text-xs text-muted-foreground mb-1",children:"From"}),e.jsx(U,{type:"date",value:n,onChange:t=>w(V(t.target.value))})]}),e.jsxs("div",{children:[e.jsx("div",{className:"text-xs text-muted-foreground mb-1",children:"To"}),e.jsx(U,{type:"date",value:r,onChange:t=>p(V(t.target.value))})]}),e.jsxs("div",{children:[e.jsx("div",{className:"text-xs text-muted-foreground mb-1",children:"Event"}),e.jsxs(B,{value:h,onValueChange:K,children:[e.jsx(M,{children:e.jsx(O,{placeholder:"All events"})}),e.jsxs(z,{children:[e.jsx(b,{value:"all",children:"All events"}),J.map(t=>e.jsx(b,{value:t,children:t},t))]})]})]}),e.jsxs("div",{children:[e.jsx("div",{className:"text-xs text-muted-foreground mb-1",children:"Actor role (drilldown)"}),e.jsxs(B,{value:y,onValueChange:P,children:[e.jsx(M,{children:e.jsx(O,{placeholder:"All roles"})}),e.jsxs(z,{children:[e.jsx(b,{value:"all",children:"All roles"}),["parent","teacher","school_admin","district_admin","system_admin"].map(t=>e.jsx(b,{value:t,children:t},t))]})]})]})]})]}),e.jsxs(v,{children:[e.jsxs(f,{className:"flex flex-row items-center justify-between",children:[e.jsx(N,{children:"Daily rollups"}),e.jsx("div",{className:"text-xs text-muted-foreground",children:s!=null&&s.districtId?`District: ${s.districtId}${s.schoolId?` • School: ${s.schoolId}`:""}`:"Loading tenant scope…"})]}),e.jsx(g,{children:c.isLoading?e.jsx("div",{className:"text-sm text-muted-foreground",children:"Loading rollups…"}):(E=c.data)!=null&&E.length?e.jsx("div",{className:"overflow-auto",children:e.jsxs("table",{className:"min-w-full text-sm",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"text-left border-b",children:[e.jsx("th",{className:"p-2",children:"Day"}),e.jsx("th",{className:"p-2",children:"Event"}),e.jsx("th",{className:"p-2",children:"School"}),e.jsx("th",{className:"p-2",children:"Count"}),e.jsx("th",{className:"p-2"})]})}),e.jsx("tbody",{children:c.data.map(t=>e.jsxs("tr",{className:"border-b hover:bg-muted/30",children:[e.jsx("td",{className:"p-2 whitespace-nowrap",children:t.day}),e.jsx("td",{className:"p-2",children:t.event_name}),e.jsx("td",{className:"p-2 font-mono text-xs",children:t.school_id??"—"}),e.jsx("td",{className:"p-2 font-semibold",children:t.event_count}),e.jsx("td",{className:"p-2",children:e.jsx(j,{size:"sm",variant:"secondary",onClick:()=>S(t.event_name),children:"Drill down"})})]},`${t.day}-${t.event_name}-${t.school_id??"district"}`))})]})}):e.jsx("div",{className:"text-sm text-muted-foreground",children:"No events in this range yet."})})]}),e.jsxs(v,{children:[e.jsx(f,{children:e.jsx(N,{children:"AI Usage Summary"})}),e.jsx(g,{className:"space-y-3 text-sm",children:u.isLoading?e.jsx("div",{className:"text-muted-foreground",children:"Loading AI usage…"}):(D=(A=u.data)==null?void 0:A.byModel)!=null&&D.length?e.jsxs("div",{className:"space-y-2",children:[e.jsxs("div",{className:"flex justify-between text-muted-foreground",children:[e.jsx("span",{children:"Total calls"}),e.jsx("span",{children:((L=(q=u.data)==null?void 0:q.totals)==null?void 0:L.calls)??0})]}),e.jsxs("div",{className:"flex justify-between text-muted-foreground",children:[e.jsx("span",{children:"Estimated spend"}),e.jsxs("span",{children:["$",Number(((k=(T=u.data)==null?void 0:T.totals)==null?void 0:k.cost_usd)||0).toFixed(2)]})]}),e.jsx("div",{className:"overflow-auto",children:e.jsxs("table",{className:"min-w-full text-sm",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"text-left border-b",children:[e.jsx("th",{className:"p-2",children:"Model"}),e.jsx("th",{className:"p-2",children:"Calls"}),e.jsx("th",{className:"p-2",children:"Tokens"}),e.jsx("th",{className:"p-2",children:"Cost"})]})}),e.jsx("tbody",{children:u.data.byModel.map(t=>e.jsxs("tr",{className:"border-b",children:[e.jsx("td",{className:"p-2 font-mono text-xs",children:t.model||"—"}),e.jsx("td",{className:"p-2",children:t.calls}),e.jsx("td",{className:"p-2",children:t.tokens??0}),e.jsxs("td",{className:"p-2",children:["$",Number(t.cost_usd||0).toFixed(2)]})]},t.model))})]})})]}):e.jsx("div",{className:"text-muted-foreground",children:"No AI usage recorded yet."})})]}),e.jsxs(v,{children:[e.jsxs(f,{className:"flex flex-row items-center justify-between",children:[e.jsxs(N,{children:["Drilldown ",d?`• ${d}`:""]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx(j,{variant:"secondary",onClick:()=>S(null),disabled:!d,children:"Clear"}),e.jsx(j,{onClick:Z,disabled:!d||m.isLoading,children:"Export Events CSV"})]})]}),e.jsx(g,{children:d?m.isLoading?e.jsx("div",{className:"text-sm text-muted-foreground",children:"Loading events…"}):(R=m.data)!=null&&R.length?e.jsx("div",{className:"overflow-auto",children:e.jsxs("table",{className:"min-w-full text-sm",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"text-left border-b",children:[e.jsx("th",{className:"p-2",children:"Time"}),e.jsx("th",{className:"p-2",children:"User"}),e.jsx("th",{className:"p-2",children:"Entity"}),e.jsx("th",{className:"p-2",children:"Metadata"})]})}),e.jsx("tbody",{children:m.data.map(t=>e.jsxs("tr",{className:"border-b",children:[e.jsx("td",{className:"p-2 whitespace-nowrap",children:new Date(t.event_ts).toLocaleString()}),e.jsx("td",{className:"p-2 font-mono text-xs",children:t.actor_user_id??"—"}),e.jsx("td",{className:"p-2 font-mono text-xs",children:(t.entity_type??"")+(t.entity_id?`:${t.entity_id}`:"")}),e.jsx("td",{className:"p-2",children:e.jsx("pre",{className:"text-xs whitespace-pre-wrap max-w-[720px]",children:JSON.stringify(t.metadata??{},null,2)})})]},t.id))})]})}):e.jsx("div",{className:"text-sm text-muted-foreground",children:"No matching events."}):e.jsx("div",{className:"text-sm text-muted-foreground",children:"Select an event in rollups to drill down."})})]})]})}export{ae as default};
//# sourceMappingURL=AdminAnalytics-CXJQzftQ.js.map
