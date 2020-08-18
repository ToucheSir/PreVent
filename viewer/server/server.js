
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


app.get('/', (req, res) => {
    res.send('Hello World!');
})

app.get('/files', (req, res) => { 
    res.send('list of files');
});

locatePreVentHome().subscribe(() => indexFiles().subscribe(() => { 
    app.listen(port, () => {
        console.log(`Example app listening at http://localhost:${port}`);
    });
}))

function indexFiles() {
    return new Observable(sub => {
        console.log('index');
        var pvtools = new PreVent(process.env.PREVENT_HOME);
        var hdf5s = [];
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
            hdf5s.push(...data);
            console.log('hdf5s: ', hdf5s);

            sub.next(true);
            sub.complete();
        });
    });
}

function locatePreVentHome() {
    return new Observable(sub => {
        console.log('locate');
        sub.next(true);
        sub.complete();
    });
}
