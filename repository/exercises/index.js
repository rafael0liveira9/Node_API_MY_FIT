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
                    repetitions: JSON.stringify(req.body.repetitions),
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
                    repetitions: JSON.stringify(req.body.repetitions),
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

        const { name, description, level, url, photo, assign } = req.body;

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

            let newAssignment = null
            if (assign === true) {
                newAssignment = await p.trainingAssignments.create({
                    data: {
                        clientId: alreadyUser.client.id,
                        trainingId: newTraining.id,
                        responsibleId: alreadyUser.client.id
                    }
                });

                console.log('qaaaaz', newAssignment)
            }


            if (newTraining) {
                return res.status(200).json({
                    message: "Treino cadastrado com sucesso",
                    newAssignment: assign && newAssignment !== null ? true : false,
                    newTraining: newTraining
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

        const { id } = req.body;

        try {

            const alreadyHave = await p.trainingAssignments.findFirst({
                where: {
                    id: id,
                }
            });

            if (!alreadyHave) {
                return res.status(401).json({
                    message: "Falha ao deletrar, treino não existe!"
                });
            }

            const deleteTraining = await p.trainingAssignments.update({
                where: {
                    id: alreadyHave.id
                },
                data: {
                    situation: 0,
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
    AssignTraining = async (req, res) => {
        const user = await jwtUncrypt(req.headers.authorization);
        const userId = user?.user?.id;

        if (!userId) {
            return res.status(401).json({ message: "Usuário não encontrado." });
        }

        const { trainingId, clientId } = req.body;

        try {
            const alreadyUser = await p.client.findFirst({
                where: {
                    id: clientId,
                    situation: 1,
                }
            });

            console.log('alreadyUser', alreadyUser)

            const alreadyHave = await p.trainingAssignments.findFirst({
                where: {
                    trainingId: trainingId,
                    clientId: clientId,
                    situation: 1
                }
            });

            console.log('alreadyHave', alreadyHave)

            if (alreadyHave) {
                return res.status(401).json({
                    message: "Você já possui este treino!"
                });
            }
            const newTraining = await p.trainingAssignments.create({
                data: {
                    trainingId: trainingId,
                    clientId: clientId,
                }
            });



            if (newTraining) {
                return res.status(200).json(newTraining);
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


        if (!adminCheck?.user) {
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
    GetMyTrainings = async (req, res, personalId) => {

        const adminCheck = await jwtUncrypt(req.headers.authorization)
        let filter = {};

        if (!adminCheck?.user?.email) {
            return res.status(401).json({
                message: "Usuário não encontrado."
            });
        }

        if (personalId) {
            filter.personalId = Number(personalId);
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
                    training: {
                        include: {
                            user: true,
                            trainingEvaluations: true,
                            trainingExecution: {
                                take: 1,
                                orderBy: {
                                    startAt: 'desc'
                                }
                            },
                        }
                    },

                }
            });
            const FOUR_HOURS_IN_MS = 4 * 60 * 60 * 1000;
            const assignmentsWithExecution = assignments.map((a) => {
                const executions = a.training.trainingExecution || [];

                const validDurations = executions
                    .filter(e => e.startAt && e.endAt)
                    .map(e => {
                        const start = new Date(e.startAt).getTime();
                        const end = new Date(e.endAt).getTime();
                        const duration = end - start;
                        return duration < FOUR_HOURS_IN_MS ? duration / 1000 : null; // segundos
                    })
                    .filter(duration => duration !== null);

                const avgExecutionTime =
                    validDurations.length > 0
                        ? validDurations.reduce((sum, d) => sum + d, 0) / validDurations.length
                        : null;

                return {
                    ...a,
                    executionTime: avgExecutionTime
                };
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


            const assignmentsWithAvg = assignmentsWithExecution.map(a => {
                const evaluationObj = evaluations.find(e => e.trainingId === a.training.id);
                const avg = evaluationObj?._avg?.evaluation ?? null;

                return {
                    ...a,
                    training: {
                        ...a.training,
                        evaluation: avg,
                    }
                };
            });

            const sortedAssignments = assignmentsWithAvg.sort((a, b) => {
                const aExec = a.training.trainingExecution[0];
                const bExec = b.training.trainingExecution[0];

                const aIsRunning = aExec && aExec.startAt && !aExec.endAt;
                const bIsRunning = bExec && bExec.startAt && !bExec.endAt;

                if (aIsRunning && !bIsRunning) return -1;
                if (!aIsRunning && bIsRunning) return 1;

                const aStart = aExec?.startAt ? new Date(aExec.startAt).getTime() : 0;
                const bStart = bExec?.startAt ? new Date(bExec.startAt).getTime() : 0;

                return aStart - bStart;
            });


            if (sortedAssignments) {
                let result = sortedAssignments;

                if (personalId) {
                    result = result.filter(
                        a => (a.responsibleId === Number(personalId) && a.isShop === 0)
                    );
                } else {
                    result = result.filter(
                        a => (a.responsibleId === alreadyUser.client.id || a.isShop === 1)
                    );
                }

                await p.$disconnect();
                return res.status(200).json(result);
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
                                exercise: true,
                                serieExecution: true,
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

    },
    EvaluationUpdate = async (req, res) => {
        const adminCheck = await jwtUncrypt(req.headers.authorization)

        if (!adminCheck?.user) {
            return res.status(403).json({
                message: "Usuário não autorizado."
            });
        }

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

        const data = await p.trainingEvaluations.update({
            where: {
                id: req.body.id,
                clientId: alreadyUser.client?.id
            },
            data: {
                evaluation: req.body.evaluation,
                observation: req.body.observation,
                updatedAt: new Date()
            }
        })

        if (data) {
            await p.$disconnect();
            return res.status(201).json(data);
        } else {
            await p.$disconnect();
            return res.status(401).json(null);
        }
    },
    GetShopWithTrainings = async (req, res) => {
        const shopsRaw = await p.shop.findMany({
            where: { situation: 1 },
            take: 50,
            include: {
                training: {
                    include: {
                        user: true,
                        trainingEvaluations: {
                            take: 50,
                            orderBy: { createdAt: 'desc' },
                        },
                        trainingExecution: {
                            take: 50,
                            orderBy: { startAt: 'desc' },
                        }
                    }
                }
            }
        });

        const FOUR_HOURS_IN_MS = 4 * 60 * 60 * 1000;

        const calculateExecutionAvg = (executions) => {
            const validDurations = executions
                .filter(e => e.startAt && e.endAt)
                .map(e => {
                    const start = new Date(e.startAt).getTime();
                    const end = new Date(e.endAt).getTime();
                    const duration = end - start;
                    return duration < FOUR_HOURS_IN_MS ? duration / 1000 : null;
                })
                .filter(duration => duration !== null);

            return validDurations.length > 0
                ? validDurations.reduce((sum, d) => sum + d, 0) / validDurations.length
                : null;
        };

        const calculateEvaluationAvg = (evaluations) => {
            if (!evaluations || evaluations.length === 0) return null;
            const sum = evaluations.reduce((acc, e) => acc + (e.evaluation || 0), 0);
            return sum / evaluations.length;
        };

        const result = shopsRaw.map(shop => {
            const training = shop.training;

            if (!training) return shop;

            const executionAvg = calculateExecutionAvg(training.trainingExecution || []);
            const evaluationAvg = calculateEvaluationAvg(training.trainingEvaluations || []);

            return {
                ...shop,
                training: {
                    ...training,
                    executionTime: executionAvg,
                    evaluation: evaluationAvg,
                }
            };
        });

        const sortedShops = shopsRaw.sort((a, b) => {
            const aUser = a.training?.user;
            const bUser = b.training?.user;

            // 1. Prioridade: userType (menor = mais importante)
            if (aUser?.userType !== bUser?.userType) {
                return aUser?.userType - bUser?.userType;
            }

            // 2. Prioridade: entre os userType 4 e 5, quem tem CREF vem primeiro
            if ((aUser?.userType === 4 || aUser?.userType === 5) &&
                (bUser?.userType === 4 || bUser?.userType === 5)) {
                const aHasCref = aUser?.cref ? 1 : 0;
                const bHasCref = bUser?.cref ? 1 : 0;

                if (aHasCref !== bHasCref) {
                    return bHasCref - aHasCref;
                }
            }

            // 3. Prioridade: média de avaliações (maior primeiro)
            const aAvg =
                (a.training?.trainingEvaluations?.reduce((acc, cur) => acc + cur.rating, 0) || 0) /
                (a.training?.trainingEvaluations?.length || 1);

            const bAvg =
                (b.training?.trainingEvaluations?.reduce((acc, cur) => acc + cur.rating, 0) || 0) /
                (b.training?.trainingEvaluations?.length || 1);

            return bAvg - aAvg;
        });

        if (sortedShops) {
            await p.$disconnect();
            return res.status(201).json(sortedShops);
        } else {
            await p.$disconnect();
            return res.status(401).json(null);
        }

    }




module.exports = { PostExercise, PostTraining, PostSerie, GetAllGroups, GetExercisesByGroup, PostExercisesOnGroup, PutTraining, TrainingPhotoUpdate, GetMyTrainings, GetTrainingById, DeleteTraining, GetAllExercises, PutSerie, EvaluationUpdate, GetShopWithTrainings, AssignTraining };