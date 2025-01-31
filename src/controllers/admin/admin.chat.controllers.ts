import express, { NextFunction, Request, Response } from 'express';
import ApiError from '../../utils/ApiError';
import ApiResponse from '../../utils/ApiResponse';
import { io } from '../../socketConfig';
import { Chat, ChatType, PrismaClient, User, UserRoles } from '@prisma/client';

const prisma = new PrismaClient();

export const createChatGroupController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const admin: User = req.body._user;
    if (admin?.role !== UserRoles.admin) {
      return next(ApiError.unauthorized('You are not authorized'));
    }
    const { participants, groupName } = req.body as {
      participants: { id: number }[];
      groupName: string;
    };

    console.log(participants, groupName);

    const newChatGroup = await prisma.chat.create({
      data: {
        chatType: ChatType.group_chat,
        chatGroup: {
          create: {
            groupName,
            adminId: admin.id,
          },
        },
      },
    });

    if (!newChatGroup) {
      return next(ApiError.internal('Failed to create chat group'));
    }

    const agents = await prisma.agent.findMany({
      where: {
        id: {
          in: participants.map((participant) => participant.id),
        },
      },
      select: {
        userId: true,
      },
    });

    if (!agents) {
      await prisma.chat.delete({
        where: {
          id: newChatGroup.id,
        },
      });
      return next(ApiError.internal('Failed to create chat group'));
    }
    console.log('agents: ', agents);
    // console.log(agents.forEach((agent) => console.log(agent.userId)));
    const createParticipants = await prisma.chatParticipant.createMany({
      data: [
        ...agents.map((participant) => ({
          chatId: newChatGroup.id,
          userId: participant.userId,
        })),
        {
          chatId: newChatGroup.id,
          userId: admin.id,
        },
      ],
    });

    console.log(createParticipants);

    if (!createParticipants) {
      await prisma.chat.delete({
        where: {
          id: newChatGroup.id,
        },
      });
      return next(ApiError.internal('Failed to create chat group'));
    }

    return new ApiResponse(
      201,
      newChatGroup,
      'Chat group created successfully'
    ).send(res);
  } catch (error) {
    console.log(error);
    if (error instanceof ApiError) {
      return next(error);
    }
    return next(ApiError.internal('Failed to create chat group'));
  }
};

export const getAllCustomerWithAgentsChats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const admin: User = req.body._user;
    if (admin?.role !== UserRoles.admin) {
      return next(ApiError.unauthorized('You are not authorized'));
    }

    const agentCustomerChats = await prisma.chat.findMany({
      where: {
        chatType: ChatType.customer_to_agent,
      },
      include: {
        participants: {
          select: {
            user: {
              select: {
                id: true,
                username: true,
                firstname: true,
                lastname: true,
                role: true,
              },
            },
          },
        },
        chatDetails: {
          select: {
            status: true,
            category: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!agentCustomerChats) {
      return next(ApiError.notFound('No chats found'));
    }

    return new ApiResponse(200, agentCustomerChats, 'Chats found').send(res);
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    return next(ApiError.internal('Failed to create chat group'));
  }
};

export const getAllAdminTeamChats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const admin: User = req.body._user;
    if (admin.role != UserRoles.admin) {
      return next(ApiError.unauthorized('You are not authorized'));
    }

    const teamChats = await prisma.chat.findMany({
      where: {
        OR: [
          {
            AND: [
              {
                participants: {
                  some: {
                    userId: admin.id,
                  },
                },
              },
              { chatType: ChatType.team_chat },
            ],
          },
          { chatType: ChatType.group_chat },
        ],
      },
      include: {
        participants: {
          where: {
            userId: {
              not: admin.id,
            },
          },
          select: {
            user: {
              select: {
                id: true,
                username: true,
                firstname: true,
                lastname: true,
                role: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!teamChats) {
      return next(ApiError.notFound('No chats found'));
    }

    return new ApiResponse(200, teamChats, 'Chats fetched successfully').send(
      res
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    return next(ApiError.internal('Failed to fetch chats'));
  }
};

// export const getChatDetails = async (req: Request, res: Response,  next: NextFunction) => {
//     try {
//         const admin: User = req.body._user;

//     } catch (error) {

//     }
// }
