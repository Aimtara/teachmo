import{b as v,r as _,w as D,j as e,P as T,C as p,i as y,k as f,o as g,B as c,f as r}from"./index-CXW08ga6.js";import{u as l}from"./useMutation-mXVxaFfD.js";import{I as q}from"./input-DQ0nv64R.js";import{T as z,a as C,b as u,c as d,d as N,e as s}from"./table-8A_DMF1g.js";function M(){const{data:m}=v(),n=(m==null?void 0:m.organizationId)??null,[o,x]=_.useState(""),i=D({queryKey:["tenant-domains",n],enabled:!!n,queryFn:async()=>{const t=await r({query:`query TenantDomains($organizationId: uuid!) {
        tenant_domains(where: { organization_id: { _eq: $organizationId } }, order_by: { domain: asc }) {
          id
          domain
          is_primary
          verified_at
        }
      }`,variables:{organizationId:n}});return(t==null?void 0:t.tenant_domains)??[]}}),h=l({mutationFn:async()=>{if(!n)throw new Error("Missing organization scope");await r({query:`mutation AddTenantDomain($object: tenant_domains_insert_input!) {
        insert_tenant_domains_one(object: $object) { id }
      }`,variables:{object:{organization_id:n,domain:o.trim().toLowerCase(),is_primary:!1}}})},onSuccess:()=>{x(""),i.refetch()}}),b=l({mutationFn:async({id:a})=>{await r({query:`mutation SetPrimaryDomain($organizationId: uuid!, $id: uuid!) {
        update_tenant_domains(where: { organization_id: { _eq: $organizationId } }, _set: { is_primary: false }) {
          affected_rows
        }
        update_tenant_domains_by_pk(pk_columns: { id: $id }, _set: { is_primary: true }) { id }
      }`,variables:{organizationId:n,id:a}})},onSuccess:()=>i.refetch()}),w=l({mutationFn:async({id:a})=>{await r({query:`mutation RemoveTenantDomain($id: uuid!) {
        delete_tenant_domains_by_pk(id: $id) { id }
      }`,variables:{id:a}})},onSuccess:()=>i.refetch()}),j=_.useMemo(()=>i.data??[],[i.data]);return e.jsx(T,{allowedRoles:["system_admin","district_admin","school_admin","admin"],children:e.jsxs("div",{className:"p-6 space-y-6",children:[e.jsxs("header",{className:"space-y-2",children:[e.jsx("h1",{className:"text-2xl font-semibold",children:"Tenant Domains"}),e.jsx("p",{className:"text-sm text-muted-foreground",children:"Manage allowed email domains for single sign-on."})]}),e.jsxs(p,{children:[e.jsx(y,{children:e.jsx(f,{children:"Add Domain"})}),e.jsx(g,{children:e.jsxs("form",{onSubmit:a=>{a.preventDefault(),o.trim()&&h.mutate()},className:"flex flex-col sm:flex-row gap-3",children:[e.jsx(q,{type:"text",placeholder:"example.com",value:o,onChange:a=>x(a.target.value)}),e.jsx(c,{type:"submit",variant:"default",disabled:h.isLoading||!o.trim(),children:"Add"})]})})]}),e.jsxs(p,{children:[e.jsx(y,{children:e.jsx(f,{children:"Domains"})}),e.jsx(g,{children:e.jsxs(z,{children:[e.jsx(C,{children:e.jsxs(u,{children:[e.jsx(d,{children:"Domain"}),e.jsx(d,{children:"Status"}),e.jsx(d,{children:"Primary"}),e.jsx(d,{children:"Actions"})]})}),e.jsx(N,{children:j.length===0?e.jsx(u,{children:e.jsx(s,{colSpan:4,className:"text-sm text-muted-foreground",children:"No domains configured yet."})}):j.map(a=>e.jsxs(u,{children:[e.jsx(s,{className:"font-mono text-xs",children:a.domain}),e.jsx(s,{children:a.verified_at?"Verified":"Pending"}),e.jsx(s,{children:a.is_primary?"Yes":"No"}),e.jsxs(s,{className:"flex gap-2",children:[e.jsx(c,{variant:"secondary",size:"sm",onClick:()=>b.mutate({id:a.id}),disabled:a.is_primary,children:"Set primary"}),e.jsx(c,{variant:"ghost",size:"sm",onClick:()=>w.mutate({id:a.id}),children:"Remove"})]})]},a.id))})]})})]})]})})}export{M as default};
//# sourceMappingURL=AdminTenantDomains-BPTEEAcO.js.map
