var RockPaperScissors = artifacts.require("./RockPaperScissors.sol");
var leftPad = require("leftpad");

contract("RockPaperScissors", function(accounts) {
  var contract;

  const account0 = accounts[0];
  const account1 = accounts[1];
  const account2 = accounts[2];

  let passwordPlayer1 = "secret123";
  let rockHandPlayer1;
  let paperHandPlayer1;
  let scissorsHandPlayer1;

  let passwordPlayer2 = "anotherSecret123";
  let rockHandPlayer2;
  let paperHandPlayer2;
  let scissorsHandPlayer2;

  beforeEach(async () => {
    contract = await RockPaperScissors.new({ from: account0 });
    rockHandPlayer1 = (await contract.generateHandProof(
      1,
      passwordPlayer1
    )).toString();
    paperHandPlayer1 = (await contract.generateHandProof(
      2,
      passwordPlayer1
    )).toString();
    scissorsHandPlayer1 = (await contract.generateHandProof(
      3,
      passwordPlayer1
    )).toString();

    rockHandPlayer2 = (await contract.generateHandProof(
      1,
      passwordPlayer2
    )).toString();
    paperHandPlayer2 = (await contract.generateHandProof(
      2,
      passwordPlayer2
    )).toString();
    scissorsHandPlayer2 = (await contract.generateHandProof(
      3,
      passwordPlayer2
    )).toString();
  });

  describe("createChallenge", function() {
    it("should be able to set up a challnge correctly", async () => {
      await contract.createChallenge(paperHandPlayer1, {
        from: account1,
        value: 1000
      });

      const challenge = await contract.challenges(paperHandPlayer1);

      assert.strictEqual(getAmount(challenge).toString(10), "1000");
      assert.strictEqual(getDeadline(challenge).toString(10), "0");
      assert.strictEqual(getPlayer1(challenge), account1);
      assert.strictEqual(
        getPlayer2(challenge),
        "0x0000000000000000000000000000000000000000"
      );
      assert.strictEqual(
        getPlayer2Hand(challenge),
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      assert.strictEqual(getPlayer1HandRevealed(challenge).toString(10), "0");
      assert.strictEqual(getPlayer2HandRevealed(challenge).toString(10), "0");
      assert.strictEqual(
        getFirstHandToReveal(challenge),
        "0x0000000000000000000000000000000000000000"
      );
      assert.strictEqual(getResult(challenge).toString(10), "0");
      assert.strictEqual(getOwedToPlayer1(challenge).toString(10), "0");
      assert.strictEqual(getOwedToPlayer2(challenge).toString(10), "0");
    });

    it("should be able to set up a challenge with 0 ether", async () => {
      await contract.createChallenge(rockHandPlayer1, { from: account1 });

      const challenge = await contract.challenges(rockHandPlayer1);

      assert.strictEqual(getAmount(challenge).toString(10), "0");
      assert.strictEqual(getPlayer1(challenge), account1);
    });

    it("should fail if challenge already exists", async () => {
      await contract.createChallenge(rockHandPlayer1, { from: account1 });

      try {
        await contract.createChallenge(rockHandPlayer1, { from: account1 });
      } catch (e) {
        return true;
      }

      throw new Error("Should fail if challenge already exists");
    });
  });

  describe("acceptChallenge", function() {
    it("should fail if challenge doesn't exist", async () => {
      try {
        await contract.acceptChallenge(rockHandPlayer1, rockHandPlayer1, {
          from: account1
        });
      } catch (e) {
        return true;
      }

      throw new Error("Should fail if challenge doesn't exists");
    });

    it("should fail if amount of ether is not equal to that of the challenge", async () => {
      await contract.createChallenge(rockHandPlayer1, {
        from: account1,
        value: 1000
      });

      try {
        await contract.acceptChallenge(rockHandPlayer1, paperHandPlayer2, {
          from: account2,
          value: 100
        });
      } catch (e) {
        return true;
      }

      throw new Error(
        "Should fail if amount sent in is not equal to that sent to the challenge"
      );
    });

    it("should fail if you try to accept more than once (or try to change your hand)", async () => {
      await contract.createChallenge(rockHandPlayer1, {
        from: account1,
        value: 1000
      });
      await contract.acceptChallenge(rockHandPlayer1, rockHandPlayer2, {
        from: account2,
        value: 1000
      });

      try {
        await contract.acceptChallenge(rockHandPlayer1, paperHandPlayer2, {
          from: account2,
          value: 1000
        });
      } catch (e) {
        return true;
      }

      throw new Error(
        "Should fail if trying to call acceptChallenge after already accepted"
      );

    });

    it("should set up everything when accepting a challnge", async () => {
      await contract.createChallenge(rockHandPlayer1, {
        from: account1,
        value: 1000
      });
      await contract.acceptChallenge(rockHandPlayer1, paperHandPlayer2, {
        from: account2,
        value: 1000
      });

      const challenge = await contract.challenges(rockHandPlayer1);

      assert.strictEqual(getAmount(challenge).toString(10), "1000");
      assert.strictEqual(getDeadline(challenge).toString(10), "0");
      assert.strictEqual(getPlayer1(challenge), account1);
      assert.strictEqual(getPlayer2(challenge), account2);
      assert.strictEqual(getPlayer2Hand(challenge), paperHandPlayer2);
      assert.strictEqual(getPlayer1HandRevealed(challenge).toString(10), "0");
      assert.strictEqual(getPlayer2HandRevealed(challenge).toString(10), "0");
      assert.strictEqual(
        getFirstHandToReveal(challenge),
        "0x0000000000000000000000000000000000000000"
      );
      assert.strictEqual(getResult(challenge).toString(10), "0");
      assert.strictEqual(getOwedToPlayer1(challenge).toString(10), "0");
      assert.strictEqual(getOwedToPlayer2(challenge).toString(10), "0");
    });
  });

  describe("revealHand", function() {
    it("should fail if challenge doesn't exist", async () => {
      try {
        await contract.revealHand(rockHandPlayer1, 1, passwordPlayer1, {
          from: account1
        });
      } catch (e) {
        return true;
      }

      throw new Error(
        "Should fail if trying to reveal hand in a challenge that doesn't exist"
      );
    });

    it("should fail if not challenge has been accepted", async () => {
      await contract.createChallenge(rockHandPlayer1, {
        from: account1,
        value: 1000
      });

      try {
        await contract.revealHand(rockHandPlayer1, 1, passwordPlayer1, {
          from: account1
        });
      } catch (e) {
        return true;
      }

      throw new Error(
        "Should fail if trying to reveal hand in a challenge that has not been accepted yet"
      );
    });

    it("should fail if the hand is not valid", async () => {
      await contract.createChallenge(rockHandPlayer1, {
        from: account1,
        value: 1000
      });
      await contract.acceptChallenge(rockHandPlayer1, paperHandPlayer2, {
        from: account2,
        value: 1000
      });

      try {
        await contract.revealHand(rockHandPlayer1, 0, passwordPlayer2, {
          from: account2
        });
      } catch (e) {
        return true;
      }

      throw new Error("Should fail if hand is not valid");
    });

    it("first hand should set up everything (deadline, hand, etc)", async () => {
      await contract.createChallenge(rockHandPlayer1, {
        from: account1,
        value: 1000
      });
      await contract.acceptChallenge(rockHandPlayer1, paperHandPlayer2, {
        from: account2,
        value: 1000
      });
      const tx = await contract.revealHand(
        rockHandPlayer1,
        1,
        passwordPlayer1,
        {
          from: account1
        }
      );

      const challenge = await contract.challenges(rockHandPlayer1);

      assert.strictEqual(getAmount(challenge).toString(10), "1000");
      assert.strictEqual(
        getDeadline(challenge).toString(10),
        tx.receipt.blockNumber + 5 + ""
      );
      assert.strictEqual(getPlayer1(challenge), account1);
      assert.strictEqual(getPlayer2(challenge), account2);
      assert.strictEqual(getPlayer2Hand(challenge), paperHandPlayer2);
      assert.strictEqual(getPlayer1HandRevealed(challenge).toString(10), "1");
      assert.strictEqual(getPlayer2HandRevealed(challenge).toString(10), "0");
      assert.strictEqual(getFirstHandToReveal(challenge), account1);
      assert.strictEqual(getResult(challenge).toString(10), "0");
      assert.strictEqual(getOwedToPlayer1(challenge).toString(10), "0");
      assert.strictEqual(getOwedToPlayer2(challenge).toString(10), "0");
    });

    it("should fail if deadline is passed", async () => {
      await contract.createChallenge(rockHandPlayer1, {
        from: account1,
        value: 1000
      });
      await contract.acceptChallenge(rockHandPlayer1, paperHandPlayer2, {
        from: account2,
        value: 1000
      });
      await contract.revealHand(rockHandPlayer1, 1, passwordPlayer1, {
        from: account1
      });

      const challenge = await contract.challenges(rockHandPlayer1);
      await mineBlock(getDeadline(challenge).toNumber() + 2);

      try {
        await contract.revealHand(rockHandPlayer1, 1, passwordPlayer2, {
          from: account2
        });
      } catch (e) {
        return true;
      }

      throw new Error("Should fail if deadline is passed");
    });

    it("should fail if proof is not correct", async () => {
      await contract.createChallenge(rockHandPlayer1, {
        from: account1,
        value: 1000
      });
      await contract.acceptChallenge(rockHandPlayer1, paperHandPlayer2, {
        from: account2,
        value: 1000
      });
      try {
        await contract.revealHand(rockHandPlayer1, 1, "notPassCode", {
          from: account1
        });
      } catch (e) {
        return true;
      }

      throw new Error("Should fail if proof is not correct");
    });

    it("should set up challenge correctly when both players have revealed their hand", async () => {
      await contract.createChallenge(rockHandPlayer1, {
        from: account1,
        value: 1000
      });
      await contract.acceptChallenge(rockHandPlayer1, scissorsHandPlayer2, {
        from: account2,
        value: 1000
      });

      const firstRevealTx = await contract.revealHand(
        rockHandPlayer1,
        3,
        passwordPlayer2,
        {
          from: account2
        }
      );

      await contract.revealHand(rockHandPlayer1, 1, passwordPlayer1, {
        from: account1
      });

      const challenge = await contract.challenges(rockHandPlayer1);
      assert.strictEqual(getAmount(challenge).toString(10), "1000");
      assert.strictEqual(
        getDeadline(challenge).toString(10),
        firstRevealTx.receipt.blockNumber + 5 + ""
      );
      assert.strictEqual(getPlayer1(challenge), account1);
      assert.strictEqual(getPlayer2(challenge), account2);
      assert.strictEqual(getPlayer2Hand(challenge), scissorsHandPlayer2);
      assert.strictEqual(getPlayer1HandRevealed(challenge).toString(10), "1");
      assert.strictEqual(getPlayer2HandRevealed(challenge).toString(10), "3");
      assert.strictEqual(getFirstHandToReveal(challenge), account2);
      assert.strictEqual(getResult(challenge).toString(10), "1");
      assert.strictEqual(getOwedToPlayer1(challenge).toString(10), "2000");
      assert.strictEqual(getOwedToPlayer2(challenge).toString(10), "0");
    });

    it("should set up result correctly with rock - rock", async () => {
      await contract.createChallenge(rockHandPlayer1, {
        from: account1,
        value: 1000
      });
      await contract.acceptChallenge(rockHandPlayer1, rockHandPlayer2, {
        from: account2,
        value: 1000
      });

      const firstRevealTx = await contract.revealHand(
        rockHandPlayer1,
        1,
        passwordPlayer1,
        {
          from: account1
        }
      );

      await contract.revealHand(rockHandPlayer1, 1, passwordPlayer2, {
        from: account2
      });

      const challenge = await contract.challenges(rockHandPlayer1);
      assert.strictEqual(getAmount(challenge).toString(10), "1000");
      assert.strictEqual(
        getDeadline(challenge).toString(10),
        firstRevealTx.receipt.blockNumber + 5 + ""
      );
      assert.strictEqual(getResult(challenge).toString(10), "3");
      assert.strictEqual(getOwedToPlayer1(challenge).toString(10), "1000");
      assert.strictEqual(getOwedToPlayer2(challenge).toString(10), "1000");
    });

    it("should set up result correctly with paper - paper", async () => {
      await contract.createChallenge(paperHandPlayer1, {
        from: account1,
        value: 1000
      });
      await contract.acceptChallenge(paperHandPlayer1, paperHandPlayer2, {
        from: account2,
        value: 1000
      });

      const firstRevealTx = await contract.revealHand(
        paperHandPlayer1,
        2,
        passwordPlayer1,
        {
          from: account1
        }
      );

      await contract.revealHand(paperHandPlayer1, 2, passwordPlayer2, {
        from: account2
      });

      const challenge = await contract.challenges(paperHandPlayer1);
      assert.strictEqual(getAmount(challenge).toString(10), "1000");
      assert.strictEqual(
        getDeadline(challenge).toString(10),
        firstRevealTx.receipt.blockNumber + 5 + ""
      );
      assert.strictEqual(getResult(challenge).toString(10), "3");
      assert.strictEqual(getOwedToPlayer1(challenge).toString(10), "1000");
      assert.strictEqual(getOwedToPlayer2(challenge).toString(10), "1000");
    });

    it("should set up result correctly with scissors - scissors", async () => {
      await contract.createChallenge(scissorsHandPlayer1, {
        from: account1,
        value: 1000
      });
      await contract.acceptChallenge(scissorsHandPlayer1, scissorsHandPlayer2, {
        from: account2,
        value: 1000
      });

      const firstRevealTx = await contract.revealHand(
        scissorsHandPlayer1,
        3,
        passwordPlayer1,
        {
          from: account1
        }
      );

      await contract.revealHand(scissorsHandPlayer1, 3, passwordPlayer2, {
        from: account2
      });

      const challenge = await contract.challenges(scissorsHandPlayer1);
      assert.strictEqual(getAmount(challenge).toString(10), "1000");
      assert.strictEqual(
        getDeadline(challenge).toString(10),
        firstRevealTx.receipt.blockNumber + 5 + ""
      );
      assert.strictEqual(getResult(challenge).toString(10), "3");
      assert.strictEqual(getOwedToPlayer1(challenge).toString(10), "1000");
      assert.strictEqual(getOwedToPlayer2(challenge).toString(10), "1000");
    });

    it("should set up result correctly with rock - paper", async () => {
      await contract.createChallenge(rockHandPlayer1, {
        from: account1,
        value: 1000
      });
      await contract.acceptChallenge(rockHandPlayer1, paperHandPlayer2, {
        from: account2,
        value: 1000
      });

      const firstRevealTx = await contract.revealHand(
        rockHandPlayer1,
        1,
        passwordPlayer1,
        {
          from: account1
        }
      );

      await contract.revealHand(rockHandPlayer1, 2, passwordPlayer2, {
        from: account2
      });

      const challenge = await contract.challenges(rockHandPlayer1);
      assert.strictEqual(getAmount(challenge).toString(10), "1000");
      assert.strictEqual(
        getDeadline(challenge).toString(10),
        firstRevealTx.receipt.blockNumber + 5 + ""
      );
      assert.strictEqual(getResult(challenge).toString(10), "2");
      assert.strictEqual(getOwedToPlayer1(challenge).toString(10), "0");
      assert.strictEqual(getOwedToPlayer2(challenge).toString(10), "2000");
    });

    it("should set up result correctly with rock - scissors", async () => {
      await contract.createChallenge(rockHandPlayer1, {
        from: account1,
        value: 1000
      });
      await contract.acceptChallenge(rockHandPlayer1, scissorsHandPlayer2, {
        from: account2,
        value: 1000
      });

      const firstRevealTx = await contract.revealHand(
        rockHandPlayer1,
        1,
        passwordPlayer1,
        {
          from: account1
        }
      );

      await contract.revealHand(rockHandPlayer1, 3, passwordPlayer2, {
        from: account2
      });

      const challenge = await contract.challenges(rockHandPlayer1);
      assert.strictEqual(getAmount(challenge).toString(10), "1000");
      assert.strictEqual(
        getDeadline(challenge).toString(10),
        firstRevealTx.receipt.blockNumber + 5 + ""
      );
      assert.strictEqual(getResult(challenge).toString(10), "1");
      assert.strictEqual(getOwedToPlayer1(challenge).toString(10), "2000");
      assert.strictEqual(getOwedToPlayer2(challenge).toString(10), "0");
    });

    it("should set up result correctly with paper - rock", async () => {
      await contract.createChallenge(paperHandPlayer1, {
        from: account1,
        value: 1000
      });
      await contract.acceptChallenge(paperHandPlayer1, rockHandPlayer2, {
        from: account2,
        value: 1000
      });

      const firstRevealTx = await contract.revealHand(
        paperHandPlayer1,
        2,
        passwordPlayer1,
        {
          from: account1
        }
      );

      await contract.revealHand(paperHandPlayer1, 1, passwordPlayer2, {
        from: account2
      });

      const challenge = await contract.challenges(paperHandPlayer1);
      assert.strictEqual(getAmount(challenge).toString(10), "1000");
      assert.strictEqual(
        getDeadline(challenge).toString(10),
        firstRevealTx.receipt.blockNumber + 5 + ""
      );
      assert.strictEqual(getResult(challenge).toString(10), "1");
      assert.strictEqual(getOwedToPlayer1(challenge).toString(10), "2000");
      assert.strictEqual(getOwedToPlayer2(challenge).toString(10), "0");
    });

    it("should set up result correctly with paper - scissors", async () => {
      await contract.createChallenge(paperHandPlayer1, {
        from: account1,
        value: 1000
      });
      await contract.acceptChallenge(paperHandPlayer1, scissorsHandPlayer2, {
        from: account2,
        value: 1000
      });

      const firstRevealTx = await contract.revealHand(
        paperHandPlayer1,
        2,
        passwordPlayer1,
        {
          from: account1
        }
      );

      await contract.revealHand(paperHandPlayer1, 3, passwordPlayer2, {
        from: account2
      });

      const challenge = await contract.challenges(paperHandPlayer1);
      assert.strictEqual(getAmount(challenge).toString(10), "1000");
      assert.strictEqual(
        getDeadline(challenge).toString(10),
        firstRevealTx.receipt.blockNumber + 5 + ""
      );
      assert.strictEqual(getResult(challenge).toString(10), "2");
      assert.strictEqual(getOwedToPlayer1(challenge).toString(10), "0");
      assert.strictEqual(getOwedToPlayer2(challenge).toString(10), "2000");
    });

    it("should set up result correctly with scissors - rock", async () => {
      await contract.createChallenge(scissorsHandPlayer1, {
        from: account1,
        value: 1000
      });
      await contract.acceptChallenge(scissorsHandPlayer1, rockHandPlayer2, {
        from: account2,
        value: 1000
      });

      const firstRevealTx = await contract.revealHand(
        scissorsHandPlayer1,
        3,
        passwordPlayer1,
        {
          from: account1
        }
      );

      await contract.revealHand(scissorsHandPlayer1, 1, passwordPlayer2, {
        from: account2
      });

      const challenge = await contract.challenges(scissorsHandPlayer1);
      assert.strictEqual(getAmount(challenge).toString(10), "1000");
      assert.strictEqual(
        getDeadline(challenge).toString(10),
        firstRevealTx.receipt.blockNumber + 5 + ""
      );
      assert.strictEqual(getResult(challenge).toString(10), "2");
      assert.strictEqual(getOwedToPlayer1(challenge).toString(10), "0");
      assert.strictEqual(getOwedToPlayer2(challenge).toString(10), "2000");
    });

    it("should set up result correctly with scissors - paper", async () => {
      await contract.createChallenge(scissorsHandPlayer1, {
        from: account1,
        value: 1000
      });
      await contract.acceptChallenge(scissorsHandPlayer1, paperHandPlayer2, {
        from: account2,
        value: 1000
      });

      const firstRevealTx = await contract.revealHand(
        scissorsHandPlayer1,
        3,
        passwordPlayer1,
        {
          from: account1
        }
      );

      await contract.revealHand(scissorsHandPlayer1, 2, passwordPlayer2, {
        from: account2
      });

      const challenge = await contract.challenges(scissorsHandPlayer1);
      assert.strictEqual(getAmount(challenge).toString(10), "1000");
      assert.strictEqual(
        getDeadline(challenge).toString(10),
        firstRevealTx.receipt.blockNumber + 5 + ""
      );
      assert.strictEqual(getResult(challenge).toString(10), "1");
      assert.strictEqual(getOwedToPlayer1(challenge).toString(10), "2000");
      assert.strictEqual(getOwedToPlayer2(challenge).toString(10), "0");
    });
  });

  describe("withdrawWinnings", function() {
    it("should fail if challenge doesn't exist", async () => {
      try {
        await contract.withdrawWinnings("doesn't exist", { from: account0 });
      } catch (e) {
        return true;
      }

      throw new Error("Should fail if challenge doesn't exist");
    });

    it("should fail if challenge is not accepted", async () => {
      await contract.createChallenge(paperHandPlayer1, {
        from: account1,
        value: 1000
      });

      try {
        await contract.withdrawWinnings(paperHandPlayer1, { from: account0 });
      } catch (e) {
        return true;
      }

      throw new Error("Should fail if challenge is not accepted");
    });

    it("should fail if challenge is not done and not over deadline", async () => {
      await contract.createChallenge(scissorsHandPlayer1, {
        from: account1,
        value: 1000
      });
      await contract.acceptChallenge(scissorsHandPlayer1, paperHandPlayer2, {
        from: account2,
        value: 1000
      });

      try {
        await contract.withdrawWinnings(scissorsHandPlayer1, {
          from: account0
        });
      } catch (e) {
        return true;
      }

      throw new Error(
        "Should fail if challenge is not done and not over deadline"
      );
    });

    describe("before deadline", function() {
      it("should pay out correctly when player1 won", async () => {
        await contract.createChallenge(rockHandPlayer1, {
          from: account1,
          value: 1000
        });
        await contract.acceptChallenge(rockHandPlayer1, scissorsHandPlayer2, {
          from: account2,
          value: 1000
        });

        await contract.revealHand(rockHandPlayer1, 1, passwordPlayer1, {
          from: account1
        });
        await contract.revealHand(rockHandPlayer1, 3, passwordPlayer2, {
          from: account2
        });

        const beforeBalancePlayer1 = await web3.eth.getBalance(account1);
        const beforeBalancePlayer2 = await web3.eth.getBalance(account2);
        const player1Tx = await contract.withdrawWinnings(rockHandPlayer1, {
          from: account1
        });
        const player2Tx = await contract.withdrawWinnings(rockHandPlayer1, {
          from: account2
        });

        let afterBalancePlayer1 = await web3.eth.getBalance(account1);
        let afterBalancePlayer2 = await web3.eth.getBalance(account2);

        const gasUsedPlayer1 = player1Tx.receipt.gasUsed;
        const gasPricePlayer1 = (await web3.eth.getTransaction(player1Tx.tx))
          .gasPrice;

        const gasUsedPlayer2 = player2Tx.receipt.gasUsed;
        const gasPricePlayer2 = (await web3.eth.getTransaction(player2Tx.tx))
          .gasPrice;

        const challenge = await contract.challenges(rockHandPlayer1);

        assert.strictEqual(
          afterBalancePlayer1.toString(10),
          beforeBalancePlayer1
            .plus(2000)
            .minus(gasPricePlayer1.mul(gasUsedPlayer1))
            .toString(10)
        );
        assert.strictEqual(
          afterBalancePlayer2.toString(10),
          beforeBalancePlayer2
            .minus(gasPricePlayer2.mul(gasUsedPlayer2))
            .toString(10)
        );
        assert.strictEqual(getOwedToPlayer1(challenge).toString(10), "0");
        assert.strictEqual(getOwedToPlayer2(challenge).toString(10), "0");
        assert.strictEqual(getResult(challenge).toString(10), "1");
      });

      it("should pay out correctly when player2 won", async () => {
        await contract.createChallenge(rockHandPlayer1, {
          from: account1,
          value: 1000
        });
        await contract.acceptChallenge(rockHandPlayer1, paperHandPlayer2, {
          from: account2,
          value: 1000
        });

        await contract.revealHand(rockHandPlayer1, 1, passwordPlayer1, {
          from: account1
        });
        await contract.revealHand(rockHandPlayer1, 2, passwordPlayer2, {
          from: account2
        });

        const beforeBalancePlayer1 = await web3.eth.getBalance(account1);
        const beforeBalancePlayer2 = await web3.eth.getBalance(account2);
        const player1Tx = await contract.withdrawWinnings(rockHandPlayer1, {
          from: account1
        });
        const player2Tx = await contract.withdrawWinnings(rockHandPlayer1, {
          from: account2
        });

        let afterBalancePlayer1 = await web3.eth.getBalance(account1);
        let afterBalancePlayer2 = await web3.eth.getBalance(account2);

        const gasUsedPlayer1 = player1Tx.receipt.gasUsed;
        const gasPricePlayer1 = (await web3.eth.getTransaction(player1Tx.tx))
          .gasPrice;

        const gasUsedPlayer2 = player2Tx.receipt.gasUsed;
        const gasPricePlayer2 = (await web3.eth.getTransaction(player2Tx.tx))
          .gasPrice;

        const challenge = await contract.challenges(rockHandPlayer1);

        assert.strictEqual(
          afterBalancePlayer1.toString(10),
          beforeBalancePlayer1
            .minus(gasPricePlayer1.mul(gasUsedPlayer1))
            .toString(10)
        );
        assert.strictEqual(
          afterBalancePlayer2.toString(10),
          beforeBalancePlayer2
            .plus(2000)
            .minus(gasPricePlayer2.mul(gasUsedPlayer2))
            .toString(10)
        );
        assert.strictEqual(getOwedToPlayer1(challenge).toString(10), "0");
        assert.strictEqual(getOwedToPlayer2(challenge).toString(10), "0");
        assert.strictEqual(getResult(challenge).toString(10), "2");
      });

      it("should pay out correctly when draw", async () => {
        await contract.createChallenge(rockHandPlayer1, {
          from: account1,
          value: 1000
        });
        await contract.acceptChallenge(rockHandPlayer1, rockHandPlayer2, {
          from: account2,
          value: 1000
        });

        await contract.revealHand(rockHandPlayer1, 1, passwordPlayer1, {
          from: account1
        });
        await contract.revealHand(rockHandPlayer1, 1, passwordPlayer2, {
          from: account2
        });

        const beforeBalancePlayer1 = await web3.eth.getBalance(account1);
        const beforeBalancePlayer2 = await web3.eth.getBalance(account2);
        const player1Tx = await contract.withdrawWinnings(rockHandPlayer1, {
          from: account1
        });
        const player2Tx = await contract.withdrawWinnings(rockHandPlayer1, {
          from: account2
        });

        let afterBalancePlayer1 = await web3.eth.getBalance(account1);
        let afterBalancePlayer2 = await web3.eth.getBalance(account2);

        const gasUsedPlayer1 = player1Tx.receipt.gasUsed;
        const gasPricePlayer1 = (await web3.eth.getTransaction(player1Tx.tx))
          .gasPrice;

        const gasUsedPlayer2 = player2Tx.receipt.gasUsed;
        const gasPricePlayer2 = (await web3.eth.getTransaction(player2Tx.tx))
          .gasPrice;

        const challenge = await contract.challenges(rockHandPlayer1);

        assert.strictEqual(
          afterBalancePlayer1.toString(10),
          beforeBalancePlayer1
            .plus(1000)
            .minus(gasPricePlayer1.mul(gasUsedPlayer1))
            .toString(10)
        );
        assert.strictEqual(
          afterBalancePlayer2.toString(10),
          beforeBalancePlayer2
            .plus(1000)
            .minus(gasPricePlayer2.mul(gasUsedPlayer2))
            .toString(10)
        );
        assert.strictEqual(getOwedToPlayer1(challenge).toString(10), "0");
        assert.strictEqual(getOwedToPlayer2(challenge).toString(10), "0");
        assert.strictEqual(getResult(challenge).toString(10), "3");
      });
    });

    describe("over deadline", function() {
      beforeEach(async () => {
        await contract.createChallenge(paperHandPlayer1, {
          from: account1,
          value: 1000
        });
        await contract.acceptChallenge(paperHandPlayer1, scissorsHandPlayer2, {
          from: account2,
          value: 1000
        });
        await contract.revealHand(paperHandPlayer1, 3, passwordPlayer2, {
          from: account2
        });

        const challenge = await contract.challenges(paperHandPlayer1);
        await mineBlock(getDeadline(challenge).toNumber() + 2);
      });

      it("should fail if sender is not first to reveal hand", async () => {
        try {
          await contract.withdrawWinnings(paperHandPlayer1, {
            from: account1
          });
        } catch (e) {
          return true;
        }

        throw new Error(
          "Should fail if challenge is not done and not over deadline"
        );
      });

      it("should pay out everything to the player who has reveal hand - give that the other player has not revealed", async () => {
        let beforeBalance = await web3.eth.getBalance(account2);
        const withdrawTx = await contract.withdrawWinnings(paperHandPlayer1, {
          from: account2
        });
        let afterBalance = await web3.eth.getBalance(account2);

        const gasUsed = withdrawTx.receipt.gasUsed;
        const gasPrice = (await web3.eth.getTransaction(withdrawTx.tx))
          .gasPrice;

        const challenge = await contract.challenges(paperHandPlayer1);

        assert.strictEqual(
          afterBalance.toString(10),
          beforeBalance
            .plus(2000)
            .minus(gasPrice.mul(gasUsed))
            .toString(10)
        );
        assert.strictEqual(getResult(challenge).toString(10), "4");
      });
    });
  });

  describe("refundChallenge", function() {
    it("should fail if challenge doesn't exist", async () => {
      try {
        await contract.refundChallenge("noExist", {
          from: account1
        });
      } catch (e) {
        return true;
      }

      throw new Error("Should fail if challenge doesn't exist");
    });

    it("should fail if challenge has been accepted", async () => {
      await contract.createChallenge(paperHandPlayer1, {
        from: account1,
        value: 1000
      });
      await contract.acceptChallenge(paperHandPlayer1, scissorsHandPlayer2, {
        from: account2,
        value: 1000
      });
      try {
        await contract.refundChallenge(paperHandPlayer1, {
          from: account1
        });
      } catch (e) {
        return true;
      }

      throw new Error("Should fail if challenge has been accepted");
    });

    it("should fail if nothing to send", async () => {
      await contract.createChallenge(paperHandPlayer1, {
        from: account1,
        value: 0
      });

      try {
        await contract.refundChallenge(paperHandPlayer1, {
          from: account1
        });
      } catch (e) {
        return true;
      }

      throw new Error("Should fail if there is nothing to refund");
    });

    it("should set challenge amount to zero", async () => {
      await contract.createChallenge(paperHandPlayer1, {
        from: account1,
        value: 1000
      });
      await contract.refundChallenge(paperHandPlayer1, {
        from: account1
      });
      const challenge = await contract.challenges(paperHandPlayer1);

      assert.strictEqual(getAmount(challenge).toString(10), "0");
    });

    it("should fail if trying to refund a challenge that is not yours", async () => {
      await contract.createChallenge(paperHandPlayer1, {
        from: account1,
        value: 1000
      });

      try {
        await contract.refundChallenge(paperHandPlayer1, {
          from: account2
        });
      } catch (e) {
        return true;
      }

      throw new Error("Should fail if trying to refund a challenge that is not yours");
    });

    it("should send back all the money", async () => {
      await contract.createChallenge(paperHandPlayer1, {
        from: account1,
        value: 1000
      });
      let beforeBalance = await web3.eth.getBalance(account1);
      const refundTx = await contract.refundChallenge(paperHandPlayer1, {
        from: account1
      });
      let afterBalance = await web3.eth.getBalance(account1);

      const gasUsed = refundTx.receipt.gasUsed;
      const gasPrice = (await web3.eth.getTransaction(refundTx.tx)).gasPrice;

      const challenge = await contract.challenges(paperHandPlayer1);

      assert.strictEqual(
        afterBalance.toString(10),
        beforeBalance
          .plus(1000)
          .minus(gasPrice.mul(gasUsed))
          .toString(10)
      );
    });
  });
});

function getAmount(challenge) {
  return challenge[0];
}

function getDeadline(challenge) {
  return challenge[1];
}

function getPlayer1(challenge) {
  return challenge[2];
}

function getPlayer2(challenge) {
  return challenge[3];
}

function getPlayer2Hand(challenge) {
  return challenge[4];
}

function getPlayer1HandRevealed(challenge) {
  return challenge[5];
}

function getPlayer2HandRevealed(challenge) {
  return challenge[6];
}

function getFirstHandToReveal(challenge) {
  return challenge[7];
}

function getResult(challenge) {
  return challenge[8];
}

function getOwedToPlayer1(challenge) {
  return challenge[9];
}

function getOwedToPlayer2(challenge) {
  return challenge[10];
}

function solSha3(...args) {
  args = args.map(arg => {
    if (typeof arg === "string") {
      if (arg.substring(0, 2) === "0x") {
        return arg.slice(2);
      } else {
        return web3.toHex(arg).slice(2);
      }
    }

    if (typeof arg === "number") {
      return leftPad(arg.toString(16), 64, 0);
    } else {
      return "";
    }
  });

  args = args.join("");

  return web3.sha3(args, { encoding: "hex" });
}

function mineBlock(until) {
  return new Promise(function(resolve, reject) {
    let currentBlock = web3.eth.blockNumber;
    console.log("Mining next block", currentBlock);

    if (currentBlock >= until) {
      return resolve(currentBlock);
    }

    web3.currentProvider.sendAsync(
      {
        jsonrpc: "2.0",
        method: "evm_mine",
        id: 12345
      },
      (error, result) => {
        if (error !== null) return reject(error);

        return mineBlock(until).then(block => {
          resolve(block);
        });
      }
    );
  });
}
