import { DataTypes } from 'sequelize';

/**
 * A post in a thread. Removed posts (by their author or a moderator) keep their content for
 * auditing but are flagged with `isRemoved` and never exposed through the API.
 */
export default (sequelize) => sequelize.define('ForumMessage', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    forumId: { type: DataTypes.INTEGER, allowNull: false },
    authorId: { type: DataTypes.INTEGER, allowNull: true },
    /** The post this one answers (shown as a quote). */
    replyToId: { type: DataTypes.INTEGER, allowNull: true },
    content: { type: DataTypes.TEXT, allowNull: false },
    isRemoved: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    editedAt: { type: DataTypes.DATE, allowNull: true },
}, {
    tableName: 'forum_messages',
    timestamps: true,
    updatedAt: false,
});
