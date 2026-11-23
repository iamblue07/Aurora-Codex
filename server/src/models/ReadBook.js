import { DataTypes } from 'sequelize';
import { RATING } from '../constants/domain.js';

/** A book the user has read, with the user's rating. At most one row per (user, book). */
export default (sequelize) => sequelize.define('ReadBook', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    bookId: { type: DataTypes.INTEGER, allowNull: false },
    rating: {
        type: DataTypes.TINYINT,
        allowNull: false,
        validate: { min: RATING.MIN, max: RATING.MAX },
    },
}, {
    tableName: 'read_books',
    timestamps: false,
});
