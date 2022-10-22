# Automating packet captures on Cisco VOS applications

Script that uses various API's to intiate a packet capture on Cisco VOS applicaitons and upload file to Cloudshark.

DIME information can be found at
[Log Collection and DimeGetFileService API Reference](https://developer.cisco.com/docs/sxml/#!log-collection-and-dimegetfileservice-api-reference/dimegetfileservice-api).

## Installation

Using GitHub CLI:

```javascript
gh repo clone sieteunoseis/cisco-vos-cloudshark
```

## Requirements

This package uses the built in Fetch API of Node. This feature was first introduced in Node v16.15.0. You may need to enable expermential vm module. Also you can disable warnings with an optional enviromental variable.

Also if you are using self signed certificates on Cisco VOS products you may need to disable TLS verification. This makes TLS, and HTTPS by extension, insecure. The use of this environment variable is strongly discouraged. Please only do this in a lab enviroment.

Suggested enviromental variables:

```env
PUBLISHER="10.10.20.1"
USERNAME="administrator"
PASSWORD="ciscopsdt"
VERSION="14.0"
COMMANDTIMEOUT="150000"
FILENAME="testcapture"
CLOUDSHARKAPI=""
```

## Usage

In Node.js:

```javascript
npm run start
```

## Blog

Read more on my blog at: [Medium](https://medium.com/automate-builders/automating-pcap-captures-on-cisco-vos-applications-90d4b54588de)

Note: Examples are using Cisco's DevNet sandbox information. Find more information here: [Cisco DevNet](https://devnetsandbox.cisco.com/)