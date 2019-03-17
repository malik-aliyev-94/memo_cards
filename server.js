var express = require('express');
var app = express();

var bodyParser = require("body-parser");
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var sqlite3 = require('sqlite3');
var rp = require('request-promise');
var $ = require('cheerio');

// Database connection
var db = new sqlite3.Database(path.join(__dirname, 'app.db').replace('/app.asar', ''), (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('database: Connected');
});

// Express.js configurations & middlewares
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/app'));

// Index page --> vocabulary
app.get('/', function(req, res, next) {
  db.all('SELECT * FROM vocabulary',[],(err, rows ) => {
    if (err) {
      return res.render( 'index', {data: []});
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

// View word
app.get('/view', function(req, res, next) {
  var id = req.query.id ? parseInt(req.query.id) : 0;
  db.get('SELECT * FROM vocabulary WHERE id=?',[id],(err, row ) => {
    if (err) {
      return res.render( 'view', {data: null});
    }
    res.render( 'view', {data: row});
  });
});

// Add new word
app.route('/create')
  .get(function(req, res, next) {
    res.render( 'create');
  })
  .post(function(req, res, next) {
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

        let row = [
          `<label><input type="checkbox" class="check-word" value=${this.lastID} /><span></span></label>`,
          data['source'],
          data['translation'],
          `<span class="new badge red" data-badge-caption="">must be learned</span>`,
          `<a style="padding: 0 8px;" class="btn btn-small blue modal-trigger load-content" data-href="/view?id=${this.lastID}" data-c=".modal-content" href="#modal1"><i class="material-icons dp48">description</i></a>
           <a style="padding: 0 8px;" class="btn btn-small orange modal-trigger load-content" data-href="/edit?id=${this.lastID}" data-c=".modal-content" href="#modal1"><i class="material-icons dp48">edit</i></a> 
           <a style="padding: 0 8px;" class="btn btn-small black remove-this" href="#" data-href="/remove?id=${this.lastID}"><i class="material-icons dp48">clear</i></a>`
        ];

        res.json({
          result: true,
          affected: `Row(s) updated: ${this.changes}`,
          id: this.lastID,
          row
        });
      });
    }
  });

// Edit word
app.route('/edit')
  .get(function(req, res, next) {
    var id = req.query.id ? parseInt(req.query.id) : 0;
    db.get('SELECT * FROM vocabulary WHERE id=?',[id],(err, row ) => {
      if (err) {
        res.render( 'edit', {data: null});
      }
      res.render( 'edit', {data: row});
    });
  })
  .post(function(req, res, next) {
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

        let row = [
          `<label><input type="checkbox" class="check-word" value=${id} /><span></span></label>`,
          data.source.trim(),
          data.translation.trim(),
          `-`,
          `<a style="padding: 0 8px;" class="btn btn-small blue modal-trigger load-content" data-href="/view?id=${id}" data-c=".modal-content" href="#modal1"><i class="material-icons dp48">description</i></a> 
           <a style="padding: 0 8px;" class="btn btn-small orange modal-trigger load-content" data-href="/edit?id=${id}" data-c=".modal-content" href="#modal1"><i class="material-icons dp48">edit</i></a> 
           <a style="padding: 0 8px;" class="btn btn-small black remove-this" href="#" data-href="/remove?id=${id}"><i class="material-icons dp48">clear</i></a>`
        ];

        res.json({
          result: true,
          affected: `Row(s) updated: ${this.changes}`,
          row
        });
      });
    }
  });

// Remove word
app.delete('/remove', function(req, res, next) {
  var id = req.query.id ? parseInt(req.query.id) : 0;
  db.run('DELETE FROM vocabulary WHERE id=?',[id],(err) => {
    if (err) {
      return es.send('fail');
    }
    res.send('success');
  });
});

// Remove selected words
app.delete('/remove-selected', function(req, res, next) {
  var ids = req.query.ids ? req.query.ids : 0;
  db.run(`DELETE FROM vocabulary WHERE id IN (${ids})`, [] , (err) => {
    if (err) {
      console.log(err);
      return res.send('fail');
    }
    res.send('success');
  });
});

// Train new words
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

// Get random word
app.get('/random', function(req, res, next) {
  var except = req.query.except ? req.query.except : '[]';
  var exceptArr = JSON.parse(except);
  var result = {};
  db.get(`SELECT *, (SELECT COUNT(*) as count FROM vocabulary WHERE status=1) as count FROM vocabulary WHERE status=1 AND id NOT IN(${exceptArr.join(',')}) ORDER BY RANDOM() LIMIT 1`, [], (err, row) => {
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

// Update flip and status
app.put('/update', function(req, res, next) {
  db.run(`UPDATE vocabulary SET flip=?, status=? WHERE id=?`, [req.body.flip, req.body.status, req.body.id], function(err) {
    if (err) {
      return console.error(err.message);
    }
    console.log(`Row(s) updated: ${this.changes}`);
  });
  res.json([req.body, req.query]);
});

// Update status of selected words
app.put('/update-status', function(req, res, next) {
  var ids = req.query.ids ? req.query.ids : 0;
  db.run(`UPDATE vocabulary SET status=? WHERE id IN (${ids})`, [req.body.status], function(err) {
    if (err) {
      return console.error(err.message);
    }
    console.log(`Row(s) updated: ${this.changes}`);
  });
  res.json([req.body, req.query]);
});

// Scrap from vocabulary.com
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

// Socket connection
io.on('connection', function(client) {
  console.log('socket: S client connected');

  client.on('join', function(data) {
    console.log(data);
  });

  client.on('add', function(data) {
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

          let row = [
            `<label><input type="checkbox" class="check-word" value=${this.lastID} /><span></span></label>`,
            data['source'],
            data['translation'],
            `<span class="new badge red" data-badge-caption="">must be learned</span>`,
            `<a style="padding: 0 8px;" class="btn btn-small blue modal-trigger load-content" data-href="/view?id=${this.lastID}" data-c=".modal-content" href="#modal1"><i class="material-icons dp48">description</i></a>
             <a style="padding: 0 8px;" class="btn btn-small orange modal-trigger load-content" data-href="/edit?id=${this.lastID}" data-c=".modal-content" href="#modal1"><i class="material-icons dp48">edit</i></a> 
             <a style="padding: 0 8px;" class="btn btn-small black remove-this" href="#" data-href="/remove?id=${this.lastID}"><i class="material-icons dp48">clear</i></a>`
          ];
          
          io.emit('new-word', {
            source: data['source'],
            row
          });
        });
      }
    });
  });

})

// Listen to N port
server.listen(4200);