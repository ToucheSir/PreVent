import { Component, OnInit, Input } from '@angular/core';
import { OnDestroyMixin, untilComponentDestroyed } from "@w11k/ngx-componentdestroyed";
import { take } from 'rxjs/operators';

import { EngineService } from '../../generated/api/api'
import { PreVentFile } from '../../generated/model/models';
import { AnalysisFocusService } from '../../services/analysis-focus.service';


@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent extends OnDestroyMixin implements OnInit {
  public files: PreVentFile[] = [];
  private pvfile: PreVentFile;
  constructor(private engsvc: EngineService, private afsvc: AnalysisFocusService) {
    super();
   }

  ngOnInit(): void {
    this.engsvc.getFiles().pipe(take(1)).subscribe(arr => this.files = arr);
    this.afsvc.file.pipe(untilComponentDestroyed(this)).subscribe(f => this.pvfile = f);
  }

  @Input() get file(): PreVentFile {
    return this.afsvc.getFile();
  }

  set file(f: PreVentFile) {
    this.afsvc.setFile(f);
  }
}
