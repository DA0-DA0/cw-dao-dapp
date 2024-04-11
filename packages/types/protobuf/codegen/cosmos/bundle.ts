import * as _29 from "./auth/v1beta1/auth";
import * as _30 from "./auth/v1beta1/genesis";
import * as _31 from "./auth/v1beta1/query";
import * as _32 from "./auth/v1beta1/tx";
import * as _33 from "./authz/v1beta1/authz";
import * as _34 from "./authz/v1beta1/event";
import * as _35 from "./authz/v1beta1/genesis";
import * as _36 from "./authz/v1beta1/query";
import * as _37 from "./authz/v1beta1/tx";
import * as _38 from "./bank/v1beta1/authz";
import * as _39 from "./bank/v1beta1/bank";
import * as _40 from "./bank/v1beta1/genesis";
import * as _41 from "./bank/v1beta1/query";
import * as _42 from "./bank/v1beta1/tx";
import * as _43 from "./base/abci/v1beta1/abci";
import * as _44 from "./base/query/v1beta1/pagination";
import * as _45 from "./base/tendermint/v1beta1/query";
import * as _46 from "./base/tendermint/v1beta1/types";
import * as _47 from "./base/v1beta1/coin";
import * as _48 from "./crypto/ed25519/keys";
import * as _49 from "./crypto/multisig/keys";
import * as _50 from "./crypto/secp256k1/keys";
import * as _51 from "./distribution/v1beta1/distribution";
import * as _52 from "./distribution/v1beta1/genesis";
import * as _53 from "./distribution/v1beta1/query";
import * as _54 from "./distribution/v1beta1/tx";
import * as _55 from "./feegrant/v1beta1/feegrant";
import * as _56 from "./feegrant/v1beta1/genesis";
import * as _57 from "./feegrant/v1beta1/query";
import * as _58 from "./feegrant/v1beta1/tx";
import * as _59 from "./gov/v1/genesis";
import * as _60 from "./gov/v1/gov";
import * as _61 from "./gov/v1/query";
import * as _62 from "./gov/v1/tx";
import * as _63 from "./gov/v1beta1/genesis";
import * as _64 from "./gov/v1beta1/gov";
import * as _65 from "./gov/v1beta1/query";
import * as _66 from "./gov/v1beta1/tx";
import * as _67 from "./mint/v1beta1/genesis";
import * as _68 from "./mint/v1beta1/mint";
import * as _69 from "./mint/v1beta1/query";
import * as _70 from "./mint/v1beta1/tx";
import * as _71 from "./msg/v1/msg";
import * as _72 from "./orm/v1/orm";
import * as _73 from "./params/v1beta1/params";
import * as _74 from "./params/v1beta1/query";
import * as _75 from "./query/v1/query";
import * as _76 from "./slashing/v1beta1/genesis";
import * as _77 from "./slashing/v1beta1/query";
import * as _78 from "./slashing/v1beta1/slashing";
import * as _79 from "./slashing/v1beta1/tx";
import * as _80 from "./staking/v1beta1/authz";
import * as _81 from "./staking/v1beta1/genesis";
import * as _82 from "./staking/v1beta1/query";
import * as _83 from "./staking/v1beta1/staking";
import * as _84 from "./staking/v1beta1/tx";
import * as _85 from "./tx/signing/v1beta1/signing";
import * as _86 from "./tx/v1beta1/service";
import * as _87 from "./tx/v1beta1/tx";
import * as _88 from "./upgrade/v1beta1/query";
import * as _89 from "./upgrade/v1beta1/tx";
import * as _90 from "./upgrade/v1beta1/upgrade";
import * as _376 from "./auth/v1beta1/tx.amino";
import * as _377 from "./authz/v1beta1/tx.amino";
import * as _378 from "./bank/v1beta1/tx.amino";
import * as _379 from "./distribution/v1beta1/tx.amino";
import * as _380 from "./feegrant/v1beta1/tx.amino";
import * as _381 from "./gov/v1/tx.amino";
import * as _382 from "./gov/v1beta1/tx.amino";
import * as _383 from "./mint/v1beta1/tx.amino";
import * as _384 from "./slashing/v1beta1/tx.amino";
import * as _385 from "./staking/v1beta1/tx.amino";
import * as _386 from "./upgrade/v1beta1/tx.amino";
import * as _387 from "./auth/v1beta1/tx.registry";
import * as _388 from "./authz/v1beta1/tx.registry";
import * as _389 from "./bank/v1beta1/tx.registry";
import * as _390 from "./distribution/v1beta1/tx.registry";
import * as _391 from "./feegrant/v1beta1/tx.registry";
import * as _392 from "./gov/v1/tx.registry";
import * as _393 from "./gov/v1beta1/tx.registry";
import * as _394 from "./mint/v1beta1/tx.registry";
import * as _395 from "./slashing/v1beta1/tx.registry";
import * as _396 from "./staking/v1beta1/tx.registry";
import * as _397 from "./upgrade/v1beta1/tx.registry";
import * as _398 from "./auth/v1beta1/query.rpc.Query";
import * as _399 from "./authz/v1beta1/query.rpc.Query";
import * as _400 from "./bank/v1beta1/query.rpc.Query";
import * as _401 from "./base/tendermint/v1beta1/query.rpc.Service";
import * as _402 from "./distribution/v1beta1/query.rpc.Query";
import * as _403 from "./feegrant/v1beta1/query.rpc.Query";
import * as _404 from "./gov/v1/query.rpc.Query";
import * as _405 from "./gov/v1beta1/query.rpc.Query";
import * as _406 from "./mint/v1beta1/query.rpc.Query";
import * as _407 from "./params/v1beta1/query.rpc.Query";
import * as _408 from "./slashing/v1beta1/query.rpc.Query";
import * as _409 from "./staking/v1beta1/query.rpc.Query";
import * as _410 from "./tx/v1beta1/service.rpc.Service";
import * as _411 from "./upgrade/v1beta1/query.rpc.Query";
import * as _412 from "./auth/v1beta1/tx.rpc.msg";
import * as _413 from "./authz/v1beta1/tx.rpc.msg";
import * as _414 from "./bank/v1beta1/tx.rpc.msg";
import * as _415 from "./distribution/v1beta1/tx.rpc.msg";
import * as _416 from "./feegrant/v1beta1/tx.rpc.msg";
import * as _417 from "./gov/v1/tx.rpc.msg";
import * as _418 from "./gov/v1beta1/tx.rpc.msg";
import * as _419 from "./mint/v1beta1/tx.rpc.msg";
import * as _420 from "./slashing/v1beta1/tx.rpc.msg";
import * as _421 from "./staking/v1beta1/tx.rpc.msg";
import * as _422 from "./upgrade/v1beta1/tx.rpc.msg";
import * as _621 from "./rpc.query";
import * as _622 from "./rpc.tx";
export namespace cosmos {
  export namespace auth {
    export const v1beta1 = {
      ..._29,
      ..._30,
      ..._31,
      ..._32,
      ..._376,
      ..._387,
      ..._398,
      ..._412
    };
  }
  export namespace authz {
    export const v1beta1 = {
      ..._33,
      ..._34,
      ..._35,
      ..._36,
      ..._37,
      ..._377,
      ..._388,
      ..._399,
      ..._413
    };
  }
  export namespace bank {
    export const v1beta1 = {
      ..._38,
      ..._39,
      ..._40,
      ..._41,
      ..._42,
      ..._378,
      ..._389,
      ..._400,
      ..._414
    };
  }
  export namespace base {
    export namespace abci {
      export const v1beta1 = {
        ..._43
      };
    }
    export namespace query {
      export const v1beta1 = {
        ..._44
      };
    }
    export namespace tendermint {
      export const v1beta1 = {
        ..._45,
        ..._46,
        ..._401
      };
    }
    export const v1beta1 = {
      ..._47
    };
  }
  export namespace crypto {
    export const ed25519 = {
      ..._48
    };
    export const multisig = {
      ..._49
    };
    export const secp256k1 = {
      ..._50
    };
  }
  export namespace distribution {
    export const v1beta1 = {
      ..._51,
      ..._52,
      ..._53,
      ..._54,
      ..._379,
      ..._390,
      ..._402,
      ..._415
    };
  }
  export namespace feegrant {
    export const v1beta1 = {
      ..._55,
      ..._56,
      ..._57,
      ..._58,
      ..._380,
      ..._391,
      ..._403,
      ..._416
    };
  }
  export namespace gov {
    export const v1 = {
      ..._59,
      ..._60,
      ..._61,
      ..._62,
      ..._381,
      ..._392,
      ..._404,
      ..._417
    };
    export const v1beta1 = {
      ..._63,
      ..._64,
      ..._65,
      ..._66,
      ..._382,
      ..._393,
      ..._405,
      ..._418
    };
  }
  export namespace mint {
    export const v1beta1 = {
      ..._67,
      ..._68,
      ..._69,
      ..._70,
      ..._383,
      ..._394,
      ..._406,
      ..._419
    };
  }
  export namespace msg {
    export const v1 = {
      ..._71
    };
  }
  export namespace orm {
    export const v1 = {
      ..._72
    };
  }
  export namespace params {
    export const v1beta1 = {
      ..._73,
      ..._74,
      ..._407
    };
  }
  export namespace query {
    export const v1 = {
      ..._75
    };
  }
  export namespace slashing {
    export const v1beta1 = {
      ..._76,
      ..._77,
      ..._78,
      ..._79,
      ..._384,
      ..._395,
      ..._408,
      ..._420
    };
  }
  export namespace staking {
    export const v1beta1 = {
      ..._80,
      ..._81,
      ..._82,
      ..._83,
      ..._84,
      ..._385,
      ..._396,
      ..._409,
      ..._421
    };
  }
  export namespace tx {
    export namespace signing {
      export const v1beta1 = {
        ..._85
      };
    }
    export const v1beta1 = {
      ..._86,
      ..._87,
      ..._410
    };
  }
  export namespace upgrade {
    export const v1beta1 = {
      ..._88,
      ..._89,
      ..._90,
      ..._386,
      ..._397,
      ..._411,
      ..._422
    };
  }
  export const ClientFactory = {
    ..._621,
    ..._622
  };
}