import { DataTypes } from 'sequelize';
import { EMOTIONS, emotionAttribute } from '../constants/domain.js';

// `angerScore` -> column `anger_score`, ... (written by the emotion analysis job).
const emotionScores = Object.fromEntries(
    EMOTIONS.map((emotion) => [emotionAttribute(emotion), { type: DataTypes.FLOAT, allowNull: true }]),
);

/** A book from the catalogue (scraped from Romanian bookstores). */
export default (sequelize) => sequelize.define('Book', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    isbn: { type: DataTypes.STRING(64), allowNull: true },
    title: { type: DataTypes.STRING, allowNull: false },
    /** NULL when the store does not list an author (the UI shows its own placeholder). */
    author: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    englishDescription: { type: DataTypes.TEXT, allowNull: true },
    genre: { type: DataTypes.STRING(64), allowNull: true },
    /** Either an absolute http(s) URL (scraped covers) or a path relative to the uploads folder. */
    coverImage: { type: DataTypes.STRING(512), allowNull: true },
    ...emotionScores,
}, {
    tableName: 'books',
    timestamps: false,
});
