import TestContainer from 'mocha-test-container-support';

import {
  act
} from '@testing-library/preact';

import {
  bootstrapPropertiesPanel,
  inject
} from 'test/TestHelper';

import {
  filter
} from 'min-dash';

import {
  query as domQuery,
  queryAll as domQueryAll
} from 'min-dom';

import {
  getBusinessObject
} from 'bpmn-js/lib/util/ModelUtil';

import CoreModule from 'bpmn-js/lib/core';
import SelectionModule from 'diagram-js/lib/features/selection';
import ModelingModule from 'bpmn-js/lib/features/modeling';

import BpmnPropertiesPanel from 'src/render';

import CamundaPlatformPropertiesProvider from 'src/provider/camunda-platform';

import camundaModdleExtensions from 'camunda-bpmn-moddle/resources/camunda.json';

import {
  getExtensionElementsList
} from 'src/utils/ExtensionElementsUtil';

import diagramXML from './OutMappingProps.bpmn';


describe('provider/camunda-platform - OutMappingProps', function() {

  const testModules = [
    CoreModule, SelectionModule, ModelingModule,
    BpmnPropertiesPanel,
    CamundaPlatformPropertiesProvider
  ];

  const moddleExtensions = {
    camunda: camundaModdleExtensions
  };

  let container;

  beforeEach(function() {
    container = TestContainer.get(this);
  });

  beforeEach(bootstrapPropertiesPanel(diagramXML, {
    modules: testModules,
    moddleExtensions,
    debounceInput: false
  }));


  describe('bpmn:CallActivity#out', function() {

    it('should display', inject(async function(elementRegistry, selection) {

      // given
      const callActivity = elementRegistry.get('CallActivity_1');

      await act(() => {
        selection.select(callActivity);
      });

      // when
      const group = getGroup(container, 'CamundaPlatform__OutMapping');
      const listItems = getMappingListItems(group);

      // then
      expect(group).to.exist;
      expect(listItems.length).to.equal(getOutMappings(callActivity).length);
    }));


    it('should only display relevant mappings', inject(async function(elementRegistry, selection) {

      // given
      const callActivity = elementRegistry.get('CallActivity_1');

      await act(() => {
        selection.select(callActivity);
      });

      const allMappings = getAllOutMappings(callActivity);

      // assume
      // business key and variables=all not displayed
      expect(allMappings).to.have.length(6);

      // when
      const group = getGroup(container, 'CamundaPlatform__OutMapping');
      const listItems = getMappingListItems(group);

      // then
      expect(group).to.exist;
      expect(listItems.length).to.be.lessThan(allMappings.length);
    }));


    it('should add new out mapping', inject(async function(elementRegistry, selection) {

      // given
      const callActivity = elementRegistry.get('CallActivity_1');

      await act(() => {
        selection.select(callActivity);
      });

      const group = getGroup(container, 'CamundaPlatform__OutMapping');
      const addEntry = domQuery('.bio-properties-panel-add-entry', group);

      // when
      await act(() => {
        addEntry.click();
      });

      // then
      expect(getOutMappings(callActivity)).to.have.length(5);
    }));


    it('should create non existing extension elements',
      inject(async function(elementRegistry, selection) {

        // given
        const callActivity = elementRegistry.get('CallActivity_empty');

        await act(() => {
          selection.select(callActivity);
        });

        // assume
        expect(getBusinessObject(callActivity).get('extensionElements')).not.to.exist;

        const group = getGroup(container, 'CamundaPlatform__OutMapping');
        const addEntry = domQuery('.bio-properties-panel-add-entry', group);

        // when
        await act(() => {
          addEntry.click();
        });

        // then
        expect(getBusinessObject(callActivity).get('extensionElements')).to.exist;
        expect(getOutMappings(callActivity)).to.have.length(1);
      })
    );


    it('should re-use existing extensionElements', inject(async function(elementRegistry, selection) {

      // given
      const callActivity = elementRegistry.get('CallActivity_existingExtensionElements');

      await act(() => {
        selection.select(callActivity);
      });

      // assume
      expect(getBusinessObject(callActivity).get('extensionElements')).to.exist;

      const group = getGroup(container, 'CamundaPlatform__OutMapping');
      const addEntry = domQuery('.bio-properties-panel-add-entry', group);

      // when
      await act(() => {
        addEntry.click();
      });

      // then
      expect(getBusinessObject(callActivity).get('extensionElements')).to.exist;
      expect(getOutMappings(callActivity)).to.have.length(1);
    }));


    it('should delete out mapping', inject(async function(elementRegistry, selection) {

      // given
      const callActivity = elementRegistry.get('CallActivity_1');

      await act(() => {
        selection.select(callActivity);
      });

      const group = getGroup(container, 'CamundaPlatform__OutMapping');
      const listItems = getMappingListItems(group);
      const removeEntry = domQuery('.bio-properties-panel-remove-entry', listItems[0]);

      // when
      await act(() => {
        removeEntry.click();
      });

      // then
      expect(getOutMappings(callActivity)).to.have.length(3);
    }));


    it('should update on external change',
      inject(async function(elementRegistry, selection, commandStack) {

        // given
        const callActivity = elementRegistry.get('CallActivity_1');
        const originalMappings = getOutMappings(callActivity);

        await act(() => {
          selection.select(callActivity);
        });

        const group = getGroup(container, 'CamundaPlatform__OutMapping');
        const addEntry = domQuery('.bio-properties-panel-add-entry', group);
        await act(() => {
          addEntry.click();
        });

        // when
        await act(() => {
          commandStack.undo();
        });

        const listItems = getMappingListItems(group);

        // then
        expect(listItems.length).to.eql(originalMappings.length);
      })
    );

  });

});


// helper //////////////////

function getGroup(container, id) {
  return domQuery(`[data-group-id="group-${id}"`, container);
}

function getListItems(container, type) {
  return domQueryAll(`div[data-entry-id*="-${type}-"].bio-properties-panel-collapsible-entry`, container);
}

function getMappingListItems(container) {
  return getListItems(container, 'outMapping');
}

function getAllOutMappings(element) {
  const businessObject = getBusinessObject(element);
  return getExtensionElementsList(businessObject, 'camunda:Out');
}

function getOutMappings(element) {
  const mappings = getAllOutMappings(element);

  return filter(mappings, function(mapping) {
    return !mapping.businessKey && !(mapping.variables && mapping.variables === 'all');
  });
}