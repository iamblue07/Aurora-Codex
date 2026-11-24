import { DataTypes } from 'sequelize';
import { LISTING_CONDITIONS } from '../constants/domain.js';

/** A second-hand book offered for sale in the marketplace. */
export default (sequelize) => sequelize.define('Listing', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    sellerId: { type: DataTypes.INTEGER, allowNull: false },
    bookId: { type: DataTypes.INTEGER, allowNull: true },
    title: { type: DataTypes.STRING, allowNull: false },
    author: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: false },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0 } },
    genre: { type: DataTypes.STRING(64), allowNull: false },
    condition: { type: DataTypes.ENUM(...LISTING_CONDITIONS), allowNull: false, defaultValue: 'good', field: 'book_condition' },
    city: { type: DataTypes.STRING(80), allowNull: true },
    offersPickup: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    offersShipping: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isNegotiable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    /** false once sold or withdrawn (final). */
    isAvailable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    /** Promised to a buyer, still listed; the seller can release it. */
    isReserved: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    viewCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    favoriteCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    /** Cover photo, relative to the uploads folder (the first of `images`). */
    imagePath: { type: DataTypes.STRING, allowNull: true },
}, {
    tableName: 'listings',
    timestamps: true,
});
