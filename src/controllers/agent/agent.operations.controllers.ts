import { NextFunction, Request, Response } from 'express';
import ApiError from '../../utils/ApiError';
import ApiResponse from '../../utils/ApiResponse';
import {
  ChatStatus,
  ChatType,
  PrismaClient,
  User,
  UserRoles,
} from '@prisma/client';
import { TransactionStatus } from '@prisma/client';

const prisma = new PrismaClient();

export const createTransactionCard = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract agentId from auth middleware
    const agent: User = req.body._user;
    if (!agent || agent.role !== UserRoles.agent) {
      return next(ApiError.unauthorized('Unauthorized'));
    }

    const {
      departmentId,
      categoryId,
      subCategoryId,
      countryId,
      chatId,
      cardType,
      cardNumber,
      amount,
      exchangeRate,
      amountNaira,
    } = req.body;
    if (
      !departmentId ||
      !categoryId ||
      !subCategoryId ||
      !countryId ||
      !amount ||
      !chatId
    ) {
      return next(ApiError.badRequest('Missing required fields'));
    }

    const currChat = await prisma.chat.findUnique({
      where: {
        id: chatId,
        participants: {
          some: {
            userId: agent.id,
          },
        },
        chatDetails: {
          status: ChatStatus.pending,
        },
      },
      select: {
        participants: {
          select: {
            user: {
              select: {
                id: true,
                agent: true,
              },
            },
          },
        },
      },
    });

    if (!currChat || currChat.participants.length === 0) {
      return next(ApiError.notFound('Chat not found'));
    }

    let currAgentId;
    let currCustomerId;

    for (const participant of currChat.participants) {
      if (participant.user.agent) {
        currAgentId = participant.user.agent.id;
      } else {
        currCustomerId = participant.user.id;
      }
    }

    const transaction = await prisma.transaction.create({
      data: {
        departmentId: parseInt(departmentId, 10),
        categoryId: parseInt(categoryId, 10),
        subCategoryId: parseInt(subCategoryId, 10),
        agentId: currAgentId!,
        customerId: currCustomerId!,
        countryId: parseInt(countryId, 10),
        cardType: cardType || null,
        cardNumber: cardNumber || null,
        amount: parseFloat(amount),
        exchangeRate: exchangeRate ? parseFloat(exchangeRate) : null,
        amountNaira: amountNaira ? parseFloat(amountNaira) : null,
        status: TransactionStatus.pending,
      },
    });
    if (!transaction) {
      return next(ApiError.badRequest('Transaction not created'));
    }

    return new ApiResponse(
      201,
      undefined,
      'Transaction created successfully'
    ).send(res);
  } catch (error) {
    console.error(error);
    if (error instanceof ApiError) {
      next(error);
      return;
    }
    next(ApiError.internal('Internal Server Error'));
  }
};

export const createTransactionCrypto = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract agentId from auth middleware
    const agent: User = req.body._user;
    if (!agent || agent.role !== UserRoles.agent) {
      return next(ApiError.unauthorized('Unauthorized'));
    }

    const {
      departmentId,
      categoryId,
      subCategoryId,
      countryId,
      chatId,
      amount,
      exchangeRate,
      amountNaira,
      cryptoAmount,
      fromAddress,
      toAddress,
    } = req.body;

    // Validate required fields
    if (
      !departmentId ||
      !categoryId ||
      !subCategoryId ||
      !countryId ||
      !amount ||
      !chatId ||
      !exchangeRate
    ) {
      return next(ApiError.badRequest('Missing required fields'));
    }

    //extract agent and userId from chat Id
    const currChat = await prisma.chat.findUnique({
      where: {
        id: chatId,
        participants: {
          some: {
            userId: agent.id,
          },
        },
        chatDetails: {
          status: ChatStatus.pending,
        },
      },
      select: {
        participants: {
          select: {
            user: {
              select: {
                id: true,
                agent: true,
              },
            },
          },
        },
      },
    });

    if (!currChat || currChat.participants.length === 0) {
      return next(ApiError.notFound('Chat not found'));
    }

    let currAgentId;
    let currCustomerId;

    for (const participant of currChat.participants) {
      if (participant.user.agent) {
        currAgentId = participant.user.agent.id;
      } else {
        currCustomerId = participant.user.id;
      }
    }

    // Create a new transaction
    const transaction = await prisma.transaction.create({
      data: {
        departmentId: parseInt(departmentId, 10),
        categoryId: parseInt(categoryId, 10),
        subCategoryId: parseInt(subCategoryId, 10),
        countryId: parseInt(countryId, 10),
        amount: parseFloat(amount),
        exchangeRate: exchangeRate ? parseFloat(exchangeRate) : null,
        amountNaira: amountNaira ? parseFloat(amountNaira) : null,
        agentId: currAgentId!,
        cryptoAmount: cryptoAmount ? parseFloat(cryptoAmount) : null,
        fromAddress: fromAddress || null,
        toAddress: toAddress || null,
        status: TransactionStatus.pending,
        customerId: currCustomerId!,
      },
    });
    if (!transaction) {
      return next(ApiError.badRequest('Failed to create transaction'));
    }
    return new ApiResponse(
      201,
      undefined,
      'Transaction created successfully'
    ).send(res);
  } catch (error) {
    console.error(error);
    if (error instanceof ApiError) {
      next(error);
      return;
    }
    next(ApiError.internal('Internal Server Error'));
  }
};
