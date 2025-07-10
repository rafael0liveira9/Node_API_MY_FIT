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

    console.log(req.body.name)

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
    PostSerie = async (req, res) => {
        const user = await jwtUncrypt(req.headers.authorization);
        const userId = user?.user?.id;


        if (!userId) {
            return res.status(401).json({ message: "Usuário não encontrado." });
        }

        try {


            const newSerie = await p.series.create({
                data: {
                    exerciseId: req.body.exercise,
                    isometry: req.body.isometry,
                    addSet: req.body.addSet,
                    bisetExerciseId: req.body.bisetExerciseId,
                    interval: req.body.interval,
                    trainingId: req.body.trainingId,
                    difficulty: JSON.stringify(req.body.difficulty),
                    amount: req.body.amount,
                    repetitions: req.body.repetitions,
                }
            });
            if (!newSerie) {
                throw new Error("Erro ao criar nova serie");
            }

            return res.status(200).json({
                message: "Serie cadastrado com sucesso",
                serie: newSerie
            });

        } catch (error) {
            console.error(error);
            throw error;
        }
    },
    PutSerie = async (req, res) => {
        const user = await jwtUncrypt(req.headers.authorization);
        const userId = user?.user?.id;


        if (!userId) {
            return res.status(401).json({ message: "Usuário não encontrado." });
        }

        try {
            const already = await p.series.findFirst({
                where: {
                    id: req.body.id,
                    situation: 1,
                    deletedAt: null
                }
            })

            if (!already) {
                p.$disconnect();
                return {
                    status: 404,
                    message: "Serie não cadastrada"
                }
            }

            const newSerie = await p.series.update({
                where: {
                    id: req.body.id,
                    situation: 1,
                    deletedAt: null
                },
                data: {
                    exerciseId: req.body.exercise,
                    isometry: req.body.isometry,
                    addSet: req.body.addSet,
                    bisetExerciseId: req.body.bisetExercise,
                    interval: req.body.interval,
                    difficulty: JSON.stringify(req.body.difficulty),
                    amount: req.body.amount,
                    repetitions: req.body.repetitions,
                }
            });
            if (!newSerie) {
                throw new Error("Erro ao editar nova serie");
            }

            return res.status(200).json({
                message: "Serie salva com sucesso",
                serie: newSerie
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
    DeleteTraining = async (req, res) => {
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
                return res.status(401).json({
                    message: "Falha ao deletrar, treino não existe!"
                });
            }

            const newTraining = await p.training.update({
                where: {
                    id: alreadyHave.id
                },
                data: {
                    situation: 1,
                    deletedAt: new Date()
                }
            });
            return res.status(200).json({
                status: 200,
                message: "Treino deletado com sucesso"
            });


        } catch (error) {
            console.error(error);
            return res.status(500).json({
                message: "Erro ao deletar treino"
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
                color: true,
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
    GetAllExercises = async (req, res) => {

        const adminCheck = await jwtUncrypt(req.headers.authorization)

        if (!adminCheck?.user) {
            return res.status(403).json({
                message: "Usuário não autorizado."
            });
        }
        const data = await p.exercise.findMany({
            where: {
                situation: 1,
                deletedAt: null
            },
            select: {
                id: true,
                name: true,
                groupMuscleId: true,
                description: true,
                image: true,
                authorId: true,
                video: true,

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

                console.log('response', !!response.already, response)

                if (!!response.already) {
                    console.log(`Erro ao criar exercicio ${req.body[index]}, provavelmente ja existe`)
                } else {
                    finallyResponse.push(response)
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

            const assignments = await p.trainingAssignments.findMany({
                where: {
                    clientId: alreadyUser.client.id,
                    situation: 1,
                    deletedAt: null
                },
                include: {
                    training: true,
                    trainingExecution: {
                        take: 1,
                        orderBy: {
                            startAt: 'desc'
                        }
                    },
                }
            });

            const trainingIds = assignments.map(a => a.training.id);

            const evaluations = await p.trainingEvaluations.groupBy({
                by: ['trainingId'],
                where: {
                    trainingId: { in: trainingIds }
                },
                _avg: {
                    evaluation: true
                }
            });


            const assignmentsWithAvg = assignments.map(a => {
                const evaluationObj = evaluations.find(e => e.trainingId === a.training.id);
                const avg = evaluationObj?._avg?.evaluation ?? null;

                return {
                    ...a,
                    training: {
                        ...a.training,
                        evaluation: avg
                    }
                };
            });

            const sortedAssignments = assignmentsWithAvg.sort((a, b) => {
                const aExec = a.trainingExecution[0];
                const bExec = b.trainingExecution[0];

                const aIsRunning = aExec && aExec.startAt && !aExec.endAt;
                const bIsRunning = bExec && bExec.startAt && !bExec.endAt;

                if (aIsRunning && !bIsRunning) return -1;
                if (!aIsRunning && bIsRunning) return 1;

                const aStart = aExec?.startAt ? new Date(aExec.startAt).getTime() : 0;
                const bStart = bExec?.startAt ? new Date(bExec.startAt).getTime() : 0;

                return aStart - bStart;
            });



            if (sortedAssignments) {
                await p.$disconnect();
                return res.status(200).json(sortedAssignments);
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
                        series: {
                            include: {
                                exercise: true
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
            return res.status(401).json(null);
        }

    }


module.exports = { PostExercise, PostTraining, PostSerie, GetAllGroups, GetExercisesByGroup, PostExercisesOnGroup, PutTraining, TrainingPhotoUpdate, GetMyTrainings, GetTrainingById, DeleteTraining, GetAllExercises, PutSerie };