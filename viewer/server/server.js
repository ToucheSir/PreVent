
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

locatePreVentHome().subscribe(() => indexFiles().subscribe(() => { 
    app.listen(port, () => {
        console.log(`Example app listening at http://localhost:${port}`);
    });
}))

function indexFiles() {
    return new Observable(sub => {
        console.log('indexing...');
        var pvtools = new PreVent(process.env.PREVENT_HOME);
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
        sub.next(true);
        sub.complete();
    });
}
