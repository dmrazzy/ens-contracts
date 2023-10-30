const DelegatableResolver = artifacts.require('DelegatableResolver.sol')
const { encodeName, namehash } = require('../test-utils/ens')
const { exceptions } = require('../test-utils')
const { expect } = require('chai')

contract('DelegatableResolver', function (accounts) {
  let node
  let encodedname
  let resolver
  let account
  let signers

  beforeEach(async () => {
    signers = await ethers.getSigners()
    account = await signers[0].getAddress()
    node = namehash('eth')
    encodedname = encodeName('eth')
    resolver = await DelegatableResolver.new(account)
  })

  describe('supportsInterface function', async () => {
    it('supports known interfaces', async () => {
      assert.equal(await resolver.supportsInterface('0x3b3b57de'), true) // IAddrResolver
      assert.equal(await resolver.supportsInterface('0xf1cb7e06'), true) // IAddressResolver
      assert.equal(await resolver.supportsInterface('0x691f3431'), true) // INameResolver
      assert.equal(await resolver.supportsInterface('0x2203ab56'), true) // IABIResolver
      assert.equal(await resolver.supportsInterface('0xc8690233'), true) // IPubkeyResolver
      assert.equal(await resolver.supportsInterface('0x59d1d43c'), true) // ITextResolver
      assert.equal(await resolver.supportsInterface('0xbc1c58d1'), true) // IContentHashResolver
      assert.equal(await resolver.supportsInterface('0xa8fa5682'), true) // IDNSRecordResolver
      assert.equal(await resolver.supportsInterface('0x5c98042b'), true) // IDNSZoneResolver
      assert.equal(await resolver.supportsInterface('0x01ffc9a7'), true) // IInterfaceResolver
      assert.equal(await resolver.supportsInterface('0x4fbf0433'), true) // IMulticallable
      assert.equal(await resolver.supportsInterface('0xf21ce672'), true) // IDelegatable
    })

    it('does not support a random interface', async () => {
      assert.equal(await resolver.supportsInterface('0x3b3b57df'), false)
    })
  })

  describe('addr', async () => {
    it('permits setting address by owner', async () => {
      await resolver.methods['setAddr(bytes32,address)'](node, accounts[1], {
        from: accounts[0],
      })
      assert.equal(await resolver.methods['addr(bytes32)'](node), accounts[1])
    })

    it('forbids setting new address by non-owners', async () => {
      await exceptions.expectFailure(
        resolver.methods['setAddr(bytes32,address)'](node, accounts[1], {
          from: accounts[1],
        }),
      )
    })
  })

  describe('authorisations', async () => {
    it('approves multiple users', async () => {
      await resolver.approve(encodedname, accounts[1], true)
      await resolver.approve(encodedname, accounts[2], true)
      const result = await resolver.getAuthorizedNode(
        encodedname,
        0,
        accounts[1],
      )
      assert.equal(result.node, node)
      assert.equal(result.authorized, true)
      assert.equal(
        (await resolver.getAuthorizedNode(encodedname, 0, accounts[2]))
          .authorized,
        true,
      )
    })

    it('approves subnames', async () => {
      const subname = 'a.b.c.eth'
      await resolver.approve(encodeName(subname), accounts[1], true)
      await resolver.methods['setAddr(bytes32,address)'](
        namehash(subname),
        accounts[1],
        {
          from: accounts[1],
        },
      )
    })

    it('approves users to make changes', async () => {
      await resolver.approve(encodedname, accounts[1], true)
      await resolver.methods['setAddr(bytes32,address)'](node, accounts[1], {
        from: accounts[1],
      })
      assert.equal(await resolver.addr(node), accounts[1])
    })

    it('approves to be revoked', async () => {
      await resolver.approve(encodedname, accounts[1], true)
      resolver.methods['setAddr(bytes32,address)'](node, accounts[0], {
        from: accounts[1],
      }),
        await resolver.approve(encodedname, accounts[1], false)
      await exceptions.expectFailure(
        resolver.methods['setAddr(bytes32,address)'](node, accounts[0], {
          from: accounts[1],
        }),
      )
    })

    it('does not allow non owner to approve', async () => {
      await expect(
        resolver.approve(encodedname, accounts[1], true, { from: accounts[1] }),
      ).to.be.revertedWith('NotAuthorized')
    })

    it('emits an Approval log', async () => {
      var operator = accounts[1]
      var tx = await resolver.approve(encodedname, operator, true)
      assert.equal(tx.logs.length, 1)
      assert.equal(tx.logs[0].event, 'Approval')
      assert.equal(tx.logs[0].args.node, node)
      assert.equal(tx.logs[0].args.operator, operator)
      assert.equal(tx.logs[0].args.name, encodedname)
      assert.equal(tx.logs[0].args.approved, true)
    })
  })

  describe('isOwner', async () => {
    it('the deployer is the owner by default', async () => {
      assert.equal(await resolver.isOwner(account), true)
    })

    it('can have multiple owner', async () => {
      await resolver.approve(encodeName(''), accounts[1], true)
      assert.equal(await resolver.isOwner(accounts[0]), true)
      assert.equal(await resolver.isOwner(accounts[1]), true)
    })
  })
})
