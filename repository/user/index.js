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

const GetUserById = async (req, res) => {

    const adminCheck = await jwtUncrypt(req.headers.authorization)

    if (!adminCheck?.user?.type || adminCheck?.user?.type != 1) {
        return res.status(403).json({
            message: "Usuário não autorizado."
        });
    }

    const { id } = req.params;
    const data = await p.user.findFirst({
        where: {
            id: parseInt(id),
            situation: 1,
            deletedAt: null
        },
        select: {
            id: true,
            email: true,
            lastPaymentId: true,
            situation: true,
            createdAt: true,
            updatedAt: true,
            deletedAt: true,
            type: {
                select: {
                    id: true,
                    name: true
                }
            }
        }
    })


    if (data) {
        await p.$disconnect();
        return res.status(201).json({
            user: data
        });
    } else {
        await p.$disconnect();
        return res.status(401).json({
            message: "Usuário não cadastrado."
        });
    }

},
    GetMyUser = async (req, res) => {

        const adminCheck = await jwtUncrypt(req.headers.authorization)

        if (!adminCheck?.user?.email) {
            return res.status(401).json({
                message: "Usuário não encontrado."
            });
        }

        const data = await p.user.findFirst({
            where: {
                email: adminCheck?.user?.email,
                situation: 1,
                deletedAt: null
            },
            select: {
                id: true,
                email: true,
                lastPaymentId: true,
                situation: true,
                createdAt: true,
                updatedAt: true,
                deletedAt: true,
                type: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        })


        if (data) {
            await p.$disconnect();
            return res.status(201).json({
                user: data
            });
        } else {
            await p.$disconnect();
            return res.status(401).json({
                message: "Usuário não cadastrado."
            });
        }

    },
    SignUp = async (req, res) => {

        const userData = req.body;
        const { type } = req.params;

        const already = await p.user.findFirst({
            where: {
                email: userData.email,
                deletedAt: null
            }
        })

        if (!!already) {
            await p.$disconnect();
            return res.status(302).json({
                situation: already.situation
            });
        } else {
            const client = await p.client.create({
                data: {
                    name: userData.name,
                    description: userData.description,
                    nick: userData.nick,
                    objective: userData.objective,
                    photo: userData.photo,
                    phone: userData.phone,
                    backgroundImage: userData.backgroundImage,
                    instagram: userData.instagram,
                    cref: userData.cref,
                    document: userData.document,
                }
            });

            if (client) {
                const user = await p.user.create({
                    data: {
                        email: userData.email,
                        password: hashSync(userData.password, 8),
                        tip: userData.tip,
                        reply: userData.reply,
                        typeId: parseInt(type),
                        questionId: 1,
                        clientId: client.id,
                        lastPaymentId: 1
                    }
                })

                if (user) {
                    await p.$disconnect();

                    user.token = sign({
                        id: user.id,
                        name: client.name,
                        nick: client.nick,
                        email: user.email,
                        type: user.typeId
                    }, process.env.SECRET_CLIENT_KEY)

                    return res.status(201).json({
                        data: {
                            user: user,
                            client: client
                        }
                    });
                } else {
                    await p.$disconnect();
                    return res.status(500).json({
                        message: "Erro ao criar user"
                    });
                }
            } else {
                await p.$disconnect();
                return res.status(500).json({
                    message: "Erro ao criar client"
                });
            }
        }

    },
    SignIn = async (req, res) => {

        try {

            const alreadyUser = await p.user.findFirst({
                where: {
                    email: req.body.email,
                    deletedAt: null
                },
                include: {
                    client: true
                }
            })

            if (!alreadyUser) {
                await p.$disconnect();
                return res.status(401).json({
                    message: "Usuário não existe"
                });
            }

            const passwordIsCorrect = compareSync(req.body.password, alreadyUser.password);


            console.log('passwordIsCorrect', passwordIsCorrect)
            if (!passwordIsCorrect) {
                await p.$disconnect();
                return res.status(401).json({
                    message: "Senha incorreta"
                });
            }


            alreadyUser.token = sign({
                id: alreadyUser.id,
                name: alreadyUser?.client.name,
                nick: alreadyUser?.client.nick,
                email: alreadyUser.email,
                type: alreadyUser.typeId
            }, process.env.SECRET_CLIENT_KEY)

            return res.status(200).json({
                message: "Usuário Logado Sucesso",
                user: {
                    id: alreadyUser.id,
                    email: alreadyUser.email,
                    name: alreadyUser.client.name,
                    nick: alreadyUser.client.nick,
                    type: alreadyUser.typeId,
                    token: alreadyUser.token,
                }
            });
        } catch (error) {
            await p.$disconnect();
            return res.status(500).json({
                message: "Erro ao fazer Login"
            });
        }
    },
    EditUser = async (req, res) => {

        const adminCheck = await jwtUncrypt(req.headers.authorization)
        let editId;

        if (!adminCheck?.user?.type) {
            return res.status(401).json({
                message: "Usuário não encontrado."
            });
        } else {
            if (adminCheck?.user?.type == 1 && !!req?.body?.id) {
                editId = req.body.id
            } else if (!!adminCheck?.user?.id) {
                editId = adminCheck?.user?.id
            } else {
                return res.status(401).json({
                    message: "Usuário não encontrado."
                });
            }
        }

        const userData = req.body;

        const alreadyUser = await p.user.findFirst({
            where: {
                id: editId
            },
            include: {
                client: true
            }
        })

        const client = await p.client.update({
            where: {
                id: alreadyUser?.client?.id
            },
            data: {
                name: userData.name ? userData.name : alreadyUser.client.name,
                description: userData.description ? userData.description : alreadyUser.client.description,
                nick: userData.nick ? userData.nick : alreadyUser.client.nick,
                objective: userData.objective ? userData.objective : alreadyUser.client.objective,
                phone: userData.phone ? userData.phone : alreadyUser.client.phone,
                instagram: userData.instagram ? userData.instagram : alreadyUser.client.instagram,
                updatedAt: new Date()
            }
        });

        if (client) {
            await p.$disconnect();

            alreadyUser.token = sign({
                id: alreadyUser.id,
                name: client.name,
                nick: client.nick,
                email: alreadyUser.email,
                type: alreadyUser.typeId
            }, process.env.SECRET_CLIENT_KEY)

            return res.status(201).json({
                data: {
                    user: alreadyUser,
                    client: client
                }
            });
        } else {
            await p.$disconnect();
            return res.status(500).json({
                message: "Erro ao editar client"
            });
        }


    },
    SuspendUser = async (req, res) => {

        const adminCheck = await jwtUncrypt(req.headers.authorization)
        let editId;

        if (!adminCheck?.user?.type) {
            return res.status(401).json({
                message: "Usuário não encontrado."
            });
        } else {
            if (adminCheck?.user?.type == 1 && !!req?.body?.id) {
                editId = req.body.id
            } else if (!!adminCheck?.user?.id) {
                editId = adminCheck?.user?.id
            } else {
                return res.status(401).json({
                    message: "Usuário não encontrado."
                });
            }
        }

        const alreadyUser = await p.user.findFirst({
            where: {
                id: editId
            },
            include: {
                client: true
            }
        })

        const user = await p.user.update({
            where: {
                id: alreadyUser?.id
            },
            data: {
                situation: 0,
                deletedAt: new Date()
            }
        });

        const client = await p.client.update({
            where: {
                id: alreadyUser?.client?.id
            },
            data: {
                situation: 0,
                deletedAt: new Date()
            }
        });

        if (!!user && !!client) {
            await p.$disconnect();

            return res.status(201).json({
                message: 'Usuário suspenso com sucesso.'
            });
        } else {
            await p.$disconnect();
            return res.status(500).json({
                message: "Erro ao suspender usuário"
            });
        }
    },
    DeleteUser = async (req, res) => {

        const adminCheck = await jwtUncrypt(req.headers.authorization)
        let deleteUser;
        let deleteClient;

        if (!adminCheck?.user?.type || adminCheck?.user?.type != 1) {
            return res.status(401).json({
                message: "Usuário não autorizado."
            });
        }

        const alreadyUser = await p.user.findFirst({
            where: {
                id: parseInt(req?.params?.id)
            },
            include: {
                client: true
            }
        })
        deleteClient = await p.client.update({
            where: {
                id: alreadyUser?.client?.id
            },
            data: {
                name: 'removed',
                nick: 'removed',
                nick: 'removed',
                phone: 'removed',
                photo: 'removed',
                backgroundImage: 'removed',
                description: 'removed',
                objective: 'removed',
                instagram: 'removed',
                document: 'removed',
                cref: 'removed',
                situation: 0,
                deletedAt: new Date()
            }
        })

        if (!!deleteClient) {
            deleteUser = await p.user.update({
                where: {
                    id: alreadyUser?.id
                },
                data: {
                    email: 'removed',
                    password: 'removed',
                    socialCode: 'removed',
                    inputCode: 'removed',
                    situation: 0,
                    deletedAt: new Date()
                }
            })
        }



        if (!!deleteUser) {
            await p.$disconnect();
            return res.status(201).json({
                message: "Usuário Deletado com sucesso."
            });
        } else {
            await p.$disconnect();
            if (!deleteUser) {
                return res.status(201).json({
                    message: "Erro ao deletar usuário."
                });
            }
            if (!deleteClient) {
                return res.status(201).json({
                    message: "Erro ao deletar cliente."
                });
            }
        }
    },
    PhotoUpdate = async (req, res) => {
        let editId;
        let result;
        let client;
        const file = req.file;
        const path = req.body?.path || 'error-path';
        const adminCheck = await jwtUncrypt(req.headers.authorization)


        if (!adminCheck?.user?.type) {
            return res.status(401).json({
                message: "Usuário não encontrado."
            });
        } else {
            if (adminCheck?.user?.type == 1 && !!req?.body?.id) {
                editId = req.body.id
            } else if (!!adminCheck?.user?.id) {
                editId = adminCheck?.user?.id
            } else {
                return res.status(401).json({
                    message: "Usuário não encontrado."
                });
            }
        }

        const alreadyUser = await p.user.findFirst({
            where: {
                id: editId
            },
            include: {
                client: true
            }
        })

        try {
            result = await s3.uploadImage(file, path);

            if (result) {
                client = await p.client.update({
                    where: {
                        id: alreadyUser?.client?.id
                    },
                    data: {
                        photo: result.Location,
                        updatedAt: new Date()
                    }
                });

                await p.$disconnect();
                return res.status(201).json({
                    url: result.Location
                });

            } else {
                await p.$disconnect();
                return res.status(500).json({
                    message: "Erro ao inserir iage no s3 "
                });
            }

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Erro no upload' });
        }


    },
    backgroundImageUpdate = async (req, res) => {
        let editId;
        let result;
        let client;
        const file = req.file;
        const path = req.body?.path || 'error-path';
        const adminCheck = await jwtUncrypt(req.headers.authorization)


        if (!adminCheck?.user?.type) {
            return res.status(401).json({
                message: "Usuário não encontrado."
            });
        } else {
            if (adminCheck?.user?.type == 1 && !!req?.body?.id) {
                editId = req.body.id
            } else if (!!adminCheck?.user?.id) {
                editId = adminCheck?.user?.id
            } else {
                return res.status(401).json({
                    message: "Usuário não encontrado."
                });
            }
        }

        const alreadyUser = await p.user.findFirst({
            where: {
                id: editId
            },
            include: {
                client: true
            }
        })

        try {
            result = await s3.uploadImage(file, path);

            if (result) {
                client = await p.client.update({
                    where: {
                        id: alreadyUser?.client?.id
                    },
                    data: {
                        backgroundImage: result.Location,
                        updatedAt: new Date()
                    }
                });

                await p.$disconnect();
                return res.status(201).json({
                    url: result.Location
                });

            } else {
                await p.$disconnect();
                return res.status(500).json({
                    message: "Erro ao inserir iage no s3 "
                });
            }

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Erro no upload' });
        }


    }

module.exports = { GetUserById, GetMyUser, SignUp, SignIn, EditUser, SuspendUser, DeleteUser, PhotoUpdate, backgroundImageUpdate };