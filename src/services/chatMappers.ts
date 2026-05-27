import { API_BASE_URL } from "./api";

const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop&crop=face";

export const formatImageUrl = (url?: string | null) => {
  if (!url) return FALLBACK_AVATAR;

  // Replace machine-local backend URLs with the active API host for web/mobile.
  if (/^https?:\/\//i.test(url)) {
    try {
      const parsedUrl = new URL(url);
      const isLocalBackendHost =
        /^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)$/.test(
          parsedUrl.hostname,
        );

      if (isLocalBackendHost && parsedUrl.port) {
        return `${API_BASE_URL}${parsedUrl.pathname}${parsedUrl.search}`;
      }
    } catch (e) {
      return url;
    }
  }

  // Prepend API base URL for relative paths
  if (url.startsWith("/")) {
    return `${API_BASE_URL}${url}`;
  }

  if (!url.startsWith("http")) {
    return `${API_BASE_URL}/${url}`;
  }

  return url;
};

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
    return "Vừa xong";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} phút trước`;
  }

  if (diffHours < 24) {
    return `${diffHours} giờ trước`;
  }

  if (diffDays < 7) {
    return `${diffDays} ngày trước`;
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const normalizeUser = (user: any = {}) => {
  const id = user?.uuid || user?.id || null;
  const avatarUrl = formatImageUrl(user?.avatarUrl || user?.avatar_url || user?.avatar);
  const isOnline = Boolean(
    user?.isOnline ?? user?.is_online ?? user?.online ?? false,
  );
  
  let name = "Người dùng";
  if (user?.name) name = user.name;
  else if (user?.full_name) name = user.full_name;
  else if (user?.fullName) name = user.fullName;
  else if (user?.displayName) name = user.displayName;
  else if (user?.display_name) name = user.display_name;
  else if (user?.firstName && user?.lastName) name = `${user.firstName} ${user.lastName}`;
  else if (user?.first_name && user?.last_name) name = `${user.first_name} ${user.last_name}`;
  else if (user?.username) name = user.username;
  else if (user?.email) name = user.email.split('@')[0];

  return {
    ...user,
    id,
    uuid: user?.uuid || id,
    name,
    avatarUrl,
    avatar: avatarUrl,
    isOnline,
    online: isOnline,
    lastSeenAt: user?.lastSeenAt || user?.last_seen_at || null,
  };
};

export const normalizeMessage = (message: any = {}, currentUserId?: string | null) => {
  const sender = normalizeUser(message?.sender);
  const messageTime =
    message?.createdAt ||
    message?.created_at ||
    message?.updatedAt ||
    message?.updated_at ||
    null;
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
        : mimeType.startsWith("audio/")
          ? "audio"
          : explicitType === "image" || explicitType === "video" || explicitType === "audio" || explicitType === "file"
            ? explicitType
            : "file";

    return {
      ...attachment,
      id: attachment?.uuid || attachment?.id,
      url: formatImageUrl(attachment?.url || attachment?.fileUrl || attachment?.file_url || null),
      name: attachment?.fileName || attachment?.file_name || attachment?.name || "Tệp đính kèm",
      fileName: attachment?.fileName || attachment?.file_name || attachment?.name || "Tệp đính kèm",
      mimeType,
      fileSize: attachment?.fileSize || attachment?.file_size || attachment?.size || 0,
      type: normalizedType,
      durationMs: attachment?.durationMs || attachment?.duration_ms || 0,
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
        ? "Tin nhắn đã được thu hồi"
        : (message?.content === "No messages yet" ? "Chưa có tin nhắn" : (message?.content || "")),
    content: message?.content === "No messages yet" ? "Chưa có tin nhắn" : (message?.content || ""),
    user: isMine ? "me" : "other",
    sender,
    time: (() => {
      const ts = message?.createdAt || message?.created_at || message?.updatedAt || message?.updated_at;
      if (!ts) return formatTimeLabel(ts);
      const d = new Date(ts);
      if (isNaN(d.getTime())) return formatTimeLabel(ts);
      const hour = String(d.getHours()).padStart(2, '0');
      const minute = String(d.getMinutes()).padStart(2, '0');
      return `${hour}:${minute}`;
    })(),
    rawTime: message?.createdAt || message?.created_at || message?.updatedAt || message?.updated_at || null,
    status: isMine ? "sent" : "read",
    isRecalled: Boolean(message?.isRecalled ?? message?.is_recalled),
    isPinned: Boolean(message?.isPinned ?? message?.is_pinned),
    replyToMessageId: message?.replyToMessageId || message?.reply_to_message_id || null,
    forwardedFromId: message?.forwardedFromId || message?.forwarded_from_id || null,
    attachments,
    imageAttachments: attachments.filter((attachment: any) => attachment.type === "image"),
    videoAttachments: attachments.filter((attachment: any) => attachment.type === "video"),
    fileAttachments: attachments.filter((attachment: any) => attachment.type === "file"),
    audioAttachments: attachments.filter((attachment: any) => attachment.type === "audio"),
    reactions: Object.values(groupedReactions),
    poll: message?.poll ?? null,
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
  const latestMessageTime =
    conversation?.lastMessageAt ||
    conversation?.last_message_at ||
    latestMessage?.createdAt ||
    latestMessage?.created_at ||
    latestMessage?.updatedAt ||
    latestMessage?.updated_at ||
    conversation?.updatedAt ||
    conversation?.updated_at ||
    conversation?.createdAt ||
    conversation?.created_at ||
    null;
  const isSelf = type === "direct" && !otherMember;
  const otherMemberRecord = Array.isArray(conversation?.members)
    ? conversation.members.find((member: any) => member?.user?.id && member.user.id !== currentUserId)
    : null;
  const otherNickname = otherMemberRecord?.nickname || null;

  const avatarUrl = isSelf
    ? ""
    : formatImageUrl(
        conversation?.avatarUrl ||
        conversation?.avatar_url ||
        otherMember?.avatarUrl ||
        FALLBACK_AVATAR
      );
  const name =
    (type === "direct" && otherNickname)
      ? otherNickname
      : (conversation?.name ||
         otherMember?.name ||
         (isSelf ? "Tài liệu của tôi" : (type === "group" ? "Nhóm chưa đặt tên" : "Người dùng ẩn danh")));

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
    lastMsg: (() => {
      if (!latestMessage) return "Chưa có tin nhắn";
      if (latestMessage.is_recalled || latestMessage.isRecalled) {
        return "Tin nhắn đã được thu hồi";
      }
      if (latestMessage.content && latestMessage.content.startsWith('__system__:')) {
        const parts = latestMessage.content.split(':');
        const action = parts[1];
        const actorMember = members?.find((m: any) =>
          m.user?.id === latestMessage.sender?.id ||
          m.user?.uuid === latestMessage.sender?.uuid ||
          m.userId === latestMessage.sender?.id ||
          m.userId === latestMessage.sender?.uuid ||
          m.user?.id === latestMessage.senderId ||
          m.user?.uuid === latestMessage.senderId ||
          m.userId === latestMessage.senderId
        );
        const actorName = actorMember?.nickname || latestMessage.sender?.name || 'Thành viên';
        if (action === 'joined') return `${actorName} đã tham gia nhóm`;
        if (action === 'left') return `${actorName} đã rời nhóm`;
        if (action === 'added') return `${actorName} đã thêm ${parts[3] || 'thành viên'}`;
        if (action === 'removed') return `${actorName} đã xóa ${parts[3] || 'thành viên'}`;
        if (action === 'group-name-changed') return `${actorName} đã đổi tên nhóm thành ${parts.slice(2).join(':')}`;
        if (action === 'group-avatar-changed') return `${actorName} đã đổi ảnh đại diện nhóm`;
        if (action === 'group-bg-changed') return `${actorName} đã đổi ảnh nền cuộc trò chuyện`;
        if (action === 'custom') return parts.slice(2).join(':');
        if (action === 'nickname-changed') {
          const targetUuid = parts[2];
          const newNickname = parts.slice(3).join(':');
          const targetMember = members?.find((m: any) =>
            m.user?.uuid === targetUuid ||
            m.user?.id === targetUuid ||
            m.userId === targetUuid
          );
          const targetName = targetMember?.user?.name || 'thành viên';
          return newNickname
            ? `${actorName} đã đặt biệt danh cho ${targetName} là ${newNickname}`
            : `${actorName} đã gỡ biệt danh của ${targetName}`;
        }
      }
      if (latestMessage.content && latestMessage.content !== "No messages yet") {
        return latestMessage.content;
      }
      const rawAtts = Array.isArray(latestMessage.attachments) ? latestMessage.attachments : [];
      if (rawAtts.length > 0) {
        const firstAtt = rawAtts[0];
        const mime = firstAtt?.mimeType || firstAtt?.mime_type || "";
        const type = firstAtt?.type || "";
        if (mime.startsWith("image/") || type === "image") {
          return "[Hình ảnh]";
        }
        if (mime.startsWith("video/") || type === "video") {
          return "[Video]";
        }
        if (mime.startsWith("audio/") || type === "audio") {
          return "[Tin nhắn thoại]";
        }
        return "[Tệp đính kèm]";
      }
      return "Chưa có tin nhắn";
    })(),
    time: formatTimeLabel(latestMessageTime),
    rawTime: latestMessageTime,
    unread: conversation?.unreadCount ?? conversation?.unread_count ?? conversation?.unread ?? 0,
    online: Boolean(otherMember?.isOnline),
    isOnline: Boolean(otherMember?.isOnline),
    commentsRestricted: Boolean(
      conversation?.commentsRestricted ?? conversation?.comments_restricted ?? false,
    ),
    isPinned: Boolean(conversation?.isPinned ?? conversation?.is_pinned),
    isMuted: Boolean(conversation?.isMuted ?? conversation?.is_muted),
    pinOrder: conversation?.pinOrder ?? conversation?.pin_order ?? null,
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

export const getMappedBgColor = (bg: string | null | undefined, isDarkMode: boolean, colors?: any) => {
  if (!bg) return isDarkMode ? (colors?.background || '#121212') : '#F4F5F7';
  const cleanBg = bg.trim().toLowerCase();
  if (cleanBg.startsWith('#') || cleanBg.startsWith('rgba') || cleanBg.startsWith('rgb')) {
    return bg;
  }
  if (cleanBg.startsWith('linear-gradient')) {
    if (cleanBg.includes('#f59e0b') || cleanBg.includes('#ef4444')) return '#FEF3C7'; // Hoàng hôn -> Trà đào
    if (cleanBg.includes('#3b82f6') || cleanBg.includes('#06b6d4')) return '#E0F2FE'; // Biển xanh -> Xanh ngọc
    if (cleanBg.includes('#10b981') || cleanBg.includes('#6366f1')) return '#DCFCE7'; // Cực quang -> Bạc hà
    if (cleanBg.includes('#8b5cf6') || cleanBg.includes('#ec4899')) return '#F3E8FF'; // Tím khói -> Thạch thảo
    if (cleanBg.includes('#a7f3d0') || cleanBg.includes('#34d399')) return '#DCFCE7'; // Bạc hà -> Bạc hà
    if (cleanBg.includes('#0f172a') || cleanBg.includes('#1e293b') || cleanBg.includes('#334155')) return '#1F2937'; // Tinh vân -> Xám tối
    if (cleanBg.includes('#fbcfe8') || cleanBg.includes('#f472b6')) return '#FCE7F3'; // Hồng đào -> Anh đào
  }
  return 'transparent';
};
