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
          filterThings()
          break
      }
    }
    socket.onclose = () => {
      $('#things-dir-info').text('DISCONNECTED...')
      setTimeout(() => socket.readyState !== WebSocket.OPEN && connect(), 5000)
    }
  }
  connect()

  const SEARCHES = ['name', 'id', 'state', 'props']

  const SORT = { key: 'name', order: 'asc' }

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
    $('<style>')
      .prop('type', 'text/css')
      .html(
        `
      .search-box-with-clear {
          margin: 0 !important;
          width: 150px !important;
          height: 25px !important;
        }
      .search-box-with-clear::-webkit-search-cancel-button {
        -webkit-appearance: auto !important;
        cursor: pointer;
      }
    `
      )
      .appendTo('head')

    // Sidebar container

    let content = $('<div>').addClass('red-ui-sidebar-context red-ui-sidebar-context-stack').css({
      position: 'relative',
      height: '100%',
      overflowY: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    })

    // Header (Type select filter + status)

    let header = $('<div>').css({ flex: 1 }).appendTo(content)

    $('<select id="things-filter-type">')
      .css({ float: 'left', height: 28, margin: 2, fontSize: 12 })
      .change(function () {
        $(this)
          .find(':first-child')
          .text($(this).val() == '' ? 'Filter type...' : 'xxxx Clear Filter xxxx')
        filterThings()
      })
      .html('<option value="">Filter type...</option>')
      .appendTo(header)

    $('<span id="things-dir-info">initializing...</span>')
      .addClass('red-ui-sidebar-context-updated')
      .css({ float: 'right', padding: 5 })
      .appendTo(header)

    // Header 2 (All search filters)

    let header2 = $('<div>')
      .css({ flex: 2, display: 'flex', padding: 2, gap: 2, flexFlow: 'wrap' })
      .appendTo(content)
    SEARCHES.forEach(key => {
      let timeout
      $(
        `<input id="things-filter-${key}" placeholder="Search ${
          key[0].toUpperCase() + key.slice(1)
        }" type="search">`
      )
        .addClass('red-ui-text-container search-box-with-clear')
        .keyup(() => {
          clearTimeout(timeout)
          timeout = setTimeout(filterThings, 200)
        })
        .change(filterThings)
        .on('search', filterThings)
        .appendTo(header2)
    })

    // Table...

    let tableCont = $('<div>')
      .css({ flex: 1000, overflowY: 'scroll', height: 'calc(100% - 60px)' })
      .appendTo(content)

    $('<table>')
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

  function sortThings() {
    let allRows = $(`#things-table tr`).not(`:first-child`)

    let newOrder = allRows.sort((a, b) => {
      if (SORT.order == 'desc') [a, b] = [b, a]
      let A = $(a).data(SORT.key)
      let B = $(b).data(SORT.key)
      if (typeof A == 'string') return A.localeCompare(B)
      return A - B
    })

    newOrder.appendTo('#things-table')
  }

  function filterThings() {
    let allRows = $(`#things-table tr`).not(`:first-child`)

    let type = $(`#things-filter-type`).val()
    let matchRows =
      type == ''
        ? allRows
        : allRows.filter(function () {
            return $(this).data('type') == type
          })

    SEARCHES.forEach(key => {
      let val = $(`#things-filter-${key}`).val()
      if (val != '')
        matchRows = matchRows.filter(function () {
          return $(this).data(key).toString().match(new RegExp(val, 'i'))
        })
    })

    allRows.not(matchRows).hide()
    matchRows.show()
  }

  function fullRefresh(things) {
    let table = $('#things-table')
    table.empty()

    if (things.length) {
      // Header Row
      let headerRow = $(`<tr class="red-ui-help-info-row" style="font-weight: bold">
          <td class="red-ui-sidebar-context-property" id="thing-header-cell">Thing</td>
          <td style="vertical-align: top; padding: 3px 3px 3px 6px; overflow-y: hidden; border-right: solid 1px #ddd">State</td>
          <td>Props</td>
        </tr>`).appendTo(table)
      fixBorder(headerRow)

      // Sorting
      let sorting = $(`<div>`).appendTo('#thing-header-cell')
      $('<span>')
        .addClass(['fa', `fa-sort-alpha-${SORT.order}`])
        .css({ marginRight: 5, cursor: 'pointer', fontSize: 'small' })
        .click(function () {
          $(this).removeClass(`fa-sort-alpha-${SORT.order}`)
          SORT.order = SORT.order == 'asc' ? 'desc' : 'asc'
          $(this).addClass(`fa-sort-alpha-${SORT.order}`)
          sortThings()
        })
        .appendTo(sorting)
      $('<span>')
        .css({ minWidth: 25, cursor: 'pointer', display: 'inline-block', fontSize: 'x-small' })
        .text(SORT.key == 'name' ? 'Name' : 'ID')
        .click(function () {
          SORT.key = SORT.key == 'name' ? 'id' : 'name'
          $(this).text(SORT.key == 'name' ? 'Name' : 'ID')
          sortThings()
        })
        .appendTo(sorting)

      // Each thing row
      things.forEach(thing => {
        let thingRow = makeThingRow(thing)
        thingRow.appendTo(table)
        fixBorder(thingRow)
      })
    } else {
      // No things
      $('<tr>')
        .addClass('red-ui-help-info-row red-ui-search-empty blank')
        .html('<td colspan="3">No things setup</td>')
        .appendTo(table)
    }

    // Recreate type-filter list (in case types removed/added)
    let filter = $('#things-filter-type')
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

    sortThings()
    filterThings()
  }

  function makeThingRow(thing) {
    let dataProps = ['type', ...SEARCHES]
      .map(key => {
        let val =
          typeof thing[key] == 'string' ? thing[key] : JSON.stringify(thing[key]).replace(/"/g, '')
        return `data-${key}="${val}"`
      })
      .join(' ')

    let thingRow = $(
      `<tr class="red-ui-help-info-row thing-row-type-${withoutSpaces(
        thing.type
      )}" id="Thing__${withoutSpaces(thing.name)}" ${dataProps}>
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
                let filterType = $('#things-filter-type').val()
                let proxyRow = $(`#Thing__${withoutSpaces(proxy.child)}`)
                // First determine if currently filtered and need to switch type
                let proxyType = proxyRow.find('.thing-type-and-id').html().split(' : ')[0]
                if (filterType != '' && filterType != proxyType)
                  $('#things-filter-type').val(proxyType).change()
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
