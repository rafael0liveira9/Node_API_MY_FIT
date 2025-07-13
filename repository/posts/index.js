const { json } = require('body-parser');
const exercises = require('../exercises');
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

const GetAllPosts = async (req, res) => {
    console.log('GetAllPosts 🚀')

    if (!req.headers.authorization) {
        return res.status(500).json({
            message: "JWT é necessário."
        });
    }

    const user = await jwtUncrypt(req.headers.authorization)

    if (!user?.user?.id) {
        return res.status(401).json({
            message: "Usuário não encontrado."
        });
    }

    const alreadyClient = await p.user.findFirst({
        where: {
            id: user.user.id,
            deletedAt: null
        },
        include: {
            client: true
        }
    })

    try {
        const posts = await p.posts.findMany({
            where: {
                situation: 1,
                type: 1
            },
            include: {
                client: {
                    where: {
                        situation: 1
                    },
                    select: {
                        id: true,
                        name: true,
                        nick: true,
                        photo: true,
                        cref: true,
                        birthDate: true,
                        userType: true,
                    }
                }
            }
        })

        if (!posts) {
            return res.status(500).json({
                message: "Erro ao resgatar posts",
            });
        }
        const PRIORITY_MAP = {
            1: 4, // mais prioridade
            4: 3,
            3: 2,
            2: 1, // menos prioridade
        };

        // 1. Ordena por data + prioridade
        posts.sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();

            if (dateA === dateB) {
                const priorityA = PRIORITY_MAP[a.client.userType] || 0;
                const priorityB = PRIORITY_MAP[b.client.userType] || 0;
                return priorityB - priorityA; // maior prioridade primeiro
            }

            return dateB - dateA; // mais recente primeiro
        });

        // 2. Move posts das últimas 12 horas pro topo
        const now = new Date();
        const TWELVE_HOURS = 12 * 60 * 60 * 1000;

        const recentPosts = posts.filter(
            (post) => now.getTime() - new Date(post.createdAt).getTime() <= TWELVE_HOURS
        );
        const otherPosts = posts.filter(
            (post) => now.getTime() - new Date(post.createdAt).getTime() > TWELVE_HOURS
        );

        // Junta os dois mantendo a ordem
        const finalSortedPosts = [...recentPosts, ...otherPosts];

        await p.$disconnect();
        return res.status(200).json(finalSortedPosts);
    } catch (error) {
        await p.$disconnect();
        console.log(error)
        return res.status(500).json({
            message: "Erro ao iniciar execução"
        });
    }

};



module.exports = { GetAllPosts };