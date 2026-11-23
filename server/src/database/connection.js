import { Sequelize } from 'sequelize';
import config from '../config/env.js';
import logger from '../utils/logger.js';

const sequelize = new Sequelize(config.db.name, config.db.user, config.db.password, {
    host: config.db.host,
    port: config.db.port,
    dialect: 'mysql',
    dialectOptions: {
        // Return DECIMAL columns (prices) as JS numbers instead of strings.
        decimalNumbers: true,
    },
    logging: config.db.logging ? (sql) => logger.debug(sql) : false,
    pool: { max: 10, min: 0, idle: 10_000, acquire: 30_000 },
    define: {
        // camelCase attributes in JS, snake_case columns in MySQL (e.g. sellerId -> seller_id).
        underscored: true,
        timestamps: false,
        charset: 'utf8mb4',
        collate: 'utf8mb4_0900_ai_ci',
    },
});

export const connectDatabase = async () => {
    await sequelize.authenticate();
    logger.info(`Connected to MySQL database "${config.db.name}" at ${config.db.host}:${config.db.port}`);
};

export const closeDatabase = () => sequelize.close();

export default sequelize;
