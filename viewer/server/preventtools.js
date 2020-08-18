const fs = require('fs');
const path = require('path');
const { exec } = require("child_process");
const { Observable } = require('rxjs');

class PreVent {
    
    constructor(preventhome) {
        this.pvtools = path.join(preventhome, 'PreVentTools', 'preventtools');
    }

    index(filepath) {
        return new Observable(sub => {
            var file = new PreVentFile(this, filepath);
            exec(`${this.pvtools} ${filepath} --attrs`, {}, (err, stdout, stderr) => {
                var re = /\/(VitalSigns|Waveforms)\/([A-Za-z]*)[|](Sample Period \(ms\)|Readings Per Sample|Unit of Measure|Start Time|End Time)[|](.*)/g

                var matches = stdout.matchAll(re);
                for (var match of matches) {
                    var signal;
                    if ('VitalSigns' === match[1]) {
                        if (!Object.getOwnPropertyNames(file.vitals).includes(match[2])) {
                            file.vitals[match[2]] = new Signal(match[2]);
                        }
                        signal = file.vitals[match[2]];
                    }
                    else {
                        if (!Object.getOwnPropertyNames(file.waves).includes(match[2])) {
                            file.waves[match[2]] = new Signal(match[2]);
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
}

class PreVentFile {
    constructor(pvtools, filepath) {
        this.tooling = pvtools;
        this.file = filepath;
        this.vitals = {};
        this.waves = {};
    }
}

class Signal {
    constructor(name) {
        this.name = name;
        this.min = undefined;
        this.max = undefined;
        this.starttime = undefined;
        this.endtime = undefined;
        this.uom = undefined;
        this.sample_period_ms = 1000;
        this.readings_per_sample = 1;
    }
}


module.exports = {
    PreVent: PreVent,
    PreVentFile: PreVentFile,
    Signal: Signal
};