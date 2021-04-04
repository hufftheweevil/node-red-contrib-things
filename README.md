# Things for Node-RED

A set of [Node-RED](https://github.com/node-red/node-red) nodes that uses an agnostic state management system to keep IOT device states and provide a uniform control system.

[![GitHub release](https://img.shields.io/github/release/hufftheweevil/node-red-contrib-things.svg?style=flat-square)](https://github.com/hufftheweevil/node-red-contrib-things/releases) [![NPM Version](https://img.shields.io/npm/v/node-red-contrib-things.svg?style=flat-square)](https://www.npmjs.com/package/node-red-contrib-things) [![GitHub last commit](https://img.shields.io/github/last-commit/hufftheweevil/node-red-contrib-things.svg?style=flat-square)](https://github.com/hufftheweevil/node-red-contrib-things/commits/master) [![Github All Releases](https://img.shields.io/npm/dw/node-red-contrib-things)](https://github.com/hufftheweevil/node-red-contrib-things/releases)
[![Node version](https://img.shields.io/node/v/node-red-contrib-things.svg?style=flat-square)](http://nodejs.org/download/) [![GitHub repo size in bytes](https://img.shields.io/github/repo-size/hufftheweevil/node-red-contrib-things.svg?style=flat-square)](https://github.com/hufftheweevil/node-red-contrib-things) [![npm](https://img.shields.io/npm/l/node-red-contrib-things.svg?style=flat-square)](https://github.com/hufftheweevil/node-red-contrib-things/blob/master/LICENSE)

**[Upgrading from v2?](#upgrading-from-v2)**

### Purpose

First, what these nodes do **not** do: These nodes have no connection outside of Node-RED. They do not directly receive data, nor do they directly send data.

This is an internal system that helps you better manage Node-RED projects, minimizing overhead and simplying flows. You provide outside connections, wire them to these nodes, and super-charge Node-RED! The system is minimalistic as possible while supporting virtually any use case.

### Usage

The core concept is to reduce all IOT devices into a common "language". This makes flows simpler and modification much easier. To facilitate this abstraction, this collection is provides four main segments/nodes:

- The inputs from various platforms of your choice are linked into the **_update_** node, which routes to...
- The **_trigger_** node, which links into your logic.
- Your logic may link into a **_command_** node, which routes to...
- The **_process_** node, which links back to the various platforms.

Exact usage varies depending on your use-case. However, this system is designed with the following general concepts in mind. This is an over-simplified representation. The two connections in the middle represent some of the inner-workings of this system.

![General usage overview](images/usage-overview.png)

The **_get_**, **_list_**, and **_test_** nodes assist in your flows.

### Inspiration

I started this library because I was using Lifx, TP-Link/Kasa, Harmony, Z-Wave, and several other types of "things", and I wanted to treat all lights, sensors, etc. as equals. When designing device flows, I didn't want to worry about the underlying platform.

A lot of the ideas used in this library are based on standard state management systems, most notably React and Redux.

I also tried to use as much built-in functionality as possible to keep with the themes of Node-RED. For example, the _ready_ node behaves similarly to the built-in _inject_ node. Many other properties follow Node-RED inputs conventions.

Lastly, I used node status -- as much as possible -- to assist with debugging. I've found that useful status makes nodes much more powerful. Debug options are also available on most nodes.

### What is a Thing?

A **_thing_**, as used in this library, is any device or entity in Node-RED for which you maintain state, trigger off state changes, and/or control. These could be simple devices such as lights and sensors, more complex devices such as thermostats and entertainment devices, or even non-connected "things" such as people.

This library of nodes does not actually connect to any of the devices; it only acts as a state management system. All outside communication needs to go through another Node-RED node. For example, to use Lifx lights, you need one of the Lifx Node-RED libraries.

### Things Directory

After deployment, the **Things Directory** lists all _things_ configured in the setup nodes. Information for each _thing_ includes `name`, `type`, `ID`, `status`, `state`, and `props`. Proxied state values show a small button when hovered that links to the proxy _thing_. You can filter the directory at the top.

**IMPORTANT:** If your Things Directory shows "DISCONNECTED" and you are using a container such as Docker, ensure you are allowing port `8120` through on your container in addition to the standard `1880` for Node-RED. This library uses port `8120` for websocket communication of real-time _thing_-related data to the editor.

### Upgrading from v2

Version 3 is designed to automatically upgrade version 2 nodes. The main difference is how the library stores configuration data for the _setup_ node. Therefore, it is **highly recommended** to back up your `flows.json` file before upgrading.

After upgrading to version 3, we **recommended** that you open every _setup_ and _trigger_ node and verify they remain configured as desired. We've run many tests to ensure everything upgrades properly, but of course there is always a chance for something to go wrong.

Please report any bugs you encounter.

**Other major changes from v2 to v3:**

- The concept of "Groups" has morphed into "Children" and are now available for any `type`.
- The two parts of the "Proxy" system have moved. State proxies are now part of State setup. Command proxies are now part of Command setup. See [Setup](#setup) below.

## Nodes

There are 8 nodes included: _setup_, _update_, _trigger_, _get_, _test_, _list_, _command_, and _process_.

### setup

You must configure all _things_ using this node. Use a different _setup_ node for each _type_ in your flows. It is up to you how you organize your _types_. We recommended you base them on the platforms you use -- in other words, based on how the devices connect into and out of Node-RED. There are no inputs or outputs for this node. The flows creates all listed things on deployment.

##### Properties

| Property   | Info                                                                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Thing Type | User's choice. Typically, the platform that these _things_ use to connect outside of Node-RED.                                                                     |
| Things     | Lists each _thing_ of this `type`. Click a _thing_ to see detailed setup properties.                                                                               |
| (common)   | Optional. Each `type` can have common State, Commands, or Status Function. These apply to all _things_ of this `type` unless overridden for an individual _thing_. |

**For each thing:**

| Property        | Info                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name            | Required. Must be unique among **all** _things_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ID              | Optional. Must be unique among all _things_ of same `type`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Props           | Optional. Static properties                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| State           | Optional. Initial state and proxied states. <ul> <li> On re-deployment, static values only initialize unassigned keys. </li><li> Proxied states can point to another _thing_ or a _thing_'s `children`. </li><li> Proxied states can refer to the same key or a different key. Or, if using a custom function for all `children`, the entire state can be used. </li><li> A custom function is given an array of `values`. The function should return reduced state for _thing_. </li> </ul>                                                                                                                                                                                                                                                                                                                                                       |
| Commands        | Optional. Special actions to take when handling commands. <ul> <li>Any command not listed is processed as the _thing_ itself **and** passes to `children`. You can disable broadcast to `children` here. </li><li> Configure a specific type of command, or use `test` for a regex test. </li><ul><li> You can use key-type for object-style commands. </li></ul><li> You can configure commands to process for self only, forward to `children` only, or forward to another _thing_. </li><li> Commands can be transformed to other commands before processing/forwarding. </li><ul><li> If using a key-type command and also using a transform, the key can be transformed without modifying the value. </li><li>If using transform and process as self-only, the transformed command will be recycled back into the command handler.</ul> </ul> |
| Children        | Optional. A list of other _things_. <ul> <li> You can use children can be to create dynamic state for the parent _thing_. Use `State` to configure. </li><li> All commands forward automatically to all children, unless configured differently in `Commands`. </li> <li>The parent-child relationship can be many-to-many.</li> </ul>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Status Function | Optional. A function that runs to determine the status of a _thing_. This function takes current `state` and `props` as input, and outputs a node status object. The output object can contain `text`, `fill`, and/or `shape`. if individual _thing_ has a status function it will override the `type`-level status function.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

### update

A node that updates a _thing_'s state, potentially causing separate _trigger_ node(s) to output. Updates are quite flexible and can be configured in a few ways.

##### Properties

| Property          | Info                                                                                                                                                                                                                                                                                                        |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Thing Name        | Optional. When specified, all input messages are directed to this thing. If not provided, the input message must include thing `name`.                                                                                                                                                                      |
| Update Properties | Optional. The `state` keys/values to update. If any updates are configured, then input `payload` is ignored. To use input `payload` as the state update, the update properties list must be empty.                                                                                                          |
| Thing Type        | Optional. When specified, the node will watch for all _things_ of the `type` and update its status with any missing _things_. Additionally, if specified, input messages can optionally use <i>thing</i> <code>ID</code> instead of <code>name</code>. If not provided, the node will not display a status. |

##### Input

| Key       | Type      | Info                                                                                                                                                                                                                                  |
| --------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `topic`   | _string_  | Optional. _Thing_ `name`. Only used if not specified in properties. **Note:** will _not_ override property setting. Alternatively, if the node is configured with a _thing_ `type`, then the _thing_ `ID` can be used as the `topic`. |
| `payload` | _object_  | Optional. The `state` update. Ignored if any updates are set in properties.                                                                                                                                                           |
| `replace` | _boolean_ | Optional. If `true`, the new `state` completely replaces current `state`. Otherwise it will be merged, top-level only. Caution: Proxy state keys will be erased when using replace option.                                            |

### trigger

A node that outputs a message when a thing's state changes. Can be configured in many ways.

##### Properties

| Property   | Info                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Thing Test | Test used to determine **what** _things_ to watch. Can be configured to check against any static attributes of each _thing_. List of matching _things_ is made immediately after setup and is not updated until nodes are re-deployed. Each _thing_ is tracked individually. Editor will show how many _things_ match the current configuration. Click the number to see the full list. |
| Trigger    | Configure **when** to trigger an output. "All Updates" triggers on any `state` update, regardless of changes. Use `state.` to track a specific `state` key. Leave empty to trigger on any `state` change. _Ignore initialization_ option prevents triggers when the value changes from `undefined`.                                                                                     |
| Payload    | Configure what to output on `msg.payload`. Can be a typical Node-RED typed value, or part of the _thing_ `state`. Leave `state.` empty to output the entire state. Use the copy button to quickly copy the state field from the Trigger.                                                                                                                                                |

##### Output

| Key       | Type     | Info                        |
| --------- | -------- | --------------------------- |
| `topic`   | _string_ | _Thing_ `name`              |
| `payload` | any      | Depends on Payload property |

### get

A node that appends specified values of a _thing_ to a message.

##### Properties

| Property   | Info                                |
| ---------- | ----------------------------------- |
| Thing Name | The _thing_ to reference            |
| Message    | Similar to the built-in inject node |

##### Input

| Key     | Type     | Info                                                                                                    |
| ------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `topic` | _string_ | Optional. _Thing_ `name`, if not specified in properties. **Note:** will not override property setting. |

##### Output

Same message from input, with specified properties changed/added.

### test

A node that allows a message to pass based on specified conditions related to a _thing_. The message is not modified.

##### Properties

| Property   | Info                                                                             |
| ---------- | -------------------------------------------------------------------------------- |
| Thing Name | The _thing_ to reference                                                         |
| Conditions | The conditions that must be met to allow the message to pass through             |
| 2nd Output | Optionally choose to have a 2nd output that passes the message if the test fails |

##### Input

| Key     | Type     | Info                                                                                                    |
| ------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `topic` | _string_ | Optional. _Thing_ `name`, if not specified in properties. **Note:** will not override property setting. |

##### Output

Input message is passed through.

### list

A node that lists all _things_ that match the specified conditions.

##### Properties

| Property   | Info                                                                                                |
| ---------- | --------------------------------------------------------------------------------------------------- |
| Output     | Choose the type and value of the output                                                             |
| Property   | Specify what property to output on                                                                  |
| Conditions | The conditions that must be met to include a _thing_ on the list. Leave empty to list all _things_. |

##### Output

The input message is forwarded (unless `Discard input message` is checked), with the addition of output specified in the properties.

### command

A node that initiates sending of a command to a _thing_ or multiple _things_. Note that this node provides no communication to the outside. It only relays messages to respective _process_ node(s).

The node checks for any command configuration for the _thing_ and transform/forward, if necessary. If there is no configuration, then the command processes for self and also forwards to all children.

##### Properties

| Property   | Info                                                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Thing Name | Optional. When specified, all input messages are directed to this _thing_. If not provided, the input message must include _thing_ `name`. |
| Command    | Optional. When specified, used as the _command_. If not provided, the input must include the _command_.                                    |

##### Input

| Key       | Type     | Info                                                                                          |
| --------- | -------- | --------------------------------------------------------------------------------------------- |
| `topic`   | _string_ | _Thing_ `name`, if not specified in properties. **Note:** will not override property setting. |
| `payload` | any      | The _command_, if not specified in properties. **Note:** will not override property setting.  |

### process

A node that listens for messages from _command_ nodes for a specific _thing_ `type`, and then outputs the message. Note that this node does not provide any communication to the outside. It only relays messages from repsective _command_ nodes. Its purpose is to funnel all messages intended for a certain node library into one place.

##### Properties

| Property   | Info                                                     |
| ---------- | -------------------------------------------------------- |
| Thing Type | The _thing_ `type` to listen for                         |
| Topic      | The property or custom string to send as the `msg.topic` |

##### Output

| Key       | Type     | Info                                        |
| --------- | -------- | ------------------------------------------- |
| `topic`   | _string_ | As configured in properties                 |
| `payload` | any      | The _command_, passed from a _command_ node |
| `thing`   | _object_ | The entire thing object                     |

## Bugs and Feedback

For bug reports, feature requests, and questions please use the [GitHub Issues](https://github.com/hufftheweevil/node-red-contrib-things/issues).
