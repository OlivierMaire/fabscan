import { Component, ElementRef, OnInit, Renderer2, ViewChild } from '@angular/core';
import * as tf from '@tensorflow/tfjs';
import * as $ from 'jquery'
import * as cocossd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs-backend-webgl';

@Component({
  selector: 'app-card-find',
  templateUrl: './card-find.component.html',
  styleUrls: ['./card-find.component.scss']
})
export class CardFindComponent implements OnInit {

  @ViewChild("video")
  public video!: ElementRef;

  @ViewChild("canvas")
  public canvas!: ElementRef;

  @ViewChild("liveView")
  public liveView!: ElementRef;


  public captures: Array<any>;

  public model : cocossd.ObjectDetection | null;
  public children : Array<any>;

  public videoElem! : HTMLVideoElement;

  public modelLoaded : boolean = false;

  constructor(
    private renderer: Renderer2,) { 
        this.captures = [];
        this.children = [];
        this.model = null;
        this.modelLoaded = false;
      }

  ngOnInit(): void {
  }

  
  public ngAfterViewInit() : void {
    if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
            this.video.nativeElement.srcObject = stream;
            this.video.nativeElement.play();
            this.videoElem =  this.video.nativeElement;
        });
    }
    console.log("loading model")
    tf.setBackend('webgl').then(() => {    cocossd.load().then(model => { this.model = model;   console.log("model loaded"); this.modelLoaded = true;}); });
}

public capture() {
  var context = this.canvas.nativeElement.getContext("2d").drawImage(this.video.nativeElement, 0, 0, 640, 480);
  this.captures.push(this.canvas.nativeElement.toDataURL("image/png"));
}

public loadedData()
{
  if (this.modelLoaded && this.model !== undefined)
{


  this.model?.detect(this.videoElem).then( predictions => {
 // Remove any highlighting we did previous frame.
 for (let i = 0; i < this.children.length; i++) {
  // this.liveView.removeChild(this.children[i]);
  this.renderer.removeChild(this.liveView.nativeElement, this.children[i]);
}
 this.children.splice(0);
 // Now lets loop through predictions and draw them to the live view if
    // they have a high confidence score.
    for (let n = 0; n < predictions.length; n++) {
      // If we are over 66% sure we are sure we classified it right, draw it!
      if (predictions[n].score > 0.66) {
        const p = document.createElement('p');
        p.innerText = predictions[n].class  + ' - with ' 
            + Math.round(predictions[n].score * 100) 
            + '% confidence.';
        p.setAttribute("style", 'margin-left: ' + predictions[n].bbox[0] + 'px; margin-top: '
            + (predictions[n].bbox[1] - 10) + 'px; width: ' 
            + (predictions[n].bbox[2] - 10) + 'px; top: 0; left: 0;');

        const highlighter = document.createElement('div');
        highlighter.setAttribute('class', 'highlighter');
        highlighter.setAttribute('style', 'left: ' + predictions[n].bbox[0] + 'px; top: '
            + predictions[n].bbox[1] + 'px; width: ' 
            + predictions[n].bbox[2] + 'px; height: '
            + predictions[n].bbox[3] + 'px;');

            this.renderer.appendChild(this.liveView.nativeElement, highlighter);
            this.renderer.appendChild(this.liveView.nativeElement, p);
        // this.liveView.appendChild(highlighter);
        // this.liveView.appendChild(p);
        this.children.push(highlighter);
        this.children.push(p);
      }
    }
    
    // Call this function again to keep predicting when the browser is ready.
  window.requestAnimationFrame(() => this.loadedData());

  });
}
else
{
  console.log("model not loaded yet... ");
  window.requestAnimationFrame(() => this.loadedData());
}
}


}
