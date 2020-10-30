# Things for Node-RED

A set of [Node-RED](https://github.com/node-red/node-red) nodes that uses an agnostic state management system to keep IOT device states and provide a uniform control system.

[![GitHub release](https://img.shields.io/github/release/hufftheweevil/node-red-contrib-things.svg?style=flat-square)](https://github.com/hufftheweevil/node-red-contrib-things/releases) [![NPM Version](https://img.shields.io/npm/v/node-red-contrib-things.svg?style=flat-square)](https://www.npmjs.com/package/node-red-contrib-things) [![GitHub last commit](https://img.shields.io/github/last-commit/hufftheweevil/node-red-contrib-things.svg?style=flat-square)](https://github.com/hufftheweevil/node-red-contrib-things/commits/master) [![Github All Releases](https://img.shields.io/npm/dw/node-red-contrib-things)](https://github.com/hufftheweevil/node-red-contrib-things/releases)
[![Node version](https://img.shields.io/node/v/node-red-contrib-things.svg?style=flat-square)](http://nodejs.org/download/) [![GitHub repo size in bytes](https://img.shields.io/github/repo-size/hufftheweevil/node-red-contrib-things.svg?style=flat-square)](https://github.com/hufftheweevil/node-red-contrib-things) [![npm](https://img.shields.io/npm/l/node-red-contrib-things.svg?style=flat-square)](https://github.com/hufftheweevil/node-red-contrib-things/blob/master/LICENSE)

**[Upgrading from v2?](#upgrading-from-v2)**

### Purpose

First, what these nodes do **not** do: These nodes have no connection outside of Node-RED. They will not directly receive any data, and they do not directly send any data.

This is an internal system that will help manage your Node-RED project better, minimizing overhead and simplying flows. You provide the outside connections, wire them up correctly to these nodes, and you will have a super charged version of Node-RED. The system is designed to be as minimalistic as possible, while allowing for just about any use case.

### Usage

The core concept is to reduce all IOT devices into one common "langauge". With that, flows are more sensible and changes are easier. To facilitate the abstractness of this library, it is broken into four main segments/nodes.

- The inputs from various platforms of your choice are linked into the **_update_** node, which will route to...
- The **_trigger_** node, which will link into your logic.
- Your logic may link into a **_command_** node, which will route to...
- The **_process_** node, which will link back to the various platforms.

Exact usage can vary depending on your use-case. However, this system was designed with the following general concept in mind. This is an over simplified representation. The two connections in the middle represent some of the inner-workings of this system.

![General usage overview](images/usage-overview.png)

The **_get_**, **_list_**, and **_test_** nodes are to help assist in your flows.

### Inspiration

This library was started because I was using Lifx, TP-Link/Kasa, Harmony, Z-Wave, and several other "things", and I wanted to be able to treat all lights, sensors, etc as equals, without worrying too much what platform they use.

A lot of the ideas used in this library are based off of a standard state management system, specifically React and Redux.

I also tried to use as much built-in functionality as possible, to keep with the themes of Node-RED. For example, the _ready_ node works very similar to the built-in _inject_ node. And many other properties are formed using Node-RED style inputs.

Lastly, I used node status, as much as possible, to assist with debugging. I've found that nodes with some sort of useful status are much more powerful than those without. Debug options are also available on most nodes.

### What is a Thing?

A **_thing_**, as used in this library, is any device or entity in Node-RED that you want to either keep state on, trigger off state changes, and/or control. These could be simple devices such as lights and sensors, or they could be more complex devices such as thermostats and entertainment devices, or even abstract "things", such as people.

This library of nodes does not actually connect to any of the devices; it only acts as a state management system. All outside communication will need to go through another Node-RED node. For example, if using Lifx lights, you will need one of the Lifx Node-RED libraries.

All _things_ configured in the setup nodes are listed in the **Things Directory** sidebar tab after deployment.

### Upgrading from v2

Version 3 has been designed to automatically upgrade any nodes from version 2. The main difference is how the configuration data is stored for the _setup_ node. Therefore, it is **highly recommended** to backup your `flows.json` file before upgrading. After upgrading to version 3, it is **recommended** to open every _setup_ node you have and verify that they remain configured as you want. Many tests have been done to ensure everything upgrades properly, but of course there is always a chance for something to go wrong. Please report any bugs you encounter.

## Nodes

There are 8 nodes included: _setup_, _update_, _trigger_, _get_, _test_, _list_, _command_, and _process_.

### setup

All _things_ must be configured using this node. Use a different _setup_ node for each _type_ that you have. It is up to you how you organize your _types_. But it is recommended to base them on the platforms you use - or in other words, based on how the devices connect in to and out of Node-RED. There are no inputs or outputs for this node. All things listed will be created when the flows are deployed.

##### Properties

| Property        | Info                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Thing Type      | User's choice. Typically, the platform that these _things_ use to connect outside of Node-RED. Special type "Group" can be used to access advanced group features.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Things          | Each <i>thing</i> of this `type` is listed. Click a <i>thing</i> to see detailed setup properties. <ul> <li><code>Name</code>s must be unique among <b>all</b> <i>things</i></li> <li><code>ID</code>s must be unique among all <i>things</i> of the same `type`</li><li>Individual `status functions` can be set for each _thing_. If not specified, the `type`-level `status function` will be used. </li> <li> For non-Group <i>things</i> <ul> <li> Initial `state` values will not override current _thing_ `state` during re-deployment. </li> <li> `Proxies` come in two flavors <ul> <li><i>State proxies</i> allow a _thing_ to get `state` from a child _thing_</li> <li><i>Command proxies</i> allow a _thing_ to forward a command to a child _thing_</li> </ul> </li> </ul> </li> <li> For Group <i>things</i> <ul> <li>List all of the <i>things</i> by `name` that should be included in the group. Groups can be nested.</li> <li> `State` getters take the `state` of all <i>things</i> in the group and reduce to one value. They can be a pre-defined reduction method, or a custom function. </li><li>For nested groups, only the direct children of each group are used when determining `state`. </ul> </li> </ul> |
| Status Function | Optional. A function that runs to determine the status of a <i>thing</i>. Function is run with current <code>state</code> and <code>props</code> as input, and should output a node status object. The object can contain <code>text</code>, <code>fill</code>, and/or <code>shape</code>. If a thing has its own status function, that will be used. Otherwise the `type`-level status function will be used.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

See README for more information on **Groups** and **Proxies**.

### update

A node that will update a _thing_'s state, potentially causing a separate _trigger_ node(s) to output. Use is flexible and can be configured in a few ways.

##### Properties

| Property          | Info                                                                                                                                                                                                                                                                                                        |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Thing Name        | Optional. When specified, all input messages will be directed to this thing. If not provided, the input message must include thing `name`.                                                                                                                                                                  |
| Update Properties | Optional. The `state` keys/values to be updated. If any updates are configured, then input `payload` will be ignored. To use input `payload` as the state update, the update properties list must be empty.                                                                                                 |
| Thing Type        | Optional. When specified, the node will watch for all _things_ of the `type` and update its status with any missing _things_. Additionally, if specified, input messages can optionally use <i>thing</i> <code>ID</code> instead of <code>name</code>. If not provided, the node will not display a status. |

##### Input

| Key       | Type      | Info                                                                                                                                                                                                                                  |
| --------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `topic`   | _string_  | Optional. _Thing_ `name`. Only used if not specified in properties. **Note:** will _not_ override property setting. Alternatively, if the node is configured with a _thing_ `type`, then the _thing_ `ID` can be used as the `topic`. |
| `payload` | _object_  | Optional. The `state` update. Ignored if any updates are set in properties.                                                                                                                                                           |
| `replace` | _boolean_ | Optional. If `true`, the new `state` will completely replace current `state`. Otherwise it will be merged, top-level only.                                                                                                            |

### trigger

A node that outputs a message when a thing's state changes. Can be configured in many ways.

##### Properties

| Property         | Info                                                                                                                                                                                                                                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Multi-thing Mode | When enabled, allows multiple <i>things</i> to trigger this node                                                                                                                                                                                                                                                                                             |
| Thing Name       | (Single-thing mode) The _thing_ `name` to trigger from                                                                                                                                                                                                                                                                                                       |
| Thing Test       | (Multi-thing mode) Can be configured to check against any static attributes of each _thing_. List of matching <i>things</i> is made immediately after setup and is not updated until nodes are re-deployed. Each _thing_ is tracked individually. Editor will show how many _things_ match the current configuration. Click the number to see the full list. |
| Output...        | Configure **when** to trigger an output. If a state key is specified, certain values can be filtered as well. _Ignore initialization_ option will prevent triggers when the value changes from `undefined`.                                                                                                                                                  |
| Payload          | Configure **what** to output on `msg.payload`                                                                                                                                                                                                                                                                                                                |

##### Output

| Key       | Type     | Info                                                    |
| --------- | -------- | ------------------------------------------------------- |
| `topic`   | _string_ | _Thing_ `name`                                          |
| `payload` | any      | Depends on Payload property                             |
| `thing`   | _object_ | The entire thing object, only if selected in properties |

### get

A node that will append specified values of a _thing_ to a message.

##### Properties

| Property   | Info                                |
| ---------- | ----------------------------------- |
| Thing Name | The _thing_ to reference            |
| Message    | Similar to the built-in inject node |

##### Output

Same message from input, with specified properties changed/added.

### test

A node that allows a message to pass based on specified conditions related to a _thing_. The message will not be modified.

##### Properties

| Property   | Info                                                                                |
| ---------- | ----------------------------------------------------------------------------------- |
| Thing Name | The _thing_ to reference                                                            |
| Conditions | The conditions that must be met to allow the message to pass through                |
| 2nd Output | Optionally choose to have a 2nd output that will pass the message if the test fails |

##### Input

| Key     | Type     | Info                                                                                                    |
| ------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `topic` | _string_ | Optional. _Thing_ `name`, if not specified in properties. **Note:** will not override property setting. |

##### Output

Input message will be passed through

### list

A node that will list all _things_ that match the specified conditions.

##### Properties

| Property   | Info                                                                                                |
| ---------- | --------------------------------------------------------------------------------------------------- |
| Output     | Choose the type and value of the output                                                             |
| Property   | Specify what property to output on                                                                  |
| Conditions | The conditions that must be met to include a _thing_ on the list. Leave empty to list all _things_. |

##### Output

The input message will be forwarded (unless `Discard input message` is checked), with the addition of the output specified in the properties.

### command

A node that will initiate the sending of a command to a _thing_ or multiple _things_. Note that this node does not provide any communication to the outside. It will only relay messages to respective _process_ nodes.

The node will recurse through any groups and proxies before determining _thing_ `type`, then forward to the respective _process_ node(s).

##### Properties

| Property   | Info                                                                                                                                           |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Thing Name | Optional. When specified, all input messages will be directed to this _thing_. If not provided, the input message must include _thing_ `name`. |
| Command    | Optional. When specified, will be used as the _command_. If not provided, the input must include the _command_.                                |

##### Input

| Key       | Type     | Info                                                                                          |
| --------- | -------- | --------------------------------------------------------------------------------------------- |
| `topic`   | _string_ | _Thing_ `name`, if not specified in properties. **Note:** will not override property setting. |
| `payload` | any      | The _command_, if not specified in properties. **Note:** will not override property setting.  |

### process

A node that will listen for messages from _command_ nodes for a specific _thing_ `type`, and then output the message. Note that this node does not provide any communication to the outside. It will only relay messages from repsective _command_ nodes. Its purpose is to funnel all messages intended for a certain node library into one place.

##### Properties

| Property   | Info                                                      |
| ---------- | --------------------------------------------------------- |
| Thing Type | The _thing_ `type` to listen for                          |
| Topic      | The property or custom string to send as the `msg.topic`. |

##### Output

| Key       | Type     | Info                                        |
| --------- | -------- | ------------------------------------------- |
| `topic`   | _string_ | As configured in properties                 |
| `payload` | any      | The _command_, passed from a _command_ node |
| `thing`   | _object_ | The entire thing object                     |

## Groups

There is a special thing `type` **Group**. Things with this `type` have unique features (see below). Groups can be nested and all functionality is recursive. They can also be useful for filtering on the _test_ and _trigger_ nodes.

## Proxying

**Proxies** come in two flavors: `state` and _command_.

How they are defined and used depends if a _thing_ is of the special **Group** `type`, or any other `type`.

#### Group `type`

`States` are derived by reducing the `state` of all _things_ in the group to one value. They are configured in the _setup_ node under the _State of the Group_ tab.

**All** _commands_ sent to a Group `type` _thing_ are automatically forwarded to **all** _things_ in the group.

#### Non-Group `type`

`State` proxies map to `state` from a different _thing_.

_Command_ proxies forward _commands_ to a different _thing_.

For non-Group `type` _things_, both proxy flavors are configured in the _setup_ node under the _Proxy_ tab.

## Bugs and Feedback

For bug reports, feature requests, and questions please use the [GitHub Issues](https://github.com/hufftheweevil/node-red-contrib-things/issues).
