import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { environment } from "../environments/environment";
import { BASE_PATH } from './generated/variables';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { NavigationComponent } from './components/navigation/navigation.component';
import { SignalViewerComponent } from './components/signal-viewer/signal-viewer.component';
import { MatSelectModule } from '@angular/material/select';
import { HttpClientModule } from '@angular/common/http';

import { EngineService } from '../app/generated/api/api';
import { FilnameTruncatorPipe } from './pipes/filname-truncator.pipe';

@NgModule({
  declarations: [
    AppComponent,
    NavigationComponent,
    SignalViewerComponent,
    FilnameTruncatorPipe
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MatToolbarModule,
    MatSidenavModule,
    MatSelectModule,
    HttpClientModule
  ],
  providers: [
    { provide: BASE_PATH, useValue: environment.apiUrl },
    EngineService
  ],  bootstrap: [AppComponent]
})
export class AppModule { }
