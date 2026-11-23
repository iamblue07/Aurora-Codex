import { MAX_FAVORITE_GENRES } from '../constants/domain.js';
import { isGenreCode } from '../constants/genres.js';
import { FavoriteGenre, sequelize } from '../models/index.js';
import HttpError from '../utils/http-error.js';

/** The user's favourite genre codes, in the order they picked them. */
export const getFavoriteGenres = async (userId) => {
    const rows = await FavoriteGenre.findAll({
        where: { userId },
        attributes: ['genre'],
        order: [['position', 'ASC']],
    });
    return rows.map((row) => row.genre);
};

/** Replaces the user's favourite genres (0 to MAX_FAVORITE_GENRES distinct genre codes). */
export const setFavoriteGenres = async (userId, genres) => {
    if (!Array.isArray(genres)) throw HttpError.badRequest('genres must be an array');

    const unique = [...new Set(genres)];
    if (unique.length !== genres.length) throw HttpError.badRequest('Genres must be unique');
    if (unique.length > MAX_FAVORITE_GENRES) {
        throw HttpError.badRequest(`At most ${MAX_FAVORITE_GENRES} favorite genres are allowed`);
    }
    const invalid = unique.filter((genre) => !isGenreCode(genre));
    if (invalid.length) throw HttpError.badRequest(`Unknown genres: ${invalid.join(', ')}`);

    await sequelize.transaction(async (transaction) => {
        await FavoriteGenre.destroy({ where: { userId }, transaction });
        await FavoriteGenre.bulkCreate(
            unique.map((genre, index) => ({ userId, genre, position: index + 1 })),
            { transaction },
        );
    });
    return unique;
};
