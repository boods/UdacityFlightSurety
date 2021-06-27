
var Test = require('./testConfig.js');
const truffleAssert = require('truffle-assertions')
var BigNumber = require('bignumber.js');

contract("Flight Surety Tests", async (accounts) => {
    var config;
    before('setup contract', async () => {
      config = await Test.Config(accounts);
    });
    
    it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

    });

    it(`First airline is registered when contract is deployed`, async function () {

        let result = await config.flightSuretyApp.isAirlineRegistered(config.firstAirline);
        assert.equal(result, true, "First airline should be registered");    
    });

    it(`Only existing airline may register a new airline until there are at least four airlines registered`, async function () {

        // The first four airlines can't register themselves
        try {
            await config.flightSuretyApp.registerAirline(accounts[2], {from: accounts[2]});
            assert.equal(false, "Airline should be unable to register itself as its not funded, and implicitly not registered");
        } catch (e) {
            let result = await config.flightSuretyApp.isAirlineRegistered(accounts[2]);        
            assert.equal(false, result, "registerAirline should have failed");    
        }

        // The first airline is not able to register other airlines until it is funded
        try {
            await config.flightSuretyApp.registerAirline(accounts[2], {from: confirm.firstAirline});
            assert.equal(false, "First airline is not yet funded");
        } catch (e) {
            let result = await config.flightSuretyApp.isAirlineRegistered(accounts[2]);        
            assert.equal(false, result, "registerAirline should have failed because first airline is not funded");    
        }

        // Fund the first airline
        if (!await config.flightSuretyApp.isAirlineFunded(config.firstAirline))
        {
            try {
                const txn = await config.flightSuretyApp.fundAirline(config.firstAirline, {from: config.firstAirline, value: 10 });                
                let newTx = await truffleAssert.createTransactionResult(config.flightSuretyData, txn.tx);
                truffleAssert.eventEmitted(newTx, 'AirlineFunded');                
            } catch (e) {
                assert.fail(`fund call failed: ${e}`);
            }
        }

        const firstAirlineIsRegistered = await config.flightSuretyApp.isAirlineRegistered(config.firstAirline);
        assert.equal(true, firstAirlineIsRegistered, "First airline should be registered");

        const firstAirlineIsFunded = await config.flightSuretyApp.isAirlineFunded(config.firstAirline);
        assert.equal(true, firstAirlineIsFunded, "First airline should now be funded");

        // Regsiter the next 3 airlines
        console.log(accounts[2]);
        const txn2 = await config.flightSuretyApp.registerAirline(accounts[2], {from: config.firstAirline});
        let newTx2 = await truffleAssert.createTransactionResult(config.flightSuretyData, txn2.tx);
        truffleAssert.eventEmitted(newTx2, 'AirlineRegistered');   
        assert.equal(true, await config.flightSuretyApp.isAirlineRegistered(accounts[2]));        
        
        console.log(accounts[3]);
        const txn3 = await config.flightSuretyApp.registerAirline(accounts[3], {from: config.firstAirline});
        let newTxn3 = await truffleAssert.createTransactionResult(config.flightSuretyData, txn3.tx);
        truffleAssert.eventEmitted(newTxn3, 'AirlineRegistered');   
        assert.equal(true, await config.flightSuretyApp.isAirlineRegistered(accounts[3]));        
        
        console.log(accounts[4]);
        const txn4 = await config.flightSuretyApp.registerAirline(accounts[4], {from: config.firstAirline});
        let newTxn4 = await truffleAssert.createTransactionResult(config.flightSuretyData, txn4.tx);
        truffleAssert.eventEmitted(newTxn4, 'AirlineRegistered');   
        assert.equal(true, await config.flightSuretyApp.isAirlineRegistered(accounts[4]));        
        
        // The fifth registration should return false
        let txn5 = await config.flightSuretyApp.registerAirline(accounts[5], {from: config.firstAirline});
        let newTxn5 = await truffleAssert.createTransactionResult(config.flightSuretyData, txn5.tx);
        truffleAssert.eventNotEmitted(newTxn5, 'AirlineRegistered');   
        assert.equal(false, await config.flightSuretyApp.isAirlineRegistered(accounts[5]));

        assert.equal(4, await config.flightSuretyData.registeredAirlineCount());

        // Fund the other airlines, so they can vote
        console.log("Fund:", accounts[2]);
        const fundTxn2 = await config.flightSuretyApp.fundAirline(accounts[2], {from: config.firstAirline, value: 10 });                
        let newFundTx2 = await truffleAssert.createTransactionResult(config.flightSuretyData, fundTxn2.tx);
        truffleAssert.eventEmitted(newFundTx2, 'AirlineFunded');                

        console.log("Fund:", accounts[3]);
        const fundTxn3 = await config.flightSuretyApp.fundAirline(accounts[3], {from: config.firstAirline, value: 10 });                
        let newFundTx3 = await truffleAssert.createTransactionResult(config.flightSuretyData, fundTxn3.tx);
        truffleAssert.eventEmitted(newFundTx3, 'AirlineFunded');                

        console.log("Fund:", accounts[4]);
        const fundTxn4 = await config.flightSuretyApp.fundAirline(accounts[4], {from: config.firstAirline, value: 10 });                
        let newFundTx4 = await truffleAssert.createTransactionResult(config.flightSuretyData, fundTxn4.tx);
        truffleAssert.eventEmitted(newFundTx4, 'AirlineFunded');
        
        assert.equal(true, await config.flightSuretyApp.isAirlineFunded(accounts[2]), "Airline should now be funded");
        assert.equal(true, await config.flightSuretyApp.isAirlineFunded(accounts[3]), "Airline should now be funded");
        assert.equal(true, await config.flightSuretyApp.isAirlineFunded(accounts[4]), "Airline should now be funded");

        // Now register the next airline - this should provide enough consensus to access account[5]
        txn5 = await config.flightSuretyApp.registerAirline(accounts[5], {from: accounts[2]});
        newTx5 = await truffleAssert.createTransactionResult(config.flightSuretyData, txn5.tx);
        truffleAssert.eventEmitted(newTx5, 'AirlineRegistered');   
        assert.equal(true, await config.flightSuretyApp.isAirlineRegistered(accounts[5]));
    });


    it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

        // Ensure that access is denied for non-Contract Owner account
        let accessDenied = false;
        try 
        {
            await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
        }
        catch(e) {
            accessDenied = true;
        }
        assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
              
    });
  
    it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {
  
        // Ensure that access is allowed for Contract Owner account
        let accessDenied = false;
        try 
        {
            await config.flightSuretyData.setOperatingStatus(false);
        }
        catch(e) {
            accessDenied = true;
        }
        assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
        
    });
  
    it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {
  
        await config.flightSuretyData.setOperatingStatus(false);
  
        let reverted = false;
        try 
        {
            await config.flightSurety.setTestingMode(true);
        }
        catch(e) {
            reverted = true;
        }
        assert.equal(reverted, true, "Access not blocked for requireIsOperational");      
  
        // Set it back for other tests to work
        await config.flightSuretyData.setOperatingStatus(true);
  
    });
  
    it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
      
      // ARRANGE
      let newAirline = accounts[2];
  
      // ACT
      try {
          await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
      }
      catch(e) {
  
      }

      // TODO: Implement this...
      // let result = await config.flightSuretyData.isAirline.call(newAirline); 
  
      // ASSERT
      // assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");
  
    });
  
});
