const FlightSuretyData = artifacts.require("FlightSuretyData");
const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const fs = require('fs');

module.exports = function(deployer) {
  deployer.deploy(FlightSuretyData).then(function() {
    deployer.deploy(FlightSuretyApp).then(function() {
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
