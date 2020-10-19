# Things for Node-RED

A set of [Node-RED](https://github.com/node-red/node-red) nodes that uses an agnostic state management system to keep IOT device states and provide a uniform control system.

[![GitHub release](https://img.shields.io/github/release/hufftheweevil/node-red-contrib-things.svg?style=flat-square)](https://github.com/hufftheweevil/node-red-contrib-things/releases) [![NPM Version](https://img.shields.io/npm/v/node-red-contrib-things.svg?style=flat-square)](https://www.npmjs.com/package/node-red-contrib-things) [![GitHub last commit](https://img.shields.io/github/last-commit/hufftheweevil/node-red-contrib-things.svg?style=flat-square)](https://github.com/hufftheweevil/node-red-contrib-things/commits/master) [![Github All Releases](https://img.shields.io/npm/dw/node-red-contrib-things)](https://github.com/hufftheweevil/node-red-contrib-things/releases)
[![Node version](https://img.shields.io/node/v/node-red-contrib-things.svg?style=flat-square)](http://nodejs.org/download/) [![GitHub repo size in bytes](https://img.shields.io/github/repo-size/hufftheweevil/node-red-contrib-things.svg?style=flat-square)](https://github.com/hufftheweevil/node-red-contrib-things) [![npm](https://img.shields.io/npm/l/node-red-contrib-things.svg?style=flat-square)](https://github.com/hufftheweevil/node-red-contrib-things/blob/master/LICENSE)

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

A **_thing_**, as used in this library, is any device or entity in Node-RED that you want to either keep state on, trigger off state changes, and/or control. These things could be simple devices such as lights and sensors, or they could be more complex devices such as thermostats and entertainment devices, or even abstract things, such as people.

This library of nodes does not actually connect to any of the devices; it only acts as a state management system. All things will need to be connected to Node-RED via another node(s). For example, if using Lifx lights, you will need one of the Lifx Node-RED libraries.

---

After things are setup, they are listed in the **Things Directory** sidebar tab.

Things are stored in the global context, however it is <u>not recommended</u> to reference things directly via the context. Each thing is represented using a javascript object with a few specific properties. Note that these objects will be automatically generated via the setup node. This information is provided for reference and general understanding.

| Property  | Info                                                                                                                                                                                                                                                 |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`    | Things are always referenced by their name. Must be a valid javascript string. Therefore, spaces can be used, or any other style/case that you prefer. Unique among **all** things.                                                                  |
| `type`    | The platform that it uses, such as Lifx, Kasa, Z-Wave, or Person. Exact formatting is up to you, but it must remain consistent throughout your flows.                                                                                                |
| `id`      | Typically, a unqiue identifier among all things of the same type. Does not need to be unique among all things. If not set, defaults to the `name`. Common uses could be IP or MAC address.                                                           |
| `props`   | An object of static properties that will not change, typically set during setup. They can be modified later, but it not will not cause any state update notices. Defaults to `{}`.                                                                   |
| `state`   | An object of variable properties that will change and, together, represent a complete state of the thing. Defaults to `{}`.                                                                                                                          |
| `status`  | A getter property that uses the function in setup to generate a Node-RED node status message.                                                                                                                                                        |
| `proxy`   | An optional object map that defines any state and/or command proxies. State proxies are linked to a child thing and causes this thing to update when the child thing updates. Command proxies forward any commands from this thing to another thing. |
| `parents` | Automatically generated. Array of parent thing names, or any thing that has a state proxy.                                                                                                                                                           |

## Nodes

There are 8 nodes included: _setup_, _update_, _trigger_, _get_, _test_, _list_, _command_, and _process_.

### setup

All things must be created using this node. Use a different _setup_ node for each `type` that you have. It is up to you how you organize your `types`. But it is recommended to base them on the platforms you use - or in other words, based on how the devices connect in to and out of Node-RED. There are no inputs or outputs for this node. All things listed will be initialized when the flows are deployed.

##### Properties

| Property        | Info                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Thing Type      | A type/platform identifier chosen by you. They must be used consistently throughout your flows, and they are case sensitive.                                                                                                                                                                                                                                                          |
| Things          | Each thing is added using up to 5 parameters: Name, ID, Props, State, Proxy. All fields are equivilant to the properties defined above. Only Name is required. **Note**: If state is provided, it will only be used if the thing does not already exist (i.e. on Node-RED system startup, or a newly added thing). On re-deployment of flows, the last known state will be preserved. |
| Status Function | The body of a function that will set the status of any trigger nodes for this thing. The function receives `props` and `state` variables. It should return an object with signature `{text, fill, shape}`, all optional. If the function returns `null`, a red ring will be used with the text "Unknown". If not set, defaults to `state => ({text: JSON.stringify(state)})`          |

### update

An action-type node that will update a thing's state, potentially causing a separate _trigger_ node(s) to output. Use is flexible and can be configured in a few ways.

##### Properties

| Property          | Info                                                                                                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Thing Name        | When specified, all input messages will be directed to this thing. If not provided, the input message must include thing name.                                                                                      |
| Update Properties | The state keys/values to be updated. If any updates are configured, then input payload will be ignored. To use input payload as the state update, the update proprties list must be empty.                          |
| Thing Type        | When specified, the node will watch for all things of the type and update its status with any missing things. If not provided, the node will not display a status. Does not affect anything other than node status. |

##### Input

| Key       | Type      | Info                                                                                                                                                                                                              |
| --------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `topic`   | _string_  | Thing name. Only used if not specified in properties. **Note:** will _not_ override property setting. Alternatively, if the node is configured with a `thing type`, then the _thing_ ID can be used as the topic. |
| `payload` | _object_  | The state update. Will be shallow merged with the current state. Ignored if any updates are set in properties.                                                                                                    |
| `replace` | _boolean_ | Optional. If `true`, `payload` will completely replace current state instead of being merged.                                                                                                                     |

### trigger

A node that will output when conditions are met after input into a respective _update_ node.

##### Properties

| Property   | Info                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Thing Name | The thing to trigger from                                                                                                                                                                                                                                                                                                                                                                                                |
| Output...  | Choose from...<br/>1. On all state updates (will output whenever an update node has finished, even if the state did not change)<br/>2. When any part of the state changes<br/>3. Only when a part of the state changes.<br/>If the 3rd option is selected:<br/>- set the state property (or path to a nested state property)<br/>- optionally set a condition to test first<br/>- optionally ignore initialization value |
| Payload    | Choose from 1. Whole state; 2. Specific path.<br/>If 2nd option is selected, set the state property (or path to a nested state property)                                                                                                                                                                                                                                                                                 |

##### Output

| Key       | Type     | Info                                                     |
| --------- | -------- | -------------------------------------------------------- |
| `topic`   | _string_ | Thing name                                               |
| `payload` | any      | Depends on Payload property                              |
| `thing`   | _object_ | The entire thing object, only if specified in properties |

### get

A node that will append specified values of a _thing_ to a message.

##### Properties

| Property   | Info                                |
| ---------- | ----------------------------------- |
| Thing Name | The thing to reference              |
| Message    | Similar to the built-in inject node |

##### Output

Same message from input, with specified properties changed/added.

### test

A node that allows a message to pass based on specified conditions related to a _thing_. The message will not be modified.

##### Properties

| Property   | Info                                                                                 |
| ---------- | ------------------------------------------------------------------------------------ |
| Thing Name | The thing to reference                                                               |
| Conditions | The conditions that must be met to allow the message to pass through.                |
| 2nd Output | Optionally choose to have a 2nd output that will pass the message if the test fails. |

##### Input

| Key     | Type     | Info                                                                                      |
| ------- | -------- | ----------------------------------------------------------------------------------------- |
| `topic` | _string_ | Thing name, if not specified in properties. **Note:** will not override property setting. |

##### Output

Input message will be passed through

### list

A node that will list all _things_ that match the specified conditions.

##### Properties

| Property   | Info                                                              |
| ---------- | ----------------------------------------------------------------- |
| Output     | Choose the type and value of the output.                          |
| Property   | Specify what property to output on.                               |
| Conditions | The conditions that must be met to include a _thing_ on the list. |

##### Output

The input message will be forwarded (unless `Discard input message` is checked), with the addition of the output specified in the properties.

### command

An action node that will initiate the sending of a command to a thing or multiple things. Note that this node does not provide any communication to the outside. It will only relay messages to respective _process_ nodes.

The node will recurse through any groups and proxies before determining Thing type, then forward to the respective _process_ node(s).

##### Properties

| Property   | Info                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Thing Name | When specified, all input messages will be directed to this thing. If not provided, the input message must include thing name. |
| Command    | When specified, will be used as the command. If not provided, the input must include the command.                              |

##### Input

| Key       | Type     | Info                                                                                       |
| --------- | -------- | ------------------------------------------------------------------------------------------ |
| `topic`   | _string_ | Thing name, if not specified in properties. **Note:** will not override property setting.  |
| `payload` | any      | The command, if not specified in properties. **Note:** will not override property setting. |

### process

A trigger-type node that will listen for messages from _command_ nodes for a specific Thing type, and then output the message. Note that this node does not provide any communication to the outside. It will only relay messages from repsective _command_ nodes. Its purpose is to funnel all messages intended for a certain node library into one place.

##### Properties

| Property   | Info           |
| ---------- | -------------- |
| Thing Type | The thing type |

##### Output

| Key       | Type     | Info                                     |
| --------- | -------- | ---------------------------------------- |
| `topic`   | _string_ | The thing ID. (Not the name)             |
| `payload` | any      | The command, passed from a command node. |
| `thing`   | _object_ | The entire thing object.                 |

## Proxy System

There are two parts to the proxy system: state and command. State proxies map one part of a thing's state to another thing. Command proxies forward certain commands to another thing.

If utilized, the proxy object must contain keys of the other things (by name) and values that are an object with the following key/value pairs:

- `state` - An object map where the keys are the state properties of this thing. The values are the state properties of the child thing. All state properties of the child thing that are mapped here will be available in the state of the parent thing.
- `command` - An object map of commands to be proxied. The keys are the commands that you want to be available on the parent thing. The values are the relative command to use on the child thing.

An example of a proxy object: Let's suppose there are two things defined in setup: `TV`, a TV that is controlled via some IR interface and `TV Power`, a smart plug that the TV is plugged into, because the IR cannot specifically turn the power on and off, just toggle. In the setup for the `TV`, we use the following proxy object:

```
{
  "TV Power": {
    "state": {
      "power": "on"
    },
    "command": {
      "on": "true",
      "off": "false"
    }
  }
}
```

This means `TV` will have `state.power` that will be in-sync with `TV Power`'s `state.on`. When `TV Power`'s state changes, it will also trigger `TV`'s state to change. When the `on` or `off` command is sent to `TV`, it will actually be forwarded to `TV Power` as `true` or `false`, respectively.

## Groups

There is a special thing type for groups. During setup, use type "Group" and the Things input matrix will switch into a list-style input. Specify the group name and then list each thing in the group. Currently, groups are only used when sending commands. Sending a command to a group will automatically propagate the same command to all things in the group, regardless of those things' types. Groups can also be nested, as command forwading is recursive. The _update_ nodes has no effect on Group type things. However, the _trigger_ node can be configured to trigger from all things in the same group.

## Bugs and Feedback

For bugs, questions and discussions please use the [GitHub Issues](https://github.com/hufftheweevil/node-red-contrib-things/issues).
