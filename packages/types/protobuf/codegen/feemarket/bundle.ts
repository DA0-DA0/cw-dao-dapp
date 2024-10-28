import * as _105 from "./feemarket/v1/genesis";
import * as _106 from "./feemarket/v1/params";
import * as _107 from "./feemarket/v1/query";
import * as _108 from "./feemarket/v1/tx";
import * as _463 from "./feemarket/v1/tx.amino";
import * as _464 from "./feemarket/v1/tx.registry";
import * as _465 from "./feemarket/v1/query.rpc.Query";
import * as _466 from "./feemarket/v1/tx.rpc.msg";
import * as _678 from "./rpc.query";
import * as _679 from "./rpc.tx";
export namespace feemarket {
  export namespace feemarket {
    export const v1 = {
      ..._105,
      ..._106,
      ..._107,
      ..._108,
      ..._463,
      ..._464,
      ..._465,
      ..._466
    };
  }
  export const ClientFactory = {
    ..._678,
    ..._679
  };
}