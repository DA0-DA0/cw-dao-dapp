import { Rpc } from "../../../helpers";
import { BinaryReader } from "../../../binary";
import { MsgSetWithdrawAddress, MsgSetWithdrawAddressResponse, MsgWithdrawDelegatorReward, MsgWithdrawDelegatorRewardResponse, MsgWithdrawValidatorCommission, MsgWithdrawValidatorCommissionResponse, MsgFundCommunityPool, MsgFundCommunityPoolResponse, MsgUpdateParams, MsgUpdateParamsResponse, MsgCommunityPoolSpend, MsgCommunityPoolSpendResponse, MsgDepositValidatorRewardsPool, MsgDepositValidatorRewardsPoolResponse } from "./tx";
/** Msg defines the distribution Msg service. */
export interface Msg {
  /**
   * SetWithdrawAddress defines a method to change the withdraw address
   * for a delegator (or validator self-delegation).
   */
  setWithdrawAddress(request: MsgSetWithdrawAddress): Promise<MsgSetWithdrawAddressResponse>;
  /**
   * WithdrawDelegatorReward defines a method to withdraw rewards of delegator
   * from a single validator.
   */
  withdrawDelegatorReward(request: MsgWithdrawDelegatorReward): Promise<MsgWithdrawDelegatorRewardResponse>;
  /**
   * WithdrawValidatorCommission defines a method to withdraw the
   * full commission to the validator address.
   */
  withdrawValidatorCommission(request: MsgWithdrawValidatorCommission): Promise<MsgWithdrawValidatorCommissionResponse>;
  /**
   * FundCommunityPool defines a method to allow an account to directly
   * fund the community pool.
   */
  fundCommunityPool(request: MsgFundCommunityPool): Promise<MsgFundCommunityPoolResponse>;
  /**
   * UpdateParams defines a governance operation for updating the x/distribution
   * module parameters. The authority is defined in the keeper.
   * 
   * Since: cosmos-sdk 0.47
   */
  updateParams(request: MsgUpdateParams): Promise<MsgUpdateParamsResponse>;
  /**
   * CommunityPoolSpend defines a governance operation for sending tokens from
   * the community pool in the x/distribution module to another account, which
   * could be the governance module itself. The authority is defined in the
   * keeper.
   * 
   * Since: cosmos-sdk 0.47
   */
  communityPoolSpend(request: MsgCommunityPoolSpend): Promise<MsgCommunityPoolSpendResponse>;
  /**
   * DepositValidatorRewardsPool defines a method to provide additional rewards
   * to delegators to a specific validator.
   * 
   * Since: cosmos-sdk 0.50
   */
  depositValidatorRewardsPool(request: MsgDepositValidatorRewardsPool): Promise<MsgDepositValidatorRewardsPoolResponse>;
}
export class MsgClientImpl implements Msg {
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.setWithdrawAddress = this.setWithdrawAddress.bind(this);
    this.withdrawDelegatorReward = this.withdrawDelegatorReward.bind(this);
    this.withdrawValidatorCommission = this.withdrawValidatorCommission.bind(this);
    this.fundCommunityPool = this.fundCommunityPool.bind(this);
    this.updateParams = this.updateParams.bind(this);
    this.communityPoolSpend = this.communityPoolSpend.bind(this);
    this.depositValidatorRewardsPool = this.depositValidatorRewardsPool.bind(this);
  }
  setWithdrawAddress(request: MsgSetWithdrawAddress, useInterfaces: boolean = true): Promise<MsgSetWithdrawAddressResponse> {
    const data = MsgSetWithdrawAddress.encode(request).finish();
    const promise = this.rpc.request("cosmos.distribution.v1beta1.Msg", "SetWithdrawAddress", data);
    return promise.then(data => MsgSetWithdrawAddressResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  withdrawDelegatorReward(request: MsgWithdrawDelegatorReward, useInterfaces: boolean = true): Promise<MsgWithdrawDelegatorRewardResponse> {
    const data = MsgWithdrawDelegatorReward.encode(request).finish();
    const promise = this.rpc.request("cosmos.distribution.v1beta1.Msg", "WithdrawDelegatorReward", data);
    return promise.then(data => MsgWithdrawDelegatorRewardResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  withdrawValidatorCommission(request: MsgWithdrawValidatorCommission, useInterfaces: boolean = true): Promise<MsgWithdrawValidatorCommissionResponse> {
    const data = MsgWithdrawValidatorCommission.encode(request).finish();
    const promise = this.rpc.request("cosmos.distribution.v1beta1.Msg", "WithdrawValidatorCommission", data);
    return promise.then(data => MsgWithdrawValidatorCommissionResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  fundCommunityPool(request: MsgFundCommunityPool, useInterfaces: boolean = true): Promise<MsgFundCommunityPoolResponse> {
    const data = MsgFundCommunityPool.encode(request).finish();
    const promise = this.rpc.request("cosmos.distribution.v1beta1.Msg", "FundCommunityPool", data);
    return promise.then(data => MsgFundCommunityPoolResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  updateParams(request: MsgUpdateParams, useInterfaces: boolean = true): Promise<MsgUpdateParamsResponse> {
    const data = MsgUpdateParams.encode(request).finish();
    const promise = this.rpc.request("cosmos.distribution.v1beta1.Msg", "UpdateParams", data);
    return promise.then(data => MsgUpdateParamsResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  communityPoolSpend(request: MsgCommunityPoolSpend, useInterfaces: boolean = true): Promise<MsgCommunityPoolSpendResponse> {
    const data = MsgCommunityPoolSpend.encode(request).finish();
    const promise = this.rpc.request("cosmos.distribution.v1beta1.Msg", "CommunityPoolSpend", data);
    return promise.then(data => MsgCommunityPoolSpendResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  depositValidatorRewardsPool(request: MsgDepositValidatorRewardsPool, useInterfaces: boolean = true): Promise<MsgDepositValidatorRewardsPoolResponse> {
    const data = MsgDepositValidatorRewardsPool.encode(request).finish();
    const promise = this.rpc.request("cosmos.distribution.v1beta1.Msg", "DepositValidatorRewardsPool", data);
    return promise.then(data => MsgDepositValidatorRewardsPoolResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
}