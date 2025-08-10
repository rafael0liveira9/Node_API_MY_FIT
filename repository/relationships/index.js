const { jwtUncrypt } = require('../../utils/midleware/auth'),
    { PrismaClient } = require("@prisma/client"),
    p = new PrismaClient(),
    { verify, sign } = require("jsonwebtoken"),
    s3 = require('../s3/index'),
    { compareSync, hashSync } = require('bcryptjs'),
    error = {
        status: 500,
        message: "Erro Interno"
    },
    moment = require('moment');

const GetMyFriendRequest = async (req, res) => {

    const adminCheck = await jwtUncrypt(req.headers.authorization)

    if (!adminCheck?.user) {
        return res.status(403).json({
            message: "Usuário não autorizado."
        });
    }

    const alreadyUser = await p.user.findFirst({
        where: {
            id: adminCheck.user.id,
            situation: 1,
            deletedAt: null,
        },
        include: {
            client: true,
        },
    });

    if (!alreadyUser || !alreadyUser.client) {
        return res.status(403).json({ message: "Usuário não autorizado." });
    }

    const data = await p.friendship.findMany({
        where: {
            friend: alreadyUser?.client?.id,
            accept: 0,
        },
        include: {
            client_friendship_senderToclient: true,
        },
    })


    if (data) {
        await p.$disconnect();
        return res.status(201).json(data);
    } else {
        await p.$disconnect();
        return res.status(401).json({
            message: "Usuário não cadastrado."
        });
    }

}, GetMyPersonalsRequest = async (req, res) => {

    const adminCheck = await jwtUncrypt(req.headers.authorization)

    if (!adminCheck?.user) {
        return res.status(403).json({
            message: "Usuário não autorizado."
        });
    }

    const alreadyUser = await p.user.findFirst({
        where: {
            id: adminCheck.user.id,
            situation: 1,
            deletedAt: null,
        },
        include: {
            client: true,
        },
    });

    if (!alreadyUser || !alreadyUser.client) {
        return res.status(403).json({ message: "Usuário não autorizado." });
    }

    const data = await p.relationship.findMany({
        where: {
            client: alreadyUser?.client?.id,
            accept: 0,
        },
        include: {
            client_relationship_responsibleToclient: true,
        }
    })


    if (data) {
        await p.$disconnect();
        return res.status(201).json(data);
    } else {
        await p.$disconnect();
        return res.status(401).json({
            message: "Usuário não cadastrado."
        });
    }

}, PostFriendship = async (req, res) => {

    const adminCheck = await jwtUncrypt(req.headers.authorization)

    if (!adminCheck?.user) {
        return res.status(403).json({
            message: "Usuário não autorizado."
        });
    }

    const alreadyUser = await p.user.findFirst({
        where: {
            id: adminCheck.user.id,
            situation: 1,
            deletedAt: null,
        },
        include: {
            client: true,
        },
    });

    if (!alreadyUser || !alreadyUser.client) {
        return res.status(403).json({ message: "Usuário não autorizado." });
    }

    const data = await p.friendship.create({
        data: {
            sender: alreadyUser?.client?.id,
            friend: req.body.id,
        }
    })


    if (data) {
        await p.$disconnect();
        return res.status(201).json(data);
    } else {
        await p.$disconnect();
        return res.status(401).json({
            message: "Usuário não cadastrado."
        });
    }

}, AcceptFriendship = async (req, res) => {

    const adminCheck = await jwtUncrypt(req.headers.authorization)

    if (!adminCheck?.user) {
        return res.status(403).json({
            message: "Usuário não autorizado."
        });
    }

    const alreadyUser = await p.user.findFirst({
        where: {
            id: adminCheck.user.id,
            situation: 1,
            deletedAt: null,
        },
        include: {
            client: true,
        },
    });

    if (!alreadyUser || !alreadyUser.client) {
        return res.status(403).json({ message: "Usuário não autorizado." });
    }

    const request = await p.friendship.findFirst({
        where: {
            sender: req.body.sender,
            friend: alreadyUser.client.id.id,
            accept: 0
        }
    })

    if (!request) {
        return res.status(403).json({ message: "Pedido não encontrado." });
    }

    const data = await p.friendship.update({
        where: {
            id: request?.id
        },
        data: {
            accept: req.body.accept === true ? 1 : 2,
            updatedAt: new Date()
        }
    })


    if (data) {
        await p.$disconnect();
        return res.status(201).json(data);
    } else {
        await p.$disconnect();
        return res.status(401).json({
            message: "Usuário não cadastrado."
        });
    }

}, PostRelationship = async (req, res) => {

    const adminCheck = await jwtUncrypt(req.headers.authorization)

    if (!adminCheck?.user) {
        return res.status(403).json({
            message: "Usuário não autorizado."
        });
    }

    const alreadyUser = await p.user.findFirst({
        where: {
            id: adminCheck.user.id,
            situation: 1,
            deletedAt: null,
        },
        include: {
            client: true,
        },
    });

    if (!alreadyUser || !alreadyUser.client) {
        return res.status(403).json({ message: "Usuário não autorizado." });
    }

    const data = await p.relationship.create({
        data: {
            responsible: alreadyUser?.client?.id,
            client: req.body.id,
        }
    })


    if (data) {
        await p.$disconnect();
        return res.status(201).json(data);
    } else {
        await p.$disconnect();
        return res.status(401).json({
            message: "Usuário não cadastrado."
        });
    }

}, AcceptRelationship = async (req, res) => {

    const adminCheck = await jwtUncrypt(req.headers.authorization)

    if (!adminCheck?.user) {
        return res.status(403).json({
            message: "Usuário não autorizado."
        });
    }

    const alreadyUser = await p.user.findFirst({
        where: {
            id: adminCheck.user.id,
            situation: 1,
            deletedAt: null,
        },
        include: {
            client: true,
        },
    });

    if (!alreadyUser || !alreadyUser.client) {
        return res.status(403).json({ message: "Usuário não autorizado." });
    }

    const request = await p.relationship.findFirst({
        where: {
            responsible: req.body.id,
            client: alreadyUser.client.id,
            accept: 0
        }
    })


    if (!request) {
        return res.status(403).json({ message: "Pedido não encontrado." });
    }

    const data = await p.relationship.update({
        where: {
            id: request?.id
        },
        data: {
            accept: req.body.accept === true ? 1 : 2,
            updatedAt: new Date()
        }
    })


    if (data) {
        await p.$disconnect();
        return res.status(201).json(data);
    } else {
        await p.$disconnect();
        return res.status(401).json({
            message: "Usuário não cadastrado."
        });
    }

}, GetMyFriends = async (req, res) => {

    const adminCheck = await jwtUncrypt(req.headers.authorization)

    if (!adminCheck?.user) {
        return res.status(403).json({
            message: "Usuário não autorizado."
        });
    }

    const alreadyUser = await p.user.findFirst({
        where: {
            id: adminCheck.user.id,
            situation: 1,
            deletedAt: null,
        },
        include: {
            client: true,
        },
    });

    if (!alreadyUser || !alreadyUser.client) {
        return res.status(403).json({ message: "Usuário não autorizado." });
    }

    console.log('a', alreadyUser.client.id)

    const friends = await p.friendship.findMany({
        where: {
            accept: 1,
            OR: [
                { friend: alreadyUser.client.id },
                { sender: alreadyUser.client.id }
            ]
        }
    });
    const requests = await p.friendship.findMany({
        where: {
            accept: 0,
            sender: alreadyUser.client.id
        }
    });
    const receives = await p.friendship.findMany({
        where: {
            accept: 0,
            friend: alreadyUser.client.id
        }
    });
    console.log('b', friends)

    if (!friends) {
        return res.status(403).json({ message: "Pedido não encontrado." });
    }


    if (friends || requests || receives) {
        await p.$disconnect();
        return res.status(201).json({ friends: friends, requests: requests, receives: receives });
    } else {
        await p.$disconnect();
        return res.status(401).json({
            message: "Usuário não cadastrado."
        });
    }

}, GetMypersonals = async (req, res) => {

    const adminCheck = await jwtUncrypt(req.headers.authorization)

    if (!adminCheck?.user) {
        return res.status(403).json({
            message: "Usuário não autorizado."
        });
    }

    const alreadyUser = await p.user.findFirst({
        where: {
            id: adminCheck.user.id,
            situation: 1,
            deletedAt: null,
        },
        include: {
            client: true,
        },
    });

    if (!alreadyUser || !alreadyUser.client) {
        return res.status(403).json({ message: "Usuário não autorizado." });
    }


    const relationship = await p.relationship.findMany({
        where: {
            accept: 1,
            client: alreadyUser.client.id
        },
        include: {
            client_relationship_responsibleToclient: {
                include: {
                    personalEvaluations_personalEvaluations_personalIdToclient: {
                        take: 1,
                        where: {
                            authorId: alreadyUser?.client?.id
                        }
                    }
                }
            },
        }
    });

    for (const rel of relationship) {
        const personalId = rel.client_relationship_responsibleToclient.id;

        const avgEval = await p.personalEvaluations.aggregate({
            where: {
                personalId: personalId
            },
            _avg: {
                evaluation: true
            }
        });
        rel.client_relationship_responsibleToclient.generalEvaluations = avgEval._avg.evaluation;
    }

    if (!relationship) {
        return res.status(403).json({ message: "Personais não encontrados." });
    }


    if (relationship) {
        await p.$disconnect();
        return res.status(200).json(relationship);
    } else {
        await p.$disconnect();
        return res.status(401).json({
            message: "Usuário não cadastrado."
        });
    }

}, PostPersonalEvaluation = async (req, res) => {
    const adminCheck = await jwtUncrypt(req.headers.authorization);

    if (!adminCheck?.user) {
        return res.status(403).json({ message: "Usuário não autorizado." });
    }

    const alreadyUser = await p.user.findFirst({
        where: {
            id: adminCheck.user.id,
            situation: 1,
            deletedAt: null,
        },
        include: { client: true },
    });

    if (!alreadyUser || !alreadyUser.client) {
        return res.status(403).json({ message: "Usuário não autorizado." });
    }

    const alreadyEvaluated = await p.personalEvaluations.findFirst({
        where: {
            authorId: alreadyUser.client.id,
            personalId: req.body.id
        }
    });

    let response;

    if (alreadyEvaluated) {
        response = await p.personalEvaluations.update({
            where: { id: alreadyEvaluated.id },
            data: {
                evaluation: req.body.evaluation ?? alreadyEvaluated.evaluation,
                observations: req.body.observations ?? alreadyEvaluated.observations,
                updatedAt: new Date()
            }
        });
    } else {
        response = await p.personalEvaluations.create({
            data: {
                personalId: req.body.id,
                authorId: alreadyUser.client.id,
                evaluation: req.body.evaluation,
                observations: req.body.observations || null,
            }
        });
    }

    if (!response) {
        return res.status(403).json({ message: "Não foi possível avaliar." });
    }

    await p.$disconnect();
    return res.status(200).json(response);
}, GetPersonalEvaluations = async (req, res, personalId, evaluation) => {
    const adminCheck = await jwtUncrypt(req.headers.authorization);

    if (!adminCheck?.user) {
        return res.status(403).json({ message: "Usuário não autorizado." });
    }

    const alreadyUser = await p.user.findFirst({
        where: {
            id: adminCheck.user.id,
            situation: 1,
            deletedAt: null,
        },
        include: { client: true },
    });

    if (!alreadyUser || !alreadyUser.client) {
        return res.status(403).json({ message: "Usuário não autorizado." });
    }

    const whereFilter = evaluation
        ? { personalId: Number(personalId), evaluation: Number(evaluation) }
        : { personalId: Number(personalId) };

    const response = await p.personalEvaluations.findMany({
        where: whereFilter,
        orderBy: [
            { updatedAt: 'desc' },
            { createdAt: 'desc' }
        ]
    });

    if (!response || response.length === 0) {
        return res.status(403).json({ message: "Não foi possível avaliar." });
    }

    await p.$disconnect();
    return res.status(200).json(response);
};

module.exports = { GetPersonalEvaluations, PostPersonalEvaluation, GetMyFriendRequest, GetMyPersonalsRequest, AcceptFriendship, PostFriendship, AcceptRelationship, PostRelationship, GetMyFriends, GetMypersonals };