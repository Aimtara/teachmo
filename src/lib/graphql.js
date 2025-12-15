import { nhost } from './nhostClient';

export async function graphqlRequest({ query, variables, headers = {} }) {
  const { data, error } = await nhost.graphql.request(query, variables, headers);
  if (error) {
    console.error('GraphQL error', error);
    throw new Error(error.message || 'GraphQL request failed');
  }
  return data;
}

export function buildMutation(operationName, fields) {
  return `mutation ${operationName}($input: ${operationName}_input!) { ${operationName}(object: $input) { ${fields} } }`;
}
