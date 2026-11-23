import { Op } from 'sequelize';
import { PERMISSIONS } from '../constants/domain.js';
import { Chat, ChatMessage, Listing, User, USER_SUMMARY_ATTRIBUTES, sequelize } from '../models/index.js';
import HttpError from '../utils/http-error.js';
import { findListingOrThrow } from './listing.service.js';
import { findUserOrThrow, findUserWithPermission } from './user.service.js';

const NO_MESSAGE_RIGHTS = 'Your permission to send messages has been revoked';

const chatIncludes = [
    { model: Listing, as: 'listing', attributes: ['id', 'title', 'imagePath'] },
    { model: User, as: 'seller', attributes: [...USER_SUMMARY_ATTRIBUTES] },
    { model: User, as: 'buyer', attributes: [...USER_SUMMARY_ATTRIBUTES] },
];

const isParticipant = (chat, userId) => chat.sellerId === userId || chat.buyerId === userId;

/** Loads a chat and makes sure the user is its buyer or seller (or, if allowed, an admin). */
const findAccessibleChat = async (userId, chatId, { allowAdmin = false, include } = {}) => {
    const chat = await Chat.findByPk(chatId, { include });
    if (!chat) throw HttpError.notFound('Chat not found');
    if (isParticipant(chat, userId)) return chat;

    if (allowAdmin) {
        const user = await findUserOrThrow(userId, { attributes: ['isAdmin'] });
        if (user.isAdmin) return chat;
    }
    throw HttpError.forbidden('You are not a participant in this chat');
};

export const getChatsForUser = (userId) => Chat.findAll({
    where: { [Op.or]: [{ buyerId: userId }, { sellerId: userId }] },
    include: chatIncludes,
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
});

export const getChat = (userId, chatId) => findAccessibleChat(userId, chatId, { include: chatIncludes });

export const getMessages = async (userId, chatId) => {
    await findAccessibleChat(userId, chatId, { allowAdmin: true });
    return ChatMessage.findAll({ where: { chatId }, order: [['createdAt', 'ASC'], ['id', 'ASC']] });
};

/** Stored path of a media message, visible to participants and administrators (moderation). */
export const getMessageMediaPath = async (userId, chatId, messageId) => {
    await findAccessibleChat(userId, chatId, { allowAdmin: true });
    const message = await ChatMessage.findOne({ where: { id: messageId, chatId }, attributes: ['mediaPath'] });
    if (!message?.mediaPath) throw HttpError.notFound('Message not found or has no attachment');
    return message.mediaPath;
};

/** Posts a message (text or media) after checking participation, chat status and user rights. */
export const postMessage = async (userId, chatId, { content = null, mediaPath = null }) => {
    const [chat] = await Promise.all([
        findAccessibleChat(userId, chatId),
        findUserWithPermission(userId, PERMISSIONS.sendMessages, NO_MESSAGE_RIGHTS),
    ]);
    if (!chat.isOpen) throw HttpError.forbidden('Chat is closed');
    return ChatMessage.create({ chatId, senderId: userId, content, mediaPath });
};

/** The buyer's conversation about a listing, if any. */
export const findChatForListing = (userId, listingId) =>
    Chat.findOne({ where: { listingId, buyerId: userId }, include: chatIncludes });

/** Opens a conversation with the seller of a listing, starting with the buyer's first message. */
export const startChat = async (userId, listingId, firstMessage) => {
    const [listing] = await Promise.all([
        findListingOrThrow(listingId),
        findUserWithPermission(userId, PERMISSIONS.sendMessages, NO_MESSAGE_RIGHTS),
    ]);
    if (listing.sellerId === userId) throw HttpError.badRequest('You cannot start a chat about your own listing');
    if (!listing.isAvailable) throw HttpError.badRequest('Listing is no longer available');
    if (await Chat.count({ where: { listingId, buyerId: userId } })) {
        throw HttpError.conflict('Chat already exists');
    }

    const chat = await sequelize.transaction(async (transaction) => {
        const created = await Chat.create(
            { listingId, sellerId: listing.sellerId, buyerId: userId },
            { transaction },
        );
        await ChatMessage.create({ chatId: created.id, senderId: userId, content: firstMessage }, { transaction });
        return created;
    });
    return getChat(userId, chat.id);
};

/** Only the buyer may close or re-open a conversation. */
export const setChatOpen = async (userId, chatId, isOpen) => {
    const chat = await findAccessibleChat(userId, chatId);
    if (chat.buyerId !== userId) throw HttpError.forbidden('Only the buyer can close or reopen the chat');
    await chat.update({ isOpen });
    return getChat(userId, chatId);
};
