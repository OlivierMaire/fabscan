import { Injectable } from '@angular/core';


@Injectable({
  providedIn: 'root'
})
export class OpenCvService {


  async Load() {
    if (typeof Worker !== 'undefined') {
      const worker = new Worker(new URL('../workers/opencv.worker', import.meta.url) ); //, { type: 'module' });

      worker.onmessage = ({ data }) => {



        console.log(`page got message: ${data}`);
console.log(data);
        switch (data) {
            case 'load': {
              // Import Webassembly script
              console.log('load script');
              // importScripts('/assets/js/opencv.js');
            //   waitForOpencv(function (success) {
            //     if (success) postMessage({ msg: data })
            //     else throw new Error('Error on loading OpenCV')
            //   })
            postMessage({ msg: data });
              break
            }
            default:
              break
          }


      };

      worker.postMessage('load');
    }
  }

//   waitForOpencv(callbackFn: (arg0: boolean) => void, waitTimeMs = 30000, stepTimeMs = 100) {
//     if (cv.Mat) callbackFn(true)
  
//     let timeSpentMs = 0
//     const interval = setInterval(() => {
//       const limitReached = timeSpentMs > waitTimeMs
//       if (cv.Mat || limitReached) {
//         clearInterval(interval)
//         return callbackFn(!limitReached)
//       } else {
//         timeSpentMs += stepTimeMs
//       }
//     }, stepTimeMs)
  // }
}