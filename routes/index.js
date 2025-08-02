const { Router, json, urlencoded } = require('express'),
    moment = require('moment'),
    multer = require('multer'),
    user = require('../repository/user'),
    shop = require('../repository/shop'),
    general = require('../repository/general'),
    relations = require('../repository/relationships'),
    exercises = require('../repository/exercises'),
    executions = require('../repository/executions'),
    posts = require('../repository/posts'),
    s3 = require('../repository/s3'),
    router = Router();

const upload = multer();

router.use(json());
router.use(urlencoded({ extended: true }));
router.get('/', async (_, res) => res.json({ message: process.env.TEST }));

// *********************************************************************************************** s3 ROUTES
router.post('/upload-image', upload.single('file'), async (req, res) => s3.ImportImageToS3(req, res));

// *********************************************************************************************** USER ROUTES
router.get('/user/:id', async (req, res) => user.GetUserById(req, res)),
    router.get('/get-my-user', async (req, res) => user.GetMyUser(req, res)),
    router.post('/user/:type', async (req, res) => user.SignUp(req, res)),
    router.post('/sign-in', async (req, res) => user.SignIn(req, res)),
    router.put('/user', async (req, res) => user.EditUser(req, res)),
    router.put('/photo-user', upload.single('file'), async (req, res) => user.PhotoUpdate(req, res)),
    router.put('/background-user', upload.single('file'), async (req, res) => user.backgroundImageUpdate(req, res)),
    router.put('/suspend-user', async (req, res) => user.SuspendUser(req, res)),
    router.put('/delete-user/:id', async (req, res) => user.DeleteUser(req, res));

// *********************************************************************************************** EXERCISES ROUTES
router.get('/groups', async (req, res) => exercises.GetAllGroups(req, res)),
    router.get('/exercises', async (req, res) => exercises.GetAllExercises(req, res)),
    router.get('/exercises/:id', async (req, res) => exercises.GetExercisesByGroup(req, res)),
    router.get('/shop', async (req, res) => shop.GetShopWithTrainings(req, res)),
    router.get('/shop/training/:id', async (req, res) => shop.GetShopTrainingById(req, res)),
    router.get('/trainings', async (req, res) => exercises.GetMyTrainings(req, res)),
    router.get('/training/:id', async (req, res) => exercises.GetTrainingById(req, res)),
    router.post('/exercise', async (req, res) => exercises.PostExercise(req, res)),
    router.post('/exercise-on-group', async (req, res) => exercises.PostExercisesOnGroup(req, res)),
    router.post('/serie', async (req, res) => exercises.PostSerie(req, res)),
    router.post('/training', async (req, res) => exercises.PostTraining(req, res)),
    router.post('/assign-training', async (req, res) => exercises.AssignTraining(req, res)),
    router.put('/photo-training', upload.single('file'), async (req, res) => exercises.TrainingPhotoUpdate(req, res)),
    router.put('/training', async (req, res) => exercises.PutTraining(req, res)),
    router.put('/evaluation-update', async (req, res) => exercises.EvaluationUpdate(req, res)),
    router.put('/serie', async (req, res) => exercises.PutSerie(req, res)),
    router.put('/unassign-training', async (req, res) => exercises.DeleteTraining(req, res));


// *********************************************************************************************** EXECUTION ROUTES
router.get('/last-execution/', async (req, res) => executions.GetLastExecution(req, res)),
    router.get('/execution/:id', async (req, res) => executions.GetExecutionById(req, res)),
    router.post('/execution-training', async (req, res) => executions.PostTrainingExecution(req, res)),
    router.post('/execution-exercise', async (req, res) => executions.PostExerciseExecution(req, res)),
    router.put('/complete-execution-training', async (req, res) => executions.CompleteTrainingExecution(req, res));

// *********************************************************************************************** POST ROUTES
router.get('/posts', async (req, res) => posts.GetAllPosts(req, res)),
    router.get('/my-posts', async (req, res) => posts.GetMyPosts(req, res)),
    router.post('/post', async (req, res) => posts.PostPostkk(req, res)),
    router.put('/post', async (req, res) => posts.PutPostkk(req, res)),
    router.put('/delete-post', async (req, res) => posts.DeletePostkk(req, res));

// *********************************************************************************************** FAQ ROUTES
router.get('/faq', async (req, res) => general.GetFaq(req, res));

// *********************************************************************************************** RELATIONSHIPS ROUTES
router.get('/friends', async (req, res) => relations.GetMyFriends(req, res)),
    router.get('/friends-request', async (req, res) => relations.GetMyFriendRequest(req, res)),
    router.get('/personal-request', async (req, res) => relations.GetMyPersonalsRequest(req, res)),
    router.post('/personal-request-post', async (req, res) => relations.PostRelationship(req, res)),
    router.post('/friends-request-post', async (req, res) => relations.PostFriendship(req, res)),
    router.put('/personal-accept', async (req, res) => relations.AcceptRelationship(req, res)),
    router.put('/friends-accept', async (req, res) => relations.AcceptFriendship(req, res));

module.exports = router