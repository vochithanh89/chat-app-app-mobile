const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop&crop=face";

export const formatTimeLabel = (value?: string | null) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  if (diffDays < 7) {
    return `${diffDays}d`;
  }

  return date.toLocaleDateString();
};

export const normalizeUser = (user: any = {}) => {
  const id = user?.uuid || user?.id || null;
  const avatarUrl = user?.avatarUrl || user?.avatar_url || user?.avatar || FALLBACK_AVATAR;
  const isOnline = Boolean(
    user?.isOnline ?? user?.is_online ?? user?.online ?? false,
  );

  return {
    ...user,
    id,
    uuid: user?.uuid || id,
    avatarUrl,
    avatar: avatarUrl,
    isOnline,
    online: isOnline,
    lastSeenAt: user?.lastSeenAt || user?.last_seen_at || null,
  };
};

export const normalizeMessage = (message: any = {}, currentUserId?: string | null) => {
  const sender = normalizeUser(message?.sender);
  const currentUserKey = currentUserId ? String(currentUserId) : null;
  const senderKeys = [
    sender?.id,
    sender?.uuid,
    message?.senderId,
    message?.sender_id,
  ]
    .filter(Boolean)
    .map((value) => String(value));
  const isMine =
    Boolean(currentUserKey) && senderKeys.some((value) => value === currentUserKey);
  const rawAttachments = Array.isArray(message?.attachments) ? message.attachments : [];
  const attachments = rawAttachments.map((attachment: any) => {
    const mimeType = attachment?.mimeType || attachment?.mime_type || "";
    const explicitType = attachment?.type || "";
    const normalizedType = mimeType.startsWith("image/")
      ? "image"
      : mimeType.startsWith("video/")
        ? "video"
        : explicitType === "image" || explicitType === "video" || explicitType === "file"
          ? explicitType
          : "file";

    return {
      ...attachment,
      id: attachment?.uuid || attachment?.id,
      url: attachment?.url || attachment?.fileUrl || attachment?.file_url || null,
      name: attachment?.fileName || attachment?.file_name || attachment?.name || "Attachment",
      fileName: attachment?.fileName || attachment?.file_name || attachment?.name || "Attachment",
      mimeType,
      fileSize: attachment?.fileSize || attachment?.file_size || attachment?.size || 0,
      type: normalizedType,
    };
  });
  const groupedReactions = Array.isArray(message?.reactions)
    ? message.reactions.reduce((acc: Record<string, any>, reaction: any) => {
        if (!reaction?.emoji) {
          return acc;
        }

        if (!acc[reaction.emoji]) {
          acc[reaction.emoji] = {
            emoji: reaction.emoji,
            users: [],
            userIds: [],
            count: 0,
            reactedByMe: false,
          };
        }

        const normalizedUser = normalizeUser(reaction?.user);
        const reactionUserId = reaction?.userId || reaction?.user_id || normalizedUser?.id;
        const reactionUserName = normalizedUser?.name || reaction?.user?.name || "User";

        acc[reaction.emoji].count += 1;
        if (reactionUserName) {
          acc[reaction.emoji].users.push(reactionUserName);
        }
        if (reactionUserId) {
          acc[reaction.emoji].userIds.push(reactionUserId);
          if (currentUserId && reactionUserId === currentUserId) {
            acc[reaction.emoji].reactedByMe = true;
          }
        }

        return acc;
      }, {})
    : {};

  return {
    ...message,
    id: message?.uuid || message?.id,
    uuid: message?.uuid || message?.id,
    conversationId: message?.conversationId || message?.conversation_id || null,
    text:
      message?.is_recalled
        ? "[Message recalled]"
        : message?.content || "",
    content: message?.content || "",
    user: isMine ? "me" : "other",
    sender,
    time: formatTimeLabel(message?.created_at || message?.updated_at),
    rawTime: message?.created_at || message?.updated_at || null,
    status: isMine ? "sent" : "read",
    isRecalled: Boolean(message?.isRecalled ?? message?.is_recalled),
    replyToMessageId: message?.replyToMessageId || message?.reply_to_message_id || null,
    forwardedFromId: message?.forwardedFromId || message?.forwarded_from_id || null,
    attachments,
    imageAttachments: attachments.filter((attachment: any) => attachment.type === "image"),
    videoAttachments: attachments.filter((attachment: any) => attachment.type === "video"),
    fileAttachments: attachments.filter((attachment: any) => attachment.type === "file"),
    reactions: Object.values(groupedReactions),
  };
};

export const normalizeConversation = (
  conversation: any = {},
  currentUserId?: string | null,
) => {
  const members = Array.isArray(conversation?.members)
    ? conversation.members.map((member: any) => ({
        ...member,
        user: normalizeUser(member?.user),
      }))
    : [];
  const messages = Array.isArray(conversation?.messages)
    ? conversation.messages
    : [];
  const conversationId = conversation?.uuid || conversation?.id || null;
  const type = conversation?.type || "direct";
  const otherMember =
    members.find((member: any) => member?.user?.id && member.user.id !== currentUserId)?.user ||
    null;
  const latestMessage = messages[0] || conversation?.last_message || null;
  const avatarUrl =
    conversation?.avatarUrl ||
    conversation?.avatar_url ||
    otherMember?.avatarUrl ||
    FALLBACK_AVATAR;
  const name =
    conversation?.name ||
    otherMember?.name ||
    (type === "group" ? "Unnamed group" : "Unknown user");

  return {
    ...conversation,
    id: conversationId,
    uuid: conversationId,
    conversationId,
    type,
    isGroup: type === "group",
    name,
    avatarUrl,
    avatar: avatarUrl,
    members,
    otherUser: otherMember,
    latestMessage,
    lastMsg:
      latestMessage?.content ||
      conversation?.last_message?.content ||
      "No messages yet",
    time: formatTimeLabel(
      conversation?.last_message_at ||
        latestMessage?.created_at ||
        conversation?.updated_at ||
        conversation?.created_at,
    ),
    rawTime:
      conversation?.last_message_at ||
      latestMessage?.created_at ||
      conversation?.updated_at ||
      conversation?.created_at ||
      null,
    unread: conversation?.unread_count || conversation?.unread || 0,
    online: Boolean(otherMember?.isOnline),
    isOnline: Boolean(otherMember?.isOnline),
  };
};

export const pickUserFromConversation = (
  conversation: any,
  currentUserId?: string | null,
) => {
  const normalized = normalizeConversation(conversation, currentUserId);

  return {
    ...normalized.otherUser,
    id: normalized.otherUser?.id || normalized.id,
    uuid: normalized.otherUser?.uuid || normalized.id,
    name: normalized.name,
    avatar: normalized.avatar,
    avatarUrl: normalized.avatarUrl,
    online: normalized.online,
    isOnline: normalized.isOnline,
    conversationId: normalized.id,
    type: normalized.type,
    isGroup: normalized.isGroup,
    members: normalized.members,
  };
};
