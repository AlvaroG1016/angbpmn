import {
  AfterContentInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  SimpleChanges,
  EventEmitter
} from '@angular/core';


import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule
} from 'bpmn-js-properties-panel';
import { HttpClient } from '@angular/common/http';
import { map, switchMap } from 'rxjs/operators';

import type Canvas from 'diagram-js/lib/core/Canvas';
import type { ImportDoneEvent, ImportXMLResult } from 'bpmn-js';

/**
 * You may include a different variant of BpmnJS:
 *
 * bpmn-viewer  - displays BPMN diagrams without the ability
 *                to navigate them
 * bpmn-modeler - bootstraps a full-fledged BPMN editor
 */
import BpmnJS from 'bpmn-js/lib/Modeler';

/* import { from, Observable, Subscription } from 'rxjs';
 */
@Component({
  selector: 'app-diagram',
  template: `
    <div #ref class="diagram-container">
      


    </div>
  `,
  styles: [
    `
      .diagram-container {
        height: 100%;
        width: 100%;
      }
    `
  ]
})
export class DiagramComponent implements AfterContentInit, OnChanges, OnDestroy, OnInit {

  @ViewChild('ref', { static: true }) private el: ElementRef;

  @Input() private url?: string;
  @Output() private importDone: EventEmitter<ImportDoneEvent> = new EventEmitter();
  @Output() exportArtifactsEvent: EventEmitter<any> = new EventEmitter();


  private bpmnJS: BpmnJS = new BpmnJS({

    container: '.diagram-parent',
    propertiesPanel: {
      parent: '#js-properties-panel'
    },
    additionalModules: [
      BpmnPropertiesPanelModule,
      BpmnPropertiesProviderModule
    ]
  });


  

  constructor(private http: HttpClient,
    private elRef: ElementRef,
    ) {
    this.bpmnJS.on<ImportDoneEvent>('import.done', ({ error }) => {
      if (!error) {
        this.bpmnJS.get<Canvas>('canvas').zoom('fit-viewport');

      }
    });
  }

  ngAfterContentInit(): void {
    this.bpmnJS.attachTo(this.el.nativeElement);
    this.removePoweredByElement();

  }

  ngOnInit(): void {
    if (this.url) {
      this.loadUrl(this.url);

    }

    
  }

  ngOnChanges(changes: SimpleChanges) {
    // re-import whenever the url changes
    if (changes.url) {
      this.loadUrl(changes.url.currentValue);
    }
  }

  ngOnDestroy(): void {
    this.bpmnJS.destroy();
  }

  /**
   * Load diagram from URL and emit completion event
   */
  async loadUrl(url: string): Promise<void> {
    try {
      const xml: string = await this.http.get(url, { responseType: 'text' }).toPromise();
      const result = await this.importDiagram(xml);
      
      if (result.type === 'success') {
        this.importDone.emit({
          type: 'success',
          warnings: result.warnings
        });
      } else {
        throw result.error;
      }
    } catch (error) {
      this.importDone.emit({
        type: 'error',
        error
      });
    }
  }


  private async importDiagram(xml: string): Promise<ImportXMLResult> {
    try {
      const result = await this.bpmnJS.importXML(xml);
      return { type: 'success', ...result };
    } catch (error) {
      console.log(xml)
      return { type: 'error', error };
    }
  }
  private removePoweredByElement(): void {
    // Obtén el elemento por su clase
    const poweredByElement = this.elRef.nativeElement.querySelector('.bjs-powered-by');

    // Verifica si el elemento existe antes de intentar eliminarlo
    if (poweredByElement) {
      // Elimina el elemento del DOM
      poweredByElement.parentNode.removeChild(poweredByElement);
    }
  }

  async exportArtifacts() {

    const downloadLinkRef = document.getElementById('js-download-diagram') as HTMLAnchorElement;
    const downloadSvgLinkRef = document.getElementById('js-download-svg') as HTMLAnchorElement;

    console.log(downloadLinkRef);
    console.log(downloadSvgLinkRef);
    
    try {
      const { svg } = await this.bpmnJS.saveSVG();
      this.setEncoded(downloadSvgLinkRef, 'diagram.svg', svg);
    } catch (err) {
      console.log('entra al catch')

      console.error('Error guardando el SVG: ', err);
      this.setEncoded(downloadSvgLinkRef, 'diagram.svg', null);
    }
  
    try {
      const { xml } = await this.bpmnJS.saveXML({ format: true });
      this.setEncoded(downloadLinkRef, 'diagram.bpmn', xml);
    } catch (err) {
      console.error('Error guardando diagrama: ', err);
      this.setEncoded(downloadLinkRef, 'diagram.bpmn', null);
    }
    this.exportArtifactsEvent.emit(); // Emitir el evento al padre
  }

  setEncoded(link: HTMLAnchorElement, name: string, data: string) {
    const encodedData = encodeURIComponent(data);
    
    
    if (data) {
      link.classList.add('active');
      link.href = 'data:application/bpmn20-xml;charset=UTF-8,' + encodedData;
      
      console.log('enrta al si data')
      link.download = name;
    } else {
      link.classList.remove('active');
    }
  }
  


}
