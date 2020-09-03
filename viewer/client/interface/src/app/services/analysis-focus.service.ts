import { Injectable, Input } from '@angular/core';

import { PreVentFile, SignalWindow, Signal } from '../generated/model/models';
import { Subject, BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AnalysisFocusService {
  private _file: BehaviorSubject<PreVentFile> = new BehaviorSubject<PreVentFile>(undefined);
  private _signals: BehaviorSubject<Signal[]> = new BehaviorSubject<Signal[]>([]);
  private _window: BehaviorSubject<SignalWindow> = new BehaviorSubject<SignalWindow>(undefined);
  
  constructor() {  }

  @Input() get file(): Observable<PreVentFile>{
    return this._file;
  }

  @Input() get signals(): Observable<Signal[]>{
    return this._signals;
  }


  @Input() get window(): Observable<SignalWindow> {
    return this._window;
  }

  setFile(f: PreVentFile) {
    this._file.next(f);
  }

  getFile(): PreVentFile {
    return this._file.value;
  }

  addSignal(v: Signal) {
    this._signals.value.push(v);
    this._signals.next(this._signals.value);
  }

  setSignals(v: Signal[]) {
    // if we're setting the signals directly, also reset the window
    // based on the earliest signal start

    // default viewer window: 10 minutes
    var start: Date = new Date(Math.min(...v.map(s => new Date(s.starttime).getTime())));
    var end: Date = new Date(start.getTime() + (10 * 60 * 1000));
    this.setWindow({ start: start, stop: end });
    this._signals.next(v);
  }

  setWindow(s: SignalWindow) {
    this._window.next(s);
  }

}
