// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

contract FlightSuretyApp {
    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    uint256 private constant VOTE_FREE_AIRLINE_LIMIT = 4;
    uint256 private constant MINIMUM_AIRLINE_FUNDING = 10;
    mapping(address => address[]) private newAirlineVotes;

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    address private contractOwner; // Account used to deploy contract
    FlightSuretyData flightSuretyData;

    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;        
        address airline;
    }
    mapping(bytes32 => Flight) private flights;
    
 
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
         // Modify to call data contract's status
        require(true, "Contract is currently not operational");  
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

    modifier requireAirlineIsRegistered(address airline)
    {
        require(flightSuretyData.isAirlineRegistered(airline), "Airline is not registered");
        _;
    }

    modifier requireAirlineIsNotRegistered(address airline)
    {
        require(!flightSuretyData.isAirlineRegistered(airline), "Airline is already registered");
        _;
    }

    modifier requireAirlineIsFunded(address airline)
    {
        require(flightSuretyData.isAirlineFunded(airline), "Airline must be funded");
        _;
    }

    function getAppContractOwner() public view returns(address) 
    {
        return contractOwner;
    }


    function getSender() public view returns(address)
    {
        return flightSuretyData.getSender();
    }



    /**
    * @dev Contract constructor
    *
    */
    constructor(address payable dataContract) 
    {
        contractOwner = msg.sender;
        flightSuretyData = FlightSuretyData(dataContract);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() public pure returns(bool) 
    {
        return true;  // Modify to call data contract's status
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/
  
   /**
    * @dev Add an airline to the registration queue
    *
    */   
    function registerAirline(address airline)
        external
        requireIsOperational
        requireAirlineIsNotRegistered(airline)
        requireAirlineIsFunded(msg.sender)
        returns(bool success, uint256 votes)
    {
        // If airline count is less than 4, no voting is required
        if (flightSuretyData.registeredAirlineCount() < VOTE_FREE_AIRLINE_LIMIT)
        {
            flightSuretyData.registerAirline(airline);            
            return (true, 0);
        }
        // Else
        else
        {
            // Prevent duplicate votes
            for (uint i = 0; i < newAirlineVotes[airline].length; i++)
            {
                if (newAirlineVotes[airline][i] == msg.sender)
                {
                    require(false, "Duplicate vote detected");
                }
            }

            newAirlineVotes[airline].push(msg.sender);
            if (newAirlineVotes[airline].length >= (flightSuretyData.registeredAirlineCount() / 2) )
            {
                flightSuretyData.registerAirline(airline);
                return (true, newAirlineVotes[airline].length);
            }
            else
            {
                return (false, newAirlineVotes[airline].length);
            }
        }
    }

    function fundAirline(address airline) external payable
    requireIsOperational
    requireAirlineIsRegistered(airline)
    {
        require(msg.value >= MINIMUM_AIRLINE_FUNDING);
        payable(address(flightSuretyData)).transfer(msg.value);
        flightSuretyData.fundAirline(airline, msg.value);
    }

    function isAirlineRegistered(address airline) external view returns(bool)
    {
        return flightSuretyData.isAirlineRegistered(airline);
    }

    function isAirlineFunded(address airline) external view returns(bool)
    {
        return flightSuretyData.isAirlineFunded(airline);
    }

   /**
    * @dev Register a future flight for insuring.
    *
    */  
    function registerFlight() external pure
    {
    }
    
   /**
    * @dev Called after oracle has updated flight status
    *
    */  
    function processFlightStatus(
        address airline,
        string memory flight,
        uint256 timestamp,
        uint8 statusCode
    ) internal pure
    {
    }


    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus
    (
        address airline,
        string memory flight,
        uint256 timestamp                            
    ) external
    {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));

        ResponseInfo storage request = oracleResponses[key];
        request.requester = msg.sender;
        request.isOpen = true;
        
        emit OracleRequest(index, airline, flight, timestamp);
    } 


    /********************************************************************************************/
    /*                                      ORACLE MANAGEMENT                                   */
    /********************************************************************************************/

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;    

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;


    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;        
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses;          // Mapping key is the status code reported
                                                        // This lets us group responses and identify
                                                        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, string flight, uint256 timestamp, uint8 status);

    event OracleReport(address airline, string flight, uint256 timestamp, uint8 status);

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, string flight, uint256 timestamp);


    // Register an oracle with the contract
    function registerOracle() external payable
    {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({
                                        isRegistered: true,
                                        indexes: indexes
                                    });
    }

    function getMyIndexes() view external returns(uint8[3] memory)
    {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");

        return oracles[msg.sender].indexes;
    }


    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse
    (
        uint8 index,
        address airline,
        string memory flight,
        uint256 timestamp,
        uint8 statusCode
    ) external
    {
        require( (oracles[msg.sender].indexes[0] == index) || 
                 (oracles[msg.sender].indexes[1] == index) || 
                (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");

        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp)); 
        require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {

            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }


    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) pure internal returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes( address account ) internal returns(uint8[3] memory)
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);
        
        indexes[1] = indexes[0];
        while(indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex( address account ) internal returns (uint8)
    {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue);

        if (nonce > 250) {
            nonce = 0;  // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }
}

abstract contract FlightSuretyData {
    function getSender() virtual external view returns(address);
    function getDataContractOwner() virtual external view returns(address);
    function registerAirline(address airline) virtual external;
    function fundAirline(address airline, uint256 amount) virtual external;
    function isAirlineRegistered(address airline) virtual external view returns(bool);
    function isAirlineFunded(address airline) virtual external view returns(bool);
    function registeredAirlineCount() virtual external view returns(uint256);
    function fundedAirlineCount() virtual external view returns(uint256);
}