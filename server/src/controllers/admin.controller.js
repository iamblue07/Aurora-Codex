import { JOB_TYPES, PERMISSIONS } from '../constants/domain.js';
import { serializePermissions } from '../serializers/index.js';
import { clearFeaturesCache, getAiStatus, testAiConnection } from '../services/ai/ai-status.service.js';
import { AiProviderError } from '../services/ai/deepinfra.client.js';
import * as jobs from '../services/jobs/index.js';
import * as moderationService from '../services/moderation.service.js';
import * as settingsService from '../services/settings.service.js';
import { wrapController } from '../utils/async-handler.js';
import HttpError from '../utils/http-error.js';
import { parseBoolean, parseEnum, parseId, parseInteger, parseOptionalEnum } from '../utils/validation.js';

/** Administrator-only endpoints (the router applies `authenticate` + `requireAdmin`). */
export default wrapController({
    /** PUT /api/admin/users/:userId/permissions/:permission  body: { granted: boolean } */
    async setPermission(req, res) {
        const permission = parseEnum(req.params.permission, 'permission', Object.keys(PERMISSIONS));
        const user = await moderationService.setUserPermission(
            parseId(req.params.userId, 'userId'),
            PERMISSIONS[permission],
            parseBoolean(req.body?.granted, 'granted'),
        );
        res.json({ userId: user.id, permissions: serializePermissions(user) });
    },

    async removeForumMessage(req, res) {
        await moderationService.removeForumMessage(parseId(req.params.messageId, 'messageId'));
        res.status(204).end();
    },

    async deleteListing(req, res) {
        await moderationService.deleteListing(parseId(req.params.listingId, 'listingId'));
        res.status(204).end();
    },

    async deleteForum(req, res) {
        await moderationService.deleteForum(parseId(req.params.forumId, 'forumId'));
        res.status(204).end();
    },

    async getAiStatus(_req, res) {
        res.json(await getAiStatus());
    },

    /** Embeds a sample sentence: checks the API key, the model name and the vector size. */
    async testAiConnection(_req, res) {
        try {
            res.json(await testAiConnection());
        } catch (error) {
            // Admins see the provider's explanation (wrong key, unknown model…); the key is redacted.
            if (error instanceof AiProviderError) throw HttpError.badGateway(error.message);
            throw error;
        }
    },

    async getSettings(_req, res) {
        res.json({ values: await settingsService.getSettings(), definitions: settingsService.getSettingDefinitions() });
    },

    /** PATCH /api/admin/settings  body: { "<key>": value | null (reset to default), ... } */
    async updateSettings(req, res) {
        const values = await settingsService.updateSettings(req.body);
        clearFeaturesCache();
        res.json({ values, definitions: settingsService.getSettingDefinitions() });
    },

    async listJobs(req, res) {
        const type = parseOptionalEnum(req.query.type, 'type', Object.values(JOB_TYPES));
        const limit = req.query.limit === undefined ? 20 : parseInteger(req.query.limit, 'limit', { min: 1, max: 100 });
        res.json(await jobs.listJobs({ type, limit }));
    },

    /** POST /api/admin/jobs  body: { type, params } */
    async startJob(req, res) {
        const type = parseEnum(req.body?.type, 'type', Object.values(JOB_TYPES));
        res.status(202).json(await jobs.startJob(type, req.body?.params, req.user.id));
    },

    async getJob(req, res) {
        res.json(await jobs.getJob(parseId(req.params.jobId, 'jobId')));
    },

    async cancelJob(req, res) {
        res.status(202).json(await jobs.cancelJob(parseId(req.params.jobId, 'jobId')));
    },
});
