import { DataTypes } from 'sequelize';

/** A tunable parameter edited from the admin panel (validated by settings.service.js). */
export default (sequelize) => sequelize.define('AppSetting', {
    key: { type: DataTypes.STRING(64), primaryKey: true },
    value: { type: DataTypes.JSON, allowNull: false },
}, {
    tableName: 'app_settings',
    timestamps: true,
    createdAt: false,
});
