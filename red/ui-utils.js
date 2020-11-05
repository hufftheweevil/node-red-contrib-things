let operators = [
  { v: 'eq', t: '==' },
  { v: 'neq', t: '!=' },
  { v: 'lt', t: '<' },
  { v: 'lte', t: '<=' },
  { v: 'gt', t: '>' },
  { v: 'gte', t: '>=' },
  { v: 'hask', t: 'has key' },
  { v: 'btwn', t: 'is between' },
  { v: 'cont', t: 'contains' },
  { v: 'regex', t: 'matches regex' },
  { v: 'true', t: 'is true', hasValue: false },
  { v: 'ntrue', t: 'is not true', hasValue: false },
  { v: 'false', t: 'is false', hasValue: false },
  { v: 'nfalse', t: 'is not false', hasValue: false },
  { v: 'null', t: 'is null', hasValue: false },
  { v: 'nnull', t: 'is not null', hasValue: false },
  { v: 'istype', t: 'is of type' },
  { v: 'empty', t: 'is empty', hasValue: false },
  { v: 'nempty', t: 'is not empty', hasValue: false }
]

function opHasValue(opVal) {
  let op = operators.find(o => o.v == opVal)
  return op && op.hasValue !== false
}

let thingPropsTypes = [
  {
    value: 'name',
    label: 'name',
    hasValue: false,
    ops: ['eq', 'neq', 'regex']
  },
  {
    value: 'id',
    label: 'id',
    hasValue: false,
    ops: ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'regex', 'is empty', 'is not empty']
  },
  {
    value: 'type',
    label: 'type',
    hasValue: false,
    ops: ['eq', 'neq', 'regex']
  },
  {
    value: 'props',
    label: 'props.',
    validate: /^[0-9a-zA-Z_\.]*$/
  },
  {
    value: 'state',
    label: 'state.',
    validate: /^[0-9a-zA-Z_\.]*$/
  },
  {
    value: 'group',
    label: 'is in group',
    hasValue: false
  }
]

let basicTypes = ['msg', 'flow', 'global', 'str', 'num', 'env']

let typeTypes = [
  {
    value: 'string',
    label: RED._('common.type.string'),
    hasValue: false,
    icon: 'red/images/typedInput/az.png'
  },
  {
    value: 'number',
    label: RED._('common.type.number'),
    hasValue: false,
    icon: 'red/images/typedInput/09.png'
  },
  {
    value: 'boolean',
    label: RED._('common.type.boolean'),
    hasValue: false,
    icon: 'red/images/typedInput/bool.png'
  },
  {
    value: 'array',
    label: RED._('common.type.array'),
    hasValue: false,
    icon: 'red/images/typedInput/json.png'
  },
  {
    value: 'buffer',
    label: RED._('common.type.buffer'),
    hasValue: false,
    icon: 'red/images/typedInput/bin.png'
  },
  {
    value: 'object',
    label: RED._('common.type.object'),
    hasValue: false,
    icon: 'red/images/typedInput/json.png'
  },
  {
    value: 'json',
    label: RED._('common.type.jsonString'),
    hasValue: false,
    icon: 'red/images/typedInput/json.png'
  },
  { value: 'undefined', label: RED._('common.type.undefined'), hasValue: false },
  { value: 'null', label: RED._('common.type.null'), hasValue: false }
]

function loadRulesContainer(rules) {
  $('#node-input-rule-container')
    .css({ minHeight: 150, width: 600, minWidth: 600 })
    .editableList({
      addItem: function (container, i, rule) {
        // Defaults
        rule.thingProp = rule.thingProp || 'state'
        rule.compare = rule.compare || 'eq'

        container.css({
          overflow: 'hidden',
          whiteSpace: 'nowrap'
        })

        let row = $('<div/>').appendTo(container)

        let propField = $('<input/>', {
          class: 'node-input-rule-thingProp',
          type: 'text'
        })
          .css({ width: 200, marginLeft: 5 })
          .appendTo(row)
          .typedInput({
            default: 'state',
            types: thingPropsTypes
          })

        let selectField = $('<select/>')
          .css({ width: 120, marginLeft: 5, textAlign: 'center' })
          .appendTo(row)
        operators.forEach(({ v, t }) => selectField.append($('<option></option>').val(v).text(t)))

        let valueField = $('<input/>', {
          class: 'node-input-rule-value',
          type: 'text'
        })
          .css({ marginLeft: 5 })
          .appendTo(row)
          .typedInput({
            default: 'str',
            types: basicTypes
          })

        let value2Field = $('<input/>', {
          class: 'node-input-rule-value2',
          type: 'text'
        })
          .css({ marginLeft: 2, width: 0 })
          .appendTo(row)
          .typedInput({
            default: 'num',
            types: basicTypes
          })

        let caseSensitive = $('<div/>', {
          style: 'display: inline-flex'
        }).appendTo(row)
        let caseSensitiveBox = $('<input/>', {
          id: 'node-input-rule-case-' + i,
          class: 'node-input-rule-case',
          type: 'checkbox'
        })
          .css({ width: 'fit-content', margin: 3 })
          .appendTo(caseSensitive)
        $('<label/>', { for: 'node-input-rule-case-' + i })
          .css({ fontSize: 'smaller' })
          .text('ignore case')
          .appendTo(caseSensitive)

        propField.on('change', function (xx, valType) {
          selectField[valType == 'group' ? 'hide' : 'show']()
        })
        selectField.on('change', function () {
          let type = selectField.val()

          if (opHasValue(type)) {
            valueField.typedInput('show')
            valueField.typedInput('types', type === 'istype' ? typeTypes : basicTypes)
            valueField.typedInput('type', /lt|lte|gt|gte|btwn/.test(type) ? 'num' : 'str') // Default
          } else {
            valueField.typedInput('hide')
          }

          if (type === 'btwn') {
            value2Field.typedInput('show')
            value2Field.typedInput('types', basicTypes)
            value2Field.typedInput('type', 'num') // Default
          } else {
            value2Field.typedInput('hide')
          }

          if (type === 'regex') {
            caseSensitive.show()
          } else {
            caseSensitive.hide()
          }

          resizeRule(container)
        })

        // Load current config...

        let [x, root, path] = rule.thingProp.match(/([^.]+)(?:\.(.+))?/)
        propField.typedInput('type', root)
        if (path) propField.typedInput('value', path)

        if (operators.find(op => op.v == rule.compare)) selectField.val(rule.compare)
        selectField.change() // Ensure proper types are listed before loading types and values

        valueField.typedInput('type', rule.valType)
        if (rule.compare !== 'istype') valueField.typedInput('value', rule.value)

        if (rule.compare == 'btwn') {
          value2Field.typedInput('type', rule.valType2)
          value2Field.typedInput('value', rule.value2)
        }
        if (rule.compare == 'regex') caseSensitiveBox.prop('checked', rule.case)
      },
      sortable: true,
      removable: true,
      addButton: 'add rule'
    })

  rules.forEach(rule => $('#node-input-rule-container').editableList('addItem', rule))
}

function resizeRule(rule) {
  let newWidth = rule.width()
  let selectField = rule.find('select')
  let type = selectField.val() || ''
  let valueField = rule.find('.node-input-rule-value')
  let value2Field = rule.find('.node-input-rule-value2')
  let selectWidth = type.length < 4 ? 45 : type === 'regex' ? 115 : 105
  selectField.width(selectWidth)
  let remainingWidth = newWidth - selectWidth - 235 // 200 = thingPath input
  if (type === 'btwn') {
    valueField.typedInput('width', remainingWidth / 2)
    value2Field.typedInput('width', remainingWidth / 2)
  } else if (opHasValue(type)) {
    if (type === 'regex') remainingWidth -= 80 // Ignore case option
    valueField.typedInput('width', remainingWidth)
  }
}

function resizeRuleContainer(size) {
  let rows = $('#dialog-form>div:not(.node-input-rule-container-row)')
  let otherRowHeights = $.map(rows, el => $(el).outerHeight(true)).reduce((s, n) => s + n, 0)
  $('#node-input-rule-container')
    .editableList('height', size.height - 10 - otherRowHeights)
    .editableList('items')
    .each(function () {
      resizeRule($(this))
    })
}

function saveRules() {
  let rules = []
  $('#node-input-rule-container')
    .editableList('items')
    .each(function () {
      let ruleData = $(this).data('data')
      let rule = $(this)
      let type = rule.find('select').val()

      let r = { compare: type }

      r.thingProp = rule.find('.node-input-rule-thingProp').typedInput('type')
      let canHavePath = thingPropsTypes.find(tpt => tpt.value == r.thingProp).label.endsWith('.')
      let path = rule.find('.node-input-rule-thingProp').typedInput('value')
      if (canHavePath && path) r.thingProp += '.' + path

      if (r.thingProp == 'group') r.compare = 'inc'

      if (opHasValue(type)) {
        let typeOrValue = type === 'istype' ? 'type' : 'value'
        r.value = rule.find('.node-input-rule-value').typedInput(typeOrValue)
        r.valType = rule.find('.node-input-rule-value').typedInput('type')

        if (type === 'btwn') {
          r.value2 = rule.find('.node-input-rule-value2').typedInput('value')
          r.valType2 = rule.find('.node-input-rule-value2').typedInput('type')
        }

        if (type === 'regex') {
          r.case = rule.find('.node-input-rule-case').prop('checked')
        }
      }
      rules.push(r)
    })
  return rules
}
