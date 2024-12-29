import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
  name: "Can mint new data NFT",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('data-dock', 'mint', [
        types.utf8("Test Dataset"),
        types.utf8("Test Description"),
        types.utf8("encrypted:abc123")
      ], deployer.address)
    ]);
    
    block.receipts[0].result.expectOk().expectUint(1);
    
    let tokenData = chain.callReadOnlyFn(
      'data-dock',
      'get-token-data',
      [types.uint(1)],
      deployer.address
    );
    
    assertEquals(tokenData.result.expectSome().data.title.value, "Test Dataset");
  },
});

Clarinet.test({
  name: "Can list and purchase NFT",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const buyer = accounts.get('wallet_1')!;
    
    // Mint NFT
    let block = chain.mineBlock([
      Tx.contractCall('data-dock', 'mint', [
        types.utf8("Test Dataset"),
        types.utf8("Test Description"),
        types.utf8("encrypted:abc123")
      ], deployer.address)
    ]);
    
    // List NFT
    block = chain.mineBlock([
      Tx.contractCall('data-dock', 'list-for-sale', [
        types.uint(1),
        types.uint(100)
      ], deployer.address)
    ]);
    block.receipts[0].result.expectOk();
    
    // Purchase NFT
    block = chain.mineBlock([
      Tx.contractCall('data-dock', 'purchase', [
        types.uint(1)
      ], buyer.address)
    ]);
    block.receipts[0].result.expectOk();
    
    // Verify ownership transfer
    let owner = chain.callReadOnlyFn(
      'data-dock',
      'get-owner',
      [types.uint(1)],
      deployer.address  
    );
    assertEquals(owner.result.expectSome(), buyer.address);
  },
});

Clarinet.test({
  name: "Only owner can list NFT",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const other = accounts.get('wallet_1')!;
    
    // Mint NFT
    let block = chain.mineBlock([
      Tx.contractCall('data-dock', 'mint', [
        types.utf8("Test Dataset"),
        types.utf8("Test Description"), 
        types.utf8("encrypted:abc123")
      ], deployer.address)
    ]);
    
    // Try to list from non-owner account
    block = chain.mineBlock([
      Tx.contractCall('data-dock', 'list-for-sale', [
        types.uint(1),
        types.uint(100)
      ], other.address)
    ]);
    block.receipts[0].result.expectErr(types.uint(101)); // err-not-token-owner
  },
});