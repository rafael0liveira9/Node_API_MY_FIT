const { json } = require('body-parser');
const exercises = require('../exercises');
const { textCheck } = require('../../utils');
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
                    include: {
                        friendship_friendship_friendToclient: true,
                        friendship_friendship_senderToclient: true,
                    }
                }
            }
        });

        const filteredPosts = posts.filter(post => post.client?.situation === 1);


        if (!filteredPosts) {
            return res.status(500).json({
                message: "Erro ao resgatar posts",
            });
        }

        const PRIORITY_MAP = {
            1: 5,
            5: 4,
            4: 3,
            3: 2,
            2: 1,
        };

        filteredPosts.sort((a, b) => {
            const priorityA = PRIORITY_MAP[a.client.userType] || 0;
            const priorityB = PRIORITY_MAP[b.client.userType] || 0;

            if (priorityA !== priorityB) {
                return priorityB - priorityA;
            }

            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateB - dateA;
        });

        const now = new Date();
        const TWELVE_HOURS = 12 * 60 * 60 * 1000;

        const recentPosts = filteredPosts.filter(
            (post) => now.getTime() - new Date(post.createdAt).getTime() <= TWELVE_HOURS
        );
        const otherPosts = filteredPosts.filter(
            (post) => now.getTime() - new Date(post.createdAt).getTime() > TWELVE_HOURS
        );

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

}, GetMyPosts = async (req, res) => {
    console.log('GetMyPosts 🚀')

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
                authorId: alreadyClient.client.id,
                situation: 1
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        await p.$disconnect();
        return res.status(200).json({
            alreadyClient,
            posts
        });
    } catch (error) {
        await p.$disconnect();
        console.log(error)
        return res.status(500).json({
            message: "Erro ao iniciar execução"
        });
    }

}, PostPostkk = async (req, res) => {
    console.log("PostPostkk 🚀");

    if (!req.headers.authorization) {
        return res.status(401).json({ message: "JWT é necessário." });
    }

    const user = await jwtUncrypt(req.headers.authorization);

    if (!user?.user?.id) {
        return res.status(401).json({ message: "Usuário não encontrado." });
    }

    const alreadyClient = await p.user.findFirst({
        where: {
            id: user.user.id,
            deletedAt: null,
        },
        include: {
            client: true,
        },
    });

    if (!alreadyClient?.client?.id) {
        return res.status(403).json({ message: "Cliente não autorizado." });
    }

    try {
        let censored = false;
        let titleChecked = req.body.title || "";
        let descriptionChecked = req.body.description || "";
        let imageUpload;

        if (req.body.title && req.body.description) {
            const titleResult = textCheck(req.body.title);
            const descriptionResult = textCheck(req.body.description);

            censored = !titleResult.ok || !descriptionResult.ok;
            titleChecked = titleResult.text;
            descriptionChecked = descriptionResult.text;
        }

        console.log("🔒 Censurado?", censored);
        console.log("📝 Título:", titleChecked);
        console.log("📝 Descrição:", descriptionChecked);


        if (titleChecked || descriptionChecked || req.body.image) {
            const post = await p.posts.create({
                data: {
                    authorId: alreadyClient.client.id,
                    title: titleChecked || null,
                    description: descriptionChecked || null,
                    image: req.body.image || null,
                    type: req.body.type || 1
                },
            });

            if (!post) {
                return res.status(500).json({ message: "Erro ao salvar post." });
            }

            if (censored === true) {
                await p.forbiddenAlerts.create({
                    data: {
                        text: `${req.body.title ?? ''} |-| ${req.body.description ?? ''}`,
                        postId: post.id,
                        clientId: alreadyClient.client.id,
                    },
                });
            }

            await p.$disconnect();
            return res.status(200).json({ post, censored });
        }


        return res.status(400).json({
            message: "É necessário enviar título, descrição ou imagem.",
        });
    } catch (error) {
        await p.$disconnect();
        console.error("❌ Erro ao postar:", error);

        return res.status(500).json({ message: "Erro ao iniciar execução." });
    }
}, PutPostkk = async (req, res) => {
    console.log("PostPostkk 🚀");

    if (!req.headers.authorization) {
        return res.status(401).json({ message: "JWT é necessário." });
    }

    const user = await jwtUncrypt(req.headers.authorization);

    if (!user?.user?.id) {
        return res.status(401).json({ message: "Usuário não encontrado." });
    }

    const alreadyClient = await p.user.findFirst({
        where: {
            id: user.user.id,
            deletedAt: null,
        },
        include: {
            client: true,
        },
    });

    if (!alreadyClient?.client?.id) {
        return res.status(403).json({ message: "Cliente não autorizado." });
    }

    const alreadyPost = await p.posts.findFirst({
        where: {
            id: req.body.id,
            situation: 1,
        },
        include: {
            forbiddenAlerts: true
        }
    });

    if (!alreadyPost?.id) {
        return res.status(403).json({ message: "Post não existe." });
    }


    try {
        let censored = false;
        let titleChecked = req.body.title || "";
        let descriptionChecked = req.body.description || "";
        let imageUpload;

        if (req.body.title && req.body.description) {
            const titleResult = textCheck(req.body.title);
            const descriptionResult = textCheck(req.body.description);

            censored = !titleResult.ok || !descriptionResult.ok;
            titleChecked = titleResult.text;
            descriptionChecked = descriptionResult.text;
        }

        console.log("🔒 Censurado?", censored);
        console.log("📝 Título:", titleChecked);
        console.log("📝 Descrição:", descriptionChecked);


        if (titleChecked || descriptionChecked || req.body.image) {
            const post = await p.posts.update({
                where: { id: alreadyPost.id },
                data: {
                    title: titleChecked || alreadyPost.title,
                    description: descriptionChecked || alreadyPost.description,
                    image: req.body.image || alreadyPost.image,
                    type: req.body.type || alreadyPost.type
                },
            });

            if (!post) {
                return res.status(500).json({ message: "Erro ao salvar post." });
            }


            if (Array.isArray(alreadyPost?.forbiddenAlerts) && alreadyPost.forbiddenAlerts.length > 0) {
                const lastAlert = await p.forbiddenAlerts.findFirst({
                    where: { postId: alreadyPost.id },
                    orderBy: { createdAt: 'desc' },
                });

                console.log('lastAlert', lastAlert)

                if (lastAlert) {
                    await p.forbiddenAlerts.update({
                        where: { id: lastAlert.id },
                        data: {
                            updatedText: `${req.body.title ?? ''} |-| ${req.body.description ?? ''}`,
                            updatedAt: new Date(),
                        },
                    });
                }
            }


            if (censored === true) {
                await p.forbiddenAlerts.create({
                    data: {
                        text: `${req.body.title ?? ''} |-| ${req.body.description ?? ''}`,
                        postId: alreadyPost.id,
                        clientId: alreadyClient.client.id,
                    },
                });
            }

            await p.$disconnect();
            return res.status(200).json({ post, censored });
        }


        return res.status(400).json({
            message: "É necessário enviar título, descrição ou imagem.",
        });
    } catch (error) {
        await p.$disconnect();
        console.error("❌ Erro ao postar:", error);

        return res.status(500).json({ message: "Erro ao iniciar execução." });
    }
}, DeletePostkk = async (req, res) => {
    console.log("PostPostkk 🚀");

    if (!req.headers.authorization) {
        return res.status(401).json({ message: "JWT é necessário." });
    }

    const user = await jwtUncrypt(req.headers.authorization);

    if (!user?.user?.id) {
        return res.status(401).json({ message: "Usuário não encontrado." });
    }

    const alreadyClient = await p.user.findFirst({
        where: {
            id: user.user.id,
            deletedAt: null,
        },
        include: {
            client: true,
        },
    });

    if (!alreadyClient?.client?.id) {
        return res.status(403).json({ message: "Cliente não autorizado." });
    }

    const alreadyPost = await p.posts.findFirst({
        where: {
            id: req.body.id,
            situation: 1,
        },
        include: {
            forbiddenAlerts: true
        }
    });

    if (!alreadyPost?.id) {
        return res.status(403).json({ message: "Post não existe." });
    }


    try {
        const deletePost = await p.posts.update({
            where: { id: alreadyPost.id },
            data: {
                situation: 0
            },
        });

        if (!!deletePost) {
            console.log('deletePost', deletePost)
            return res.status(200).json({
                message: "Post deletado.",
            });
        }
    } catch (error) {
        await p.$disconnect();
        console.error("❌ Erro ao postar:", error);

        return res.status(500).json({ message: "Erro ao iniciar execução." });
    }
};



module.exports = { GetAllPosts, PostPostkk, PutPostkk, GetMyPosts, DeletePostkk };