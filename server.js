const express = require('express');
const bcrypt = require('bcrypt-nodejs');
const app = express();
const cors = require('cors');
const knex = require('knex');

const db = knex({
    client: 'pg',
    version: '7.2',
    connection: {
      host : '127.0.0.1',
      port : 5432,
      user : 'postgres',
      password : 'password',
      database : 'facedetection'
    }
  });


//Middleware to handle raw json
app.use(express.json());
//Middleware to handle form submissions
app.use(express.urlencoded({extended: false}));
app.use(cors());

//Root Route
app.get('/', (req, res) => {
    res.json('Success');
})

// For /SignIn
app.post('/signin', (req, res) => {
   db.select('email', 'hash')
   .where('email', '=', req.body.email)
   .from('login')
   .then(data => {
       const isValid = bcrypt.compareSync(req.body.password, data[0].hash)

       if(isValid){
           return db.select('*')
           .from('users')
           .where('email', '=', req.body.email)
           .then(user => {
               res.json(user[0])
           })
           .catch(err => res.status(400).json('Unable to load user'))
       }
       else{
        res.status(400).json('Wrong Credentials')
       }
       
   })
   .catch(err => res.status(400).json('Request Failed'))
})

//For /register
app.post('/register', (req,res) => {
    const {email, name, password} = req.body;
    const hash = bcrypt.hashSync(password); 
        db.transaction(trx => {
            trx.insert({
                hash: hash,
                email: email
            })
            .into('login')
            .returning('email')
            .then(loginEmail => {
                return trx('users')
                    .returning('*') //Returns all the columns
                    .insert({
                        email: loginEmail[0], 
                        name: name,
                        joined: new Date()
                    })
                    .then(user => {
                        res.json(user[0])
                    })
                })
                    .then(trx.commit)
                    .catch(trx.rollback)
            })
                .catch(err => res.status(400).json('Unable to register'))
            })

//For /profile
app.get('/profile/:id', (req,res) => {
    const {id} = req.params;
    db.select('*').from('users').where({id: id}).then(user => {
       if(user.length){
        res.json(user[0]);
       }
       else{
        res.status(400).json('Not found')
       }
    })
})

// For /image
app.put('/image', (req,res) => {
    const {id} = req.body;
    db('users')
    .where('id', '=', id)
    .increment('entries', 1)
    .returning('entries')
    .then(entries => res.json(entries[0]))
    .catch(err => res.status(400).json('Unable to get count'))
})

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server is working on port: ${PORT}`));


/*

/ --> this is working
/signin --> POST responds with success or fail  
/register --> POST returns a user object
/profile/:userId --> GET returns a user
/image --> PUT returns updated user object
*/