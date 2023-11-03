//@ts-nocheck
import { AccessConfig, AccessConfigAmino, AccessConfigSDKType, Params, ParamsAmino, ParamsSDKType } from "./types";
import { Coin, CoinAmino, CoinSDKType } from "../../../cosmos/base/v1beta1/coin";
import { BinaryReader, BinaryWriter } from "../../../binary";
import { fromBase64, toBase64, toUtf8, fromUtf8 } from "@cosmjs/encoding";
/** MsgStoreCode submit Wasm code to the system */
export interface MsgStoreCode {
  /** Sender is the actor that signed the messages */
  sender: string;
  /** WASMByteCode can be raw or gzip compressed */
  wasmByteCode: Uint8Array;
  /**
   * InstantiatePermission access control to apply on contract creation,
   * optional
   */
  instantiatePermission?: AccessConfig | undefined;
}
export interface MsgStoreCodeProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgStoreCode";
  value: Uint8Array;
}
/** MsgStoreCode submit Wasm code to the system */
export interface MsgStoreCodeAmino {
  /** Sender is the actor that signed the messages */
  sender: string;
  /** WASMByteCode can be raw or gzip compressed */
  wasm_byte_code: string;
  /**
   * InstantiatePermission access control to apply on contract creation,
   * optional
   */
  instantiate_permission?: AccessConfigAmino | undefined;
}
export interface MsgStoreCodeAminoMsg {
  type: "wasm/MsgStoreCode";
  value: MsgStoreCodeAmino;
}
/** MsgStoreCode submit Wasm code to the system */
export interface MsgStoreCodeSDKType {
  sender: string;
  wasm_byte_code: Uint8Array;
  instantiate_permission?: AccessConfigSDKType | undefined;
}
/** MsgStoreCodeResponse returns store result data. */
export interface MsgStoreCodeResponse {
  /** CodeID is the reference to the stored WASM code */
  codeId: bigint;
  /** Checksum is the sha256 hash of the stored code */
  checksum: Uint8Array;
}
export interface MsgStoreCodeResponseProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgStoreCodeResponse";
  value: Uint8Array;
}
/** MsgStoreCodeResponse returns store result data. */
export interface MsgStoreCodeResponseAmino {
  /** CodeID is the reference to the stored WASM code */
  code_id: string;
  /** Checksum is the sha256 hash of the stored code */
  checksum: Uint8Array;
}
export interface MsgStoreCodeResponseAminoMsg {
  type: "wasm/MsgStoreCodeResponse";
  value: MsgStoreCodeResponseAmino;
}
/** MsgStoreCodeResponse returns store result data. */
export interface MsgStoreCodeResponseSDKType {
  code_id: bigint;
  checksum: Uint8Array;
}
/**
 * MsgInstantiateContract create a new smart contract instance for the given
 * code id.
 */
export interface MsgInstantiateContract {
  /** Sender is the that actor that signed the messages */
  sender: string;
  /** Admin is an optional address that can execute migrations */
  admin: string;
  /** CodeID is the reference to the stored WASM code */
  codeId: bigint;
  /** Label is optional metadata to be stored with a contract instance. */
  label: string;
  /** Msg json encoded message to be passed to the contract on instantiation */
  msg: Uint8Array;
  /** Funds coins that are transferred to the contract on instantiation */
  funds: Coin[];
}
export interface MsgInstantiateContractProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgInstantiateContract";
  value: Uint8Array;
}
/**
 * MsgInstantiateContract create a new smart contract instance for the given
 * code id.
 */
export interface MsgInstantiateContractAmino {
  /** Sender is the that actor that signed the messages */
  sender: string;
  /** Admin is an optional address that can execute migrations */
  admin: string;
  /** CodeID is the reference to the stored WASM code */
  code_id: string;
  /** Label is optional metadata to be stored with a contract instance. */
  label: string;
  /** Msg json encoded message to be passed to the contract on instantiation */
  msg: Uint8Array;
  /** Funds coins that are transferred to the contract on instantiation */
  funds: CoinAmino[];
}
export interface MsgInstantiateContractAminoMsg {
  type: "wasm/MsgInstantiateContract";
  value: MsgInstantiateContractAmino;
}
/**
 * MsgInstantiateContract create a new smart contract instance for the given
 * code id.
 */
export interface MsgInstantiateContractSDKType {
  sender: string;
  admin: string;
  code_id: bigint;
  label: string;
  msg: Uint8Array;
  funds: CoinSDKType[];
}
/** MsgInstantiateContractResponse return instantiation result data */
export interface MsgInstantiateContractResponse {
  /** Address is the bech32 address of the new contract instance. */
  address: string;
  /** Data contains bytes to returned from the contract */
  data: Uint8Array;
}
export interface MsgInstantiateContractResponseProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgInstantiateContractResponse";
  value: Uint8Array;
}
/** MsgInstantiateContractResponse return instantiation result data */
export interface MsgInstantiateContractResponseAmino {
  /** Address is the bech32 address of the new contract instance. */
  address: string;
  /** Data contains bytes to returned from the contract */
  data: Uint8Array;
}
export interface MsgInstantiateContractResponseAminoMsg {
  type: "wasm/MsgInstantiateContractResponse";
  value: MsgInstantiateContractResponseAmino;
}
/** MsgInstantiateContractResponse return instantiation result data */
export interface MsgInstantiateContractResponseSDKType {
  address: string;
  data: Uint8Array;
}
/**
 * MsgInstantiateContract2 create a new smart contract instance for the given
 * code id with a predicable address.
 */
export interface MsgInstantiateContract2 {
  /** Sender is the that actor that signed the messages */
  sender: string;
  /** Admin is an optional address that can execute migrations */
  admin: string;
  /** CodeID is the reference to the stored WASM code */
  codeId: bigint;
  /** Label is optional metadata to be stored with a contract instance. */
  label: string;
  /** Msg json encoded message to be passed to the contract on instantiation */
  msg: Uint8Array;
  /** Funds coins that are transferred to the contract on instantiation */
  funds: Coin[];
  /** Salt is an arbitrary value provided by the sender. Size can be 1 to 64. */
  salt: Uint8Array;
  /**
   * FixMsg include the msg value into the hash for the predictable address.
   * Default is false
   */
  fixMsg: boolean;
}
export interface MsgInstantiateContract2ProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgInstantiateContract2";
  value: Uint8Array;
}
/**
 * MsgInstantiateContract2 create a new smart contract instance for the given
 * code id with a predicable address.
 */
export interface MsgInstantiateContract2Amino {
  /** Sender is the that actor that signed the messages */
  sender: string;
  /** Admin is an optional address that can execute migrations */
  admin: string;
  /** CodeID is the reference to the stored WASM code */
  code_id: string;
  /** Label is optional metadata to be stored with a contract instance. */
  label: string;
  /** Msg json encoded message to be passed to the contract on instantiation */
  msg: Uint8Array;
  /** Funds coins that are transferred to the contract on instantiation */
  funds: CoinAmino[];
  /** Salt is an arbitrary value provided by the sender. Size can be 1 to 64. */
  salt: Uint8Array;
  /**
   * FixMsg include the msg value into the hash for the predictable address.
   * Default is false
   */
  fix_msg: boolean;
}
export interface MsgInstantiateContract2AminoMsg {
  type: "wasm/MsgInstantiateContract2";
  value: MsgInstantiateContract2Amino;
}
/**
 * MsgInstantiateContract2 create a new smart contract instance for the given
 * code id with a predicable address.
 */
export interface MsgInstantiateContract2SDKType {
  sender: string;
  admin: string;
  code_id: bigint;
  label: string;
  msg: Uint8Array;
  funds: CoinSDKType[];
  salt: Uint8Array;
  fix_msg: boolean;
}
/** MsgInstantiateContract2Response return instantiation result data */
export interface MsgInstantiateContract2Response {
  /** Address is the bech32 address of the new contract instance. */
  address: string;
  /** Data contains bytes to returned from the contract */
  data: Uint8Array;
}
export interface MsgInstantiateContract2ResponseProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgInstantiateContract2Response";
  value: Uint8Array;
}
/** MsgInstantiateContract2Response return instantiation result data */
export interface MsgInstantiateContract2ResponseAmino {
  /** Address is the bech32 address of the new contract instance. */
  address: string;
  /** Data contains bytes to returned from the contract */
  data: Uint8Array;
}
export interface MsgInstantiateContract2ResponseAminoMsg {
  type: "wasm/MsgInstantiateContract2Response";
  value: MsgInstantiateContract2ResponseAmino;
}
/** MsgInstantiateContract2Response return instantiation result data */
export interface MsgInstantiateContract2ResponseSDKType {
  address: string;
  data: Uint8Array;
}
/** MsgExecuteContract submits the given message data to a smart contract */
export interface MsgExecuteContract {
  /** Sender is the that actor that signed the messages */
  sender: string;
  /** Contract is the address of the smart contract */
  contract: string;
  /** Msg json encoded message to be passed to the contract */
  msg: Uint8Array;
  /** Funds coins that are transferred to the contract on execution */
  funds: Coin[];
}
export interface MsgExecuteContractProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract";
  value: Uint8Array;
}
/** MsgExecuteContract submits the given message data to a smart contract */
export interface MsgExecuteContractAmino {
  /** Sender is the that actor that signed the messages */
  sender: string;
  /** Contract is the address of the smart contract */
  contract: string;
  /** Msg json encoded message to be passed to the contract */
  msg: Uint8Array;
  /** Funds coins that are transferred to the contract on execution */
  funds: CoinAmino[];
}
export interface MsgExecuteContractAminoMsg {
  type: "wasm/MsgExecuteContract";
  value: MsgExecuteContractAmino;
}
/** MsgExecuteContract submits the given message data to a smart contract */
export interface MsgExecuteContractSDKType {
  sender: string;
  contract: string;
  msg: Uint8Array;
  funds: CoinSDKType[];
}
/** MsgExecuteContractResponse returns execution result data. */
export interface MsgExecuteContractResponse {
  /** Data contains bytes to returned from the contract */
  data: Uint8Array;
}
export interface MsgExecuteContractResponseProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContractResponse";
  value: Uint8Array;
}
/** MsgExecuteContractResponse returns execution result data. */
export interface MsgExecuteContractResponseAmino {
  /** Data contains bytes to returned from the contract */
  data: Uint8Array;
}
export interface MsgExecuteContractResponseAminoMsg {
  type: "wasm/MsgExecuteContractResponse";
  value: MsgExecuteContractResponseAmino;
}
/** MsgExecuteContractResponse returns execution result data. */
export interface MsgExecuteContractResponseSDKType {
  data: Uint8Array;
}
/** MsgMigrateContract runs a code upgrade/ downgrade for a smart contract */
export interface MsgMigrateContract {
  /** Sender is the that actor that signed the messages */
  sender: string;
  /** Contract is the address of the smart contract */
  contract: string;
  /** CodeID references the new WASM code */
  codeId: bigint;
  /** Msg json encoded message to be passed to the contract on migration */
  msg: Uint8Array;
}
export interface MsgMigrateContractProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgMigrateContract";
  value: Uint8Array;
}
/** MsgMigrateContract runs a code upgrade/ downgrade for a smart contract */
export interface MsgMigrateContractAmino {
  /** Sender is the that actor that signed the messages */
  sender: string;
  /** Contract is the address of the smart contract */
  contract: string;
  /** CodeID references the new WASM code */
  code_id: string;
  /** Msg json encoded message to be passed to the contract on migration */
  msg: Uint8Array;
}
export interface MsgMigrateContractAminoMsg {
  type: "wasm/MsgMigrateContract";
  value: MsgMigrateContractAmino;
}
/** MsgMigrateContract runs a code upgrade/ downgrade for a smart contract */
export interface MsgMigrateContractSDKType {
  sender: string;
  contract: string;
  code_id: bigint;
  msg: Uint8Array;
}
/** MsgMigrateContractResponse returns contract migration result data. */
export interface MsgMigrateContractResponse {
  /**
   * Data contains same raw bytes returned as data from the wasm contract.
   * (May be empty)
   */
  data: Uint8Array;
}
export interface MsgMigrateContractResponseProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgMigrateContractResponse";
  value: Uint8Array;
}
/** MsgMigrateContractResponse returns contract migration result data. */
export interface MsgMigrateContractResponseAmino {
  /**
   * Data contains same raw bytes returned as data from the wasm contract.
   * (May be empty)
   */
  data: Uint8Array;
}
export interface MsgMigrateContractResponseAminoMsg {
  type: "wasm/MsgMigrateContractResponse";
  value: MsgMigrateContractResponseAmino;
}
/** MsgMigrateContractResponse returns contract migration result data. */
export interface MsgMigrateContractResponseSDKType {
  data: Uint8Array;
}
/** MsgUpdateAdmin sets a new admin for a smart contract */
export interface MsgUpdateAdmin {
  /** Sender is the that actor that signed the messages */
  sender: string;
  /** NewAdmin address to be set */
  newAdmin: string;
  /** Contract is the address of the smart contract */
  contract: string;
}
export interface MsgUpdateAdminProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgUpdateAdmin";
  value: Uint8Array;
}
/** MsgUpdateAdmin sets a new admin for a smart contract */
export interface MsgUpdateAdminAmino {
  /** Sender is the that actor that signed the messages */
  sender: string;
  /** NewAdmin address to be set */
  new_admin: string;
  /** Contract is the address of the smart contract */
  contract: string;
}
export interface MsgUpdateAdminAminoMsg {
  type: "wasm/MsgUpdateAdmin";
  value: MsgUpdateAdminAmino;
}
/** MsgUpdateAdmin sets a new admin for a smart contract */
export interface MsgUpdateAdminSDKType {
  sender: string;
  new_admin: string;
  contract: string;
}
/** MsgUpdateAdminResponse returns empty data */
export interface MsgUpdateAdminResponse {}
export interface MsgUpdateAdminResponseProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgUpdateAdminResponse";
  value: Uint8Array;
}
/** MsgUpdateAdminResponse returns empty data */
export interface MsgUpdateAdminResponseAmino {}
export interface MsgUpdateAdminResponseAminoMsg {
  type: "wasm/MsgUpdateAdminResponse";
  value: MsgUpdateAdminResponseAmino;
}
/** MsgUpdateAdminResponse returns empty data */
export interface MsgUpdateAdminResponseSDKType {}
/** MsgClearAdmin removes any admin stored for a smart contract */
export interface MsgClearAdmin {
  /** Sender is the actor that signed the messages */
  sender: string;
  /** Contract is the address of the smart contract */
  contract: string;
}
export interface MsgClearAdminProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgClearAdmin";
  value: Uint8Array;
}
/** MsgClearAdmin removes any admin stored for a smart contract */
export interface MsgClearAdminAmino {
  /** Sender is the actor that signed the messages */
  sender: string;
  /** Contract is the address of the smart contract */
  contract: string;
}
export interface MsgClearAdminAminoMsg {
  type: "wasm/MsgClearAdmin";
  value: MsgClearAdminAmino;
}
/** MsgClearAdmin removes any admin stored for a smart contract */
export interface MsgClearAdminSDKType {
  sender: string;
  contract: string;
}
/** MsgClearAdminResponse returns empty data */
export interface MsgClearAdminResponse {}
export interface MsgClearAdminResponseProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgClearAdminResponse";
  value: Uint8Array;
}
/** MsgClearAdminResponse returns empty data */
export interface MsgClearAdminResponseAmino {}
export interface MsgClearAdminResponseAminoMsg {
  type: "wasm/MsgClearAdminResponse";
  value: MsgClearAdminResponseAmino;
}
/** MsgClearAdminResponse returns empty data */
export interface MsgClearAdminResponseSDKType {}
/**
 * AccessConfigUpdate contains the code id and the access config to be
 * applied.
 */
export interface AccessConfigUpdate {
  /** CodeID is the reference to the stored WASM code to be updated */
  codeId: bigint;
  /** InstantiatePermission to apply to the set of code ids */
  instantiatePermission: AccessConfig | undefined;
}
export interface AccessConfigUpdateProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.AccessConfigUpdate";
  value: Uint8Array;
}
/**
 * AccessConfigUpdate contains the code id and the access config to be
 * applied.
 */
export interface AccessConfigUpdateAmino {
  /** CodeID is the reference to the stored WASM code to be updated */
  code_id: string;
  /** InstantiatePermission to apply to the set of code ids */
  instantiate_permission?: AccessConfigAmino | undefined;
}
export interface AccessConfigUpdateAminoMsg {
  type: "wasm/AccessConfigUpdate";
  value: AccessConfigUpdateAmino;
}
/**
 * AccessConfigUpdate contains the code id and the access config to be
 * applied.
 */
export interface AccessConfigUpdateSDKType {
  code_id: bigint;
  instantiate_permission: AccessConfigSDKType | undefined;
}
/** MsgUpdateInstantiateConfig updates instantiate config for a smart contract */
export interface MsgUpdateInstantiateConfig {
  /** Sender is the that actor that signed the messages */
  sender: string;
  /** CodeID references the stored WASM code */
  codeId: bigint;
  /** NewInstantiatePermission is the new access control */
  newInstantiatePermission?: AccessConfig | undefined;
}
export interface MsgUpdateInstantiateConfigProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgUpdateInstantiateConfig";
  value: Uint8Array;
}
/** MsgUpdateInstantiateConfig updates instantiate config for a smart contract */
export interface MsgUpdateInstantiateConfigAmino {
  /** Sender is the that actor that signed the messages */
  sender: string;
  /** CodeID references the stored WASM code */
  code_id: string;
  /** NewInstantiatePermission is the new access control */
  new_instantiate_permission?: AccessConfigAmino | undefined;
}
export interface MsgUpdateInstantiateConfigAminoMsg {
  type: "wasm/MsgUpdateInstantiateConfig";
  value: MsgUpdateInstantiateConfigAmino;
}
/** MsgUpdateInstantiateConfig updates instantiate config for a smart contract */
export interface MsgUpdateInstantiateConfigSDKType {
  sender: string;
  code_id: bigint;
  new_instantiate_permission?: AccessConfigSDKType | undefined;
}
/** MsgUpdateInstantiateConfigResponse returns empty data */
export interface MsgUpdateInstantiateConfigResponse {}
export interface MsgUpdateInstantiateConfigResponseProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgUpdateInstantiateConfigResponse";
  value: Uint8Array;
}
/** MsgUpdateInstantiateConfigResponse returns empty data */
export interface MsgUpdateInstantiateConfigResponseAmino {}
export interface MsgUpdateInstantiateConfigResponseAminoMsg {
  type: "wasm/MsgUpdateInstantiateConfigResponse";
  value: MsgUpdateInstantiateConfigResponseAmino;
}
/** MsgUpdateInstantiateConfigResponse returns empty data */
export interface MsgUpdateInstantiateConfigResponseSDKType {}
/**
 * MsgUpdateParams is the MsgUpdateParams request type.
 * 
 * Since: 0.40
 */
export interface MsgUpdateParams {
  /** Authority is the address of the governance account. */
  authority: string;
  /**
   * params defines the x/wasm parameters to update.
   * 
   * NOTE: All parameters must be supplied.
   */
  params: Params | undefined;
}
export interface MsgUpdateParamsProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgUpdateParams";
  value: Uint8Array;
}
/**
 * MsgUpdateParams is the MsgUpdateParams request type.
 * 
 * Since: 0.40
 */
export interface MsgUpdateParamsAmino {
  /** Authority is the address of the governance account. */
  authority: string;
  /**
   * params defines the x/wasm parameters to update.
   * 
   * NOTE: All parameters must be supplied.
   */
  params?: ParamsAmino | undefined;
}
export interface MsgUpdateParamsAminoMsg {
  type: "wasm/MsgUpdateParams";
  value: MsgUpdateParamsAmino;
}
/**
 * MsgUpdateParams is the MsgUpdateParams request type.
 * 
 * Since: 0.40
 */
export interface MsgUpdateParamsSDKType {
  authority: string;
  params: ParamsSDKType | undefined;
}
/**
 * MsgUpdateParamsResponse defines the response structure for executing a
 * MsgUpdateParams message.
 * 
 * Since: 0.40
 */
export interface MsgUpdateParamsResponse {}
export interface MsgUpdateParamsResponseProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgUpdateParamsResponse";
  value: Uint8Array;
}
/**
 * MsgUpdateParamsResponse defines the response structure for executing a
 * MsgUpdateParams message.
 * 
 * Since: 0.40
 */
export interface MsgUpdateParamsResponseAmino {}
export interface MsgUpdateParamsResponseAminoMsg {
  type: "wasm/MsgUpdateParamsResponse";
  value: MsgUpdateParamsResponseAmino;
}
/**
 * MsgUpdateParamsResponse defines the response structure for executing a
 * MsgUpdateParams message.
 * 
 * Since: 0.40
 */
export interface MsgUpdateParamsResponseSDKType {}
/**
 * MsgSudoContract is the MsgSudoContract request type.
 * 
 * Since: 0.40
 */
export interface MsgSudoContract {
  /** Authority is the address of the governance account. */
  authority: string;
  /** Contract is the address of the smart contract */
  contract: string;
  /** Msg json encoded message to be passed to the contract as sudo */
  msg: Uint8Array;
}
export interface MsgSudoContractProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgSudoContract";
  value: Uint8Array;
}
/**
 * MsgSudoContract is the MsgSudoContract request type.
 * 
 * Since: 0.40
 */
export interface MsgSudoContractAmino {
  /** Authority is the address of the governance account. */
  authority: string;
  /** Contract is the address of the smart contract */
  contract: string;
  /** Msg json encoded message to be passed to the contract as sudo */
  msg: Uint8Array;
}
export interface MsgSudoContractAminoMsg {
  type: "wasm/MsgSudoContract";
  value: MsgSudoContractAmino;
}
/**
 * MsgSudoContract is the MsgSudoContract request type.
 * 
 * Since: 0.40
 */
export interface MsgSudoContractSDKType {
  authority: string;
  contract: string;
  msg: Uint8Array;
}
/**
 * MsgSudoContractResponse defines the response structure for executing a
 * MsgSudoContract message.
 * 
 * Since: 0.40
 */
export interface MsgSudoContractResponse {
  /** Data contains bytes to returned from the contract */
  data: Uint8Array;
}
export interface MsgSudoContractResponseProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgSudoContractResponse";
  value: Uint8Array;
}
/**
 * MsgSudoContractResponse defines the response structure for executing a
 * MsgSudoContract message.
 * 
 * Since: 0.40
 */
export interface MsgSudoContractResponseAmino {
  /** Data contains bytes to returned from the contract */
  data: Uint8Array;
}
export interface MsgSudoContractResponseAminoMsg {
  type: "wasm/MsgSudoContractResponse";
  value: MsgSudoContractResponseAmino;
}
/**
 * MsgSudoContractResponse defines the response structure for executing a
 * MsgSudoContract message.
 * 
 * Since: 0.40
 */
export interface MsgSudoContractResponseSDKType {
  data: Uint8Array;
}
/**
 * MsgPinCodes is the MsgPinCodes request type.
 * 
 * Since: 0.40
 */
export interface MsgPinCodes {
  /** Authority is the address of the governance account. */
  authority: string;
  /** CodeIDs references the new WASM codes */
  codeIds: bigint[];
}
export interface MsgPinCodesProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgPinCodes";
  value: Uint8Array;
}
/**
 * MsgPinCodes is the MsgPinCodes request type.
 * 
 * Since: 0.40
 */
export interface MsgPinCodesAmino {
  /** Authority is the address of the governance account. */
  authority: string;
  /** CodeIDs references the new WASM codes */
  code_ids: string[];
}
export interface MsgPinCodesAminoMsg {
  type: "wasm/MsgPinCodes";
  value: MsgPinCodesAmino;
}
/**
 * MsgPinCodes is the MsgPinCodes request type.
 * 
 * Since: 0.40
 */
export interface MsgPinCodesSDKType {
  authority: string;
  code_ids: bigint[];
}
/**
 * MsgPinCodesResponse defines the response structure for executing a
 * MsgPinCodes message.
 * 
 * Since: 0.40
 */
export interface MsgPinCodesResponse {}
export interface MsgPinCodesResponseProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgPinCodesResponse";
  value: Uint8Array;
}
/**
 * MsgPinCodesResponse defines the response structure for executing a
 * MsgPinCodes message.
 * 
 * Since: 0.40
 */
export interface MsgPinCodesResponseAmino {}
export interface MsgPinCodesResponseAminoMsg {
  type: "wasm/MsgPinCodesResponse";
  value: MsgPinCodesResponseAmino;
}
/**
 * MsgPinCodesResponse defines the response structure for executing a
 * MsgPinCodes message.
 * 
 * Since: 0.40
 */
export interface MsgPinCodesResponseSDKType {}
/**
 * MsgUnpinCodes is the MsgUnpinCodes request type.
 * 
 * Since: 0.40
 */
export interface MsgUnpinCodes {
  /** Authority is the address of the governance account. */
  authority: string;
  /** CodeIDs references the WASM codes */
  codeIds: bigint[];
}
export interface MsgUnpinCodesProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgUnpinCodes";
  value: Uint8Array;
}
/**
 * MsgUnpinCodes is the MsgUnpinCodes request type.
 * 
 * Since: 0.40
 */
export interface MsgUnpinCodesAmino {
  /** Authority is the address of the governance account. */
  authority: string;
  /** CodeIDs references the WASM codes */
  code_ids: string[];
}
export interface MsgUnpinCodesAminoMsg {
  type: "wasm/MsgUnpinCodes";
  value: MsgUnpinCodesAmino;
}
/**
 * MsgUnpinCodes is the MsgUnpinCodes request type.
 * 
 * Since: 0.40
 */
export interface MsgUnpinCodesSDKType {
  authority: string;
  code_ids: bigint[];
}
/**
 * MsgUnpinCodesResponse defines the response structure for executing a
 * MsgUnpinCodes message.
 * 
 * Since: 0.40
 */
export interface MsgUnpinCodesResponse {}
export interface MsgUnpinCodesResponseProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgUnpinCodesResponse";
  value: Uint8Array;
}
/**
 * MsgUnpinCodesResponse defines the response structure for executing a
 * MsgUnpinCodes message.
 * 
 * Since: 0.40
 */
export interface MsgUnpinCodesResponseAmino {}
export interface MsgUnpinCodesResponseAminoMsg {
  type: "wasm/MsgUnpinCodesResponse";
  value: MsgUnpinCodesResponseAmino;
}
/**
 * MsgUnpinCodesResponse defines the response structure for executing a
 * MsgUnpinCodes message.
 * 
 * Since: 0.40
 */
export interface MsgUnpinCodesResponseSDKType {}
/**
 * MsgStoreAndInstantiateContract is the MsgStoreAndInstantiateContract
 * request type.
 * 
 * Since: 0.40
 */
export interface MsgStoreAndInstantiateContract {
  /** Authority is the address of the governance account. */
  authority: string;
  /** WASMByteCode can be raw or gzip compressed */
  wasmByteCode: Uint8Array;
  /** InstantiatePermission to apply on contract creation, optional */
  instantiatePermission?: AccessConfig | undefined;
  /**
   * UnpinCode code on upload, optional. As default the uploaded contract is
   * pinned to cache.
   */
  unpinCode: boolean;
  /** Admin is an optional address that can execute migrations */
  admin: string;
  /** Label is optional metadata to be stored with a constract instance. */
  label: string;
  /** Msg json encoded message to be passed to the contract on instantiation */
  msg: Uint8Array;
  /**
   * Funds coins that are transferred from the authority account to the contract
   * on instantiation
   */
  funds: Coin[];
  /** Source is the URL where the code is hosted */
  source: string;
  /**
   * Builder is the docker image used to build the code deterministically, used
   * for smart contract verification
   */
  builder: string;
  /**
   * CodeHash is the SHA256 sum of the code outputted by builder, used for smart
   * contract verification
   */
  codeHash: Uint8Array;
}
export interface MsgStoreAndInstantiateContractProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgStoreAndInstantiateContract";
  value: Uint8Array;
}
/**
 * MsgStoreAndInstantiateContract is the MsgStoreAndInstantiateContract
 * request type.
 * 
 * Since: 0.40
 */
export interface MsgStoreAndInstantiateContractAmino {
  /** Authority is the address of the governance account. */
  authority: string;
  /** WASMByteCode can be raw or gzip compressed */
  wasm_byte_code: string;
  /** InstantiatePermission to apply on contract creation, optional */
  instantiate_permission?: AccessConfigAmino | undefined;
  /**
   * UnpinCode code on upload, optional. As default the uploaded contract is
   * pinned to cache.
   */
  unpin_code: boolean;
  /** Admin is an optional address that can execute migrations */
  admin: string;
  /** Label is optional metadata to be stored with a constract instance. */
  label: string;
  /** Msg json encoded message to be passed to the contract on instantiation */
  msg: Uint8Array;
  /**
   * Funds coins that are transferred from the authority account to the contract
   * on instantiation
   */
  funds: CoinAmino[];
  /** Source is the URL where the code is hosted */
  source: string;
  /**
   * Builder is the docker image used to build the code deterministically, used
   * for smart contract verification
   */
  builder: string;
  /**
   * CodeHash is the SHA256 sum of the code outputted by builder, used for smart
   * contract verification
   */
  code_hash: Uint8Array;
}
export interface MsgStoreAndInstantiateContractAminoMsg {
  type: "wasm/MsgStoreAndInstantiateContract";
  value: MsgStoreAndInstantiateContractAmino;
}
/**
 * MsgStoreAndInstantiateContract is the MsgStoreAndInstantiateContract
 * request type.
 * 
 * Since: 0.40
 */
export interface MsgStoreAndInstantiateContractSDKType {
  authority: string;
  wasm_byte_code: Uint8Array;
  instantiate_permission?: AccessConfigSDKType | undefined;
  unpin_code: boolean;
  admin: string;
  label: string;
  msg: Uint8Array;
  funds: CoinSDKType[];
  source: string;
  builder: string;
  code_hash: Uint8Array;
}
/**
 * MsgStoreAndInstantiateContractResponse defines the response structure
 * for executing a MsgStoreAndInstantiateContract message.
 * 
 * Since: 0.40
 */
export interface MsgStoreAndInstantiateContractResponse {
  /** Address is the bech32 address of the new contract instance. */
  address: string;
  /** Data contains bytes to returned from the contract */
  data: Uint8Array;
}
export interface MsgStoreAndInstantiateContractResponseProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgStoreAndInstantiateContractResponse";
  value: Uint8Array;
}
/**
 * MsgStoreAndInstantiateContractResponse defines the response structure
 * for executing a MsgStoreAndInstantiateContract message.
 * 
 * Since: 0.40
 */
export interface MsgStoreAndInstantiateContractResponseAmino {
  /** Address is the bech32 address of the new contract instance. */
  address: string;
  /** Data contains bytes to returned from the contract */
  data: Uint8Array;
}
export interface MsgStoreAndInstantiateContractResponseAminoMsg {
  type: "wasm/MsgStoreAndInstantiateContractResponse";
  value: MsgStoreAndInstantiateContractResponseAmino;
}
/**
 * MsgStoreAndInstantiateContractResponse defines the response structure
 * for executing a MsgStoreAndInstantiateContract message.
 * 
 * Since: 0.40
 */
export interface MsgStoreAndInstantiateContractResponseSDKType {
  address: string;
  data: Uint8Array;
}
/**
 * MsgAddCodeUploadParamsAddresses is the
 * MsgAddCodeUploadParamsAddresses request type.
 */
export interface MsgAddCodeUploadParamsAddresses {
  /** Authority is the address of the governance account. */
  authority: string;
  addresses: string[];
}
export interface MsgAddCodeUploadParamsAddressesProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgAddCodeUploadParamsAddresses";
  value: Uint8Array;
}
/**
 * MsgAddCodeUploadParamsAddresses is the
 * MsgAddCodeUploadParamsAddresses request type.
 */
export interface MsgAddCodeUploadParamsAddressesAmino {
  /** Authority is the address of the governance account. */
  authority: string;
  addresses: string[];
}
export interface MsgAddCodeUploadParamsAddressesAminoMsg {
  type: "wasm/MsgAddCodeUploadParamsAddresses";
  value: MsgAddCodeUploadParamsAddressesAmino;
}
/**
 * MsgAddCodeUploadParamsAddresses is the
 * MsgAddCodeUploadParamsAddresses request type.
 */
export interface MsgAddCodeUploadParamsAddressesSDKType {
  authority: string;
  addresses: string[];
}
/**
 * MsgAddCodeUploadParamsAddressesResponse defines the response
 * structure for executing a MsgAddCodeUploadParamsAddresses message.
 */
export interface MsgAddCodeUploadParamsAddressesResponse {}
export interface MsgAddCodeUploadParamsAddressesResponseProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgAddCodeUploadParamsAddressesResponse";
  value: Uint8Array;
}
/**
 * MsgAddCodeUploadParamsAddressesResponse defines the response
 * structure for executing a MsgAddCodeUploadParamsAddresses message.
 */
export interface MsgAddCodeUploadParamsAddressesResponseAmino {}
export interface MsgAddCodeUploadParamsAddressesResponseAminoMsg {
  type: "wasm/MsgAddCodeUploadParamsAddressesResponse";
  value: MsgAddCodeUploadParamsAddressesResponseAmino;
}
/**
 * MsgAddCodeUploadParamsAddressesResponse defines the response
 * structure for executing a MsgAddCodeUploadParamsAddresses message.
 */
export interface MsgAddCodeUploadParamsAddressesResponseSDKType {}
/**
 * MsgRemoveCodeUploadParamsAddresses is the
 * MsgRemoveCodeUploadParamsAddresses request type.
 */
export interface MsgRemoveCodeUploadParamsAddresses {
  /** Authority is the address of the governance account. */
  authority: string;
  addresses: string[];
}
export interface MsgRemoveCodeUploadParamsAddressesProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgRemoveCodeUploadParamsAddresses";
  value: Uint8Array;
}
/**
 * MsgRemoveCodeUploadParamsAddresses is the
 * MsgRemoveCodeUploadParamsAddresses request type.
 */
export interface MsgRemoveCodeUploadParamsAddressesAmino {
  /** Authority is the address of the governance account. */
  authority: string;
  addresses: string[];
}
export interface MsgRemoveCodeUploadParamsAddressesAminoMsg {
  type: "wasm/MsgRemoveCodeUploadParamsAddresses";
  value: MsgRemoveCodeUploadParamsAddressesAmino;
}
/**
 * MsgRemoveCodeUploadParamsAddresses is the
 * MsgRemoveCodeUploadParamsAddresses request type.
 */
export interface MsgRemoveCodeUploadParamsAddressesSDKType {
  authority: string;
  addresses: string[];
}
/**
 * MsgRemoveCodeUploadParamsAddressesResponse defines the response
 * structure for executing a MsgRemoveCodeUploadParamsAddresses message.
 */
export interface MsgRemoveCodeUploadParamsAddressesResponse {}
export interface MsgRemoveCodeUploadParamsAddressesResponseProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgRemoveCodeUploadParamsAddressesResponse";
  value: Uint8Array;
}
/**
 * MsgRemoveCodeUploadParamsAddressesResponse defines the response
 * structure for executing a MsgRemoveCodeUploadParamsAddresses message.
 */
export interface MsgRemoveCodeUploadParamsAddressesResponseAmino {}
export interface MsgRemoveCodeUploadParamsAddressesResponseAminoMsg {
  type: "wasm/MsgRemoveCodeUploadParamsAddressesResponse";
  value: MsgRemoveCodeUploadParamsAddressesResponseAmino;
}
/**
 * MsgRemoveCodeUploadParamsAddressesResponse defines the response
 * structure for executing a MsgRemoveCodeUploadParamsAddresses message.
 */
export interface MsgRemoveCodeUploadParamsAddressesResponseSDKType {}
/**
 * MsgStoreAndMigrateContract is the MsgStoreAndMigrateContract
 * request type.
 * 
 * Since: 0.42
 */
export interface MsgStoreAndMigrateContract {
  /** Authority is the address of the governance account. */
  authority: string;
  /** WASMByteCode can be raw or gzip compressed */
  wasmByteCode: Uint8Array;
  /** InstantiatePermission to apply on contract creation, optional */
  instantiatePermission?: AccessConfig | undefined;
  /** Contract is the address of the smart contract */
  contract: string;
  /** Msg json encoded message to be passed to the contract on migration */
  msg: Uint8Array;
}
export interface MsgStoreAndMigrateContractProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgStoreAndMigrateContract";
  value: Uint8Array;
}
/**
 * MsgStoreAndMigrateContract is the MsgStoreAndMigrateContract
 * request type.
 * 
 * Since: 0.42
 */
export interface MsgStoreAndMigrateContractAmino {
  /** Authority is the address of the governance account. */
  authority: string;
  /** WASMByteCode can be raw or gzip compressed */
  wasm_byte_code: string;
  /** InstantiatePermission to apply on contract creation, optional */
  instantiate_permission?: AccessConfigAmino | undefined;
  /** Contract is the address of the smart contract */
  contract: string;
  /** Msg json encoded message to be passed to the contract on migration */
  msg: Uint8Array;
}
export interface MsgStoreAndMigrateContractAminoMsg {
  type: "wasm/MsgStoreAndMigrateContract";
  value: MsgStoreAndMigrateContractAmino;
}
/**
 * MsgStoreAndMigrateContract is the MsgStoreAndMigrateContract
 * request type.
 * 
 * Since: 0.42
 */
export interface MsgStoreAndMigrateContractSDKType {
  authority: string;
  wasm_byte_code: Uint8Array;
  instantiate_permission?: AccessConfigSDKType | undefined;
  contract: string;
  msg: Uint8Array;
}
/**
 * MsgStoreAndMigrateContractResponse defines the response structure
 * for executing a MsgStoreAndMigrateContract message.
 * 
 * Since: 0.42
 */
export interface MsgStoreAndMigrateContractResponse {
  /** CodeID is the reference to the stored WASM code */
  codeId: bigint;
  /** Checksum is the sha256 hash of the stored code */
  checksum: Uint8Array;
  /** Data contains bytes to returned from the contract */
  data: Uint8Array;
}
export interface MsgStoreAndMigrateContractResponseProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgStoreAndMigrateContractResponse";
  value: Uint8Array;
}
/**
 * MsgStoreAndMigrateContractResponse defines the response structure
 * for executing a MsgStoreAndMigrateContract message.
 * 
 * Since: 0.42
 */
export interface MsgStoreAndMigrateContractResponseAmino {
  /** CodeID is the reference to the stored WASM code */
  code_id: string;
  /** Checksum is the sha256 hash of the stored code */
  checksum: Uint8Array;
  /** Data contains bytes to returned from the contract */
  data: Uint8Array;
}
export interface MsgStoreAndMigrateContractResponseAminoMsg {
  type: "wasm/MsgStoreAndMigrateContractResponse";
  value: MsgStoreAndMigrateContractResponseAmino;
}
/**
 * MsgStoreAndMigrateContractResponse defines the response structure
 * for executing a MsgStoreAndMigrateContract message.
 * 
 * Since: 0.42
 */
export interface MsgStoreAndMigrateContractResponseSDKType {
  code_id: bigint;
  checksum: Uint8Array;
  data: Uint8Array;
}
/** MsgUpdateContractLabel sets a new label for a smart contract */
export interface MsgUpdateContractLabel {
  /** Sender is the that actor that signed the messages */
  sender: string;
  /** NewLabel string to be set */
  newLabel: string;
  /** Contract is the address of the smart contract */
  contract: string;
}
export interface MsgUpdateContractLabelProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgUpdateContractLabel";
  value: Uint8Array;
}
/** MsgUpdateContractLabel sets a new label for a smart contract */
export interface MsgUpdateContractLabelAmino {
  /** Sender is the that actor that signed the messages */
  sender: string;
  /** NewLabel string to be set */
  new_label: string;
  /** Contract is the address of the smart contract */
  contract: string;
}
export interface MsgUpdateContractLabelAminoMsg {
  type: "wasm/MsgUpdateContractLabel";
  value: MsgUpdateContractLabelAmino;
}
/** MsgUpdateContractLabel sets a new label for a smart contract */
export interface MsgUpdateContractLabelSDKType {
  sender: string;
  new_label: string;
  contract: string;
}
/** MsgUpdateContractLabelResponse returns empty data */
export interface MsgUpdateContractLabelResponse {}
export interface MsgUpdateContractLabelResponseProtoMsg {
  typeUrl: "/cosmwasm.wasm.v1.MsgUpdateContractLabelResponse";
  value: Uint8Array;
}
/** MsgUpdateContractLabelResponse returns empty data */
export interface MsgUpdateContractLabelResponseAmino {}
export interface MsgUpdateContractLabelResponseAminoMsg {
  type: "wasm/MsgUpdateContractLabelResponse";
  value: MsgUpdateContractLabelResponseAmino;
}
/** MsgUpdateContractLabelResponse returns empty data */
export interface MsgUpdateContractLabelResponseSDKType {}
function createBaseMsgStoreCode(): MsgStoreCode {
  return {
    sender: "",
    wasmByteCode: new Uint8Array(),
    instantiatePermission: undefined
  };
}
export const MsgStoreCode = {
  typeUrl: "/cosmwasm.wasm.v1.MsgStoreCode",
  encode(message: MsgStoreCode, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.sender !== "") {
      writer.uint32(10).string(message.sender);
    }
    if (message.wasmByteCode.length !== 0) {
      writer.uint32(18).bytes(message.wasmByteCode);
    }
    if (message.instantiatePermission !== undefined) {
      AccessConfig.encode(message.instantiatePermission, writer.uint32(42).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgStoreCode {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgStoreCode();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.sender = reader.string();
          break;
        case 2:
          message.wasmByteCode = reader.bytes();
          break;
        case 5:
          message.instantiatePermission = AccessConfig.decode(reader, reader.uint32(), useInterfaces);
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<MsgStoreCode>): MsgStoreCode {
    const message = createBaseMsgStoreCode();
    message.sender = object.sender ?? "";
    message.wasmByteCode = object.wasmByteCode ?? new Uint8Array();
    message.instantiatePermission = object.instantiatePermission !== undefined && object.instantiatePermission !== null ? AccessConfig.fromPartial(object.instantiatePermission) : undefined;
    return message;
  },
  fromAmino(object: MsgStoreCodeAmino): MsgStoreCode {
    return {
      sender: object.sender,
      wasmByteCode: fromBase64(object.wasm_byte_code),
      instantiatePermission: object?.instantiate_permission ? AccessConfig.fromAmino(object.instantiate_permission) : undefined
    };
  },
  toAmino(message: MsgStoreCode, useInterfaces: boolean = false): MsgStoreCodeAmino {
    const obj: any = {};
    obj.sender = message.sender;
    obj.wasm_byte_code = message.wasmByteCode ? toBase64(message.wasmByteCode) : undefined;
    obj.instantiate_permission = message.instantiatePermission ? AccessConfig.toAmino(message.instantiatePermission, useInterfaces) : undefined;
    return obj;
  },
  fromAminoMsg(object: MsgStoreCodeAminoMsg): MsgStoreCode {
    return MsgStoreCode.fromAmino(object.value);
  },
  toAminoMsg(message: MsgStoreCode, useInterfaces: boolean = false): MsgStoreCodeAminoMsg {
    return {
      type: "wasm/MsgStoreCode",
      value: MsgStoreCode.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgStoreCodeProtoMsg, useInterfaces: boolean = false): MsgStoreCode {
    return MsgStoreCode.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgStoreCode): Uint8Array {
    return MsgStoreCode.encode(message).finish();
  },
  toProtoMsg(message: MsgStoreCode): MsgStoreCodeProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgStoreCode",
      value: MsgStoreCode.encode(message).finish()
    };
  }
};
function createBaseMsgStoreCodeResponse(): MsgStoreCodeResponse {
  return {
    codeId: BigInt(0),
    checksum: new Uint8Array()
  };
}
export const MsgStoreCodeResponse = {
  typeUrl: "/cosmwasm.wasm.v1.MsgStoreCodeResponse",
  encode(message: MsgStoreCodeResponse, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.codeId !== BigInt(0)) {
      writer.uint32(8).uint64(message.codeId);
    }
    if (message.checksum.length !== 0) {
      writer.uint32(18).bytes(message.checksum);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgStoreCodeResponse {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgStoreCodeResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.codeId = reader.uint64();
          break;
        case 2:
          message.checksum = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<MsgStoreCodeResponse>): MsgStoreCodeResponse {
    const message = createBaseMsgStoreCodeResponse();
    message.codeId = object.codeId !== undefined && object.codeId !== null ? BigInt(object.codeId.toString()) : BigInt(0);
    message.checksum = object.checksum ?? new Uint8Array();
    return message;
  },
  fromAmino(object: MsgStoreCodeResponseAmino): MsgStoreCodeResponse {
    return {
      codeId: BigInt(object.code_id),
      checksum: object.checksum
    };
  },
  toAmino(message: MsgStoreCodeResponse, useInterfaces: boolean = false): MsgStoreCodeResponseAmino {
    const obj: any = {};
    obj.code_id = message.codeId ? message.codeId.toString() : undefined;
    obj.checksum = message.checksum;
    return obj;
  },
  fromAminoMsg(object: MsgStoreCodeResponseAminoMsg): MsgStoreCodeResponse {
    return MsgStoreCodeResponse.fromAmino(object.value);
  },
  toAminoMsg(message: MsgStoreCodeResponse, useInterfaces: boolean = false): MsgStoreCodeResponseAminoMsg {
    return {
      type: "wasm/MsgStoreCodeResponse",
      value: MsgStoreCodeResponse.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgStoreCodeResponseProtoMsg, useInterfaces: boolean = false): MsgStoreCodeResponse {
    return MsgStoreCodeResponse.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgStoreCodeResponse): Uint8Array {
    return MsgStoreCodeResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgStoreCodeResponse): MsgStoreCodeResponseProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgStoreCodeResponse",
      value: MsgStoreCodeResponse.encode(message).finish()
    };
  }
};
function createBaseMsgInstantiateContract(): MsgInstantiateContract {
  return {
    sender: "",
    admin: "",
    codeId: BigInt(0),
    label: "",
    msg: new Uint8Array(),
    funds: []
  };
}
export const MsgInstantiateContract = {
  typeUrl: "/cosmwasm.wasm.v1.MsgInstantiateContract",
  encode(message: MsgInstantiateContract, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.sender !== "") {
      writer.uint32(10).string(message.sender);
    }
    if (message.admin !== "") {
      writer.uint32(18).string(message.admin);
    }
    if (message.codeId !== BigInt(0)) {
      writer.uint32(24).uint64(message.codeId);
    }
    if (message.label !== "") {
      writer.uint32(34).string(message.label);
    }
    if (message.msg.length !== 0) {
      writer.uint32(42).bytes(message.msg);
    }
    for (const v of message.funds) {
      Coin.encode(v!, writer.uint32(50).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgInstantiateContract {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgInstantiateContract();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.sender = reader.string();
          break;
        case 2:
          message.admin = reader.string();
          break;
        case 3:
          message.codeId = reader.uint64();
          break;
        case 4:
          message.label = reader.string();
          break;
        case 5:
          message.msg = reader.bytes();
          break;
        case 6:
          message.funds.push(Coin.decode(reader, reader.uint32(), useInterfaces));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<MsgInstantiateContract>): MsgInstantiateContract {
    const message = createBaseMsgInstantiateContract();
    message.sender = object.sender ?? "";
    message.admin = object.admin ?? "";
    message.codeId = object.codeId !== undefined && object.codeId !== null ? BigInt(object.codeId.toString()) : BigInt(0);
    message.label = object.label ?? "";
    message.msg = object.msg ?? new Uint8Array();
    message.funds = object.funds?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromAmino(object: MsgInstantiateContractAmino): MsgInstantiateContract {
    return {
      sender: object.sender,
      admin: object.admin,
      codeId: BigInt(object.code_id),
      label: object.label,
      msg: toUtf8(JSON.stringify(object.msg)),
      funds: Array.isArray(object?.funds) ? object.funds.map((e: any) => Coin.fromAmino(e)) : []
    };
  },
  toAmino(message: MsgInstantiateContract, useInterfaces: boolean = false): MsgInstantiateContractAmino {
    const obj: any = {};
    obj.sender = message.sender;
    obj.admin = message.admin;
    obj.code_id = message.codeId ? message.codeId.toString() : undefined;
    obj.label = message.label;
    obj.msg = message.msg ? JSON.parse(fromUtf8(message.msg)) : undefined;
    if (message.funds) {
      obj.funds = message.funds.map(e => e ? Coin.toAmino(e, useInterfaces) : undefined);
    } else {
      obj.funds = [];
    }
    return obj;
  },
  fromAminoMsg(object: MsgInstantiateContractAminoMsg): MsgInstantiateContract {
    return MsgInstantiateContract.fromAmino(object.value);
  },
  toAminoMsg(message: MsgInstantiateContract, useInterfaces: boolean = false): MsgInstantiateContractAminoMsg {
    return {
      type: "wasm/MsgInstantiateContract",
      value: MsgInstantiateContract.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgInstantiateContractProtoMsg, useInterfaces: boolean = false): MsgInstantiateContract {
    return MsgInstantiateContract.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgInstantiateContract): Uint8Array {
    return MsgInstantiateContract.encode(message).finish();
  },
  toProtoMsg(message: MsgInstantiateContract): MsgInstantiateContractProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgInstantiateContract",
      value: MsgInstantiateContract.encode(message).finish()
    };
  }
};
function createBaseMsgInstantiateContractResponse(): MsgInstantiateContractResponse {
  return {
    address: "",
    data: new Uint8Array()
  };
}
export const MsgInstantiateContractResponse = {
  typeUrl: "/cosmwasm.wasm.v1.MsgInstantiateContractResponse",
  encode(message: MsgInstantiateContractResponse, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.address !== "") {
      writer.uint32(10).string(message.address);
    }
    if (message.data.length !== 0) {
      writer.uint32(18).bytes(message.data);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgInstantiateContractResponse {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgInstantiateContractResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.address = reader.string();
          break;
        case 2:
          message.data = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<MsgInstantiateContractResponse>): MsgInstantiateContractResponse {
    const message = createBaseMsgInstantiateContractResponse();
    message.address = object.address ?? "";
    message.data = object.data ?? new Uint8Array();
    return message;
  },
  fromAmino(object: MsgInstantiateContractResponseAmino): MsgInstantiateContractResponse {
    return {
      address: object.address,
      data: object.data
    };
  },
  toAmino(message: MsgInstantiateContractResponse, useInterfaces: boolean = false): MsgInstantiateContractResponseAmino {
    const obj: any = {};
    obj.address = message.address;
    obj.data = message.data;
    return obj;
  },
  fromAminoMsg(object: MsgInstantiateContractResponseAminoMsg): MsgInstantiateContractResponse {
    return MsgInstantiateContractResponse.fromAmino(object.value);
  },
  toAminoMsg(message: MsgInstantiateContractResponse, useInterfaces: boolean = false): MsgInstantiateContractResponseAminoMsg {
    return {
      type: "wasm/MsgInstantiateContractResponse",
      value: MsgInstantiateContractResponse.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgInstantiateContractResponseProtoMsg, useInterfaces: boolean = false): MsgInstantiateContractResponse {
    return MsgInstantiateContractResponse.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgInstantiateContractResponse): Uint8Array {
    return MsgInstantiateContractResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgInstantiateContractResponse): MsgInstantiateContractResponseProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgInstantiateContractResponse",
      value: MsgInstantiateContractResponse.encode(message).finish()
    };
  }
};
function createBaseMsgInstantiateContract2(): MsgInstantiateContract2 {
  return {
    sender: "",
    admin: "",
    codeId: BigInt(0),
    label: "",
    msg: new Uint8Array(),
    funds: [],
    salt: new Uint8Array(),
    fixMsg: false
  };
}
export const MsgInstantiateContract2 = {
  typeUrl: "/cosmwasm.wasm.v1.MsgInstantiateContract2",
  encode(message: MsgInstantiateContract2, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.sender !== "") {
      writer.uint32(10).string(message.sender);
    }
    if (message.admin !== "") {
      writer.uint32(18).string(message.admin);
    }
    if (message.codeId !== BigInt(0)) {
      writer.uint32(24).uint64(message.codeId);
    }
    if (message.label !== "") {
      writer.uint32(34).string(message.label);
    }
    if (message.msg.length !== 0) {
      writer.uint32(42).bytes(message.msg);
    }
    for (const v of message.funds) {
      Coin.encode(v!, writer.uint32(50).fork()).ldelim();
    }
    if (message.salt.length !== 0) {
      writer.uint32(58).bytes(message.salt);
    }
    if (message.fixMsg === true) {
      writer.uint32(64).bool(message.fixMsg);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgInstantiateContract2 {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgInstantiateContract2();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.sender = reader.string();
          break;
        case 2:
          message.admin = reader.string();
          break;
        case 3:
          message.codeId = reader.uint64();
          break;
        case 4:
          message.label = reader.string();
          break;
        case 5:
          message.msg = reader.bytes();
          break;
        case 6:
          message.funds.push(Coin.decode(reader, reader.uint32(), useInterfaces));
          break;
        case 7:
          message.salt = reader.bytes();
          break;
        case 8:
          message.fixMsg = reader.bool();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<MsgInstantiateContract2>): MsgInstantiateContract2 {
    const message = createBaseMsgInstantiateContract2();
    message.sender = object.sender ?? "";
    message.admin = object.admin ?? "";
    message.codeId = object.codeId !== undefined && object.codeId !== null ? BigInt(object.codeId.toString()) : BigInt(0);
    message.label = object.label ?? "";
    message.msg = object.msg ?? new Uint8Array();
    message.funds = object.funds?.map(e => Coin.fromPartial(e)) || [];
    message.salt = object.salt ?? new Uint8Array();
    message.fixMsg = object.fixMsg ?? false;
    return message;
  },
  fromAmino(object: MsgInstantiateContract2Amino): MsgInstantiateContract2 {
    return {
      sender: object.sender,
      admin: object.admin,
      codeId: BigInt(object.code_id),
      label: object.label,
      msg: toUtf8(JSON.stringify(object.msg)),
      funds: Array.isArray(object?.funds) ? object.funds.map((e: any) => Coin.fromAmino(e)) : [],
      salt: object.salt,
      fixMsg: object.fix_msg
    };
  },
  toAmino(message: MsgInstantiateContract2, useInterfaces: boolean = false): MsgInstantiateContract2Amino {
    const obj: any = {};
    obj.sender = message.sender;
    obj.admin = message.admin;
    obj.code_id = message.codeId ? message.codeId.toString() : undefined;
    obj.label = message.label;
    obj.msg = message.msg ? JSON.parse(fromUtf8(message.msg)) : undefined;
    if (message.funds) {
      obj.funds = message.funds.map(e => e ? Coin.toAmino(e, useInterfaces) : undefined);
    } else {
      obj.funds = [];
    }
    obj.salt = message.salt;
    obj.fix_msg = message.fixMsg;
    return obj;
  },
  fromAminoMsg(object: MsgInstantiateContract2AminoMsg): MsgInstantiateContract2 {
    return MsgInstantiateContract2.fromAmino(object.value);
  },
  toAminoMsg(message: MsgInstantiateContract2, useInterfaces: boolean = false): MsgInstantiateContract2AminoMsg {
    return {
      type: "wasm/MsgInstantiateContract2",
      value: MsgInstantiateContract2.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgInstantiateContract2ProtoMsg, useInterfaces: boolean = false): MsgInstantiateContract2 {
    return MsgInstantiateContract2.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgInstantiateContract2): Uint8Array {
    return MsgInstantiateContract2.encode(message).finish();
  },
  toProtoMsg(message: MsgInstantiateContract2): MsgInstantiateContract2ProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgInstantiateContract2",
      value: MsgInstantiateContract2.encode(message).finish()
    };
  }
};
function createBaseMsgInstantiateContract2Response(): MsgInstantiateContract2Response {
  return {
    address: "",
    data: new Uint8Array()
  };
}
export const MsgInstantiateContract2Response = {
  typeUrl: "/cosmwasm.wasm.v1.MsgInstantiateContract2Response",
  encode(message: MsgInstantiateContract2Response, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.address !== "") {
      writer.uint32(10).string(message.address);
    }
    if (message.data.length !== 0) {
      writer.uint32(18).bytes(message.data);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgInstantiateContract2Response {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgInstantiateContract2Response();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.address = reader.string();
          break;
        case 2:
          message.data = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<MsgInstantiateContract2Response>): MsgInstantiateContract2Response {
    const message = createBaseMsgInstantiateContract2Response();
    message.address = object.address ?? "";
    message.data = object.data ?? new Uint8Array();
    return message;
  },
  fromAmino(object: MsgInstantiateContract2ResponseAmino): MsgInstantiateContract2Response {
    return {
      address: object.address,
      data: object.data
    };
  },
  toAmino(message: MsgInstantiateContract2Response, useInterfaces: boolean = false): MsgInstantiateContract2ResponseAmino {
    const obj: any = {};
    obj.address = message.address;
    obj.data = message.data;
    return obj;
  },
  fromAminoMsg(object: MsgInstantiateContract2ResponseAminoMsg): MsgInstantiateContract2Response {
    return MsgInstantiateContract2Response.fromAmino(object.value);
  },
  toAminoMsg(message: MsgInstantiateContract2Response, useInterfaces: boolean = false): MsgInstantiateContract2ResponseAminoMsg {
    return {
      type: "wasm/MsgInstantiateContract2Response",
      value: MsgInstantiateContract2Response.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgInstantiateContract2ResponseProtoMsg, useInterfaces: boolean = false): MsgInstantiateContract2Response {
    return MsgInstantiateContract2Response.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgInstantiateContract2Response): Uint8Array {
    return MsgInstantiateContract2Response.encode(message).finish();
  },
  toProtoMsg(message: MsgInstantiateContract2Response): MsgInstantiateContract2ResponseProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgInstantiateContract2Response",
      value: MsgInstantiateContract2Response.encode(message).finish()
    };
  }
};
function createBaseMsgExecuteContract(): MsgExecuteContract {
  return {
    sender: "",
    contract: "",
    msg: new Uint8Array(),
    funds: []
  };
}
export const MsgExecuteContract = {
  typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
  encode(message: MsgExecuteContract, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.sender !== "") {
      writer.uint32(10).string(message.sender);
    }
    if (message.contract !== "") {
      writer.uint32(18).string(message.contract);
    }
    if (message.msg.length !== 0) {
      writer.uint32(26).bytes(message.msg);
    }
    for (const v of message.funds) {
      Coin.encode(v!, writer.uint32(42).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgExecuteContract {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgExecuteContract();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.sender = reader.string();
          break;
        case 2:
          message.contract = reader.string();
          break;
        case 3:
          message.msg = reader.bytes();
          break;
        case 5:
          message.funds.push(Coin.decode(reader, reader.uint32(), useInterfaces));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<MsgExecuteContract>): MsgExecuteContract {
    const message = createBaseMsgExecuteContract();
    message.sender = object.sender ?? "";
    message.contract = object.contract ?? "";
    message.msg = object.msg ?? new Uint8Array();
    message.funds = object.funds?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromAmino(object: MsgExecuteContractAmino): MsgExecuteContract {
    return {
      sender: object.sender,
      contract: object.contract,
      msg: toUtf8(JSON.stringify(object.msg)),
      funds: Array.isArray(object?.funds) ? object.funds.map((e: any) => Coin.fromAmino(e)) : []
    };
  },
  toAmino(message: MsgExecuteContract, useInterfaces: boolean = false): MsgExecuteContractAmino {
    const obj: any = {};
    obj.sender = message.sender;
    obj.contract = message.contract;
    obj.msg = message.msg ? JSON.parse(fromUtf8(message.msg)) : undefined;
    if (message.funds) {
      obj.funds = message.funds.map(e => e ? Coin.toAmino(e, useInterfaces) : undefined);
    } else {
      obj.funds = [];
    }
    return obj;
  },
  fromAminoMsg(object: MsgExecuteContractAminoMsg): MsgExecuteContract {
    return MsgExecuteContract.fromAmino(object.value);
  },
  toAminoMsg(message: MsgExecuteContract, useInterfaces: boolean = false): MsgExecuteContractAminoMsg {
    return {
      type: "wasm/MsgExecuteContract",
      value: MsgExecuteContract.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgExecuteContractProtoMsg, useInterfaces: boolean = false): MsgExecuteContract {
    return MsgExecuteContract.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgExecuteContract): Uint8Array {
    return MsgExecuteContract.encode(message).finish();
  },
  toProtoMsg(message: MsgExecuteContract): MsgExecuteContractProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.encode(message).finish()
    };
  }
};
function createBaseMsgExecuteContractResponse(): MsgExecuteContractResponse {
  return {
    data: new Uint8Array()
  };
}
export const MsgExecuteContractResponse = {
  typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContractResponse",
  encode(message: MsgExecuteContractResponse, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.data.length !== 0) {
      writer.uint32(10).bytes(message.data);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgExecuteContractResponse {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgExecuteContractResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.data = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<MsgExecuteContractResponse>): MsgExecuteContractResponse {
    const message = createBaseMsgExecuteContractResponse();
    message.data = object.data ?? new Uint8Array();
    return message;
  },
  fromAmino(object: MsgExecuteContractResponseAmino): MsgExecuteContractResponse {
    return {
      data: object.data
    };
  },
  toAmino(message: MsgExecuteContractResponse, useInterfaces: boolean = false): MsgExecuteContractResponseAmino {
    const obj: any = {};
    obj.data = message.data;
    return obj;
  },
  fromAminoMsg(object: MsgExecuteContractResponseAminoMsg): MsgExecuteContractResponse {
    return MsgExecuteContractResponse.fromAmino(object.value);
  },
  toAminoMsg(message: MsgExecuteContractResponse, useInterfaces: boolean = false): MsgExecuteContractResponseAminoMsg {
    return {
      type: "wasm/MsgExecuteContractResponse",
      value: MsgExecuteContractResponse.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgExecuteContractResponseProtoMsg, useInterfaces: boolean = false): MsgExecuteContractResponse {
    return MsgExecuteContractResponse.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgExecuteContractResponse): Uint8Array {
    return MsgExecuteContractResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgExecuteContractResponse): MsgExecuteContractResponseProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContractResponse",
      value: MsgExecuteContractResponse.encode(message).finish()
    };
  }
};
function createBaseMsgMigrateContract(): MsgMigrateContract {
  return {
    sender: "",
    contract: "",
    codeId: BigInt(0),
    msg: new Uint8Array()
  };
}
export const MsgMigrateContract = {
  typeUrl: "/cosmwasm.wasm.v1.MsgMigrateContract",
  encode(message: MsgMigrateContract, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.sender !== "") {
      writer.uint32(10).string(message.sender);
    }
    if (message.contract !== "") {
      writer.uint32(18).string(message.contract);
    }
    if (message.codeId !== BigInt(0)) {
      writer.uint32(24).uint64(message.codeId);
    }
    if (message.msg.length !== 0) {
      writer.uint32(34).bytes(message.msg);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgMigrateContract {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgMigrateContract();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.sender = reader.string();
          break;
        case 2:
          message.contract = reader.string();
          break;
        case 3:
          message.codeId = reader.uint64();
          break;
        case 4:
          message.msg = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<MsgMigrateContract>): MsgMigrateContract {
    const message = createBaseMsgMigrateContract();
    message.sender = object.sender ?? "";
    message.contract = object.contract ?? "";
    message.codeId = object.codeId !== undefined && object.codeId !== null ? BigInt(object.codeId.toString()) : BigInt(0);
    message.msg = object.msg ?? new Uint8Array();
    return message;
  },
  fromAmino(object: MsgMigrateContractAmino): MsgMigrateContract {
    return {
      sender: object.sender,
      contract: object.contract,
      codeId: BigInt(object.code_id),
      msg: toUtf8(JSON.stringify(object.msg))
    };
  },
  toAmino(message: MsgMigrateContract, useInterfaces: boolean = false): MsgMigrateContractAmino {
    const obj: any = {};
    obj.sender = message.sender;
    obj.contract = message.contract;
    obj.code_id = message.codeId ? message.codeId.toString() : undefined;
    obj.msg = message.msg ? JSON.parse(fromUtf8(message.msg)) : undefined;
    return obj;
  },
  fromAminoMsg(object: MsgMigrateContractAminoMsg): MsgMigrateContract {
    return MsgMigrateContract.fromAmino(object.value);
  },
  toAminoMsg(message: MsgMigrateContract, useInterfaces: boolean = false): MsgMigrateContractAminoMsg {
    return {
      type: "wasm/MsgMigrateContract",
      value: MsgMigrateContract.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgMigrateContractProtoMsg, useInterfaces: boolean = false): MsgMigrateContract {
    return MsgMigrateContract.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgMigrateContract): Uint8Array {
    return MsgMigrateContract.encode(message).finish();
  },
  toProtoMsg(message: MsgMigrateContract): MsgMigrateContractProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgMigrateContract",
      value: MsgMigrateContract.encode(message).finish()
    };
  }
};
function createBaseMsgMigrateContractResponse(): MsgMigrateContractResponse {
  return {
    data: new Uint8Array()
  };
}
export const MsgMigrateContractResponse = {
  typeUrl: "/cosmwasm.wasm.v1.MsgMigrateContractResponse",
  encode(message: MsgMigrateContractResponse, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.data.length !== 0) {
      writer.uint32(10).bytes(message.data);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgMigrateContractResponse {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgMigrateContractResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.data = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<MsgMigrateContractResponse>): MsgMigrateContractResponse {
    const message = createBaseMsgMigrateContractResponse();
    message.data = object.data ?? new Uint8Array();
    return message;
  },
  fromAmino(object: MsgMigrateContractResponseAmino): MsgMigrateContractResponse {
    return {
      data: object.data
    };
  },
  toAmino(message: MsgMigrateContractResponse, useInterfaces: boolean = false): MsgMigrateContractResponseAmino {
    const obj: any = {};
    obj.data = message.data;
    return obj;
  },
  fromAminoMsg(object: MsgMigrateContractResponseAminoMsg): MsgMigrateContractResponse {
    return MsgMigrateContractResponse.fromAmino(object.value);
  },
  toAminoMsg(message: MsgMigrateContractResponse, useInterfaces: boolean = false): MsgMigrateContractResponseAminoMsg {
    return {
      type: "wasm/MsgMigrateContractResponse",
      value: MsgMigrateContractResponse.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgMigrateContractResponseProtoMsg, useInterfaces: boolean = false): MsgMigrateContractResponse {
    return MsgMigrateContractResponse.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgMigrateContractResponse): Uint8Array {
    return MsgMigrateContractResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgMigrateContractResponse): MsgMigrateContractResponseProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgMigrateContractResponse",
      value: MsgMigrateContractResponse.encode(message).finish()
    };
  }
};
function createBaseMsgUpdateAdmin(): MsgUpdateAdmin {
  return {
    sender: "",
    newAdmin: "",
    contract: ""
  };
}
export const MsgUpdateAdmin = {
  typeUrl: "/cosmwasm.wasm.v1.MsgUpdateAdmin",
  encode(message: MsgUpdateAdmin, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.sender !== "") {
      writer.uint32(10).string(message.sender);
    }
    if (message.newAdmin !== "") {
      writer.uint32(18).string(message.newAdmin);
    }
    if (message.contract !== "") {
      writer.uint32(26).string(message.contract);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgUpdateAdmin {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateAdmin();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.sender = reader.string();
          break;
        case 2:
          message.newAdmin = reader.string();
          break;
        case 3:
          message.contract = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<MsgUpdateAdmin>): MsgUpdateAdmin {
    const message = createBaseMsgUpdateAdmin();
    message.sender = object.sender ?? "";
    message.newAdmin = object.newAdmin ?? "";
    message.contract = object.contract ?? "";
    return message;
  },
  fromAmino(object: MsgUpdateAdminAmino): MsgUpdateAdmin {
    return {
      sender: object.sender,
      newAdmin: object.new_admin,
      contract: object.contract
    };
  },
  toAmino(message: MsgUpdateAdmin, useInterfaces: boolean = false): MsgUpdateAdminAmino {
    const obj: any = {};
    obj.sender = message.sender;
    obj.new_admin = message.newAdmin;
    obj.contract = message.contract;
    return obj;
  },
  fromAminoMsg(object: MsgUpdateAdminAminoMsg): MsgUpdateAdmin {
    return MsgUpdateAdmin.fromAmino(object.value);
  },
  toAminoMsg(message: MsgUpdateAdmin, useInterfaces: boolean = false): MsgUpdateAdminAminoMsg {
    return {
      type: "wasm/MsgUpdateAdmin",
      value: MsgUpdateAdmin.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgUpdateAdminProtoMsg, useInterfaces: boolean = false): MsgUpdateAdmin {
    return MsgUpdateAdmin.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgUpdateAdmin): Uint8Array {
    return MsgUpdateAdmin.encode(message).finish();
  },
  toProtoMsg(message: MsgUpdateAdmin): MsgUpdateAdminProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgUpdateAdmin",
      value: MsgUpdateAdmin.encode(message).finish()
    };
  }
};
function createBaseMsgUpdateAdminResponse(): MsgUpdateAdminResponse {
  return {};
}
export const MsgUpdateAdminResponse = {
  typeUrl: "/cosmwasm.wasm.v1.MsgUpdateAdminResponse",
  encode(_: MsgUpdateAdminResponse, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgUpdateAdminResponse {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateAdminResponse();
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
  fromPartial(_: Partial<MsgUpdateAdminResponse>): MsgUpdateAdminResponse {
    const message = createBaseMsgUpdateAdminResponse();
    return message;
  },
  fromAmino(_: MsgUpdateAdminResponseAmino): MsgUpdateAdminResponse {
    return {};
  },
  toAmino(_: MsgUpdateAdminResponse, useInterfaces: boolean = false): MsgUpdateAdminResponseAmino {
    const obj: any = {};
    return obj;
  },
  fromAminoMsg(object: MsgUpdateAdminResponseAminoMsg): MsgUpdateAdminResponse {
    return MsgUpdateAdminResponse.fromAmino(object.value);
  },
  toAminoMsg(message: MsgUpdateAdminResponse, useInterfaces: boolean = false): MsgUpdateAdminResponseAminoMsg {
    return {
      type: "wasm/MsgUpdateAdminResponse",
      value: MsgUpdateAdminResponse.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgUpdateAdminResponseProtoMsg, useInterfaces: boolean = false): MsgUpdateAdminResponse {
    return MsgUpdateAdminResponse.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgUpdateAdminResponse): Uint8Array {
    return MsgUpdateAdminResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgUpdateAdminResponse): MsgUpdateAdminResponseProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgUpdateAdminResponse",
      value: MsgUpdateAdminResponse.encode(message).finish()
    };
  }
};
function createBaseMsgClearAdmin(): MsgClearAdmin {
  return {
    sender: "",
    contract: ""
  };
}
export const MsgClearAdmin = {
  typeUrl: "/cosmwasm.wasm.v1.MsgClearAdmin",
  encode(message: MsgClearAdmin, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.sender !== "") {
      writer.uint32(10).string(message.sender);
    }
    if (message.contract !== "") {
      writer.uint32(26).string(message.contract);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgClearAdmin {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgClearAdmin();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.sender = reader.string();
          break;
        case 3:
          message.contract = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<MsgClearAdmin>): MsgClearAdmin {
    const message = createBaseMsgClearAdmin();
    message.sender = object.sender ?? "";
    message.contract = object.contract ?? "";
    return message;
  },
  fromAmino(object: MsgClearAdminAmino): MsgClearAdmin {
    return {
      sender: object.sender,
      contract: object.contract
    };
  },
  toAmino(message: MsgClearAdmin, useInterfaces: boolean = false): MsgClearAdminAmino {
    const obj: any = {};
    obj.sender = message.sender;
    obj.contract = message.contract;
    return obj;
  },
  fromAminoMsg(object: MsgClearAdminAminoMsg): MsgClearAdmin {
    return MsgClearAdmin.fromAmino(object.value);
  },
  toAminoMsg(message: MsgClearAdmin, useInterfaces: boolean = false): MsgClearAdminAminoMsg {
    return {
      type: "wasm/MsgClearAdmin",
      value: MsgClearAdmin.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgClearAdminProtoMsg, useInterfaces: boolean = false): MsgClearAdmin {
    return MsgClearAdmin.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgClearAdmin): Uint8Array {
    return MsgClearAdmin.encode(message).finish();
  },
  toProtoMsg(message: MsgClearAdmin): MsgClearAdminProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgClearAdmin",
      value: MsgClearAdmin.encode(message).finish()
    };
  }
};
function createBaseMsgClearAdminResponse(): MsgClearAdminResponse {
  return {};
}
export const MsgClearAdminResponse = {
  typeUrl: "/cosmwasm.wasm.v1.MsgClearAdminResponse",
  encode(_: MsgClearAdminResponse, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgClearAdminResponse {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgClearAdminResponse();
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
  fromPartial(_: Partial<MsgClearAdminResponse>): MsgClearAdminResponse {
    const message = createBaseMsgClearAdminResponse();
    return message;
  },
  fromAmino(_: MsgClearAdminResponseAmino): MsgClearAdminResponse {
    return {};
  },
  toAmino(_: MsgClearAdminResponse, useInterfaces: boolean = false): MsgClearAdminResponseAmino {
    const obj: any = {};
    return obj;
  },
  fromAminoMsg(object: MsgClearAdminResponseAminoMsg): MsgClearAdminResponse {
    return MsgClearAdminResponse.fromAmino(object.value);
  },
  toAminoMsg(message: MsgClearAdminResponse, useInterfaces: boolean = false): MsgClearAdminResponseAminoMsg {
    return {
      type: "wasm/MsgClearAdminResponse",
      value: MsgClearAdminResponse.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgClearAdminResponseProtoMsg, useInterfaces: boolean = false): MsgClearAdminResponse {
    return MsgClearAdminResponse.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgClearAdminResponse): Uint8Array {
    return MsgClearAdminResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgClearAdminResponse): MsgClearAdminResponseProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgClearAdminResponse",
      value: MsgClearAdminResponse.encode(message).finish()
    };
  }
};
function createBaseAccessConfigUpdate(): AccessConfigUpdate {
  return {
    codeId: BigInt(0),
    instantiatePermission: AccessConfig.fromPartial({})
  };
}
export const AccessConfigUpdate = {
  typeUrl: "/cosmwasm.wasm.v1.AccessConfigUpdate",
  encode(message: AccessConfigUpdate, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.codeId !== BigInt(0)) {
      writer.uint32(8).uint64(message.codeId);
    }
    if (message.instantiatePermission !== undefined) {
      AccessConfig.encode(message.instantiatePermission, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): AccessConfigUpdate {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAccessConfigUpdate();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.codeId = reader.uint64();
          break;
        case 2:
          message.instantiatePermission = AccessConfig.decode(reader, reader.uint32(), useInterfaces);
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<AccessConfigUpdate>): AccessConfigUpdate {
    const message = createBaseAccessConfigUpdate();
    message.codeId = object.codeId !== undefined && object.codeId !== null ? BigInt(object.codeId.toString()) : BigInt(0);
    message.instantiatePermission = object.instantiatePermission !== undefined && object.instantiatePermission !== null ? AccessConfig.fromPartial(object.instantiatePermission) : undefined;
    return message;
  },
  fromAmino(object: AccessConfigUpdateAmino): AccessConfigUpdate {
    return {
      codeId: BigInt(object.code_id),
      instantiatePermission: object?.instantiate_permission ? AccessConfig.fromAmino(object.instantiate_permission) : undefined
    };
  },
  toAmino(message: AccessConfigUpdate, useInterfaces: boolean = false): AccessConfigUpdateAmino {
    const obj: any = {};
    obj.code_id = message.codeId ? message.codeId.toString() : undefined;
    obj.instantiate_permission = message.instantiatePermission ? AccessConfig.toAmino(message.instantiatePermission, useInterfaces) : undefined;
    return obj;
  },
  fromAminoMsg(object: AccessConfigUpdateAminoMsg): AccessConfigUpdate {
    return AccessConfigUpdate.fromAmino(object.value);
  },
  toAminoMsg(message: AccessConfigUpdate, useInterfaces: boolean = false): AccessConfigUpdateAminoMsg {
    return {
      type: "wasm/AccessConfigUpdate",
      value: AccessConfigUpdate.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: AccessConfigUpdateProtoMsg, useInterfaces: boolean = false): AccessConfigUpdate {
    return AccessConfigUpdate.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: AccessConfigUpdate): Uint8Array {
    return AccessConfigUpdate.encode(message).finish();
  },
  toProtoMsg(message: AccessConfigUpdate): AccessConfigUpdateProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.AccessConfigUpdate",
      value: AccessConfigUpdate.encode(message).finish()
    };
  }
};
function createBaseMsgUpdateInstantiateConfig(): MsgUpdateInstantiateConfig {
  return {
    sender: "",
    codeId: BigInt(0),
    newInstantiatePermission: undefined
  };
}
export const MsgUpdateInstantiateConfig = {
  typeUrl: "/cosmwasm.wasm.v1.MsgUpdateInstantiateConfig",
  encode(message: MsgUpdateInstantiateConfig, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.sender !== "") {
      writer.uint32(10).string(message.sender);
    }
    if (message.codeId !== BigInt(0)) {
      writer.uint32(16).uint64(message.codeId);
    }
    if (message.newInstantiatePermission !== undefined) {
      AccessConfig.encode(message.newInstantiatePermission, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgUpdateInstantiateConfig {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateInstantiateConfig();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.sender = reader.string();
          break;
        case 2:
          message.codeId = reader.uint64();
          break;
        case 3:
          message.newInstantiatePermission = AccessConfig.decode(reader, reader.uint32(), useInterfaces);
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<MsgUpdateInstantiateConfig>): MsgUpdateInstantiateConfig {
    const message = createBaseMsgUpdateInstantiateConfig();
    message.sender = object.sender ?? "";
    message.codeId = object.codeId !== undefined && object.codeId !== null ? BigInt(object.codeId.toString()) : BigInt(0);
    message.newInstantiatePermission = object.newInstantiatePermission !== undefined && object.newInstantiatePermission !== null ? AccessConfig.fromPartial(object.newInstantiatePermission) : undefined;
    return message;
  },
  fromAmino(object: MsgUpdateInstantiateConfigAmino): MsgUpdateInstantiateConfig {
    return {
      sender: object.sender,
      codeId: BigInt(object.code_id),
      newInstantiatePermission: object?.new_instantiate_permission ? AccessConfig.fromAmino(object.new_instantiate_permission) : undefined
    };
  },
  toAmino(message: MsgUpdateInstantiateConfig, useInterfaces: boolean = false): MsgUpdateInstantiateConfigAmino {
    const obj: any = {};
    obj.sender = message.sender;
    obj.code_id = message.codeId ? message.codeId.toString() : undefined;
    obj.new_instantiate_permission = message.newInstantiatePermission ? AccessConfig.toAmino(message.newInstantiatePermission, useInterfaces) : undefined;
    return obj;
  },
  fromAminoMsg(object: MsgUpdateInstantiateConfigAminoMsg): MsgUpdateInstantiateConfig {
    return MsgUpdateInstantiateConfig.fromAmino(object.value);
  },
  toAminoMsg(message: MsgUpdateInstantiateConfig, useInterfaces: boolean = false): MsgUpdateInstantiateConfigAminoMsg {
    return {
      type: "wasm/MsgUpdateInstantiateConfig",
      value: MsgUpdateInstantiateConfig.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgUpdateInstantiateConfigProtoMsg, useInterfaces: boolean = false): MsgUpdateInstantiateConfig {
    return MsgUpdateInstantiateConfig.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgUpdateInstantiateConfig): Uint8Array {
    return MsgUpdateInstantiateConfig.encode(message).finish();
  },
  toProtoMsg(message: MsgUpdateInstantiateConfig): MsgUpdateInstantiateConfigProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgUpdateInstantiateConfig",
      value: MsgUpdateInstantiateConfig.encode(message).finish()
    };
  }
};
function createBaseMsgUpdateInstantiateConfigResponse(): MsgUpdateInstantiateConfigResponse {
  return {};
}
export const MsgUpdateInstantiateConfigResponse = {
  typeUrl: "/cosmwasm.wasm.v1.MsgUpdateInstantiateConfigResponse",
  encode(_: MsgUpdateInstantiateConfigResponse, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgUpdateInstantiateConfigResponse {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateInstantiateConfigResponse();
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
  fromPartial(_: Partial<MsgUpdateInstantiateConfigResponse>): MsgUpdateInstantiateConfigResponse {
    const message = createBaseMsgUpdateInstantiateConfigResponse();
    return message;
  },
  fromAmino(_: MsgUpdateInstantiateConfigResponseAmino): MsgUpdateInstantiateConfigResponse {
    return {};
  },
  toAmino(_: MsgUpdateInstantiateConfigResponse, useInterfaces: boolean = false): MsgUpdateInstantiateConfigResponseAmino {
    const obj: any = {};
    return obj;
  },
  fromAminoMsg(object: MsgUpdateInstantiateConfigResponseAminoMsg): MsgUpdateInstantiateConfigResponse {
    return MsgUpdateInstantiateConfigResponse.fromAmino(object.value);
  },
  toAminoMsg(message: MsgUpdateInstantiateConfigResponse, useInterfaces: boolean = false): MsgUpdateInstantiateConfigResponseAminoMsg {
    return {
      type: "wasm/MsgUpdateInstantiateConfigResponse",
      value: MsgUpdateInstantiateConfigResponse.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgUpdateInstantiateConfigResponseProtoMsg, useInterfaces: boolean = false): MsgUpdateInstantiateConfigResponse {
    return MsgUpdateInstantiateConfigResponse.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgUpdateInstantiateConfigResponse): Uint8Array {
    return MsgUpdateInstantiateConfigResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgUpdateInstantiateConfigResponse): MsgUpdateInstantiateConfigResponseProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgUpdateInstantiateConfigResponse",
      value: MsgUpdateInstantiateConfigResponse.encode(message).finish()
    };
  }
};
function createBaseMsgUpdateParams(): MsgUpdateParams {
  return {
    authority: "",
    params: Params.fromPartial({})
  };
}
export const MsgUpdateParams = {
  typeUrl: "/cosmwasm.wasm.v1.MsgUpdateParams",
  encode(message: MsgUpdateParams, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.authority !== "") {
      writer.uint32(10).string(message.authority);
    }
    if (message.params !== undefined) {
      Params.encode(message.params, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgUpdateParams {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateParams();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.authority = reader.string();
          break;
        case 2:
          message.params = Params.decode(reader, reader.uint32(), useInterfaces);
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<MsgUpdateParams>): MsgUpdateParams {
    const message = createBaseMsgUpdateParams();
    message.authority = object.authority ?? "";
    message.params = object.params !== undefined && object.params !== null ? Params.fromPartial(object.params) : undefined;
    return message;
  },
  fromAmino(object: MsgUpdateParamsAmino): MsgUpdateParams {
    return {
      authority: object.authority,
      params: object?.params ? Params.fromAmino(object.params) : undefined
    };
  },
  toAmino(message: MsgUpdateParams, useInterfaces: boolean = false): MsgUpdateParamsAmino {
    const obj: any = {};
    obj.authority = message.authority;
    obj.params = message.params ? Params.toAmino(message.params, useInterfaces) : undefined;
    return obj;
  },
  fromAminoMsg(object: MsgUpdateParamsAminoMsg): MsgUpdateParams {
    return MsgUpdateParams.fromAmino(object.value);
  },
  toAminoMsg(message: MsgUpdateParams, useInterfaces: boolean = false): MsgUpdateParamsAminoMsg {
    return {
      type: "wasm/MsgUpdateParams",
      value: MsgUpdateParams.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgUpdateParamsProtoMsg, useInterfaces: boolean = false): MsgUpdateParams {
    return MsgUpdateParams.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgUpdateParams): Uint8Array {
    return MsgUpdateParams.encode(message).finish();
  },
  toProtoMsg(message: MsgUpdateParams): MsgUpdateParamsProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgUpdateParams",
      value: MsgUpdateParams.encode(message).finish()
    };
  }
};
function createBaseMsgUpdateParamsResponse(): MsgUpdateParamsResponse {
  return {};
}
export const MsgUpdateParamsResponse = {
  typeUrl: "/cosmwasm.wasm.v1.MsgUpdateParamsResponse",
  encode(_: MsgUpdateParamsResponse, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgUpdateParamsResponse {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateParamsResponse();
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
  fromPartial(_: Partial<MsgUpdateParamsResponse>): MsgUpdateParamsResponse {
    const message = createBaseMsgUpdateParamsResponse();
    return message;
  },
  fromAmino(_: MsgUpdateParamsResponseAmino): MsgUpdateParamsResponse {
    return {};
  },
  toAmino(_: MsgUpdateParamsResponse, useInterfaces: boolean = false): MsgUpdateParamsResponseAmino {
    const obj: any = {};
    return obj;
  },
  fromAminoMsg(object: MsgUpdateParamsResponseAminoMsg): MsgUpdateParamsResponse {
    return MsgUpdateParamsResponse.fromAmino(object.value);
  },
  toAminoMsg(message: MsgUpdateParamsResponse, useInterfaces: boolean = false): MsgUpdateParamsResponseAminoMsg {
    return {
      type: "wasm/MsgUpdateParamsResponse",
      value: MsgUpdateParamsResponse.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgUpdateParamsResponseProtoMsg, useInterfaces: boolean = false): MsgUpdateParamsResponse {
    return MsgUpdateParamsResponse.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgUpdateParamsResponse): Uint8Array {
    return MsgUpdateParamsResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgUpdateParamsResponse): MsgUpdateParamsResponseProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgUpdateParamsResponse",
      value: MsgUpdateParamsResponse.encode(message).finish()
    };
  }
};
function createBaseMsgSudoContract(): MsgSudoContract {
  return {
    authority: "",
    contract: "",
    msg: new Uint8Array()
  };
}
export const MsgSudoContract = {
  typeUrl: "/cosmwasm.wasm.v1.MsgSudoContract",
  encode(message: MsgSudoContract, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.authority !== "") {
      writer.uint32(10).string(message.authority);
    }
    if (message.contract !== "") {
      writer.uint32(18).string(message.contract);
    }
    if (message.msg.length !== 0) {
      writer.uint32(26).bytes(message.msg);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgSudoContract {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSudoContract();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.authority = reader.string();
          break;
        case 2:
          message.contract = reader.string();
          break;
        case 3:
          message.msg = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<MsgSudoContract>): MsgSudoContract {
    const message = createBaseMsgSudoContract();
    message.authority = object.authority ?? "";
    message.contract = object.contract ?? "";
    message.msg = object.msg ?? new Uint8Array();
    return message;
  },
  fromAmino(object: MsgSudoContractAmino): MsgSudoContract {
    return {
      authority: object.authority,
      contract: object.contract,
      msg: toUtf8(JSON.stringify(object.msg))
    };
  },
  toAmino(message: MsgSudoContract, useInterfaces: boolean = false): MsgSudoContractAmino {
    const obj: any = {};
    obj.authority = message.authority;
    obj.contract = message.contract;
    obj.msg = message.msg ? JSON.parse(fromUtf8(message.msg)) : undefined;
    return obj;
  },
  fromAminoMsg(object: MsgSudoContractAminoMsg): MsgSudoContract {
    return MsgSudoContract.fromAmino(object.value);
  },
  toAminoMsg(message: MsgSudoContract, useInterfaces: boolean = false): MsgSudoContractAminoMsg {
    return {
      type: "wasm/MsgSudoContract",
      value: MsgSudoContract.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgSudoContractProtoMsg, useInterfaces: boolean = false): MsgSudoContract {
    return MsgSudoContract.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgSudoContract): Uint8Array {
    return MsgSudoContract.encode(message).finish();
  },
  toProtoMsg(message: MsgSudoContract): MsgSudoContractProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgSudoContract",
      value: MsgSudoContract.encode(message).finish()
    };
  }
};
function createBaseMsgSudoContractResponse(): MsgSudoContractResponse {
  return {
    data: new Uint8Array()
  };
}
export const MsgSudoContractResponse = {
  typeUrl: "/cosmwasm.wasm.v1.MsgSudoContractResponse",
  encode(message: MsgSudoContractResponse, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.data.length !== 0) {
      writer.uint32(10).bytes(message.data);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgSudoContractResponse {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSudoContractResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.data = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<MsgSudoContractResponse>): MsgSudoContractResponse {
    const message = createBaseMsgSudoContractResponse();
    message.data = object.data ?? new Uint8Array();
    return message;
  },
  fromAmino(object: MsgSudoContractResponseAmino): MsgSudoContractResponse {
    return {
      data: object.data
    };
  },
  toAmino(message: MsgSudoContractResponse, useInterfaces: boolean = false): MsgSudoContractResponseAmino {
    const obj: any = {};
    obj.data = message.data;
    return obj;
  },
  fromAminoMsg(object: MsgSudoContractResponseAminoMsg): MsgSudoContractResponse {
    return MsgSudoContractResponse.fromAmino(object.value);
  },
  toAminoMsg(message: MsgSudoContractResponse, useInterfaces: boolean = false): MsgSudoContractResponseAminoMsg {
    return {
      type: "wasm/MsgSudoContractResponse",
      value: MsgSudoContractResponse.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgSudoContractResponseProtoMsg, useInterfaces: boolean = false): MsgSudoContractResponse {
    return MsgSudoContractResponse.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgSudoContractResponse): Uint8Array {
    return MsgSudoContractResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgSudoContractResponse): MsgSudoContractResponseProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgSudoContractResponse",
      value: MsgSudoContractResponse.encode(message).finish()
    };
  }
};
function createBaseMsgPinCodes(): MsgPinCodes {
  return {
    authority: "",
    codeIds: []
  };
}
export const MsgPinCodes = {
  typeUrl: "/cosmwasm.wasm.v1.MsgPinCodes",
  encode(message: MsgPinCodes, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.authority !== "") {
      writer.uint32(10).string(message.authority);
    }
    writer.uint32(18).fork();
    for (const v of message.codeIds) {
      writer.uint64(v);
    }
    writer.ldelim();
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgPinCodes {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgPinCodes();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.authority = reader.string();
          break;
        case 2:
          if ((tag & 7) === 2) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.codeIds.push(reader.uint64());
            }
          } else {
            message.codeIds.push(reader.uint64());
          }
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<MsgPinCodes>): MsgPinCodes {
    const message = createBaseMsgPinCodes();
    message.authority = object.authority ?? "";
    message.codeIds = object.codeIds?.map(e => BigInt(e.toString())) || [];
    return message;
  },
  fromAmino(object: MsgPinCodesAmino): MsgPinCodes {
    return {
      authority: object.authority,
      codeIds: Array.isArray(object?.code_ids) ? object.code_ids.map((e: any) => BigInt(e)) : []
    };
  },
  toAmino(message: MsgPinCodes, useInterfaces: boolean = false): MsgPinCodesAmino {
    const obj: any = {};
    obj.authority = message.authority;
    if (message.codeIds) {
      obj.code_ids = message.codeIds.map(e => e.toString());
    } else {
      obj.code_ids = [];
    }
    return obj;
  },
  fromAminoMsg(object: MsgPinCodesAminoMsg): MsgPinCodes {
    return MsgPinCodes.fromAmino(object.value);
  },
  toAminoMsg(message: MsgPinCodes, useInterfaces: boolean = false): MsgPinCodesAminoMsg {
    return {
      type: "wasm/MsgPinCodes",
      value: MsgPinCodes.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgPinCodesProtoMsg, useInterfaces: boolean = false): MsgPinCodes {
    return MsgPinCodes.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgPinCodes): Uint8Array {
    return MsgPinCodes.encode(message).finish();
  },
  toProtoMsg(message: MsgPinCodes): MsgPinCodesProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgPinCodes",
      value: MsgPinCodes.encode(message).finish()
    };
  }
};
function createBaseMsgPinCodesResponse(): MsgPinCodesResponse {
  return {};
}
export const MsgPinCodesResponse = {
  typeUrl: "/cosmwasm.wasm.v1.MsgPinCodesResponse",
  encode(_: MsgPinCodesResponse, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgPinCodesResponse {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgPinCodesResponse();
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
  fromPartial(_: Partial<MsgPinCodesResponse>): MsgPinCodesResponse {
    const message = createBaseMsgPinCodesResponse();
    return message;
  },
  fromAmino(_: MsgPinCodesResponseAmino): MsgPinCodesResponse {
    return {};
  },
  toAmino(_: MsgPinCodesResponse, useInterfaces: boolean = false): MsgPinCodesResponseAmino {
    const obj: any = {};
    return obj;
  },
  fromAminoMsg(object: MsgPinCodesResponseAminoMsg): MsgPinCodesResponse {
    return MsgPinCodesResponse.fromAmino(object.value);
  },
  toAminoMsg(message: MsgPinCodesResponse, useInterfaces: boolean = false): MsgPinCodesResponseAminoMsg {
    return {
      type: "wasm/MsgPinCodesResponse",
      value: MsgPinCodesResponse.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgPinCodesResponseProtoMsg, useInterfaces: boolean = false): MsgPinCodesResponse {
    return MsgPinCodesResponse.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgPinCodesResponse): Uint8Array {
    return MsgPinCodesResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgPinCodesResponse): MsgPinCodesResponseProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgPinCodesResponse",
      value: MsgPinCodesResponse.encode(message).finish()
    };
  }
};
function createBaseMsgUnpinCodes(): MsgUnpinCodes {
  return {
    authority: "",
    codeIds: []
  };
}
export const MsgUnpinCodes = {
  typeUrl: "/cosmwasm.wasm.v1.MsgUnpinCodes",
  encode(message: MsgUnpinCodes, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.authority !== "") {
      writer.uint32(10).string(message.authority);
    }
    writer.uint32(18).fork();
    for (const v of message.codeIds) {
      writer.uint64(v);
    }
    writer.ldelim();
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgUnpinCodes {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUnpinCodes();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.authority = reader.string();
          break;
        case 2:
          if ((tag & 7) === 2) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.codeIds.push(reader.uint64());
            }
          } else {
            message.codeIds.push(reader.uint64());
          }
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<MsgUnpinCodes>): MsgUnpinCodes {
    const message = createBaseMsgUnpinCodes();
    message.authority = object.authority ?? "";
    message.codeIds = object.codeIds?.map(e => BigInt(e.toString())) || [];
    return message;
  },
  fromAmino(object: MsgUnpinCodesAmino): MsgUnpinCodes {
    return {
      authority: object.authority,
      codeIds: Array.isArray(object?.code_ids) ? object.code_ids.map((e: any) => BigInt(e)) : []
    };
  },
  toAmino(message: MsgUnpinCodes, useInterfaces: boolean = false): MsgUnpinCodesAmino {
    const obj: any = {};
    obj.authority = message.authority;
    if (message.codeIds) {
      obj.code_ids = message.codeIds.map(e => e.toString());
    } else {
      obj.code_ids = [];
    }
    return obj;
  },
  fromAminoMsg(object: MsgUnpinCodesAminoMsg): MsgUnpinCodes {
    return MsgUnpinCodes.fromAmino(object.value);
  },
  toAminoMsg(message: MsgUnpinCodes, useInterfaces: boolean = false): MsgUnpinCodesAminoMsg {
    return {
      type: "wasm/MsgUnpinCodes",
      value: MsgUnpinCodes.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgUnpinCodesProtoMsg, useInterfaces: boolean = false): MsgUnpinCodes {
    return MsgUnpinCodes.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgUnpinCodes): Uint8Array {
    return MsgUnpinCodes.encode(message).finish();
  },
  toProtoMsg(message: MsgUnpinCodes): MsgUnpinCodesProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgUnpinCodes",
      value: MsgUnpinCodes.encode(message).finish()
    };
  }
};
function createBaseMsgUnpinCodesResponse(): MsgUnpinCodesResponse {
  return {};
}
export const MsgUnpinCodesResponse = {
  typeUrl: "/cosmwasm.wasm.v1.MsgUnpinCodesResponse",
  encode(_: MsgUnpinCodesResponse, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgUnpinCodesResponse {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUnpinCodesResponse();
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
  fromPartial(_: Partial<MsgUnpinCodesResponse>): MsgUnpinCodesResponse {
    const message = createBaseMsgUnpinCodesResponse();
    return message;
  },
  fromAmino(_: MsgUnpinCodesResponseAmino): MsgUnpinCodesResponse {
    return {};
  },
  toAmino(_: MsgUnpinCodesResponse, useInterfaces: boolean = false): MsgUnpinCodesResponseAmino {
    const obj: any = {};
    return obj;
  },
  fromAminoMsg(object: MsgUnpinCodesResponseAminoMsg): MsgUnpinCodesResponse {
    return MsgUnpinCodesResponse.fromAmino(object.value);
  },
  toAminoMsg(message: MsgUnpinCodesResponse, useInterfaces: boolean = false): MsgUnpinCodesResponseAminoMsg {
    return {
      type: "wasm/MsgUnpinCodesResponse",
      value: MsgUnpinCodesResponse.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgUnpinCodesResponseProtoMsg, useInterfaces: boolean = false): MsgUnpinCodesResponse {
    return MsgUnpinCodesResponse.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgUnpinCodesResponse): Uint8Array {
    return MsgUnpinCodesResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgUnpinCodesResponse): MsgUnpinCodesResponseProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgUnpinCodesResponse",
      value: MsgUnpinCodesResponse.encode(message).finish()
    };
  }
};
function createBaseMsgStoreAndInstantiateContract(): MsgStoreAndInstantiateContract {
  return {
    authority: "",
    wasmByteCode: new Uint8Array(),
    instantiatePermission: undefined,
    unpinCode: false,
    admin: "",
    label: "",
    msg: new Uint8Array(),
    funds: [],
    source: "",
    builder: "",
    codeHash: new Uint8Array()
  };
}
export const MsgStoreAndInstantiateContract = {
  typeUrl: "/cosmwasm.wasm.v1.MsgStoreAndInstantiateContract",
  encode(message: MsgStoreAndInstantiateContract, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.authority !== "") {
      writer.uint32(10).string(message.authority);
    }
    if (message.wasmByteCode.length !== 0) {
      writer.uint32(26).bytes(message.wasmByteCode);
    }
    if (message.instantiatePermission !== undefined) {
      AccessConfig.encode(message.instantiatePermission, writer.uint32(34).fork()).ldelim();
    }
    if (message.unpinCode === true) {
      writer.uint32(40).bool(message.unpinCode);
    }
    if (message.admin !== "") {
      writer.uint32(50).string(message.admin);
    }
    if (message.label !== "") {
      writer.uint32(58).string(message.label);
    }
    if (message.msg.length !== 0) {
      writer.uint32(66).bytes(message.msg);
    }
    for (const v of message.funds) {
      Coin.encode(v!, writer.uint32(74).fork()).ldelim();
    }
    if (message.source !== "") {
      writer.uint32(82).string(message.source);
    }
    if (message.builder !== "") {
      writer.uint32(90).string(message.builder);
    }
    if (message.codeHash.length !== 0) {
      writer.uint32(98).bytes(message.codeHash);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgStoreAndInstantiateContract {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgStoreAndInstantiateContract();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.authority = reader.string();
          break;
        case 3:
          message.wasmByteCode = reader.bytes();
          break;
        case 4:
          message.instantiatePermission = AccessConfig.decode(reader, reader.uint32(), useInterfaces);
          break;
        case 5:
          message.unpinCode = reader.bool();
          break;
        case 6:
          message.admin = reader.string();
          break;
        case 7:
          message.label = reader.string();
          break;
        case 8:
          message.msg = reader.bytes();
          break;
        case 9:
          message.funds.push(Coin.decode(reader, reader.uint32(), useInterfaces));
          break;
        case 10:
          message.source = reader.string();
          break;
        case 11:
          message.builder = reader.string();
          break;
        case 12:
          message.codeHash = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<MsgStoreAndInstantiateContract>): MsgStoreAndInstantiateContract {
    const message = createBaseMsgStoreAndInstantiateContract();
    message.authority = object.authority ?? "";
    message.wasmByteCode = object.wasmByteCode ?? new Uint8Array();
    message.instantiatePermission = object.instantiatePermission !== undefined && object.instantiatePermission !== null ? AccessConfig.fromPartial(object.instantiatePermission) : undefined;
    message.unpinCode = object.unpinCode ?? false;
    message.admin = object.admin ?? "";
    message.label = object.label ?? "";
    message.msg = object.msg ?? new Uint8Array();
    message.funds = object.funds?.map(e => Coin.fromPartial(e)) || [];
    message.source = object.source ?? "";
    message.builder = object.builder ?? "";
    message.codeHash = object.codeHash ?? new Uint8Array();
    return message;
  },
  fromAmino(object: MsgStoreAndInstantiateContractAmino): MsgStoreAndInstantiateContract {
    return {
      authority: object.authority,
      wasmByteCode: fromBase64(object.wasm_byte_code),
      instantiatePermission: object?.instantiate_permission ? AccessConfig.fromAmino(object.instantiate_permission) : undefined,
      unpinCode: object.unpin_code,
      admin: object.admin,
      label: object.label,
      msg: toUtf8(JSON.stringify(object.msg)),
      funds: Array.isArray(object?.funds) ? object.funds.map((e: any) => Coin.fromAmino(e)) : [],
      source: object.source,
      builder: object.builder,
      codeHash: object.code_hash
    };
  },
  toAmino(message: MsgStoreAndInstantiateContract, useInterfaces: boolean = false): MsgStoreAndInstantiateContractAmino {
    const obj: any = {};
    obj.authority = message.authority;
    obj.wasm_byte_code = message.wasmByteCode ? toBase64(message.wasmByteCode) : undefined;
    obj.instantiate_permission = message.instantiatePermission ? AccessConfig.toAmino(message.instantiatePermission, useInterfaces) : undefined;
    obj.unpin_code = message.unpinCode;
    obj.admin = message.admin;
    obj.label = message.label;
    obj.msg = message.msg ? JSON.parse(fromUtf8(message.msg)) : undefined;
    if (message.funds) {
      obj.funds = message.funds.map(e => e ? Coin.toAmino(e, useInterfaces) : undefined);
    } else {
      obj.funds = [];
    }
    obj.source = message.source;
    obj.builder = message.builder;
    obj.code_hash = message.codeHash;
    return obj;
  },
  fromAminoMsg(object: MsgStoreAndInstantiateContractAminoMsg): MsgStoreAndInstantiateContract {
    return MsgStoreAndInstantiateContract.fromAmino(object.value);
  },
  toAminoMsg(message: MsgStoreAndInstantiateContract, useInterfaces: boolean = false): MsgStoreAndInstantiateContractAminoMsg {
    return {
      type: "wasm/MsgStoreAndInstantiateContract",
      value: MsgStoreAndInstantiateContract.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgStoreAndInstantiateContractProtoMsg, useInterfaces: boolean = false): MsgStoreAndInstantiateContract {
    return MsgStoreAndInstantiateContract.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgStoreAndInstantiateContract): Uint8Array {
    return MsgStoreAndInstantiateContract.encode(message).finish();
  },
  toProtoMsg(message: MsgStoreAndInstantiateContract): MsgStoreAndInstantiateContractProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgStoreAndInstantiateContract",
      value: MsgStoreAndInstantiateContract.encode(message).finish()
    };
  }
};
function createBaseMsgStoreAndInstantiateContractResponse(): MsgStoreAndInstantiateContractResponse {
  return {
    address: "",
    data: new Uint8Array()
  };
}
export const MsgStoreAndInstantiateContractResponse = {
  typeUrl: "/cosmwasm.wasm.v1.MsgStoreAndInstantiateContractResponse",
  encode(message: MsgStoreAndInstantiateContractResponse, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.address !== "") {
      writer.uint32(10).string(message.address);
    }
    if (message.data.length !== 0) {
      writer.uint32(18).bytes(message.data);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgStoreAndInstantiateContractResponse {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgStoreAndInstantiateContractResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.address = reader.string();
          break;
        case 2:
          message.data = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<MsgStoreAndInstantiateContractResponse>): MsgStoreAndInstantiateContractResponse {
    const message = createBaseMsgStoreAndInstantiateContractResponse();
    message.address = object.address ?? "";
    message.data = object.data ?? new Uint8Array();
    return message;
  },
  fromAmino(object: MsgStoreAndInstantiateContractResponseAmino): MsgStoreAndInstantiateContractResponse {
    return {
      address: object.address,
      data: object.data
    };
  },
  toAmino(message: MsgStoreAndInstantiateContractResponse, useInterfaces: boolean = false): MsgStoreAndInstantiateContractResponseAmino {
    const obj: any = {};
    obj.address = message.address;
    obj.data = message.data;
    return obj;
  },
  fromAminoMsg(object: MsgStoreAndInstantiateContractResponseAminoMsg): MsgStoreAndInstantiateContractResponse {
    return MsgStoreAndInstantiateContractResponse.fromAmino(object.value);
  },
  toAminoMsg(message: MsgStoreAndInstantiateContractResponse, useInterfaces: boolean = false): MsgStoreAndInstantiateContractResponseAminoMsg {
    return {
      type: "wasm/MsgStoreAndInstantiateContractResponse",
      value: MsgStoreAndInstantiateContractResponse.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgStoreAndInstantiateContractResponseProtoMsg, useInterfaces: boolean = false): MsgStoreAndInstantiateContractResponse {
    return MsgStoreAndInstantiateContractResponse.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgStoreAndInstantiateContractResponse): Uint8Array {
    return MsgStoreAndInstantiateContractResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgStoreAndInstantiateContractResponse): MsgStoreAndInstantiateContractResponseProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgStoreAndInstantiateContractResponse",
      value: MsgStoreAndInstantiateContractResponse.encode(message).finish()
    };
  }
};
function createBaseMsgAddCodeUploadParamsAddresses(): MsgAddCodeUploadParamsAddresses {
  return {
    authority: "",
    addresses: []
  };
}
export const MsgAddCodeUploadParamsAddresses = {
  typeUrl: "/cosmwasm.wasm.v1.MsgAddCodeUploadParamsAddresses",
  encode(message: MsgAddCodeUploadParamsAddresses, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.authority !== "") {
      writer.uint32(10).string(message.authority);
    }
    for (const v of message.addresses) {
      writer.uint32(18).string(v!);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgAddCodeUploadParamsAddresses {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgAddCodeUploadParamsAddresses();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.authority = reader.string();
          break;
        case 2:
          message.addresses.push(reader.string());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<MsgAddCodeUploadParamsAddresses>): MsgAddCodeUploadParamsAddresses {
    const message = createBaseMsgAddCodeUploadParamsAddresses();
    message.authority = object.authority ?? "";
    message.addresses = object.addresses?.map(e => e) || [];
    return message;
  },
  fromAmino(object: MsgAddCodeUploadParamsAddressesAmino): MsgAddCodeUploadParamsAddresses {
    return {
      authority: object.authority,
      addresses: Array.isArray(object?.addresses) ? object.addresses.map((e: any) => e) : []
    };
  },
  toAmino(message: MsgAddCodeUploadParamsAddresses, useInterfaces: boolean = false): MsgAddCodeUploadParamsAddressesAmino {
    const obj: any = {};
    obj.authority = message.authority;
    if (message.addresses) {
      obj.addresses = message.addresses.map(e => e);
    } else {
      obj.addresses = [];
    }
    return obj;
  },
  fromAminoMsg(object: MsgAddCodeUploadParamsAddressesAminoMsg): MsgAddCodeUploadParamsAddresses {
    return MsgAddCodeUploadParamsAddresses.fromAmino(object.value);
  },
  toAminoMsg(message: MsgAddCodeUploadParamsAddresses, useInterfaces: boolean = false): MsgAddCodeUploadParamsAddressesAminoMsg {
    return {
      type: "wasm/MsgAddCodeUploadParamsAddresses",
      value: MsgAddCodeUploadParamsAddresses.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgAddCodeUploadParamsAddressesProtoMsg, useInterfaces: boolean = false): MsgAddCodeUploadParamsAddresses {
    return MsgAddCodeUploadParamsAddresses.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgAddCodeUploadParamsAddresses): Uint8Array {
    return MsgAddCodeUploadParamsAddresses.encode(message).finish();
  },
  toProtoMsg(message: MsgAddCodeUploadParamsAddresses): MsgAddCodeUploadParamsAddressesProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgAddCodeUploadParamsAddresses",
      value: MsgAddCodeUploadParamsAddresses.encode(message).finish()
    };
  }
};
function createBaseMsgAddCodeUploadParamsAddressesResponse(): MsgAddCodeUploadParamsAddressesResponse {
  return {};
}
export const MsgAddCodeUploadParamsAddressesResponse = {
  typeUrl: "/cosmwasm.wasm.v1.MsgAddCodeUploadParamsAddressesResponse",
  encode(_: MsgAddCodeUploadParamsAddressesResponse, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgAddCodeUploadParamsAddressesResponse {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgAddCodeUploadParamsAddressesResponse();
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
  fromPartial(_: Partial<MsgAddCodeUploadParamsAddressesResponse>): MsgAddCodeUploadParamsAddressesResponse {
    const message = createBaseMsgAddCodeUploadParamsAddressesResponse();
    return message;
  },
  fromAmino(_: MsgAddCodeUploadParamsAddressesResponseAmino): MsgAddCodeUploadParamsAddressesResponse {
    return {};
  },
  toAmino(_: MsgAddCodeUploadParamsAddressesResponse, useInterfaces: boolean = false): MsgAddCodeUploadParamsAddressesResponseAmino {
    const obj: any = {};
    return obj;
  },
  fromAminoMsg(object: MsgAddCodeUploadParamsAddressesResponseAminoMsg): MsgAddCodeUploadParamsAddressesResponse {
    return MsgAddCodeUploadParamsAddressesResponse.fromAmino(object.value);
  },
  toAminoMsg(message: MsgAddCodeUploadParamsAddressesResponse, useInterfaces: boolean = false): MsgAddCodeUploadParamsAddressesResponseAminoMsg {
    return {
      type: "wasm/MsgAddCodeUploadParamsAddressesResponse",
      value: MsgAddCodeUploadParamsAddressesResponse.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgAddCodeUploadParamsAddressesResponseProtoMsg, useInterfaces: boolean = false): MsgAddCodeUploadParamsAddressesResponse {
    return MsgAddCodeUploadParamsAddressesResponse.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgAddCodeUploadParamsAddressesResponse): Uint8Array {
    return MsgAddCodeUploadParamsAddressesResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgAddCodeUploadParamsAddressesResponse): MsgAddCodeUploadParamsAddressesResponseProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgAddCodeUploadParamsAddressesResponse",
      value: MsgAddCodeUploadParamsAddressesResponse.encode(message).finish()
    };
  }
};
function createBaseMsgRemoveCodeUploadParamsAddresses(): MsgRemoveCodeUploadParamsAddresses {
  return {
    authority: "",
    addresses: []
  };
}
export const MsgRemoveCodeUploadParamsAddresses = {
  typeUrl: "/cosmwasm.wasm.v1.MsgRemoveCodeUploadParamsAddresses",
  encode(message: MsgRemoveCodeUploadParamsAddresses, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.authority !== "") {
      writer.uint32(10).string(message.authority);
    }
    for (const v of message.addresses) {
      writer.uint32(18).string(v!);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgRemoveCodeUploadParamsAddresses {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgRemoveCodeUploadParamsAddresses();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.authority = reader.string();
          break;
        case 2:
          message.addresses.push(reader.string());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<MsgRemoveCodeUploadParamsAddresses>): MsgRemoveCodeUploadParamsAddresses {
    const message = createBaseMsgRemoveCodeUploadParamsAddresses();
    message.authority = object.authority ?? "";
    message.addresses = object.addresses?.map(e => e) || [];
    return message;
  },
  fromAmino(object: MsgRemoveCodeUploadParamsAddressesAmino): MsgRemoveCodeUploadParamsAddresses {
    return {
      authority: object.authority,
      addresses: Array.isArray(object?.addresses) ? object.addresses.map((e: any) => e) : []
    };
  },
  toAmino(message: MsgRemoveCodeUploadParamsAddresses, useInterfaces: boolean = false): MsgRemoveCodeUploadParamsAddressesAmino {
    const obj: any = {};
    obj.authority = message.authority;
    if (message.addresses) {
      obj.addresses = message.addresses.map(e => e);
    } else {
      obj.addresses = [];
    }
    return obj;
  },
  fromAminoMsg(object: MsgRemoveCodeUploadParamsAddressesAminoMsg): MsgRemoveCodeUploadParamsAddresses {
    return MsgRemoveCodeUploadParamsAddresses.fromAmino(object.value);
  },
  toAminoMsg(message: MsgRemoveCodeUploadParamsAddresses, useInterfaces: boolean = false): MsgRemoveCodeUploadParamsAddressesAminoMsg {
    return {
      type: "wasm/MsgRemoveCodeUploadParamsAddresses",
      value: MsgRemoveCodeUploadParamsAddresses.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgRemoveCodeUploadParamsAddressesProtoMsg, useInterfaces: boolean = false): MsgRemoveCodeUploadParamsAddresses {
    return MsgRemoveCodeUploadParamsAddresses.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgRemoveCodeUploadParamsAddresses): Uint8Array {
    return MsgRemoveCodeUploadParamsAddresses.encode(message).finish();
  },
  toProtoMsg(message: MsgRemoveCodeUploadParamsAddresses): MsgRemoveCodeUploadParamsAddressesProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgRemoveCodeUploadParamsAddresses",
      value: MsgRemoveCodeUploadParamsAddresses.encode(message).finish()
    };
  }
};
function createBaseMsgRemoveCodeUploadParamsAddressesResponse(): MsgRemoveCodeUploadParamsAddressesResponse {
  return {};
}
export const MsgRemoveCodeUploadParamsAddressesResponse = {
  typeUrl: "/cosmwasm.wasm.v1.MsgRemoveCodeUploadParamsAddressesResponse",
  encode(_: MsgRemoveCodeUploadParamsAddressesResponse, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgRemoveCodeUploadParamsAddressesResponse {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgRemoveCodeUploadParamsAddressesResponse();
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
  fromPartial(_: Partial<MsgRemoveCodeUploadParamsAddressesResponse>): MsgRemoveCodeUploadParamsAddressesResponse {
    const message = createBaseMsgRemoveCodeUploadParamsAddressesResponse();
    return message;
  },
  fromAmino(_: MsgRemoveCodeUploadParamsAddressesResponseAmino): MsgRemoveCodeUploadParamsAddressesResponse {
    return {};
  },
  toAmino(_: MsgRemoveCodeUploadParamsAddressesResponse, useInterfaces: boolean = false): MsgRemoveCodeUploadParamsAddressesResponseAmino {
    const obj: any = {};
    return obj;
  },
  fromAminoMsg(object: MsgRemoveCodeUploadParamsAddressesResponseAminoMsg): MsgRemoveCodeUploadParamsAddressesResponse {
    return MsgRemoveCodeUploadParamsAddressesResponse.fromAmino(object.value);
  },
  toAminoMsg(message: MsgRemoveCodeUploadParamsAddressesResponse, useInterfaces: boolean = false): MsgRemoveCodeUploadParamsAddressesResponseAminoMsg {
    return {
      type: "wasm/MsgRemoveCodeUploadParamsAddressesResponse",
      value: MsgRemoveCodeUploadParamsAddressesResponse.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgRemoveCodeUploadParamsAddressesResponseProtoMsg, useInterfaces: boolean = false): MsgRemoveCodeUploadParamsAddressesResponse {
    return MsgRemoveCodeUploadParamsAddressesResponse.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgRemoveCodeUploadParamsAddressesResponse): Uint8Array {
    return MsgRemoveCodeUploadParamsAddressesResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgRemoveCodeUploadParamsAddressesResponse): MsgRemoveCodeUploadParamsAddressesResponseProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgRemoveCodeUploadParamsAddressesResponse",
      value: MsgRemoveCodeUploadParamsAddressesResponse.encode(message).finish()
    };
  }
};
function createBaseMsgStoreAndMigrateContract(): MsgStoreAndMigrateContract {
  return {
    authority: "",
    wasmByteCode: new Uint8Array(),
    instantiatePermission: undefined,
    contract: "",
    msg: new Uint8Array()
  };
}
export const MsgStoreAndMigrateContract = {
  typeUrl: "/cosmwasm.wasm.v1.MsgStoreAndMigrateContract",
  encode(message: MsgStoreAndMigrateContract, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.authority !== "") {
      writer.uint32(10).string(message.authority);
    }
    if (message.wasmByteCode.length !== 0) {
      writer.uint32(18).bytes(message.wasmByteCode);
    }
    if (message.instantiatePermission !== undefined) {
      AccessConfig.encode(message.instantiatePermission, writer.uint32(26).fork()).ldelim();
    }
    if (message.contract !== "") {
      writer.uint32(34).string(message.contract);
    }
    if (message.msg.length !== 0) {
      writer.uint32(42).bytes(message.msg);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgStoreAndMigrateContract {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgStoreAndMigrateContract();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.authority = reader.string();
          break;
        case 2:
          message.wasmByteCode = reader.bytes();
          break;
        case 3:
          message.instantiatePermission = AccessConfig.decode(reader, reader.uint32(), useInterfaces);
          break;
        case 4:
          message.contract = reader.string();
          break;
        case 5:
          message.msg = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<MsgStoreAndMigrateContract>): MsgStoreAndMigrateContract {
    const message = createBaseMsgStoreAndMigrateContract();
    message.authority = object.authority ?? "";
    message.wasmByteCode = object.wasmByteCode ?? new Uint8Array();
    message.instantiatePermission = object.instantiatePermission !== undefined && object.instantiatePermission !== null ? AccessConfig.fromPartial(object.instantiatePermission) : undefined;
    message.contract = object.contract ?? "";
    message.msg = object.msg ?? new Uint8Array();
    return message;
  },
  fromAmino(object: MsgStoreAndMigrateContractAmino): MsgStoreAndMigrateContract {
    return {
      authority: object.authority,
      wasmByteCode: fromBase64(object.wasm_byte_code),
      instantiatePermission: object?.instantiate_permission ? AccessConfig.fromAmino(object.instantiate_permission) : undefined,
      contract: object.contract,
      msg: toUtf8(JSON.stringify(object.msg))
    };
  },
  toAmino(message: MsgStoreAndMigrateContract, useInterfaces: boolean = false): MsgStoreAndMigrateContractAmino {
    const obj: any = {};
    obj.authority = message.authority;
    obj.wasm_byte_code = message.wasmByteCode ? toBase64(message.wasmByteCode) : undefined;
    obj.instantiate_permission = message.instantiatePermission ? AccessConfig.toAmino(message.instantiatePermission, useInterfaces) : undefined;
    obj.contract = message.contract;
    obj.msg = message.msg ? JSON.parse(fromUtf8(message.msg)) : undefined;
    return obj;
  },
  fromAminoMsg(object: MsgStoreAndMigrateContractAminoMsg): MsgStoreAndMigrateContract {
    return MsgStoreAndMigrateContract.fromAmino(object.value);
  },
  toAminoMsg(message: MsgStoreAndMigrateContract, useInterfaces: boolean = false): MsgStoreAndMigrateContractAminoMsg {
    return {
      type: "wasm/MsgStoreAndMigrateContract",
      value: MsgStoreAndMigrateContract.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgStoreAndMigrateContractProtoMsg, useInterfaces: boolean = false): MsgStoreAndMigrateContract {
    return MsgStoreAndMigrateContract.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgStoreAndMigrateContract): Uint8Array {
    return MsgStoreAndMigrateContract.encode(message).finish();
  },
  toProtoMsg(message: MsgStoreAndMigrateContract): MsgStoreAndMigrateContractProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgStoreAndMigrateContract",
      value: MsgStoreAndMigrateContract.encode(message).finish()
    };
  }
};
function createBaseMsgStoreAndMigrateContractResponse(): MsgStoreAndMigrateContractResponse {
  return {
    codeId: BigInt(0),
    checksum: new Uint8Array(),
    data: new Uint8Array()
  };
}
export const MsgStoreAndMigrateContractResponse = {
  typeUrl: "/cosmwasm.wasm.v1.MsgStoreAndMigrateContractResponse",
  encode(message: MsgStoreAndMigrateContractResponse, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.codeId !== BigInt(0)) {
      writer.uint32(8).uint64(message.codeId);
    }
    if (message.checksum.length !== 0) {
      writer.uint32(18).bytes(message.checksum);
    }
    if (message.data.length !== 0) {
      writer.uint32(26).bytes(message.data);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgStoreAndMigrateContractResponse {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgStoreAndMigrateContractResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.codeId = reader.uint64();
          break;
        case 2:
          message.checksum = reader.bytes();
          break;
        case 3:
          message.data = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<MsgStoreAndMigrateContractResponse>): MsgStoreAndMigrateContractResponse {
    const message = createBaseMsgStoreAndMigrateContractResponse();
    message.codeId = object.codeId !== undefined && object.codeId !== null ? BigInt(object.codeId.toString()) : BigInt(0);
    message.checksum = object.checksum ?? new Uint8Array();
    message.data = object.data ?? new Uint8Array();
    return message;
  },
  fromAmino(object: MsgStoreAndMigrateContractResponseAmino): MsgStoreAndMigrateContractResponse {
    return {
      codeId: BigInt(object.code_id),
      checksum: object.checksum,
      data: object.data
    };
  },
  toAmino(message: MsgStoreAndMigrateContractResponse, useInterfaces: boolean = false): MsgStoreAndMigrateContractResponseAmino {
    const obj: any = {};
    obj.code_id = message.codeId ? message.codeId.toString() : undefined;
    obj.checksum = message.checksum;
    obj.data = message.data;
    return obj;
  },
  fromAminoMsg(object: MsgStoreAndMigrateContractResponseAminoMsg): MsgStoreAndMigrateContractResponse {
    return MsgStoreAndMigrateContractResponse.fromAmino(object.value);
  },
  toAminoMsg(message: MsgStoreAndMigrateContractResponse, useInterfaces: boolean = false): MsgStoreAndMigrateContractResponseAminoMsg {
    return {
      type: "wasm/MsgStoreAndMigrateContractResponse",
      value: MsgStoreAndMigrateContractResponse.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgStoreAndMigrateContractResponseProtoMsg, useInterfaces: boolean = false): MsgStoreAndMigrateContractResponse {
    return MsgStoreAndMigrateContractResponse.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgStoreAndMigrateContractResponse): Uint8Array {
    return MsgStoreAndMigrateContractResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgStoreAndMigrateContractResponse): MsgStoreAndMigrateContractResponseProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgStoreAndMigrateContractResponse",
      value: MsgStoreAndMigrateContractResponse.encode(message).finish()
    };
  }
};
function createBaseMsgUpdateContractLabel(): MsgUpdateContractLabel {
  return {
    sender: "",
    newLabel: "",
    contract: ""
  };
}
export const MsgUpdateContractLabel = {
  typeUrl: "/cosmwasm.wasm.v1.MsgUpdateContractLabel",
  encode(message: MsgUpdateContractLabel, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.sender !== "") {
      writer.uint32(10).string(message.sender);
    }
    if (message.newLabel !== "") {
      writer.uint32(18).string(message.newLabel);
    }
    if (message.contract !== "") {
      writer.uint32(26).string(message.contract);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgUpdateContractLabel {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateContractLabel();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.sender = reader.string();
          break;
        case 2:
          message.newLabel = reader.string();
          break;
        case 3:
          message.contract = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<MsgUpdateContractLabel>): MsgUpdateContractLabel {
    const message = createBaseMsgUpdateContractLabel();
    message.sender = object.sender ?? "";
    message.newLabel = object.newLabel ?? "";
    message.contract = object.contract ?? "";
    return message;
  },
  fromAmino(object: MsgUpdateContractLabelAmino): MsgUpdateContractLabel {
    return {
      sender: object.sender,
      newLabel: object.new_label,
      contract: object.contract
    };
  },
  toAmino(message: MsgUpdateContractLabel, useInterfaces: boolean = false): MsgUpdateContractLabelAmino {
    const obj: any = {};
    obj.sender = message.sender;
    obj.new_label = message.newLabel;
    obj.contract = message.contract;
    return obj;
  },
  fromAminoMsg(object: MsgUpdateContractLabelAminoMsg): MsgUpdateContractLabel {
    return MsgUpdateContractLabel.fromAmino(object.value);
  },
  toAminoMsg(message: MsgUpdateContractLabel, useInterfaces: boolean = false): MsgUpdateContractLabelAminoMsg {
    return {
      type: "wasm/MsgUpdateContractLabel",
      value: MsgUpdateContractLabel.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgUpdateContractLabelProtoMsg, useInterfaces: boolean = false): MsgUpdateContractLabel {
    return MsgUpdateContractLabel.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgUpdateContractLabel): Uint8Array {
    return MsgUpdateContractLabel.encode(message).finish();
  },
  toProtoMsg(message: MsgUpdateContractLabel): MsgUpdateContractLabelProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgUpdateContractLabel",
      value: MsgUpdateContractLabel.encode(message).finish()
    };
  }
};
function createBaseMsgUpdateContractLabelResponse(): MsgUpdateContractLabelResponse {
  return {};
}
export const MsgUpdateContractLabelResponse = {
  typeUrl: "/cosmwasm.wasm.v1.MsgUpdateContractLabelResponse",
  encode(_: MsgUpdateContractLabelResponse, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): MsgUpdateContractLabelResponse {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateContractLabelResponse();
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
  fromPartial(_: Partial<MsgUpdateContractLabelResponse>): MsgUpdateContractLabelResponse {
    const message = createBaseMsgUpdateContractLabelResponse();
    return message;
  },
  fromAmino(_: MsgUpdateContractLabelResponseAmino): MsgUpdateContractLabelResponse {
    return {};
  },
  toAmino(_: MsgUpdateContractLabelResponse, useInterfaces: boolean = false): MsgUpdateContractLabelResponseAmino {
    const obj: any = {};
    return obj;
  },
  fromAminoMsg(object: MsgUpdateContractLabelResponseAminoMsg): MsgUpdateContractLabelResponse {
    return MsgUpdateContractLabelResponse.fromAmino(object.value);
  },
  toAminoMsg(message: MsgUpdateContractLabelResponse, useInterfaces: boolean = false): MsgUpdateContractLabelResponseAminoMsg {
    return {
      type: "wasm/MsgUpdateContractLabelResponse",
      value: MsgUpdateContractLabelResponse.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: MsgUpdateContractLabelResponseProtoMsg, useInterfaces: boolean = false): MsgUpdateContractLabelResponse {
    return MsgUpdateContractLabelResponse.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: MsgUpdateContractLabelResponse): Uint8Array {
    return MsgUpdateContractLabelResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgUpdateContractLabelResponse): MsgUpdateContractLabelResponseProtoMsg {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgUpdateContractLabelResponse",
      value: MsgUpdateContractLabelResponse.encode(message).finish()
    };
  }
};