//@ts-nocheck
import { Any, AnyProtoMsg, AnyAmino, AnySDKType } from "../../../google/protobuf/any";
import { Coin, CoinAmino, CoinSDKType } from "../../base/v1beta1/coin";
import { VoteOption, WeightedVoteOption, WeightedVoteOptionAmino, WeightedVoteOptionSDKType, TextProposal, TextProposalProtoMsg, TextProposalSDKType } from "./gov";
import { MsgCreateAllianceProposal, MsgCreateAllianceProposalProtoMsg, MsgCreateAllianceProposalSDKType, MsgUpdateAllianceProposal, MsgUpdateAllianceProposalProtoMsg, MsgUpdateAllianceProposalSDKType, MsgDeleteAllianceProposal, MsgDeleteAllianceProposalProtoMsg, MsgDeleteAllianceProposalSDKType } from "../../../alliance/alliance/gov";
import { CommunityPoolSpendProposal, CommunityPoolSpendProposalProtoMsg, CommunityPoolSpendProposalSDKType, CommunityPoolSpendProposalWithDeposit, CommunityPoolSpendProposalWithDepositProtoMsg, CommunityPoolSpendProposalWithDepositSDKType } from "../../distribution/v1beta1/distribution";
import { ParameterChangeProposal, ParameterChangeProposalProtoMsg, ParameterChangeProposalSDKType } from "../../params/v1beta1/params";
import { SoftwareUpgradeProposal, SoftwareUpgradeProposalProtoMsg, SoftwareUpgradeProposalSDKType, CancelSoftwareUpgradeProposal, CancelSoftwareUpgradeProposalProtoMsg, CancelSoftwareUpgradeProposalSDKType } from "../../upgrade/v1beta1/upgrade";
import { StoreCodeProposal, StoreCodeProposalProtoMsg, StoreCodeProposalSDKType, InstantiateContractProposal, InstantiateContractProposalProtoMsg, InstantiateContractProposalSDKType, InstantiateContract2Proposal, InstantiateContract2ProposalProtoMsg, InstantiateContract2ProposalSDKType, MigrateContractProposal, MigrateContractProposalProtoMsg, MigrateContractProposalSDKType, SudoContractProposal, SudoContractProposalProtoMsg, SudoContractProposalSDKType, ExecuteContractProposal, ExecuteContractProposalProtoMsg, ExecuteContractProposalSDKType, UpdateAdminProposal, UpdateAdminProposalProtoMsg, UpdateAdminProposalSDKType, ClearAdminProposal, ClearAdminProposalProtoMsg, ClearAdminProposalSDKType, PinCodesProposal, PinCodesProposalProtoMsg, PinCodesProposalSDKType, UnpinCodesProposal, UnpinCodesProposalProtoMsg, UnpinCodesProposalSDKType, UpdateInstantiateConfigProposal, UpdateInstantiateConfigProposalProtoMsg, UpdateInstantiateConfigProposalSDKType, StoreAndInstantiateContractProposal, StoreAndInstantiateContractProposalProtoMsg, StoreAndInstantiateContractProposalSDKType } from "../../../cosmwasm/wasm/v1/proposal";
import { ClientUpdateProposal, ClientUpdateProposalProtoMsg, ClientUpdateProposalSDKType, UpgradeProposal, UpgradeProposalProtoMsg, UpgradeProposalSDKType } from "../../../ibc/core/client/v1/client";
import { UploadCosmWasmPoolCodeAndWhiteListProposal, UploadCosmWasmPoolCodeAndWhiteListProposalProtoMsg, UploadCosmWasmPoolCodeAndWhiteListProposalSDKType, MigratePoolContractsProposal, MigratePoolContractsProposalProtoMsg, MigratePoolContractsProposalSDKType } from "../../../osmosis/cosmwasmpool/v1beta1/gov";
import { ReplaceMigrationRecordsProposal, ReplaceMigrationRecordsProposalProtoMsg, ReplaceMigrationRecordsProposalSDKType, UpdateMigrationRecordsProposal, UpdateMigrationRecordsProposalProtoMsg, UpdateMigrationRecordsProposalSDKType, CreateConcentratedLiquidityPoolsAndLinktoCFMMProposal, CreateConcentratedLiquidityPoolsAndLinktoCFMMProposalProtoMsg, CreateConcentratedLiquidityPoolsAndLinktoCFMMProposalSDKType, SetScalingFactorControllerProposal, SetScalingFactorControllerProposalProtoMsg, SetScalingFactorControllerProposalSDKType } from "../../../osmosis/gamm/v1beta1/gov";
import { CreateGroupsProposal, CreateGroupsProposalProtoMsg, CreateGroupsProposalSDKType } from "../../../osmosis/incentives/gov";
import { ReplacePoolIncentivesProposal, ReplacePoolIncentivesProposalProtoMsg, ReplacePoolIncentivesProposalSDKType, UpdatePoolIncentivesProposal, UpdatePoolIncentivesProposalProtoMsg, UpdatePoolIncentivesProposalSDKType } from "../../../osmosis/pool-incentives/v1beta1/gov";
import { SetProtoRevEnabledProposal, SetProtoRevEnabledProposalProtoMsg, SetProtoRevEnabledProposalSDKType, SetProtoRevAdminAccountProposal, SetProtoRevAdminAccountProposalProtoMsg, SetProtoRevAdminAccountProposalSDKType } from "../../../osmosis/protorev/v1beta1/gov";
import { SetSuperfluidAssetsProposal, SetSuperfluidAssetsProposalProtoMsg, SetSuperfluidAssetsProposalSDKType, RemoveSuperfluidAssetsProposal, RemoveSuperfluidAssetsProposalProtoMsg, RemoveSuperfluidAssetsProposalSDKType, UpdateUnpoolWhiteListProposal, UpdateUnpoolWhiteListProposalProtoMsg, UpdateUnpoolWhiteListProposalSDKType } from "../../../osmosis/superfluid/v1beta1/gov";
import { UpdateFeeTokenProposal, UpdateFeeTokenProposalProtoMsg, UpdateFeeTokenProposalSDKType } from "../../../osmosis/txfees/v1beta1/gov";
import { PromoteToPrivilegedContractProposal, PromoteToPrivilegedContractProposalProtoMsg, PromoteToPrivilegedContractProposalSDKType, DemotePrivilegedContractProposal, DemotePrivilegedContractProposalProtoMsg, DemotePrivilegedContractProposalSDKType } from "../../../publicawesome/stargaze/cron/v1/proposal";
import { SetCodeAuthorizationProposal, SetCodeAuthorizationProposalProtoMsg, SetCodeAuthorizationProposalSDKType, RemoveCodeAuthorizationProposal, RemoveCodeAuthorizationProposalProtoMsg, RemoveCodeAuthorizationProposalSDKType, SetContractAuthorizationProposal, SetContractAuthorizationProposalProtoMsg, SetContractAuthorizationProposalSDKType, RemoveContractAuthorizationProposal, RemoveContractAuthorizationProposalProtoMsg, RemoveContractAuthorizationProposalSDKType } from "../../../publicawesome/stargaze/globalfee/v1/proposal";
import { AllowDenomProposal, AllowDenomProposalProtoMsg, AllowDenomProposalSDKType } from "../../../regen/ecocredit/marketplace/v1/types";
import { CreditTypeProposal, CreditTypeProposalProtoMsg, CreditTypeProposalSDKType } from "../../../regen/ecocredit/v1/types";
import { BinaryReader, BinaryWriter } from "../../../binary";
/**
 * MsgSubmitProposal defines an sdk.Msg type that supports submitting arbitrary
 * proposal Content.
 */
export interface MsgSubmitProposal {
  /** content is the proposal's content. */
  content?: (MsgCreateAllianceProposal & MsgUpdateAllianceProposal & MsgDeleteAllianceProposal & CommunityPoolSpendProposal & CommunityPoolSpendProposalWithDeposit & TextProposal & ParameterChangeProposal & SoftwareUpgradeProposal & CancelSoftwareUpgradeProposal & StoreCodeProposal & InstantiateContractProposal & InstantiateContract2Proposal & MigrateContractProposal & SudoContractProposal & ExecuteContractProposal & UpdateAdminProposal & ClearAdminProposal & PinCodesProposal & UnpinCodesProposal & UpdateInstantiateConfigProposal & StoreAndInstantiateContractProposal & ClientUpdateProposal & UpgradeProposal & UploadCosmWasmPoolCodeAndWhiteListProposal & MigratePoolContractsProposal & ReplaceMigrationRecordsProposal & UpdateMigrationRecordsProposal & CreateConcentratedLiquidityPoolsAndLinktoCFMMProposal & SetScalingFactorControllerProposal & CreateGroupsProposal & ReplacePoolIncentivesProposal & UpdatePoolIncentivesProposal & SetProtoRevEnabledProposal & SetProtoRevAdminAccountProposal & SetSuperfluidAssetsProposal & RemoveSuperfluidAssetsProposal & UpdateUnpoolWhiteListProposal & UpdateFeeTokenProposal & PromoteToPrivilegedContractProposal & DemotePrivilegedContractProposal & SetCodeAuthorizationProposal & RemoveCodeAuthorizationProposal & SetContractAuthorizationProposal & RemoveContractAuthorizationProposal & AllowDenomProposal & CreditTypeProposal & Any) | undefined;
  /** initial_deposit is the deposit value that must be paid at proposal submission. */
  initialDeposit: Coin[];
  /** proposer is the account address of the proposer. */
  proposer: string;
}
export interface MsgSubmitProposalProtoMsg {
  typeUrl: "/cosmos.gov.v1beta1.MsgSubmitProposal";
  value: Uint8Array;
}
export type MsgSubmitProposalEncoded = Omit<MsgSubmitProposal, "content"> & {
  /** content is the proposal's content. */content?: MsgCreateAllianceProposalProtoMsg | MsgUpdateAllianceProposalProtoMsg | MsgDeleteAllianceProposalProtoMsg | CommunityPoolSpendProposalProtoMsg | CommunityPoolSpendProposalWithDepositProtoMsg | TextProposalProtoMsg | ParameterChangeProposalProtoMsg | SoftwareUpgradeProposalProtoMsg | CancelSoftwareUpgradeProposalProtoMsg | StoreCodeProposalProtoMsg | InstantiateContractProposalProtoMsg | InstantiateContract2ProposalProtoMsg | MigrateContractProposalProtoMsg | SudoContractProposalProtoMsg | ExecuteContractProposalProtoMsg | UpdateAdminProposalProtoMsg | ClearAdminProposalProtoMsg | PinCodesProposalProtoMsg | UnpinCodesProposalProtoMsg | UpdateInstantiateConfigProposalProtoMsg | StoreAndInstantiateContractProposalProtoMsg | ClientUpdateProposalProtoMsg | UpgradeProposalProtoMsg | UploadCosmWasmPoolCodeAndWhiteListProposalProtoMsg | MigratePoolContractsProposalProtoMsg | ReplaceMigrationRecordsProposalProtoMsg | UpdateMigrationRecordsProposalProtoMsg | CreateConcentratedLiquidityPoolsAndLinktoCFMMProposalProtoMsg | SetScalingFactorControllerProposalProtoMsg | CreateGroupsProposalProtoMsg | ReplacePoolIncentivesProposalProtoMsg | UpdatePoolIncentivesProposalProtoMsg | SetProtoRevEnabledProposalProtoMsg | SetProtoRevAdminAccountProposalProtoMsg | SetSuperfluidAssetsProposalProtoMsg | RemoveSuperfluidAssetsProposalProtoMsg | UpdateUnpoolWhiteListProposalProtoMsg | UpdateFeeTokenProposalProtoMsg | PromoteToPrivilegedContractProposalProtoMsg | DemotePrivilegedContractProposalProtoMsg | SetCodeAuthorizationProposalProtoMsg | RemoveCodeAuthorizationProposalProtoMsg | SetContractAuthorizationProposalProtoMsg | RemoveContractAuthorizationProposalProtoMsg | AllowDenomProposalProtoMsg | CreditTypeProposalProtoMsg | AnyProtoMsg | undefined;
};
/**
 * MsgSubmitProposal defines an sdk.Msg type that supports submitting arbitrary
 * proposal Content.
 */
export interface MsgSubmitProposalAmino {
  /** content is the proposal's content. */
  content?: AnyAmino | undefined;
  /** initial_deposit is the deposit value that must be paid at proposal submission. */
  initial_deposit: CoinAmino[];
  /** proposer is the account address of the proposer. */
  proposer?: string;
}
export interface MsgSubmitProposalAminoMsg {
  type: "cosmos-sdk/MsgSubmitProposal";
  value: MsgSubmitProposalAmino;
}
/**
 * MsgSubmitProposal defines an sdk.Msg type that supports submitting arbitrary
 * proposal Content.
 */
export interface MsgSubmitProposalSDKType {
  content?: MsgCreateAllianceProposalSDKType | MsgUpdateAllianceProposalSDKType | MsgDeleteAllianceProposalSDKType | CommunityPoolSpendProposalSDKType | CommunityPoolSpendProposalWithDepositSDKType | TextProposalSDKType | ParameterChangeProposalSDKType | SoftwareUpgradeProposalSDKType | CancelSoftwareUpgradeProposalSDKType | StoreCodeProposalSDKType | InstantiateContractProposalSDKType | InstantiateContract2ProposalSDKType | MigrateContractProposalSDKType | SudoContractProposalSDKType | ExecuteContractProposalSDKType | UpdateAdminProposalSDKType | ClearAdminProposalSDKType | PinCodesProposalSDKType | UnpinCodesProposalSDKType | UpdateInstantiateConfigProposalSDKType | StoreAndInstantiateContractProposalSDKType | ClientUpdateProposalSDKType | UpgradeProposalSDKType | UploadCosmWasmPoolCodeAndWhiteListProposalSDKType | MigratePoolContractsProposalSDKType | ReplaceMigrationRecordsProposalSDKType | UpdateMigrationRecordsProposalSDKType | CreateConcentratedLiquidityPoolsAndLinktoCFMMProposalSDKType | SetScalingFactorControllerProposalSDKType | CreateGroupsProposalSDKType | ReplacePoolIncentivesProposalSDKType | UpdatePoolIncentivesProposalSDKType | SetProtoRevEnabledProposalSDKType | SetProtoRevAdminAccountProposalSDKType | SetSuperfluidAssetsProposalSDKType | RemoveSuperfluidAssetsProposalSDKType | UpdateUnpoolWhiteListProposalSDKType | UpdateFeeTokenProposalSDKType | PromoteToPrivilegedContractProposalSDKType | DemotePrivilegedContractProposalSDKType | SetCodeAuthorizationProposalSDKType | RemoveCodeAuthorizationProposalSDKType | SetContractAuthorizationProposalSDKType | RemoveContractAuthorizationProposalSDKType | AllowDenomProposalSDKType | CreditTypeProposalSDKType | AnySDKType | undefined;
  initial_deposit: CoinSDKType[];
  proposer: string;
}
/** MsgSubmitProposalResponse defines the Msg/SubmitProposal response type. */
export interface MsgSubmitProposalResponse {
  /** proposal_id defines the unique id of the proposal. */
  proposalId: bigint;
}
export interface MsgSubmitProposalResponseProtoMsg {
  typeUrl: "/cosmos.gov.v1beta1.MsgSubmitProposalResponse";
  value: Uint8Array;
}
/** MsgSubmitProposalResponse defines the Msg/SubmitProposal response type. */
export interface MsgSubmitProposalResponseAmino {
  /** proposal_id defines the unique id of the proposal. */
  proposal_id: string;
}
export interface MsgSubmitProposalResponseAminoMsg {
  type: "cosmos-sdk/MsgSubmitProposalResponse";
  value: MsgSubmitProposalResponseAmino;
}
/** MsgSubmitProposalResponse defines the Msg/SubmitProposal response type. */
export interface MsgSubmitProposalResponseSDKType {
  proposal_id: bigint;
}
/** MsgVote defines a message to cast a vote. */
export interface MsgVote {
  /** proposal_id defines the unique id of the proposal. */
  proposalId: bigint;
  /** voter is the voter address for the proposal. */
  voter: string;
  /** option defines the vote option. */
  option: VoteOption;
}
export interface MsgVoteProtoMsg {
  typeUrl: "/cosmos.gov.v1beta1.MsgVote";
  value: Uint8Array;
}
/** MsgVote defines a message to cast a vote. */
export interface MsgVoteAmino {
  /** proposal_id defines the unique id of the proposal. */
  proposal_id?: string;
  /** voter is the voter address for the proposal. */
  voter?: string;
  /** option defines the vote option. */
  option?: VoteOption;
}
export interface MsgVoteAminoMsg {
  type: "cosmos-sdk/MsgVote";
  value: MsgVoteAmino;
}
/** MsgVote defines a message to cast a vote. */
export interface MsgVoteSDKType {
  proposal_id: bigint;
  voter: string;
  option: VoteOption;
}
/** MsgVoteResponse defines the Msg/Vote response type. */
export interface MsgVoteResponse {}
export interface MsgVoteResponseProtoMsg {
  typeUrl: "/cosmos.gov.v1beta1.MsgVoteResponse";
  value: Uint8Array;
}
/** MsgVoteResponse defines the Msg/Vote response type. */
export interface MsgVoteResponseAmino {}
export interface MsgVoteResponseAminoMsg {
  type: "cosmos-sdk/MsgVoteResponse";
  value: MsgVoteResponseAmino;
}
/** MsgVoteResponse defines the Msg/Vote response type. */
export interface MsgVoteResponseSDKType {}
/**
 * MsgVoteWeighted defines a message to cast a vote.
 * 
 * Since: cosmos-sdk 0.43
 */
export interface MsgVoteWeighted {
  /** proposal_id defines the unique id of the proposal. */
  proposalId: bigint;
  /** voter is the voter address for the proposal. */
  voter: string;
  /** options defines the weighted vote options. */
  options: WeightedVoteOption[];
}
export interface MsgVoteWeightedProtoMsg {
  typeUrl: "/cosmos.gov.v1beta1.MsgVoteWeighted";
  value: Uint8Array;
}
/**
 * MsgVoteWeighted defines a message to cast a vote.
 * 
 * Since: cosmos-sdk 0.43
 */
export interface MsgVoteWeightedAmino {
  /** proposal_id defines the unique id of the proposal. */
  proposal_id: string;
  /** voter is the voter address for the proposal. */
  voter?: string;
  /** options defines the weighted vote options. */
  options: WeightedVoteOptionAmino[];
}
export interface MsgVoteWeightedAminoMsg {
  type: "cosmos-sdk/MsgVoteWeighted";
  value: MsgVoteWeightedAmino;
}
/**
 * MsgVoteWeighted defines a message to cast a vote.
 * 
 * Since: cosmos-sdk 0.43
 */
export interface MsgVoteWeightedSDKType {
  proposal_id: bigint;
  voter: string;
  options: WeightedVoteOptionSDKType[];
}
/**
 * MsgVoteWeightedResponse defines the Msg/VoteWeighted response type.
 * 
 * Since: cosmos-sdk 0.43
 */
export interface MsgVoteWeightedResponse {}
export interface MsgVoteWeightedResponseProtoMsg {
  typeUrl: "/cosmos.gov.v1beta1.MsgVoteWeightedResponse";
  value: Uint8Array;
}
/**
 * MsgVoteWeightedResponse defines the Msg/VoteWeighted response type.
 * 
 * Since: cosmos-sdk 0.43
 */
export interface MsgVoteWeightedResponseAmino {}
export interface MsgVoteWeightedResponseAminoMsg {
  type: "cosmos-sdk/MsgVoteWeightedResponse";
  value: MsgVoteWeightedResponseAmino;
}
/**
 * MsgVoteWeightedResponse defines the Msg/VoteWeighted response type.
 * 
 * Since: cosmos-sdk 0.43
 */
export interface MsgVoteWeightedResponseSDKType {}
/** MsgDeposit defines a message to submit a deposit to an existing proposal. */
export interface MsgDeposit {
  /** proposal_id defines the unique id of the proposal. */
  proposalId: bigint;
  /** depositor defines the deposit addresses from the proposals. */
  depositor: string;
  /** amount to be deposited by depositor. */
  amount: Coin[];
}
export interface MsgDepositProtoMsg {
  typeUrl: "/cosmos.gov.v1beta1.MsgDeposit";
  value: Uint8Array;
}
/** MsgDeposit defines a message to submit a deposit to an existing proposal. */
export interface MsgDepositAmino {
  /** proposal_id defines the unique id of the proposal. */
  proposal_id: string;
  /** depositor defines the deposit addresses from the proposals. */
  depositor?: string;
  /** amount to be deposited by depositor. */
  amount: CoinAmino[];
}
export interface MsgDepositAminoMsg {
  type: "cosmos-sdk/MsgDeposit";
  value: MsgDepositAmino;
}
/** MsgDeposit defines a message to submit a deposit to an existing proposal. */
export interface MsgDepositSDKType {
  proposal_id: bigint;
  depositor: string;
  amount: CoinSDKType[];
}
/** MsgDepositResponse defines the Msg/Deposit response type. */
export interface MsgDepositResponse {}
export interface MsgDepositResponseProtoMsg {
  typeUrl: "/cosmos.gov.v1beta1.MsgDepositResponse";
  value: Uint8Array;
}
/** MsgDepositResponse defines the Msg/Deposit response type. */
export interface MsgDepositResponseAmino {}
export interface MsgDepositResponseAminoMsg {
  type: "cosmos-sdk/MsgDepositResponse";
  value: MsgDepositResponseAmino;
}
/** MsgDepositResponse defines the Msg/Deposit response type. */
export interface MsgDepositResponseSDKType {}
function createBaseMsgSubmitProposal(): MsgSubmitProposal {
  return {
    content: undefined,
    initialDeposit: [],
    proposer: ""
  };
}
export const MsgSubmitProposal = {
  typeUrl: "/cosmos.gov.v1beta1.MsgSubmitProposal",
  encode(message: MsgSubmitProposal, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.content !== undefined) {
      Any.encode((message.content as Any), writer.uint32(10).fork()).ldelim();
    }
    for (const v of message.initialDeposit) {
      Coin.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    if (message.proposer !== "") {
      writer.uint32(26).string(message.proposer);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgSubmitProposal {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSubmitProposal();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.content = useInterfaces ? (Cosmos_govv1beta1Content_InterfaceDecoder(reader) as Any) : Any.decode(reader, reader.uint32(), useInterfaces);
          break;
        case 2:
          message.initialDeposit.push(Coin.decode(reader, reader.uint32(), useInterfaces));
          break;
        case 3:
          message.proposer = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<MsgSubmitProposal>): MsgSubmitProposal {
    const message = createBaseMsgSubmitProposal();
    message.content = object.content !== undefined && object.content !== null ? Any.fromPartial(object.content) : undefined;
    message.initialDeposit = object.initialDeposit?.map(e => Coin.fromPartial(e)) || [];
    message.proposer = object.proposer ?? "";
    return message;
  },
  fromAmino(object: MsgSubmitProposalAmino): MsgSubmitProposal {
    const message = createBaseMsgSubmitProposal();
    if (object.content !== undefined && object.content !== null) {
      message.content = Cosmos_govv1beta1Content_FromAmino(object.content);
    }
    message.initialDeposit = object.initial_deposit?.map(e => Coin.fromAmino(e)) || [];
    if (object.proposer !== undefined && object.proposer !== null) {
      message.proposer = object.proposer;
    }
    return message;
  },
  toAmino(message: MsgSubmitProposal, useInterfaces: boolean = false): MsgSubmitProposalAmino {
    const obj: any = {};
    obj.content = message.content ? Cosmos_govv1beta1Content_ToAmino((message.content as Any), useInterfaces) : undefined;
    if (message.initialDeposit) {
      obj.initial_deposit = message.initialDeposit.map(e => e ? Coin.toAmino(e, useInterfaces) : undefined);
    } else {
      obj.initial_deposit = message.initialDeposit;
    }
    obj.proposer = message.proposer === "" ? undefined : message.proposer;
    return obj;
  },
  fromAminoMsg(object: MsgSubmitProposalAminoMsg): MsgSubmitProposal {
    return MsgSubmitProposal.fromAmino(object.value);
  },
  toAminoMsg(message: MsgSubmitProposal, useInterfaces: boolean = false): MsgSubmitProposalAminoMsg {
    return {
      type: "cosmos-sdk/MsgSubmitProposal",
      value: MsgSubmitProposal.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgSubmitProposalProtoMsg, useInterfaces: boolean = false): MsgSubmitProposal {
    return MsgSubmitProposal.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgSubmitProposal): Uint8Array {
    return MsgSubmitProposal.encode(message).finish();
  },
  toProtoMsg(message: MsgSubmitProposal): MsgSubmitProposalProtoMsg {
    return {
      typeUrl: "/cosmos.gov.v1beta1.MsgSubmitProposal",
      value: MsgSubmitProposal.encode(message).finish()
    };
  }
};
function createBaseMsgSubmitProposalResponse(): MsgSubmitProposalResponse {
  return {
    proposalId: BigInt(0)
  };
}
export const MsgSubmitProposalResponse = {
  typeUrl: "/cosmos.gov.v1beta1.MsgSubmitProposalResponse",
  encode(message: MsgSubmitProposalResponse, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.proposalId !== BigInt(0)) {
      writer.uint32(8).uint64(message.proposalId);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgSubmitProposalResponse {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSubmitProposalResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.proposalId = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<MsgSubmitProposalResponse>): MsgSubmitProposalResponse {
    const message = createBaseMsgSubmitProposalResponse();
    message.proposalId = object.proposalId !== undefined && object.proposalId !== null ? BigInt(object.proposalId.toString()) : BigInt(0);
    return message;
  },
  fromAmino(object: MsgSubmitProposalResponseAmino): MsgSubmitProposalResponse {
    const message = createBaseMsgSubmitProposalResponse();
    if (object.proposal_id !== undefined && object.proposal_id !== null) {
      message.proposalId = BigInt(object.proposal_id);
    }
    return message;
  },
  toAmino(message: MsgSubmitProposalResponse, useInterfaces: boolean = false): MsgSubmitProposalResponseAmino {
    const obj: any = {};
    obj.proposal_id = message.proposalId ? message.proposalId.toString() : "0";
    return obj;
  },
  fromAminoMsg(object: MsgSubmitProposalResponseAminoMsg): MsgSubmitProposalResponse {
    return MsgSubmitProposalResponse.fromAmino(object.value);
  },
  toAminoMsg(message: MsgSubmitProposalResponse, useInterfaces: boolean = false): MsgSubmitProposalResponseAminoMsg {
    return {
      type: "cosmos-sdk/MsgSubmitProposalResponse",
      value: MsgSubmitProposalResponse.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgSubmitProposalResponseProtoMsg, useInterfaces: boolean = false): MsgSubmitProposalResponse {
    return MsgSubmitProposalResponse.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgSubmitProposalResponse): Uint8Array {
    return MsgSubmitProposalResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgSubmitProposalResponse): MsgSubmitProposalResponseProtoMsg {
    return {
      typeUrl: "/cosmos.gov.v1beta1.MsgSubmitProposalResponse",
      value: MsgSubmitProposalResponse.encode(message).finish()
    };
  }
};
function createBaseMsgVote(): MsgVote {
  return {
    proposalId: BigInt(0),
    voter: "",
    option: 0
  };
}
export const MsgVote = {
  typeUrl: "/cosmos.gov.v1beta1.MsgVote",
  encode(message: MsgVote, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.proposalId !== BigInt(0)) {
      writer.uint32(8).uint64(message.proposalId);
    }
    if (message.voter !== "") {
      writer.uint32(18).string(message.voter);
    }
    if (message.option !== 0) {
      writer.uint32(24).int32(message.option);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgVote {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgVote();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.proposalId = reader.uint64();
          break;
        case 2:
          message.voter = reader.string();
          break;
        case 3:
          message.option = (reader.int32() as any);
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<MsgVote>): MsgVote {
    const message = createBaseMsgVote();
    message.proposalId = object.proposalId !== undefined && object.proposalId !== null ? BigInt(object.proposalId.toString()) : BigInt(0);
    message.voter = object.voter ?? "";
    message.option = object.option ?? 0;
    return message;
  },
  fromAmino(object: MsgVoteAmino): MsgVote {
    const message = createBaseMsgVote();
    if (object.proposal_id !== undefined && object.proposal_id !== null) {
      message.proposalId = BigInt(object.proposal_id);
    }
    if (object.voter !== undefined && object.voter !== null) {
      message.voter = object.voter;
    }
    if (object.option !== undefined && object.option !== null) {
      message.option = object.option;
    }
    return message;
  },
  toAmino(message: MsgVote, useInterfaces: boolean = false): MsgVoteAmino {
    const obj: any = {};
    obj.proposal_id = message.proposalId !== BigInt(0) ? message.proposalId.toString() : undefined;
    obj.voter = message.voter === "" ? undefined : message.voter;
    obj.option = message.option === 0 ? undefined : message.option;
    return obj;
  },
  fromAminoMsg(object: MsgVoteAminoMsg): MsgVote {
    return MsgVote.fromAmino(object.value);
  },
  toAminoMsg(message: MsgVote, useInterfaces: boolean = false): MsgVoteAminoMsg {
    return {
      type: "cosmos-sdk/MsgVote",
      value: MsgVote.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgVoteProtoMsg, useInterfaces: boolean = false): MsgVote {
    return MsgVote.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgVote): Uint8Array {
    return MsgVote.encode(message).finish();
  },
  toProtoMsg(message: MsgVote): MsgVoteProtoMsg {
    return {
      typeUrl: "/cosmos.gov.v1beta1.MsgVote",
      value: MsgVote.encode(message).finish()
    };
  }
};
function createBaseMsgVoteResponse(): MsgVoteResponse {
  return {};
}
export const MsgVoteResponse = {
  typeUrl: "/cosmos.gov.v1beta1.MsgVoteResponse",
  encode(_: MsgVoteResponse, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgVoteResponse {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgVoteResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(_: Partial<MsgVoteResponse>): MsgVoteResponse {
    const message = createBaseMsgVoteResponse();
    return message;
  },
  fromAmino(_: MsgVoteResponseAmino): MsgVoteResponse {
    const message = createBaseMsgVoteResponse();
    return message;
  },
  toAmino(_: MsgVoteResponse, useInterfaces: boolean = false): MsgVoteResponseAmino {
    const obj: any = {};
    return obj;
  },
  fromAminoMsg(object: MsgVoteResponseAminoMsg): MsgVoteResponse {
    return MsgVoteResponse.fromAmino(object.value);
  },
  toAminoMsg(message: MsgVoteResponse, useInterfaces: boolean = false): MsgVoteResponseAminoMsg {
    return {
      type: "cosmos-sdk/MsgVoteResponse",
      value: MsgVoteResponse.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgVoteResponseProtoMsg, useInterfaces: boolean = false): MsgVoteResponse {
    return MsgVoteResponse.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgVoteResponse): Uint8Array {
    return MsgVoteResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgVoteResponse): MsgVoteResponseProtoMsg {
    return {
      typeUrl: "/cosmos.gov.v1beta1.MsgVoteResponse",
      value: MsgVoteResponse.encode(message).finish()
    };
  }
};
function createBaseMsgVoteWeighted(): MsgVoteWeighted {
  return {
    proposalId: BigInt(0),
    voter: "",
    options: []
  };
}
export const MsgVoteWeighted = {
  typeUrl: "/cosmos.gov.v1beta1.MsgVoteWeighted",
  encode(message: MsgVoteWeighted, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.proposalId !== BigInt(0)) {
      writer.uint32(8).uint64(message.proposalId);
    }
    if (message.voter !== "") {
      writer.uint32(18).string(message.voter);
    }
    for (const v of message.options) {
      WeightedVoteOption.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgVoteWeighted {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgVoteWeighted();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.proposalId = reader.uint64();
          break;
        case 2:
          message.voter = reader.string();
          break;
        case 3:
          message.options.push(WeightedVoteOption.decode(reader, reader.uint32(), useInterfaces));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<MsgVoteWeighted>): MsgVoteWeighted {
    const message = createBaseMsgVoteWeighted();
    message.proposalId = object.proposalId !== undefined && object.proposalId !== null ? BigInt(object.proposalId.toString()) : BigInt(0);
    message.voter = object.voter ?? "";
    message.options = object.options?.map(e => WeightedVoteOption.fromPartial(e)) || [];
    return message;
  },
  fromAmino(object: MsgVoteWeightedAmino): MsgVoteWeighted {
    const message = createBaseMsgVoteWeighted();
    if (object.proposal_id !== undefined && object.proposal_id !== null) {
      message.proposalId = BigInt(object.proposal_id);
    }
    if (object.voter !== undefined && object.voter !== null) {
      message.voter = object.voter;
    }
    message.options = object.options?.map(e => WeightedVoteOption.fromAmino(e)) || [];
    return message;
  },
  toAmino(message: MsgVoteWeighted, useInterfaces: boolean = false): MsgVoteWeightedAmino {
    const obj: any = {};
    obj.proposal_id = message.proposalId ? message.proposalId.toString() : "0";
    obj.voter = message.voter === "" ? undefined : message.voter;
    if (message.options) {
      obj.options = message.options.map(e => e ? WeightedVoteOption.toAmino(e, useInterfaces) : undefined);
    } else {
      obj.options = message.options;
    }
    return obj;
  },
  fromAminoMsg(object: MsgVoteWeightedAminoMsg): MsgVoteWeighted {
    return MsgVoteWeighted.fromAmino(object.value);
  },
  toAminoMsg(message: MsgVoteWeighted, useInterfaces: boolean = false): MsgVoteWeightedAminoMsg {
    return {
      type: "cosmos-sdk/MsgVoteWeighted",
      value: MsgVoteWeighted.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgVoteWeightedProtoMsg, useInterfaces: boolean = false): MsgVoteWeighted {
    return MsgVoteWeighted.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgVoteWeighted): Uint8Array {
    return MsgVoteWeighted.encode(message).finish();
  },
  toProtoMsg(message: MsgVoteWeighted): MsgVoteWeightedProtoMsg {
    return {
      typeUrl: "/cosmos.gov.v1beta1.MsgVoteWeighted",
      value: MsgVoteWeighted.encode(message).finish()
    };
  }
};
function createBaseMsgVoteWeightedResponse(): MsgVoteWeightedResponse {
  return {};
}
export const MsgVoteWeightedResponse = {
  typeUrl: "/cosmos.gov.v1beta1.MsgVoteWeightedResponse",
  encode(_: MsgVoteWeightedResponse, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgVoteWeightedResponse {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgVoteWeightedResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(_: Partial<MsgVoteWeightedResponse>): MsgVoteWeightedResponse {
    const message = createBaseMsgVoteWeightedResponse();
    return message;
  },
  fromAmino(_: MsgVoteWeightedResponseAmino): MsgVoteWeightedResponse {
    const message = createBaseMsgVoteWeightedResponse();
    return message;
  },
  toAmino(_: MsgVoteWeightedResponse, useInterfaces: boolean = false): MsgVoteWeightedResponseAmino {
    const obj: any = {};
    return obj;
  },
  fromAminoMsg(object: MsgVoteWeightedResponseAminoMsg): MsgVoteWeightedResponse {
    return MsgVoteWeightedResponse.fromAmino(object.value);
  },
  toAminoMsg(message: MsgVoteWeightedResponse, useInterfaces: boolean = false): MsgVoteWeightedResponseAminoMsg {
    return {
      type: "cosmos-sdk/MsgVoteWeightedResponse",
      value: MsgVoteWeightedResponse.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgVoteWeightedResponseProtoMsg, useInterfaces: boolean = false): MsgVoteWeightedResponse {
    return MsgVoteWeightedResponse.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgVoteWeightedResponse): Uint8Array {
    return MsgVoteWeightedResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgVoteWeightedResponse): MsgVoteWeightedResponseProtoMsg {
    return {
      typeUrl: "/cosmos.gov.v1beta1.MsgVoteWeightedResponse",
      value: MsgVoteWeightedResponse.encode(message).finish()
    };
  }
};
function createBaseMsgDeposit(): MsgDeposit {
  return {
    proposalId: BigInt(0),
    depositor: "",
    amount: []
  };
}
export const MsgDeposit = {
  typeUrl: "/cosmos.gov.v1beta1.MsgDeposit",
  encode(message: MsgDeposit, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.proposalId !== BigInt(0)) {
      writer.uint32(8).uint64(message.proposalId);
    }
    if (message.depositor !== "") {
      writer.uint32(18).string(message.depositor);
    }
    for (const v of message.amount) {
      Coin.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgDeposit {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgDeposit();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.proposalId = reader.uint64();
          break;
        case 2:
          message.depositor = reader.string();
          break;
        case 3:
          message.amount.push(Coin.decode(reader, reader.uint32(), useInterfaces));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<MsgDeposit>): MsgDeposit {
    const message = createBaseMsgDeposit();
    message.proposalId = object.proposalId !== undefined && object.proposalId !== null ? BigInt(object.proposalId.toString()) : BigInt(0);
    message.depositor = object.depositor ?? "";
    message.amount = object.amount?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromAmino(object: MsgDepositAmino): MsgDeposit {
    const message = createBaseMsgDeposit();
    if (object.proposal_id !== undefined && object.proposal_id !== null) {
      message.proposalId = BigInt(object.proposal_id);
    }
    if (object.depositor !== undefined && object.depositor !== null) {
      message.depositor = object.depositor;
    }
    message.amount = object.amount?.map(e => Coin.fromAmino(e)) || [];
    return message;
  },
  toAmino(message: MsgDeposit, useInterfaces: boolean = false): MsgDepositAmino {
    const obj: any = {};
    obj.proposal_id = message.proposalId ? message.proposalId.toString() : "0";
    obj.depositor = message.depositor === "" ? undefined : message.depositor;
    if (message.amount) {
      obj.amount = message.amount.map(e => e ? Coin.toAmino(e, useInterfaces) : undefined);
    } else {
      obj.amount = message.amount;
    }
    return obj;
  },
  fromAminoMsg(object: MsgDepositAminoMsg): MsgDeposit {
    return MsgDeposit.fromAmino(object.value);
  },
  toAminoMsg(message: MsgDeposit, useInterfaces: boolean = false): MsgDepositAminoMsg {
    return {
      type: "cosmos-sdk/MsgDeposit",
      value: MsgDeposit.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgDepositProtoMsg, useInterfaces: boolean = false): MsgDeposit {
    return MsgDeposit.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgDeposit): Uint8Array {
    return MsgDeposit.encode(message).finish();
  },
  toProtoMsg(message: MsgDeposit): MsgDepositProtoMsg {
    return {
      typeUrl: "/cosmos.gov.v1beta1.MsgDeposit",
      value: MsgDeposit.encode(message).finish()
    };
  }
};
function createBaseMsgDepositResponse(): MsgDepositResponse {
  return {};
}
export const MsgDepositResponse = {
  typeUrl: "/cosmos.gov.v1beta1.MsgDepositResponse",
  encode(_: MsgDepositResponse, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgDepositResponse {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgDepositResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(_: Partial<MsgDepositResponse>): MsgDepositResponse {
    const message = createBaseMsgDepositResponse();
    return message;
  },
  fromAmino(_: MsgDepositResponseAmino): MsgDepositResponse {
    const message = createBaseMsgDepositResponse();
    return message;
  },
  toAmino(_: MsgDepositResponse, useInterfaces: boolean = false): MsgDepositResponseAmino {
    const obj: any = {};
    return obj;
  },
  fromAminoMsg(object: MsgDepositResponseAminoMsg): MsgDepositResponse {
    return MsgDepositResponse.fromAmino(object.value);
  },
  toAminoMsg(message: MsgDepositResponse, useInterfaces: boolean = false): MsgDepositResponseAminoMsg {
    return {
      type: "cosmos-sdk/MsgDepositResponse",
      value: MsgDepositResponse.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgDepositResponseProtoMsg, useInterfaces: boolean = false): MsgDepositResponse {
    return MsgDepositResponse.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgDepositResponse): Uint8Array {
    return MsgDepositResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgDepositResponse): MsgDepositResponseProtoMsg {
    return {
      typeUrl: "/cosmos.gov.v1beta1.MsgDepositResponse",
      value: MsgDepositResponse.encode(message).finish()
    };
  }
};
export const Cosmos_govv1beta1Content_InterfaceDecoder = (input: BinaryReader | Uint8Array): MsgCreateAllianceProposal | MsgUpdateAllianceProposal | MsgDeleteAllianceProposal | CommunityPoolSpendProposal | CommunityPoolSpendProposalWithDeposit | TextProposal | ParameterChangeProposal | SoftwareUpgradeProposal | CancelSoftwareUpgradeProposal | StoreCodeProposal | InstantiateContractProposal | InstantiateContract2Proposal | MigrateContractProposal | SudoContractProposal | ExecuteContractProposal | UpdateAdminProposal | ClearAdminProposal | PinCodesProposal | UnpinCodesProposal | UpdateInstantiateConfigProposal | StoreAndInstantiateContractProposal | ClientUpdateProposal | UpgradeProposal | UploadCosmWasmPoolCodeAndWhiteListProposal | MigratePoolContractsProposal | ReplaceMigrationRecordsProposal | UpdateMigrationRecordsProposal | CreateConcentratedLiquidityPoolsAndLinktoCFMMProposal | SetScalingFactorControllerProposal | CreateGroupsProposal | ReplacePoolIncentivesProposal | UpdatePoolIncentivesProposal | SetProtoRevEnabledProposal | SetProtoRevAdminAccountProposal | SetSuperfluidAssetsProposal | RemoveSuperfluidAssetsProposal | UpdateUnpoolWhiteListProposal | UpdateFeeTokenProposal | PromoteToPrivilegedContractProposal | DemotePrivilegedContractProposal | SetCodeAuthorizationProposal | RemoveCodeAuthorizationProposal | SetContractAuthorizationProposal | RemoveContractAuthorizationProposal | AllowDenomProposal | CreditTypeProposal | Any => {
  const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
  const data = Any.decode(reader, reader.uint32(), true);
  switch (data.typeUrl) {
    case "/alliance.alliance.MsgCreateAllianceProposal":
      return MsgCreateAllianceProposal.decode(data.value, undefined, true);
    case "/alliance.alliance.MsgUpdateAllianceProposal":
      return MsgUpdateAllianceProposal.decode(data.value, undefined, true);
    case "/alliance.alliance.MsgDeleteAllianceProposal":
      return MsgDeleteAllianceProposal.decode(data.value, undefined, true);
    case "/cosmos.distribution.v1beta1.CommunityPoolSpendProposal":
      return CommunityPoolSpendProposal.decode(data.value, undefined, true);
    case "/cosmos.distribution.v1beta1.CommunityPoolSpendProposalWithDeposit":
      return CommunityPoolSpendProposalWithDeposit.decode(data.value, undefined, true);
    case "/cosmos.gov.v1beta1.TextProposal":
      return TextProposal.decode(data.value, undefined, true);
    case "/cosmos.params.v1beta1.ParameterChangeProposal":
      return ParameterChangeProposal.decode(data.value, undefined, true);
    case "/cosmos.upgrade.v1beta1.SoftwareUpgradeProposal":
      return SoftwareUpgradeProposal.decode(data.value, undefined, true);
    case "/cosmos.upgrade.v1beta1.CancelSoftwareUpgradeProposal":
      return CancelSoftwareUpgradeProposal.decode(data.value, undefined, true);
    case "/cosmwasm.wasm.v1.StoreCodeProposal":
      return StoreCodeProposal.decode(data.value, undefined, true);
    case "/cosmwasm.wasm.v1.InstantiateContractProposal":
      return InstantiateContractProposal.decode(data.value, undefined, true);
    case "/cosmwasm.wasm.v1.InstantiateContract2Proposal":
      return InstantiateContract2Proposal.decode(data.value, undefined, true);
    case "/cosmwasm.wasm.v1.MigrateContractProposal":
      return MigrateContractProposal.decode(data.value, undefined, true);
    case "/cosmwasm.wasm.v1.SudoContractProposal":
      return SudoContractProposal.decode(data.value, undefined, true);
    case "/cosmwasm.wasm.v1.ExecuteContractProposal":
      return ExecuteContractProposal.decode(data.value, undefined, true);
    case "/cosmwasm.wasm.v1.UpdateAdminProposal":
      return UpdateAdminProposal.decode(data.value, undefined, true);
    case "/cosmwasm.wasm.v1.ClearAdminProposal":
      return ClearAdminProposal.decode(data.value, undefined, true);
    case "/cosmwasm.wasm.v1.PinCodesProposal":
      return PinCodesProposal.decode(data.value, undefined, true);
    case "/cosmwasm.wasm.v1.UnpinCodesProposal":
      return UnpinCodesProposal.decode(data.value, undefined, true);
    case "/cosmwasm.wasm.v1.UpdateInstantiateConfigProposal":
      return UpdateInstantiateConfigProposal.decode(data.value, undefined, true);
    case "/cosmwasm.wasm.v1.StoreAndInstantiateContractProposal":
      return StoreAndInstantiateContractProposal.decode(data.value, undefined, true);
    case "/ibc.core.client.v1.ClientUpdateProposal":
      return ClientUpdateProposal.decode(data.value, undefined, true);
    case "/ibc.core.client.v1.UpgradeProposal":
      return UpgradeProposal.decode(data.value, undefined, true);
    case "/osmosis.cosmwasmpool.v1beta1.UploadCosmWasmPoolCodeAndWhiteListProposal":
      return UploadCosmWasmPoolCodeAndWhiteListProposal.decode(data.value, undefined, true);
    case "/osmosis.cosmwasmpool.v1beta1.MigratePoolContractsProposal":
      return MigratePoolContractsProposal.decode(data.value, undefined, true);
    case "/osmosis.gamm.v1beta1.ReplaceMigrationRecordsProposal":
      return ReplaceMigrationRecordsProposal.decode(data.value, undefined, true);
    case "/osmosis.gamm.v1beta1.UpdateMigrationRecordsProposal":
      return UpdateMigrationRecordsProposal.decode(data.value, undefined, true);
    case "/osmosis.gamm.v1beta1.CreateConcentratedLiquidityPoolsAndLinktoCFMMProposal":
      return CreateConcentratedLiquidityPoolsAndLinktoCFMMProposal.decode(data.value, undefined, true);
    case "/osmosis.gamm.v1beta1.SetScalingFactorControllerProposal":
      return SetScalingFactorControllerProposal.decode(data.value, undefined, true);
    case "/osmosis.incentives.CreateGroupsProposal":
      return CreateGroupsProposal.decode(data.value, undefined, true);
    case "/osmosis.poolincentives.v1beta1.ReplacePoolIncentivesProposal":
      return ReplacePoolIncentivesProposal.decode(data.value, undefined, true);
    case "/osmosis.poolincentives.v1beta1.UpdatePoolIncentivesProposal":
      return UpdatePoolIncentivesProposal.decode(data.value, undefined, true);
    case "/osmosis.protorev.v1beta1.SetProtoRevEnabledProposal":
      return SetProtoRevEnabledProposal.decode(data.value, undefined, true);
    case "/osmosis.protorev.v1beta1.SetProtoRevAdminAccountProposal":
      return SetProtoRevAdminAccountProposal.decode(data.value, undefined, true);
    case "/osmosis.superfluid.v1beta1.SetSuperfluidAssetsProposal":
      return SetSuperfluidAssetsProposal.decode(data.value, undefined, true);
    case "/osmosis.superfluid.v1beta1.RemoveSuperfluidAssetsProposal":
      return RemoveSuperfluidAssetsProposal.decode(data.value, undefined, true);
    case "/osmosis.superfluid.v1beta1.UpdateUnpoolWhiteListProposal":
      return UpdateUnpoolWhiteListProposal.decode(data.value, undefined, true);
    case "/osmosis.txfees.v1beta1.UpdateFeeTokenProposal":
      return UpdateFeeTokenProposal.decode(data.value, undefined, true);
    case "/publicawesome.stargaze.cron.v1.PromoteToPrivilegedContractProposal":
      return PromoteToPrivilegedContractProposal.decode(data.value, undefined, true);
    case "/publicawesome.stargaze.cron.v1.DemotePrivilegedContractProposal":
      return DemotePrivilegedContractProposal.decode(data.value, undefined, true);
    case "/publicawesome.stargaze.globalfee.v1.SetCodeAuthorizationProposal":
      return SetCodeAuthorizationProposal.decode(data.value, undefined, true);
    case "/publicawesome.stargaze.globalfee.v1.RemoveCodeAuthorizationProposal":
      return RemoveCodeAuthorizationProposal.decode(data.value, undefined, true);
    case "/publicawesome.stargaze.globalfee.v1.SetContractAuthorizationProposal":
      return SetContractAuthorizationProposal.decode(data.value, undefined, true);
    case "/publicawesome.stargaze.globalfee.v1.RemoveContractAuthorizationProposal":
      return RemoveContractAuthorizationProposal.decode(data.value, undefined, true);
    case "/regen.ecocredit.marketplace.v1.AllowDenomProposal":
      return AllowDenomProposal.decode(data.value, undefined, true);
    case "/regen.ecocredit.v1.CreditTypeProposal":
      return CreditTypeProposal.decode(data.value, undefined, true);
    default:
      return data;
  }
};
export const Cosmos_govv1beta1Content_FromAmino = (content: AnyAmino): Any => {
  switch (content.type) {
    case "/alliance.alliance.MsgCreateAllianceProposal":
      return Any.fromPartial({
        typeUrl: "/alliance.alliance.MsgCreateAllianceProposal",
        value: MsgCreateAllianceProposal.encode(MsgCreateAllianceProposal.fromPartial(MsgCreateAllianceProposal.fromAmino(content.value))).finish()
      });
    case "/alliance.alliance.MsgUpdateAllianceProposal":
      return Any.fromPartial({
        typeUrl: "/alliance.alliance.MsgUpdateAllianceProposal",
        value: MsgUpdateAllianceProposal.encode(MsgUpdateAllianceProposal.fromPartial(MsgUpdateAllianceProposal.fromAmino(content.value))).finish()
      });
    case "/alliance.alliance.MsgDeleteAllianceProposal":
      return Any.fromPartial({
        typeUrl: "/alliance.alliance.MsgDeleteAllianceProposal",
        value: MsgDeleteAllianceProposal.encode(MsgDeleteAllianceProposal.fromPartial(MsgDeleteAllianceProposal.fromAmino(content.value))).finish()
      });
    case "cosmos-sdk/CommunityPoolSpendProposal":
      return Any.fromPartial({
        typeUrl: "/cosmos.distribution.v1beta1.CommunityPoolSpendProposal",
        value: CommunityPoolSpendProposal.encode(CommunityPoolSpendProposal.fromPartial(CommunityPoolSpendProposal.fromAmino(content.value))).finish()
      });
    case "cosmos-sdk/CommunityPoolSpendProposalWithDeposit":
      return Any.fromPartial({
        typeUrl: "/cosmos.distribution.v1beta1.CommunityPoolSpendProposalWithDeposit",
        value: CommunityPoolSpendProposalWithDeposit.encode(CommunityPoolSpendProposalWithDeposit.fromPartial(CommunityPoolSpendProposalWithDeposit.fromAmino(content.value))).finish()
      });
    case "cosmos-sdk/TextProposal":
      return Any.fromPartial({
        typeUrl: "/cosmos.gov.v1beta1.TextProposal",
        value: TextProposal.encode(TextProposal.fromPartial(TextProposal.fromAmino(content.value))).finish()
      });
    case "cosmos-sdk/ParameterChangeProposal":
      return Any.fromPartial({
        typeUrl: "/cosmos.params.v1beta1.ParameterChangeProposal",
        value: ParameterChangeProposal.encode(ParameterChangeProposal.fromPartial(ParameterChangeProposal.fromAmino(content.value))).finish()
      });
    case "cosmos-sdk/SoftwareUpgradeProposal":
      return Any.fromPartial({
        typeUrl: "/cosmos.upgrade.v1beta1.SoftwareUpgradeProposal",
        value: SoftwareUpgradeProposal.encode(SoftwareUpgradeProposal.fromPartial(SoftwareUpgradeProposal.fromAmino(content.value))).finish()
      });
    case "cosmos-sdk/CancelSoftwareUpgradeProposal":
      return Any.fromPartial({
        typeUrl: "/cosmos.upgrade.v1beta1.CancelSoftwareUpgradeProposal",
        value: CancelSoftwareUpgradeProposal.encode(CancelSoftwareUpgradeProposal.fromPartial(CancelSoftwareUpgradeProposal.fromAmino(content.value))).finish()
      });
    case "wasm/StoreCodeProposal":
      return Any.fromPartial({
        typeUrl: "/cosmwasm.wasm.v1.StoreCodeProposal",
        value: StoreCodeProposal.encode(StoreCodeProposal.fromPartial(StoreCodeProposal.fromAmino(content.value))).finish()
      });
    case "wasm/InstantiateContractProposal":
      return Any.fromPartial({
        typeUrl: "/cosmwasm.wasm.v1.InstantiateContractProposal",
        value: InstantiateContractProposal.encode(InstantiateContractProposal.fromPartial(InstantiateContractProposal.fromAmino(content.value))).finish()
      });
    case "wasm/InstantiateContract2Proposal":
      return Any.fromPartial({
        typeUrl: "/cosmwasm.wasm.v1.InstantiateContract2Proposal",
        value: InstantiateContract2Proposal.encode(InstantiateContract2Proposal.fromPartial(InstantiateContract2Proposal.fromAmino(content.value))).finish()
      });
    case "wasm/MigrateContractProposal":
      return Any.fromPartial({
        typeUrl: "/cosmwasm.wasm.v1.MigrateContractProposal",
        value: MigrateContractProposal.encode(MigrateContractProposal.fromPartial(MigrateContractProposal.fromAmino(content.value))).finish()
      });
    case "wasm/SudoContractProposal":
      return Any.fromPartial({
        typeUrl: "/cosmwasm.wasm.v1.SudoContractProposal",
        value: SudoContractProposal.encode(SudoContractProposal.fromPartial(SudoContractProposal.fromAmino(content.value))).finish()
      });
    case "wasm/ExecuteContractProposal":
      return Any.fromPartial({
        typeUrl: "/cosmwasm.wasm.v1.ExecuteContractProposal",
        value: ExecuteContractProposal.encode(ExecuteContractProposal.fromPartial(ExecuteContractProposal.fromAmino(content.value))).finish()
      });
    case "wasm/UpdateAdminProposal":
      return Any.fromPartial({
        typeUrl: "/cosmwasm.wasm.v1.UpdateAdminProposal",
        value: UpdateAdminProposal.encode(UpdateAdminProposal.fromPartial(UpdateAdminProposal.fromAmino(content.value))).finish()
      });
    case "wasm/ClearAdminProposal":
      return Any.fromPartial({
        typeUrl: "/cosmwasm.wasm.v1.ClearAdminProposal",
        value: ClearAdminProposal.encode(ClearAdminProposal.fromPartial(ClearAdminProposal.fromAmino(content.value))).finish()
      });
    case "wasm/PinCodesProposal":
      return Any.fromPartial({
        typeUrl: "/cosmwasm.wasm.v1.PinCodesProposal",
        value: PinCodesProposal.encode(PinCodesProposal.fromPartial(PinCodesProposal.fromAmino(content.value))).finish()
      });
    case "wasm/UnpinCodesProposal":
      return Any.fromPartial({
        typeUrl: "/cosmwasm.wasm.v1.UnpinCodesProposal",
        value: UnpinCodesProposal.encode(UnpinCodesProposal.fromPartial(UnpinCodesProposal.fromAmino(content.value))).finish()
      });
    case "wasm/UpdateInstantiateConfigProposal":
      return Any.fromPartial({
        typeUrl: "/cosmwasm.wasm.v1.UpdateInstantiateConfigProposal",
        value: UpdateInstantiateConfigProposal.encode(UpdateInstantiateConfigProposal.fromPartial(UpdateInstantiateConfigProposal.fromAmino(content.value))).finish()
      });
    case "wasm/StoreAndInstantiateContractProposal":
      return Any.fromPartial({
        typeUrl: "/cosmwasm.wasm.v1.StoreAndInstantiateContractProposal",
        value: StoreAndInstantiateContractProposal.encode(StoreAndInstantiateContractProposal.fromPartial(StoreAndInstantiateContractProposal.fromAmino(content.value))).finish()
      });
    case "cosmos-sdk/ClientUpdateProposal":
      return Any.fromPartial({
        typeUrl: "/ibc.core.client.v1.ClientUpdateProposal",
        value: ClientUpdateProposal.encode(ClientUpdateProposal.fromPartial(ClientUpdateProposal.fromAmino(content.value))).finish()
      });
    case "cosmos-sdk/UpgradeProposal":
      return Any.fromPartial({
        typeUrl: "/ibc.core.client.v1.UpgradeProposal",
        value: UpgradeProposal.encode(UpgradeProposal.fromPartial(UpgradeProposal.fromAmino(content.value))).finish()
      });
    case "osmosis/cosmwasmpool/upload-cosm-wasm-pool-code-and-white-list-proposal":
      return Any.fromPartial({
        typeUrl: "/osmosis.cosmwasmpool.v1beta1.UploadCosmWasmPoolCodeAndWhiteListProposal",
        value: UploadCosmWasmPoolCodeAndWhiteListProposal.encode(UploadCosmWasmPoolCodeAndWhiteListProposal.fromPartial(UploadCosmWasmPoolCodeAndWhiteListProposal.fromAmino(content.value))).finish()
      });
    case "osmosis/cosmwasmpool/migrate-pool-contracts-proposal":
      return Any.fromPartial({
        typeUrl: "/osmosis.cosmwasmpool.v1beta1.MigratePoolContractsProposal",
        value: MigratePoolContractsProposal.encode(MigratePoolContractsProposal.fromPartial(MigratePoolContractsProposal.fromAmino(content.value))).finish()
      });
    case "osmosis/ReplaceMigrationRecordsProposal":
      return Any.fromPartial({
        typeUrl: "/osmosis.gamm.v1beta1.ReplaceMigrationRecordsProposal",
        value: ReplaceMigrationRecordsProposal.encode(ReplaceMigrationRecordsProposal.fromPartial(ReplaceMigrationRecordsProposal.fromAmino(content.value))).finish()
      });
    case "osmosis/UpdateMigrationRecordsProposal":
      return Any.fromPartial({
        typeUrl: "/osmosis.gamm.v1beta1.UpdateMigrationRecordsProposal",
        value: UpdateMigrationRecordsProposal.encode(UpdateMigrationRecordsProposal.fromPartial(UpdateMigrationRecordsProposal.fromAmino(content.value))).finish()
      });
    case "osmosis/CreateConcentratedLiquidityPoolsAndLinktoCFMMProposal":
      return Any.fromPartial({
        typeUrl: "/osmosis.gamm.v1beta1.CreateConcentratedLiquidityPoolsAndLinktoCFMMProposal",
        value: CreateConcentratedLiquidityPoolsAndLinktoCFMMProposal.encode(CreateConcentratedLiquidityPoolsAndLinktoCFMMProposal.fromPartial(CreateConcentratedLiquidityPoolsAndLinktoCFMMProposal.fromAmino(content.value))).finish()
      });
    case "osmosis/SetScalingFactorControllerProposal":
      return Any.fromPartial({
        typeUrl: "/osmosis.gamm.v1beta1.SetScalingFactorControllerProposal",
        value: SetScalingFactorControllerProposal.encode(SetScalingFactorControllerProposal.fromPartial(SetScalingFactorControllerProposal.fromAmino(content.value))).finish()
      });
    case "osmosis/incentives/create-groups-proposal":
      return Any.fromPartial({
        typeUrl: "/osmosis.incentives.CreateGroupsProposal",
        value: CreateGroupsProposal.encode(CreateGroupsProposal.fromPartial(CreateGroupsProposal.fromAmino(content.value))).finish()
      });
    case "osmosis/ReplacePoolIncentivesProposal":
      return Any.fromPartial({
        typeUrl: "/osmosis.poolincentives.v1beta1.ReplacePoolIncentivesProposal",
        value: ReplacePoolIncentivesProposal.encode(ReplacePoolIncentivesProposal.fromPartial(ReplacePoolIncentivesProposal.fromAmino(content.value))).finish()
      });
    case "osmosis/UpdatePoolIncentivesProposal":
      return Any.fromPartial({
        typeUrl: "/osmosis.poolincentives.v1beta1.UpdatePoolIncentivesProposal",
        value: UpdatePoolIncentivesProposal.encode(UpdatePoolIncentivesProposal.fromPartial(UpdatePoolIncentivesProposal.fromAmino(content.value))).finish()
      });
    case "osmosis/SetProtoRevEnabledProposal":
      return Any.fromPartial({
        typeUrl: "/osmosis.protorev.v1beta1.SetProtoRevEnabledProposal",
        value: SetProtoRevEnabledProposal.encode(SetProtoRevEnabledProposal.fromPartial(SetProtoRevEnabledProposal.fromAmino(content.value))).finish()
      });
    case "osmosis/SetProtoRevAdminAccountProposal":
      return Any.fromPartial({
        typeUrl: "/osmosis.protorev.v1beta1.SetProtoRevAdminAccountProposal",
        value: SetProtoRevAdminAccountProposal.encode(SetProtoRevAdminAccountProposal.fromPartial(SetProtoRevAdminAccountProposal.fromAmino(content.value))).finish()
      });
    case "osmosis/set-superfluid-assets-proposal":
      return Any.fromPartial({
        typeUrl: "/osmosis.superfluid.v1beta1.SetSuperfluidAssetsProposal",
        value: SetSuperfluidAssetsProposal.encode(SetSuperfluidAssetsProposal.fromPartial(SetSuperfluidAssetsProposal.fromAmino(content.value))).finish()
      });
    case "osmosis/del-superfluid-assets-proposal":
      return Any.fromPartial({
        typeUrl: "/osmosis.superfluid.v1beta1.RemoveSuperfluidAssetsProposal",
        value: RemoveSuperfluidAssetsProposal.encode(RemoveSuperfluidAssetsProposal.fromPartial(RemoveSuperfluidAssetsProposal.fromAmino(content.value))).finish()
      });
    case "osmosis/update-unpool-whitelist":
      return Any.fromPartial({
        typeUrl: "/osmosis.superfluid.v1beta1.UpdateUnpoolWhiteListProposal",
        value: UpdateUnpoolWhiteListProposal.encode(UpdateUnpoolWhiteListProposal.fromPartial(UpdateUnpoolWhiteListProposal.fromAmino(content.value))).finish()
      });
    case "osmosis/UpdateFeeTokenProposal":
      return Any.fromPartial({
        typeUrl: "/osmosis.txfees.v1beta1.UpdateFeeTokenProposal",
        value: UpdateFeeTokenProposal.encode(UpdateFeeTokenProposal.fromPartial(UpdateFeeTokenProposal.fromAmino(content.value))).finish()
      });
    case "/publicawesome.stargaze.cron.v1.PromoteToPrivilegedContractProposal":
      return Any.fromPartial({
        typeUrl: "/publicawesome.stargaze.cron.v1.PromoteToPrivilegedContractProposal",
        value: PromoteToPrivilegedContractProposal.encode(PromoteToPrivilegedContractProposal.fromPartial(PromoteToPrivilegedContractProposal.fromAmino(content.value))).finish()
      });
    case "/publicawesome.stargaze.cron.v1.DemotePrivilegedContractProposal":
      return Any.fromPartial({
        typeUrl: "/publicawesome.stargaze.cron.v1.DemotePrivilegedContractProposal",
        value: DemotePrivilegedContractProposal.encode(DemotePrivilegedContractProposal.fromPartial(DemotePrivilegedContractProposal.fromAmino(content.value))).finish()
      });
    case "/publicawesome.stargaze.globalfee.v1.SetCodeAuthorizationProposal":
      return Any.fromPartial({
        typeUrl: "/publicawesome.stargaze.globalfee.v1.SetCodeAuthorizationProposal",
        value: SetCodeAuthorizationProposal.encode(SetCodeAuthorizationProposal.fromPartial(SetCodeAuthorizationProposal.fromAmino(content.value))).finish()
      });
    case "/publicawesome.stargaze.globalfee.v1.RemoveCodeAuthorizationProposal":
      return Any.fromPartial({
        typeUrl: "/publicawesome.stargaze.globalfee.v1.RemoveCodeAuthorizationProposal",
        value: RemoveCodeAuthorizationProposal.encode(RemoveCodeAuthorizationProposal.fromPartial(RemoveCodeAuthorizationProposal.fromAmino(content.value))).finish()
      });
    case "/publicawesome.stargaze.globalfee.v1.SetContractAuthorizationProposal":
      return Any.fromPartial({
        typeUrl: "/publicawesome.stargaze.globalfee.v1.SetContractAuthorizationProposal",
        value: SetContractAuthorizationProposal.encode(SetContractAuthorizationProposal.fromPartial(SetContractAuthorizationProposal.fromAmino(content.value))).finish()
      });
    case "/publicawesome.stargaze.globalfee.v1.RemoveContractAuthorizationProposal":
      return Any.fromPartial({
        typeUrl: "/publicawesome.stargaze.globalfee.v1.RemoveContractAuthorizationProposal",
        value: RemoveContractAuthorizationProposal.encode(RemoveContractAuthorizationProposal.fromPartial(RemoveContractAuthorizationProposal.fromAmino(content.value))).finish()
      });
    case "/regen.ecocredit.marketplace.v1.AllowDenomProposal":
      return Any.fromPartial({
        typeUrl: "/regen.ecocredit.marketplace.v1.AllowDenomProposal",
        value: AllowDenomProposal.encode(AllowDenomProposal.fromPartial(AllowDenomProposal.fromAmino(content.value))).finish()
      });
    case "/regen.ecocredit.v1.CreditTypeProposal":
      return Any.fromPartial({
        typeUrl: "/regen.ecocredit.v1.CreditTypeProposal",
        value: CreditTypeProposal.encode(CreditTypeProposal.fromPartial(CreditTypeProposal.fromAmino(content.value))).finish()
      });
    default:
      return Any.fromAmino(content);
  }
};
export const Cosmos_govv1beta1Content_ToAmino = (content: Any, useInterfaces: boolean = false) => {
  switch (content.typeUrl) {
    case "/alliance.alliance.MsgCreateAllianceProposal":
      return {
        type: "/alliance.alliance.MsgCreateAllianceProposal",
        value: MsgCreateAllianceProposal.toAmino(MsgCreateAllianceProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/alliance.alliance.MsgUpdateAllianceProposal":
      return {
        type: "/alliance.alliance.MsgUpdateAllianceProposal",
        value: MsgUpdateAllianceProposal.toAmino(MsgUpdateAllianceProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/alliance.alliance.MsgDeleteAllianceProposal":
      return {
        type: "/alliance.alliance.MsgDeleteAllianceProposal",
        value: MsgDeleteAllianceProposal.toAmino(MsgDeleteAllianceProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/cosmos.distribution.v1beta1.CommunityPoolSpendProposal":
      return {
        type: "cosmos-sdk/CommunityPoolSpendProposal",
        value: CommunityPoolSpendProposal.toAmino(CommunityPoolSpendProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/cosmos.distribution.v1beta1.CommunityPoolSpendProposalWithDeposit":
      return {
        type: "cosmos-sdk/CommunityPoolSpendProposalWithDeposit",
        value: CommunityPoolSpendProposalWithDeposit.toAmino(CommunityPoolSpendProposalWithDeposit.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/cosmos.gov.v1beta1.TextProposal":
      return {
        type: "cosmos-sdk/TextProposal",
        value: TextProposal.toAmino(TextProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/cosmos.params.v1beta1.ParameterChangeProposal":
      return {
        type: "cosmos-sdk/ParameterChangeProposal",
        value: ParameterChangeProposal.toAmino(ParameterChangeProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/cosmos.upgrade.v1beta1.SoftwareUpgradeProposal":
      return {
        type: "cosmos-sdk/SoftwareUpgradeProposal",
        value: SoftwareUpgradeProposal.toAmino(SoftwareUpgradeProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/cosmos.upgrade.v1beta1.CancelSoftwareUpgradeProposal":
      return {
        type: "cosmos-sdk/CancelSoftwareUpgradeProposal",
        value: CancelSoftwareUpgradeProposal.toAmino(CancelSoftwareUpgradeProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/cosmwasm.wasm.v1.StoreCodeProposal":
      return {
        type: "wasm/StoreCodeProposal",
        value: StoreCodeProposal.toAmino(StoreCodeProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/cosmwasm.wasm.v1.InstantiateContractProposal":
      return {
        type: "wasm/InstantiateContractProposal",
        value: InstantiateContractProposal.toAmino(InstantiateContractProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/cosmwasm.wasm.v1.InstantiateContract2Proposal":
      return {
        type: "wasm/InstantiateContract2Proposal",
        value: InstantiateContract2Proposal.toAmino(InstantiateContract2Proposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/cosmwasm.wasm.v1.MigrateContractProposal":
      return {
        type: "wasm/MigrateContractProposal",
        value: MigrateContractProposal.toAmino(MigrateContractProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/cosmwasm.wasm.v1.SudoContractProposal":
      return {
        type: "wasm/SudoContractProposal",
        value: SudoContractProposal.toAmino(SudoContractProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/cosmwasm.wasm.v1.ExecuteContractProposal":
      return {
        type: "wasm/ExecuteContractProposal",
        value: ExecuteContractProposal.toAmino(ExecuteContractProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/cosmwasm.wasm.v1.UpdateAdminProposal":
      return {
        type: "wasm/UpdateAdminProposal",
        value: UpdateAdminProposal.toAmino(UpdateAdminProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/cosmwasm.wasm.v1.ClearAdminProposal":
      return {
        type: "wasm/ClearAdminProposal",
        value: ClearAdminProposal.toAmino(ClearAdminProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/cosmwasm.wasm.v1.PinCodesProposal":
      return {
        type: "wasm/PinCodesProposal",
        value: PinCodesProposal.toAmino(PinCodesProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/cosmwasm.wasm.v1.UnpinCodesProposal":
      return {
        type: "wasm/UnpinCodesProposal",
        value: UnpinCodesProposal.toAmino(UnpinCodesProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/cosmwasm.wasm.v1.UpdateInstantiateConfigProposal":
      return {
        type: "wasm/UpdateInstantiateConfigProposal",
        value: UpdateInstantiateConfigProposal.toAmino(UpdateInstantiateConfigProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/cosmwasm.wasm.v1.StoreAndInstantiateContractProposal":
      return {
        type: "wasm/StoreAndInstantiateContractProposal",
        value: StoreAndInstantiateContractProposal.toAmino(StoreAndInstantiateContractProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/ibc.core.client.v1.ClientUpdateProposal":
      return {
        type: "cosmos-sdk/ClientUpdateProposal",
        value: ClientUpdateProposal.toAmino(ClientUpdateProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/ibc.core.client.v1.UpgradeProposal":
      return {
        type: "cosmos-sdk/UpgradeProposal",
        value: UpgradeProposal.toAmino(UpgradeProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/osmosis.cosmwasmpool.v1beta1.UploadCosmWasmPoolCodeAndWhiteListProposal":
      return {
        type: "osmosis/cosmwasmpool/upload-cosm-wasm-pool-code-and-white-list-proposal",
        value: UploadCosmWasmPoolCodeAndWhiteListProposal.toAmino(UploadCosmWasmPoolCodeAndWhiteListProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/osmosis.cosmwasmpool.v1beta1.MigratePoolContractsProposal":
      return {
        type: "osmosis/cosmwasmpool/migrate-pool-contracts-proposal",
        value: MigratePoolContractsProposal.toAmino(MigratePoolContractsProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/osmosis.gamm.v1beta1.ReplaceMigrationRecordsProposal":
      return {
        type: "osmosis/ReplaceMigrationRecordsProposal",
        value: ReplaceMigrationRecordsProposal.toAmino(ReplaceMigrationRecordsProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/osmosis.gamm.v1beta1.UpdateMigrationRecordsProposal":
      return {
        type: "osmosis/UpdateMigrationRecordsProposal",
        value: UpdateMigrationRecordsProposal.toAmino(UpdateMigrationRecordsProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/osmosis.gamm.v1beta1.CreateConcentratedLiquidityPoolsAndLinktoCFMMProposal":
      return {
        type: "osmosis/CreateConcentratedLiquidityPoolsAndLinktoCFMMProposal",
        value: CreateConcentratedLiquidityPoolsAndLinktoCFMMProposal.toAmino(CreateConcentratedLiquidityPoolsAndLinktoCFMMProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/osmosis.gamm.v1beta1.SetScalingFactorControllerProposal":
      return {
        type: "osmosis/SetScalingFactorControllerProposal",
        value: SetScalingFactorControllerProposal.toAmino(SetScalingFactorControllerProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/osmosis.incentives.CreateGroupsProposal":
      return {
        type: "osmosis/incentives/create-groups-proposal",
        value: CreateGroupsProposal.toAmino(CreateGroupsProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/osmosis.poolincentives.v1beta1.ReplacePoolIncentivesProposal":
      return {
        type: "osmosis/ReplacePoolIncentivesProposal",
        value: ReplacePoolIncentivesProposal.toAmino(ReplacePoolIncentivesProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/osmosis.poolincentives.v1beta1.UpdatePoolIncentivesProposal":
      return {
        type: "osmosis/UpdatePoolIncentivesProposal",
        value: UpdatePoolIncentivesProposal.toAmino(UpdatePoolIncentivesProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/osmosis.protorev.v1beta1.SetProtoRevEnabledProposal":
      return {
        type: "osmosis/SetProtoRevEnabledProposal",
        value: SetProtoRevEnabledProposal.toAmino(SetProtoRevEnabledProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/osmosis.protorev.v1beta1.SetProtoRevAdminAccountProposal":
      return {
        type: "osmosis/SetProtoRevAdminAccountProposal",
        value: SetProtoRevAdminAccountProposal.toAmino(SetProtoRevAdminAccountProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/osmosis.superfluid.v1beta1.SetSuperfluidAssetsProposal":
      return {
        type: "osmosis/set-superfluid-assets-proposal",
        value: SetSuperfluidAssetsProposal.toAmino(SetSuperfluidAssetsProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/osmosis.superfluid.v1beta1.RemoveSuperfluidAssetsProposal":
      return {
        type: "osmosis/del-superfluid-assets-proposal",
        value: RemoveSuperfluidAssetsProposal.toAmino(RemoveSuperfluidAssetsProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/osmosis.superfluid.v1beta1.UpdateUnpoolWhiteListProposal":
      return {
        type: "osmosis/update-unpool-whitelist",
        value: UpdateUnpoolWhiteListProposal.toAmino(UpdateUnpoolWhiteListProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/osmosis.txfees.v1beta1.UpdateFeeTokenProposal":
      return {
        type: "osmosis/UpdateFeeTokenProposal",
        value: UpdateFeeTokenProposal.toAmino(UpdateFeeTokenProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/publicawesome.stargaze.cron.v1.PromoteToPrivilegedContractProposal":
      return {
        type: "/publicawesome.stargaze.cron.v1.PromoteToPrivilegedContractProposal",
        value: PromoteToPrivilegedContractProposal.toAmino(PromoteToPrivilegedContractProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/publicawesome.stargaze.cron.v1.DemotePrivilegedContractProposal":
      return {
        type: "/publicawesome.stargaze.cron.v1.DemotePrivilegedContractProposal",
        value: DemotePrivilegedContractProposal.toAmino(DemotePrivilegedContractProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/publicawesome.stargaze.globalfee.v1.SetCodeAuthorizationProposal":
      return {
        type: "/publicawesome.stargaze.globalfee.v1.SetCodeAuthorizationProposal",
        value: SetCodeAuthorizationProposal.toAmino(SetCodeAuthorizationProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/publicawesome.stargaze.globalfee.v1.RemoveCodeAuthorizationProposal":
      return {
        type: "/publicawesome.stargaze.globalfee.v1.RemoveCodeAuthorizationProposal",
        value: RemoveCodeAuthorizationProposal.toAmino(RemoveCodeAuthorizationProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/publicawesome.stargaze.globalfee.v1.SetContractAuthorizationProposal":
      return {
        type: "/publicawesome.stargaze.globalfee.v1.SetContractAuthorizationProposal",
        value: SetContractAuthorizationProposal.toAmino(SetContractAuthorizationProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/publicawesome.stargaze.globalfee.v1.RemoveContractAuthorizationProposal":
      return {
        type: "/publicawesome.stargaze.globalfee.v1.RemoveContractAuthorizationProposal",
        value: RemoveContractAuthorizationProposal.toAmino(RemoveContractAuthorizationProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/regen.ecocredit.marketplace.v1.AllowDenomProposal":
      return {
        type: "/regen.ecocredit.marketplace.v1.AllowDenomProposal",
        value: AllowDenomProposal.toAmino(AllowDenomProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    case "/regen.ecocredit.v1.CreditTypeProposal":
      return {
        type: "/regen.ecocredit.v1.CreditTypeProposal",
        value: CreditTypeProposal.toAmino(CreditTypeProposal.decode(content.value, undefined, useInterfaces), useInterfaces)
      };
    default:
      return Any.toAmino(content, useInterfaces);
  }
};