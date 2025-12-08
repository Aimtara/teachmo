// Domain-aware exports so components can depend on the domain layer
// while keeping backward compatibility with direct entity imports.
export * from '../API/entities';
export { learnersApi, useChildrenList } from '../domain/learners';
export { orgsApi } from '../domain/orgs';
export { assignmentsApi } from '../domain/assignments';
export { messagingApi } from '../domain/messaging';
