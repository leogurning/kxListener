const express 	= require('express');
const bodyParser  = require('body-parser');
const morgan      = require('morgan');
const mongoose    = require('mongoose');

const path = require('path');

const jwt    = require('jsonwebtoken'); 
const config = require('./config'); 

const user = require('./routes/user.js');

const artistLn = require('./routes/artistLn.js');
const albumLn = require('./routes/albumLn.js');
const songLn = require('./routes/songLn.js');

const port = process.env.PORT || config.serverport;

mongoose.connect(config.database, function(err){
	if(err){
		console.log('Error connecting database, please check if MongoDB is running.');
	}else{
		console.log('Connected to database...');
	}
}); 

const app = express();

// Enable CORS from client-side
app.use(function(req, res, next) {  
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Access-Control-Allow-Credentials");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    if ('OPTIONS' === req.method) { res.send(204); } else { next(); }
  });

app.use(express.static(path.join(__dirname, 'public')));

// use body parser so we can get info from POST and/or URL parameters
app.use(bodyParser.urlencoded({ extended: true }));
//app.use(require('body-parser').json({ type : '*/*' })); --> this can make error in JSON
app.use(bodyParser.json());

// use morgan to log requests to the console
app.use(morgan('dev'));

// basic routes
app.get('/', function(req, res) {
	res.send('Kaxet Listener API is running at api-kxlistener:' + port + '/api');
});

app.post('/registerListener', user.signupListener);
app.post('/checkfblistener/:id', user.checkFbListener);

// express router
var apiRoutes = express.Router();
app.use('/api', apiRoutes);
apiRoutes.post('/login', user.login);
apiRoutes.use(user.authenticate); // route middleware to authenticate and check token

// authenticated routes
apiRoutes.get('/', function(req, res) {
	res.status(201).json({ message: 'Welcome to the authenticated routes!' });
});

apiRoutes.get('/user/:id', user.getuserDetails); // API returns user details 
apiRoutes.put('/user/:id', user.updateUser); // API updates user details
apiRoutes.put('/password/:id', user.updatePassword); // API updates user password

apiRoutes.get('/artistln/:id', artistLn.getartist); // API returns artist details of given artist id
apiRoutes.post('/artistln/reportln', artistLn.artistreportLn); //API returns artist report based on user input 

apiRoutes.get('/albumln/:id', albumLn.getalbum); // API returns album details of given album id
apiRoutes.post('/albumln/reportln', albumLn.albumreportLn); //API returns album report based on user input 
apiRoutes.post('/albumln/aggreportln', albumLn.albumaggregateLn); //API returns album report based on user input

apiRoutes.post('/songln/aggreportln', songLn.songaggregateLn); //API returns song report based on user input
apiRoutes.post('/songln/reportln', songLn.songreportLn);
apiRoutes.put('/songbuyincrement/:id', songLn.songbuyincrement);
apiRoutes.get('/songln/:id', songLn.getsong); // API get song details of the label
apiRoutes.get('/songaggregate/:id', songLn.getsongaggregate); // API returns song details of given song id

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// kick off the server 
app.listen(port);

console.log('Kaxet Listener is listening at api-kxlistener:' + port);