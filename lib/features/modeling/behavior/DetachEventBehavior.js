import inherits from 'inherits';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';

import {
  getBusinessObject,
  is
} from '../../../util/ModelUtil';

import { isLabel } from '../../../util/LabelUtil';


/**
 * Replace boundary event with intermediate event when creating or moving results in detached event.
 */
export default function DetachEventBehavior(bpmnReplace, injector) {
  injector.invoke(CommandInterceptor, this);

  this._bpmnReplace = bpmnReplace;

  var self = this;

  this.postExecute('elements.create', function(context) {
    var elements = context.elements;

    elements.filter(function(shape) {
      var host = shape.host;

      return shouldDetach(shape, host);
    }).map(function(shape) {
      return elements.indexOf(shape);
    }).forEach(function(index) {
      elements[ index ] = self.replaceShape(elements[ index ]);
    });
  }, true);

  this.preExecute('elements.move', function(context) {
    var shapes = context.shapes,
        host = context.newHost;

    if (shapes.length !== 1) {
      return;
    }

    var shape = shapes[0];

    if (shouldDetach(shape, host)) {
      context.shapes = [ self.replaceShape(shape) ];
    }
  }, true);
}

DetachEventBehavior.$inject = [
  'bpmnReplace',
  'injector'
];

inherits(DetachEventBehavior, CommandInterceptor);

DetachEventBehavior.prototype.replaceShape = function(shape) {
  var eventDefinition = getEventDefinition(shape),
      intermediateEvent;

  if (eventDefinition) {
    intermediateEvent = {
      type: 'bpmn:IntermediateCatchEvent',
      eventDefinitionType: eventDefinition.$type
    };
  } else {
    intermediateEvent = {
      type: 'bpmn:IntermediateThrowEvent'
    };
  }

  return this._bpmnReplace.replaceElement(shape, intermediateEvent, { layoutConnection: false });
};


// helpers //////////
function getEventDefinition(element) {
  var businessObject = getBusinessObject(element),
      eventDefinitions = businessObject.eventDefinitions;

  return eventDefinitions && eventDefinitions[0];
}

function shouldDetach(shape, host) {
  return !isLabel(shape) && is(shape, 'bpmn:BoundaryEvent') && !host;
}