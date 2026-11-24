import { DataTypes } from 'sequelize';

/** A book the user marked as "not interested" in their recommendations. */
export default (sequelize) => sequelize.define('RecommendationDismissal', {
    userId: { type: DataTypes.INTEGER, primaryKey: true },
    bookId: { type: DataTypes.INTEGER, primaryKey: true },
}, {
    tableName: 'recommendation_dismissals',
    timestamps: true,
    updatedAt: false,
});
