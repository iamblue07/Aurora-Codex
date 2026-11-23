import { DataTypes } from 'sequelize';

/** A chat message: either text (`content`) or an uploaded file (`mediaPath`). */
export default (sequelize) => sequelize.define('ChatMessage', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    chatId: { type: DataTypes.INTEGER, allowNull: false },
    senderId: { type: DataTypes.INTEGER, allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: true },
    /** Path relative to the uploads folder. */
    mediaPath: { type: DataTypes.STRING, allowNull: true },
    isMedia: {
        type: DataTypes.VIRTUAL,
        get() {
            return Boolean(this.getDataValue('mediaPath'));
        },
    },
}, {
    tableName: 'chat_messages',
    timestamps: true,
    updatedAt: false,
});
