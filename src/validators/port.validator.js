function validatePort(port) {
    const portNum = Number.parseInt(port);
    return portNum > 0 && portNum <= 65535;
}

module.exports = validatePort;