let ThingsDirectory = (function () {
  let socket

  function connect() {
    socket = new WebSocket(`ws://${window.location.hostname}:8120/`)
    socket.onopen = () => {
      $('#things-dir-info').text('awaiting list')
      socket.send('list')
    }
    socket.onmessage = event => {
      $('#things-dir-info').text('connected')
      let { topic, payload } = JSON.parse(event.data)
      switch (topic) {
        case 'list':
          fullRefresh(payload)
          break
        case 'update':
          let newRow = makeThingRow(payload)
          $(`#Thing__${withoutSpaces(payload.name)}`).replaceWith(newRow)
          fixBorder(newRow)
          if (filterType && filterType != payload.type) newRow.hide()
          break
      }
    }
    socket.onclose = () => {
      $('#things-dir-info').text('DISCONNECTED...')
      setTimeout(() => socket.readyState !== WebSocket.OPEN && connect(), 5000)
    }
  }
  connect()

  let filterType

  let statusColors = {
    red: '#c00',
    green: '#5a8',
    yellow: '#F9DF31',
    blue: '#53A3F3',
    grey: '#d3d3d3',
    gray: '#d3d3d3'
  }

  function fixBorder(row) {
    // Fixes border color for non-standard themes
    $(row.children()[1]).css('border-right-color', $(row.children()[0]).css('border-right-color'))
  }

  function withoutSpaces(str) {
    return str.replace(/ /g, '__')
  }

  function init() {
    let content = $('<div>').addClass('red-ui-sidebar-context red-ui-sidebar-context-stack').css({
      position: 'relative',
      height: '100%',
      overflowY: 'hidden'
    })

    // Header...

    let header = $('<div>').appendTo(content)

    $('<select id="things-type-filter">')
      .css({ float: 'left', height: 28, margin: 2, fontSize: 12 })
      .change(function () {
        let value = $(this).val()
        if (value == '') {
          filterType = null
          $(`#things-table tr`).show()
          $(`#things-type-filter [value='']`).text('Filter type...')
        } else {
          filterType = value
          $(`#things-table tr`)
            .not(`.thing-row-type-${withoutSpaces(value)}`)
            .not(`:first-child`)
            .hide()
          $(`#things-table tr.thing-row-type-${withoutSpaces(value)}`).show()
          $(`#things-type-filter [value='']`).text('xxxx Clear Filter xxxx')
        }
      })
      .html('<option value="">Filter type...</option>')
      .appendTo(header)

    $('<span id="things-dir-info">initializing...</span>')
      .addClass('red-ui-sidebar-context-updated')
      .css({ float: 'right', padding: 5 })
      .appendTo(header)

    // Table...

    let tableCont = $('<div>')
      .css({ clear: 'both', overflowY: 'scroll', height: 'calc(100% - 30px)' })
      .appendTo(content)

    let table = $('<table>')
      .addClass('red-ui-info-table')
      .html('<tbody id="things-table"></tbody>')
      .appendTo(tableCont)

    // Add tab
    RED.sidebar.addTab({
      id: 'things-directory',
      label: ' things',
      name: 'Things Directory',
      content,
      enableOnEdit: true,
      iconClass: 'fa fa-cubes'
    })

    // First request
    // *** MUST BE DONE LAST; for some reason no code runs after this ***
    socket.send('list')
  }

  function fullRefresh(things) {
    let table = $('#things-table')
    table.empty()

    things.sort((a, b) => a.name.localeCompare(b.name))

    if (things.length) {
      // Header Row
      let headerRow = $(`<tr class="red-ui-help-info-row" style="font-weight: bold">
          <td class="red-ui-sidebar-context-property">Thing</td>
          <td style="vertical-align: top; padding: 3px 3px 3px 6px; overflow-y: hidden; border-right: solid 1px #ddd">State</td>
          <td>Props</td>
        </tr>`).appendTo(table)
      fixBorder(headerRow)

      // Each thing row
      things.forEach(thing => {
        let thingRow = makeThingRow(thing)
        thingRow.appendTo(table)
        fixBorder(thingRow)
        if (filterType && filterType != thing.type) thingRow.hide()
      })
    } else {
      // No things
      let row = $('<tr>')
        .addClass('red-ui-help-info-row red-ui-search-empty blank')
        .html('<td colspan="3">No things setup</td>')
        .appendTo(table)
    }

    // Recreate type-filter list (in case types removed/added)
    let filter = $('#things-type-filter')
    let sel = filter.val()
    filter.children(':not(:first-child)').remove()
    let types = things.map(t => t.type)
    let typeOpts = types
      .filter((v, i, a) => a.indexOf(v) == i)
      .sort()
      .map(type => $(`<option value='${type}'>${type}</option>`))
    filter
      .append(typeOpts)
      .val(types.includes(sel) ? sel : '')
      .change()
  }

  function makeThingRow(thing) {
    let thingRow = $(
      `<tr class="red-ui-help-info-row thing-row-type-${withoutSpaces(
        thing.type
      )}" id="Thing__${withoutSpaces(thing.name)}">
            <td class="red-ui-sidebar-context-property"></td>
            <td style="vertical-align: top; padding: 3px 3px 3px 6px; overflow-y: hidden; border-right: solid 1px #ddd"></td>
            <td></td>
          </tr>`
    )

    let identCol = $(thingRow.children()[0])
    let stateCol = $(thingRow.children()[1])
    let propsCol = $(thingRow.children()[2])

    // IDENT COLUMN

    identCol.text(thing.name)

    let buttons = $('<div>')
      .css({ position: 'absolute', right: 3, top: 3 })
      .hide()
      .appendTo(identCol)

    RED.popover.tooltip(
      $('<button class="red-ui-button red-ui-button-small">')
        .html('<i class="fa fa-copy"></i>')
        .appendTo(buttons)
        .on('click', function (e) {
          RED.clipboard.copyText(thing.name)
        }),
      'Copy name'
    )

    RED.popover.tooltip(
      $('<button class="red-ui-button red-ui-button-small">')
        .html('<i class="fa fa-trash"></i>')
        .appendTo(buttons)
        .on('click', function (e) {
          e.preventDefault()
          e.stopPropagation()
          $('<div id="red-ui-confirm-dialog" class="hide">')
            .html(`This could have unintended consequences. Use with caution.`)
            .appendTo('#red-ui-editor')
            .dialog({
              modal: true,
              autoOpen: true,
              width: 700,
              resizable: false,
              classes: {
                'ui-dialog': 'red-ui-editor-dialog',
                'ui-widget-overlay': 'red-ui-editor-dialog'
              },
              title: `Delete thing ${thing.name}?`,
              buttons: [
                {
                  id: 'red-ui-confirm-delete-without',
                  text: 'Delete thing',
                  class: 'primary',
                  click: function () {
                    socket.send(
                      JSON.stringify({
                        topic: 'delete-thing',
                        payload: {
                          thing: thing.name
                        }
                      })
                    )
                    $(this).dialog('destroy')
                  }
                },
                {
                  id: 'red-ui-confirm-cancel',
                  text: 'Cancel',
                  click: function () {
                    $(this).dialog('destroy')
                  }
                }
              ]
            })
        }),
      'Delete thing'
    )

    identCol.hover(
      () => buttons.show(),
      () => buttons.hide()
    )

    $('<span>', { class: 'red-ui-sidebar-context-property-storename thing-type-and-id' })
      .text(`${thing.type}${thing.id && thing.id != thing.name ? ` : ${thing.id}` : ''}`)
      .appendTo(identCol)

    if (thing.children.length) {
      let list = $('<ul>', { class: 'red-ui-sidebar-context-property-storename' }).appendTo(
        identCol
      )
      thing.children.forEach(name => $('<li>').text(name).appendTo(list))
    }

    if (thing.status) {
      let status = $('<div>').css({ display: 'flex', alignItems: 'center' }).appendTo(identCol)

      if (thing.status.shape) {
        let color = statusColors[thing.status.fill]
        let svg = $('<div>')
          .css({
            marginRight: 5,
            width: 6,
            height: 6,
            backgroundColor: thing.status.shape == 'dot' ? color : 'transparent',
            borderStyle: 'solid',
            borderColor: color,
            borderWidth: 3,
            borderRadius: 2
          })
          .appendTo(status)
      }

      if (thing.status.text != '{}')
        $('<span>', { class: 'red-ui-flow-node-status-label' })
          .css({ color: '#888' })
          .text(thing.status.text)
          .appendTo(status)
    }

    // STATE COLUMN

    let state = Object.entries(thing.state)
    if (state.length) {
      state.forEach(([key, value]) => {
        let tools = $('<span class="button-group"></span>')

        let proxy =
          thing.config &&
          thing.config.state &&
          thing.config.state.find(pd => pd.key == key && pd.value === undefined)
        if (proxy) {
          let proxyInfo = $('<button class="red-ui-button red-ui-button-small">')
            .html('<i class="fa fa-chain"></i>')
            .appendTo(tools)
            .on('click', function (e) {
              if (proxy.child !== undefined) {
                let filterType = $('#things-type-filter').val()
                let proxyRow = $(`#Thing__${withoutSpaces(proxy.child)}`)
                // First determine if currently filtered and need to switch type
                let proxyType = proxyRow.find('.thing-type-and-id').html().split(' : ')[0]
                if (filterType != '' && filterType != proxyType)
                  $('#things-type-filter').val(proxyType).change()
                // Scroll to row
                proxyRow.get()[0].scrollIntoView()
              }
              e.preventDefault()
              e.stopPropagation()
            })
          RED.popover.tooltip(
            proxyInfo,
            [
              '<u>Proxy Info</u>',
              proxy.child !== undefined ? `Thing: ${proxy.child}` : 'All children',
              proxy.childKey !== undefined &&
                (proxy.childKey === null ? 'Whole state' : `State Key: ${proxy.childKey}`),
              proxy.fn
            ]
              .filter(l => l)
              .join('<br/>')
          )
        }

        let delButton = $('<button class="red-ui-button red-ui-button-small">')
          .html('<i class="fa fa-trash"></i>')
          .appendTo(tools)
          .on('click', function (e) {
            e.preventDefault()
            e.stopPropagation()
            $('<div id="red-ui-confirm-dialog" class="hide">')
              .html(
                `If you want to cause a trigger, consider that the new state value will be <code>undefined</code>. Only nodes that are configured to handle such a change will be triggered.`
              )
              .appendTo('#red-ui-editor')
              .dialog({
                modal: true,
                autoOpen: true,
                width: 700,
                resizable: false,
                classes: {
                  'ui-dialog': 'red-ui-editor-dialog',
                  'ui-widget-overlay': 'red-ui-editor-dialog'
                },
                title: `Delete state key "${key}" for ${thing.name}?`,
                buttons: [
                  {
                    id: 'red-ui-confirm-delete-without',
                    text: 'Delete key without causing trigger',
                    click: function () {
                      socket.send(
                        JSON.stringify({
                          topic: 'delete-state-key',
                          payload: {
                            thing: thing.name,
                            key
                          }
                        })
                      )
                      $(this).dialog('destroy')
                    }
                  },
                  {
                    id: 'red-ui-confirm-delete-without',
                    text: 'Delete key AND cause trigger',
                    class: 'primary',
                    click: function () {
                      socket.send(
                        JSON.stringify({
                          topic: 'delete-state-key',
                          payload: {
                            thing: thing.name,
                            key,
                            trigger: true
                          }
                        })
                      )
                      $(this).dialog('destroy')
                    }
                  },
                  {
                    id: 'red-ui-confirm-cancel',
                    text: 'Cancel',
                    click: function () {
                      $(this).dialog('destroy')
                    }
                  }
                ]
              })
          })
        RED.popover.tooltip(delButton, 'Delete key')

        RED.utils
          .createObjectElement(value, { key, tools, sourceId: `state.${key}` })
          .appendTo(stateCol)
          .find('.red-ui-debug-msg-type-number-toggle')
          .click()
          .click()
      })
    } else {
      $('<span class="red-ui-debug-msg-type-meta">none</span>').appendTo(stateCol)
    }

    // PROPS COLUMN

    let props = Object.entries(thing.props)
    if (props.length)
      props.forEach(([key, value]) =>
        RED.utils
          .createObjectElement(value, { key, sourceId: `props.${key}` })
          .appendTo(propsCol)
          .find('.red-ui-debug-msg-type-number-toggle')
          .click()
          .click()
      )
    else $('<span class="red-ui-debug-msg-type-meta">none</span>').appendTo(propsCol)

    return thingRow
  }

  return { init }
})()
