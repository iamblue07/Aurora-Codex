import { DataTypes } from 'sequelize';

/** A book recommended to a user (written by recommendation.service.js). */
export default (sequelize) => sequelize.define('Recommendation', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    bookId: { type: DataTypes.INTEGER, allowNull: false },
    /** Final ranking score (similarity blended with the emotion score). */
    score: { type: DataTypes.FLOAT, allowNull: true },
    source: { type: DataTypes.STRING(16), allowNull: true },
}, {
    tableName: 'recommendations',
    timestamps: true,
    updatedAt: false,
});
