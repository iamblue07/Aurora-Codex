import { DataTypes } from 'sequelize';
import { JOB_STATUSES, JOB_TYPES } from '../constants/domain.js';

/** A run of an admin-triggered background job (scraper, embeddings, emotion analysis). */
export default (sequelize) => sequelize.define('BackgroundJob', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    type: { type: DataTypes.STRING(32), allowNull: false, validate: { isIn: [Object.values(JOB_TYPES)] } },
    status: { type: DataTypes.STRING(16), allowNull: false, validate: { isIn: [Object.values(JOB_STATUSES)] } },
    params: { type: DataTypes.JSON, allowNull: false },
    /** Items to process, when known up front (null for open-ended jobs). */
    total: { type: DataTypes.INTEGER, allowNull: true },
    processed: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    failed: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    /** Latest human-readable progress note or error. */
    message: { type: DataTypes.STRING(500), allowNull: true },
    result: { type: DataTypes.JSON, allowNull: true },
    startedBy: { type: DataTypes.INTEGER, allowNull: true },
    startedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    finishedAt: { type: DataTypes.DATE, allowNull: true },
}, {
    tableName: 'background_jobs',
    timestamps: false,
});
