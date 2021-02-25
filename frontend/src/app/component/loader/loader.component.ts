import {Component, OnInit, TemplateRef, ViewChild} from '@angular/core';

@Component({
  selector: 'app-loader',
  templateUrl: './loader.component.html',
  styleUrls: ['./loader.component.scss']
})
export class LoaderComponent implements OnInit {
  @ViewChild('placeholder', {static: true}) placeholderRef: TemplateRef<any>

  constructor() { }

  ngOnInit(): void {
  }

}
