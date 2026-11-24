import { DataTypes } from 'sequelize';

/** A book recommended to a user (written by recommendation.service.js). */
export default (sequelize) => sequelize.define('Recommendation', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    bookId: { type: DataTypes.INTEGER, allowNull: false },
    /** Final ranking score, 0–1 within the run (best first). */
    score: { type: DataTypes.FLOAT, allowNull: true },
    source: { type: DataTypes.STRING(16), allowNull: true },
    /** Why it was recommended: 'liked' (see reasonBookId), 'genre' or 'query'. */
    reason: { type: DataTypes.STRING(16), allowNull: true },
    reasonBookId: { type: DataTypes.INTEGER, allowNull: true },
}, {
    tableName: 'recommendations',
    timestamps: true,
    updatedAt: false,
});
