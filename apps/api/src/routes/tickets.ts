import { Router, Request, Response, NextFunction } from 'express';
import {
  UserRole,
  IssueTicketSchema,
  CallNextTicketSchema,
  DeskActionSchema,
} from '@gatimaan/shared';
import { requireAuth, requireRole, syncUserMiddleware } from '../middleware/auth.js';
import { queueService } from '../services/queueService.js';
import { BadRequestError } from '../errors/appErrors.js';

export const ticketsRouter = Router();

// Guard for admin desk operations
const adminDeskGuard = [requireAuth, requireRole(UserRole.ADMIN), syncUserMiddleware];

// POST /api/tickets/issue - Issue a new queue ticket (requires authenticated citizen/user)
ticketsRouter.post(
  '/api/tickets/issue',
  requireAuth,
  syncUserMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = IssueTicketSchema.parse(req.body);
      const userId = req.user?.id || null;
      const ticket = await queueService.issueTicket(validatedData, userId);
      res.status(201).json(ticket);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/tickets/:id - Retrieve ticket details
ticketsRouter.get(
  '/api/tickets/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const ticket = await queueService.getTicketById(id);
      res.status(200).json(ticket);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/tickets/:id/position - Retrieve dynamic queue position
ticketsRouter.get(
  '/api/tickets/:id/position',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const position = await queueService.getQueuePosition(id);
      res.status(200).json(position);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/tickets/call-next - Call next waiting ticket to counter
ticketsRouter.post(
  '/api/tickets/call-next',
  ...adminDeskGuard,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const operatorUserId = req.user?.id;
      if (!operatorUserId) {
        throw new BadRequestError('Authenticated operator context required');
      }

      const validatedData = CallNextTicketSchema.parse(req.body);
      const ticket = await queueService.callNextTicket(
        operatorUserId,
        validatedData.counterId,
        validatedData.serviceId
      );

      res.status(200).json({
        message: ticket
          ? `Ticket ${ticket.ticketNumber} called to counter`
          : 'No waiting tickets in queue',
        ticket,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/tickets/:id/serve - Start serving a called ticket
ticketsRouter.post(
  '/api/tickets/:id/serve',
  ...adminDeskGuard,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const operatorUserId = req.user?.id;
      if (!operatorUserId) {
        throw new BadRequestError('Authenticated operator context required');
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const validatedData = DeskActionSchema.parse(req.body);

      const ticket = await queueService.serveTicket(
        operatorUserId,
        id,
        validatedData.counterId
      );

      res.status(200).json({
        message: `Serving ticket ${ticket.ticketNumber}`,
        ticket,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/tickets/:id/complete - Complete service for ticket
ticketsRouter.post(
  '/api/tickets/:id/complete',
  ...adminDeskGuard,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const operatorUserId = req.user?.id;
      if (!operatorUserId) {
        throw new BadRequestError('Authenticated operator context required');
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const validatedData = DeskActionSchema.parse(req.body);

      const ticket = await queueService.completeTicket(
        operatorUserId,
        id,
        validatedData.counterId
      );

      res.status(200).json({
        message: `Ticket ${ticket.ticketNumber} completed successfully`,
        ticket,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/tickets/:id/skip - Mark called ticket as no-show / skip
ticketsRouter.post(
  '/api/tickets/:id/skip',
  ...adminDeskGuard,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const operatorUserId = req.user?.id;
      if (!operatorUserId) {
        throw new BadRequestError('Authenticated operator context required');
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const validatedData = DeskActionSchema.parse(req.body);

      const ticket = await queueService.skipTicket(
        operatorUserId,
        id,
        validatedData.counterId
      );

      res.status(200).json({
        message: `Ticket ${ticket.ticketNumber} marked as no-show / skipped`,
        ticket,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/tickets/:id/cancel - Cancel a waiting or called ticket
ticketsRouter.post(
  '/api/tickets/:id/cancel',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const userId = req.user?.id || null;
      const ticket = await queueService.cancelTicket(id, userId);

      res.status(200).json({
        message: `Ticket ${ticket.ticketNumber} cancelled successfully`,
        ticket,
      });
    } catch (err) {
      next(err);
    }
  }
);
