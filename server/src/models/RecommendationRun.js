import { DataTypes } from 'sequelize';

/** How a user's current recommendations were generated (one row per user, replaced each run). */
export default (sequelize) => sequelize.define('RecommendationRun', {
    userId: { type: DataTypes.INTEGER, primaryKey: true },
    source: { type: DataTypes.STRING(16), allowNull: false },
    query: { type: DataTypes.STRING(500), allowNull: true },
    sentiment: { type: DataTypes.STRING(16), allowNull: true },
    /** Profile runs: 'ratings' (liked books) or 'genres' (favourite genres only). */
    basedOn: { type: DataTypes.STRING(16), allowNull: true },
    /** Liked books that shaped the run. */
    seedCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    /** Query runs: whether the reader's taste was blended in. */
    personalized: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, {
    tableName: 'recommendation_runs',
    timestamps: true,
    updatedAt: false,
});
