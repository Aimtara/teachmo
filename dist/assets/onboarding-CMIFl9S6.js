import{f as a}from"./index-CXW08ga6.js";async function m({organizationName:e,schoolName:o}){const i=await a({query:`mutation UpsertOrganization($name: String!) {
    organization: insert_organizations_one(
      object: { name: $name }
      on_conflict: { constraint: organizations_name_key, update_columns: [name] }
    ) {
      id
      name
    }
  }`,variables:{name:e}}),n=(i==null?void 0:i.organization)??null;if(!(n!=null&&n.id))return{organization:null,school:null};const t=await a({query:`mutation UpsertSchool($orgId: uuid!, $name: String!) {
    school: insert_schools_one(
      object: { organization_id: $orgId, name: $name }
      on_conflict: { constraint: schools_organization_id_name_key, update_columns: [name, timezone] }
    ) {
      id
      name
      organization_id
    }
  }`,variables:{orgId:n.id,name:o}});return{organization:n,school:(t==null?void 0:t.school)??null}}async function g({userId:e,fullName:o,organizationId:u,schoolId:i,allowTenantWrite:n=!1}){var _,d;if(!e)throw new Error("Missing userId");if(!o)throw new Error("Missing fullName");const l=`mutation InsertMyProfile($input: profiles_insert_input!) {
    insert_profiles_one(object: $input) {
      id
      user_id
      full_name
      app_role
      organization_id
      school_id
    }
  }`;try{const r=await a({query:l,variables:{input:{full_name:o}}});if(r!=null&&r.insert_profiles_one)return r.insert_profiles_one}catch{}const s=await a({query:n?`mutation UpdateMyProfileTenant($userId: uuid!, $fullName: String!, $orgId: uuid, $schoolId: uuid) {
        update_profiles(
          where: { user_id: { _eq: $userId } }
          _set: { full_name: $fullName, organization_id: $orgId, school_id: $schoolId }
        ) {
          returning {
            id
            user_id
            full_name
            app_role
            organization_id
            school_id
          }
        }
      }`:`mutation UpdateMyProfileBasics($userId: uuid!, $fullName: String!) {
        update_profiles(
          where: { user_id: { _eq: $userId } }
          _set: { full_name: $fullName }
        ) {
          returning {
            id
            user_id
            full_name
            app_role
            organization_id
            school_id
          }
        }
      }`,variables:n?{userId:e,fullName:o,orgId:u??null,schoolId:i??null}:{userId:e,fullName:o}});return((d=(_=s==null?void 0:s.update_profiles)==null?void 0:_.returning)==null?void 0:d[0])??null}export{m as b,g as c};
//# sourceMappingURL=onboarding-CMIFl9S6.js.map
