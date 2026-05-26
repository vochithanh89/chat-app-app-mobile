import api from './api';

/**
 * Poll API service — wraps PollsController endpoints (mobile).
 *
 * Poll payload shape returned by backend:
 *   {
 *     id, question, allowMultiple, isClosed, totalVotes, createdAt,
 *     createdBy: { id, name, avatarUrl },
 *     options: [{ id, text, voteCount, votedByMe }]
 *   }
 */

const getPayloadData = (response: any) => response?.data?.data ?? response?.data ?? {};

export const pollAPI = {
  /** Create a new poll inside a group conversation. */
  create: async (conversationId: string, body: { question: string; options: string[]; allowMultiple?: boolean }) => {
    const response = await api.post(`/api/v1/conversations/${conversationId}/polls`, {
      question: body.question,
      options: body.options,
      allow_multiple: body.allowMultiple ?? false,
    });
    return getPayloadData(response); // { poll, message }
  },

  /** Get poll details by its UUID. */
  get: async (pollId: string) => {
    const response = await api.get(`/api/v1/polls/${pollId}`);
    return getPayloadData(response)?.poll ?? null;
  },

  /** Cast votes for a poll. Replaces previous selections. */
  vote: async (pollId: string, optionIds: string[]) => {
    const response = await api.post(`/api/v1/polls/${pollId}/vote`, {
      option_ids: optionIds,
    });
    return getPayloadData(response)?.poll ?? null;
  },

  /** Remove all of the current user's votes on a poll. */
  unvote: async (pollId: string) => {
    const response = await api.delete(`/api/v1/polls/${pollId}/vote`);
    return getPayloadData(response)?.poll ?? null;
  },

  /** Close a poll so no more votes are accepted. */
  close: async (pollId: string) => {
    const response = await api.post(`/api/v1/polls/${pollId}/close`, {});
    return getPayloadData(response)?.poll ?? null;
  },

  /** List voters for each option of a poll. */
  voters: async (pollId: string) => {
    const response = await api.get(`/api/v1/polls/${pollId}/voters`);
    return getPayloadData(response)?.options ?? [];
  },
};
