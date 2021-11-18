import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NgxOpenCVModule, OpenCVConfig} from 'ngx-opencv';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CardFindComponent } from './card-find/card-find.component';
import { OpencvCardFindComponent } from './opencv-card-find/opencv-card-find.component';

// set the location of the OpenCV files
const openCVConfig: OpenCVConfig = {
  openCVDirPath: '/assets/opencv'  
};

@NgModule({
  declarations: [
    AppComponent,
    CardFindComponent,
    OpencvCardFindComponent
  ],
  imports: [
    BrowserModule,
    NgxOpenCVModule.forRoot(openCVConfig),
    AppRoutingModule,
  ],
  // exports: [NgxOpenCVModule],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
