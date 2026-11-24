import { DataTypes } from 'sequelize';

/** A user's "like" on a forum post (one per user and post). */
export default (sequelize) => sequelize.define('ForumMessageLike', {
    messageId: { type: DataTypes.INTEGER, primaryKey: true },
    userId: { type: DataTypes.INTEGER, primaryKey: true },
}, {
    tableName: 'forum_message_likes',
    timestamps: true,
    updatedAt: false,
});
