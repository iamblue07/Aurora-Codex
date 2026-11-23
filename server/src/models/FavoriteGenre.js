import { DataTypes } from 'sequelize';

/** One of the (up to five) genres a user picked as favourites; `position` keeps their order. */
export default (sequelize) => sequelize.define('FavoriteGenre', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    genre: { type: DataTypes.STRING(64), allowNull: false },
    position: { type: DataTypes.TINYINT, allowNull: false },
}, {
    tableName: 'favorite_genres',
    timestamps: false,
});
