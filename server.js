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

// console.log(path.join(__dirname, '..', 'files', 'app.db'));
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

    var training = rows.filter((row) => {
      return row.status == 1
    });

    var learned = rows.filter((row) => {
      return row.status == 2
    });

    var stat = {
      all: rows.length,
      training: training.length,
      learned: learned.length,
      must: rows.length - (training.length + learned.length)
    }

    res.render( 'index', {data: rows, stat});
  });
  // res.render( 'index', {data: []});
});

app.get('/edit', function(req, res, next) {
  var id = req.query.id ? parseInt(req.query.id) : 0;
  db.get('SELECT * FROM vocabulary WHERE id=?',[id],(err, row ) => {
    if (err) {
      res.render( 'edit', {data: null});
    }
    res.render( 'edit', {data: row});
  });
});

app.post('/edit', function(req, res, next) {
  var id = req.query.id ? parseInt(req.query.id) : 0;
  var data = req.body;
  if (data.source.trim() === '' || data.translation.trim() === '') {
    res.json({
      result: false
    });
  } else {
    db.run(`UPDATE vocabulary SET source=?, translit=?, translation=?, synonyms=?, antonyms=?, context=? WHERE id=?`, [data.source.trim(), data.translit.trim(), data.translation.trim(), data.synonyms.trim(), data.antonyms.trim(), data.context.trim(), id], function(err) {
      if (err) {
        console.log(err);
        return res.json({
          result: false
        });
      }
      res.json({
        result: true,
        affected: `Row(s) updated: ${this.changes}`
      });
    });
  }
});

app.get('/create', function(req, res, next) {
  res.render( 'create');
});

app.post('/create', function(req, res, next) {
  var id = req.query.id ? parseInt(req.query.id) : 0;
  var data = req.body;
  if (data.source.trim() === '' || data.translation.trim() === '') {
    res.json({
      result: false
    });
  } else {

    db.run(`INSERT INTO vocabulary(source, translit, translation, synonyms, antonyms, context) VALUES(?, ?, ?, ?, ?, ?)`, [data['source'], data['translit'], data['translation'], data['synonyms'], data['antonyms'], data['context']], function(err) {
      if (err) {
        console.log(err);
        return res.json({
          result: false
        });
      }

      // res.redirect('/edit?id='+this.lastID);
      res.json({
        result: true,
        affected: `Row(s) updated: ${this.changes}`,
        id: this.lastID
      });
    });

  }
});

app.get('/remove', function(req, res, next) {
  var id = req.query.id ? parseInt(req.query.id) : 0;
  db.run('DELETE FROM vocabulary WHERE id=?',[id],(err) => {
    if (err) {
      res.send('fail');
    }
    res.send('success');
  });
});

app.get('/remove-selected', function(req, res, next) {
  var ids = req.query.ids ? req.query.ids : 0;
  db.run('DELETE FROM vocabulary WHERE id IN ('+ids+')', [] , (err) => {
    if (err) {
      console.log(err);
      return res.send('fail');
    }
    res.send('success');
  });
});

app.get('/view', function(req, res, next) {
  var id = req.query.id ? parseInt(req.query.id) : 0;
  db.get('SELECT * FROM vocabulary WHERE id=?',[id],(err, row ) => {
    if (err) {
      res.render( 'view', {data: null});
    }
    res.render( 'view', {data: row});
  });
});

app.get('/train', function(req, res, next) {
  db.get(`SELECT COUNT(*) as count FROM vocabulary WHERE status=1`, [], (err, row) => {
    if (err) {
      return console.log(err.message);
    }

    res.render('train', {
      count: row['count']
    });
  });
});

app.post('/train', function(req, res, next) {
  var ids = req.query.ids ? req.query.ids : 0;
  
  db.run('UPDATE vocabulary SET status=1 WHERE id IN ('+ids+')', [] , (err) => {
    if (err) {
      console.log(err);
      return res.send('fail');
    }
    res.send('success');
  });
});

app.get('/random', function(req, res, next) {
  var except = req.query.except ? req.query.except : '[]';
  var exceptArr = JSON.parse(except);
  var result = {};
  db.get('SELECT *, (SELECT COUNT(*) as count FROM vocabulary WHERE status=0) as count FROM vocabulary WHERE status=1 AND id NOT IN('+exceptArr.join(',')+') ORDER BY RANDOM() LIMIT 1', [], (err, row) => {
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

app.post('/update-status', function(req, res, next) {
  db.run(`UPDATE vocabulary SET status=?`, [req.body.status], function(err) {
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