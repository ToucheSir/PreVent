import { Component, OnInit } from '@angular/core';
import { AnalysisFocusService } from '../../services/analysis-focus.service';
import { PreVentFile } from '../../generated/model/models';
import { OnDestroyMixin, untilComponentDestroyed } from "@w11k/ngx-componentdestroyed";

@Component({
  selector: 'app-signal-viewer',
  templateUrl: './signal-viewer.component.html',
  styleUrls: ['./signal-viewer.component.scss']
})
export class SignalViewerComponent extends OnDestroyMixin implements OnInit {
  file: PreVentFile;

  constructor(private afsvc: AnalysisFocusService) {
    super();
   }

  ngOnInit(): void {
    this.afsvc.file.pipe(untilComponentDestroyed(this)).subscribe(f => this.file = f);
  }

}
