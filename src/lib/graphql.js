import { nhost } from './nhostClient';
import { createLogger } from '@/utils/logger';

const logger = createLogger('graphql');

export function gql(strings, ...values) {
  if (typeof strings === 'string') {
    return strings;
  }
  return strings.reduce((acc, str, idx) => acc + str + (values[idx] ?? ''), '');
}

export async function graphqlRequest({ query, variables, headers = {} }) {
  const { data, error } = await nhost.graphql.request(query, variables, headers);
  if (error) {
    const message = error.message || 'We could not complete your request. Please try again.';
    logger.error('GraphQL request failed', error);
    throw new Error(message, { cause: error });
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

gql.request = function request(strings, ...values) {
  const query = gql(strings, ...values);
  return graphql.request(query);
};
