import {
  Component,
  ElementRef,
  OnInit,
  Renderer2,
  ViewChild,
} from '@angular/core';
import { OpenCvService } from '../services/opencv.service';
import { NgxOpenCVService, OpenCVState } from 'ngx-opencv';

@Component({
  selector: 'app-opencv-card-find',
  templateUrl: './opencv-card-find.component.html',
  styleUrls: ['./opencv-card-find.component.scss'],
})
export class OpencvCardFindComponent implements OnInit {
  //#region  ViewChildren
  @ViewChild('video')
  public video!: ElementRef;

  @ViewChild('canvas')
  public canvas!: ElementRef;

  @ViewChild('liveView')
  public liveView!: ElementRef;

  @ViewChild('canvasFrame')
  canvasFrame!: ElementRef;

  @ViewChild('canvasInput')
  canvasInput!: ElementRef;
  @ViewChild('canvasOutput')
  canvasOutput!: ElementRef;
  @ViewChild('canvasOutput2')
  canvasOutput2!: ElementRef;
  @ViewChild('canvasOutput3')
  canvasOutput3!: ElementRef;
  //#endregion

  isCameraInverted!: boolean;

  capture!: any;

  cardRatio: number = 63 / 88;

  public captures: Array<any>;

  // public model : cocossd.ObjectDetection | null;
  public children: Array<any>;

  public videoElem!: HTMLVideoElement;

  public cvState!: string;

  constructor(
    private ngxOpenCv: NgxOpenCVService,
    private renderer: Renderer2,
    private opencvService: OpenCvService
  ) {
    this.captures = [];
    this.children = [];

    this.isCameraInverted = true;

    // subscribe to status of OpenCV module
    this.ngxOpenCv.cvState.subscribe((cvState: OpenCVState) => {
      // do something with the state string
      this.cvState = cvState.state;
      // console.log(`OpenCv State changed to ${cvState.state}`);
      if (cvState.error) {
        // handle errors
      } else if (cvState.loading) {
        // e.g. show loading indicator
      } else if (cvState.ready) {
        // do image processing stuff
        // console.log(`ready to go!`);
        this.capture = new cv.VideoCapture(this.video.nativeElement);
        this.processFrame();
      }
    });
  }

  async ngOnInit(): Promise<void> {}

  public ngAfterViewInit(): void {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({
          audio: false,
          video: {
            width: 1920,
            height: 1080,
          },
        })
        .then((stream) => {
          this.video.nativeElement.srcObject = stream;
          this.video.nativeElement.play();
          this.videoElem = this.video.nativeElement;
        });
    }
  }

  public processFrame() {
    this.clearOutputCanvas();
    this.detectCard();

    // call me again to infinity
    window.requestAnimationFrame(() => this.processFrame());
  }

  detectCard() {
    // frame from the camera (fullsize)
    let src = new cv.Mat(
      this.video.nativeElement.height,
      this.video.nativeElement.width,
      cv.CV_8UC4
    );
    this.capture.read(src);

    // get lowres picture
    const lowres_width = 320;
    let lowres_src = new cv.Mat();
    const ratio = src.cols / lowres_width;
    cv.resize(
      src,
      lowres_src,
      new cv.Size(lowres_width, src.rows / ratio),
      0,
      0,
      cv.INTER_NEAREST
    );

    // convert the resized image to grayscale,
    let gray = new cv.Mat();
    cv.cvtColor(lowres_src, gray, cv.COLOR_RGBA2GRAY, 0);
    // blur it slightly,
    let blurred = new cv.Mat();
    let ksize = new cv.Size(5, 5);
    cv.GaussianBlur(gray, blurred, ksize, 0);
    gray.delete();
    // and threshold it
    let thresh = new cv.Mat();
    cv.threshold(blurred, thresh, 60, 255, cv.THRESH_BINARY);
    blurred.delete();

    // find contours in the thresholded image and initialize the
    // shape detector
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(
      thresh,
      contours,
      hierarchy,
      cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE
    );
    thresh.delete();
    hierarchy.delete();

    // set an array to receive the detected cards
    let roiArray: any[] = [];
    let roiArray2: any[] = [];

    const edges = new cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3); // display pictre  // todo: remove on release

    // #region contour loop
    // loop over the contours found
    for (let i = 0; i < contours.size(); ++i) {
      let c = contours.get(i);
      // get center of countour
      let M = cv.moments(c);
      let center = {
        confidence: 1,
        location: { x: (M.m10 / M.m00) * ratio, y: (M.m01 / M.m00) * ratio },
      };

      // filters
      // remove non rectangle or not having "card" ratio rectangle to filter our
      // detected shapes.
      if (!this.isShapeRectangle(c)) continue;
      let area = cv.contourArea(c);
      if (area < 500) continue;
      let shapeRotatedRect = this.getCardShape(c, ratio);
      let ratio1 = shapeRotatedRect.size.width / shapeRotatedRect.size.height;
      let ratio2 = shapeRotatedRect.size.height / shapeRotatedRect.size.width;
      let ratiomatch = false;
      if (
        ratiomatch == false &&
        this.cardRatio * 0.75 <= ratio1 &&
        this.cardRatio * 1.25 >= ratio1
      )
        ratiomatch = true;
      if (
        ratiomatch == false &&
        this.cardRatio * 0.75 <= ratio2 &&
        this.cardRatio * 1.25 >= ratio2
      )
        ratiomatch = true;
      if (ratiomatch == false) continue;

      // detect shape function for debug, todo : remove on release
      let shape = this.detectShape(c, edges, ratio);

      // get verticies of the detected shape.
      let vertices = cv.RotatedRect.points(shapeRotatedRect);
      let mat = new cv.matFromArray(4, 2, cv.CV_32SC1, [
        vertices[0].x * ratio,
        vertices[0].y * ratio,
        vertices[1].x * ratio,
        vertices[1].y * ratio,
        vertices[2].x * ratio,
        vertices[2].y * ratio,
        vertices[3].x * ratio,
        vertices[3].y * ratio,
      ]);

      // draw on image (todo: remove on release)
      const markersVector = new cv.MatVector();
      markersVector.push_back(mat);
      cv.polylines(edges, markersVector, true, new cv.Scalar(0, 0, 255), 3);

      // rotate the picture with the found angle.
      let rotPoint = new cv.Point(99999, 99999); // toppest point
      let rotNextPoint = new cv.Point(99999, 99999); // next point
      for (let v = 0; v < vertices.length; v++) {
        if (vertices[v].y < rotPoint.y) {
          rotPoint.x = vertices[v].x;
          rotPoint.y = vertices[v].y;
          if (v == vertices.length - 1) {
            rotNextPoint.x = vertices[0].x;
            rotNextPoint.y = vertices[0].y;
          } else {
            rotNextPoint.x = vertices[v + 1].x;
            rotNextPoint.y = vertices[v + 1].y;
          }
        }
      }
      // // get length of side
      // let a = rotPoint.x - rotNextPoint.x;
      // let b = rotPoint.y - rotNextPoint.y;
      // let cLen = Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
      // // console.log(
      // //   ` width ${Math.round(shapeRotatedRect.size.width)} height ${Math.round(
      // //     shapeRotatedRect.size.height
      // //   )} cLen ${Math.round(cLen)}`
      // //);

      // check if the detected shape width and height are inverted
      // we always wants to have Height > Width (Portrait displayed card)
      let isWidthInverted = false;
      if (shapeRotatedRect.size.width > shapeRotatedRect.size.height)
        isWidthInverted = true;

      // if (Math.round(cLen) == Math.round(shapeRotatedRect.size.width))
      //   console.log('width found');
      // else console.log('height found');
      // console.log(`width inverted ${isWidthInverted}`);

      // rotPoint.x *= ratio;
      // rotPoint.y *= ratio;
      // rotNextPoint.x *= ratio;
      // rotNextPoint.y *= ratio;
      rotPoint.x = center.location.x;
      rotPoint.y = center.location.y;

      // let rotPoint = new cv.Point(vertices[0].x * ratio, vertices[0].y * ratio); // top-left
      cv.circle(
        edges,
        new cv.Point(rotPoint.x, rotPoint.y),
        6,
        new cv.Scalar(255, 0, 0, 255),
        6
      );
      // cv.circle(
      //   src,
      //   new cv.Point(rotPoint.x, rotPoint.y),
      //   6,
      //   new cv.Scalar(255, 0, 0, 255),
      //   6
      // );

      // get the angle rotation, and adapt it
      // if the width/height are inverted, remove 90 degrees to the rotation.
      // if the camera picture is upside down, return the picture 180 degrees
      let angle = shapeRotatedRect.angle;
      if (isWidthInverted) angle -= 90;
      if (this.isCameraInverted) angle += 180;

      // retate the picture
      let rotM = cv.getRotationMatrix2D(rotPoint, angle, 1);
      let srcRot = new cv.Mat();
      let dsize = new cv.Size(src.rows, src.cols);
      cv.warpAffine(
        src,
        srcRot,
        rotM,
        dsize,
        cv.INTER_LINEAR,
        cv.BORDER_CONSTANT,
        new cv.Scalar()
      );

      // crop the picture to get the card only
      let width = shapeRotatedRect.size.width * ratio;
      let height = shapeRotatedRect.size.height * ratio;
      if (isWidthInverted) {
        height = shapeRotatedRect.size.width * ratio;
        width = shapeRotatedRect.size.height * ratio;
      }

      let rect = new cv.Rect(
        rotPoint.x - width / 2,
        rotPoint.y - height / 2,
        width,
        height
      );

      // debug , todo: remove on release
      if (rect.x < 0 || rect.y < 0) {
      console.log(`roi rect ${rect.x} ${rect.y} ${rect.width} ${rect.height}`);
      console.log('size error');
        continue;
      }

      let roiMat = srcRot.roi(rect);

       srcRot.delete();
      // roiArray2.push(srcRot);
      roiArray.push(roiMat);

      cv.polylines(src, markersVector, true, new cv.Scalar(0, 0, 255, 255), 3);
      markersVector.delete();
      mat.delete();


      // multiply the contour (x, y)-coordinates by the resize ratio,
      // then draw the contours and the name of the shape on the image

      // let colorGreen = new cv.Scalar(0, 255, 0, 255);
      let colorWhite = new cv.Scalar(255, 255, 255, 255);
      // cv.drawContours(edges, cnt, 0, colorGreen, 2);
      // cv.drawContours(src, cnt, 0, colorWhite, 2);
      cv.putText(
        edges,
        shape,
        new cv.Point(center.location.x, center.location.y),
        cv.FONT_HERSHEY_SIMPLEX,
        1,
        colorWhite,
        2
      );
      cv.putText(
        src,
        shape,
        new cv.Point(center.location.x, center.location.y),
        cv.FONT_HERSHEY_SIMPLEX,
        1,
        colorWhite,
        2
      );

    }
    // #endregion contour loop


    // display source
    cv.imshow(this.canvasInput.nativeElement.id, src);
    // display edges
    cv.imshow(this.canvasOutput.nativeElement.id, edges);
    // display found cards
    for (let i = 0; i < roiArray.length; i++) {
      cv.imshow(this.canvasOutput2.nativeElement.id, roiArray[i]);
      roiArray[i].delete();
    }
    // for (let i = 0; i < roiArray2.length; i++) {
    //   cv.imshow(this.canvasOutput3.nativeElement.id, roiArray2[i]);
    //   roiArray2[i].delete();
    // }

    // delete images
    edges.delete();
    lowres_src.delete();
    src.delete();
  }

  public detectShape(c: any, edges: any, ratio: number): any {
    // initialize the shape name and approximate the contour
    let shape = 'unidentified';
    let peri = cv.arcLength(c, true);
    let approx = new cv.Mat();
    cv.approxPolyDP(c, approx, 0.04 * peri, true);
    // if the shape is a triangle, it will have 3 vertices
    if (approx.rows == 3) shape = 'triangle';
    // if the shape has 4 vertices, it is either a square or
    // a rectangle
    else if (approx.rows == 4) {
      // compute the bounding box of the contour and use the
      // bounding box to compute the aspect ratio
      let rect = cv.boundingRect(approx);
      let rotatedRect = cv.minAreaRect(approx);
      // console.log(rotatedRect);
      let ar = rotatedRect.size.width / rotatedRect.size.height;
      // a square will have an aspect ratio that is approximately
      // equal to one, otherwise, the shape is a rectangle
      if (ar >= 0.95 && ar <= 1.05) shape = 'square';
      else shape = 'rectangle';
      // shape += ` - w ${rotatedRect.size.width.toFixed(
      //   4
      // )} h ${rotatedRect.size.height.toFixed(4)}`;
      // shape += ` - ratio ${(
      //   rotatedRect.size.width / rotatedRect.size.height
      // ).toFixed(4)} or ${(
      //   rotatedRect.size.height / rotatedRect.size.width
      // ).toFixed(4)} cardRatio ${(this.cardRatio * .75).toFixed(4)} ~ ${(this.cardRatio * 1.25).toFixed(4)}`;

      shape += ` - a ${rotatedRect.angle}`;

      // let box = cv.boxPoints(rect2)
      let vertices = cv.RotatedRect.points(rotatedRect);
      let point1 = vertices[0];
      let point2 = vertices[1];
      let point3 = vertices[2];
      let point4 = vertices[3];
      // console.log(vertices);
      // let mat = new cv.matFromArray(4,2,cv.CV_32FC1,vertices);
      let mat = new cv.matFromArray(4, 2, cv.CV_32SC1, [
        point1.x * ratio,
        point1.y * ratio,
        point2.x * ratio,
        point2.y * ratio,
        point3.x * ratio,
        point3.y * ratio,
        point4.x * ratio,
        point4.y * ratio,
      ]);
      // let mat = new cv.matFromArray(4,2,cv.CV_32FC1,[point1.x, point1.y,0,0,0,0,0,0]);
      // console.log(mat);
      const markersVector = new cv.MatVector();
      markersVector.push_back(mat);
      // console.log(markersVector);
      // cv.polylines();
      cv.polylines(edges, markersVector, true, new cv.Scalar(0, 255, 0), 3);

      markersVector.delete();
      mat.delete();
    }
    // if the shape is a pentagon, it will have 5 vertices
    else if (approx.rows == 5) shape = 'pentagon';
    // otherwise, we assume the shape is a circle
    else shape = 'circle';
    // return the name of the shape

    // shape += ` - ${approx.rows}`

    let area = cv.contourArea(c);
    shape += ` - area: ${area}`;
    return shape;
  }

  public isShapeRectangle(c: any): boolean {
    // initialize the shape name and approximate the contour
    let peri = cv.arcLength(c, true);
    let approx = new cv.Mat();
    cv.approxPolyDP(c, approx, 0.04 * peri, true);
    // if the shape has 4 vertices, it is either a square or
    // a rectangle
    if (approx.rows == 4) {
      // compute the bounding box of the contour and use the
      // bounding box to compute the aspect ratio
      return true;
    }
    return false;
  }

  public getCardShape(c: any, ratio: number): any {
    // initialize the shape name and approximate the contour
    let points: any;
    let shape = 'unidentified';
    let peri = cv.arcLength(c, true);
    let approx = new cv.Mat();
    cv.approxPolyDP(c, approx, 0.04 * peri, true);
    // if the shape is a triangle, it will have 3 vertices
    if (approx.rows == 4) {
      let rotatedRect = cv.minAreaRect(approx);
      points = rotatedRect;
    }
    return points;
  }

  clearOutputCanvas() {
    const context = this.canvasOutput.nativeElement.getContext('2d');
    context.clearRect(
      0,
      0,
      this.canvasOutput.nativeElement.width,
      this.canvasOutput.nativeElement.height
    );
  }

}
