import { DataTypes } from 'sequelize';

/**
 * Semantic vector of a book, used by the recommender. `embedding` holds `dimensions` packed
 * little-endian float32 values (see services/ai/vector-math.js). `contentHash` identifies the
 * text that was embedded, so unchanged books are skipped when embeddings are regenerated.
 */
export default (sequelize) => sequelize.define('BookEmbedding', {
    bookId: { type: DataTypes.INTEGER, primaryKey: true },
    model: { type: DataTypes.STRING(128), allowNull: false },
    dimensions: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
    contentHash: { type: DataTypes.CHAR(64), allowNull: false },
    embedding: { type: DataTypes.BLOB('medium'), allowNull: false },
}, {
    tableName: 'book_embeddings',
    timestamps: true,
    createdAt: false,
});
