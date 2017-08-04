# AVSLambdas
temp Repo to store AVS Lambdas

## Microchip Masters Demo

Mandatory lambda process variables with examples :

- thingTypeName  [e.g: HouseholdDevices]
- region [e.g: eu-west-1]

AWS IoT device structure:

- Type is mandatory ( e.g: HouseholdDevices)
- Type has two searchable attributes : FriendlyName and IDName
- Every device should have an additional non-searchable attribute: controlTopic
  - device control messages will be published to this topic
