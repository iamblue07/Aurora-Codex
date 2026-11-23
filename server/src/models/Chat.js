import { DataTypes } from 'sequelize';

/** A private conversation between a buyer and the seller of a listing. One per (listing, buyer). */
export default (sequelize) => sequelize.define('Chat', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    listingId: { type: DataTypes.INTEGER, allowNull: false },
    sellerId: { type: DataTypes.INTEGER, allowNull: false },
    buyerId: { type: DataTypes.INTEGER, allowNull: false },
    isOpen: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
    tableName: 'chats',
    timestamps: true,
    updatedAt: false,
});
