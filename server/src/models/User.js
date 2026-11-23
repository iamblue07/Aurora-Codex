import { DataTypes } from 'sequelize';

/** An application user. Permission flags can be revoked by administrators. */
export default (sequelize) => {
    const User = sequelize.define('User', {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        email: { type: DataTypes.STRING, allowNull: false },
        username: { type: DataTypes.STRING(64), allowNull: false },
        passwordHash: { type: DataTypes.STRING, allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        avatarPath: { type: DataTypes.STRING, allowNull: true },
        canCreateListings: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        canCreateForums: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        canSendMessages: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        canReport: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        isAdmin: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    }, {
        tableName: 'users',
        timestamps: true,
        updatedAt: false,
        defaultScope: { attributes: { exclude: ['passwordHash'] } },
        scopes: { withPassword: { attributes: { include: ['passwordHash'] } } },
    });

    /** Never serialise the password hash, even when a query explicitly loaded it. */
    User.prototype.toJSON = function toJSON() {
        const { passwordHash: _omitted, ...rest } = this.get({ plain: true });
        return rest;
    };

    return User;
};
