if (!THI) {
  var THI = {}

  const operators = [
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

  const stateReduceFns = {
    allTrue: 'true if ALL true',
    anyTrue: 'true if ANY true',
    allFalse: 'false if ALL false',
    anyFalse: 'false if ANY false',
    min: 'minimum',
    max: 'maximum',
    custom: 'custom function...'
  }

  let useOpts = [
    { value: 'same', label: 'Use same key', hasValue: false },
    { value: 'diff', label: 'Use different key', validate: /[a-zA-Z_$][0-9a-zA-Z_$]*/ },
    { value: 'whole', label: 'Use whole state', hasValue: false }
  ]

  const opHasValue = opVal => {
    let op = operators.find(o => o.v == opVal)
    return op && op.hasValue !== false
  }

  const KEY_TEST = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/

  const thingPropsTypes = [
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
      validate: KEY_TEST
    },
    {
      value: 'state',
      label: 'state.',
      validate: KEY_TEST
    },
    {
      value: 'child',
      label: 'is child of',
      hasValue: false,
      comparable: false
    },
    {
      value: 'descendant',
      label: 'is descendant of',
      hasValue: false,
      comparable: false
    }
  ]

  const basicTypes = ['msg', 'flow', 'global', 'str', 'num', 'env']

  const typeTypes = [
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

  THI.makeLabel = thing => {
    let label = thing.name
    if (thing.id != '' && thing.id != undefined) label += ` : ${thing.id}`
    return label
  }

  THI.loadRulesContainer = rules => {
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
              types: THI.thingPropsTypes
            })

          let selectField = $('<select/>')
            .css({ width: 120, marginLeft: 5, textAlign: 'center' })
            .appendTo(row)
          THI.operators.forEach(({ v, t }) =>
            selectField.append($('<option></option>').val(v).text(t))
          )

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
            let hideSelect =
              THI.thingPropsTypes.find(tpt => tpt.value == valType).comparable === false
            selectField[hideSelect ? 'hide' : 'show']()
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

  let resizeRuleContainer = size => {
    let rows = $('#dialog-form>div:not(.node-input-rule-container-row)')
    let otherRowHeights = $.map(rows, el => $(el).outerHeight(true)).reduce((s, n) => s + n, 0)
    $('#node-input-rule-container')
      .editableList('height', size.height - 10 - otherRowHeights)
      .editableList('items')
      .each(function () {
        resizeRule($(this))
      })
  }

  let saveRules = () => {
    let rules = []
    $('#node-input-rule-container')
      .editableList('items')
      .each(function () {
        let ruleData = $(this).data('data')
        let rule = $(this)
        let type = rule.find('select').val()

        let r = { compare: type }

        r.thingProp = rule.find('.node-input-rule-thingProp').typedInput('type')
        let canHavePath = THI.thingPropsTypes
          .find(tpt => tpt.value == r.thingProp)
          .label.endsWith('.')
        let path = rule.find('.node-input-rule-thingProp').typedInput('value')
        if (canHavePath && path) r.thingProp += '.' + path

        if (THI.thingPropsTypes.find(tpt => tpt.value == r.thingProp).comparable === false)
          r.compare = 'inc'

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

  let setupList = (list, addText, addFn, data) => {
    list.editableList({
      addItem: addFn,
      removable: true,
      sortable: true,
      addButton: `add ${addText}`
    })
    if (data) populateList(list, JSON.parse(JSON.stringify(data))) // Poor man's clone
  }

  let populateList = (list, items = []) => {
    list.editableList('empty').editableList('addItems', items)
  }

  let getType = function (value) {
    if (typeof value == 'number') return 'num'
    if (typeof value == 'string') return 'str'
    if (typeof value == 'boolean') return 'bool'
    if (value instanceof RegExp) return 're'
    return 'json'
  }

  let keyTyped = function (key) {
    return {
      types: [
        {
          value: key,
          label: key + '.',
          validate: THI.KEY_TEST
        }
      ]
    }
  }

  let typedToString = function (value) {
    switch (getType(value)) {
      case 're':
        return value.toString().slice(1, -1)
      case 'json':
        return JSON.stringify(value)
      default:
        return value
    }
  }

  let makeLabel = function (thing) {
    let label = thing.name
    if (thing.id != '' && thing.id != undefined) label += ` : ${thing.id}`
    return label
  }

  let setTypedInput = function (input, type, value) {
    input.typedInput('type', type)
    if (value !== undefined) input.typedInput('value', value)
  }

  let typedValue = function (type, value) {
    switch (type) {
      case 'num':
        return Number(value)
      case 'bool':
        return value == 'either' ? 'either' : value == 'true'
      case 'json':
        try {
          return JSON.parse(value)
        } catch (e) {
          return value
        }
      case 're':
        return new RegExp(value)
      default:
        return value
    }
  }

  let getTypedInput = function (input) {
    let type = input.typedInput('type')
    let value = input.typedInput('value')
    return { type, value: typedValue(type, value) }
  }

  //                   PROPS

  THI.addProp = (row, i, data) => {
    $('<input/>', { class: 'node-input-list-key' })
      .css('width', '50%')
      .appendTo(row)
      .typedInput(keyTyped('props'))
      .typedInput('value', data.key)

    $('<div/>', { style: 'display:inline-block; padding:0px 6px;' }).text('=').appendTo(row)

    $('<input/>', { class: 'node-input-list-value' })
      .css('width', 'calc(50% - 30px)')
      .appendTo(row)
      .typedInput({
        types: ['str', 'num', 'bool', 'json', 're'],
        default: data.hasOwnProperty('value') ? getType(data.value) : 'str'
      })
      .typedInput('value', typedToString(data.value))
  }

  THI.saveProps = list => {
    let props = {}
    list.editableList('items').each(function () {
      let key = getTypedInput($(this).find('.node-input-list-key')).value
      if (key == '') return
      let value = getTypedInput($(this).find('.node-input-list-value')).value
      RED.utils.setMessageProperty(props, key, value, true)
    })
    return props
  }

  //                   STATE

  THI.addState = (row, i, data) => {
    // data could be:
    // { key, value }
    // { key, child, *childKey }
    // { key, fn, *childKey }

    // Default (on add)
    if (!data.hasOwnProperty('key')) data = { key: '', value: '' }

    // Create rows and typedInputs

    let row1 = $('<div>').appendTo(row)
    let row2 = $('<div>').css({ marginTop: 5 }).appendTo(row)
    let row3 = $('<div>').css({ marginTop: 5 }).appendTo(row)

    // v ROW 1

    let key = $('<input>', { class: 'node-input-list-key' })
      .css('width', '50%')
      .appendTo(row1)
      .typedInput(keyTyped('state'))

    $('<div/>', { style: 'display:inline-block; padding:0px 6px;' }).text('=').appendTo(row1)

    let value = $('<input>', { class: 'node-input-list-value' })
      .css('width', 'calc(50% - 30px)')
      .appendTo(row1)
      .typedInput({
        types: [
          'str',
          'num',
          'bool',
          'json',
          're',
          {
            value: 'proxy',
            label: 'proxy...',
            hasValue: false
          }
        ]
      })
      .on('change', function (e, type) {
        let shide = type == 'proxy' ? 'show' : 'hide'
        row2[shide]()
        proxyFrom.change()
        row3[shide]()
      })

    // v ROW 2

    let lastProxyType
    let proxyFrom = $('<input>', {
      class: 'node-input-list-proxyFrom typedInput-with-padding'
    })
      .appendTo(row2)
      .typedInput({
        types: [
          {
            value: 'single',
            label: 'From another thing',
            validate: /[0-9a-zA-Z_]+/
          },
          {
            value: 'multi',
            label: 'From all children',
            options: Object.values(stateReduceFns)
          }
        ]
      })
      .typedInput('width', '53%')
      .on('change', function (e, type) {
        let custom = type == 'multi' && e.target.value == 'custom function...'
        row3[custom ? 'show' : 'hide']()
        use.typedInput('types', custom ? useOpts : useOpts.filter(o => o.value != 'whole'))

        if (lastProxyType == 'multi' && type != 'multi')
          setTimeout(() => $(this).typedInput('value', ''), 0)
        lastProxyType = type
      })

    let use = $('<input>', { class: 'node-input-list-use typedInput-with-padding' })
      .css({ marginLeft: 3 })
      .appendTo(row2)
      .typedInput({
        types: useOpts
      })
      .typedInput('width', '42%')

    // v ROW 3

    $('<code>').text('function (values) {').appendTo(row3)
    let fn = $('<div>', {
      class: 'node-text-editor node-input-list-function',
      id: `node-text-editor-function-${i}`
    })
      .css({ height: 100, maxHeight: 100 })
      .appendTo(row3)
    $('<code>').text('}').appendTo(row3)
    fn.data().editor = RED.editor.createEditor({
      id: `node-text-editor-function-${i}`,
      mode: 'ace/mode/nrjavascript'
    })

    // Set current config

    key.typedInput('value', data.key)
    if (data.hasOwnProperty('value')) {
      setTypedInput(value, getType(data.value), data.value)
    } else {
      value.typedInput('type', 'proxy')
      if (data.hasOwnProperty('child')) {
        setTypedInput(proxyFrom, 'single', data.child)
      } else if (data.hasOwnProperty('fn')) {
        if (!stateReduceFns.hasOwnProperty(data.fn)) {
          // custom function
          setTypedInput(proxyFrom, 'multi', stateReduceFns.custom)
          fn.data().editor.setValue(data.fn)
        } else {
          setTypedInput(proxyFrom, 'multi', stateReduceFns[data.fn])
        }
      } else {
        // You shouldn't be here. How did you find this place?
      }
      if (!data.hasOwnProperty('childKey')) {
        setTypedInput(use, 'same')
      } else if (data.childKey === null) {
        setTypedInput(use, 'whole')
      } else {
        setTypedInput(use, 'diff', data.childKey)
      }
    }
  }

  THI.saveState = list => {
    let state = []
    list.editableList('items').each(function () {
      let s = {}

      s.key = getTypedInput($(this).find('.node-input-list-key')).value
      if (s.key == '') return

      let val = getTypedInput($(this).find('.node-input-list-value'))
      if (val.type != 'proxy') {
        // Init value
        s.value = val.value
      } else {
        // Proxy
        let proxyFrom = getTypedInput($(this).find('.node-input-list-proxyFrom'))
        if (proxyFrom.type == 'single') {
          // Single
          s.child = proxyFrom.value
        } else {
          // Multi (children)
          s.fn = Object.keys(stateReduceFns).find(k => stateReduceFns[k] == proxyFrom.value)
          if (s.fn == 'custom') s.fn = $(this).find('.node-input-list-function').getValue()
        }
        // Key usage
        let use = getTypedInput($(this).find('.node-input-list-use'))
        if (use.type == 'whole') {
          s.childKey = null
        } else if (use.type == 'diff') {
          s.childKey = use.value
        }
      }
      $(this).find('.node-input-list-function').data().editor.destroy()
      state.push(s)
    })
    return state
  }

  //                   COMMANDS

  THI.addCommand = (row, i, data) => {
    let lastCmdType
    let cmd = $('<input/>', { class: 'node-input-list-cmd' })
      .css({ width: '45%' })
      .appendTo(row)
      .typedInput({
        types: [
          'str',
          'num',
          {
            value: 'bool',
            label: 'boolean',
            icon: 'red/images/typedInput/bool.png',
            options: ['either', 'true', 'false']
          },
          {
            value: 'test',
            label: 'test',
            icon: 'red/images/typedInput/re.png'
          },
          {
            value: 'key',
            label: 'key',
            icon: 'red/images/typedInput/json.png'
          }
        ]
      })
      .on('change', function (e, type) {
        if (lastCmdType == 'bool' && type != 'bool')
          setTimeout(() => $(this).typedInput('value', ''), 0)
        lastCmdType = type
      })

    let to = $('<input/>', { class: 'node-input-list-to' })
      .css({
        marginLeft: 5,
        width: 'calc(55% - 20px)'
      })
      .appendTo(row)
      .typedInput({
        types: [
          { value: 'self', label: 'Process as self only', hasValue: false },
          { value: 'children', label: 'Forward to children only', hasValue: false },
          { value: 'child', label: 'Forward to ...' }
        ]
      })

    let row2 = $('<div>').css({ display: 'flex', alignItems: 'center' }).appendTo(row)
    let transform = $('<input>', { type: 'checkbox', class: 'node-input-list-transform' })
      .css({ margin: 0 })
      .appendTo(row2)
      .on('change', function (e) {
        as.typedInput(e.target.checked ? 'show' : 'hide')
      })
    $('<label>').css({ margin: 5 }).text('Transform').appendTo(row2)

    let as = $('<input/>', { class: 'node-input-list-as' })
      .appendTo(row2)
      .typedInput({
        types: ['str', 'num', 'bool', 'json']
      })
      .typedInput('hide')

    // Set types and values
    setTypedInput(cmd, data.type, data.cmd)
    if (data.child === null) {
      setTypedInput(to, 'children')
    } else if (data.hasOwnProperty('child')) {
      setTypedInput(to, 'child', data.child)
    } else {
      setTypedInput(to, 'self')
    }
    if (data.as) {
      transform.prop('checked', true).change()
      setTypedInput(as, getType(data.as), data.as)
    }
  }

  THI.saveCommands = list => {
    let commands = []
    list.editableList('items').each(function () {
      let c = {}

      let cmd = getTypedInput($(this).find('.node-input-list-cmd'))
      c.type = cmd.type
      c.cmd = cmd.value

      let to = getTypedInput($(this).find('.node-input-list-to'))
      if (to.type == 'child') {
        c.child = to.value
      } else if (to.type == 'children') {
        c.child = null
      }

      let transform = $(this).find('.node-input-list-transform').is(':checked')
      if (transform) cmd.as = getTypedInput($(this).find('.node-input-list-as')).value

      commands.push(c)
    })
    return commands
  }

  // -------------------------------------------------------------------

  Object.assign(THI, {
    operators,
    stateReduceFns,
    KEY_TEST,
    thingPropsTypes,
    basicTypes,
    typeTypes,
    resizeRuleContainer,
    saveRules,
    populateList,
    setupList,
    makeLabel
  })
}
