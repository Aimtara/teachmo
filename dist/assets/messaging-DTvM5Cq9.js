import{m as n,n as a}from"./index-CcbYISPP.js";const i=`
  id
  school_id
  district_id
  requester_user_id
  target_user_id
  status
  reason
  created_at
  decided_at
  decided_by
  expires_at
  metadata
`;async function c(t){const{res:s,error:e}=await a.functions.call("request-messaging-access",t);if(e)throw e;return(s==null?void 0:s.data)??s}async function u(t){const{res:s,error:e}=await a.functions.call("approve-messaging-request",t);if(e)throw e;return(s==null?void 0:s.data)??s}async function d(t={}){const s={};t.status&&(s.status={_eq:t.status});const e=await n(`query MessagingRequests($where: messaging_requests_bool_exp) {
      messaging_requests(where: $where, order_by: { created_at: desc }, limit: 50) { ${i} }
    }`,{where:s});return(e==null?void 0:e.messaging_requests)??[]}export{u as a,d as l,c as r};
//# sourceMappingURL=messaging-DTvM5Cq9.js.map
