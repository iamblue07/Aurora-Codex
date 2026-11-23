import sequelize from '../database/connection.js';
import defineAppSetting from './AppSetting.js';
import defineBackgroundJob from './BackgroundJob.js';
import defineBook from './Book.js';
import defineBookEmbedding from './BookEmbedding.js';
import defineBookOffer from './BookOffer.js';
import defineChat from './Chat.js';
import defineChatMessage from './ChatMessage.js';
import defineFavoriteGenre from './FavoriteGenre.js';
import defineForum from './Forum.js';
import defineForumMessage from './ForumMessage.js';
import defineListing from './Listing.js';
import defineReadBook from './ReadBook.js';
import defineRecommendation from './Recommendation.js';
import defineReport from './Report.js';
import defineUser from './User.js';

const User = defineUser(sequelize);
const FavoriteGenre = defineFavoriteGenre(sequelize);
const Book = defineBook(sequelize);
const BookOffer = defineBookOffer(sequelize);
const ReadBook = defineReadBook(sequelize);
const Recommendation = defineRecommendation(sequelize);
const Listing = defineListing(sequelize);
const Chat = defineChat(sequelize);
const ChatMessage = defineChatMessage(sequelize);
const Forum = defineForum(sequelize);
const ForumMessage = defineForumMessage(sequelize);
const Report = defineReport(sequelize);
const BookEmbedding = defineBookEmbedding(sequelize);
const AppSetting = defineAppSetting(sequelize);
const BackgroundJob = defineBackgroundJob(sequelize);

// The schema itself (FKs, ON DELETE rules) is owned by the migrations in src/database/migrations.
// Associations here only describe the relations for querying.

// --- Users ---
User.hasMany(FavoriteGenre, { foreignKey: 'userId', as: 'favoriteGenres' });
FavoriteGenre.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Report, { foreignKey: 'reporterId', as: 'reports' });
Report.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter' });

// --- Catalogue ---
Book.hasMany(BookOffer, { foreignKey: 'bookId', as: 'offers' });
BookOffer.belongsTo(Book, { foreignKey: 'bookId', as: 'book' });

User.hasMany(ReadBook, { foreignKey: 'userId', as: 'readBooks' });
ReadBook.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Book.hasMany(ReadBook, { foreignKey: 'bookId', as: 'readers' });
ReadBook.belongsTo(Book, { foreignKey: 'bookId', as: 'book' });

User.hasMany(Recommendation, { foreignKey: 'userId', as: 'recommendations' });
Recommendation.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Book.hasMany(Recommendation, { foreignKey: 'bookId', as: 'recommendations' });
Recommendation.belongsTo(Book, { foreignKey: 'bookId', as: 'book' });

Book.hasOne(BookEmbedding, { foreignKey: 'bookId', as: 'embedding' });
BookEmbedding.belongsTo(Book, { foreignKey: 'bookId', as: 'book' });

// --- Admin ---
BackgroundJob.belongsTo(User, { foreignKey: 'startedBy', as: 'starter' });

// --- Marketplace & chats ---
User.hasMany(Listing, { foreignKey: 'sellerId', as: 'listings' });
Listing.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });
Book.hasMany(Listing, { foreignKey: 'bookId', as: 'listings' });
Listing.belongsTo(Book, { foreignKey: 'bookId', as: 'book' });

Listing.hasMany(Chat, { foreignKey: 'listingId', as: 'chats' });
Chat.belongsTo(Listing, { foreignKey: 'listingId', as: 'listing' });
Chat.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });
Chat.belongsTo(User, { foreignKey: 'buyerId', as: 'buyer' });

Chat.hasMany(ChatMessage, { foreignKey: 'chatId', as: 'messages' });
ChatMessage.belongsTo(Chat, { foreignKey: 'chatId', as: 'chat' });
ChatMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

// --- Forums ---
User.hasMany(Forum, { foreignKey: 'authorId', as: 'forums' });
Forum.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

Forum.hasMany(ForumMessage, { foreignKey: 'forumId', as: 'messages' });
ForumMessage.belongsTo(Forum, { foreignKey: 'forumId', as: 'forum' });
ForumMessage.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

/**
 * Columns needed to show a user next to their content (name + avatar). Spread it
 * (`[...USER_SUMMARY_ATTRIBUTES]`) because Sequelize may modify the array it is given.
 */
export const USER_SUMMARY_ATTRIBUTES = ['id', 'username', 'avatarPath'];

export {
    sequelize,
    AppSetting,
    BackgroundJob,
    Book,
    BookEmbedding,
    BookOffer,
    Chat,
    ChatMessage,
    FavoriteGenre,
    Forum,
    ForumMessage,
    Listing,
    ReadBook,
    Recommendation,
    Report,
    User,
};
