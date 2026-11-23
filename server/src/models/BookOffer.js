import { DataTypes } from 'sequelize';

/** A price offer for a book from a specific bookstore. */
export default (sequelize) => sequelize.define('BookOffer', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    bookId: { type: DataTypes.INTEGER, allowNull: false },
    store: { type: DataTypes.STRING(64), allowNull: false },
    url: { type: DataTypes.STRING(512), allowNull: false },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
}, {
    tableName: 'book_offers',
    timestamps: false,
});
