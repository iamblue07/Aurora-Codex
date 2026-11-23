import { DataTypes } from 'sequelize';
import { REPORT_TARGET_TYPES } from '../constants/domain.js';

/** A user report about inappropriate content, reviewed by administrators. */
export default (sequelize) => sequelize.define('Report', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    reporterId: { type: DataTypes.INTEGER, allowNull: false },
    targetType: {
        type: DataTypes.STRING(32),
        allowNull: false,
        validate: { isIn: [REPORT_TARGET_TYPES] },
    },
    targetId: { type: DataTypes.INTEGER, allowNull: false },
    reason: { type: DataTypes.TEXT, allowNull: false },
    isOpen: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
    tableName: 'reports',
    timestamps: true,
    updatedAt: false,
});
