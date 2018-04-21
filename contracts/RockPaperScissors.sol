pragma solidity ^0.4.17;

contract RockPaperScissors {

    uint constant deadline = 5;
    mapping (uint8 => mapping(uint8 => uint8)) public gameTable;

    event LogChallengeRefund(address indexed player, bytes32 challengeHand, uint amountRefunded);
    event LogWinningsWithdrawn(address indexed withdrawer, bytes32 challengeHand, uint amount, uint8 result);
    event LogHandRevealed(address indexed revealer, bytes32 challengeHand, uint8 hand, bytes32 revealCode);
    event LogFirstHandRevealed(address indexed revealer, bytes32 challengeHand, uint8 hand, bytes32 revealCode, uint deadline);
    event LogGameOver(address indexed player, uint8 result, uint owedToPlayer1, uint owedToPlayer2);
    event LogChallengeAccepted(address indexed player, bytes32 challengeHand, bytes32 player2Hand);
    event LogChallengeCreated(address indexed player, bytes32 challengeHand, uint amount);

    function RockPaperScissors() public {
        gameTable[1][1] = 3;
        gameTable[1][2] = 2;
        gameTable[1][3] = 1;
        
        gameTable[2][1] = 1;
        gameTable[2][2] = 3;
        gameTable[2][3] = 2;

        gameTable[3][1] = 2;
        gameTable[3][2] = 1;
        gameTable[3][3] = 3;
    }

    struct Challenge {
        uint amount;
        uint deadline;
        address player1;
        address player2;

        bytes32 player2Hand;

        uint8 player1HandRevealed;
        uint8 player2HandRevealed;

        address firstToRevealHand;
        
        uint8 result;
        uint owedToPlayer1;
        uint owedToPlayer2;
    }

    mapping(bytes32 => Challenge) public challenges;

    function createChallenge(bytes32 secretHand) public payable {
        Challenge storage challenge = challenges[secretHand];
        require(!challengeExists(challenge));

        challenge.player1 = msg.sender;
        challenge.amount = msg.value;
        LogChallengeCreated(msg.sender, secretHand, msg.value);
    }

    function acceptChallenge(bytes32 challengeHand, bytes32 player2SecretHand) public payable {
        Challenge storage challenge = challenges[challengeHand];
        require(challengeExists(challenge));
        require(!challengeAccepted(challenge));
        require(msg.value == challenge.amount);

        challenge.player2 = msg.sender;
        challenge.player2Hand = player2SecretHand;
        LogChallengeAccepted(msg.sender, challengeHand, player2SecretHand);
    }

    function revealHand(bytes32 challengeHand, uint8 hand, bytes32 revealCode) public {
        Challenge storage challenge = challenges[challengeHand];
        require(challengeExists(challenge));
        require(challengeAccepted(challenge));
        require(isValidHand(hand));
        require(!isOverDeadline(challenge));

        bytes32 playersHand;

        bool senderIsPlayer1 = isPlayer1(challenge);
        bool senderIsPlayer2 = isPlayer2(challenge);
        if (senderIsPlayer1) {
            playersHand = challengeHand;
        } else if (senderIsPlayer2) {
            playersHand = challenge.player2Hand;
        } else {
            revert();
        }

        bytes32 handProof = generateHandProof(hand, revealCode);
        require(handProof == playersHand);

        if (senderIsPlayer1) {
            challenge.player1HandRevealed = hand;
        } else if (senderIsPlayer2) {
            challenge.player2HandRevealed = hand;
        }
        LogHandRevealed(msg.sender, challengeHand, hand, revealCode);

        if (isFirstToRevealHand(challenge)) {
            challenge.firstToRevealHand = msg.sender;
            challenge.deadline = block.number + deadline;
            LogFirstHandRevealed(msg.sender, challengeHand, hand, revealCode, challenge.deadline);
        } else {
            decideWinnings(challenge);
        }
    }

    function decideWinnings(Challenge storage challenge) internal {
        uint8 result = gameTable[challenge.player1HandRevealed][challenge.player2HandRevealed];

        if (result == 3) {
            challenge.owedToPlayer1 = challenge.amount;
            challenge.owedToPlayer2 = challenge.amount;
        } else if (result == 1) {
            challenge.owedToPlayer1 = challenge.amount * 2;
        } else if (result == 2) {
            challenge.owedToPlayer2 = challenge.amount * 2;
        }

        challenge.result = result;
        LogGameOver(msg.sender, result, challenge.owedToPlayer1, challenge.owedToPlayer2);
    }

    function generateHandProof(uint8 hand, bytes32 revealCode) public pure returns(bytes32) {
        return keccak256(hand, revealCode);
    }

    function withdrawWinnings(bytes32 challengeHand) public {
        Challenge storage challenge = challenges[challengeHand];
        require(challengeExists(challenge));
        require(challengeAccepted(challenge));

        uint owed;
        if (challenge.result == 0) {
            require(isOverDeadline(challenge));
            require(challenge.firstToRevealHand == msg.sender);
            challenge.result = 4;

            owed = challenge.amount * 2;
        } else if (challenge.result != 4) {
            if (isPlayer1(challenge)) {
                owed = challenge.owedToPlayer1;
                challenge.owedToPlayer1 = 0;
            } else if (isPlayer2(challenge)) {
                owed = challenge.owedToPlayer2;
                challenge.owedToPlayer2 = 0;
            }
        } else {
            revert();
        }
        LogWinningsWithdrawn(msg.sender, challengeHand, owed, challenge.result);
        msg.sender.transfer(owed);
    }

    function refundChallenge(bytes32 challengeHand) public {
        Challenge storage challenge = challenges[challengeHand];
        require(challengeExists(challenge));
        require(!challengeAccepted(challenge));
        require(challenge.player1 == msg.sender);
        require(challenge.amount != 0);

        uint owed = challenge.amount;
        challenge.amount = 0;
        LogChallengeRefund(msg.sender, challengeHand, owed);
        msg.sender.transfer(owed);
    }

    function challengeExists(Challenge challenge) internal pure returns(bool) {
        return challenge.player1 != address(0);
    }

    function isValidHand(uint8 hand) internal pure returns(bool) {
        return (hand == 1 || hand == 2 || hand == 3);
    }

    function isOverDeadline(Challenge challenge) internal view returns(bool) {
        return challenge.deadline != 0 && challenge.deadline < block.number;
    }

    function isPlayer1(Challenge challenge) internal view returns(bool) {
        return challenge.player1 == msg.sender;
    }

    function isPlayer2(Challenge challenge) internal view returns(bool) {
        return challenge.player2 == msg.sender;
    }

    function isFirstToRevealHand(Challenge challenge) internal pure returns(bool) {
        return challenge.firstToRevealHand == address(0);
    }

    function challengeAccepted(Challenge challenge) internal pure returns(bool) {
        return challenge.player2Hand != "";
    }
}