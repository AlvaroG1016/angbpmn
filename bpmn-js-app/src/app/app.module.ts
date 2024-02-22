import { BrowserModule } from '@angular/platform-browser';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'; // Importa CUSTOM_ELEMENTS_SCHEMA
import { HttpClientModule } from '@angular/common/http';
import { AppComponent } from './app.component';
import { DiagramComponent } from './diagram/diagram.component';

// Importa los módulos necesarios para Fluent UI
import {
  fluentListbox,
  fluentOption,
} from "@fluentui/web-components";

@NgModule({
  declarations: [
    AppComponent,
    DiagramComponent

  ],
  imports: [
    BrowserModule,
    HttpClientModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA] // Agrega CUSTOM_ELEMENTS_SCHEMA aquí
})
export class AppModule { }
