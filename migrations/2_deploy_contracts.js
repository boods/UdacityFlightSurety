const FlightSuretyData = artifacts.require("FlightSuretyData");
const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const fs = require('fs');

module.exports = function(deployer) {

  let firstAirline = '0x97a52a92609895d08E45098AD39Ed28AaDf02AfE';
  deployer.deploy(FlightSuretyData, firstAirline).then(function() {
    deployer.deploy(FlightSuretyApp, FlightSuretyData.address).then(function() {
      let config = {
        localhost: {
            url: 'http://localhost:8545',
            dataAddress: FlightSuretyData.address,
            appAddress: FlightSuretyApp.address
        }
      };
      fs.writeFileSync(__dirname + '/../app/dapp/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
      fs.writeFileSync(__dirname + '/../app/server/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
    });
  });
};
