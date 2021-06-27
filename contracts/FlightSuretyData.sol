// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

// import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract FlightSuretyData {
    // using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;   // Account used to deploy contract
    mapping(address => bool) authorisedCallers;
    bool private operational = true; // Blocks all state changes throughout the contract if false

    struct Airline {
        bool registered;
        bool funded; 
        uint256 funds;
    }
    uint256 private registeredAirlines = 0;
    uint256 private fundedAirlines = 0;
    mapping(address => Airline) private airlines;
    

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    event AirlineRegistered(address airline);
    event AirlineFunded(address airline);


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor(address firstAirline) payable 
    {
        contractOwner = msg.sender;
        airlines[firstAirline] = Airline(true, false, 0);
        registeredAirlines = 1;
        emit AirlineRegistered(firstAirline);
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireAuthorised()
    {
        require(msg.sender == contractOwner || authorisedCallers[msg.sender] == true, "Caller is not authorised");
        _;
    }

    modifier requireAirlineIsRegistered(address airline)
    {
        require(airlines[airline].registered == true, "Data Contract Airline is not registered");
        _;
    }

    modifier requireAirlineIsNotRegistered(address airline)
    {
        require(airlines[airline].registered == false, "Data Contract Airline is already registered");
        _;
    }

    modifier requireAirlineIsFunded(address airline)
    {
        require(airlines[airline].funded == true, "Data contract says the airline must be funded");
        _;
    }
    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() public view returns(bool) 
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus(bool mode) external requireContractOwner 
    {
        operational = mode;
    }

    function getDataContractOwner() external view returns(address) 
    {
        return contractOwner;
    }

    function getSender() external view returns(address)
    {
        return msg.sender;
    }

    function setAuthorisedCaller(address caller, bool authorised) external
    requireAuthorised
    {
        authorisedCallers[caller] = authorised;
    }


    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    * requireIsOperational
    * requireAirlineIsNotRegistered(airline)    
    */   
    function registerAirline(address airline) external
    requireIsOperational
    requireAuthorised
    requireAirlineIsNotRegistered(airline)
    {
        airlines[airline] = Airline(true, false, 0);
        airlines[airline].registered = true;
        airlines[airline].funded = false;
        registeredAirlines += 1;
        emit AirlineRegistered(airline);        
    }

    function fundAirline(address airline, uint256 amount) external
    requireIsOperational
    requireAuthorised
    requireAirlineIsRegistered(airline)
    {
        airlines[airline].funds += amount;
        airlines[airline].funded = true;
        fundedAirlines += 1;
        emit AirlineFunded(airline);
    }

    function isAirlineRegistered(address airline) external view returns(bool)
    {
        return airlines[airline].registered;
    }

    function isAirlineFunded(address airline) external view returns(bool)
    {
        return airlines[airline].funded;
    }

    function registeredAirlineCount() external view returns(uint256)
    {
        return registeredAirlines;
    }

    function fundedAirlineCount() external view returns(uint256)
    {
        return fundedAirlines;
    }

   /**
    * @dev Buy insurance for a flight
    */   
    function buy() external payable
    {

    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees() external pure
    {
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
    */
    function pay() external pure
    {
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    */   
    function fund() public payable
    {
    }

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) pure internal returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Receive function, a fallback when call data is empty
    */
    receive() external payable {
        fund();
    }

    /**
    * @dev Fallback function for funding smart contract.
    */
    fallback() external payable 
    {
        fund();
    }
}
