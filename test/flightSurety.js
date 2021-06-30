
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

    async function registerAirline(airline, airlineRegistrar, expectedResult, message)
    {
        try
        {
            const txn = await config.flightSuretyApp.registerAirline(airline, {from: airlineRegistrar});
            const newTx = await truffleAssert.createTransactionResult(config.flightSuretyData, txn.tx);
            if (expectedResult)
            {
                truffleAssert.eventEmitted(newTx, 'AirlineRegistered', `eventEmitted: ${message}`);   
            }
        }
        catch(e) {
        }        
        const airlineRegistered = await config.flightSuretyApp.isAirlineRegistered(airline);
        assert.equal(expectedResult, airlineRegistered, `isAirlineRegistered: ${message}`);        
    }

    async function fundAirline(airline, funder, fundingValue, expectedResult, message)
    {
        try
        {
            const fundTxn = await config.flightSuretyApp.fundAirline(airline, {from: funder, value: fundingValue });                
            let newFundTx = await truffleAssert.createTransactionResult(config.flightSuretyData, fundTxn.tx);
            if (expectedResult)
            {
                truffleAssert.eventEmitted(newFundTx, 'AirlineFunded', `eventEmitted: ${message}`);                
            }
        } catch (e) {            
        }

        const isFunded = await config.flightSuretyApp.isAirlineFunded(config.firstAirline);
        assert.equal(expectedResult, isFunded, `isAirlineFunded: ${message}`);
    }

    it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
        await registerAirline(accounts[2], config.firstAirline, false, 
            "Airline should not be able to register another airline if it hasn't provided funding");
    });

    it('(airline) cannot register iteself', async () => {
        await registerAirline(accounts[2], accounts[2], false, 
            "Airline should be unable to register itself as its not funded, and implicitly not registered");
    });

    it(`Only existing airline may register a new airline until there are at least four airlines registered`, async function () {

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
        await registerAirline(accounts[2], config.firstAirline, true, "firstAirline can register accounts[2]");
        await registerAirline(accounts[3], config.firstAirline, true, "firstAirline can register accounts[3]");
        await registerAirline(accounts[4], config.firstAirline, true, "firstAirline can register accounts[4]");
        await registerAirline(accounts[5], config.firstAirline, false, "firstAirline can't register accounts[5] without consensus");

        assert.equal(4, await config.flightSuretyData.registeredAirlineCount());

        // Fund the other airlines, so they can vote
        await fundAirline(accounts[2], config.firstAirline, 10, true, "firstAirline can fund accounts[2]");
        await fundAirline(accounts[3], config.firstAirline, 10, true, "firstAirline can fund accounts[3]");
        await fundAirline(accounts[4], config.firstAirline, 10, true, "firstAirline can fund accounts[4]");
        
        // Now register the next airline - this should provide enough consensus to access account[5]
        await registerAirline(accounts[5], accounts[2], true, "account[2] can finalise registration for accounts[5]");
    });
    
});
