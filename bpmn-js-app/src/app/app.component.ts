import { Component, ViewChild } from '@angular/core';
import {
  provideFluentDesignSystem,
  fluentListbox,
  fluentOption
} from "@fluentui/web-components";
import {DiagramComponent} from './diagram/diagram.component'

import { fluentTab, fluentTabs, fluentTabPanel} from "@fluentui/web-components";
import { fluentMenu, fluentMenuItem } from "@fluentui/web-components";

provideFluentDesignSystem().register(fluentMenu(), fluentMenuItem(), fluentListbox(), fluentOption(), fluentTab(), fluentTabs(), fluentTabPanel());




@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  @ViewChild(DiagramComponent) diagramComponent: DiagramComponent;


  constructor() {}

  title = 'bpmn-js-angular';
  diagramUrl = 'https://cdn.statically.io/gh/AlvaroG1016/prueba-bpmn/main/newDiagram.bpmn';
  importError?: Error;
  archivoTabActivo: string | null = null; // Inicialmente, ningún menú está abierto
  toggleTab(tab: string) {
    if (this.archivoTabActivo === tab) {
      this.archivoTabActivo = null; // Si la misma pestaña se hace clic de nuevo, cierra el menú
    } else {
      this.archivoTabActivo = tab; // Si se hace clic en una nueva pestaña, abre su menú y cierra el otro
    }
  }

  handleImported(event) {

    const {
      type,
      error,
      warnings
    } = event;

    if (type === 'success') {
      console.log(`Rendered diagram (%s warnings)`, warnings.length);
    }

    if (type === 'error') {
      console.error('Failed to render diagram', error);
    }

    this.importError = error;
  }

  
  activateExportArtifacts() {
    if (this.diagramComponent) {
      this.diagramComponent.exportArtifacts();
    } else {
      console.error("DiagramComponent no está disponible.");
    }
  }
    
}
