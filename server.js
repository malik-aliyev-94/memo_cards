// server.js
var express = require('express');
var app = express();
var bodyParser = require("body-parser");
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var sqlite3 = require('sqlite3');
var rp = require('request-promise');
var $ = require('cheerio');

console.log(path.join(__dirname, '..', 'files', 'app.db'));
var db = new sqlite3.Database(path.join(__dirname, 'app.db').replace('/app.asar', ''), (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Connected to the app database.');
});
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/app'));

app.get('/', function(req, res, next) {
  db.all('SELECT * FROM vocabulary',[],(err, rows ) => {
    if (err) {
      res.render( 'index', {data: []});
    }
    res.render( 'index', {data: rows});
  });
  // res.render( 'index', {data: []});
});

app.get('/train', function(req, res, next) {
  db.get(`SELECT COUNT(*) as count FROM vocabulary WHERE status=0`, [], (err, row) => {
    if (err) {
      return console.log(err.message);
    }

    res.render('train', {
      count: row['count']
    });
  });
  
});

app.get('/random', function(req, res, next) {
  var except = req.query.except ? req.query.except : '[]';
  var exceptArr = JSON.parse(except);
  var result = {};
  db.get('SELECT *, (SELECT COUNT(*) as count FROM vocabulary WHERE status=0) as count FROM vocabulary WHERE status=0 AND id NOT IN('+exceptArr.join(',')+') ORDER BY RANDOM() LIMIT 1', [], (err, row) => {
    if (err) {
      return console.log(err.message);
    }
    if (!row) {
      result = {
        data: {},
        empty: true
      }
    } else {
      result = {
        data: row,
        empty: false
      }
    }

    res.json(result);
  });
  
});

app.post('/update', function(req, res, next) {
  db.run(`UPDATE vocabulary SET flip=?, status=? WHERE id=?`, [req.body.flip, req.body.status, req.body.id], function(err) {
    if (err) {
      return console.error(err.message);
    }
    console.log(`Row(s) updated: ${this.changes}`);
  });
  res.json([req.body, req.query]);

});

app.post('/scrap', function(req, res, next) {
  var id = req.body.id;
  // var id = 5;
  
  db.get(`SELECT * FROM vocabulary WHERE id=?`, [id], (err, row) => {
    if (err) {
      return console.log(err.message);
    }

    var url = `https://www.vocabulary.com/dictionary/${encodeURIComponent(row.source)}`;
    rp(url)
      .then(function(html){
        //update here
        var content = $('.wordPage', html).parent().html();
        db.run(`UPDATE vocabulary SET examples=? WHERE id=?`, [content, id], function(err) {
          if (err) {
            return console.error(err.message);
          }
          console.log(`Row(s) updated: ${this.changes}`);
          res.send(content);
        });
      })
      .catch(function(err){
        //handle error
      });
  });
});


io.on('connection', function(client) {
  console.log('Client connected...');

  client.on('join', function(data) {
    console.log(data);
  });

  client.on('add', function(data) {
    // { 
    //   source: 'contemporary',
    //   translit: 'kənˈtempəˌrerē',
    //   translation: 'современный' 
    // }
    db.get(`SELECT COUNT(*) as count FROM vocabulary WHERE source="${data['source']}"`, [], (err, row) => {
      if (err) {
        client.emit('result', {
          result: false,
          message: 'Can\'t execute select query.'
        });
        return console.log(err.message);
      }
    
      if (row['count']) {
        // exists
        client.emit('result', {
          result: false,
          message: 'Source already exists.'
        });
      } else {
        db.run(`INSERT INTO vocabulary(source, translit, translation) VALUES(?, ?, ?)`, [data['source'], data['translit'], data['translation']], function(err) {
          if (err) {
            client.emit('result', {
              result: false,
              message: 'Can\'t insert new source.'
            });
            return console.log(err.message);
          }
          // get the last insert id
          client.emit('result', {
            result: true,
            message: 'New source have been inserted.',
            id: this.lastID
          });
          io.emit('new-word', {
            source: data['source']
          });
        });
      }
    });
  });

})

server.listen(4200);