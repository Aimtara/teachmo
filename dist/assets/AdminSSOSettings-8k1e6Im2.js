import{b as M,G as w,r as c,j as e,C as z,i as N,k,o as $,B as p,y as o}from"./index-BPP-_OMN.js";import{u}from"./useMutation-CMiQkM4s.js";import{C as q}from"./checkbox-L0Xbs-7k.js";import{I as m}from"./input-DXyqFpUo.js";import{T as E}from"./textarea-Be6YKw6o.js";import{T as B,a as O,b as g,c as _,d as L,e as l}from"./table-C5y0xJGn.js";import"./check-BnYO2CVa.js";const D=[{id:"google",label:"Google Workspace"},{id:"azuread",label:"Azure AD"},{id:"clever",label:"Clever"},{id:"classlink",label:"ClassLink"},{id:"okta",label:"Okta"},{id:"saml",label:"SAML"}];function R(i){try{return i?JSON.parse(i):{}}catch{return{}}}function U(){const{data:i}=M(),s=(i==null?void 0:i.organizationId)??null,r=w({queryKey:["tenant-domains",s],enabled:!!s,queryFn:async()=>{const n=await o(`query TenantDomains($organizationId: uuid!) {
        tenant_domains(where: { organization_id: { _eq: $organizationId } }, order_by: { domain: asc }) {
          id
          domain
          is_primary
          verified_at
        }
      }`,{organizationId:s});return(n==null?void 0:n.tenant_domains)??[]}}),h=w({queryKey:["enterprise-sso-settings",s],enabled:!!s,queryFn:async()=>{const n=await o(`query EnterpriseSsoSettings($organizationId: uuid!) {
        enterprise_sso_settings(where: { organization_id: { _eq: $organizationId } }, order_by: { provider: asc }) {
          id
          provider
          client_id
          client_secret
          issuer
          metadata
          is_enabled
        }
      }`,{organizationId:s});return(n==null?void 0:n.enterprise_sso_settings)??[]}}),[x,y]=c.useState(""),[b,f]=c.useState({});c.useEffect(()=>{const a={};D.forEach(n=>{var C;const t=(C=h.data)==null?void 0:C.find(P=>P.provider===n.id);a[n.id]={id:(t==null?void 0:t.id)??null,provider:n.id,client_id:(t==null?void 0:t.client_id)??"",client_secret:(t==null?void 0:t.client_secret)??"",issuer:(t==null?void 0:t.issuer)??"",metadata:JSON.stringify((t==null?void 0:t.metadata)??{},null,2),is_enabled:!!(t!=null&&t.is_enabled)}}),f(a)},[h.data]);const d=(a,n)=>{f(t=>({...t,[a]:{...t[a],...n}}))},S=u({mutationFn:async()=>{if(!s)throw new Error("Missing organization scope");await o(`mutation InsertDomain($object: tenant_domains_insert_input!) {
        insert_tenant_domains_one(object: $object) { id }
      }`,{object:{organization_id:s,domain:x.trim().toLowerCase(),is_primary:!1}})},onSuccess:()=>{y(""),r.refetch()}}),I=u({mutationFn:async({id:a})=>{await o(`mutation SetPrimary($organizationId: uuid!, $id: uuid!) {
        update_tenant_domains(where: { organization_id: { _eq: $organizationId } }, _set: { is_primary: false }) {
          affected_rows
        }
        update_tenant_domains_by_pk(pk_columns: { id: $id }, _set: { is_primary: true }) { id }
      }`,{organizationId:s,id:a})},onSuccess:()=>r.refetch()}),T=u({mutationFn:async({id:a})=>{await o(`mutation DeleteDomain($id: uuid!) {
        delete_tenant_domains_by_pk(id: $id) { id }
      }`,{id:a})},onSuccess:()=>r.refetch()}),j=u({mutationFn:async({providerId:a})=>{if(!s)throw new Error("Missing organization scope");const n=b[a];await o(`mutation UpsertSso($object: enterprise_sso_settings_insert_input!) {
        insert_enterprise_sso_settings_one(
          object: $object,
          on_conflict: {
            constraint: enterprise_sso_settings_organization_id_provider_key,
            update_columns: [client_id, client_secret, issuer, metadata, is_enabled]
          }
        ) { id }
      }`,{object:{organization_id:s,provider:a,client_id:n.client_id||null,client_secret:n.client_secret||null,issuer:n.issuer||null,metadata:R(n.metadata),is_enabled:!!n.is_enabled}})},onSuccess:()=>h.refetch()}),v=c.useMemo(()=>r.data??[],[r.data]);return e.jsxs("div",{className:"p-6 space-y-6",children:[e.jsxs("div",{children:[e.jsx("h1",{className:"text-2xl font-semibold",children:"SSO Policy"}),e.jsx("p",{className:"text-sm text-muted-foreground",children:"Manage tenant domains and configure enterprise SSO providers for your organization."})]}),e.jsxs(z,{children:[e.jsx(N,{children:e.jsx(k,{children:"Tenant Domains"})}),e.jsxs($,{className:"space-y-4",children:[e.jsxs("div",{className:"flex flex-col gap-3 md:flex-row md:items-center",children:[e.jsx(m,{value:x,onChange:a=>y(a.target.value),placeholder:"district.edu",className:"md:max-w-sm"}),e.jsx(p,{onClick:()=>S.mutate(),disabled:!x.trim()||S.isLoading||!s,children:"Add domain"})]}),e.jsxs(B,{children:[e.jsx(O,{children:e.jsxs(g,{children:[e.jsx(_,{children:"Domain"}),e.jsx(_,{children:"Status"}),e.jsx(_,{children:"Primary"}),e.jsx(_,{})]})}),e.jsx(L,{children:v.length===0?e.jsx(g,{children:e.jsx(l,{colSpan:4,className:"text-sm text-muted-foreground",children:"No tenant domains configured yet."})}):v.map(a=>e.jsxs(g,{children:[e.jsx(l,{className:"font-mono text-xs",children:a.domain}),e.jsx(l,{children:a.verified_at?"Verified":"Pending"}),e.jsx(l,{children:e.jsx(q,{checked:a.is_primary,onCheckedChange:()=>I.mutate({id:a.id}),"aria-label":`Set ${a.domain} primary`})}),e.jsx(l,{className:"text-right",children:e.jsx(p,{variant:"ghost",size:"sm",onClick:()=>T.mutate({id:a.id}),children:"Remove"})})]},a.id))})]})]})]}),e.jsxs(z,{children:[e.jsx(N,{children:e.jsx(k,{children:"SSO Providers"})}),e.jsx($,{className:"space-y-6",children:D.map(a=>{const n=b[a.id]??{};return e.jsxs("div",{className:"rounded-lg border p-4 space-y-4",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("div",{children:[e.jsx("div",{className:"text-sm font-semibold",children:a.label}),e.jsxs("div",{className:"text-xs text-muted-foreground",children:["Provider key: ",a.id]})]}),e.jsx(q,{checked:!!n.is_enabled,onCheckedChange:t=>d(a.id,{is_enabled:t}),"aria-label":`Enable ${a.label}`})]}),e.jsxs("div",{className:"grid gap-3 md:grid-cols-2",children:[e.jsx(m,{value:n.client_id??"",onChange:t=>d(a.id,{client_id:t.target.value}),placeholder:"Client ID"}),e.jsx(m,{value:n.client_secret??"",onChange:t=>d(a.id,{client_secret:t.target.value}),placeholder:"Client Secret",type:"password"}),e.jsx(m,{value:n.issuer??"",onChange:t=>d(a.id,{issuer:t.target.value}),placeholder:"Issuer / Metadata URL"})]}),e.jsx(E,{value:n.metadata??"",onChange:t=>d(a.id,{metadata:t.target.value}),rows:4,placeholder:'{"scopes": ["openid", "profile"]}'}),e.jsx("div",{className:"flex justify-end",children:e.jsx(p,{onClick:()=>j.mutate({providerId:a.id}),disabled:j.isLoading||!s,children:j.isLoading?"Saving…":"Save provider"})})]},a.id)})})]})]})}export{U as default};
//# sourceMappingURL=AdminSSOSettings-8k1e6Im2.js.map
