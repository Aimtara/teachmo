import { nhost } from './nhostClient';

export async function graphqlRequest({ query, variables, headers = {} }) {
  const { data, error } = await nhost.graphql.request(query, variables, headers);
  if (error) {
    console.error('GraphQL error', error);
    throw new Error(error.message || 'GraphQL request failed');
  }
  return data;
}

export async function graphql(query, variables, headers = {}) {
  return graphqlRequest({ query, variables, headers });
}

export function buildMutation(operationName, fields) {
  return `mutation ${operationName}($input: ${operationName}_input!) { ${operationName}(object: $input) { ${fields} } }`;
}

// Compatibility: some pages use graphql.request(...) to access the raw nhost response
// (i.e., { data, error } without throwing). Keep this for now to avoid churn.
graphql.request = function request(query, variables, headers = {}) {
  return nhost.graphql.request(query, variables, headers);
};
