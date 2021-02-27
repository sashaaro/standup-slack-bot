import {AfterViewInit, Component, OnInit} from '@angular/core';

const chartColors = {
  red: 'rgb(255, 99, 132)',
  orange: 'rgb(255, 159, 64)',
  yellow: 'rgb(255, 205, 86)',
  green: 'rgb(75, 192, 192)',
  blue: 'rgb(54, 162, 235)',
  purple: 'rgb(153, 102, 255)',
  grey: 'rgb(201, 203, 207)'
};
const config = {
  type: 'line',
  data: {
    labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
    datasets: [{
      label: 'Yes, I am at office',
      backgroundColor: chartColors.red,
      borderColor: chartColors.red,
      data: [
        4, 4, 3, 2, 2, 1
      ],
      fill: false,
    }, {
      label: 'No, work remote today',
      fill: false,
      backgroundColor: chartColors.blue,
      borderColor: chartColors.blue,
      data: [
        2,2, 3, 4, 4, 5
      ],
    }]
  },
  options: {
    responsive: true,
    title: {
      display: true,
      text: 'Are you in office today?'
    },
    tooltips: {
      mode: 'index',
      intersect: false,
    },
    hover: {
      mode: 'nearest',
      intersect: true
    },
    scales: {
      xAxes: [{
        display: true,
        scaleLabel: {
          display: false,
          // labelString: 'Month'
        }
      }],
      yAxes: [{
        display: true,
        scaleLabel: {
          display: true,
          labelString: 'Answers'
        }
      }]
    }
  }
};

@Component({
  selector: 'app-stat-team',
  templateUrl: './stat-team.component.html',
  styleUrls: ['./stat-team.component.scss']
})
export class StatTeamComponent implements OnInit, AfterViewInit {

  constructor() { }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    var ctx = (document.getElementById('canvas') as HTMLCanvasElement).getContext('2d');
    import ('chart.js').then(({Chart}) => {
      console.log(new Chart(ctx, config))
    })
  }


}
