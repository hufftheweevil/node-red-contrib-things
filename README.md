# Things for Node-RED

A set of [Node-RED](https://github.com/node-red/node-red) nodes that uses an agnostic state management system to keep IOT device states. The system also provides a uniform command and control system to minimize node overhead and simplify flows.

### What is a Thing?

A thing is any device or entity that you want to either keep state on, trigger off state changes, or control in Node-RED. These things could be simple devices such as lights and sensors, or they could be more complex devices such as thermostats and entertainment devices, or even abstract things, such as people. 

This library of nodes does not actually connect to any of the devices; it only acts as a state management system. All things will need to be connected to Node-RED via another node(s). For example, if using Lifx lights, you will need one of the Lifx Node-RED libraries.



---

A directory of all things is stored in the global context. While it is not recommended to reference things directly via the context, it can be done.

Each thing is represented using a javascript object with a few specific properties. Note that these objects will be automatically generated via the setup node. This information is provided for reference and general understanding.

| Property | Info |
|---|---|
| `name` | Things are always referenced by their name, which is friendly. That is, the formatting requirements are very loose. In fact, any valid javascript string is a valid thing name. Therefore, spaces can be used, or any other style that you prefer. Required on setup. Must be unique among **all** things.
| `type` | The platform that it uses, such as Lifx, TP-Link, or Z-Wave. Exact formatting is up to you, but it must remain consistent throughout your flows.
| `id` | Typically, a unqiue identifier among all things of the same type. Should be included on setup, but is optional. Defaults to the `name`.
| `props` | An object of static properties that will not change, typically set during setup. They can be modified later, but it not will not cause any state update notices. Defaults to `{}`.
| `state` | An object of variable properties that will change and, together, represent a complete state of the thing. Can be included on setup, but is not typically, allowing the flows to update as necessary. Defaults to {}.
| `status` | A function that takes in the current `(state, props)` and outputs a Node-RED node status message, which may include `{text, fill, shape}`. This function will run on every state update and the status will be applied to any `trigger` nodes that are configured for this thing. Defaults to `state => ({text: JSON.stringify(state)})`
| `proxy` | An optional object map that defines any state and/or command proxies. State proxies are linked to a child thing and causes this thing to update when the child thing updates. Command proxies forward any commands from this thing to another thing. If utilized, the object must contain keys of the other things (by name) and values that are an object with the following structure:<br/>`state` - An object map where the keys are the state properties of this thing. The values are the state properties of the child thing. All state properties of the child thing that are mapped here will be available in the state of the parent thing.<br/>`command` - An object map of commands to be proxied. The keys are the commands that you want to be available on the parent thing. The values are the relative command to use on the child thing.
| `parents` | Automatically generated. Array of parent thing names, or any thing that has a state proxy

## Nodes

There are 6 nodes included.

### setup

Start with the `setup` node. It is required for all things. Use a different `setup` node for each `type` that you have. There are no inputs or outputs. All things listed in the properties will be initialized when the flows are deployed.

| Property | Info |
|---|---|
| Thing Type | A type indentifier decided by you. For example, you may have a Lifx type, a Z-Wave type, or a Car type. They are completly up to you. But they must be used consistently throughout your flows.
| Things | Each thing is added using up to 5 parameters: Name, ID, Props, State, Proxy. All fields are equivilant to the properties defined above. Only Name is required. **Note**: If state is provided, it will only be used if the thing does not already exist (i.e. on Node-RED system startup, or a newly added thing). On re-deployment of flows, the last known state will be kept.
| Status Function | The body of a function that will set the status of any trigger nodes for this thing. The function receives `props` and `state` variables. It should return an object with signature `{text, fill, shape}`, all optional. If the function returns `null`, a red ring will be used with the text "Unknown".

### ready

A trigger node that will output when the system has been initialized. It can be configured to trigger when all things have been fully loaded, or when all things of a certain type have been fully loaded. The node will trigger on each re-deployment of any related setup nodes.

| Property | Info |
|---|---|
| Output... | When to trigger an output.
| Message | Similar to the inject node.

### update

An action node that will update a thing's state, potentially causing a separate trigger node(s) to output. Use is flexible and can be configured in a few ways.

| Property | Info |
|---|---|
| Thing Name | When specified, all input messages will be directed to this thing. If not provided, the input message must include thing name.
| Thing Type | When specified, the node will watch for all things of the type and update its status with any missing things. If not provided, the node will not display a status.

#### Input

| Key | Type | Info |
|---|---|---|
| topic | string | Thing name. Only used if not specified in properties. **Note:** will *not* override property setting
| payload | object | The state update. Will be shallow merged with the current state.
| replace | boolean | Optional. If `true`, `payload` will completely replace current state instead of being merged.