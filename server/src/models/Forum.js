import { DataTypes } from 'sequelize';

/** A community discussion thread. `authorId` becomes NULL if the author's account is deleted. */
export default (sequelize) => sequelize.define('Forum', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    authorId: { type: DataTypes.INTEGER, allowNull: true },
    title: { type: DataTypes.STRING, allowNull: false },
    isOpen: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
    tableName: 'forums',
    timestamps: true,
    updatedAt: false,
});
