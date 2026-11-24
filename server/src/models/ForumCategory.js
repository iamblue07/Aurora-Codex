import { DataTypes } from 'sequelize';

/** A section of the forum board (e.g. "Recomandări"). `icon` names a Lucide icon used by the client. */
export default (sequelize) => sequelize.define('ForumCategory', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    slug: { type: DataTypes.STRING(64), allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: false },
    icon: { type: DataTypes.STRING(32), allowNull: false },
    position: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
}, {
    tableName: 'forum_categories',
    timestamps: false,
});
