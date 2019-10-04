/* global sinon */

import {
  bootstrapModeler,
  inject
} from 'test/TestHelper';

import coreModule from 'lib/core';
import modelingModule from 'lib/features/modeling';
import { getBusinessObject } from '../../../../../lib/util/ModelUtil';


describe('features/modeling/behavior - detach events', function() {

  var testModules = [
    coreModule,
    modelingModule
  ];

  var detachEventBehaviorXML = require('./DetachEventBehavior.bpmn');

  beforeEach(bootstrapModeler(detachEventBehaviorXML, { modules: testModules }));


  describe('basics', function() {

    describe('create', function() {

      it('should replace', inject(function(elementFactory, elementRegistry, modeling) {

        // given
        var process = elementRegistry.get('Process_1');

        var boundaryEvent = elementFactory.createShape({ type: 'bpmn:BoundaryEvent' });

        // when
        var intermediateThrowEvent = modeling.createElements(
          boundaryEvent, { x: 200, y: 100 }, process
        )[0];

        // then
        var intermediateThrowEventBo = getBusinessObject(intermediateThrowEvent);

        expect(intermediateThrowEventBo.$type).to.equal('bpmn:IntermediateThrowEvent');
      }));


      it('should NOT replace', inject(function(elementFactory, elementRegistry, modeling) {

        // given
        var task = elementRegistry.get('Task_1'),
            taskBo = getBusinessObject(task);

        var boundaryEvent = elementFactory.createShape({ type: 'bpmn:BoundaryEvent' }),
            boundaryEventBo = getBusinessObject(boundaryEvent);

        // when
        boundaryEvent = modeling.createElements(
          boundaryEvent, { x: 100, y: 60 }, task, { attach: true }
        )[0];

        // then
        expect(boundaryEventBo.$type).to.equal('bpmn:BoundaryEvent');
        expect(boundaryEventBo.attachedToRef).to.equal(taskBo);
      }));

    });


    describe('move', function() {

      it('should replace', inject(function(elementRegistry, modeling) {

        // given
        var process = elementRegistry.get('Process_1'),
            boundaryEvent = elementRegistry.get('BoundaryEvent_1');

        // when
        modeling.moveElements([ boundaryEvent ], { x: 0, y: 100 }, process);

        // then
        var intermediateThrowEvent = elementRegistry.get('BoundaryEvent_1'),
            intermediateThrowEventBo = getBusinessObject(intermediateThrowEvent);

        expect(intermediateThrowEvent).to.exist;
        expect(intermediateThrowEventBo.$type).to.equal('bpmn:IntermediateThrowEvent');
        expect(intermediateThrowEventBo.attachedToRef).not.to.exist;
      }));


      it('should NOT replace', inject(function(elementRegistry, modeling) {

        // given
        var task = elementRegistry.get('Task_1'),
            taskBo = getBusinessObject(task),
            boundaryEvent = elementRegistry.get('BoundaryEvent_1');

        // when
        modeling.moveElements([ boundaryEvent ], { x: 0, y: -80 }, task, { attach: true });

        // then
        boundaryEvent = elementRegistry.get('BoundaryEvent_1');

        var boundaryEventBo = getBusinessObject(boundaryEvent);

        expect(boundaryEventBo.$type).to.equal('bpmn:BoundaryEvent');
        expect(boundaryEventBo.attachedToRef).to.equal(taskBo);
      }));


      it('should execute on batch', inject(function(canvas, elementRegistry, modeling) {

        // given
        var eventIds = [ 'BoundaryEventWithLabel', 'BoundarySignalEvent', 'BoundaryTimerEvent', 'BoundaryEvent_1' ],
            elements = eventIds.map(function(eventId) {
              return elementRegistry.get(eventId);
            }),
            clone = elements.slice(),
            root = canvas.getRootElement();

        // when
        modeling.moveElements(elements, { x: 0, y: 300 }, root);

        // then
        elements.forEach(function(element, index) {
          var expectedType = isCatchEvent(element) ? 'bpmn:IntermediateCatchEvent' : 'bpmn:IntermediateThrowEvent';

          expect(clone[ index ].parent).to.not.exist;
          expect(element.parent).to.exist;
          expect(element.type).to.equal(expectedType);
          expect(element.businessObject.attachedToRef).to.not.exist;
          expect(element.parent).to.equal(root);
        });
      }));


      it('should not execute when moved with host', inject(function(canvas, elementRegistry, modeling) {

        // given
        var eventIds = [ 'BoundaryEventWithLabel', 'BoundaryEvent_1', 'BoundaryTimerEvent' ],
            elements = eventIds.map(function(eventId) {
              return elementRegistry.get(eventId);
            }),
            task = elementRegistry.get('Task_1'),
            root = canvas.getRootElement(),
            elementsToMove = elements.concat(task);

        // when
        modeling.moveElements(elementsToMove, { x: 0, y: 300 }, root);

        // then
        elements.forEach(function(element) {
          expect(element.host).to.eql(task);
          expect(element.type).to.equal('bpmn:BoundaryEvent');
          expect(element.businessObject.attachedToRef).to.equal(task.businessObject);
        });
      }));
    });

  });


  describe('event definitions', function() {

    var ids = [
      'BoundaryConditionalEvent',
      'BoundaryMessageEvent',
      'BoundarySignalEvent',
      'BoundaryTimerEvent'
    ];

    ids.forEach(function(id) {

      it('should copy event definition', inject(function(elementRegistry, modeling) {

        // given
        var process = elementRegistry.get('Process_1'),
            boundaryEvent = elementRegistry.get(id),
            boundaryEventBo = getBusinessObject(boundaryEvent),
            eventDefinitions = boundaryEventBo.eventDefinitions;

        // when
        modeling.moveElements([ boundaryEvent ], { x: 0, y: 100 }, process);

        // then
        var intermediateCatchEvent = elementRegistry.get(id),
            intermediateCatchEventBo = getBusinessObject(intermediateCatchEvent);

        expect(intermediateCatchEventBo.$type).to.equal('bpmn:IntermediateCatchEvent');
        expect(intermediateCatchEventBo.eventDefinitions).to.jsonEqual(eventDefinitions, skipId);
      }));

    });


    it('should NOT create event definition', inject(function(elementRegistry, modeling) {

      // given
      var process = elementRegistry.get('Process_1'),
          boundaryEvent = elementRegistry.get('BoundaryEvent_1'),
          boundaryEventBo = getBusinessObject(boundaryEvent),
          eventDefinitions = boundaryEventBo.eventDefinitions;

      // when
      modeling.moveElements([ boundaryEvent ], { x: 0, y: 100 }, process);

      // then
      var intermediateThrowEvent = elementRegistry.get('BoundaryEvent_1'),
          intermediateThrowEventBo = getBusinessObject(intermediateThrowEvent);

      expect(intermediateThrowEventBo.$type).to.equal('bpmn:IntermediateThrowEvent');
      expect(intermediateThrowEventBo.eventDefinitions).to.jsonEqual(eventDefinitions, skipId);
    }));

  });


  describe('connections', function() {

    it('should NOT remove outgoing connection', inject(function(elementRegistry, modeling) {

      // given
      var process = elementRegistry.get('Process_1'),
          endEvent = elementRegistry.get('EndEvent_1'),
          boundaryEvent = elementRegistry.get('BoundaryEvent_1');

      // when
      modeling.moveElements([ boundaryEvent ], { x: 0, y: 100 }, process);

      // then
      var intermediateThrowEvent = elementRegistry.get('BoundaryEvent_1');

      expect(intermediateThrowEvent.outgoing).to.have.lengthOf(1);
      expect(endEvent.incoming).to.have.lengthOf(1);
    }));


    it('should lay out connection once', inject(function(eventBus, elementRegistry, modeling) {

      // given
      var process = elementRegistry.get('Process_1'),
          boundaryEvent = elementRegistry.get('BoundaryEvent_1');

      var layoutSpy = sinon.spy();

      eventBus.on('commandStack.connection.layout.execute', layoutSpy);

      // when
      modeling.moveElements([ boundaryEvent ], { x: 0, y: 100 }, process);

      // then
      expect(layoutSpy).to.be.calledOnce;
    }));

  });


  describe('labels', function() {

    it('should NOT replace', inject(function(elementRegistry, modeling) {

      var process = elementRegistry.get('Process_1'),
          boundaryEvent = elementRegistry.get('BoundaryEvent_1'),
          label = boundaryEvent.label;

      // when
      modeling.moveElements([ label ], { x: 0, y: 100 }, process);

      // then
      expect(elementRegistry.get('BoundaryEvent_1')).to.equal(boundaryEvent);
    }));

  });

});



// helpers //////////
function skipId(key, value) {
  if (key === 'id') {
    return;
  }

  return value;
}

function getEventDefinition(element) {
  var bo = element.businessObject;

  return bo && bo.eventDefinitions && bo.eventDefinitions[0];
}

function isCatchEvent(shape) {
  return !!getEventDefinition(shape);
}
