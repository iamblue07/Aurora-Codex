import { REPORT_TARGET_TYPES } from '../constants/domain.js';
import { serializeReport, serializeReportDetails } from '../serializers/index.js';
import * as reportService from '../services/report.service.js';
import { wrapController } from '../utils/async-handler.js';
import { paginated } from '../utils/collections.js';
import { parseBoolean, parseEnum, parseId, parseOptionalEnum, parsePagination, requireString } from '../utils/validation.js';

const REPORT_STATUSES = Object.freeze({ open: true, closed: false, all: null });

const reportIdParam = (req) => parseId(req.params.reportId, 'reportId');

export default wrapController({
    /** POST /api/reports — any user with reporting rights. */
    async create(req, res) {
        const report = await reportService.createReport(req.user.id, {
            targetType: parseEnum(req.body?.targetType, 'targetType', REPORT_TARGET_TYPES),
            targetId: parseId(req.body?.targetId, 'targetId'),
            reason: requireString(req.body?.reason, 'reason', { maxLength: 2000 }),
        });
        res.status(201).json({ id: report.id });
    },

    /** GET /api/reports?status=open|closed|all — administrators only. */
    async list(req, res) {
        const status = parseOptionalEnum(req.query.status, 'status', Object.keys(REPORT_STATUSES), 'open');
        const pagination = parsePagination(req.query.page, req.query.limit);
        const { reports, total } = await reportService.listReports({ ...pagination, isOpen: REPORT_STATUSES[status] });
        res.json(paginated(reports.map(serializeReport), { ...pagination, total }));
    },

    /** GET /api/reports/:reportId — the report, the reported content and its author. */
    async getReport(req, res) {
        res.json(serializeReportDetails(await reportService.getReportDetails(reportIdParam(req))));
    },

    async update(req, res) {
        const isOpen = parseBoolean(req.body?.isOpen, 'isOpen');
        res.json(serializeReport(await reportService.setReportOpen(reportIdParam(req), isOpen)));
    },
});
