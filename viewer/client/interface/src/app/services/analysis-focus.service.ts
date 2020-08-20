import { Injectable, Input } from '@angular/core';

import { PreVentFile } from '../generated/model/models';
import { Subject, BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AnalysisFocusService {
  private _file: BehaviorSubject<PreVentFile> = new BehaviorSubject<PreVentFile>(undefined);
  
  constructor() {  }

  @Input() get file(): Observable<PreVentFile>{
    return this._file;
  }

  setFile(f:PreVentFile) {
    this._file.next(f);
  }

  getFile(): PreVentFile {
    return this._file.value;
  }
}
