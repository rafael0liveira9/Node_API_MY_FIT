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

        const alreadyHaveExecution = await p.trainingExecution.findFirst({
            where: {
                id: req.body.executionId
            }
        })

        console.log('alreadyHaveExecution', alreadyHaveExecution)

        try {
            const newExecution = await p.trainingExecution.update({
                where: {
                    id: req.body.executionId
                },
                data: {
                    evaluation: req.body.evaluation,
                    observation: req.body.observation,
                    endAt: new Date()
                }
            })

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
            const newExecution = await p.serieExecution.create({
                data: {
                    exerciseId: req.body.exerciseId,
                    clientId: alreadyHave.client.id,
                    executionId: req.body.executionId,
                    difficulty: JSON.stringify(req.body.difficulty)
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
                    difficulty: JSON.stringify(req.body.difficulty)
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
    GetExecutionById = async (req, res) => {

        const adminCheck = await jwtUncrypt(req.headers.authorization)
        const { id } = req.params;

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
        if (!alreadyUser) {
            return res.status(403).json({
                message: "Usuário não autorizado."
            });
        }
        const x = await p.trainingExecution.findFirst({
            where: {
                id: parseInt(id),
            },
            include: {
                training: true

            }
        })

        const data = await p.trainingAssignments.findFirst({
            where: {
                id: x.training?.id,
                clientId: alreadyUser?.client?.id,
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


module.exports = { PostTrainingExecution, CompleteTrainingExecution, PostExerciseExecution, GetExecutionById };