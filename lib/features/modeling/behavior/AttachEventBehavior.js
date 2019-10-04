import inherits from 'inherits';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';

import { getBusinessObject } from '../../../util/ModelUtil';

import { isAny } from '../util/ModelingUtil';

import { isLabel } from '../../../util/LabelUtil';


/**
 * Replace intermediate event with boundary event when creating or moving results in attached event.
 */
export default function AttachEventBehavior(bpmnFactory, bpmnReplace, elementFactory, injector) {
  injector.invoke(CommandInterceptor, this);

  this._bpmnReplace = bpmnReplace;

  var self = this;

  this.preExecute('shape.create', function(context) {
    var shape = context.shape,
        host = context.host,
        businessObject;

    var attrs = {
      cancelActivity: true
    };

    if (shouldAttach(shape, host)) {
      attrs.attachedToRef = host.businessObject;

      businessObject = bpmnFactory.create('bpmn:BoundaryEvent', attrs);

      context.shape = elementFactory.createShape({
        type: 'bpmn:BoundaryEvent',
        businessObject: businessObject
      });
    }
  }, true);

  this.preExecute('elements.move', function(context) {
    var shapes = context.shapes,
        host = context.newHost;

    if (shapes.length !== 1) {
      return;
    }

    var shape = shapes[0];

    if (shouldAttach(shape, host)) {
      context.shapes = [ self.replaceShape(shape, host) ];
    }
  }, true);
}

AttachEventBehavior.$inject = [
  'bpmnFactory',
  'bpmnReplace',
  'elementFactory',
  'injector'
];

inherits(AttachEventBehavior, CommandInterceptor);

AttachEventBehavior.prototype.replaceShape = function(shape, host) {
  var eventDefinition = getEventDefinition(shape);

  var boundaryEvent = {
    type: 'bpmn:BoundaryEvent',
    host: host
  };

  if (eventDefinition) {
    boundaryEvent.eventDefinitionType = eventDefinition.$type;
  }

  return this._bpmnReplace.replaceElement(shape, boundaryEvent, { layoutConnection: false });
};


// helpers //////////
function getEventDefinition(element) {
  var businessObject = getBusinessObject(element),
      eventDefinitions = businessObject.eventDefinitions;

  return eventDefinitions && eventDefinitions[0];
}

function shouldAttach(shape, host) {
  return !isLabel(shape) &&
    isAny(shape, [ 'bpmn:IntermediateThrowEvent', 'bpmn:IntermediateCatchEvent' ]) && !!host;
}
