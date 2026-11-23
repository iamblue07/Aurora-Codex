import { PERMISSIONS, REPORT_TARGETS } from '../constants/domain.js';
import { Chat, ChatMessage, Forum, ForumMessage, Listing, Report, User, USER_SUMMARY_ATTRIBUTES } from '../models/index.js';
import HttpError from '../utils/http-error.js';
import { findUserWithPermission } from './user.service.js';

/**
 * For each reportable content type: how to load it and which attribute holds its author.
 * Attribute lists are what administrators get to see while reviewing a report.
 */
const TARGETS = Object.freeze({
    [REPORT_TARGETS.CHAT_MESSAGE]: {
        model: ChatMessage,
        authorKey: 'senderId',
        attributes: ['id', 'chatId', 'senderId', 'content', 'mediaPath', 'createdAt'],
    },
    [REPORT_TARGETS.FORUM_MESSAGE]: {
        model: ForumMessage,
        authorKey: 'authorId',
        attributes: ['id', 'forumId', 'authorId', 'content', 'isRemoved', 'createdAt'],
    },
    [REPORT_TARGETS.FORUM]: {
        model: Forum,
        authorKey: 'authorId',
        attributes: ['id', 'authorId', 'title', 'isOpen', 'createdAt'],
    },
    [REPORT_TARGETS.LISTING]: {
        model: Listing,
        authorKey: 'sellerId',
        attributes: ['id', 'sellerId', 'title', 'description', 'price', 'isAvailable', 'createdAt'],
    },
});

const withReporter = { model: User, as: 'reporter', attributes: [...USER_SUMMARY_ATTRIBUTES] };

const findReportOrThrow = async (reportId, options = {}) => {
    const report = await Report.findByPk(reportId, options);
    if (!report) throw HttpError.notFound('Report not found');
    return report;
};

/**
 * Chat messages are private: only the chat's participants may report them. Answering 404 for
 * outsiders avoids revealing whether a message id exists.
 */
const assertCanSeeTarget = async (userId, targetType, targetId) => {
    if (targetType === REPORT_TARGETS.CHAT_MESSAGE) {
        const message = await ChatMessage.findByPk(targetId, {
            attributes: ['id'],
            include: [{ model: Chat, as: 'chat', attributes: ['sellerId', 'buyerId'] }],
        });
        if (!message || (message.chat.sellerId !== userId && message.chat.buyerId !== userId)) {
            throw HttpError.notFound('Reported content not found');
        }
        return;
    }
    if (!await TARGETS[targetType].model.count({ where: { id: targetId } })) {
        throw HttpError.notFound('Reported content not found');
    }
};

export const createReport = async (userId, { targetType, targetId, reason }) => {
    await findUserWithPermission(userId, PERMISSIONS.report, 'Your permission to report content has been revoked');
    await assertCanSeeTarget(userId, targetType, targetId);
    return Report.create({ reporterId: userId, targetType, targetId, reason });
};

export const listReports = async ({ isOpen, limit, offset }) => {
    const { rows, count } = await Report.findAndCountAll({
        where: isOpen === null ? {} : { isOpen },
        include: [withReporter],
        order: [['createdAt', 'DESC'], ['id', 'DESC']],
        limit,
        offset,
    });
    return { reports: rows, total: count };
};

/**
 * The report plus the reported content and its author. `target` is null when the content has
 * been deleted in the meantime.
 */
export const getReportDetails = async (reportId) => {
    const report = await findReportOrThrow(reportId, { include: [withReporter] });
    const definition = TARGETS[report.targetType];
    const target = definition
        ? await definition.model.findByPk(report.targetId, { attributes: definition.attributes })
        : null;
    const targetAuthor = target
        ? await User.findByPk(target[definition.authorKey], { attributes: [...USER_SUMMARY_ATTRIBUTES] })
        : null;
    return { report, target, targetAuthor };
};

export const setReportOpen = async (reportId, isOpen) => {
    const report = await findReportOrThrow(reportId);
    await report.update({ isOpen });
    return Report.findByPk(report.id, { include: [withReporter] });
};
