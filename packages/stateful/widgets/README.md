# @dao-dao/stateful/widgets

Author: [@NoahSaso](https://github.com/NoahSaso)

## Widgets

- [MintNft](./widgets/MintNft)
- [Press](./widgets/Press)
- [RetroactiveCompensation](./widgets/RetroactiveCompensation)
- [VestingPayments](./widgets/VestingPayments)
- [VoteDelegation](./widgets/VoteDelegation)

## Layout

| Location             | Summary                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| [widgets](./widgets) | Widgets.                                                                                         |
| [react](./react)     | The external React interface used by apps and packages. This uses the core logic under the hood. |
| [core.ts](./core.ts) | The core logic that matches and loads widgets for a DAO.                                         |

## What is it?

This is a widget package. It contains different widgets that can be displayed on
a DAO's home page. For example, a DAO can choose to display a widget to allow
minting/purchasing NFTs.

## Writing a widget

A widget exports an ID, some metadata, and a component that renders on the DAO
page. Widgets depend on a set of variables that are defined when the widget is
added to the DAO. Defaults for these variables should be set in the
`defaultValues` object in the widget definition, and they are passed to the
component via a `variables` object. The default values object will appear in the
widget creation action.

All you need to do is define a widget object and add it to the list of widgets
in [`core.ts`](./core.ts).

```ts
import { Widget, WidgetVisibilityContext } from '@dao-dao/types/widgets'

const MyWidget: Widget = {
  id: 'my_widget_id',
  visibilityContext: WidgetVisibilityContext.Always,
  defaultValues: {
    button: 'Pay',
    amount: '100000ujuno',
    ...
  },
  Component: ...,
}
```

Take a look at the other widgets in this package for examples. Widgets have very
few moving parts, so the best way to learn is to simply read through them.

## Usage (already implemented)

Now that the system has been setup, we can use the hook anywhere on a DAO page
to access the widgets for the current DAO.

```tsx
import { SuspenseLoader } from '@dao-dao/stateful'
import { useWidgets } from '@dao-dao/stateful/widgets'
import { Loader } from '@dao-dao/stateless'

const HomePage = () => {
  const loadingWidgets = useWidgets()

  return (
    <SuspenseLoader
      fallback={<Loader />}
      forceFallback={loadingWidgets.loading}
    >
      {!loadingWidgets.loading &&
        loadingWidgets.data.map((Widget, index) => <Widget key={index} />)}
    </SuspenseLoader>
  )
}
```
