import { ForumMessage } from '../models/index.js';
import HttpError from '../utils/http-error.js';
import { findForumOrThrow, removeForum } from './forum.service.js';
import { findListingOrThrow, removeListing } from './listing.service.js';
import { findUserOrThrow } from './user.service.js';

/** Administrator actions. Authorisation (admin role) is enforced by the routes. */

export const setUserPermission = async (userId, permission, isGranted) => {
    const user = await findUserOrThrow(userId);
    if (user.isAdmin && !isGranted) throw HttpError.badRequest('Administrator permissions cannot be revoked');
    await user.update({ [permission]: isGranted });
    return user;
};

/** Hides a forum message from everyone (the content is kept for auditing). */
export const removeForumMessage = async (messageId) => {
    const message = await ForumMessage.findByPk(messageId);
    if (!message) throw HttpError.notFound('Message not found');
    if (!message.isRemoved) await message.update({ isRemoved: true });
};

export const deleteListing = async (listingId) => removeListing(await findListingOrThrow(listingId));

export const deleteForum = async (forumId) => removeForum(await findForumOrThrow(forumId));
