import { DataTypes } from 'sequelize';

/** A second-hand book offered for sale in the marketplace. */
export default (sequelize) => sequelize.define('Listing', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    sellerId: { type: DataTypes.INTEGER, allowNull: false },
    bookId: { type: DataTypes.INTEGER, allowNull: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0 } },
    genre: { type: DataTypes.STRING(64), allowNull: false },
    isNegotiable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isAvailable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    /** Path relative to the uploads folder. */
    imagePath: { type: DataTypes.STRING, allowNull: true },
}, {
    tableName: 'listings',
    timestamps: true,
    updatedAt: false,
});
