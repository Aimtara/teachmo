import { graphqlRequest } from '@/lib/graphql';

export async function createThread({ subject, participantIds }) {
  const query = `mutation CreateThread($thread: message_threads_insert_input!, $participants: [thread_participants_insert_input!]!) {
    insert_message_threads_one(object: $thread) {
      id
      subject
    }
    insert_thread_participants(objects: $participants) {
      affected_rows
    }
  }`;

  const variables = {
    thread: { subject },
    participants: participantIds.map((profileId) => ({ thread_id: undefined, profile_id: profileId }))
  };

  const data = await graphqlRequest({ query, variables });
  return data;
}

export async function sendMessage({ threadId, senderId, content }) {
  const query = `mutation SendMessage($input: messages_insert_input!) {
    insert_messages_one(object: $input) {
      id
      content
      sent_at
    }
  }`;

  return graphqlRequest({ query, variables: { input: { thread_id: threadId, sender_id: senderId, content } } });
}

export async function listThreads(profileId) {
  const query = `query Threads($profileId: uuid!) {
    thread_participants(where: { profile_id: { _eq: $profileId } }) {
      thread {
        id
        subject
        updated_at
        messages(order_by: { sent_at: desc }, limit: 1) {
          content
          sent_at
        }
      }
    }
  }`;

  const data = await graphqlRequest({ query, variables: { profileId } });
  return data?.thread_participants?.map((item) => item.thread) || [];
}
