const fs = require('fs');
const path = require('path');
const { exec } = require("child_process");
const { Observable } = require('rxjs');
const { v4: uuidv4 } = require('uuid');

class PreVent {
    
    constructor(preventhome) {
        this.pvtools = path.join(preventhome, 'PreVentTools', 'preventtools');
    }

    index(filepath) {
        return new Observable(sub => {
            var file = new PreVentFile(this, filepath);
            exec(`${this.pvtools} ${filepath} --attrs`, {}, (err, stdout, stderr) => {
                var filere = /\/\|(Start|End) Time\|(.*)/g
                
                var matches = stdout.matchAll(filere);

                for (var match of matches) {
                    var date = new Date(Number.parseInt(match[2]));
                    if ('Start' === match[1]) {
                        file.starttime = date;
                    }
                    else {
                        file.endtime = date;
                    }
                }

                var re = /\/(VitalSigns|Waveforms)\/([A-Za-z]*)[|](Sample Period \(ms\)|Readings Per Sample|Unit of Measure|Start Time|End Time)[|](.*)/g

                matches = stdout.matchAll(re);
                for (var match of matches) {
                    var signal;
                    if ('VitalSigns' === match[1]) {
                        if (!Object.getOwnPropertyNames(file.vitals).includes(match[2])) {
                            file.vitals[match[2]] = new Signal(match[2], false);
                        }
                        signal = file.vitals[match[2]];
                    }
                    else {
                        if (!Object.getOwnPropertyNames(file.waves).includes(match[2])) {
                            file.waves[match[2]] = new Signal(match[2], true);
                        }
                        signal = file.waves[match[2]];
                    }

                    switch (match[3]) {
                        case 'Start Time':
                            signal.starttime = new Date(Number.parseInt(match[4]));
                            break;
                        case 'End Time':
                            signal.endtime = new Date(Number.parseInt(match[4]));
                            break;
                        case 'Unit of Measure':
                            signal.uom = match[4];
                            break;
                        case 'Sample Period (ms)':
                            signal.sample_period_ms = Number.parseInt(match[4]);
                            break;
                        case 'Readings Per Sample':
                            signal.readings_per_sample = Number.parseInt(match[4]);
                            break;
                    }
                }

                var re2 = /\/(VitalSigns|Waveforms)\/([A-Za-z]*)\/data[|](Min|Max) Value[|](.*)/g
                matches = stdout.matchAll(re2);
                for (var match of matches) {
                    var signal = ('VitalSigns' === match[1] ? file.vitals[match[2]] : file.waves[match[2]]);
                    var num = Number.parseFloat(match[4]);
                    if ('Min' === match[3]) {
                        signal.min = num;
                    }
                    else {
                        signal.max = num;
                    }
                }
                sub.next(file);
                sub.complete();
            });
        });
    }

    data(pvfile, signal, from, to, for_s = 10) {
        var path = (signal.wave || false
            ? `/Waveforms/${signal.name}`
            : `/VitalSigns/${signal.name}`);
        return new Observable(sub => {
            var cmd = `${this.pvtools} ${pvfile} --print --path ${path}`;
            if (from) {
                cmd += ` --start ${from}`;
            }
            if (to) {
                cmd += ` --end ${to}`;
            }
            else {
                cmd += ` --for ${for_s}`;
            }
            
            console.log(cmd);
            exec(cmd, {}, (err, stdout, stderr) => {
                //sub.next(stdout.split('\n').filter(v => v.length > 0).map(v => Number.parseFloat(v.split(' ')[1])));
                //console.log(err, stdout, stderr);
                sub.next(stdout.trim().split('\n').map(v => {
                    //     //console.log(v);
                    //     return Number.parseFloat(v.split(' ')[1]);
                    var arr = v.split(' ').map(n => Number.parseFloat(n));
                    return new DataPoint(Number.parseInt(arr[0]), Number.parseFloat(arr[1]));
                }));
                sub.complete();
            });
        });
    }
}

class PreVentFile {
    constructor(pvtools, filepath) {
        this.id = uuidv4();
        this.tooling = pvtools;
        this.file = filepath;
        this.vitals = {};
        this.waves = {};
        this.starttime = undefined;
        this.endtime = undefined;
    }

    wave(wavename) {
        return this.waves[wavename];
    }

    vital(vitalname) {
        return this.vitals[vitalname];
    }

    data(signal, from = undefined, to = undefined, for_s = undefined) {
        return this.tooling.data(this.file, signal, from, to, for_s);
    }
}

class Signal {
    constructor(name, wave) {
        this.name = name;
        this.min = undefined;
        this.max = undefined;
        this.starttime = undefined;
        this.endtime = undefined;
        this.uom = undefined;
        this.sample_period_ms = 1000;
        this.readings_per_sample = 1;
        this.wave = wave;
    }
}

class DataPoint {
    constructor(utcms, val) {
        this.t = utcms;
        this.v = val;
    }
}

module.exports = {
    PreVent: PreVent,
    PreVentFile: PreVentFile,
    Signal: Signal,
    DataPoint:DataPoint
};