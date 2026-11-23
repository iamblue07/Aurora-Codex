/**
 * Account maintenance from the command line (uses the database configured in .env).
 *
 *   npm run user -- list
 *   npm run user -- reset-password <email|username> [--out <file>]
 *   npm run user -- make-admin <email|username>
 *   npm run user -- revoke-admin <email|username>
 *
 * reset-password generates a strong random password. It is printed to this terminal, or, with
 * --out, written to a file instead (use a *.local.txt name: those are git-ignored).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import { Op } from 'sequelize';
import { closeDatabase, connectDatabase } from '../src/database/connection.js';
import { User } from '../src/models/index.js';
import { hashPassword } from '../src/services/user.service.js';

const [command, identifier, ...rest] = process.argv.slice(2);
const outIndex = rest.indexOf('--out');
const outFile = outIndex >= 0 ? rest[outIndex + 1] : null;

const fail = (message) => {
    console.error(message);
    process.exitCode = 1;
};

const findUser = async () => {
    if (!identifier) throw new Error('Give the account email or username.');
    const user = await User.findOne({
        where: { [Op.or]: [{ email: identifier.toLowerCase() }, { username: identifier }] },
    });
    if (!user) throw new Error(`No account with email or username "${identifier}".`);
    return user;
};

/** 16 characters from an unambiguous 57-letter alphabet: ~93 bits of entropy. */
const generatePassword = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    return Array.from(crypto.randomBytes(16), (byte) => alphabet[byte % alphabet.length]).join('');
};

const commands = {
    async list() {
        const users = await User.findAll({ attributes: ['id', 'username', 'email', 'isAdmin'], order: [['id', 'ASC']] });
        console.table(users.map((user) => user.toJSON()));
    },

    async 'reset-password'() {
        const user = await findUser();
        const password = generatePassword();
        user.passwordHash = await hashPassword(password);
        await user.save();
        const credentials = `Email: ${user.email}\nUsername: ${user.username}\nPassword: ${password}\nAdmin: ${user.isAdmin ? 'yes' : 'no'}\n`;
        if (outFile) {
            fs.writeFileSync(outFile, credentials, { mode: 0o600 });
            console.log(`New password for ${user.username} written to ${outFile}`);
        } else {
            console.log(credentials);
        }
    },

    async 'make-admin'() {
        const user = await findUser();
        await user.update({ isAdmin: true });
        console.log(`${user.username} is now an administrator.`);
    },

    async 'revoke-admin'() {
        const user = await findUser();
        await user.update({ isAdmin: false });
        console.log(`${user.username} is no longer an administrator.`);
    },
};

if (!commands[command]) {
    fail('Usage: npm run user -- list | reset-password <email|username> [--out <file>] | make-admin <user> | revoke-admin <user>');
} else {
    try {
        await connectDatabase();
        await commands[command]();
    } catch (error) {
        fail(error.message);
    } finally {
        await closeDatabase();
    }
}
