const { json } = require('body-parser');

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

const PostExercise = async (req, res) => {

    if (!req.headers.authorization) {
        return res.status(500).json({
            message: "JWT é necessário."
        });
    }

    const user = await jwtUncrypt(req.headers.authorization)

    const alreadyHave = await p.exercise.findFirst({
        where: {
            name: req.body.name,
            deletedAt: null
        }
    })

    if (!user?.user?.id) {
        return res.status(401).json({
            message: "Usuário não encontrado."
        });
    }
    const alreadyUser = await p.user.findFirst({
        where: {
            id: user?.user?.id,
            situation: 1,
            deletedAt: null
        },
        include: {
            client: true
        }
    });

    if (alreadyHave) {

        if (req.isGroup == true) {
            return { already: true }
        }

        await p.$disconnect();
        return res.status(401).json({
            message: "Exercicio com o mesmo nome ja existe!"
        });
    }

    try {
        const newExercise = await p.exercise.create({
            data: {
                name: req.body.name,
                description: req.body.description,
                image: req.body.image || '',
                animation: req.body.animation || '',
                video: req.body.video || '',
                authorId: alreadyUser?.client?.id,
                groupMuscleId: req.body.groupMuscleId
            }
        })

        if (req.isGroup == true) {
            return newExercise
        }
        return res.status(200).json({
            message: "Exercicio cadastrado com Sucesso",
            exercise: newExercise
        });
    } catch (error) {
        await p.$disconnect();
        console.log(error)
        return res.status(500).json({
            message: "Erro ao criar novo exercicio"
        });
    }

},
    PostStep = async (req, res) => {
        const user = await jwtUncrypt(req.headers.authorization);
        const userId = user?.user?.id;


        if (!userId) {
            return res.status(401).json({ message: "Usuário não encontrado." });
        }

        try {
            const alreadyHave = await p.step.findFirst({
                where: {
                    name: req.body.name,
                    trainingId: req.body.trainingId,
                    deletedAt: null,
                    situation: 1
                }
            });

            if (alreadyHave) {
                return res.status(401).json({
                    message: "Step com o mesmo nome já existe!"
                });
            }

            const newStep = await p.step.create({
                data: {
                    name: req.body.name,
                    description: req.body.description || '',
                    priority: req.body.priority,
                    trainingId: req.body.trainingId
                }
            });

            if (!newStep) {
                throw new Error("Erro ao criar novo step");
            }

            return res.status(200).json({
                message: "Step cadastrado com sucesso",
                step: newStep
            });

        } catch (error) {
            console.error(error);
            throw error;
        }
    },
    PostSerie = async (req, res) => {
        const user = await jwtUncrypt(req.headers.authorization);
        const userId = user?.user?.id;


        if (!userId) {
            return res.status(401).json({ message: "Usuário não encontrado." });
        }

        try {


            const newStep = await p.series.create({
                data: {
                    exerciseId: req.body.exercise,
                    isometry: req.body.isometry,
                    addSet: req.body.addSet,
                    bisetExerciseId: req.body.bisetExerciseId,
                    interval: req.body.interval,
                    stepId: req.body.stepId,
                    difficulty: JSON.stringify(req.body.difficulty)
                }
            });
            if (!newStep) {
                throw new Error("Erro ao criar nova serie");
            }

            return res.status(200).json({
                message: "Serie cadastrado com sucesso",
                step: newStep
            });

        } catch (error) {
            console.error(error);
            throw error;
        }
    },
    PostTraining = async (req, res) => {
        const user = await jwtUncrypt(req.headers.authorization);
        const userId = user?.user?.id;


        if (!userId) {
            return res.status(401).json({ message: "Usuário não encontrado." });
        }

        const { name, description, level, url, photo } = req.body;

        try {
            const alreadyUser = await p.user.findFirst({
                where: {
                    id: userId,
                    situation: 1,
                    deletedAt: null
                },
                include: {
                    client: true
                }
            });

            const alreadyHave = await p.training.findFirst({
                where: {
                    name: name,
                    authorId: alreadyUser.client.id,
                    deletedAt: null,
                    situation: 1
                }
            });

            if (alreadyHave) {
                return res.status(401).json({
                    message: "Treino com o mesmo nome já existe!"
                });
            }
            const newTraining = await p.training.create({
                data: {
                    name: name,
                    description: description,
                    level: level,
                    url: url || '',
                    photo: photo || '',
                    authorId: alreadyUser.client.id
                }
            });


            const newAssignment = await p.trainingAssignments.create({
                data: {
                    clientId: alreadyUser.client.id,
                    trainingId: newTraining.id
                }
            });

            if (newAssignment && newTraining) {
                return res.status(200).json({
                    message: "Treino cadastrado com sucesso",
                    newAssignment: newAssignment
                });
            } else {
                console.log(newAssignment, newTraining)
            }



        } catch (error) {
            console.error(error);
            return res.status(500).json({
                message: "Erro ao criar novo treino"
            });
        } finally {
            await p.$disconnect();
        }
    },
    PutTraining = async (req, res) => {
        const user = await jwtUncrypt(req.headers.authorization);
        const userId = user?.user?.id;


        if (!userId) {
            return res.status(401).json({ message: "Usuário não encontrado." });
        }

        const { id, name, description, level, url, photo } = req.body;

        try {
            const alreadyHave = await p.training.findFirst({
                where: {
                    id: id,
                    authorId: userId,
                    deletedAt: null,
                    situation: 1
                }
            });

            if (!alreadyHave) {
                const x = async () => await PostTraining(req, res);
                return x
            }

            const newTraining = await p.training.update({
                where: {
                    id: alreadyHave.id
                },
                data: {
                    name: name,
                    description: description,
                    level: level,
                    url: url,
                    photo: photo
                }
            });
            return res.status(200).json({
                message: "Treino salvo com sucesso",
                exercise: newTraining
            });


        } catch (error) {
            console.error(error);
            return res.status(500).json({
                message: "Erro ao criar novo treino"
            });
        } finally {
            await p.$disconnect();
        }
    },
    GetAllGroups = async (req, res) => {

        const adminCheck = await jwtUncrypt(req.headers.authorization)

        if (!adminCheck?.user) {
            return res.status(403).json({
                message: "Usuário não autorizado."
            });
        }

        const data = await p.muscleGroup.findMany({
            where: {
                situation: 1,
                deletedAt: null
            },
            select: {
                id: true,
                name: true,
                description: true,
                situation: true,
                createdAt: true,
                updatedAt: true,
                deletedAt: true
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

    },
    GetExercisesByGroup = async (req, res) => {

        const adminCheck = await jwtUncrypt(req.headers.authorization)

        if (!adminCheck?.user) {
            return res.status(403).json({
                message: "Usuário não autorizado."
            });
        }

        const { id } = req.params;
        const data = await p.exercise.findMany({
            where: {
                groupMuscleId: parseInt(id),
                situation: 1,
                deletedAt: null
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

    },
    TrainingPhotoUpdate = async (req, res) => {
        let result;
        const file = req.file;
        const path = req.body?.path || 'error-path';
        const adminCheck = await jwtUncrypt(req.headers.authorization)


        if (!adminCheck?.user?.type) {
            return res.status(401).json({
                message: "Usuário não encontrado."
            });
        }

        const alreadyUser = await p.training.findFirst({
            where: {
                id: parseInt(req.body.id)
            }
        })

        try {
            result = await s3.uploadImage(file, path);

            if (result) {
                client = await p.training.update({
                    where: {
                        id: alreadyUser?.id
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
                    message: "Erro ao inserir imagem no s3 "
                });
            }

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Erro no upload' });
        }


    },
    PostExercisesOnGroup = async (req, res) => {

        const adminCheck = await jwtUncrypt(req.headers.authorization)
        let finallyResponse = [];


        if (!adminCheck?.user) {
            return res.status(403).json({
                message: "Usuário não autorizado."
            });
        }

        if (req.body.length > 0) {

            for (let index = 0; index < req.body.length; index++) {

                const response = await PostExercise({
                    body: req.body[index],
                    headers: {
                        authorization: req.headers.authorization
                    },
                    isGroup: true
                }, req)

                if (!response.already) {
                    finallyResponse.push(response)
                } else {
                    console.log(`Erro ao criar exercicio ${req.body[index]}, provavelmente ja existe`)
                }
            }
        }

        await p.$disconnect();
        return res.status(201).json(finallyResponse);

    },
    GetMyTrainings = async (req, res) => {

        const adminCheck = await jwtUncrypt(req.headers.authorization)

        if (!adminCheck?.user?.email) {
            return res.status(401).json({
                message: "Usuário não encontrado."
            });
        }

        try {
            const alreadyUser = await p.user.findFirst({
                where: {
                    id: adminCheck?.user?.id,
                    situation: 1,
                    deletedAt: null
                },
                include: {
                    client: true
                }
            });

            const data = await p.trainingAssignments.findMany({
                where: {
                    clientId: alreadyUser.client.id,
                    situation: 1,
                    deletedAt: null
                }
            });

            if (data) {
                await p.$disconnect();
                return res.status(201).json(data);
            } else {
                await p.$disconnect();
                return res.status(401).json({
                    message: "Nenhum treino encontrado."
                });
            }
        } catch (error) {
            await p.$disconnect();
            return res.status(401).json({
                message: "Error: Nenhum treino encontrado."
            });
        }

    },
    GetTrainingById = async (req, res) => {

        const adminCheck = await jwtUncrypt(req.headers.authorization)

        if (!adminCheck?.user) {
            return res.status(403).json({
                message: "Usuário não autorizado."
            });
        }

        const { id } = req.params;
        const data = await p.trainingAssignments.findFirst({
            where: {
                id: parseInt(id),
                situation: 1,
                deletedAt: null
            },
            include: {
                training: {
                    include: {
                        step: {
                            include: {
                                series: {
                                    include: {
                                        exercise: true
                                    }
                                }
                            }
                        }
                    }
                }
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

    }


module.exports = { PostExercise, PostTraining, PostStep, PostSerie, GetAllGroups, GetExercisesByGroup, PostExercisesOnGroup, PutTraining, TrainingPhotoUpdate, GetMyTrainings, GetTrainingById };