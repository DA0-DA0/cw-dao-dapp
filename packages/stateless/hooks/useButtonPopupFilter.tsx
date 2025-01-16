import {
  FilterListRounded,
  RadioButtonChecked,
  RadioButtonUnchecked,
} from '@mui/icons-material'
import { useMemo, useState } from 'react'

import { ButtonPopupProps, FilterFn, TypedOption } from '@dao-dao/types'

import { ButtonLink } from '../components'

type UseButtonPopupFilterOptions<T, O> = {
  data: T[]
  options: O[]
  initialIndex?: number
}

type UseButtonPopupFilterReturn<T, O> = {
  buttonPopupProps: Pick<
    ButtonPopupProps,
    'sections' | 'sectionClassName' | 'trigger' | 'ButtonLink'
  >
  filteredData: T[]
  selectedOption: O
}

// Pass an array of data and sort options, and get `buttonPopupProps` (for
// passing to `ButtonPopup`) and memoized `filteredData`.
export const useButtonPopupFilter = <
  T extends unknown,
  O extends TypedOption<FilterFn<T>>,
>({
  data,
  options,
  initialIndex = 0,
}: UseButtonPopupFilterOptions<T, O>): UseButtonPopupFilterReturn<T, O> => {
  const [selectedIndex, setSelectedIndex] = useState<number>(initialIndex)
  const selectedOption = options[selectedIndex]

  const filteredData = useMemo(
    () => (selectedOption ? data.filter(selectedOption.value) : data),
    [data, selectedOption]
  )

  return {
    buttonPopupProps: {
      trigger: {
        type: 'button',
        props: {
          variant: 'ghost',
          children: (
            <>
              <FilterListRounded />
              <p className="body-text whitespace-nowrap">
                {selectedOption?.label}
              </p>
            </>
          ),
        },
      },
      sectionClassName: 'gap-1',
      sections: [
        {
          buttons: options.map(({ label }, index) => ({
            Icon:
              selectedIndex === index
                ? RadioButtonChecked
                : RadioButtonUnchecked,
            pressed: selectedIndex === index,
            label,
            onClick: () => setSelectedIndex(index),
          })),
        },
      ],
      // No button links, so using the stateless component is fine here.
      ButtonLink,
    },
    filteredData,
    selectedOption,
  }
}
