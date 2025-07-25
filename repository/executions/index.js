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

const PostTrainingExecution = async (req, res) => {
    console.log('PostTrainingExecution 🚀')

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

    const alreadyHave = await p.user.findFirst({
        where: {
            id: user.user.id,
            deletedAt: null
        },
        include: {
            client: true
        }
    })

    try {
        const newExecution = await p.trainingExecution.create({
            data: {
                trainingId: req.body.trainingId,
                clientId: alreadyHave.client.id,
                startAt: new Date()
            }
        })

        if (!newExecution) {
            return res.status(500).json({
                message: "Erro ao iniciar execução",
            });
        }

        await p.$disconnect();
        return res.status(200).json({
            execution: newExecution
        });
    } catch (error) {
        await p.$disconnect();
        console.log(error)
        return res.status(500).json({
            message: "Erro ao iniciar execução"
        });
    }

},
    CompleteTrainingExecution = async (req, res) => {
        console.log('CompleteTrainingExecution 🚀')

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


        try {

            const newExecution = await p.trainingExecution.update({
                where: {
                    id: req.body.executionId
                },
                data: {
                    endAt: new Date()
                }
            })

            let newEvaluation = null;
            if (!!req.body.evaluation && req.body.evaluation < 6 && !!alreadyUser.client?.id) {
                console.log("1");
                const newEvaluation = await p.trainingEvaluations.create({
                    data: {
                        trainingId: newExecution?.trainingId,
                        evaluation: req.body.evaluation,
                        observation: req.body.observation,
                        clientId: alreadyUser.client?.id,
                    },
                });
                console.log("2", newEvaluation);
            }

            if (!newExecution) {
                return res.status(500).json({
                    message: "Erro ao finalizar execução"
                });
            }

            await p.$disconnect();
            return res.status(200).json({
                message: "Execução finalizada"
            });
        } catch (error) {
            await p.$disconnect();
            console.log(error)
            return res.status(500).json({
                message: "Erro ao finalizar execução"
            });
        }

    },
    PostExerciseExecution = async (req, res) => {
        console.log('PostExerciseExecution 🚀')

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

        const alreadyHave = await p.user.findFirst({
            where: {
                id: user.user.id,
                deletedAt: null
            },
            include: {
                client: true
            }
        })


        if (!alreadyHave) {
            return res.status(401).json({
                message: "Usuário não encontrado."
            });
        }

        const alreadySerie = await p.series.findFirst({
            where: {
                id: req.body.exerciseId,
                deletedAt: null
            }
        })

        try {
            const difficultyStringfied = JSON.stringify(req.body.difficulty)
            let record;
            if (Array.isArray(req.body.difficulty) && req.body.difficulty.length > 0) {
                record = req.body.difficulty.reduce((max, item) => {
                    const num = +item;
                    return num > max ? num : max;
                }, -Infinity);
            } else {
                record = null;
            }

            const newExecution = await p.serieExecution.create({
                data: {
                    exerciseId: req.body.exerciseId,
                    clientId: alreadyHave.client.id,
                    executionId: req.body.executionId,
                    difficulty: difficultyStringfied
                }
            })


            if (!newExecution) {
                return res.status(500).json({
                    message: "Erro ao iniciar execução"
                });
            }

            const difficultyUpdate = await p.series.update({
                where: {
                    id: req.body.exerciseId
                },
                data: {
                    personalRecord: !!record && (alreadySerie.personalRecord === null || record > +alreadySerie.personalRecord) ? record.toString() : alreadySerie.personalRecord,
                    difficulty: difficultyStringfied
                }
            })

            await p.$disconnect();
            return res.status(200).json({
                message: "Execução iniciada"
            });
        } catch (error) {
            await p.$disconnect();
            console.log(error)
            return res.status(500).json({
                message: "Erro ao iniciar execução"
            });
        }

    },
    GetLastExecution = async (req, res) => {
        try {
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
                include: {
                    client: true,
                },
            });

            if (!alreadyUser || !alreadyUser.client) {
                return res.status(403).json({ message: "Usuário não autorizado." });
            }

            const lastExecution = await p.trainingExecution.findFirst({
                where: {
                    clientId: alreadyUser.client.id,
                },
                include: {
                    training: true,
                },
                orderBy: {
                    startAt: "desc",
                },
            });

            if (!lastExecution) {
                return res.status(200).json(null);
            }

            const start = new Date(lastExecution.startAt);
            const end = new Date(lastExecution.endAt);
            const now = new Date();

            const isToday =
                start.getFullYear() === now.getFullYear() &&
                start.getMonth() === now.getMonth() &&
                start.getDate() === now.getDate();

            const durationMs = end.getTime() - start.getTime();
            const totalMinutes = Math.floor(durationMs / 60000);
            const hours = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
            const minutes = (totalMinutes % 60).toString().padStart(2, "0");

            const response = {
                todayTraining: isToday,
                duration: `${hours}:${minutes}`,
                trainingExecution: lastExecution,
            };

            return res.status(200).json(response);
        } catch (error) {
            console.error("Erro ao buscar última execução de treinamento:", error);
            return res.status(500).json({ message: "Erro interno no servidor." });
        } finally {
            await p.$disconnect();
        }
    },
    GetExecutionById = async (req, res) => {
        const { id } = req.params;
        try {
            const adminCheck = await jwtUncrypt(req.headers.authorization);

            if (!adminCheck?.user) {
                return res.status(403).json({ message: "Usuário não autorizado." });
            }

            const alreadyUser = await p.user.findFirst({
                where: {
                    id: adminCheck.user.id,
                    situation: 1,
                    deletedAt: null
                },
                include: {
                    client: true
                }
            });

            if (!alreadyUser) {
                return res.status(403).json({ message: "Usuário não autorizado." });
            }

            const trainingExecution = await p.trainingExecution.findFirst({
                where: { id: parseInt(id) },
                include: { training: true }
            });

            if (!trainingExecution) {
                return res.status(404).json({ message: "Execução de treinamento não encontrada." });
            }


            const assignment = await p.trainingAssignments.findFirst({
                where: {
                    trainingId: trainingExecution.training?.id,
                    clientId: alreadyUser.client?.id,
                    situation: 1,
                    deletedAt: null
                },
                include: {
                    training: {
                        include: {
                            user: true,
                            trainingEvaluations: {
                                where: {
                                    clientId: alreadyUser.client?.id
                                }
                            },
                            trainingExecution: {
                                where: {
                                    clientId: alreadyUser.client?.id
                                },
                                take: 1,
                                orderBy: {
                                    startAt: 'desc'
                                }
                            },
                            series: {
                                include: {
                                    exercise: true,
                                    serieExecution: {
                                        take: 1,
                                        where: {
                                            executionId: +id
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });
            console.log('1')
            const totalMyExecutions = await p.trainingExecution.count({
                where: {
                    clientId: alreadyUser.client?.id,
                    trainingId: trainingExecution.training?.id,
                }
            });

            console.log('1', totalMyExecutions)
            const evaluations = await p.trainingEvaluations.groupBy({
                by: ['trainingId'],
                where: {
                    trainingId: assignment.training.id
                },
                _avg: {
                    evaluation: true
                }
            });


            const evaluationObj = evaluations.find(e => e.trainingId === assignment.training.id);
            const avg = evaluationObj?._avg?.evaluation ?? null;

            const assignmentWithAvg = {
                ...assignment,
                executionsCount: totalMyExecutions,
                training: {
                    ...assignment.training,
                    evaluation: avg,
                },
            };


            if (!assignmentWithAvg) {
                return res.status(401).json({ message: "Treinamento não autorizado ou não encontrado." });
            }

            return res.status(200).json(assignmentWithAvg);
        } catch (error) {
            console.error("Erro ao buscar execução de treinamento:", error);
            return res.status(500).json({ message: "Erro interno no servidor." });
        } finally {
            await p.$disconnect();
        }
    };



module.exports = { PostTrainingExecution, CompleteTrainingExecution, PostExerciseExecution, GetExecutionById, GetLastExecution };