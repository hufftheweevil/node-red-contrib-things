# Things for Node-RED

A set of [Node-RED](https://github.com/node-red/node-red) nodes that uses an agnostic state management system to keep IOT device states and provide a uniform command and control system.

### Purpose

First, what these nodes do **not** do: These nodes have no connection outside of Node-RED. They will not directly receive any data, and they do not directly send any data. 

This is an internal system that will help manage your Node-RED project better, minimizing overhead and simplying flows. You provide the outside connections, wire them up correctly to these nodes, and you will have a super charged version of Node-RED. The system is designed to be as minimalistic as possible, while allowing for just about any use case.

The core concept is to reduce all IOT devices into one common "langauge". With that, flows are more sensible and changes are easier. To facility the abstractness of this library, it is broken into four main segments/nodes.

* The inputs from various platforms of your choice are linked into the *update* node, which will route to...
* The *trigger* node, which will link into your logic.
* Your logic may link into a *command* node, which will route to...
* The *process* node, which will link back to the various platforms.

The exact uses of these nodes can be customized to fit your needs.

### Inspiration

This library was started because I was using Lifx, TP-Link/Kasa, Harmony, Z-Wave, and several other "things", and I wanted to be able to treat all lights, sensors, etc as equals, without worrying too much what platform they use.

A lot of the ideas used in this library are based off of a standard state management system, specifically React and Redux.

I also tried to use as much built-in functionality as possible, to keep with the  themes of Node-RED. For example, the *ready* node works very similar to the built-in *inject* node. And many other properties are formed using Node-RED style inputs.

Lastly, I used node status, as much as possible, to assist with debugging. I've found that nodes with some sort of useful status are much more powerful than those without.

### What is a Thing?

A *thing*, as used in this library, is any device or entity that you want to either keep state on, trigger off state changes, or control in Node-RED. These things could be simple devices such as lights and sensors, or they could be more complex devices such as thermostats and entertainment devices, or even abstract things, such as people. 

This library of nodes does not actually connect to any of the devices; it only acts as a state management system. All things will need to be connected to Node-RED via another node(s). For example, if using Lifx lights, you will need one of the Lifx Node-RED libraries.

---

A directory of all things is stored in the global context. While it is not recommended to reference things directly via the context, it can be done.

Each thing is represented using a javascript object with a few specific properties. Note that these objects will be automatically generated via the setup node. This information is provided for reference and general understanding.

| Property | Info |
|---|---|
| `name` | Things are always referenced by their name. Must be a valid javascript string. Therefore, spaces can be used, or any other style/case that you prefer. Unique among **all** things.
| `type` | The platform that it uses, such as Lifx, TP-Link, or Z-Wave. Exact formatting is up to you, but it must remain consistent throughout your flows.
| `id` | Typically, a unqiue identifier among all things of the same type. Does not need to be unique among all things. If not set, defaults to the `name`. Common uses could be IP or MAC address.
| `props` | An object of static properties that will not change, typically set during setup. They can be modified later, but it not will not cause any state update notices. Defaults to `{}`.
| `state` | An object of variable properties that will change and, together, represent a complete state of the thing. Can be included on setup, but is typically not, allowing the flows to update as necessary. Defaults to {}.
| `status` | A function that takes in the current `state` and `props` and outputs a Node-RED node status message. This function will run on every state update and the status will be applied to any `trigger` nodes that are configured for this thing. 
| `proxy` | An optional object map that defines any state and/or command proxies. State proxies are linked to a child thing and causes this thing to update when the child thing updates. Command proxies forward any commands from this thing to another thing.
| `parents` | Automatically generated. Array of parent thing names, or any thing that has a state proxy.

## Nodes

There are 6 nodes included: *setup*, *ready*, *update*, *trigger*, *command*, and *process*.

### setup

Start with the *setup* node. It is required for all things. Use a different *setup* node for each `type` that you have. There are no inputs or outputs. All things listed in the properties will be initialized when the flows are deployed.

##### Properties 
| Property | Info |
|---|---|
| Thing Type | A type indentifier decided by you. They must be used consistently throughout your flows, including case.
| Things | Each thing is added using up to 5 parameters: Name, ID, Props, State, Proxy. All fields are equivilant to the properties defined above. Only Name is required. **Note**: If state is provided, it will only be used if the thing does not already exist (i.e. on Node-RED system startup, or a newly added thing). On re-deployment of flows, the last known state will be kept.
| Status Function | The body of a function that will set the status of any trigger nodes for this thing. The function receives `props` and `state` variables. It should return an object with signature `{text, fill, shape}`, all optional. If the function returns `null`, a red ring will be used with the text "Unknown". If not set, defaults to `state => ({text: JSON.stringify(state)})`

### ready

A trigger-type node that will output when the system has been initialized. The node will also trigger on each re-deployment of any related *setup* nodes.

##### Properties 

| Property | Info |
|---|---|
| Output... | Trigger when all things have been fully loaded, or when all things of a certain type have been fully loaded.
| Message | Similar to the built-in inject node.

##### Output

As specified in properties.

### update

An action-type node that will update a thing's state, potentially causing a separate *trigger* node(s) to output. Use is flexible and can be configured in a few ways.

##### Properties 

| Property | Info |
|---|---|
| Thing Name | When specified, all input messages will be directed to this thing. If not provided, the input message must include thing name.
| Thing Type | When specified, the node will watch for all things of the type and update its status with any missing things. If not provided, the node will not display a status. Does not affect anything other than node status.

##### Input

| Key | Type | Info |
|---|---|---|
| `topic` | *string* | Thing name. Only used if not specified in properties. **Note:** will *not* override property setting
| `payload` | *object* | The state update. Will be shallow merged with the current state.
| `replace` | *boolean* | Optional. If `true`, `payload` will completely replace current state instead of being merged.

### trigger

A node that will output when conditions are met after input into a respective *update* node.

##### Properties 

| Property | Info |
|---|---|
| Thing Name | The thing to trigger from
| Output... | Choose from 1. On all state updates (will output whenever an update node has finished, even if the state did not change); 2. When any part of the state changes; 3. Only when a part of the state changes. If the 3rd option is selected, set the state property (or path to a nested state property)
| Payload | Choose from 1. Whole state; 2. Specific path. If 2nd option is selected, set the state property (or path to a nested state property)

##### Output

| Key | Type | Info |
|---|---|---|
| `topic` | *string* | Thing name.
| `payload` | any | Depends on Payload property.
| `thing` | *object* | The entire thing object, only if specified in properties.


### command

An action node that will initiate the sending of a command to a thing or multiple things. Note that this node does not provide any communication to the outside. It will only relay messages to repsective *process* nodes. On input, this node proceeds through a few steps:

1. Check if the Thing is a group. If so, repeat this process for each Thing in the group.
2. Check for command proxies and forward as appropriate. (See below for more info)
3. Determine Thing type and forward to the respective *process* node(s).

##### Properties 

| Property | Info |
|---|---|
| Thing Name | When specified, all input messages will be directed to this thing. If not provided, the input message must include thing name.
| Command | When specified, will be used as the command. If not provided, the input must include the command.

##### Input

| Key | Type | Info |
|---|---|---|
| `topic` | *string* | Thing name, if not specified in properties. **Note:** will not override property setting.
| `payload` | any | The command, if not specified in properties. **Note:** will not override property setting.


### process

A trigger-type node that will listen for messages from *command* nodes for a specific Thing type, and then output the message. Note that this node does not provide any communication to the outside. It will only relay messages from repsective *command* nodes. Its purpose is to funnel all messages intended for a certain node library into one place.

##### Properties 

| Property | Info |
|---|---|
| Thing Type | The thing type 

##### Output

| Key | Type | Info |
|---|---|---|
| `topic` | *string* | The thing ID. (Not the name)
| `payload` | any | The command, passed from a command node.
| `thing` | *object* | The entire thing object.

## Usage

Exact usage can vary depending on your use-case. However, this system was designed with the following general concept in mind. This is an over simplified representation. The three connections down the middle represent all of the inner-workings of this system.

![General usage overview](images/usage-overview.png)



## Proxy System

There are two parts to the proxy system: state and command. State proxies map one part of a thing's state to another thing. Command proxies forward certain commands to another thing.

If utilized, the proxy object must contain keys of the other things (by name) and values that are an object with the following key/value pairs:
* `state` - An object map where the keys are the state properties of this thing. The values are the state properties of the child thing. All state properties of the child thing that are mapped here will be available in the state of the parent thing.
* `command` - An object map of commands to be proxied. The keys are the commands that you want to be available on the parent thing. The values are the relative command to use on the child thing.

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

There is a special thing type for groups. During setup, use type "Group" and the Things input matrix will switch into a list-style input. Specify the group name and then list each thing in the group. Currently, groups are only used when sending commands. Sending a command to a group will automatically propogate the same command to all things in the group, regardless of those things' types. Groups can also be nested, as command forwading is recursive. The *update* and *trigger* nodes have no affect on Group type things.

## Bugs and Feedback

For bugs, questions and discussions please use the [GitHub Issues](https://github.com/hufftheweevil/node-red-contrib-things/issues).