
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const fs = require('fs');
const path = require('path');
const { Observable, forkJoin } = require('rxjs');
const { map, filter, take} = require('rxjs/operators');
const {PreVentFile, PreVent } = require('./preventtools');

process.env.PREVENT_HOME = '/home/ryan/devl/uva/';
process.env.PREVENT_REPO = '/home/ryan/devl/uva/testfiles/other';

var db = [];

app.get('/', (req, res) => {
    res.send('Hello World!');
})

app.get('/files', (req, res) => { 
    res.send(db);
});

function getfile(uuid) {
    return ('x' === uuid
        ? db[1]
        : db.filter(f => f.id === uuid)[0]);
}

app.get('/files/:uuid/waves/:wave/data', (req, res) => {
    var f = getfile(req.params.uuid);

    var signal = f.wave(req.params.wave);
    var start = req.query.start || 0;
    var end = req.query.end || -1;

    f.data(signal, start, end).subscribe(data=>res.send(data));
});

app.get('/files/:uuid/waves/:wave', (req, res) => {
    var f = getfile(req.params.uuid);
    res.send(f.waves[req.params.wave]);
});

app.get('/files/:uuid/waves', (req, res) => {
    var f = getfile(req.params.uuid);
    res.send(f.waves);
});

app.get('/files/:uuid/vitals/:vital/data', (req, res) => {
    var f = getfile(req.params.uuid);

    var signal = f.vital(req.params.vital);
    var start = req.query.start || 0;
    var end = req.query.end || -1;

    f.data(signal, start, end).subscribe(data => res.send(data));
});

app.get('/files/:uuid/vitals/:vital', (req, res) => {
    var f = getfile(req.params.uuid);
    res.send(f.vitals[req.params.vital]);
});

app.get('/files/:uuid/vitals', (req, res) => {
    var f = getfile(req.params.uuid);
    res.send(f.vitals);
});

app.get('/files/:uuid', (req, res) => {
    res.send(db.filter(f => f.id === req.params.uuid));
});

locatePreVentHome().subscribe(pvhome => indexFiles(pvhome).subscribe(() => { 
    app.listen(port, () => {
        console.log(`Example app listening at http://localhost:${port}`);
    });
}))

function indexFiles(pvhome) {
    return new Observable(sub => {
        console.log('indexing...');
        var pvtools = new PreVent(pvhome);
        var obs = [];

        var dirs = [process.env.PREVENT_REPO];
        while (dirs.length > 0) {
            var dir = dirs.shift();
            fs.readdirSync(dir).forEach(file => {
                var testpath = path.join(dir, file);
                if (fs.statSync(testpath).isDirectory()) {
                    dirs.push(testpath);
                }
                else if ('.hdf5' === path.extname(file)) {
                    obs.push(pvtools.index(testpath));
                }
            });
        }

        forkJoin(obs).subscribe(data => {
            db.push(...data);
            console.log(`indexed ${db.length} files`);

            sub.next(true);
            sub.complete();
        });
    });
}

function locatePreVentHome() {
    return new Observable(sub => {
        console.log('locating PreVent tooling home...done');
        sub.next(process.env.PREVENT_HOME);
        sub.complete();
    });
}
