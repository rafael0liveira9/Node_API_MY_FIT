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
    console.log('b', friends)

    if (!friends) {
        return res.status(403).json({ message: "Pedido não encontrado." });
    }


    if (friends) {
        await p.$disconnect();
        return res.status(201).json(friends);
    } else {
        await p.$disconnect();
        return res.status(401).json({
            message: "Usuário não cadastrado."
        });
    }

}

module.exports = { GetMyFriendRequest, GetMyPersonalsRequest, AcceptFriendship, PostFriendship, AcceptRelationship, PostRelationship, GetMyFriends };