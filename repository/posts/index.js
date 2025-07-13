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
                    }
                }
            }
        })

        if (!posts) {
            return res.status(500).json({
                message: "Erro ao resgatar posts",
            });
        }

        await p.$disconnect();
        return res.status(200).json(posts);
    } catch (error) {
        await p.$disconnect();
        console.log(error)
        return res.status(500).json({
            message: "Erro ao iniciar execução"
        });
    }

};



module.exports = { GetAllPosts };