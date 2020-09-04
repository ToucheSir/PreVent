import { Component, OnInit } from '@angular/core';
import { AnalysisFocusService } from '../../services/analysis-focus.service';
import { PreVentFile, Signal, SignalWindow, DataPoint } from '../../generated/model/models';
import { OnDestroyMixin, untilComponentDestroyed } from "@w11k/ngx-componentdestroyed";
import { EngineService } from '../../generated/api/api'

import * as d3 from 'd3';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-signal-viewer',
  templateUrl: './signal-viewer.component.html',
  styleUrls: ['./signal-viewer.component.scss']
})
export class SignalViewerComponent extends OnDestroyMixin implements OnInit {
  file: PreVentFile;
  signals: Signal[] = [];
  _window: SignalWindow;

  constructor(private afsvc: AnalysisFocusService, private engsvc:EngineService) {
    super();
   }

  ngOnInit(): void {
    this.afsvc.file.pipe(untilComponentDestroyed(this)).subscribe(f => this.file = f);

    this.afsvc.window.pipe(untilComponentDestroyed(this)).subscribe(win => {
      this._window = win;
      this.redraw();
    });

    this.afsvc.signals.pipe(untilComponentDestroyed(this)).subscribe(sigs => {
      this.signals = sigs;
      this.redraw();
    });
  }

  private redraw() {
    if (!(this._window && this.signals)) {
      return;
    }
    var start: number = this._window.start.getTime();
    var end: number = this._window.stop.getTime();
    var svg = d3.select('#svgchart');
    var svgwidth = Number.parseFloat(svg.attr('width'));
    var svgheight = Number.parseFloat(svg.attr('height'));

    // note: the scale ranges should match the viewbox of this svg (in the html file)
    var timescale = d3.scaleTime()
      .domain([this._window.start, this._window.stop])
      .range([50, 1000]);

    forkJoin(this.signals.map(s =>
      s.wave
        ? this.engsvc.getWaveData(this.file.id, s.name, start, end)
        : this.engsvc.getVitalData(this.file.id, s.name, start, end))).subscribe(data => {
          
          var valscales: Map<number, any> = new Map<number, any>();

          data.forEach((dparr, idx) => {
            var sigvals: number[] = dparr.map(dp => dp.v).filter(v => v != -32768);
            var minval = Math.min(...sigvals);
            var maxval = Math.max(...sigvals);

            valscales.set(idx, d3.scaleLinear()
              .domain([minval, maxval])
              .range([225, 0]));
            
            var v = valscales.get(0);
            console.log(minval, v(minval), maxval, v(maxval));
          });

          svg.selectAll('g').remove();
          var path = svg.selectAll('g.signal').data(data);
          var g = path.enter().append('g')
            .attr('id', (d, i) => `signal${i}`)
            .attr('class', (d, i) => `signal signal_${this.signals[i].name}`);
          
          // data.forEach((dp, idx) => {
          //   g.selectAll(`circle.signal_${this.signals[idx].name}`).data(dp)
          //     .enter()
          //     .append('circle')
          //     .style('stroke', 'blue')
          //     .style('stroke-width', 1)
          //     .style('fill', 'blue')
          //     .attr('cx', d => timescale(d.t))
          //     .attr('cy', d => valscales.get(idx)(d.v))
          //     .attr('r', 1);
          // });
          

          g
            .append('path')
            .attr('class', (d, i) => `signal_${this.signals[i].name}`)
            .style('stroke', 'blue')
            .style('stroke-width', 1)
            .style('fill', 'none')
            .attr('d', (d, i) => this.pathfor(this.signals[i], data[i], timescale, valscales.get(i)));

          var x_axis = d3.axisBottom(timescale);
          var xaxisg = svg.append('g')
            .attr('id', 'timeaxis')
            .attr('transform', 'translate(0,230)');
          xaxisg.call(x_axis);

          var y_axis = d3.axisLeft(valscales.get(0));
          var yaxisg = svg.append('g')
            .attr('id', 'valaxis')
            .attr('transform', 'translate(50,0)');
          yaxisg.call(y_axis);
        });
    

  }

  private pathfor(signal: Signal, data: DataPoint[], timescale, valscale): string {
    // for vitals, go through all the values, and see where we have gaps (we'll 
    // need to pick up the pen at those points)

    // for waves, do a ramer douglas pueker (?) pruning, and assume we always have
    // continuous values

    if (signal.wave) {
      
    }
    else {
      // FIXME: we should be able to use the member here, but swagger seems to camelcase it
      var misslimit: number = signal['sample_period_ms'] * 2;
      return data.map((dp, idx, dd) => {
        var x: number = timescale(dp.t);
        var y: number = valscale(dp.v);

        if (0 == idx || dp.t > dd[idx - 1].t + misslimit) {
          return `M${x}, ${y}`;
        }
        else {
          return ` L${x} ${y}`;
        }
      }).join(' ');
      //return data.shift().map(dp => `${timescale(dp.t)},${valscale(dp.v)}`).join(' ');

    }

  }
}
