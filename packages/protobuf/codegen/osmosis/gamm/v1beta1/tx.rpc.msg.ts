import { Rpc } from "../../../helpers";
import { BinaryReader } from "../../../binary";
import { MsgJoinPool, MsgJoinPoolResponse, MsgExitPool, MsgExitPoolResponse, MsgSwapExactAmountIn, MsgSwapExactAmountInResponse, MsgSwapExactAmountOut, MsgSwapExactAmountOutResponse, MsgJoinSwapExternAmountIn, MsgJoinSwapExternAmountInResponse, MsgJoinSwapShareAmountOut, MsgJoinSwapShareAmountOutResponse, MsgExitSwapExternAmountOut, MsgExitSwapExternAmountOutResponse, MsgExitSwapShareAmountIn, MsgExitSwapShareAmountInResponse } from "./tx";
export interface Msg {
  joinPool(request: MsgJoinPool): Promise<MsgJoinPoolResponse>;
  exitPool(request: MsgExitPool): Promise<MsgExitPoolResponse>;
  swapExactAmountIn(request: MsgSwapExactAmountIn): Promise<MsgSwapExactAmountInResponse>;
  swapExactAmountOut(request: MsgSwapExactAmountOut): Promise<MsgSwapExactAmountOutResponse>;
  joinSwapExternAmountIn(request: MsgJoinSwapExternAmountIn): Promise<MsgJoinSwapExternAmountInResponse>;
  joinSwapShareAmountOut(request: MsgJoinSwapShareAmountOut): Promise<MsgJoinSwapShareAmountOutResponse>;
  exitSwapExternAmountOut(request: MsgExitSwapExternAmountOut): Promise<MsgExitSwapExternAmountOutResponse>;
  exitSwapShareAmountIn(request: MsgExitSwapShareAmountIn): Promise<MsgExitSwapShareAmountInResponse>;
}
export class MsgClientImpl implements Msg {
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.joinPool = this.joinPool.bind(this);
    this.exitPool = this.exitPool.bind(this);
    this.swapExactAmountIn = this.swapExactAmountIn.bind(this);
    this.swapExactAmountOut = this.swapExactAmountOut.bind(this);
    this.joinSwapExternAmountIn = this.joinSwapExternAmountIn.bind(this);
    this.joinSwapShareAmountOut = this.joinSwapShareAmountOut.bind(this);
    this.exitSwapExternAmountOut = this.exitSwapExternAmountOut.bind(this);
    this.exitSwapShareAmountIn = this.exitSwapShareAmountIn.bind(this);
  }
  joinPool(request: MsgJoinPool, useInterfaces: boolean = true): Promise<MsgJoinPoolResponse> {
    const data = MsgJoinPool.encode(request).finish();
    const promise = this.rpc.request("osmosis.gamm.v1beta1.Msg", "JoinPool", data);
    return promise.then(data => MsgJoinPoolResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  exitPool(request: MsgExitPool, useInterfaces: boolean = true): Promise<MsgExitPoolResponse> {
    const data = MsgExitPool.encode(request).finish();
    const promise = this.rpc.request("osmosis.gamm.v1beta1.Msg", "ExitPool", data);
    return promise.then(data => MsgExitPoolResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  swapExactAmountIn(request: MsgSwapExactAmountIn, useInterfaces: boolean = true): Promise<MsgSwapExactAmountInResponse> {
    const data = MsgSwapExactAmountIn.encode(request).finish();
    const promise = this.rpc.request("osmosis.gamm.v1beta1.Msg", "SwapExactAmountIn", data);
    return promise.then(data => MsgSwapExactAmountInResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  swapExactAmountOut(request: MsgSwapExactAmountOut, useInterfaces: boolean = true): Promise<MsgSwapExactAmountOutResponse> {
    const data = MsgSwapExactAmountOut.encode(request).finish();
    const promise = this.rpc.request("osmosis.gamm.v1beta1.Msg", "SwapExactAmountOut", data);
    return promise.then(data => MsgSwapExactAmountOutResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  joinSwapExternAmountIn(request: MsgJoinSwapExternAmountIn, useInterfaces: boolean = true): Promise<MsgJoinSwapExternAmountInResponse> {
    const data = MsgJoinSwapExternAmountIn.encode(request).finish();
    const promise = this.rpc.request("osmosis.gamm.v1beta1.Msg", "JoinSwapExternAmountIn", data);
    return promise.then(data => MsgJoinSwapExternAmountInResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  joinSwapShareAmountOut(request: MsgJoinSwapShareAmountOut, useInterfaces: boolean = true): Promise<MsgJoinSwapShareAmountOutResponse> {
    const data = MsgJoinSwapShareAmountOut.encode(request).finish();
    const promise = this.rpc.request("osmosis.gamm.v1beta1.Msg", "JoinSwapShareAmountOut", data);
    return promise.then(data => MsgJoinSwapShareAmountOutResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  exitSwapExternAmountOut(request: MsgExitSwapExternAmountOut, useInterfaces: boolean = true): Promise<MsgExitSwapExternAmountOutResponse> {
    const data = MsgExitSwapExternAmountOut.encode(request).finish();
    const promise = this.rpc.request("osmosis.gamm.v1beta1.Msg", "ExitSwapExternAmountOut", data);
    return promise.then(data => MsgExitSwapExternAmountOutResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
  exitSwapShareAmountIn(request: MsgExitSwapShareAmountIn, useInterfaces: boolean = true): Promise<MsgExitSwapShareAmountInResponse> {
    const data = MsgExitSwapShareAmountIn.encode(request).finish();
    const promise = this.rpc.request("osmosis.gamm.v1beta1.Msg", "ExitSwapShareAmountIn", data);
    return promise.then(data => MsgExitSwapShareAmountInResponse.decode(new BinaryReader(data), undefined, useInterfaces));
  }
}