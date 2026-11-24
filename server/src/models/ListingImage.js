import { DataTypes } from 'sequelize';

/** One photo of a listing; the lowest `position` is the cover (mirrored in `listings.image_path`). */
export default (sequelize) => sequelize.define('ListingImage', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    listingId: { type: DataTypes.INTEGER, allowNull: false },
    /** Path relative to the uploads folder. */
    path: { type: DataTypes.STRING, allowNull: false },
    position: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
}, {
    tableName: 'listing_images',
    timestamps: false,
});
