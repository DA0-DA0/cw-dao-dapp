import { Timestamp } from "../../../../google/protobuf/timestamp";
import { Duration, DurationAmino, DurationSDKType } from "../../../../google/protobuf/duration";
import { Coin, CoinAmino, CoinSDKType } from "../../../../cosmos/base/v1beta1/coin";
import { BinaryReader, BinaryWriter } from "../../../../binary";
import { toTimestamp, fromTimestamp } from "../../../../helpers";
import { Decimal } from "@cosmjs/math";
/**
 * Parameters for changing the weights in a balancer pool smoothly from
 * a start weight and end weight over a period of time.
 * Currently, the only smooth change supported is linear changing between
 * the two weights, but more types may be added in the future.
 * When these parameters are set, the weight w(t) for pool time `t` is the
 * following:
 *   t <= start_time: w(t) = initial_pool_weights
 *   start_time < t <= start_time + duration:
 *     w(t) = initial_pool_weights + (t - start_time) *
 *       (target_pool_weights - initial_pool_weights) / (duration)
 *   t > start_time + duration: w(t) = target_pool_weights
 */
export interface SmoothWeightChangeParams {
  /**
   * The start time for beginning the weight change.
   * If a parameter change / pool instantiation leaves this blank,
   * it should be generated by the state_machine as the current time.
   */
  startTime: Date | undefined;
  /** Duration for the weights to change over */
  duration: Duration | undefined;
  /**
   * The initial pool weights. These are copied from the pool's settings
   * at the time of weight change instantiation.
   * The amount PoolAsset.token.amount field is ignored if present,
   * future type refactorings should just have a type with the denom & weight
   * here.
   */
  initialPoolWeights: PoolAsset[];
  /**
   * The target pool weights. The pool weights will change linearly with respect
   * to time between start_time, and start_time + duration. The amount
   * PoolAsset.token.amount field is ignored if present, future type
   * refactorings should just have a type with the denom & weight here.
   */
  targetPoolWeights: PoolAsset[];
}
export interface SmoothWeightChangeParamsProtoMsg {
  typeUrl: "/osmosis.gamm.v1beta1.SmoothWeightChangeParams";
  value: Uint8Array;
}
/**
 * Parameters for changing the weights in a balancer pool smoothly from
 * a start weight and end weight over a period of time.
 * Currently, the only smooth change supported is linear changing between
 * the two weights, but more types may be added in the future.
 * When these parameters are set, the weight w(t) for pool time `t` is the
 * following:
 *   t <= start_time: w(t) = initial_pool_weights
 *   start_time < t <= start_time + duration:
 *     w(t) = initial_pool_weights + (t - start_time) *
 *       (target_pool_weights - initial_pool_weights) / (duration)
 *   t > start_time + duration: w(t) = target_pool_weights
 */
export interface SmoothWeightChangeParamsAmino {
  /**
   * The start time for beginning the weight change.
   * If a parameter change / pool instantiation leaves this blank,
   * it should be generated by the state_machine as the current time.
   */
  start_time?: string | undefined;
  /** Duration for the weights to change over */
  duration?: DurationAmino | undefined;
  /**
   * The initial pool weights. These are copied from the pool's settings
   * at the time of weight change instantiation.
   * The amount PoolAsset.token.amount field is ignored if present,
   * future type refactorings should just have a type with the denom & weight
   * here.
   */
  initial_pool_weights: PoolAssetAmino[];
  /**
   * The target pool weights. The pool weights will change linearly with respect
   * to time between start_time, and start_time + duration. The amount
   * PoolAsset.token.amount field is ignored if present, future type
   * refactorings should just have a type with the denom & weight here.
   */
  target_pool_weights: PoolAssetAmino[];
}
export interface SmoothWeightChangeParamsAminoMsg {
  type: "osmosis/gamm/smooth-weight-change-params";
  value: SmoothWeightChangeParamsAmino;
}
/**
 * Parameters for changing the weights in a balancer pool smoothly from
 * a start weight and end weight over a period of time.
 * Currently, the only smooth change supported is linear changing between
 * the two weights, but more types may be added in the future.
 * When these parameters are set, the weight w(t) for pool time `t` is the
 * following:
 *   t <= start_time: w(t) = initial_pool_weights
 *   start_time < t <= start_time + duration:
 *     w(t) = initial_pool_weights + (t - start_time) *
 *       (target_pool_weights - initial_pool_weights) / (duration)
 *   t > start_time + duration: w(t) = target_pool_weights
 */
export interface SmoothWeightChangeParamsSDKType {
  start_time: Date | undefined;
  duration: DurationSDKType | undefined;
  initial_pool_weights: PoolAssetSDKType[];
  target_pool_weights: PoolAssetSDKType[];
}
/**
 * PoolParams defined the parameters that will be managed by the pool
 * governance in the future. This params are not managed by the chain
 * governance. Instead they will be managed by the token holders of the pool.
 * The pool's token holders are specified in future_pool_governor.
 */
export interface PoolParams {
  swapFee: string;
  /**
   * N.B.: exit fee is disabled during pool creation in x/poolmanager. While old
   * pools can maintain a non-zero fee. No new pool can be created with non-zero
   * fee anymore
   */
  exitFee: string;
  smoothWeightChangeParams?: SmoothWeightChangeParams | undefined;
}
export interface PoolParamsProtoMsg {
  typeUrl: "/osmosis.gamm.v1beta1.PoolParams";
  value: Uint8Array;
}
/**
 * PoolParams defined the parameters that will be managed by the pool
 * governance in the future. This params are not managed by the chain
 * governance. Instead they will be managed by the token holders of the pool.
 * The pool's token holders are specified in future_pool_governor.
 */
export interface PoolParamsAmino {
  swap_fee: string;
  /**
   * N.B.: exit fee is disabled during pool creation in x/poolmanager. While old
   * pools can maintain a non-zero fee. No new pool can be created with non-zero
   * fee anymore
   */
  exit_fee: string;
  smooth_weight_change_params?: SmoothWeightChangeParamsAmino | undefined;
}
export interface PoolParamsAminoMsg {
  type: "osmosis/gamm/BalancerPoolParams";
  value: PoolParamsAmino;
}
/**
 * PoolParams defined the parameters that will be managed by the pool
 * governance in the future. This params are not managed by the chain
 * governance. Instead they will be managed by the token holders of the pool.
 * The pool's token holders are specified in future_pool_governor.
 */
export interface PoolParamsSDKType {
  swap_fee: string;
  exit_fee: string;
  smooth_weight_change_params?: SmoothWeightChangeParamsSDKType | undefined;
}
/**
 * Pool asset is an internal struct that combines the amount of the
 * token in the pool, and its balancer weight.
 * This is an awkward packaging of data,
 * and should be revisited in a future state migration.
 */
export interface PoolAsset {
  /**
   * Coins we are talking about,
   * the denomination must be unique amongst all PoolAssets for this pool.
   */
  token: Coin | undefined;
  /** Weight that is not normalized. This weight must be less than 2^50 */
  weight: string;
}
export interface PoolAssetProtoMsg {
  typeUrl: "/osmosis.gamm.v1beta1.PoolAsset";
  value: Uint8Array;
}
/**
 * Pool asset is an internal struct that combines the amount of the
 * token in the pool, and its balancer weight.
 * This is an awkward packaging of data,
 * and should be revisited in a future state migration.
 */
export interface PoolAssetAmino {
  /**
   * Coins we are talking about,
   * the denomination must be unique amongst all PoolAssets for this pool.
   */
  token?: CoinAmino | undefined;
  /** Weight that is not normalized. This weight must be less than 2^50 */
  weight: string;
}
export interface PoolAssetAminoMsg {
  type: "osmosis/gamm/pool-asset";
  value: PoolAssetAmino;
}
/**
 * Pool asset is an internal struct that combines the amount of the
 * token in the pool, and its balancer weight.
 * This is an awkward packaging of data,
 * and should be revisited in a future state migration.
 */
export interface PoolAssetSDKType {
  token: CoinSDKType | undefined;
  weight: string;
}
export interface Pool {
  $typeUrl?: "/osmosis.gamm.v1beta1.Pool";
  address: string;
  id: bigint;
  poolParams: PoolParams | undefined;
  /**
   * This string specifies who will govern the pool in the future.
   * Valid forms of this are:
   * {token name},{duration}
   * {duration}
   * where {token name} if specified is the token which determines the
   * governor, and if not specified is the LP token for this pool.duration is
   * a time specified as 0w,1w,2w, etc. which specifies how long the token
   * would need to be locked up to count in governance. 0w means no lockup.
   * TODO: Further improve these docs
   */
  futurePoolGovernor: string;
  /** sum of all LP tokens sent out */
  totalShares: Coin | undefined;
  /**
   * These are assumed to be sorted by denomiation.
   * They contain the pool asset and the information about the weight
   */
  poolAssets: PoolAsset[];
  /** sum of all non-normalized pool weights */
  totalWeight: string;
}
export interface PoolProtoMsg {
  typeUrl: "/osmosis.gamm.v1beta1.Pool";
  value: Uint8Array;
}
export interface PoolAmino {
  address: string;
  id: string;
  pool_params?: PoolParamsAmino | undefined;
  /**
   * This string specifies who will govern the pool in the future.
   * Valid forms of this are:
   * {token name},{duration}
   * {duration}
   * where {token name} if specified is the token which determines the
   * governor, and if not specified is the LP token for this pool.duration is
   * a time specified as 0w,1w,2w, etc. which specifies how long the token
   * would need to be locked up to count in governance. 0w means no lockup.
   * TODO: Further improve these docs
   */
  future_pool_governor: string;
  /** sum of all LP tokens sent out */
  total_shares?: CoinAmino | undefined;
  /**
   * These are assumed to be sorted by denomiation.
   * They contain the pool asset and the information about the weight
   */
  pool_assets: PoolAssetAmino[];
  /** sum of all non-normalized pool weights */
  total_weight: string;
}
export interface PoolAminoMsg {
  type: "osmosis/gamm/BalancerPool";
  value: PoolAmino;
}
export interface PoolSDKType {
  $typeUrl?: "/osmosis.gamm.v1beta1.Pool";
  address: string;
  id: bigint;
  pool_params: PoolParamsSDKType | undefined;
  future_pool_governor: string;
  total_shares: CoinSDKType | undefined;
  pool_assets: PoolAssetSDKType[];
  total_weight: string;
}
function createBaseSmoothWeightChangeParams(): SmoothWeightChangeParams {
  return {
    startTime: new Date(),
    duration: Duration.fromPartial({}),
    initialPoolWeights: [],
    targetPoolWeights: []
  };
}
export const SmoothWeightChangeParams = {
  typeUrl: "/osmosis.gamm.v1beta1.SmoothWeightChangeParams",
  encode(message: SmoothWeightChangeParams, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.startTime !== undefined) {
      Timestamp.encode(toTimestamp(message.startTime), writer.uint32(10).fork()).ldelim();
    }
    if (message.duration !== undefined) {
      Duration.encode(message.duration, writer.uint32(18).fork()).ldelim();
    }
    for (const v of message.initialPoolWeights) {
      PoolAsset.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    for (const v of message.targetPoolWeights) {
      PoolAsset.encode(v!, writer.uint32(34).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): SmoothWeightChangeParams {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSmoothWeightChangeParams();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.startTime = fromTimestamp(Timestamp.decode(reader, reader.uint32()));
          break;
        case 2:
          message.duration = Duration.decode(reader, reader.uint32(), useInterfaces);
          break;
        case 3:
          message.initialPoolWeights.push(PoolAsset.decode(reader, reader.uint32(), useInterfaces));
          break;
        case 4:
          message.targetPoolWeights.push(PoolAsset.decode(reader, reader.uint32(), useInterfaces));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<SmoothWeightChangeParams>): SmoothWeightChangeParams {
    const message = createBaseSmoothWeightChangeParams();
    message.startTime = object.startTime ?? undefined;
    message.duration = object.duration !== undefined && object.duration !== null ? Duration.fromPartial(object.duration) : undefined;
    message.initialPoolWeights = object.initialPoolWeights?.map(e => PoolAsset.fromPartial(e)) || [];
    message.targetPoolWeights = object.targetPoolWeights?.map(e => PoolAsset.fromPartial(e)) || [];
    return message;
  },
  fromAmino(object: SmoothWeightChangeParamsAmino): SmoothWeightChangeParams {
    return {
      startTime: object?.start_time ? fromTimestamp(Timestamp.fromAmino(object.start_time)) : undefined,
      duration: object?.duration ? Duration.fromAmino(object.duration) : undefined,
      initialPoolWeights: Array.isArray(object?.initial_pool_weights) ? object.initial_pool_weights.map((e: any) => PoolAsset.fromAmino(e)) : [],
      targetPoolWeights: Array.isArray(object?.target_pool_weights) ? object.target_pool_weights.map((e: any) => PoolAsset.fromAmino(e)) : []
    };
  },
  toAmino(message: SmoothWeightChangeParams, useInterfaces: boolean = false): SmoothWeightChangeParamsAmino {
    const obj: any = {};
    obj.start_time = message.startTime ? Timestamp.toAmino(toTimestamp(message.startTime)) : undefined;
    obj.duration = message.duration ? Duration.toAmino(message.duration, useInterfaces) : undefined;
    if (message.initialPoolWeights) {
      obj.initial_pool_weights = message.initialPoolWeights.map(e => e ? PoolAsset.toAmino(e, useInterfaces) : undefined);
    } else {
      obj.initial_pool_weights = [];
    }
    if (message.targetPoolWeights) {
      obj.target_pool_weights = message.targetPoolWeights.map(e => e ? PoolAsset.toAmino(e, useInterfaces) : undefined);
    } else {
      obj.target_pool_weights = [];
    }
    return obj;
  },
  fromAminoMsg(object: SmoothWeightChangeParamsAminoMsg): SmoothWeightChangeParams {
    return SmoothWeightChangeParams.fromAmino(object.value);
  },
  toAminoMsg(message: SmoothWeightChangeParams, useInterfaces: boolean = false): SmoothWeightChangeParamsAminoMsg {
    return {
      type: "osmosis/gamm/smooth-weight-change-params",
      value: SmoothWeightChangeParams.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: SmoothWeightChangeParamsProtoMsg, useInterfaces: boolean = false): SmoothWeightChangeParams {
    return SmoothWeightChangeParams.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: SmoothWeightChangeParams): Uint8Array {
    return SmoothWeightChangeParams.encode(message).finish();
  },
  toProtoMsg(message: SmoothWeightChangeParams): SmoothWeightChangeParamsProtoMsg {
    return {
      typeUrl: "/osmosis.gamm.v1beta1.SmoothWeightChangeParams",
      value: SmoothWeightChangeParams.encode(message).finish()
    };
  }
};
function createBasePoolParams(): PoolParams {
  return {
    swapFee: "",
    exitFee: "",
    smoothWeightChangeParams: undefined
  };
}
export const PoolParams = {
  typeUrl: "/osmosis.gamm.v1beta1.PoolParams",
  encode(message: PoolParams, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.swapFee !== "") {
      writer.uint32(10).string(Decimal.fromUserInput(message.swapFee, 18).atomics);
    }
    if (message.exitFee !== "") {
      writer.uint32(18).string(Decimal.fromUserInput(message.exitFee, 18).atomics);
    }
    if (message.smoothWeightChangeParams !== undefined) {
      SmoothWeightChangeParams.encode(message.smoothWeightChangeParams, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): PoolParams {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePoolParams();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.swapFee = Decimal.fromAtomics(reader.string(), 18).toString();
          break;
        case 2:
          message.exitFee = Decimal.fromAtomics(reader.string(), 18).toString();
          break;
        case 3:
          message.smoothWeightChangeParams = SmoothWeightChangeParams.decode(reader, reader.uint32(), useInterfaces);
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<PoolParams>): PoolParams {
    const message = createBasePoolParams();
    message.swapFee = object.swapFee ?? "";
    message.exitFee = object.exitFee ?? "";
    message.smoothWeightChangeParams = object.smoothWeightChangeParams !== undefined && object.smoothWeightChangeParams !== null ? SmoothWeightChangeParams.fromPartial(object.smoothWeightChangeParams) : undefined;
    return message;
  },
  fromAmino(object: PoolParamsAmino): PoolParams {
    return {
      swapFee: object.swap_fee,
      exitFee: object.exit_fee,
      smoothWeightChangeParams: object?.smooth_weight_change_params ? SmoothWeightChangeParams.fromAmino(object.smooth_weight_change_params) : undefined
    };
  },
  toAmino(message: PoolParams, useInterfaces: boolean = false): PoolParamsAmino {
    const obj: any = {};
    obj.swap_fee = message.swapFee;
    obj.exit_fee = message.exitFee;
    obj.smooth_weight_change_params = message.smoothWeightChangeParams ? SmoothWeightChangeParams.toAmino(message.smoothWeightChangeParams, useInterfaces) : undefined;
    return obj;
  },
  fromAminoMsg(object: PoolParamsAminoMsg): PoolParams {
    return PoolParams.fromAmino(object.value);
  },
  toAminoMsg(message: PoolParams, useInterfaces: boolean = false): PoolParamsAminoMsg {
    return {
      type: "osmosis/gamm/BalancerPoolParams",
      value: PoolParams.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: PoolParamsProtoMsg, useInterfaces: boolean = false): PoolParams {
    return PoolParams.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: PoolParams): Uint8Array {
    return PoolParams.encode(message).finish();
  },
  toProtoMsg(message: PoolParams): PoolParamsProtoMsg {
    return {
      typeUrl: "/osmosis.gamm.v1beta1.PoolParams",
      value: PoolParams.encode(message).finish()
    };
  }
};
function createBasePoolAsset(): PoolAsset {
  return {
    token: Coin.fromPartial({}),
    weight: ""
  };
}
export const PoolAsset = {
  typeUrl: "/osmosis.gamm.v1beta1.PoolAsset",
  encode(message: PoolAsset, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.token !== undefined) {
      Coin.encode(message.token, writer.uint32(10).fork()).ldelim();
    }
    if (message.weight !== "") {
      writer.uint32(18).string(message.weight);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): PoolAsset {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePoolAsset();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.token = Coin.decode(reader, reader.uint32(), useInterfaces);
          break;
        case 2:
          message.weight = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<PoolAsset>): PoolAsset {
    const message = createBasePoolAsset();
    message.token = object.token !== undefined && object.token !== null ? Coin.fromPartial(object.token) : undefined;
    message.weight = object.weight ?? "";
    return message;
  },
  fromAmino(object: PoolAssetAmino): PoolAsset {
    return {
      token: object?.token ? Coin.fromAmino(object.token) : undefined,
      weight: object.weight
    };
  },
  toAmino(message: PoolAsset, useInterfaces: boolean = false): PoolAssetAmino {
    const obj: any = {};
    obj.token = message.token ? Coin.toAmino(message.token, useInterfaces) : undefined;
    obj.weight = message.weight;
    return obj;
  },
  fromAminoMsg(object: PoolAssetAminoMsg): PoolAsset {
    return PoolAsset.fromAmino(object.value);
  },
  toAminoMsg(message: PoolAsset, useInterfaces: boolean = false): PoolAssetAminoMsg {
    return {
      type: "osmosis/gamm/pool-asset",
      value: PoolAsset.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: PoolAssetProtoMsg, useInterfaces: boolean = false): PoolAsset {
    return PoolAsset.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: PoolAsset): Uint8Array {
    return PoolAsset.encode(message).finish();
  },
  toProtoMsg(message: PoolAsset): PoolAssetProtoMsg {
    return {
      typeUrl: "/osmosis.gamm.v1beta1.PoolAsset",
      value: PoolAsset.encode(message).finish()
    };
  }
};
function createBasePool(): Pool {
  return {
    $typeUrl: "/osmosis.gamm.v1beta1.Pool",
    address: "",
    id: BigInt(0),
    poolParams: PoolParams.fromPartial({}),
    futurePoolGovernor: "",
    totalShares: Coin.fromPartial({}),
    poolAssets: [],
    totalWeight: ""
  };
}
export const Pool = {
  typeUrl: "/osmosis.gamm.v1beta1.Pool",
  encode(message: Pool, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.address !== "") {
      writer.uint32(10).string(message.address);
    }
    if (message.id !== BigInt(0)) {
      writer.uint32(16).uint64(message.id);
    }
    if (message.poolParams !== undefined) {
      PoolParams.encode(message.poolParams, writer.uint32(26).fork()).ldelim();
    }
    if (message.futurePoolGovernor !== "") {
      writer.uint32(34).string(message.futurePoolGovernor);
    }
    if (message.totalShares !== undefined) {
      Coin.encode(message.totalShares, writer.uint32(42).fork()).ldelim();
    }
    for (const v of message.poolAssets) {
      PoolAsset.encode(v!, writer.uint32(50).fork()).ldelim();
    }
    if (message.totalWeight !== "") {
      writer.uint32(58).string(message.totalWeight);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): Pool {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePool();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.address = reader.string();
          break;
        case 2:
          message.id = reader.uint64();
          break;
        case 3:
          message.poolParams = PoolParams.decode(reader, reader.uint32(), useInterfaces);
          break;
        case 4:
          message.futurePoolGovernor = reader.string();
          break;
        case 5:
          message.totalShares = Coin.decode(reader, reader.uint32(), useInterfaces);
          break;
        case 6:
          message.poolAssets.push(PoolAsset.decode(reader, reader.uint32(), useInterfaces));
          break;
        case 7:
          message.totalWeight = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<Pool>): Pool {
    const message = createBasePool();
    message.address = object.address ?? "";
    message.id = object.id !== undefined && object.id !== null ? BigInt(object.id.toString()) : BigInt(0);
    message.poolParams = object.poolParams !== undefined && object.poolParams !== null ? PoolParams.fromPartial(object.poolParams) : undefined;
    message.futurePoolGovernor = object.futurePoolGovernor ?? "";
    message.totalShares = object.totalShares !== undefined && object.totalShares !== null ? Coin.fromPartial(object.totalShares) : undefined;
    message.poolAssets = object.poolAssets?.map(e => PoolAsset.fromPartial(e)) || [];
    message.totalWeight = object.totalWeight ?? "";
    return message;
  },
  fromAmino(object: PoolAmino): Pool {
    return {
      address: object.address,
      id: BigInt(object.id),
      poolParams: object?.pool_params ? PoolParams.fromAmino(object.pool_params) : undefined,
      futurePoolGovernor: object.future_pool_governor,
      totalShares: object?.total_shares ? Coin.fromAmino(object.total_shares) : undefined,
      poolAssets: Array.isArray(object?.pool_assets) ? object.pool_assets.map((e: any) => PoolAsset.fromAmino(e)) : [],
      totalWeight: object.total_weight
    };
  },
  toAmino(message: Pool, useInterfaces: boolean = false): PoolAmino {
    const obj: any = {};
    obj.address = message.address;
    obj.id = message.id ? message.id.toString() : undefined;
    obj.pool_params = message.poolParams ? PoolParams.toAmino(message.poolParams, useInterfaces) : undefined;
    obj.future_pool_governor = message.futurePoolGovernor;
    obj.total_shares = message.totalShares ? Coin.toAmino(message.totalShares, useInterfaces) : undefined;
    if (message.poolAssets) {
      obj.pool_assets = message.poolAssets.map(e => e ? PoolAsset.toAmino(e, useInterfaces) : undefined);
    } else {
      obj.pool_assets = [];
    }
    obj.total_weight = message.totalWeight;
    return obj;
  },
  fromAminoMsg(object: PoolAminoMsg): Pool {
    return Pool.fromAmino(object.value);
  },
  toAminoMsg(message: Pool, useInterfaces: boolean = false): PoolAminoMsg {
    return {
      type: "osmosis/gamm/BalancerPool",
      value: Pool.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: PoolProtoMsg, useInterfaces: boolean = false): Pool {
    return Pool.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: Pool): Uint8Array {
    return Pool.encode(message).finish();
  },
  toProtoMsg(message: Pool): PoolProtoMsg {
    return {
      typeUrl: "/osmosis.gamm.v1beta1.Pool",
      value: Pool.encode(message).finish()
    };
  }
};