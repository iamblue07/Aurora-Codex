import { DataTypes } from 'sequelize';

/**
 * A discussion thread. Its first message is the opening post. `messageCount` and the
 * `lastMessage*` columns are maintained by forum.service.js so lists can sort by activity.
 * `authorId` becomes NULL if the author's account is deleted.
 */
export default (sequelize) => sequelize.define('Forum', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    categoryId: { type: DataTypes.INTEGER, allowNull: false },
    authorId: { type: DataTypes.INTEGER, allowNull: true },
    title: { type: DataTypes.STRING, allowNull: false },
    /** Optional catalogue book the thread is about. */
    bookId: { type: DataTypes.INTEGER, allowNull: true },
    isOpen: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    isPinned: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    viewCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    messageCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    lastMessageAt: { type: DataTypes.DATE, allowNull: true },
    lastMessageAuthorId: { type: DataTypes.INTEGER, allowNull: true },
}, {
    tableName: 'forums',
    timestamps: true,
    updatedAt: false,
});
