import { DataTypes } from 'sequelize';

/** A listing a user saved to look at later (one per user and listing). */
export default (sequelize) => sequelize.define('ListingFavorite', {
    listingId: { type: DataTypes.INTEGER, primaryKey: true },
    userId: { type: DataTypes.INTEGER, primaryKey: true },
}, {
    tableName: 'listing_favorites',
    timestamps: true,
    updatedAt: false,
});
