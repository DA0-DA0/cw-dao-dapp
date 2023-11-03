import { Rpc } from "../../../helpers";
import { BinaryReader } from "../../../binary";
import { QueryClient, createProtobufRpcClient } from "@cosmjs/stargate";
import { QueryPoolsRequest, QueryPoolsResponse, QueryNumPoolsRequest, QueryNumPoolsResponse, QueryTotalLiquidityRequest, QueryTotalLiquidityResponse, QueryPoolsWithFilterRequest, QueryPoolsWithFilterResponse, QueryPoolRequest, QueryPoolResponse, QueryPoolTypeRequest, QueryPoolTypeResponse, QueryCalcJoinPoolNoSwapSharesRequest, QueryCalcJoinPoolNoSwapSharesResponse, QueryCalcJoinPoolSharesRequest, QueryCalcJoinPoolSharesResponse, QueryCalcExitPoolCoinsFromSharesRequest, QueryCalcExitPoolCoinsFromSharesResponse, QueryPoolParamsRequest, QueryPoolParamsResponse, QueryTotalPoolLiquidityRequest, QueryTotalPoolLiquidityResponse, QueryTotalSharesRequest, QueryTotalSharesResponse, QuerySpotPriceRequest, QuerySpotPriceResponse, QuerySwapExactAmountInRequest, QuerySwapExactAmountInResponse, QuerySwapExactAmountOutRequest, QuerySwapExactAmountOutResponse, QueryConcentratedPoolIdLinkFromCFMMRequest, QueryConcentratedPoolIdLinkFromCFMMResponse, QueryCFMMConcentratedPoolLinksRequest, QueryCFMMConcentratedPoolLinksResponse } from "./query";
export interface Query {
  pools(request?: QueryPoolsRequest): Promise<QueryPoolsResponse>;
  /** Deprecated: please use the alternative in x/poolmanager */
  numPools(request?: QueryNumPoolsRequest): Promise<QueryNumPoolsResponse>;
  totalLiquidity(request?: QueryTotalLiquidityRequest): Promise<QueryTotalLiquidityResponse>;
  /**
   * PoolsWithFilter allows you to query specific pools with requested
   * parameters
   */
  poolsWithFilter(request: QueryPoolsWithFilterRequest): Promise<QueryPoolsWithFilterResponse>;
  /** Deprecated: please use the alternative in x/poolmanager */
  pool(request: QueryPoolRequest): Promise<QueryPoolResponse>;
  /**
   * PoolType returns the type of the pool.
   * Returns "Balancer" as a string literal when the pool is a balancer pool.
   * Errors if the pool is failed to be type caseted.
   */
  poolType(request: QueryPoolTypeRequest): Promise<QueryPoolTypeResponse>;
  /**
   * Simulates joining pool without a swap. Returns the amount of shares you'd
   * get and tokens needed to provide
   */
  calcJoinPoolNoSwapShares(request: QueryCalcJoinPoolNoSwapSharesRequest): Promise<QueryCalcJoinPoolNoSwapSharesResponse>;
  calcJoinPoolShares(request: QueryCalcJoinPoolSharesRequest): Promise<QueryCalcJoinPoolSharesResponse>;
  calcExitPoolCoinsFromShares(request: QueryCalcExitPoolCoinsFromSharesRequest): Promise<QueryCalcExitPoolCoinsFromSharesResponse>;
  poolParams(request: QueryPoolParamsRequest): Promise<QueryPoolParamsResponse>;
  /** Deprecated: please use the alternative in x/poolmanager */
  totalPoolLiquidity(request: QueryTotalPoolLiquidityRequest): Promise<QueryTotalPoolLiquidityResponse>;
  totalShares(request: QueryTotalSharesRequest): Promise<QueryTotalSharesResponse>;
  /**
   * SpotPrice defines a gRPC query handler that returns the spot price given
   * a base denomination and a quote denomination.
   */
  spotPrice(request: QuerySpotPriceRequest): Promise<QuerySpotPriceResponse>;
  /** Deprecated: please use the alternative in x/poolmanager */
  estimateSwapExactAmountIn(request: QuerySwapExactAmountInRequest): Promise<QuerySwapExactAmountInResponse>;
  /** Deprecated: please use the alternative in x/poolmanager */
  estimateSwapExactAmountOut(request: QuerySwapExactAmountOutRequest): Promise<QuerySwapExactAmountOutResponse>;
  /**
   * ConcentratedPoolIdLinkFromBalancer returns the pool id of the concentrated
   * pool that is linked with the given CFMM pool.
   */
  concentratedPoolIdLinkFromCFMM(request: QueryConcentratedPoolIdLinkFromCFMMRequest): Promise<QueryConcentratedPoolIdLinkFromCFMMResponse>;
  /**
   * CFMMConcentratedPoolLinks returns migration links between CFMM and
   * Concentrated pools.
   */
  cFMMConcentratedPoolLinks(request?: QueryCFMMConcentratedPoolLinksRequest): Promise<QueryCFMMConcentratedPoolLinksResponse>;
}
export class QueryClientImpl implements Query {
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.pools = this.pools.bind(this);
    this.numPools = this.numPools.bind(this);
    this.totalLiquidity = this.totalLiquidity.bind(this);
    this.poolsWithFilter = this.poolsWithFilter.bind(this);
    this.pool = this.pool.bind(this);
    this.poolType = this.poolType.bind(this);
    this.calcJoinPoolNoSwapShares = this.calcJoinPoolNoSwapShares.bind(this);
    this.calcJoinPoolShares = this.calcJoinPoolShares.bind(this);
    this.calcExitPoolCoinsFromShares = this.calcExitPoolCoinsFromShares.bind(this);
    this.poolParams = this.poolParams.bind(this);
    this.totalPoolLiquidity = this.totalPoolLiquidity.bind(this);
    this.totalShares = this.totalShares.bind(this);
    this.spotPrice = this.spotPrice.bind(this);
    this.estimateSwapExactAmountIn = this.estimateSwapExactAmountIn.bind(this);
    this.estimateSwapExactAmountOut = this.estimateSwapExactAmountOut.bind(this);
    this.concentratedPoolIdLinkFromCFMM = this.concentratedPoolIdLinkFromCFMM.bind(this);
    this.cFMMConcentratedPoolLinks = this.cFMMConcentratedPoolLinks.bind(this);
  }
  pools(request: QueryPoolsRequest = {
    pagination: undefined
  }, useInterfaces: boolean = true): Promise<QueryPoolsResponse> {
    const data = QueryPoolsRequest.encode(request).finish();
    const promise = this.rpc.request("osmosis.gamm.v1beta1.Query", "Pools", data);
    return promise.then(data => QueryPoolsResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  numPools(request: QueryNumPoolsRequest = {}, useInterfaces: boolean = true): Promise<QueryNumPoolsResponse> {
    const data = QueryNumPoolsRequest.encode(request).finish();
    const promise = this.rpc.request("osmosis.gamm.v1beta1.Query", "NumPools", data);
    return promise.then(data => QueryNumPoolsResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  totalLiquidity(request: QueryTotalLiquidityRequest = {}, useInterfaces: boolean = true): Promise<QueryTotalLiquidityResponse> {
    const data = QueryTotalLiquidityRequest.encode(request).finish();
    const promise = this.rpc.request("osmosis.gamm.v1beta1.Query", "TotalLiquidity", data);
    return promise.then(data => QueryTotalLiquidityResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  poolsWithFilter(request: QueryPoolsWithFilterRequest, useInterfaces: boolean = true): Promise<QueryPoolsWithFilterResponse> {
    const data = QueryPoolsWithFilterRequest.encode(request).finish();
    const promise = this.rpc.request("osmosis.gamm.v1beta1.Query", "PoolsWithFilter", data);
    return promise.then(data => QueryPoolsWithFilterResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  pool(request: QueryPoolRequest, useInterfaces: boolean = true): Promise<QueryPoolResponse> {
    const data = QueryPoolRequest.encode(request).finish();
    const promise = this.rpc.request("osmosis.gamm.v1beta1.Query", "Pool", data);
    return promise.then(data => QueryPoolResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  poolType(request: QueryPoolTypeRequest, useInterfaces: boolean = true): Promise<QueryPoolTypeResponse> {
    const data = QueryPoolTypeRequest.encode(request).finish();
    const promise = this.rpc.request("osmosis.gamm.v1beta1.Query", "PoolType", data);
    return promise.then(data => QueryPoolTypeResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  calcJoinPoolNoSwapShares(request: QueryCalcJoinPoolNoSwapSharesRequest, useInterfaces: boolean = true): Promise<QueryCalcJoinPoolNoSwapSharesResponse> {
    const data = QueryCalcJoinPoolNoSwapSharesRequest.encode(request).finish();
    const promise = this.rpc.request("osmosis.gamm.v1beta1.Query", "CalcJoinPoolNoSwapShares", data);
    return promise.then(data => QueryCalcJoinPoolNoSwapSharesResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  calcJoinPoolShares(request: QueryCalcJoinPoolSharesRequest, useInterfaces: boolean = true): Promise<QueryCalcJoinPoolSharesResponse> {
    const data = QueryCalcJoinPoolSharesRequest.encode(request).finish();
    const promise = this.rpc.request("osmosis.gamm.v1beta1.Query", "CalcJoinPoolShares", data);
    return promise.then(data => QueryCalcJoinPoolSharesResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  calcExitPoolCoinsFromShares(request: QueryCalcExitPoolCoinsFromSharesRequest, useInterfaces: boolean = true): Promise<QueryCalcExitPoolCoinsFromSharesResponse> {
    const data = QueryCalcExitPoolCoinsFromSharesRequest.encode(request).finish();
    const promise = this.rpc.request("osmosis.gamm.v1beta1.Query", "CalcExitPoolCoinsFromShares", data);
    return promise.then(data => QueryCalcExitPoolCoinsFromSharesResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  poolParams(request: QueryPoolParamsRequest, useInterfaces: boolean = true): Promise<QueryPoolParamsResponse> {
    const data = QueryPoolParamsRequest.encode(request).finish();
    const promise = this.rpc.request("osmosis.gamm.v1beta1.Query", "PoolParams", data);
    return promise.then(data => QueryPoolParamsResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  totalPoolLiquidity(request: QueryTotalPoolLiquidityRequest, useInterfaces: boolean = true): Promise<QueryTotalPoolLiquidityResponse> {
    const data = QueryTotalPoolLiquidityRequest.encode(request).finish();
    const promise = this.rpc.request("osmosis.gamm.v1beta1.Query", "TotalPoolLiquidity", data);
    return promise.then(data => QueryTotalPoolLiquidityResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  totalShares(request: QueryTotalSharesRequest, useInterfaces: boolean = true): Promise<QueryTotalSharesResponse> {
    const data = QueryTotalSharesRequest.encode(request).finish();
    const promise = this.rpc.request("osmosis.gamm.v1beta1.Query", "TotalShares", data);
    return promise.then(data => QueryTotalSharesResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  spotPrice(request: QuerySpotPriceRequest, useInterfaces: boolean = true): Promise<QuerySpotPriceResponse> {
    const data = QuerySpotPriceRequest.encode(request).finish();
    const promise = this.rpc.request("osmosis.gamm.v1beta1.Query", "SpotPrice", data);
    return promise.then(data => QuerySpotPriceResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  estimateSwapExactAmountIn(request: QuerySwapExactAmountInRequest, useInterfaces: boolean = true): Promise<QuerySwapExactAmountInResponse> {
    const data = QuerySwapExactAmountInRequest.encode(request).finish();
    const promise = this.rpc.request("osmosis.gamm.v1beta1.Query", "EstimateSwapExactAmountIn", data);
    return promise.then(data => QuerySwapExactAmountInResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  estimateSwapExactAmountOut(request: QuerySwapExactAmountOutRequest, useInterfaces: boolean = true): Promise<QuerySwapExactAmountOutResponse> {
    const data = QuerySwapExactAmountOutRequest.encode(request).finish();
    const promise = this.rpc.request("osmosis.gamm.v1beta1.Query", "EstimateSwapExactAmountOut", data);
    return promise.then(data => QuerySwapExactAmountOutResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  concentratedPoolIdLinkFromCFMM(request: QueryConcentratedPoolIdLinkFromCFMMRequest, useInterfaces: boolean = true): Promise<QueryConcentratedPoolIdLinkFromCFMMResponse> {
    const data = QueryConcentratedPoolIdLinkFromCFMMRequest.encode(request).finish();
    const promise = this.rpc.request("osmosis.gamm.v1beta1.Query", "ConcentratedPoolIdLinkFromCFMM", data);
    return promise.then(data => QueryConcentratedPoolIdLinkFromCFMMResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  cFMMConcentratedPoolLinks(request: QueryCFMMConcentratedPoolLinksRequest = {}, useInterfaces: boolean = true): Promise<QueryCFMMConcentratedPoolLinksResponse> {
    const data = QueryCFMMConcentratedPoolLinksRequest.encode(request).finish();
    const promise = this.rpc.request("osmosis.gamm.v1beta1.Query", "CFMMConcentratedPoolLinks", data);
    return promise.then(data => QueryCFMMConcentratedPoolLinksResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
}
export const createRpcQueryExtension = (base: QueryClient) => {
  const rpc = createProtobufRpcClient(base);
  const queryService = new QueryClientImpl(rpc);
  return {
    pools(request?: QueryPoolsRequest, useInterfaces: boolean = true): Promise<QueryPoolsResponse> {
      return queryService.pools(request, useInterfaces);
    },
    numPools(request?: QueryNumPoolsRequest, useInterfaces: boolean = true): Promise<QueryNumPoolsResponse> {
      return queryService.numPools(request, useInterfaces);
    },
    totalLiquidity(request?: QueryTotalLiquidityRequest, useInterfaces: boolean = true): Promise<QueryTotalLiquidityResponse> {
      return queryService.totalLiquidity(request, useInterfaces);
    },
    poolsWithFilter(request: QueryPoolsWithFilterRequest, useInterfaces: boolean = true): Promise<QueryPoolsWithFilterResponse> {
      return queryService.poolsWithFilter(request, useInterfaces);
    },
    pool(request: QueryPoolRequest, useInterfaces: boolean = true): Promise<QueryPoolResponse> {
      return queryService.pool(request, useInterfaces);
    },
    poolType(request: QueryPoolTypeRequest, useInterfaces: boolean = true): Promise<QueryPoolTypeResponse> {
      return queryService.poolType(request, useInterfaces);
    },
    calcJoinPoolNoSwapShares(request: QueryCalcJoinPoolNoSwapSharesRequest, useInterfaces: boolean = true): Promise<QueryCalcJoinPoolNoSwapSharesResponse> {
      return queryService.calcJoinPoolNoSwapShares(request, useInterfaces);
    },
    calcJoinPoolShares(request: QueryCalcJoinPoolSharesRequest, useInterfaces: boolean = true): Promise<QueryCalcJoinPoolSharesResponse> {
      return queryService.calcJoinPoolShares(request, useInterfaces);
    },
    calcExitPoolCoinsFromShares(request: QueryCalcExitPoolCoinsFromSharesRequest, useInterfaces: boolean = true): Promise<QueryCalcExitPoolCoinsFromSharesResponse> {
      return queryService.calcExitPoolCoinsFromShares(request, useInterfaces);
    },
    poolParams(request: QueryPoolParamsRequest, useInterfaces: boolean = true): Promise<QueryPoolParamsResponse> {
      return queryService.poolParams(request, useInterfaces);
    },
    totalPoolLiquidity(request: QueryTotalPoolLiquidityRequest, useInterfaces: boolean = true): Promise<QueryTotalPoolLiquidityResponse> {
      return queryService.totalPoolLiquidity(request, useInterfaces);
    },
    totalShares(request: QueryTotalSharesRequest, useInterfaces: boolean = true): Promise<QueryTotalSharesResponse> {
      return queryService.totalShares(request, useInterfaces);
    },
    spotPrice(request: QuerySpotPriceRequest, useInterfaces: boolean = true): Promise<QuerySpotPriceResponse> {
      return queryService.spotPrice(request, useInterfaces);
    },
    estimateSwapExactAmountIn(request: QuerySwapExactAmountInRequest, useInterfaces: boolean = true): Promise<QuerySwapExactAmountInResponse> {
      return queryService.estimateSwapExactAmountIn(request, useInterfaces);
    },
    estimateSwapExactAmountOut(request: QuerySwapExactAmountOutRequest, useInterfaces: boolean = true): Promise<QuerySwapExactAmountOutResponse> {
      return queryService.estimateSwapExactAmountOut(request, useInterfaces);
    },
    concentratedPoolIdLinkFromCFMM(request: QueryConcentratedPoolIdLinkFromCFMMRequest, useInterfaces: boolean = true): Promise<QueryConcentratedPoolIdLinkFromCFMMResponse> {
      return queryService.concentratedPoolIdLinkFromCFMM(request, useInterfaces);
    },
    cFMMConcentratedPoolLinks(request?: QueryCFMMConcentratedPoolLinksRequest, useInterfaces: boolean = true): Promise<QueryCFMMConcentratedPoolLinksResponse> {
      return queryService.cFMMConcentratedPoolLinks(request, useInterfaces);
    }
  };
};