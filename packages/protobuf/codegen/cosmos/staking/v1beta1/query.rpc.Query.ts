import { Rpc } from "../../../helpers";
import { BinaryReader } from "../../../binary";
import { QueryClient, createProtobufRpcClient } from "@cosmjs/stargate";
import { QueryValidatorsRequest, QueryValidatorsResponse, QueryValidatorRequest, QueryValidatorResponse, QueryValidatorDelegationsRequest, QueryValidatorDelegationsResponse, QueryValidatorUnbondingDelegationsRequest, QueryValidatorUnbondingDelegationsResponse, QueryDelegationRequest, QueryDelegationResponse, QueryUnbondingDelegationRequest, QueryUnbondingDelegationResponse, QueryDelegatorDelegationsRequest, QueryDelegatorDelegationsResponse, QueryDelegatorUnbondingDelegationsRequest, QueryDelegatorUnbondingDelegationsResponse, QueryRedelegationsRequest, QueryRedelegationsResponse, QueryDelegatorValidatorsRequest, QueryDelegatorValidatorsResponse, QueryDelegatorValidatorRequest, QueryDelegatorValidatorResponse, QueryHistoricalInfoRequest, QueryHistoricalInfoResponse, QueryPoolRequest, QueryPoolResponse, QueryParamsRequest, QueryParamsResponse } from "./query";
/** Query defines the gRPC querier service. */
export interface Query {
  /**
   * Validators queries all validators that match the given status.
   * 
   * When called from another module, this query might consume a high amount of
   * gas if the pagination field is incorrectly set.
   */
  validators(request: QueryValidatorsRequest): Promise<QueryValidatorsResponse>;
  /** Validator queries validator info for given validator address. */
  validator(request: QueryValidatorRequest): Promise<QueryValidatorResponse>;
  /**
   * ValidatorDelegations queries delegate info for given validator.
   * 
   * When called from another module, this query might consume a high amount of
   * gas if the pagination field is incorrectly set.
   */
  validatorDelegations(request: QueryValidatorDelegationsRequest): Promise<QueryValidatorDelegationsResponse>;
  /**
   * ValidatorUnbondingDelegations queries unbonding delegations of a validator.
   * 
   * When called from another module, this query might consume a high amount of
   * gas if the pagination field is incorrectly set.
   */
  validatorUnbondingDelegations(request: QueryValidatorUnbondingDelegationsRequest): Promise<QueryValidatorUnbondingDelegationsResponse>;
  /** Delegation queries delegate info for given validator delegator pair. */
  delegation(request: QueryDelegationRequest): Promise<QueryDelegationResponse>;
  /**
   * UnbondingDelegation queries unbonding info for given validator delegator
   * pair.
   */
  unbondingDelegation(request: QueryUnbondingDelegationRequest): Promise<QueryUnbondingDelegationResponse>;
  /**
   * DelegatorDelegations queries all delegations of a given delegator address.
   * 
   * When called from another module, this query might consume a high amount of
   * gas if the pagination field is incorrectly set.
   */
  delegatorDelegations(request: QueryDelegatorDelegationsRequest): Promise<QueryDelegatorDelegationsResponse>;
  /**
   * DelegatorUnbondingDelegations queries all unbonding delegations of a given
   * delegator address.
   * 
   * When called from another module, this query might consume a high amount of
   * gas if the pagination field is incorrectly set.
   */
  delegatorUnbondingDelegations(request: QueryDelegatorUnbondingDelegationsRequest): Promise<QueryDelegatorUnbondingDelegationsResponse>;
  /**
   * Redelegations queries redelegations of given address.
   * 
   * When called from another module, this query might consume a high amount of
   * gas if the pagination field is incorrectly set.
   */
  redelegations(request: QueryRedelegationsRequest): Promise<QueryRedelegationsResponse>;
  /**
   * DelegatorValidators queries all validators info for given delegator
   * address.
   * 
   * When called from another module, this query might consume a high amount of
   * gas if the pagination field is incorrectly set.
   */
  delegatorValidators(request: QueryDelegatorValidatorsRequest): Promise<QueryDelegatorValidatorsResponse>;
  /**
   * DelegatorValidator queries validator info for given delegator validator
   * pair.
   */
  delegatorValidator(request: QueryDelegatorValidatorRequest): Promise<QueryDelegatorValidatorResponse>;
  /** HistoricalInfo queries the historical info for given height. */
  historicalInfo(request: QueryHistoricalInfoRequest): Promise<QueryHistoricalInfoResponse>;
  /** Pool queries the pool info. */
  pool(request?: QueryPoolRequest): Promise<QueryPoolResponse>;
  /** Parameters queries the staking parameters. */
  params(request?: QueryParamsRequest): Promise<QueryParamsResponse>;
}
export class QueryClientImpl implements Query {
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.validators = this.validators.bind(this);
    this.validator = this.validator.bind(this);
    this.validatorDelegations = this.validatorDelegations.bind(this);
    this.validatorUnbondingDelegations = this.validatorUnbondingDelegations.bind(this);
    this.delegation = this.delegation.bind(this);
    this.unbondingDelegation = this.unbondingDelegation.bind(this);
    this.delegatorDelegations = this.delegatorDelegations.bind(this);
    this.delegatorUnbondingDelegations = this.delegatorUnbondingDelegations.bind(this);
    this.redelegations = this.redelegations.bind(this);
    this.delegatorValidators = this.delegatorValidators.bind(this);
    this.delegatorValidator = this.delegatorValidator.bind(this);
    this.historicalInfo = this.historicalInfo.bind(this);
    this.pool = this.pool.bind(this);
    this.params = this.params.bind(this);
  }
  validators(request: QueryValidatorsRequest, useInterfaces: boolean = true): Promise<QueryValidatorsResponse> {
    const data = QueryValidatorsRequest.encode(request).finish();
    const promise = this.rpc.request("cosmos.staking.v1beta1.Query", "Validators", data);
    return promise.then(data => QueryValidatorsResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  validator(request: QueryValidatorRequest, useInterfaces: boolean = true): Promise<QueryValidatorResponse> {
    const data = QueryValidatorRequest.encode(request).finish();
    const promise = this.rpc.request("cosmos.staking.v1beta1.Query", "Validator", data);
    return promise.then(data => QueryValidatorResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  validatorDelegations(request: QueryValidatorDelegationsRequest, useInterfaces: boolean = true): Promise<QueryValidatorDelegationsResponse> {
    const data = QueryValidatorDelegationsRequest.encode(request).finish();
    const promise = this.rpc.request("cosmos.staking.v1beta1.Query", "ValidatorDelegations", data);
    return promise.then(data => QueryValidatorDelegationsResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  validatorUnbondingDelegations(request: QueryValidatorUnbondingDelegationsRequest, useInterfaces: boolean = true): Promise<QueryValidatorUnbondingDelegationsResponse> {
    const data = QueryValidatorUnbondingDelegationsRequest.encode(request).finish();
    const promise = this.rpc.request("cosmos.staking.v1beta1.Query", "ValidatorUnbondingDelegations", data);
    return promise.then(data => QueryValidatorUnbondingDelegationsResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  delegation(request: QueryDelegationRequest, useInterfaces: boolean = true): Promise<QueryDelegationResponse> {
    const data = QueryDelegationRequest.encode(request).finish();
    const promise = this.rpc.request("cosmos.staking.v1beta1.Query", "Delegation", data);
    return promise.then(data => QueryDelegationResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  unbondingDelegation(request: QueryUnbondingDelegationRequest, useInterfaces: boolean = true): Promise<QueryUnbondingDelegationResponse> {
    const data = QueryUnbondingDelegationRequest.encode(request).finish();
    const promise = this.rpc.request("cosmos.staking.v1beta1.Query", "UnbondingDelegation", data);
    return promise.then(data => QueryUnbondingDelegationResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  delegatorDelegations(request: QueryDelegatorDelegationsRequest, useInterfaces: boolean = true): Promise<QueryDelegatorDelegationsResponse> {
    const data = QueryDelegatorDelegationsRequest.encode(request).finish();
    const promise = this.rpc.request("cosmos.staking.v1beta1.Query", "DelegatorDelegations", data);
    return promise.then(data => QueryDelegatorDelegationsResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  delegatorUnbondingDelegations(request: QueryDelegatorUnbondingDelegationsRequest, useInterfaces: boolean = true): Promise<QueryDelegatorUnbondingDelegationsResponse> {
    const data = QueryDelegatorUnbondingDelegationsRequest.encode(request).finish();
    const promise = this.rpc.request("cosmos.staking.v1beta1.Query", "DelegatorUnbondingDelegations", data);
    return promise.then(data => QueryDelegatorUnbondingDelegationsResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  redelegations(request: QueryRedelegationsRequest, useInterfaces: boolean = true): Promise<QueryRedelegationsResponse> {
    const data = QueryRedelegationsRequest.encode(request).finish();
    const promise = this.rpc.request("cosmos.staking.v1beta1.Query", "Redelegations", data);
    return promise.then(data => QueryRedelegationsResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  delegatorValidators(request: QueryDelegatorValidatorsRequest, useInterfaces: boolean = true): Promise<QueryDelegatorValidatorsResponse> {
    const data = QueryDelegatorValidatorsRequest.encode(request).finish();
    const promise = this.rpc.request("cosmos.staking.v1beta1.Query", "DelegatorValidators", data);
    return promise.then(data => QueryDelegatorValidatorsResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  delegatorValidator(request: QueryDelegatorValidatorRequest, useInterfaces: boolean = true): Promise<QueryDelegatorValidatorResponse> {
    const data = QueryDelegatorValidatorRequest.encode(request).finish();
    const promise = this.rpc.request("cosmos.staking.v1beta1.Query", "DelegatorValidator", data);
    return promise.then(data => QueryDelegatorValidatorResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  historicalInfo(request: QueryHistoricalInfoRequest, useInterfaces: boolean = true): Promise<QueryHistoricalInfoResponse> {
    const data = QueryHistoricalInfoRequest.encode(request).finish();
    const promise = this.rpc.request("cosmos.staking.v1beta1.Query", "HistoricalInfo", data);
    return promise.then(data => QueryHistoricalInfoResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  pool(request: QueryPoolRequest = {}, useInterfaces: boolean = true): Promise<QueryPoolResponse> {
    const data = QueryPoolRequest.encode(request).finish();
    const promise = this.rpc.request("cosmos.staking.v1beta1.Query", "Pool", data);
    return promise.then(data => QueryPoolResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  params(request: QueryParamsRequest = {}, useInterfaces: boolean = true): Promise<QueryParamsResponse> {
    const data = QueryParamsRequest.encode(request).finish();
    const promise = this.rpc.request("cosmos.staking.v1beta1.Query", "Params", data);
    return promise.then(data => QueryParamsResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
}
export const createRpcQueryExtension = (base: QueryClient) => {
  const rpc = createProtobufRpcClient(base);
  const queryService = new QueryClientImpl(rpc);
  return {
    validators(request: QueryValidatorsRequest, useInterfaces: boolean = true): Promise<QueryValidatorsResponse> {
      return queryService.validators(request, useInterfaces);
    },
    validator(request: QueryValidatorRequest, useInterfaces: boolean = true): Promise<QueryValidatorResponse> {
      return queryService.validator(request, useInterfaces);
    },
    validatorDelegations(request: QueryValidatorDelegationsRequest, useInterfaces: boolean = true): Promise<QueryValidatorDelegationsResponse> {
      return queryService.validatorDelegations(request, useInterfaces);
    },
    validatorUnbondingDelegations(request: QueryValidatorUnbondingDelegationsRequest, useInterfaces: boolean = true): Promise<QueryValidatorUnbondingDelegationsResponse> {
      return queryService.validatorUnbondingDelegations(request, useInterfaces);
    },
    delegation(request: QueryDelegationRequest, useInterfaces: boolean = true): Promise<QueryDelegationResponse> {
      return queryService.delegation(request, useInterfaces);
    },
    unbondingDelegation(request: QueryUnbondingDelegationRequest, useInterfaces: boolean = true): Promise<QueryUnbondingDelegationResponse> {
      return queryService.unbondingDelegation(request, useInterfaces);
    },
    delegatorDelegations(request: QueryDelegatorDelegationsRequest, useInterfaces: boolean = true): Promise<QueryDelegatorDelegationsResponse> {
      return queryService.delegatorDelegations(request, useInterfaces);
    },
    delegatorUnbondingDelegations(request: QueryDelegatorUnbondingDelegationsRequest, useInterfaces: boolean = true): Promise<QueryDelegatorUnbondingDelegationsResponse> {
      return queryService.delegatorUnbondingDelegations(request, useInterfaces);
    },
    redelegations(request: QueryRedelegationsRequest, useInterfaces: boolean = true): Promise<QueryRedelegationsResponse> {
      return queryService.redelegations(request, useInterfaces);
    },
    delegatorValidators(request: QueryDelegatorValidatorsRequest, useInterfaces: boolean = true): Promise<QueryDelegatorValidatorsResponse> {
      return queryService.delegatorValidators(request, useInterfaces);
    },
    delegatorValidator(request: QueryDelegatorValidatorRequest, useInterfaces: boolean = true): Promise<QueryDelegatorValidatorResponse> {
      return queryService.delegatorValidator(request, useInterfaces);
    },
    historicalInfo(request: QueryHistoricalInfoRequest, useInterfaces: boolean = true): Promise<QueryHistoricalInfoResponse> {
      return queryService.historicalInfo(request, useInterfaces);
    },
    pool(request?: QueryPoolRequest, useInterfaces: boolean = true): Promise<QueryPoolResponse> {
      return queryService.pool(request, useInterfaces);
    },
    params(request?: QueryParamsRequest, useInterfaces: boolean = true): Promise<QueryParamsResponse> {
      return queryService.params(request, useInterfaces);
    }
  };
};