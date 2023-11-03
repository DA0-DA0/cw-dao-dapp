//@ts-nocheck
import { PageRequest, PageRequestAmino, PageRequestSDKType, PageResponse, PageResponseAmino, PageResponseSDKType } from "../../base/query/v1beta1/pagination";
import { Grant, GrantAmino, GrantSDKType, GrantAuthorization, GrantAuthorizationAmino, GrantAuthorizationSDKType } from "./authz";
import { BinaryReader, BinaryWriter } from "../../../binary";
/** QueryGrantsRequest is the request type for the Query/Grants RPC method. */
export interface QueryGrantsRequest {
  granter: string;
  grantee: string;
  /** Optional, msg_type_url, when set, will query only grants matching given msg type. */
  msgTypeUrl: string;
  /** pagination defines an pagination for the request. */
  pagination?: PageRequest | undefined;
}
export interface QueryGrantsRequestProtoMsg {
  typeUrl: "/cosmos.authz.v1beta1.QueryGrantsRequest";
  value: Uint8Array;
}
/** QueryGrantsRequest is the request type for the Query/Grants RPC method. */
export interface QueryGrantsRequestAmino {
  granter: string;
  grantee: string;
  /** Optional, msg_type_url, when set, will query only grants matching given msg type. */
  msg_type_url: string;
  /** pagination defines an pagination for the request. */
  pagination?: PageRequestAmino | undefined;
}
export interface QueryGrantsRequestAminoMsg {
  type: "cosmos-sdk/QueryGrantsRequest";
  value: QueryGrantsRequestAmino;
}
/** QueryGrantsRequest is the request type for the Query/Grants RPC method. */
export interface QueryGrantsRequestSDKType {
  granter: string;
  grantee: string;
  msg_type_url: string;
  pagination?: PageRequestSDKType | undefined;
}
/** QueryGrantsResponse is the response type for the Query/Authorizations RPC method. */
export interface QueryGrantsResponse {
  /** authorizations is a list of grants granted for grantee by granter. */
  grants: Grant[];
  /** pagination defines an pagination for the response. */
  pagination?: PageResponse | undefined;
}
export interface QueryGrantsResponseProtoMsg {
  typeUrl: "/cosmos.authz.v1beta1.QueryGrantsResponse";
  value: Uint8Array;
}
/** QueryGrantsResponse is the response type for the Query/Authorizations RPC method. */
export interface QueryGrantsResponseAmino {
  /** authorizations is a list of grants granted for grantee by granter. */
  grants: GrantAmino[];
  /** pagination defines an pagination for the response. */
  pagination?: PageResponseAmino | undefined;
}
export interface QueryGrantsResponseAminoMsg {
  type: "cosmos-sdk/QueryGrantsResponse";
  value: QueryGrantsResponseAmino;
}
/** QueryGrantsResponse is the response type for the Query/Authorizations RPC method. */
export interface QueryGrantsResponseSDKType {
  grants: GrantSDKType[];
  pagination?: PageResponseSDKType | undefined;
}
/** QueryGranterGrantsRequest is the request type for the Query/GranterGrants RPC method. */
export interface QueryGranterGrantsRequest {
  granter: string;
  /** pagination defines an pagination for the request. */
  pagination?: PageRequest | undefined;
}
export interface QueryGranterGrantsRequestProtoMsg {
  typeUrl: "/cosmos.authz.v1beta1.QueryGranterGrantsRequest";
  value: Uint8Array;
}
/** QueryGranterGrantsRequest is the request type for the Query/GranterGrants RPC method. */
export interface QueryGranterGrantsRequestAmino {
  granter: string;
  /** pagination defines an pagination for the request. */
  pagination?: PageRequestAmino | undefined;
}
export interface QueryGranterGrantsRequestAminoMsg {
  type: "cosmos-sdk/QueryGranterGrantsRequest";
  value: QueryGranterGrantsRequestAmino;
}
/** QueryGranterGrantsRequest is the request type for the Query/GranterGrants RPC method. */
export interface QueryGranterGrantsRequestSDKType {
  granter: string;
  pagination?: PageRequestSDKType | undefined;
}
/** QueryGranterGrantsResponse is the response type for the Query/GranterGrants RPC method. */
export interface QueryGranterGrantsResponse {
  /** grants is a list of grants granted by the granter. */
  grants: GrantAuthorization[];
  /** pagination defines an pagination for the response. */
  pagination?: PageResponse | undefined;
}
export interface QueryGranterGrantsResponseProtoMsg {
  typeUrl: "/cosmos.authz.v1beta1.QueryGranterGrantsResponse";
  value: Uint8Array;
}
/** QueryGranterGrantsResponse is the response type for the Query/GranterGrants RPC method. */
export interface QueryGranterGrantsResponseAmino {
  /** grants is a list of grants granted by the granter. */
  grants: GrantAuthorizationAmino[];
  /** pagination defines an pagination for the response. */
  pagination?: PageResponseAmino | undefined;
}
export interface QueryGranterGrantsResponseAminoMsg {
  type: "cosmos-sdk/QueryGranterGrantsResponse";
  value: QueryGranterGrantsResponseAmino;
}
/** QueryGranterGrantsResponse is the response type for the Query/GranterGrants RPC method. */
export interface QueryGranterGrantsResponseSDKType {
  grants: GrantAuthorizationSDKType[];
  pagination?: PageResponseSDKType | undefined;
}
/** QueryGranteeGrantsRequest is the request type for the Query/GranteeGrants RPC method. */
export interface QueryGranteeGrantsRequest {
  grantee: string;
  /** pagination defines an pagination for the request. */
  pagination?: PageRequest | undefined;
}
export interface QueryGranteeGrantsRequestProtoMsg {
  typeUrl: "/cosmos.authz.v1beta1.QueryGranteeGrantsRequest";
  value: Uint8Array;
}
/** QueryGranteeGrantsRequest is the request type for the Query/GranteeGrants RPC method. */
export interface QueryGranteeGrantsRequestAmino {
  grantee: string;
  /** pagination defines an pagination for the request. */
  pagination?: PageRequestAmino | undefined;
}
export interface QueryGranteeGrantsRequestAminoMsg {
  type: "cosmos-sdk/QueryGranteeGrantsRequest";
  value: QueryGranteeGrantsRequestAmino;
}
/** QueryGranteeGrantsRequest is the request type for the Query/GranteeGrants RPC method. */
export interface QueryGranteeGrantsRequestSDKType {
  grantee: string;
  pagination?: PageRequestSDKType | undefined;
}
/** QueryGranteeGrantsResponse is the response type for the Query/GranteeGrants RPC method. */
export interface QueryGranteeGrantsResponse {
  /** grants is a list of grants granted to the grantee. */
  grants: GrantAuthorization[];
  /** pagination defines an pagination for the response. */
  pagination?: PageResponse | undefined;
}
export interface QueryGranteeGrantsResponseProtoMsg {
  typeUrl: "/cosmos.authz.v1beta1.QueryGranteeGrantsResponse";
  value: Uint8Array;
}
/** QueryGranteeGrantsResponse is the response type for the Query/GranteeGrants RPC method. */
export interface QueryGranteeGrantsResponseAmino {
  /** grants is a list of grants granted to the grantee. */
  grants: GrantAuthorizationAmino[];
  /** pagination defines an pagination for the response. */
  pagination?: PageResponseAmino | undefined;
}
export interface QueryGranteeGrantsResponseAminoMsg {
  type: "cosmos-sdk/QueryGranteeGrantsResponse";
  value: QueryGranteeGrantsResponseAmino;
}
/** QueryGranteeGrantsResponse is the response type for the Query/GranteeGrants RPC method. */
export interface QueryGranteeGrantsResponseSDKType {
  grants: GrantAuthorizationSDKType[];
  pagination?: PageResponseSDKType | undefined;
}
function createBaseQueryGrantsRequest(): QueryGrantsRequest {
  return {
    granter: "",
    grantee: "",
    msgTypeUrl: "",
    pagination: undefined
  };
}
export const QueryGrantsRequest = {
  typeUrl: "/cosmos.authz.v1beta1.QueryGrantsRequest",
  encode(message: QueryGrantsRequest, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.granter !== "") {
      writer.uint32(10).string(message.granter);
    }
    if (message.grantee !== "") {
      writer.uint32(18).string(message.grantee);
    }
    if (message.msgTypeUrl !== "") {
      writer.uint32(26).string(message.msgTypeUrl);
    }
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(34).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): QueryGrantsRequest {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGrantsRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.granter = reader.string();
          break;
        case 2:
          message.grantee = reader.string();
          break;
        case 3:
          message.msgTypeUrl = reader.string();
          break;
        case 4:
          message.pagination = PageRequest.decode(reader, reader.uint32(), useInterfaces);
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<QueryGrantsRequest>): QueryGrantsRequest {
    const message = createBaseQueryGrantsRequest();
    message.granter = object.granter ?? "";
    message.grantee = object.grantee ?? "";
    message.msgTypeUrl = object.msgTypeUrl ?? "";
    message.pagination = object.pagination !== undefined && object.pagination !== null ? PageRequest.fromPartial(object.pagination) : undefined;
    return message;
  },
  fromAmino(object: QueryGrantsRequestAmino): QueryGrantsRequest {
    return {
      granter: object.granter,
      grantee: object.grantee,
      msgTypeUrl: object.msg_type_url,
      pagination: object?.pagination ? PageRequest.fromAmino(object.pagination) : undefined
    };
  },
  toAmino(message: QueryGrantsRequest, useInterfaces: boolean = false): QueryGrantsRequestAmino {
    const obj: any = {};
    obj.granter = message.granter;
    obj.grantee = message.grantee;
    obj.msg_type_url = message.msgTypeUrl;
    obj.pagination = message.pagination ? PageRequest.toAmino(message.pagination, useInterfaces) : undefined;
    return obj;
  },
  fromAminoMsg(object: QueryGrantsRequestAminoMsg): QueryGrantsRequest {
    return QueryGrantsRequest.fromAmino(object.value);
  },
  toAminoMsg(message: QueryGrantsRequest, useInterfaces: boolean = false): QueryGrantsRequestAminoMsg {
    return {
      type: "cosmos-sdk/QueryGrantsRequest",
      value: QueryGrantsRequest.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: QueryGrantsRequestProtoMsg, useInterfaces: boolean = false): QueryGrantsRequest {
    return QueryGrantsRequest.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: QueryGrantsRequest): Uint8Array {
    return QueryGrantsRequest.encode(message).finish();
  },
  toProtoMsg(message: QueryGrantsRequest): QueryGrantsRequestProtoMsg {
    return {
      typeUrl: "/cosmos.authz.v1beta1.QueryGrantsRequest",
      value: QueryGrantsRequest.encode(message).finish()
    };
  }
};
function createBaseQueryGrantsResponse(): QueryGrantsResponse {
  return {
    grants: [],
    pagination: undefined
  };
}
export const QueryGrantsResponse = {
  typeUrl: "/cosmos.authz.v1beta1.QueryGrantsResponse",
  encode(message: QueryGrantsResponse, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    for (const v of message.grants) {
      Grant.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(message.pagination, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): QueryGrantsResponse {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGrantsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.grants.push(Grant.decode(reader, reader.uint32(), useInterfaces));
          break;
        case 2:
          message.pagination = PageResponse.decode(reader, reader.uint32(), useInterfaces);
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<QueryGrantsResponse>): QueryGrantsResponse {
    const message = createBaseQueryGrantsResponse();
    message.grants = object.grants?.map(e => Grant.fromPartial(e)) || [];
    message.pagination = object.pagination !== undefined && object.pagination !== null ? PageResponse.fromPartial(object.pagination) : undefined;
    return message;
  },
  fromAmino(object: QueryGrantsResponseAmino): QueryGrantsResponse {
    return {
      grants: Array.isArray(object?.grants) ? object.grants.map((e: any) => Grant.fromAmino(e)) : [],
      pagination: object?.pagination ? PageResponse.fromAmino(object.pagination) : undefined
    };
  },
  toAmino(message: QueryGrantsResponse, useInterfaces: boolean = false): QueryGrantsResponseAmino {
    const obj: any = {};
    if (message.grants) {
      obj.grants = message.grants.map(e => e ? Grant.toAmino(e, useInterfaces) : undefined);
    } else {
      obj.grants = [];
    }
    obj.pagination = message.pagination ? PageResponse.toAmino(message.pagination, useInterfaces) : undefined;
    return obj;
  },
  fromAminoMsg(object: QueryGrantsResponseAminoMsg): QueryGrantsResponse {
    return QueryGrantsResponse.fromAmino(object.value);
  },
  toAminoMsg(message: QueryGrantsResponse, useInterfaces: boolean = false): QueryGrantsResponseAminoMsg {
    return {
      type: "cosmos-sdk/QueryGrantsResponse",
      value: QueryGrantsResponse.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: QueryGrantsResponseProtoMsg, useInterfaces: boolean = false): QueryGrantsResponse {
    return QueryGrantsResponse.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: QueryGrantsResponse): Uint8Array {
    return QueryGrantsResponse.encode(message).finish();
  },
  toProtoMsg(message: QueryGrantsResponse): QueryGrantsResponseProtoMsg {
    return {
      typeUrl: "/cosmos.authz.v1beta1.QueryGrantsResponse",
      value: QueryGrantsResponse.encode(message).finish()
    };
  }
};
function createBaseQueryGranterGrantsRequest(): QueryGranterGrantsRequest {
  return {
    granter: "",
    pagination: undefined
  };
}
export const QueryGranterGrantsRequest = {
  typeUrl: "/cosmos.authz.v1beta1.QueryGranterGrantsRequest",
  encode(message: QueryGranterGrantsRequest, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.granter !== "") {
      writer.uint32(10).string(message.granter);
    }
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): QueryGranterGrantsRequest {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGranterGrantsRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.granter = reader.string();
          break;
        case 2:
          message.pagination = PageRequest.decode(reader, reader.uint32(), useInterfaces);
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<QueryGranterGrantsRequest>): QueryGranterGrantsRequest {
    const message = createBaseQueryGranterGrantsRequest();
    message.granter = object.granter ?? "";
    message.pagination = object.pagination !== undefined && object.pagination !== null ? PageRequest.fromPartial(object.pagination) : undefined;
    return message;
  },
  fromAmino(object: QueryGranterGrantsRequestAmino): QueryGranterGrantsRequest {
    return {
      granter: object.granter,
      pagination: object?.pagination ? PageRequest.fromAmino(object.pagination) : undefined
    };
  },
  toAmino(message: QueryGranterGrantsRequest, useInterfaces: boolean = false): QueryGranterGrantsRequestAmino {
    const obj: any = {};
    obj.granter = message.granter;
    obj.pagination = message.pagination ? PageRequest.toAmino(message.pagination, useInterfaces) : undefined;
    return obj;
  },
  fromAminoMsg(object: QueryGranterGrantsRequestAminoMsg): QueryGranterGrantsRequest {
    return QueryGranterGrantsRequest.fromAmino(object.value);
  },
  toAminoMsg(message: QueryGranterGrantsRequest, useInterfaces: boolean = false): QueryGranterGrantsRequestAminoMsg {
    return {
      type: "cosmos-sdk/QueryGranterGrantsRequest",
      value: QueryGranterGrantsRequest.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: QueryGranterGrantsRequestProtoMsg, useInterfaces: boolean = false): QueryGranterGrantsRequest {
    return QueryGranterGrantsRequest.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: QueryGranterGrantsRequest): Uint8Array {
    return QueryGranterGrantsRequest.encode(message).finish();
  },
  toProtoMsg(message: QueryGranterGrantsRequest): QueryGranterGrantsRequestProtoMsg {
    return {
      typeUrl: "/cosmos.authz.v1beta1.QueryGranterGrantsRequest",
      value: QueryGranterGrantsRequest.encode(message).finish()
    };
  }
};
function createBaseQueryGranterGrantsResponse(): QueryGranterGrantsResponse {
  return {
    grants: [],
    pagination: undefined
  };
}
export const QueryGranterGrantsResponse = {
  typeUrl: "/cosmos.authz.v1beta1.QueryGranterGrantsResponse",
  encode(message: QueryGranterGrantsResponse, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    for (const v of message.grants) {
      GrantAuthorization.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(message.pagination, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): QueryGranterGrantsResponse {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGranterGrantsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.grants.push(GrantAuthorization.decode(reader, reader.uint32(), useInterfaces));
          break;
        case 2:
          message.pagination = PageResponse.decode(reader, reader.uint32(), useInterfaces);
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<QueryGranterGrantsResponse>): QueryGranterGrantsResponse {
    const message = createBaseQueryGranterGrantsResponse();
    message.grants = object.grants?.map(e => GrantAuthorization.fromPartial(e)) || [];
    message.pagination = object.pagination !== undefined && object.pagination !== null ? PageResponse.fromPartial(object.pagination) : undefined;
    return message;
  },
  fromAmino(object: QueryGranterGrantsResponseAmino): QueryGranterGrantsResponse {
    return {
      grants: Array.isArray(object?.grants) ? object.grants.map((e: any) => GrantAuthorization.fromAmino(e)) : [],
      pagination: object?.pagination ? PageResponse.fromAmino(object.pagination) : undefined
    };
  },
  toAmino(message: QueryGranterGrantsResponse, useInterfaces: boolean = false): QueryGranterGrantsResponseAmino {
    const obj: any = {};
    if (message.grants) {
      obj.grants = message.grants.map(e => e ? GrantAuthorization.toAmino(e, useInterfaces) : undefined);
    } else {
      obj.grants = [];
    }
    obj.pagination = message.pagination ? PageResponse.toAmino(message.pagination, useInterfaces) : undefined;
    return obj;
  },
  fromAminoMsg(object: QueryGranterGrantsResponseAminoMsg): QueryGranterGrantsResponse {
    return QueryGranterGrantsResponse.fromAmino(object.value);
  },
  toAminoMsg(message: QueryGranterGrantsResponse, useInterfaces: boolean = false): QueryGranterGrantsResponseAminoMsg {
    return {
      type: "cosmos-sdk/QueryGranterGrantsResponse",
      value: QueryGranterGrantsResponse.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: QueryGranterGrantsResponseProtoMsg, useInterfaces: boolean = false): QueryGranterGrantsResponse {
    return QueryGranterGrantsResponse.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: QueryGranterGrantsResponse): Uint8Array {
    return QueryGranterGrantsResponse.encode(message).finish();
  },
  toProtoMsg(message: QueryGranterGrantsResponse): QueryGranterGrantsResponseProtoMsg {
    return {
      typeUrl: "/cosmos.authz.v1beta1.QueryGranterGrantsResponse",
      value: QueryGranterGrantsResponse.encode(message).finish()
    };
  }
};
function createBaseQueryGranteeGrantsRequest(): QueryGranteeGrantsRequest {
  return {
    grantee: "",
    pagination: undefined
  };
}
export const QueryGranteeGrantsRequest = {
  typeUrl: "/cosmos.authz.v1beta1.QueryGranteeGrantsRequest",
  encode(message: QueryGranteeGrantsRequest, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.grantee !== "") {
      writer.uint32(10).string(message.grantee);
    }
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): QueryGranteeGrantsRequest {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGranteeGrantsRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.grantee = reader.string();
          break;
        case 2:
          message.pagination = PageRequest.decode(reader, reader.uint32(), useInterfaces);
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<QueryGranteeGrantsRequest>): QueryGranteeGrantsRequest {
    const message = createBaseQueryGranteeGrantsRequest();
    message.grantee = object.grantee ?? "";
    message.pagination = object.pagination !== undefined && object.pagination !== null ? PageRequest.fromPartial(object.pagination) : undefined;
    return message;
  },
  fromAmino(object: QueryGranteeGrantsRequestAmino): QueryGranteeGrantsRequest {
    return {
      grantee: object.grantee,
      pagination: object?.pagination ? PageRequest.fromAmino(object.pagination) : undefined
    };
  },
  toAmino(message: QueryGranteeGrantsRequest, useInterfaces: boolean = false): QueryGranteeGrantsRequestAmino {
    const obj: any = {};
    obj.grantee = message.grantee;
    obj.pagination = message.pagination ? PageRequest.toAmino(message.pagination, useInterfaces) : undefined;
    return obj;
  },
  fromAminoMsg(object: QueryGranteeGrantsRequestAminoMsg): QueryGranteeGrantsRequest {
    return QueryGranteeGrantsRequest.fromAmino(object.value);
  },
  toAminoMsg(message: QueryGranteeGrantsRequest, useInterfaces: boolean = false): QueryGranteeGrantsRequestAminoMsg {
    return {
      type: "cosmos-sdk/QueryGranteeGrantsRequest",
      value: QueryGranteeGrantsRequest.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: QueryGranteeGrantsRequestProtoMsg, useInterfaces: boolean = false): QueryGranteeGrantsRequest {
    return QueryGranteeGrantsRequest.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: QueryGranteeGrantsRequest): Uint8Array {
    return QueryGranteeGrantsRequest.encode(message).finish();
  },
  toProtoMsg(message: QueryGranteeGrantsRequest): QueryGranteeGrantsRequestProtoMsg {
    return {
      typeUrl: "/cosmos.authz.v1beta1.QueryGranteeGrantsRequest",
      value: QueryGranteeGrantsRequest.encode(message).finish()
    };
  }
};
function createBaseQueryGranteeGrantsResponse(): QueryGranteeGrantsResponse {
  return {
    grants: [],
    pagination: undefined
  };
}
export const QueryGranteeGrantsResponse = {
  typeUrl: "/cosmos.authz.v1beta1.QueryGranteeGrantsResponse",
  encode(message: QueryGranteeGrantsResponse, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    for (const v of message.grants) {
      GrantAuthorization.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(message.pagination, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number, useInterfaces: boolean = false): QueryGranteeGrantsResponse {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGranteeGrantsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.grants.push(GrantAuthorization.decode(reader, reader.uint32(), useInterfaces));
          break;
        case 2:
          message.pagination = PageResponse.decode(reader, reader.uint32(), useInterfaces);
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object: Partial<QueryGranteeGrantsResponse>): QueryGranteeGrantsResponse {
    const message = createBaseQueryGranteeGrantsResponse();
    message.grants = object.grants?.map(e => GrantAuthorization.fromPartial(e)) || [];
    message.pagination = object.pagination !== undefined && object.pagination !== null ? PageResponse.fromPartial(object.pagination) : undefined;
    return message;
  },
  fromAmino(object: QueryGranteeGrantsResponseAmino): QueryGranteeGrantsResponse {
    return {
      grants: Array.isArray(object?.grants) ? object.grants.map((e: any) => GrantAuthorization.fromAmino(e)) : [],
      pagination: object?.pagination ? PageResponse.fromAmino(object.pagination) : undefined
    };
  },
  toAmino(message: QueryGranteeGrantsResponse, useInterfaces: boolean = false): QueryGranteeGrantsResponseAmino {
    const obj: any = {};
    if (message.grants) {
      obj.grants = message.grants.map(e => e ? GrantAuthorization.toAmino(e, useInterfaces) : undefined);
    } else {
      obj.grants = [];
    }
    obj.pagination = message.pagination ? PageResponse.toAmino(message.pagination, useInterfaces) : undefined;
    return obj;
  },
  fromAminoMsg(object: QueryGranteeGrantsResponseAminoMsg): QueryGranteeGrantsResponse {
    return QueryGranteeGrantsResponse.fromAmino(object.value);
  },
  toAminoMsg(message: QueryGranteeGrantsResponse, useInterfaces: boolean = false): QueryGranteeGrantsResponseAminoMsg {
    return {
      type: "cosmos-sdk/QueryGranteeGrantsResponse",
      value: QueryGranteeGrantsResponse.toAmino(message, useInterfaces)
    };
  },
  fromProtoMsg(message: QueryGranteeGrantsResponseProtoMsg, useInterfaces: boolean = false): QueryGranteeGrantsResponse {
    return QueryGranteeGrantsResponse.decode(message.value, undefined, useInterfaces);
  },
  toProto(message: QueryGranteeGrantsResponse): Uint8Array {
    return QueryGranteeGrantsResponse.encode(message).finish();
  },
  toProtoMsg(message: QueryGranteeGrantsResponse): QueryGranteeGrantsResponseProtoMsg {
    return {
      typeUrl: "/cosmos.authz.v1beta1.QueryGranteeGrantsResponse",
      value: QueryGranteeGrantsResponse.encode(message).finish()
    };
  }
};