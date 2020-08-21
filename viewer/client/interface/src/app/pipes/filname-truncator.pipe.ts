import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'ftrunc'
})
export class FilnameTruncatorPipe implements PipeTransform {

  transform(value: string, ...args: unknown[]): unknown {
    var pos: number = value.lastIndexOf('/');
    return value.substr(pos + 1);
  }
}
