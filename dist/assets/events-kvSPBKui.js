import{f as d}from"./index-CXW08ga6.js";async function a(o={}){const t=o&&typeof o=="object"&&!Array.isArray(o)?o:{schoolId:o},i=t.schoolId??t.school_id??null,l=t.limit??50,c=t.offset??0,s=!!i,n=`query Events(${s?"$schoolId: uuid!, ":""}$limit: Int, $offset: Int) {
    events(
      ${s?"where: { school_id: { _eq: $schoolId } },":""}
      order_by: { starts_at: asc }
      limit: $limit
      offset: $offset
    ) {
      id
      title
      description
      starts_at
      ends_at
      classroom_id
      school_id
    }
  }`,r={limit:l,offset:c,...s?{schoolId:i}:{}},e=await d({query:n,variables:r});return(e==null?void 0:e.events)||[]}export{a as l};
//# sourceMappingURL=events-kvSPBKui.js.map
